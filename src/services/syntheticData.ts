/**
 * Seeded synthetic cases for validating the cash-out model.
 *
 * IMPORTANT: this is NOT real fraud data. It is a simulator with a hidden data-generating
 * process (DGP) that is deliberately DIFFERENT from the Hawkes model in hawkes.ts, so the
 * backtest is not just the model grading itself:
 *
 *   model (hawkes.ts)                         hidden DGP (here)
 *   -----------------------------------       ---------------------------------------------
 *   exponential distance kernel, 60 km        power-law distance from the LAST hop only
 *   baseline = cluster hit rate               baseline = hit rate x fixed random distortion
 *   all hops excite, decayed by age           one "anchor" hop picks a preferred cluster
 *   no opportunistic behaviour                12% of cash-outs are uniformly random
 *   lognormal delay, 50 km/h travel           Weibull delay, 35 km/h travel, no night cash-outs
 *
 * Everything is driven by mulberry32(seed), so the same seed reproduces the same 300 cases.
 */
import { atms, atmClusters, districts } from '@/data/mockData';
import { haversineKm, type HawkesEvent } from '@/services/hawkes';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

function normal(rng: Rng): number {
  const u = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

function weibull(rng: Rng, shape: number, scale: number): number {
  return scale * Math.pow(-Math.log(1 - rng()), 1 / shape);
}

function sampleCategorical(rng: Rng, weights: number[]): number {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

export interface SyntheticCase {
  id: string;
  events: HawkesEvent[];
  /** Prediction time: the moment the last observed hop lands. */
  nowMs: number;
  truth: { atmId: string; cashOutMs: number };
  /** Hidden mechanism that produced the truth (kept for diagnostics only; never fed to models). */
  hidden: { opportunistic: boolean; preferredClusterId: string | null };
}

export interface SyntheticOptions {
  n: number;
  seed: number;
  opportunisticRate: number;
  startMs: number;
}

export const DEFAULT_SYNTHETIC: SyntheticOptions = {
  n: 300,
  seed: 20260929,
  opportunisticRate: 0.12,
  startMs: Date.UTC(2026, 0, 1),
};

const IST_OFFSET_H = 5.5;

function istHour(ms: number): number {
  return (((ms / 3600000 + IST_OFFSET_H) % 24) + 24) % 24;
}

export function generateSyntheticCases(opts: Partial<SyntheticOptions> = {}): SyntheticCase[] {
  const o = { ...DEFAULT_SYNTHETIC, ...opts };
  const rng = mulberry32(o.seed);

  // Hidden popularity: the app's cluster hit rate, distorted once per dataset (model misspecification).
  const pop = new Map<string, number>();
  for (const c of atmClusters) pop.set(c.id, c.historicalHitRate * Math.exp(0.5 * normal(rng)));
  const atmPop = atms.map((a) => (pop.get(a.clusterId) ?? 0.1) * Math.exp(0.15 * normal(rng)));

  const cases: SyntheticCase[] = [];
  for (let i = 0; i < o.n; i++) {
    const nHops = 2 + Math.floor(rng() * 4); // 2..5
    let t = o.startMs + rng() * 90 * 24 * 3600000;

    // Chain of hops: each hop lands in a district (stay put 50%, else move, nearer more likely).
    let d = Math.floor(rng() * districts.length);
    const events: HawkesEvent[] = [];
    for (let k = 0; k < nHops; k++) {
      if (k > 0) {
        t += Math.exp(Math.log(1.5) + 0.7 * normal(rng)) * 3600000; // lognormal gap, median 1.5 h
        if (rng() > 0.5) {
          const w = districts.map((dd, j) =>
            j === d ? 0 : 1 / (1 + haversineKm(districts[d].lat, districts[d].lng, dd.lat, dd.lng) / 300),
          );
          d = sampleCategorical(rng, w);
        }
      }
      const dist = districts[d];
      events.push({
        id: `S${i}-h${k + 1}`,
        lat: dist.lat + (rng() - 0.5) * 0.1,
        lng: dist.lng + (rng() - 0.5) * 0.1,
        tMs: t,
        layer: k + 1,
        weight: Math.min(1, Math.pow(0.9, k) * (0.5 + 0.5 * rng())),
      });
    }
    const last = events[events.length - 1];
    const nowMs = last.tMs;

    // Hidden ATM choice.
    const opportunistic = rng() < o.opportunisticRate;
    let preferredClusterId: string | null = null;
    let atmIdx: number;
    if (opportunistic) {
      atmIdx = Math.floor(rng() * atms.length);
    } else {
      // Anchor hop chosen by weight x depth; its nearest cluster (<300 km) gets a bonus.
      const anchor = events[sampleCategorical(rng, events.map((e) => e.weight * (0.5 + e.layer / nHops)))];
      let best = { id: '', km: Infinity };
      for (const c of atmClusters) {
        const km = haversineKm(anchor.lat, anchor.lng, c.centerLat, c.centerLng);
        if (km < best.km) best = { id: c.id, km };
      }
      preferredClusterId = best.km < 300 ? best.id : null;
      const logits = atms.map((a, j) => {
        const km = haversineKm(last.lat, last.lng, a.lat, a.lng);
        return (
          Math.log(atmPop[j]) -
          1.3 * Math.log(1 + km / 40) +
          (a.clusterId === preferredClusterId ? 1.6 : 0)
        );
      });
      const m = Math.max(...logits);
      atmIdx = sampleCategorical(rng, logits.map((l) => Math.exp(l - m)));
    }
    const atm = atms[atmIdx];

    // Hidden delay: Weibull, slower travel, no cash-outs between 00:00 and 05:00 IST.
    const meanGapH = (last.tMs - events[0].tMs) / 3600000 / Math.max(1, nHops - 1);
    const travelH = haversineKm(last.lat, last.lng, atm.lat, atm.lng) / 35;
    let delayH = weibull(rng, 1.4, 1.5 * meanGapH + 1 + travelH);
    let cashOutMs = nowMs + delayH * 3600000;
    const hr = istHour(cashOutMs);
    if (hr < 5) {
      cashOutMs += (5 - hr + rng() * 1.5) * 3600000;
      delayH = (cashOutMs - nowMs) / 3600000;
    }

    cases.push({
      id: `SYN-${String(i + 1).padStart(3, '0')}`,
      events,
      nowMs,
      truth: { atmId: atm.id, cashOutMs },
      hidden: { opportunistic, preferredClusterId },
    });
  }
  return cases;
}
