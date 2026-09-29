import {
  Brain,
  TrendingUp,
  Users,
  Zap,
  MapPin,
  Clock,
  History,
  ChevronRight,
} from 'lucide-react';
import { cases } from '@/data/mockData';
import { getXAIFactors } from '@/services/predictionEngine';
import { predictCashOut } from '@/services/predictionEngine';
import type { Prediction } from '@/types';
import { useAccess, useCaseViewAudit } from '@/context/AccessContext';
import PiiNotice from '@/components/PiiNotice';

interface ExplainableAIProps {
  caseId: string | null;
  prediction: Prediction | null;
}

const factorIcons: Record<number, React.ComponentType<{ className?: string }>> = {
  0: TrendingUp,
  1: Users,
  2: Zap,
  3: MapPin,
  4: Clock,
  5: History,
};

export default function ExplainableAI({ caseId, prediction }: ExplainableAIProps) {
  const caseData = cases.find((c) => c.id === caseId) ?? cases[0];
  const pred = prediction ?? predictCashOut(caseData)[0];
  const factors = getXAIFactors(caseData, pred);
  const { text } = useAccess();
  useCaseViewAudit(caseData.id, 'explainable-ai');

  return (
    <div className="space-y-4">
      <PiiNotice caseId={caseData.id} />
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Explainable AI — Prediction Breakdown</h3>
        </div>
        <p className="text-xs text-slate-500">
          Understanding why the AI predicted this location for cash-out. Every prediction is traceable to interpretable factors.
        </p>

        <div className="mt-4 p-4 bg-navy-950 rounded-lg border border-navy-700">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Predicted Location</p>
              <h4 className="text-sm font-semibold text-white">{pred.label}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{pred.bank} · {pred.district}, {pred.state}</p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">{pred.probability}%</p>
                <p className="text-[10px] text-slate-500 uppercase">Probability</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">{pred.conformal.inSet ? 'In set' : 'Outside'}</p>
                <p className="text-[10px] text-slate-500 uppercase">{Math.round(pred.conformal.targetCoverage * 100)}% conformal set ({pred.conformal.setSize} ATMs, synthetic)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Factor Contribution Analysis</h4>
        </div>

        <div className="space-y-3">
          {factors.map((factor, i) => {
            const Icon = factorIcons[i] ?? TrendingUp;
            return (
              <div key={i} className="bg-navy-950 rounded-lg border border-navy-700 p-4 fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-950/30 border border-cyan-900/40 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-white">{text(factor.label, caseData.id)}</h5>
                      <span className="text-xs font-bold text-cyan-400">{factor.weight}%</span>
                    </div>
                    {/* Weight bar */}
                    <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                        style={{ width: `${factor.weight}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{text(factor.description, caseData.id)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All prediction reasons */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Full Reasoning Chain</h4>
        </div>
        <div className="space-y-2">
          {pred.reasons.map((reason, i) => (
            <div key={i} className="flex items-start gap-2.5 px-3 py-2 bg-navy-950 rounded-lg border border-navy-700">
              <span className="w-5 h-5 rounded-full bg-cyan-950/40 border border-cyan-900/40 flex items-center justify-center text-[10px] font-mono text-cyan-400 flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">{text(reason, caseData.id)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Model info */}
      <div className="card p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-400">Model: NIRAKSHAN Hawkes engine v1 (simulated data, uncalibrated priors)</span>
          </div>
          <span className="text-[10px] text-slate-600 font-mono">λ = μ + Σ α·w·e^(-βΔt)·K(d)·γ^(L-1)</span>
        </div>
      </div>
    </div>
  );
}
