/**
 * NIRAKSHAN Hawkes cash-out engine (pure functions, no app-data imports).
 *
 * Model
 * -----
 * Each money-trail hop that lands in a mule/beneficiary account is an "event" i at
 * time t_i, location x_i, layer L_i, carrying fraction w_i of the stolen amount.
 * The intensity of a cash-out at ATM j at time t is
 *
 *   lambda_j(t) = mu_j + SUM_{i: t_i <= t}  alpha * w_i * exp(-beta * (t - t_i))
 *                                         * K(d_ij) * gamma^(L_i - 1)
 *
 *   K(d) = exp(-d / sigmaKm)          (spatial kernel)
 *   mu_j = mu0 * clusterHitRate_j     (baseline prior, from the simulated log)
 *
 * Probability that the NEXT cash-out happens at ATM j (conditional on one
 * happening now) is  p_j = lambda_j / SUM_k lambda_k.
 *
 * Time to cash-out is lognormal: ln T ~ N(ln(median), logSigma^2), reported
 * as P10 / median / P90.
 *
 * Parameters are fitted on SYNTHETIC train cases only (see DEFAULT_PARAMS). Not fitted to real NCRP data.
 */

export interface HawkesParams {
  alpha: number; // excitation scale
  beta: number; // temporal decay per hour
  sigmaKm: number; // spatial kernel length scale
  gamma: number; // per-layer attenuation (gamma^(layer-1))
  mu0: number; // baseline scale (times cluster hit rate)
  dwellMultiplier: number; // dwell before cash-out = multiplier * mean inter-hop gap
  defaultGapHours: number; // used when the chain has <2 hops
  travelKmh: number; // travel speed from source hop to ATM
  minMedianHours: number;
  logSigma: number; // lognormal shape
  lastHopBoost: number; // extra multiplier on the most recent hop's excitation (1 = off)
}

/**
 * FITTED on a 150-case synthetic TRAIN split (grid search: MRR for spatial/temporal terms,
 * P10-P90 coverage -> 80% for the timing terms). Reproduce with `scripts/fitParams.ts`.
 * Evaluated on the other 150 held-out synthetic cases only. NOT fitted to real NCRP data.
 * Several values sit on the edge of the search grid (sigmaKm 90, lastHopBoost 16): the fit is
 * pulling the model toward a "nearest to the latest hop" rule. Widen the grid on real data.
 */
export const DEFAULT_PARAMS: HawkesParams = {
  alpha: 1.0,
  beta: 0.2,
  sigmaKm: 90,
  gamma: 1,
  mu0: 0.005,
  dwellMultiplier: 3,
  defaultGapHours: 2,
  travelKmh: 50,
  minMedianHours: 0.5,
  logSigma: 1.0,
  lastHopBoost: 16,
};

export interface HawkesEvent {
  id: string;
  lat: number;
  lng: number;
  tMs: number;
  layer: number;
  weight: number; // 0..1 fraction of stolen amount landing here
}

export interface AtmNode {
  id: string;
  lat: number;
  lng: number;
  baselineRate: number; // mu_j
}

export interface EventTerm {
  eventId: string;
  dtHours: number;
  distanceKm: number;
  kernel: number;
  decay: number;
  layerFactor: number;
  contribution: number; // additive share of lambda_j
}

export interface AtmScore {
  atmId: string;
  lambda: number;
  baseline: number;
  excitation: number;
  probability: number; // 0..1, sums to 1 across ATMs
  terms: EventTerm[];
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function spatialKernel(distKm: number, sigmaKm: number): number {
  return Math.exp(-distKm / sigmaKm);
}

/** Score every ATM at time nowMs. Events after nowMs are ignored (no look-ahead). */
export function scoreAtms(
  atms: AtmNode[],
  events: HawkesEvent[],
  nowMs: number,
  params: HawkesParams = DEFAULT_PARAMS,
): AtmScore[] {
  const past = events.filter((e) => e.tMs <= nowMs);
  const lastT = past.reduce((m, e) => Math.max(m, e.tMs), -Infinity);
  const raw = atms.map((atm) => {
    const terms: EventTerm[] = past.map((e) => {
      const dtHours = (nowMs - e.tMs) / 3600000;
      const distanceKm = haversineKm(e.lat, e.lng, atm.lat, atm.lng);
      const kernel = spatialKernel(distanceKm, params.sigmaKm);
      const decay = Math.exp(-params.beta * dtHours);
      const layerFactor = Math.pow(params.gamma, Math.max(0, e.layer - 1));
      return {
        eventId: e.id,
        dtHours,
        distanceKm,
        kernel,
        decay,
        layerFactor,
        contribution: params.alpha * e.weight * decay * kernel * layerFactor * (e.tMs === lastT ? params.lastHopBoost : 1),
      };
    });
    const excitation = terms.reduce((s, t) => s + t.contribution, 0);
    const baseline = atm.baselineRate;
    return { atmId: atm.id, lambda: baseline + excitation, baseline, excitation, probability: 0, terms };
  });
  const total = raw.reduce((s, r) => s + r.lambda, 0);
  return raw.map((r) => ({ ...r, probability: total > 0 ? r.lambda / total : 1 / raw.length }));
}

/** Mean gap in hours between consecutive hops. Uses a NUMERIC sort. */
export function meanGapHours(events: HawkesEvent[], fallback: number): number {
  if (events.length < 2) return fallback;
  const ts = events.map((e) => e.tMs).sort((a, b) => a - b);
  return (ts[ts.length - 1] - ts[0]) / 3600000 / (ts.length - 1) || fallback;
}

export interface TimeToCashOut {
  p10Hours: number;
  medianHours: number;
  p90Hours: number;
}

const Z90 = 1.2815515655446004;

export function lognormalQuantiles(medianHours: number, logSigma: number): TimeToCashOut {
  const mu = Math.log(medianHours);
  return {
    p10Hours: Math.exp(mu - Z90 * logSigma),
    medianHours,
    p90Hours: Math.exp(mu + Z90 * logSigma),
  };
}

/** Median dwell = dwellMultiplier * mean hop gap + travel from the dominant source hop. */
export function timeToCashOut(
  score: AtmScore,
  gapHours: number,
  params: HawkesParams = DEFAULT_PARAMS,
): TimeToCashOut {
  const dominant = score.terms.reduce<EventTerm | null>(
    (best, t) => (best === null || t.contribution > best.contribution ? t : best),
    null,
  );
  const travelH = dominant ? dominant.distanceKm / params.travelKmh : 0;
  const median = Math.max(params.minMedianHours, params.dwellMultiplier * gapHours + travelH);
  return lognormalQuantiles(median, params.logSigma);
}

/** Round shares to integers that sum to exactly 100 (largest remainder). */
export function toPercentShares(values: number[]): number[] {
  const total = values.reduce((s, v) => s + v, 0);
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((v) => (v / total) * 100);
  const floors = exact.map(Math.floor);
  let remaining = 100 - floors.reduce((s, v) => s + v, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remaining <= 0) break;
    floors[i] += 1;
    remaining -= 1;
  }
  return floors;
}
