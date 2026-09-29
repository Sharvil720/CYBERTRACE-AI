/**
 * Backtest: Hawkes vs. two simple baselines on seeded synthetic cases.
 *
 *  - frequency:   rank ATMs by how often each was the true cash-out ATM in the OTHER folds
 *                 (5-fold cross-fitting, so no case sees its own label; leave-one-out is avoided
 *                 because it biases argmax rankings against the true ATM).
 *  - nearest ATM: rank ATMs by distance from the last observed hop.
 *  - hawkes:      rank by p_j from scoreAtms with the untuned Chat 1 priors.
 *
 * Hawkes has no fitted parameters, so evaluating it on all cases leaks nothing.
 * Metrics: hit@1/3/5, MRR, lead time (prediction -> actual cash-out) and P10-P90 window coverage.
 */
import { atms } from '@/data/mockData';
import {
  DEFAULT_PARAMS,
  haversineKm,
  meanGapHours,
  scoreAtms,
  timeToCashOut,
  type AtmNode,
  type HawkesParams,
} from '@/services/hawkes';
import { buildAtmNodes } from '@/services/atmNodes';
import { mulberry32, type SyntheticCase } from '@/services/syntheticData';

export type MethodId = 'frequency' | 'nearest' | 'hawkes';

export interface Interval {
  value: number;
  lo: number;
  hi: number;
}

export interface MethodMetrics {
  id: MethodId;
  label: string;
  hit1: Interval;
  hit3: Interval;
  hit5: Interval;
  mrr: Interval;
}

export interface BacktestReport {
  nCases: number;
  nAtms: number;
  methods: MethodMetrics[];
  /** Expected values for a uniformly random ranking of the same ATMs. */
  random: { hit1: number; hit3: number; hit5: number; mrr: number };
  /** Hours from prediction to real cash-out, over cases where Hawkes had the true ATM in its top 5. */
  leadTime: {
    n: number;
    medianHours: number;
    p10Hours: number;
    p90Hours: number;
    histogram: { bucket: string; count: number }[];
  };
  /** Share of those cases where the true delay fell inside the model's own P10-P90 window (nominal 80%). */
  windowCoverage: Interval & { n: number; nominal: number };
  /** Per-case Hawkes probability vectors (ATM order = atms order) and true ATM index. For conformal. */
  hawkesProbs: number[][];
  truthIdx: number[];
}

const LEAD_BUCKETS = [
  { label: '<1h', lo: 0, hi: 1 },
  { label: '1-2h', lo: 1, hi: 2 },
  { label: '2-4h', lo: 2, hi: 4 },
  { label: '4-8h', lo: 4, hi: 8 },
  { label: '8-16h', lo: 8, hi: 16 },
  { label: '16-24h', lo: 16, hi: 24 },
  { label: '24h+', lo: 24, hi: Infinity },
];

export function ranksFromScores(scores: number[], tieBreak: number[] = []): number[] {
  // returns order: indices sorted best-first
  return scores
    .map((s, i) => ({ s, i, t: tieBreak[i] ?? 0 }))
    .sort((a, b) => b.s - a.s || b.t - a.t || a.i - b.i)
    .map((x) => x.i);
}

