/**
 * Split conformal prediction over the ATM shortlist.
 *
 * Nonconformity score for a calibration case: s = 1 - p_model(true ATM).
 * q_hat = the ceil((n+1)(1-alpha))-th smallest score. Prediction set for a new case:
 * every ATM j with 1 - p_j <= q_hat.
 *
 * Guarantee: if calibration and future cases are exchangeable, P(true ATM in set) >= 1 - alpha.
 * That is a statement about the data the model was calibrated on. Calibrated on SYNTHETIC cases,
 * it says nothing about real NCRP cases until it is recalibrated on real ones.
 */
import { mulberry32 } from '@/services/syntheticData';

export interface ConformalCalibration {
  alpha: number;
  nCal: number;
  /** q_hat on the nonconformity scale (1 - p). Infinity if nCal is too small for this alpha. */
  qHat: number;
  /** ATMs with model probability >= probThreshold are in the set. */
  probThreshold: number;
}

export function calibrate(
  calProbs: number[][],
  calTruthIdx: number[],
  alpha = 0.1,
): ConformalCalibration {
  const scores = calProbs.map((p, i) => 1 - p[calTruthIdx[i]]).sort((a, b) => a - b);
  const n = scores.length;
  const k = Math.ceil((n + 1) * (1 - alpha));
  const qHat = k > n ? Infinity : scores[k - 1];
  return { alpha, nCal: n, qHat, probThreshold: Number.isFinite(qHat) ? 1 - qHat : 0 };
}

export function predictionSet(probs: number[], cal: ConformalCalibration): number[] {
  const idx: number[] = [];
  probs.forEach((p, j) => {
    if (1 - p <= cal.qHat) idx.push(j);
  });
  return idx;
}

export interface CoverageResult {
  n: number;
  coverage: number;
  avgSetSize: number;
}

export function evaluateCoverage(
  probs: number[][],
  truthIdx: number[],
  cal: ConformalCalibration,
): CoverageResult {
  let covered = 0;
  let size = 0;
  probs.forEach((p, i) => {
    const set = predictionSet(p, cal);
    if (set.includes(truthIdx[i])) covered++;
    size += set.length;
  });
  const n = probs.length;
  return { n, coverage: n ? covered / n : NaN, avgSetSize: n ? size / n : NaN };
}

export interface RepeatedSplitResult {
  reps: number;
  meanCoverage: number;
  minCoverage: number;
  maxCoverage: number;
  meanSetSize: number;
}

/** Re-do the calibrate/test split many times to show the coverage guarantee holds on average. */
export function repeatedSplitCoverage(
  probs: number[][],
  truthIdx: number[],
  alpha: number,
  seed: number,
  reps = 200,
): RepeatedSplitResult {
  const rng = mulberry32(seed);
  const n = probs.length;
  const covs: number[] = [];
  const sizes: number[] = [];
  for (let r = 0; r < reps; r++) {
    const order = shuffled(n, rng);
    const half = Math.floor(n / 2);
    const cal = order.slice(0, half);
    const test = order.slice(half);
    const c = calibrate(cal.map((i) => probs[i]), cal.map((i) => truthIdx[i]), alpha);
    const ev = evaluateCoverage(test.map((i) => probs[i]), test.map((i) => truthIdx[i]), c);
    covs.push(ev.coverage);
    sizes.push(ev.avgSetSize);
  }
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  return {
    reps,
    meanCoverage: mean(covs),
    minCoverage: Math.min(...covs),
    maxCoverage: Math.max(...covs),
    meanSetSize: mean(sizes),
  };
}

export function shuffled(n: number, rng: () => number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
