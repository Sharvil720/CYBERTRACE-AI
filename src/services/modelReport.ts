/**
 * One memoised validation run shared by the app: synthetic cases -> backtest -> conformal calibration.
 * Everything the UI shows about model quality comes from here, never from a literal.
 */
import { DEFAULT_PARAMS } from '@/services/hawkes';
import { generateSyntheticCases, mulberry32, DEFAULT_SYNTHETIC } from '@/services/syntheticData';
import { runBacktest, type BacktestReport } from '@/services/backtest';
import {
  calibrate,
  evaluateCoverage,
  repeatedSplitCoverage,
  shuffled,
  type ConformalCalibration,
  type CoverageResult,
  type RepeatedSplitResult,
} from '@/services/conformal';

export const CONFORMAL_ALPHA = 0.1;

export interface ModelReport {
  seed: number;
  backtest: BacktestReport;
  conformal: {
    calibration: ConformalCalibration;
    nTest: number;
    /** Observed on the held-out half. Noisy at this n; see repeated. */
    heldOut: CoverageResult;
    repeated: RepeatedSplitResult;
    target: number;
  };
}

let cached: ModelReport | null = null;

export function getModelReport(): ModelReport {
  if (cached) return cached;
  const seed = DEFAULT_SYNTHETIC.seed;
  const cases = generateSyntheticCases({ seed });
  const backtest = runBacktest(cases, DEFAULT_PARAMS);

  const order = shuffled(cases.length, mulberry32(seed + 2));
  const half = Math.floor(cases.length / 2);
  const cal = order.slice(0, half);
  const test = order.slice(half);
  const calibration = calibrate(
    cal.map((i) => backtest.hawkesProbs[i]),
    cal.map((i) => backtest.truthIdx[i]),
    CONFORMAL_ALPHA,
  );
  const heldOut = evaluateCoverage(
    test.map((i) => backtest.hawkesProbs[i]),
    test.map((i) => backtest.truthIdx[i]),
    calibration,
  );
  const repeated = repeatedSplitCoverage(backtest.hawkesProbs, backtest.truthIdx, CONFORMAL_ALPHA, seed + 3);

  cached = {
    seed,
    backtest,
    conformal: { calibration, nTest: test.length, heldOut, repeated, target: 1 - CONFORMAL_ALPHA },
  };
  return cached;
}