function bootstrap(values: number[], seed: number, reps = 1000): Interval {
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const rng = mulberry32(seed);
  const means: number[] = [];
  for (let r = 0; r < reps; r++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += values[Math.floor(rng() * n)];
    means.push(s / n);
  }
  means.sort((a, b) => a - b);
  return { value: mean, lo: means[Math.floor(0.025 * reps)], hi: means[Math.floor(0.975 * reps) - 1] };
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function runBacktest(
  cases: SyntheticCase[],
  params: HawkesParams = DEFAULT_PARAMS,
  atmNodes: AtmNode[] = buildAtmNodes(params),
  seed = 7,
): BacktestReport {
  const nA = atmNodes.length;
  const idxOf = new Map(atmNodes.map((a, i) => [a.id, i]));
  const truthIdx = cases.map((c) => idxOf.get(c.truth.atmId)!);

  // Frequency baseline: 5-fold cross-fitted counts (case i uses labels from folds != i % 5).
  const K = 5;
  const foldCounts = Array.from({ length: K }, () => new Array(nA).fill(0) as number[]);
  truthIdx.forEach((t, i) => foldCounts[i % K][t]++);
  const countsExcluding = (fold: number) =>
    Array.from({ length: nA }, (_, j) => foldCounts.reduce((s, fc, k) => (k === fold ? s : s + fc[j]), 0));
  const trainCounts = Array.from({ length: K }, (_, k) => countsExcluding(k));

  const hawkesProbs = cases.map((c) => scoreAtms(atmNodes, c.events, c.nowMs, params).map((s) => s.probability));

  const rankers: Record<MethodId, (i: number) => number[]> = {
    frequency: (i) => ranksFromScores(trainCounts[i % K]),
    nearest: (i) => {
      const last = cases[i].events[cases[i].events.length - 1];
      return ranksFromScores(atms.map((a) => -haversineKm(last.lat, last.lng, a.lat, a.lng)));
    },
    hawkes: (i) => ranksFromScores(hawkesProbs[i]),
  };
  const labels: Record<MethodId, string> = {
    frequency: 'Historical frequency',
    nearest: 'Nearest ATM to last hop',
    hawkes: 'Hawkes model',
  };

  const methods: MethodMetrics[] = (['frequency', 'nearest', 'hawkes'] as MethodId[]).map((id, m) => {
    const ranks = cases.map((_, i) => rankers[id](i).indexOf(truthIdx[i]) + 1);
    return {
      id,
      label: labels[id],
      hit1: bootstrap(ranks.map((r) => (r <= 1 ? 1 : 0)), seed + m * 10 + 1),
      hit3: bootstrap(ranks.map((r) => (r <= 3 ? 1 : 0)), seed + m * 10 + 2),
      hit5: bootstrap(ranks.map((r) => (r <= 5 ? 1 : 0)), seed + m * 10 + 3),
      mrr: bootstrap(ranks.map((r) => 1 / r), seed + m * 10 + 4),
    };
  });

  const harmonic = Array.from({ length: nA }, (_, k) => 1 / (k + 1)).reduce((s, v) => s + v, 0);
  const random = { hit1: 1 / nA, hit3: 3 / nA, hit5: 5 / nA, mrr: harmonic / nA };

  // Lead time + window coverage on Hawkes top-5 hits.
  const leads: number[] = [];
  const inWindow: number[] = [];
  cases.forEach((c, i) => {
    const order = rankers.hawkes(i);
    if (order.indexOf(truthIdx[i]) >= 5) return;
    const lead = (c.truth.cashOutMs - c.nowMs) / 3600000;
    leads.push(lead);
    const score = scoreAtms(atmNodes, c.events, c.nowMs, params)[truthIdx[i]];
    const ttc = timeToCashOut(score, meanGapHours(c.events, params.defaultGapHours), params);
    inWindow.push(lead >= ttc.p10Hours && lead <= ttc.p90Hours ? 1 : 0);
  });
  const sortedLeads = [...leads].sort((a, b) => a - b);

  return {
    nCases: cases.length,
    nAtms: nA,
    methods,
    random,
    leadTime: {
      n: leads.length,
      medianHours: quantile(sortedLeads, 0.5),
      p10Hours: quantile(sortedLeads, 0.1),
      p90Hours: quantile(sortedLeads, 0.9),
      histogram: LEAD_BUCKETS.map((b) => ({
        bucket: b.label,
        count: leads.filter((h) => h >= b.lo && h < b.hi).length,
      })),
    },
    windowCoverage: { ...bootstrap(inWindow, seed + 99), n: inWindow.length, nominal: 0.8 },
    hawkesProbs,
    truthIdx,
  };
}
