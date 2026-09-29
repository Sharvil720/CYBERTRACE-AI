/**
 * NIRAKSHAN interception optimizer (pure functions, no app-data imports).
 *
 * Problem
 * -------
 * The Hawkes engine gives, for every ATM j, a probability p_j that the next cash-out
 * happens there and a lognormal time-to-cash-out T_j (median m_j, shape sigma), both
 * measured from the moment the prediction was generated (t0).
 *
 * We have K field units. Unit u needs tau_uj hours to be in position at ATM j:
 *
 *   tau_uj = mobilisation + roadFactor * haversine(u, j) / speed
 *
 * If dispatch happens at time `now` (elapsed e = now - t0 hours) the chance that unit u
 * is in position BEFORE the cash-out at j is the conditional survival
 *
 *   q_uj = S(e + tau_uj) / S(e),      S(t) = 1 - Phi((ln t - ln m_j) / sigma)
 *
 * so the value of sending u to j is  v_uj = p_j * q_uj.
 * At most one unit per ATM, at most one ATM per unit; we maximise sum v_uj with the
 * Hungarian algorithm (exact, O(n^3)). The objective is the model's probability that a
 * unit is waiting at the ATM where the cash-out happens, before it happens.
 *
 * Two policy limits keep the plan usable (both are priors, tune per deployment):
 *   - maxTravelMin: units are local; anything further away is a hand-off to the local cyber
 *     cell, not a dispatch.
 *   - minValue: a unit is only dispatched if it adds at least this much probability, otherwise
 *     it stays on standby. Without this the plan sends every idle unit on pointless errands.
 *
 * What this is NOT
 * ----------------
 * - It does not model the unit's chance of actually catching the withdrawal once in place.
 * - It treats where (p_j) and when (T_j) as independent given the model, and ignores the
 *   possibility that the cash-out happens elsewhere first. So it is an expected-value
 *   ranking under the model, not a guarantee.
 * - Travel parameters are priors (straight-line x road factor at a flat speed), not routed
 *   ETAs. Replace with a routing service before operational use.
 */

export interface OptimizerParams {
  /** Road distance = roadFactor * great-circle distance. */
  roadFactor: number;
  /** Average unit speed in km/h. */
  speedKmh: number;
  /** Minutes from decision to wheels rolling. */
  mobilizationMin: number;
  /** Units further than this many minutes away are out of range (0 value). */
  maxTravelMin: number;
  /** Minimum p*q (0..1) for an assignment to be worth dispatching. */
  minValue: number;
}

export const DEFAULT_OPTIMIZER_PARAMS: OptimizerParams = {
  roadFactor: 1.3,
  speedKmh: 35,
  mobilizationMin: 10,
  maxTravelMin: 90,
  minValue: 0.02,
};

export interface CandidateAtm {
  atmId: string;
  label: string;
  lat: number;
  lng: number;
  /** Model probability (0..1) that the next cash-out happens here. */
  probability: number;
  /** Lognormal time-to-cash-out in hours, measured from generatedAt. */
  timeToCashOut: { p10Hours: number; medianHours: number; p90Hours: number };
  generatedAt: number;
}

export interface PlanUnit {
  id: string;
  callsign: string;
  lat: number;
  lng: number;
  available: boolean;
}

export interface Assignment {
  unitId: string;
  atmId: string;
  distanceKm: number;
  travelMin: number;
  /** Epoch ms at which the unit is in position if dispatched at nowMs. */
  etaMs: number;
  /** q: probability the unit is in position before the cash-out. */
  inPositionProb: number;
  /** v = p * q, the unit's contribution to the plan objective. */
  value: number;
  /** Minutes between ETA and the earliest plausible cash-out (P10). Negative = late for P10. */
  slackToP10Min: number;
}

export interface UncoveredAtm {
  atmId: string;
  probability: number;
  reason: 'no-unit-in-range' | 'no-units-left';
}

export interface InterceptionPlan {
  nowMs: number;
  assignments: Assignment[];
  uncovered: UncoveredAtm[];
  /** Sum of v over assignments: P(a unit is in position before the cash-out), under the model. */
  expectedInterceptionProb: number;
  /** Same objective for the greedy-by-probability baseline (for comparison). */
  greedyBaselineProb: number;
  /** Total model probability mass over the candidate ATMs (should be ~1 if all ATMs passed in). */
  candidateMass: number;
  /** Units not assigned to anything useful. */
  standbyUnitIds: string[];
}

