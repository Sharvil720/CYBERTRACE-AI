import { useState } from 'react';
import {
  Search,
  Filter,
  ChevronRight,
  MapPin,
  Clock,
  DollarSign,
  Layers,
  User,
  AlertTriangle,
} from 'lucide-react';
import { cases, accounts, transactions } from '@/data/mockData';
import { formatCurrency, formatDateTime, timeAgo, riskColors } from '@/utils/helpers';
import { useAccess, useCaseViewAudit } from '@/context/AccessContext';
import PiiNotice from '@/components/PiiNotice';

interface CaseInvestigationProps {
  selectedCaseId: string | null;
  onSelectCase: (caseId: string) => void;
  onViewPrediction: (caseId: string) => void;
  onViewMoneyTrail: (caseId: string) => void;
}

export default function CaseInvestigation({
  selectedCaseId,
  onSelectCase,
  onViewPrediction,
  onViewMoneyTrail,
}: CaseInvestigationProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const filtered = cases.filter((c) => {
    const matchesSearch =
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.complaintId.toLowerCase().includes(search.toLowerCase()) ||
      c.fraudType.toLowerCase().includes(search.toLowerCase()) ||
      c.originLocation.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || c.riskLevel === filter;
    return matchesSearch && matchesFilter;
  });

  const selectedCase = cases.find((c) => c.id === selectedCaseId) ?? filtered[0];
  const caseAccounts = selectedCase
    ? accounts.filter((a) => a.linkedCases.includes(selectedCase.id))
    : [];
  const caseTransactions = selectedCase
    ? transactions.filter((t) => t.caseId === selectedCase.id)
    : [];
  const { name, account } = useAccess();
  useCaseViewAudit(selectedCase?.id, 'case-investigation');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Case List */}
      <div className="card p-4 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cases..."
            className="flex-1 bg-navy-950 border border-navy-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:border-cyan-800 focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {['all', 'critical', 'high', 'medium', 'low'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-[10px] uppercase rounded border transition-colors ${
                filter === f
                  ? 'bg-cyan-950/40 border-cyan-800/50 text-cyan-300'
                  : 'bg-navy-950 border-navy-700 text-slate-500 hover:text-slate-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {filtered.map((c) => {
            const rc = riskColors[c.riskLevel];
            const active = selectedCase?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onSelectCase(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                  active
                    ? 'bg-cyan-950/20 border-cyan-800/40'
                    : 'bg-navy-950 border-navy-700 hover:border-navy-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${rc.dot}`} />
                  <span className="text-xs font-mono text-slate-300">{c.id}</span>
                  <span className={`text-[9px] px-1 py-0.5 rounded uppercase ${rc.bg} ${rc.text} border ${rc.border} ml-auto`}>
                    {c.riskLevel}
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate">{c.fraudType}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-medium text-slate-200">{formatCurrency(c.amount)}</span>
                  <span className="text-[10px] text-slate-600">{timeAgo(c.complaintTime)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Case Detail */}
      <div className="lg:col-span-2 space-y-4">
        {selectedCase && (
          <>
            <PiiNotice caseId={selectedCase.id} />
            {/* Case header */}
            <div className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white">{selectedCase.id}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${riskColors[selectedCase.riskLevel].bg} ${riskColors[selectedCase.riskLevel].text} border ${riskColors[selectedCase.riskLevel].border}`}>
                      {selectedCase.riskLevel}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded uppercase bg-navy-800 text-slate-400 border border-navy-700">
                      {selectedCase.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{selectedCase.complaintId}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-cyan-400">{selectedCase.riskScore}</p>
                  <p className="text-[10px] text-slate-500 uppercase">Risk Score</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{selectedCase.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-navy-700">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Fraud Type</p>
                  <p className="text-sm text-slate-200">{selectedCase.fraudType}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Amount</p>
                  <p className="text-sm text-slate-200 font-medium">{formatCurrency(selectedCase.amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Complaint Time</p>
                  <p className="text-sm text-slate-200">{formatDateTime(selectedCase.complaintTime)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Origin</p>
                  <p className="text-sm text-slate-200">{selectedCase.originLocation}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Transaction Layers</p>
                  <p className="text-sm text-slate-200">{selectedCase.transactionLayers} layers</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Assigned Officer</p>
                  <p className="text-sm text-slate-200">{selectedCase.assignedOfficer}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => onViewMoneyTrail(selectedCase.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-600 text-xs text-slate-200 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" /> Money Trail
                </button>
                <button
                  onClick={() => onViewPrediction(selectedCase.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs text-white font-medium transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Predict Cash-Out
                </button>
              </div>
            </div>

            {/* Linked accounts */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Linked Accounts</h4>
              </div>
              <div className="space-y-2">
                {caseAccounts.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 bg-navy-950 border border-navy-700 rounded-lg">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold border ${
                      a.type === 'victim' ? 'bg-blue-950/40 text-blue-400 border-blue-900/40' :
                      a.type === 'mule' ? 'bg-red-950/40 text-red-400 border-red-900/40' :
                      'bg-green-950/40 text-green-400 border-green-900/40'
                    }`}>
                      {a.type === 'victim' ? 'V' : a.type === 'mule' ? 'M' : 'B'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200">{name(a.holderName, selectedCase.id)}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{a.bank} · {account(a.accountNumber, selectedCase.id)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500">{a.district}, {a.state}</p>
                      <p className={`text-[10px] ${a.kycVerified ? 'text-green-400' : 'text-red-400'}`}>
                        KYC: {a.kycVerified ? 'Verified' : 'Unverified'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transactions */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Transaction Flow</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-navy-700">
                      <th className="pb-2 font-medium">Layer</th>
                      <th className="pb-2 font-medium">From</th>
                      <th className="pb-2 font-medium">To</th>
                      <th className="pb-2 font-medium">Method</th>
                      <th className="pb-2 font-medium text-right">Amount</th>
                      <th className="pb-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseTransactions.map((t) => {
                      const fromAcc = accounts.find((a) => a.id === t.fromAccount);
                      const toAcc = accounts.find((a) => a.id === t.toAccount);
                      return (
                        <tr key={t.id} className="border-b border-navy-800/50 hover:bg-navy-950/50">
                          <td className="py-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-navy-800 text-slate-400 font-mono text-[10px]">L{t.layer}</span>
                          </td>
                          <td className="py-2.5 text-slate-300">{fromAcc ? name(fromAcc.holderName, selectedCase.id) : t.fromAccount}</td>
                          <td className="py-2.5 text-slate-300">{toAcc ? name(toAcc.holderName, selectedCase.id) : t.toAccount}</td>
                          <td className="py-2.5"><span className="text-cyan-400 font-mono text-[10px]">{t.method}</span></td>
                          <td className="py-2.5 text-right font-medium text-slate-200">{formatCurrency(t.amount)}</td>
                          <td className="py-2.5 text-slate-500 text-[10px]">{formatDateTime(t.timestamp)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
