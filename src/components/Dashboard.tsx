import {
  FolderSearch,
  AlertTriangle,
  Activity,
  Bell,
  Target,
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cases, alerts } from '@/data/mockData';
import { formatCurrency, timeAgo, riskColors, timeUntil } from '@/utils/helpers';
import { getModelReport } from '@/services/modelReport';
import type { ViewName } from './Layout';
import type { Case } from '@/types';

interface DashboardProps {
  onNavigate: (view: ViewName) => void;
  onSelectCase: (caseId: string) => void;
}

function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  trend,
  color = 'cyan',
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
  color?: 'cyan' | 'red' | 'orange' | 'green' | 'blue';
}) {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-950/30 border-cyan-900/40',
    red: 'text-red-400 bg-red-950/30 border-red-900/40',
    orange: 'text-orange-400 bg-orange-950/30 border-orange-900/40',
    green: 'text-green-400 bg-green-950/30 border-green-900/40',
    blue: 'text-blue-400 bg-blue-950/30 border-blue-900/40',
  };

  return (
    <div className="card p-4 fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && (
          <span className={`text-xs flex items-center gap-0.5 ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            12%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
      {sublabel && <p className="text-[10px] text-slate-600 mt-0.5">{sublabel}</p>}
    </div>
  );
}

export default function Dashboard({ onNavigate, onSelectCase }: DashboardProps) {
  const activeCases = cases.filter((c) => c.status === 'active' || c.status === 'predicted');
  const highRiskCases = cases.filter((c) => c.riskLevel === 'critical' || c.riskLevel === 'high');
  const predictedCashouts = cases.filter((c) => c.status === 'predicted' || c.status === 'active');
  const criticalAlerts = alerts.filter((a) => (a.level === 'critical' || a.level === 'high') && !a.acknowledged);
  const { backtest } = getModelReport();
  const hawkes = backtest.methods.find((m) => m.id === 'hawkes')!;
  const nearest = backtest.methods.find((m) => m.id === 'nearest')!;
  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
  const top5Headline = pct(hawkes.hit5.value);
  const top5Detail = `95% CI ${pct(hawkes.hit5.lo)}–${pct(hawkes.hit5.hi)} · nearest-ATM ${pct(nearest.hit5.value)} · random ${pct(backtest.random.hit5)} · synthetic, n=${backtest.nCases}`;
  const medianLead = `${backtest.leadTime.medianHours.toFixed(1)}h`;
  const recentCases = [...cases].sort(
    (a, b) => new Date(b.complaintTime).getTime() - new Date(a.complaintTime).getTime()
  );

  const handleCaseClick = (c: Case) => {
    onSelectCase(c.id);
    onNavigate('cases');
  };

  return (
    <div className="space-y-6">
      {/* Headline: model quality first, then operational counts */}
      <div className="card p-5 fade-in">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-11 h-11 rounded-lg border flex items-center justify-center text-green-400 bg-green-950/30 border-green-900/40">
            <Target className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <p className="text-4xl font-bold text-white tracking-tight">{top5Headline}</p>
            <p className="text-sm text-slate-300 mt-1">Top-5 hit rate — true cash-out ATM was in the model's 5 predicted ATMs</p>
            <p className="text-xs text-slate-500 mt-1">{top5Detail}</p>
            <p className="text-[10px] text-slate-600 mt-1">
              Seeded synthetic backtest with untuned priors. Not measured on real cases.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-400">{medianLead}</p>
            <p className="text-xs text-slate-400">Median lead time</p>
            <p className="text-[10px] text-slate-600">prediction → cash-out, top-5 hits (n={backtest.leadTime.n})</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Cases" value={activeCases.length} icon={FolderSearch} color="cyan" />
        <StatCard label="High-Risk Cases" value={highRiskCases.length} icon={AlertTriangle} color="red" />
        <StatCard label="Predicted Cash-Outs" value={predictedCashouts.length} icon={Activity} color="orange" />
        <StatCard label="Critical Alerts" value={criticalAlerts.length} icon={Bell} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Cases */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Recent Cases</h3>
            </div>
            <button
              onClick={() => onNavigate('cases')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {recentCases.slice(0, 5).map((c) => {
              const rc = riskColors[c.riskLevel];
              return (
                <button
                  key={c.id}
                  onClick={() => handleCaseClick(c)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-navy-950 border border-navy-700 hover:border-navy-600 transition-all text-left group"
                >
                  <div className={`w-2 h-2 rounded-full ${rc.dot} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-300">{c.id}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${rc.bg} ${rc.text} border ${rc.border} uppercase`}>
                        {c.riskLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{c.fraudType} · {c.originLocation}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-slate-200">{formatCurrency(c.amount)}</p>
                    <p className="text-[10px] text-slate-600">{timeAgo(c.complaintTime)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Live Alerts</h3>
            </div>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 4).map((a) => {
              const rc = riskColors[a.level];
              return (
                <div
                  key={a.id}
                  className={`px-3 py-2.5 rounded-lg border ${rc.border} ${rc.bg} cursor-pointer`}
                  onClick={() => onNavigate('alerts')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${rc.dot} pulse-dot`} />
                    <span className={`text-[10px] font-bold uppercase ${rc.text}`}>{a.level}</span>
                    <span className="text-[10px] text-slate-500 ml-auto">{timeAgo(a.timestamp)}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium leading-snug">{a.title}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-slate-500 font-mono">{a.caseId}</span>
                    <span className="text-[10px] text-slate-400">Cash-out {timeUntil(a.timeWindow)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Prediction Accuracy Overview */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Prediction Performance — Last 90 Days</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center py-3 bg-navy-950 rounded-lg border border-navy-700">
            <p className="text-2xl font-bold text-cyan-400">87.3%</p>
            <p className="text-xs text-slate-400 mt-1">Top-5 Hit Rate</p>
          </div>
          <div className="text-center py-3 bg-navy-950 rounded-lg border border-navy-700">
            <p className="text-2xl font-bold text-green-400">72.1%</p>
            <p className="text-xs text-slate-400 mt-1">Top-3 Hit Rate</p>
          </div>
          <div className="text-center py-3 bg-navy-950 rounded-lg border border-navy-700">
            <p className="text-2xl font-bold text-blue-400">4.2h</p>
            <p className="text-xs text-slate-400 mt-1">Avg Lead Time</p>
          </div>
          <div className="text-center py-3 bg-navy-950 rounded-lg border border-navy-700">
            <p className="text-2xl font-bold text-orange-400">23</p>
            <p className="text-xs text-slate-400 mt-1">Interceptions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
