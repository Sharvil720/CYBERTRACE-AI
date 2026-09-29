import type { Case, Prediction, XAIFactor } from '@/types';
import { atms, atmClusters, accounts, transactions, cashOutEvents, patrolUnits } from '@/data/mockData';
import {
  DEFAULT_PARAMS,
  haversineKm,
  meanGapHours,
  scoreAtms,
  timeToCashOut,
  toPercentShares,
  type AtmNode,
  type AtmScore,
  type HawkesEvent,
  type HawkesParams,
} from '@/services/hawkes';
import { buildAtmNodes } from '@/services/atmNodes';
import { getModelReport } from '@/services/modelReport';
import { predictionSet } from '@/services/conformal';
import {
  DEFAULT_OPTIMIZER_PARAMS,
  planInterception,
  type CandidateAtm,
  type InterceptionPlan,
  type OptimizerParams,
} from '@/services/optimizer';

/**
 * Wires the pure Hawkes engine (hawkes.ts) to the app's (simulated) data.
 * Every number shown to the user is computed here; nothing is hardcoded.
 */

const accountById = new Map(accounts.map((a) => [a.id, a]));

const atmNodes: AtmNode[] = buildAtmNodes(DEFAULT_PARAMS);

/** Each hop landing in an account is one event at that account's location. */
export function buildEvents(caseData: Case): HawkesEvent[] {
  return transactions
    .filter((t) => t.caseId === caseData.id)
    .flatMap((t) => {
      const dest = accountById.get(t.toAccount);
      if (!dest) return [];
      return [
        {
          id: t.id,
          lat: dest.lat,
          lng: dest.lng,
          tMs: new Date(t.timestamp).getTime(),
          layer: t.layer,
          weight: Math.min(1, t.amount / caseData.amount),
        },
      ];
    })
    .sort((a, b) => a.tMs - b.tMs);
}

/** Transaction velocity (hops/hour). Numeric sort, unlike the old string sort. */
export function transactionVelocity(caseData: Case): number {
  const ev = buildEvents(caseData);
  if (ev.length < 2) return 0;
  const spanH = (ev[ev.length - 1].tMs - ev[0].tMs) / 3600000;
  return spanH > 0 ? ev.length / spanH : ev.length;
}

function scoreCase(caseData: Case, nowMs: number, params: HawkesParams) {
  const events = buildEvents(caseData);
  const scores = scoreAtms(atmNodes, events, nowMs, params);
  return { events, scores, gapH: meanGapHours(events, params.defaultGapHours) };
}

export function predictCashOut(
  caseData: Case,
  nowMs: number = Date.now(),
  params: HawkesParams = DEFAULT_PARAMS,
  /** How many ATMs to return, best first. The UI shows 5; the optimizer asks for all of them. */
  topN = 5,
): Prediction[] {
  const { events, scores, gapH } = scoreCase(caseData, nowMs, params);
  const top = [...scores].sort((a, b) => b.probability - a.probability).slice(0, topN);
  const lastEvent = events[events.length - 1];
  const report = getModelReport().conformal;
  const setIdx = new Set(predictionSet(scores.map((s) => s.probability), report.calibration));
  const atmIndex = new Map(atmNodes.map((n, i) => [n.id, i]));

  return top.map((score) => {
    const atm = atms.find((a) => a.id === score.atmId)!;
    const cluster = atmClusters.find((c) => c.id === atm.clusterId)!;
    const ttc = timeToCashOut(score, gapH, params);
    const dominant = [...score.terms].sort((a, b) => b.contribution - a.contribution)[0];

    const distKm = lastEvent
      ? haversineKm(lastEvent.lat, lastEvent.lng, atm.lat, atm.lng)
      : haversineKm(caseData.originLat, caseData.originLng, atm.lat, atm.lng);

    const at = (h: number) => new Date(nowMs + h * 3600000).toISOString();
    const reasons: string[] = [];
    if (dominant) {
      const ev = events.find((e) => e.id === dominant.eventId)!;
      const tx = transactions.find((t) => t.id === ev.id)!;
      const holder = accountById.get(tx.toAccount);
      reasons.push(
        `Strongest signal: layer ${ev.layer} hop into ${holder?.holderName ?? 'account'} (${holder?.bank ?? ''}, ${holder?.district ?? ''}) landed ${dominant.dtHours.toFixed(1)} h ago, ${dominant.distanceKm.toFixed(0)} km from this ATM (spatial kernel ${dominant.kernel.toFixed(2)}, recency ${dominant.decay.toFixed(2)}).`,
      );
    }
    reasons.push(
      `Hawkes intensity λ = ${score.lambda.toFixed(3)} (baseline ${score.baseline.toFixed(4)} + excitation ${score.excitation.toFixed(3)}) gives ${(score.probability * 100).toFixed(1)}% of total intensity across ${atms.length} ATMs.`,
    );
    reasons.push(
      `Baseline prior: cluster "${cluster.name}" hit rate ${(cluster.historicalHitRate * 100).toFixed(0)}% (simulated log).`,
    );
    reasons.push(
      `Chain rhythm: ${events.length} hops, mean gap ${gapH.toFixed(1)} h, velocity ${transactionVelocity(caseData).toFixed(1)} hops/h, ${caseData.transactionLayers} layers.`,
    );
    reasons.push(
      `Time to cash-out (lognormal): P10 ${ttc.p10Hours.toFixed(1)} h, median ${ttc.medianHours.toFixed(1)} h, P90 ${ttc.p90Hours.toFixed(1)} h.`,
    );
    const past = cashOutEvents.filter((co) => co.atmId === atm.id).length;
    if (past > 0) reasons.push(`${past} recorded cash-out(s) at this ATM in the simulated event log.`);

    return {
      atmId: atm.id,
      clusterId: atm.clusterId,
      label: `${atm.bank} ATM — ${atm.address}`,
      probability: Math.round(score.probability * 1000) / 10,
      expectedTime: at(ttc.medianHours),
      timeWindow: `${at(ttc.p10Hours)} — ${at(ttc.p90Hours)}`,
      conformal: {
        inSet: setIdx.has(atmIndex.get(score.atmId)!),
        setSize: setIdx.size,
        targetCoverage: report.target,
        heldOutCoverage: report.heldOut.coverage,
        basis: 'synthetic',
      },
      distanceKm: Math.round(distKm),
      reasons,
      bank: atm.bank,
      district: atm.district,
      state: atm.state,
      lat: atm.lat,
      lng: atm.lng,
      timeToCashOut: ttc,
      intensity: score.lambda,
      generatedAt: nowMs,
    } satisfies Prediction;
  });
}

