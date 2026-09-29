import { useState } from 'react';
import { useAccess } from '@/context/AccessContext';
import {
  Activity,
  MapPin,
  Clock,
  Target,
  TrendingUp,
  Gauge,
  ChevronRight,
  AlertTriangle,
  Crosshair,
  Siren,
} from 'lucide-react';
import { cases, patrolUnits } from '@/data/mockData';
import { useCasePlan } from '@/hooks/useCasePlan';
import { WindowChip } from '@/components/Countdown';
import { formatCurrency, formatDateTime, riskColors, timeUntil } from '@/utils/helpers';
import type { Prediction } from '@/types';

interface CashOutPredictionProps {
  caseId: string | null;
  onViewMap: (caseId: string) => void;
  onViewXAI: (caseId: string, prediction: Prediction) => void;
  onLockTarget: (caseId: string, atmId: string) => void;
}

export default function CashOutPrediction({ caseId, onViewMap, onViewXAI, onLockTarget }: CashOutPredictionProps) {
  const [selectedCaseId, setSelectedCaseId] = useState(caseId ?? cases[0].id);

  const caseData = cases.find((c) => c.id === selectedCaseId) ?? cases[0];
  const { top5: predictions, plan } = useCasePlan(caseData);
  const unitById = new Map(patrolUnits.map((u) => [u.id, u]));

  const { text, can } = useAccess();

  const handleSelectCase = (id: string) => {
    setSelectedCaseId(id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Case selector */}
      <div className="card p-4 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto">
        <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Select Case</h4>
        <div className="space-y-2">
          {cases.filter((c) => c.status !== 'closed').map((c) => {
            const rc = riskColors[c.riskLevel];
            const active = selectedCaseId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handleSelectCase(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                  active
                    ? 'bg-cyan-950/20 border-cyan-800/40'
                    : 'bg-navy-950 border-navy-700 hover:border-navy-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />
                  <span className="text-xs font-mono text-slate-300">{c.id}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{c.fraudType}</p>
                <p className="text-xs font-medium text-slate-200 mt-0.5">{formatCurrency(c.amount)}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Predictions */}
      <div className="lg:col-span-3 space-y-4">
        {/* Case summary bar */}
        <div className="card p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{caseData.id}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${riskColors[caseData.riskLevel].bg} ${riskColors[caseData.riskLevel].text} border ${riskColors[caseData.riskLevel].border}`}>
                  {caseData.riskLevel}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{caseData.fraudType} · {formatCurrency(caseData.amount)} · {caseData.transactionLayers} layers</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-500">AI Risk Score</p>
                <p className="text-xl font-bold text-cyan-400">{caseData.riskScore}</p>
              </div>
              <button
                onClick={() => onViewMap(caseData.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-600 text-xs text-slate-200 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" /> View on Map
              </button>
            </div>
          </div>
        </div>

        {/* Prediction header */}
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Top 5 Predicted Cash-Out Locations</h3>
          <span className="text-[10px] text-slate-500 ml-auto">Synthetic ML Model — v2.1</span>
        </div>

        {/* Interception plan summary */}
        <div className="card p-3 flex items-center gap-3 flex-wrap border-violet-800/30">
          <Siren className="w-4 h-4 text-violet-400" />
          <p className="text-xs text-slate-300">
            <span className="font-semibold text-white">{plan.assignments.length}</span> of{' '}
            {patrolUnits.length} simulated units dispatched · chance a unit is in place before the cash-out{' '}
            <span className="font-semibold text-violet-300">{(plan.expectedInterceptionProb * 100).toFixed(1)}%</span>{' '}
            <span className="text-slate-500">(greedy {(plan.greedyBaselineProb * 100).toFixed(1)}%)</span>
          </p>
        </div>

        {/* Prediction cards */}
        <div className="space-y-3">
          {predictions.map((pred, i) => {
            const rc = pred.probability >= 25 ? riskColors.critical : pred.probability >= 15 ? riskColors.high : pred.probability >= 8 ? riskColors.medium : riskColors.low;
            return (
              <div key={pred.atmId} className={`card p-4 border-l-4 ${rc.border} fade-in`} style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-start gap-4">
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg flex-shrink-0 ${rc.bg} ${rc.text} border ${rc.border}`}>
                    #{i + 1}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-white">{pred.label}</h4>
                        <p className="text-xs text-slate-500">{pred.bank} · {pred.district}, {pred.state}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-2xl font-bold ${rc.text}`}>{pred.probability}%</p>
                        <p className="text-[10px] text-slate-500 uppercase">Probability</p>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                      <div className="bg-navy-950 rounded-lg px-2.5 py-2 border border-navy-700">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span className="text-[10px] text-slate-500 uppercase">Expected</span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium">{formatDateTime(pred.expectedTime)}</p>
                        <p className="text-[10px] text-cyan-400">{timeUntil(pred.expectedTime)}</p>
                      </div>
                      <div className="bg-navy-950 rounded-lg px-2.5 py-2 border border-navy-700">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Gauge className="w-3 h-3 text-slate-500" />
                          <span className="text-[10px] text-slate-500 uppercase">{Math.round(pred.conformal.targetCoverage * 100)}% Set</span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium">{pred.conformal.inSet ? 'Inside' : 'Outside'}</p>
                        <p className="text-[10px] text-slate-500">{pred.conformal.setSize} ATMs · synthetic calib.</p>
                      </div>
                      <div className="bg-navy-950 rounded-lg px-2.5 py-2 border border-navy-700">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span className="text-[10px] text-slate-500 uppercase">Distance</span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium">{pred.distanceKm} km</p>
                      </div>
                      <div className="bg-navy-950 rounded-lg px-2.5 py-2 border border-navy-700">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Target className="w-3 h-3 text-slate-500" />
                          <span className="text-[10px] text-slate-500 uppercase">Time Window</span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium">
                          {pred.timeToCashOut.p10Hours.toFixed(1)}–{pred.timeToCashOut.p90Hours.toFixed(1)} h
                        </p>
                        <p className="text-[10px] text-slate-500">P10–P90 from now</p>
                      </div>
                    </div>

                    {/* Interception: assigned unit + live window */}
                    {(() => {
                      const a = plan.assignments.find((x) => x.atmId === pred.atmId);
                      const u = a ? unitById.get(a.unitId) : null;
                      return (
                        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap bg-violet-950/10 rounded-lg px-3 py-2 border border-violet-800/30">
                          <span className="text-[11px] text-slate-300">
                            <Siren className="w-3 h-3 text-violet-400 inline mr-1.5 -mt-0.5" />
                            {u && a ? (
                              <>
                                <span className="font-mono text-violet-300">{u.callsign}</span> · ETA {a.travelMin.toFixed(0)} min ·{' '}
                                <span className={a.slackToP10Min >= 0 ? 'text-slate-400' : 'text-amber-300'}>
                                  {a.slackToP10Min >= 0 ? '+' : ''}
                                  {a.slackToP10Min.toFixed(0)} min vs earliest cash-out
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-500">No unit can be in place in time</span>
                            )}
                          </span>
                          <WindowChip prediction={pred} />
                        </div>
                      );
                    })()}

                    {/* Top reason preview */}
                    <div className="mt-3 bg-navy-950/50 rounded-lg px-3 py-2 border border-navy-700">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="w-3 h-3 text-cyan-400" />
                        <span className="text-[10px] text-cyan-400 uppercase tracking-wider">Why this prediction</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{text(pred.reasons[0], caseData.id)}</p>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">{text(pred.reasons[1], caseData.id)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => onViewXAI(caseData.id, pred)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-600 text-[11px] text-slate-200 transition-colors"
                      >
                        <AlertTriangle className="w-3 h-3" /> Explain AI
                        <ChevronRight className="w-3 h-3" />
                      </button>
                      {can('dispatch') && (
                      <button
                        onClick={() => onLockTarget(caseData.id, pred.atmId)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/40 border border-red-800/50 text-[11px] text-red-300 transition-colors"
                      >
                        <Crosshair className="w-3 h-3" /> Lock target
                      </button>
                      )}
                      <button
                        onClick={() => onViewMap(caseData.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-600 text-[11px] text-slate-200 transition-colors"
                      >
                        <MapPin className="w-3 h-3" /> Show on Map
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
