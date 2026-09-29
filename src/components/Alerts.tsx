import { useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Clock, MapPin, ChevronRight, Filter } from 'lucide-react';
import { alerts as initialAlerts, cases } from '@/data/mockData';
import { formatDateTime, timeAgo, timeUntil, riskColors } from '@/utils/helpers';
import { useAccess } from '@/context/AccessContext';
import type { Alert, RiskLevel } from '@/types';

interface AlertsProps {
  onViewCase: (caseId: string) => void;
  onViewMap: (caseId: string) => void;
}

export default function Alerts({ onViewCase, onViewMap }: AlertsProps) {
  const { can, audit } = useAccess();
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [filter, setFilter] = useState<RiskLevel | 'all'>('all');

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.level === filter);

  const acknowledge = (id: string) => {
    const target = alerts.find((a) => a.id === id);
    if (!can('alert.ack')) {
      audit('access.denied', id, 'alert.ack not permitted for role');
      return;
    }
    audit('alert.ack', id, target ? `${target.caseId} ${target.level}` : '');
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  const levelOrder: Record<RiskLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...filtered].sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

  const counts = {
    critical: alerts.filter((a) => a.level === 'critical' && !a.acknowledged).length,
    high: alerts.filter((a) => a.level === 'high' && !a.acknowledged).length,
    medium: alerts.filter((a) => a.level === 'medium' && !a.acknowledged).length,
    low: alerts.filter((a) => a.level === 'low' && !a.acknowledged).length,
  };

  return (
    <div className="space-y-4">
      {/* Alert summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['critical', 'high', 'medium', 'low'] as RiskLevel[]).map((level) => {
          const rc = riskColors[level];
          return (
            <div key={level} className={`card p-4 border-l-4 ${rc.border}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${rc.text}`}>{counts[level]}</p>
                  <p className="text-xs text-slate-400 uppercase">{level}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg ${rc.bg} border ${rc.border} flex items-center justify-center`}>
                  <Bell className={`w-4 h-4 ${rc.text}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="card p-3 flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-500" />
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 text-[10px] uppercase rounded border transition-colors ${
              filter === f
                ? 'bg-cyan-950/40 border-cyan-800/50 text-cyan-300'
                : 'bg-navy-950 border-navy-700 text-slate-500 hover:text-slate-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      <div className="space-y-3">
        {sorted.map((alert) => {
          const rc = riskColors[alert.level];
          const caseData = cases.find((c) => c.id === alert.caseId);
          return (
            <div
              key={alert.id}
              className={`card p-4 border-l-4 ${rc.border} ${!alert.acknowledged ? rc.glow : ''} shadow-lg`}
            >
              <div className="flex items-start gap-3">
                {/* Alert icon */}
                <div className={`w-10 h-10 rounded-lg ${rc.bg} border ${rc.border} flex items-center justify-center flex-shrink-0`}>
                  {!alert.acknowledged ? (
                    <AlertTriangle className={`w-5 h-5 ${rc.text} ${alert.level === 'critical' ? 'pulse-dot' : ''}`} />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${rc.bg} ${rc.text} border ${rc.border}`}>
                      {alert.level}
                    </span>
                    <span className="text-xs font-mono text-slate-400">{alert.caseId}</span>
                    {alert.acknowledged && (
                      <span className="text-[10px] text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Acknowledged
                      </span>
                    )}
                    <span className="text-[10px] text-slate-600 ml-auto">{timeAgo(alert.timestamp)}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{alert.title}</h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{alert.predictedLocation}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Cash-out {timeUntil(alert.timeWindow)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Risk Score:</span>
                      <span className={`font-bold ${rc.text}`}>{alert.riskScore}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => onViewCase(alert.caseId)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-600 text-[11px] text-slate-200 transition-colors"
                    >
                      View Case <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onViewMap(alert.caseId)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-600 text-[11px] text-slate-200 transition-colors"
                    >
                      <MapPin className="w-3 h-3" /> View on Map
                    </button>
                    {!alert.acknowledged && !can('alert.ack') && (
                      <span className="ml-auto text-[10px] text-slate-500 self-center">Read only for your role</span>
                    )}
                    {!alert.acknowledged && can('alert.ack') && (
                      <button
                        onClick={() => acknowledge(alert.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-950/30 hover:bg-green-950/50 border border-green-800/40 text-[11px] text-green-400 transition-colors ml-auto"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