/**
 * Exact additive decomposition of lambda_j: baseline prior + one term per source hop.
 * Shares are computed from the model and sum to exactly 100.
 */
export function getXAIFactors(
  caseData: Case,
  prediction: Prediction,
  params: HawkesParams = DEFAULT_PARAMS,
): XAIFactor[] {
  const { scores } = scoreCase(caseData, prediction.generatedAt, params);
  const score: AtmScore | undefined = scores.find((s) => s.atmId === prediction.atmId);
  if (!score) return [];
  const cluster = atmClusters.find((c) => c.id === prediction.clusterId);

  const parts = [
    {
      label: 'Historical cluster prior (baseline μ)',
      value: score.baseline,
      description: `Cluster "${cluster?.name}" hit rate ${((cluster?.historicalHitRate ?? 0) * 100).toFixed(0)}% × μ0 ${params.mu0} = ${score.baseline.toFixed(4)} (simulated log).`,
    },
    ...score.terms.map((t) => {
      const tx = transactions.find((x) => x.id === t.eventId)!;
      const holder = accountById.get(tx.toAccount);
      return {
        label: `Layer ${tx.layer} hop → ${holder?.holderName ?? 'account'} (${holder?.district ?? '?'})`,
        value: t.contribution,
        description: `${tx.method} of ₹${tx.amount.toLocaleString('en-IN')} landed ${t.dtHours.toFixed(1)} h ago, ${t.distanceKm.toFixed(0)} km from ATM. recency e^(-β·Δt) = ${t.decay.toFixed(2)}, spatial K = ${t.kernel.toFixed(2)}, layer γ^(L-1) = ${t.layerFactor.toFixed(2)}.`,
      };
    }),
  ];

  const shares = toPercentShares(parts.map((p) => p.value));
  return parts
    .map((p, i) => ({ label: p.label, weight: shares[i], description: p.description }))
    .sort((a, b) => b.weight - a.weight);
}

/** Optimizer input from predictions. Prediction.probability is in percent (0.1% resolution). */
export function toCandidates(predictions: Prediction[]): CandidateAtm[] {
  return predictions.map((p) => ({
    atmId: p.atmId,
    label: p.label,
    lat: p.lat,
    lng: p.lng,
    probability: p.probability / 100,
    timeToCashOut: p.timeToCashOut,
    generatedAt: p.generatedAt,
  }));
}

/**
 * Re-run the interception plan for already generated predictions at a later dispatch time.
 * Units are SIMULATED (see patrolUnits in mockData).
 */
export function replanInterception(
  predictions: Prediction[],
  nowMs: number,
  params: OptimizerParams = DEFAULT_OPTIMIZER_PARAMS,
): InterceptionPlan {
  return planInterception(toCandidates(predictions), patrolUnits, nowMs, params);
}

export { haversineKm };
