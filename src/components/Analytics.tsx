import {
  BarChart3,
  TrendingUp,
  PieChart,
  Activity,
  Layers,
  Target,
  DollarSign,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cases, transactions, atmClusters, districts } from '@/data/mockData';
import { riskColor } from '@/utils/helpers';
import { getModelReport } from '@/services/modelReport';

const CHART_COLORS = ['#22d3ee', '#3b82f6', '#f97316', '#eab308', '#22c55e', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#14b8a6'];

const tooltipStyle = {
  backgroundColor: '#0e1330',
  border: '1px solid #1c2550',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#e2e8f0',
};

export default function Analytics() {
  // Fraud by state
  const stateAgg = districts.map((d) => {
    const stateCases = cases.filter((c) => c.originState === d.state);
    return {
      state: d.state,
      cases: stateCases.length,
      amount: stateCases.reduce((s, c) => s + c.amount, 0),
    };
  }).filter((s) => s.cases > 0);

  // Fraud by type
  const typeAgg = cases.reduce((acc, c) => {
    const existing = acc.find((a) => a.name === c.fraudType);
    if (existing) existing.value++;
    else acc.push({ name: c.fraudType, value: 1 });
    return acc;
  }, [] as { name: string; value: number }[]);

  // Transaction amount distribution
  const amountDist = transactions.map((t) => ({
    ref: t.reference.slice(-4),
    amount: t.amount / 100000,
  }));

  const report = getModelReport();
  const { backtest, conformal } = report;
  const pctv = (v: number) => Math.round(v * 1000) / 10;
  const hitRateData = (['hit1', 'hit3', 'hit5'] as const).map((k, i) => ({
    name: ['Top-1', 'Top-3', 'Top-5'][i],
    ...Object.fromEntries(backtest.methods.map((m) => [m.label, pctv(m[k].value)])),
    'Random ranking': pctv(backtest.random[k]),
  }));
  const leadHist = backtest.leadTime.histogram;

  // Risk distribution
  const riskDist = (['critical', 'high', 'medium', 'low'] as const).map((level) => ({
    name: level,
    count: cases.filter((c) => c.riskLevel === level).length,
    fill: riskColor(level),
  }));

  // Layer distribution
  const layerDist = [1, 2, 3, 4].map((layer) => ({
    layer: `Layer ${layer}`,
    cases: cases.filter((c) => c.transactionLayers === layer).length,
  }));

  // Top ATM clusters
  const topClusters = [...atmClusters]
    .sort((a, b) => b.historicalHitRate - a.historicalHitRate)
    .slice(0, 7)
    .map((c) => ({
      name: c.name.replace(' Cluster', ''),
      hitRate: Math.round(c.historicalHitRate * 100),
      atms: c.atmCount,
    }));

  return (
    <div className="space-y-4">
      {/* Headline: backtest hit rate */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Backtest Hit Rate — Hawkes vs Baselines</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          {backtest.nCases} seeded synthetic cases, {backtest.nAtms} ATMs. Hidden generator differs from the model; priors are untuned. Not real data.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={hitRateData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2550" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} unit="%" />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#0e1330' }} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
            <Bar dataKey="Hawkes model" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Nearest ATM to last hop" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Historical frequency" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Random ranking" fill="#475569" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs text-slate-300">
            <thead className="text-slate-500">
              <tr>
                <th className="text-left py-1">Method</th>
                <th className="text-right">Top-1</th>
                <th className="text-right">Top-3</th>
                <th className="text-right">Top-5 (95% CI)</th>
                <th className="text-right">MRR</th>
              </tr>
            </thead>
            <tbody>
              {backtest.methods.map((m) => (
                <tr key={m.id} className="border-t border-navy-700">
                  <td className="py-1">{m.label}</td>
                  <td className="text-right">{pctv(m.hit1.value)}%</td>
                  <td className="text-right">{pctv(m.hit3.value)}%</td>
                  <td className="text-right">{pctv(m.hit5.value)}% ({pctv(m.hit5.lo)}–{pctv(m.hit5.hi)})</td>
                  <td className="text-right">{m.mrr.value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fraud by State */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Fraud by State</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stateAgg}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2550" />
              <XAxis dataKey="state" tick={{ fill: '#64748b', fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#0e1330' }} />
              <Bar dataKey="cases" fill="#22d3ee" radius={[4, 4, 0, 0]} name="Cases" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fraud by Type */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Fraud Type Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <RePieChart>
              <Pie
                data={typeAgg}
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#475569' }}
              >
                {typeAgg.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#0a0e27" />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Transaction Amount Distribution */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Transaction Amount Distribution (in Lakhs)</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={amountDist}>
              <defs>
                <linearGradient id="amtGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2550" />
              <XAxis dataKey="ref" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#22d3ee' }} />
              <Area type="monotone" dataKey="amount" stroke="#22d3ee" strokeWidth={2} fill="url(#amtGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lead time distribution */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Lead Time: Prediction → Cash-Out (synthetic)</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={leadHist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2550" />
              <XAxis dataKey="bucket" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#0e1330' }} />
              <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} name="Cases" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Distribution */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Risk Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <RePieChart>
              <Pie data={riskDist} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="name">
                {riskDist.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} stroke="#0a0e27" />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
            </RePieChart>
          </ResponsiveContainer>
        </div>

        {/* Layer Distribution */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Transaction Layer Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={layerDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2550" />
              <XAxis dataKey="layer" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#0e1330' }} />
              <Bar dataKey="cases" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Calibration */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Calibration (synthetic)</h3>
          </div>
          <dl className="text-xs space-y-2.5 text-slate-300">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Conformal target coverage</dt>
              <dd>{pctv(conformal.target)}%</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Observed, held-out half (n={conformal.nTest})</dt>
              <dd>{pctv(conformal.heldOut.coverage)}%</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Mean over {conformal.repeated.reps} re-splits (range)</dt>
              <dd>{pctv(conformal.repeated.meanCoverage)}% ({pctv(conformal.repeated.minCoverage)}–{pctv(conformal.repeated.maxCoverage)})</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Avg set size (of {backtest.nAtms} ATMs)</dt>
              <dd>{conformal.heldOut.avgSetSize.toFixed(1)}</dd>
            </div>
            <div className="flex justify-between gap-3 pt-2 border-t border-navy-700">
              <dt className="text-slate-500">P10–P90 time window: nominal 80%</dt>
              <dd>observed {pctv(backtest.windowCoverage.value)}%</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Top ATM Clusters */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Top ATM Clusters by Historical Hit Rate</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topClusters} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2550" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 100]} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={120} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#0e1330' }} />
            <Bar dataKey="hitRate" fill="#22d3ee" radius={[0, 4, 4, 0]} name="Hit Rate %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