// ---------------------------------------------------------------------------------------
// Probability helpers
// ---------------------------------------------------------------------------------------

/** Standard normal CDF via the Abramowitz-Stegun 7.1.26 erf approximation (abs err < 1.5e-7). */
export function normalCdf(x: number): number {
  const s = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erf = 1 - poly * Math.exp(-z * z);
  return 0.5 * (1 + s * erf);
}

/** Survival function S(t) = P(T > t) of a lognormal with the given median and log-sigma. */
export function lognormalSurvival(tHours: number, medianHours: number, logSigma: number): number {
  if (tHours <= 0) return 1;
  return 1 - normalCdf((Math.log(tHours) - Math.log(medianHours)) / logSigma);
}

/** Recover the lognormal shape from the reported P10/P90 (they were built as median*exp(-/+ z90*sigma)). */
export function logSigmaFromQuantiles(p10: number, p90: number): number {
  const Z90 = 1.2815515655446004;
  return (Math.log(p90) - Math.log(p10)) / (2 * Z90);
}

export function haversineKmLocal(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Initial great-circle bearing in degrees (0 = north, clockwise). */
export function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export function compassPoint(deg: number): string {
  return COMPASS[Math.round(deg / 22.5) % 16];
}

// ---------------------------------------------------------------------------------------
// Hungarian algorithm (maximisation, rectangular)
// ---------------------------------------------------------------------------------------

/**
 * Returns, for each row, the assigned column (or -1). Maximises the sum of value[row][col].
 * Kuhn-Munkres with potentials, run on a square matrix padded with zero-value cells.
 */
export function hungarianMax(value: number[][]): number[] {
  const nRows = value.length;
  const nCols = nRows ? value[0].length : 0;
  const n = Math.max(nRows, nCols);
  if (n === 0) return [];
  let maxV = 0;
  for (const r of value) for (const v of r) if (v > maxV) maxV = v;
  // cost = maxV - value, padded cells have value 0 -> cost maxV
  const cost = (i: number, j: number) => (i < nRows && j < nCols ? maxV - value[i][j] : maxV);

  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(n + 1).fill(0);
  const p = new Array<number>(n + 1).fill(0); // p[j] = row matched to column j (1-based)
  const way = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(n + 1).fill(Infinity);
    const used = new Array<boolean>(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = cost(i0 - 1, j - 1) - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const result = new Array<number>(nRows).fill(-1);
  for (let j = 1; j <= n; j++) {
    const row = p[j] - 1;
    const col = j - 1;
    if (row >= 0 && row < nRows && col < nCols) result[row] = col;
  }
  return result;
}

// ---------------------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------------------

interface PairEval {
  distanceKm: number;
  travelMin: number;
  etaMs: number;
  q: number;
  value: number;
  slackToP10Min: number;
}

function evalPair(
  unit: PlanUnit,
  atm: CandidateAtm,
  nowMs: number,
  params: OptimizerParams,
): PairEval {
  const distanceKm = haversineKmLocal(unit.lat, unit.lng, atm.lat, atm.lng);
  const travelMin = params.mobilizationMin + ((params.roadFactor * distanceKm) / params.speedKmh) * 60;
  const etaMs = nowMs + travelMin * 60000;
  const { p10Hours, medianHours, p90Hours } = atm.timeToCashOut;
  const sigma = logSigmaFromQuantiles(p10Hours, p90Hours);
  const elapsedH = Math.max(0, (nowMs - atm.generatedAt) / 3600000);
  const arriveH = (etaMs - atm.generatedAt) / 3600000;
  const sNow = lognormalSurvival(elapsedH, medianHours, sigma);
  // If the model says the cash-out should almost surely have happened already, q is ~0.
  const q = sNow > 1e-9 ? Math.min(1, lognormalSurvival(arriveH, medianHours, sigma) / sNow) : 0;
  const p10Ms = atm.generatedAt + p10Hours * 3600000;
  const inRange = travelMin <= params.maxTravelMin;
  return {
    distanceKm,
    travelMin,
    etaMs,
    q,
    value: inRange ? atm.probability * q : 0,
    slackToP10Min: (p10Ms - etaMs) / 60000,
  };
}

/** Greedy baseline: walk ATMs by probability, give each the free unit with the best value. */
function greedyValue(evals: PairEval[][], atms: CandidateAtm[], minValue: number): number {
  const usedUnits = new Set<number>();
  let total = 0;
  const order = atms.map((_, j) => j).sort((a, b) => atms[b].probability - atms[a].probability);
  for (const j of order) {
    let best = -1;
    let bestV = 0;
    for (let i = 0; i < evals.length; i++) {
      if (usedUnits.has(i)) continue;
      // Same limits as the optimizer, otherwise greedy wastes units on ~0 value pairs.
      if (evals[i][j].value >= minValue && evals[i][j].value > bestV) {
        bestV = evals[i][j].value;
        best = i;
      }
    }
    if (best >= 0) {
      usedUnits.add(best);
      total += bestV;
    }
  }
  return total;
}

export function planInterception(
  candidates: CandidateAtm[],
  units: PlanUnit[],
  nowMs: number,
  params: OptimizerParams = DEFAULT_OPTIMIZER_PARAMS,
): InterceptionPlan {
  const avail = units.filter((u) => u.available);
  const evals = avail.map((u) => candidates.map((c) => evalPair(u, c, nowMs, params)));
  const candidateMass = candidates.reduce((s, c) => s + c.probability, 0);

  const pick = avail.length && candidates.length ? hungarianMax(evals.map((row) => row.map((e) => e.value))) : [];

  const assignments: Assignment[] = [];
  const assignedAtm = new Set<number>();
  const assignedUnit = new Set<number>();
  pick.forEach((j, i) => {
    if (j < 0) return;
    const e = evals[i][j];
    if (e.value < params.minValue) return;
    assignedAtm.add(j);
    assignedUnit.add(i);
    assignments.push({
      unitId: avail[i].id,
      atmId: candidates[j].atmId,
      distanceKm: e.distanceKm,
      travelMin: e.travelMin,
      etaMs: e.etaMs,
      inPositionProb: e.q,
      value: e.value,
      slackToP10Min: e.slackToP10Min,
    });
  });
  assignments.sort((a, b) => b.value - a.value);

  const uncovered: UncoveredAtm[] = candidates
    .map((c, j) => ({ c, j }))
    .filter(({ j }) => !assignedAtm.has(j))
    .map(({ c, j }) => {
      const anyReach = evals.some((row) => row[j].value >= params.minValue);
      return {
        atmId: c.atmId,
        probability: c.probability,
        reason: anyReach ? ('no-units-left' as const) : ('no-unit-in-range' as const),
      };
    })
    .sort((a, b) => b.probability - a.probability);

  return {
    nowMs,
    assignments,
    uncovered,
    expectedInterceptionProb: assignments.reduce((s, a) => s + a.value, 0),
    greedyBaselineProb: greedyValue(evals, candidates, params.minValue),
    candidateMass,
    standbyUnitIds: avail.filter((_, i) => !assignedUnit.has(i)).map((u) => u.id),
  };
}

// ---------------------------------------------------------------------------------------
// Countdown / window status
// ---------------------------------------------------------------------------------------

export type WindowStatus = 'pending' | 'open' | 'expired';

export interface CashOutWindow {
  status: WindowStatus;
  p10Ms: number;
  medianMs: number;
  p90Ms: number;
  /** ms until P10 (negative once it has passed). */
  toP10Ms: number;
  toMedianMs: number;
  toP90Ms: number;
}

/** pending = before P10, open = between P10 and P90, expired = after P90 (regenerate the prediction). */
export function cashOutWindow(
  generatedAt: number,
  ttc: { p10Hours: number; medianHours: number; p90Hours: number },
  nowMs: number,
): CashOutWindow {
  const p10Ms = generatedAt + ttc.p10Hours * 3600000;
  const medianMs = generatedAt + ttc.medianHours * 3600000;
  const p90Ms = generatedAt + ttc.p90Hours * 3600000;
  const status: WindowStatus = nowMs < p10Ms ? 'pending' : nowMs <= p90Ms ? 'open' : 'expired';
  return {
    status,
    p10Ms,
    medianMs,
    p90Ms,
    toP10Ms: p10Ms - nowMs,
    toMedianMs: medianMs - nowMs,
    toP90Ms: p90Ms - nowMs,
  };
}

/** "01:12:05" for future, "+00:03:10" for past. */
export function formatCountdown(ms: number): string {
  const sign = ms < 0 ? '+' : '';
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${sign}${pad(h)}:${pad(m)}:${pad(s)}`;
}
