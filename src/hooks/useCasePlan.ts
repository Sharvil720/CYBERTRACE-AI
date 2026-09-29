import { useMemo } from 'react';
import type { Case } from '@/types';
import { atms } from '@/data/mockData';
import { predictCashOut, replanInterception } from '@/services/predictionEngine';
import { DEFAULT_PARAMS } from '@/services/hawkes';
import { useNow } from '@/hooks/useNow';

/**
 * Predictions for every ATM, frozen at first render for the case (so they do not jitter on
 * re-render), plus an interception plan that is re-run every `replanEveryMs` as time passes.
 * Countdown widgets tick on their own; only the plan follows this slower clock.
 */
export function useCasePlan(caseData: Case, replanEveryMs = 15000) {
  const snapshot = useMemo(() => {
    const generatedAt = Date.now();
    return { generatedAt, all: predictCashOut(caseData, generatedAt, DEFAULT_PARAMS, atms.length) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData.id]);

  const now = useNow(replanEveryMs);
  const plan = useMemo(() => replanInterception(snapshot.all, now), [snapshot, now]);

  return { all: snapshot.all, top5: snapshot.all.slice(0, 5), generatedAt: snapshot.generatedAt, plan };
}
