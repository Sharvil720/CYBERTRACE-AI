import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Shield,
  MapPin,
  Network,
  Target,
  Brain,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { cases, accounts, transactions, alerts } from '@/data/mockData';
import { predictCashOut, getXAIFactors } from '@/services/predictionEngine';
import { formatCurrency, formatDateTime, riskColors } from '@/utils/helpers';
import { useAccess, useCaseViewAudit } from '@/context/AccessContext';
import PiiNotice from '@/components/PiiNotice';

interface ReportsProps {
  caseId: string | null;
}

export default function Reports({ caseId }: ReportsProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const caseData = cases.find((c) => c.id === caseId) ?? cases[0];

  const caseAccounts = accounts.filter((a) => a.linkedCases.includes(caseData.id));
  const caseTxns = transactions.filter((t) => t.caseId === caseData.id);
  const { officer, can, audit, name, account, text, isMasked } = useAccess();
  const canExport = can('report.export');
  const masked = isMasked(caseData.id);
  // Fixed for the life of this screen; it used to change on every render.
  const [generatedAt] = useState(() => Date.now());
  const reportId = `RPT-${caseData.id}-${generatedAt.toString().slice(-6)}`;
  /* eslint-disable react-hooks/exhaustive-deps */
  const predictions = useMemo(() => predictCashOut(caseData, generatedAt), [caseData.id]);
  const topPred = predictions[0];
  const factors = useMemo(() => getXAIFactors(caseData, topPred), [caseData.id, topPred]);
  /* eslint-enable react-hooks/exhaustive-deps */
  useCaseViewAudit(canExport ? caseData.id : null, 'report');

  useEffect(() => {
    if (!canExport) audit('access.denied', 'reports', 'report.export not permitted for role');
  }, [canExport, audit]);
  const caseAlerts = alerts.filter((a) => a.caseId === caseData.id);
  const rc = riskColors[caseData.riskLevel];

  const exportNote = `${caseData.id}; ${reportId}; personal data ${masked ? 'masked' : 'visible'}`;

  const handlePrint = () => {
    audit('report.print', reportId, exportNote);
    window.print();
  };

  const handleDownload = () => {
    audit('report.download', reportId, exportNote);
    const header = [
      `CYBERTRACE AI investigation report ${reportId}`,
      `Exported by ${officer.name} (${officer.badge}, ${officer.role}) at ${new Date().toISOString()}`,
      `Personal data: ${masked ? 'masked' : 'visible'}. This export is recorded in the audit log.`,
      '-'.repeat(72),
      '',
    ].join('\n');
    const content = header + (reportRef.current?.innerText ?? '');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${caseData.id}_investigation_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!canExport) {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto">
        <Lock className="w-8 h-8 text-slate-500 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-white mb-1">Reports are not available to your role</h3>
        <p className="text-xs text-slate-500">
          Case reports contain investigation detail and are limited to investigators, supervisors and analysts. This attempt
          has been logged.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PiiNotice caseId={caseData.id} />
      {/* Action bar (non-printable) */}
      <div className="card p-4 print:hidden">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Investigator Report</h3>
            <span className="text-xs text-slate-500 font-mono">{caseData.id}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-600 text-xs text-slate-200 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs text-white font-medium transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
        </div>
      </div>

      {/* Report document */}
      <div className="card p-8 bg-white text-black print:bg-white print:shadow-none print:border-0 relative overflow-hidden">
        <div aria-hidden className="pointer-events-none select-none absolute inset-0 flex items-center justify-center">
          <span className="whitespace-nowrap text-3xl sm:text-5xl font-bold -rotate-[28deg] text-slate-900/[0.06] print:text-slate-900/10">
            {officer.badge} · {reportId}
          </span>
        </div>
      <div ref={reportRef} className="relative">
        {/* Report header */}
        <div className="border-b-2 border-slate-300 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold text-slate-900">CYBERTRACE AI — Investigation Report</h1>
              </div>
              <p className="text-xs text-slate-500">Predictive Analytics Framework for Cybercrime Complaints · SIH26184</p>
              <p className="text-xs text-slate-500">Synthetic/Demo Data Only — No real NCRP, bank, or government data accessed</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Report ID</p>
              <p className="text-sm font-mono font-bold text-slate-800">{reportId}</p>
              <p className="text-xs text-slate-500 mt-2">Generated</p>
              <p className="text-xs text-slate-700">{formatDateTime(new Date(generatedAt).toISOString())}</p>
            </div>
          </div>
        </div>

        {/* Section 1: Case Details */}
        <ReportSection icon={FileText} title="1. Case Details">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <ReportField label="Case ID" value={caseData.id} />
            <ReportField label="Complaint ID" value={caseData.complaintId} />
            <ReportField label="Fraud Type" value={caseData.fraudType} />
            <ReportField label="Amount Defrauded" value={formatCurrency(caseData.amount)} />
            <ReportField label="Complaint Time" value={formatDateTime(caseData.complaintTime)} />
            <ReportField label="Origin Location" value={caseData.originLocation} />
            <ReportField label="Transaction Layers" value={`${caseData.transactionLayers} layers`} />
            <ReportField label="Assigned Officer" value={caseData.assignedOfficer} />
            <ReportField label="Risk Score" value={`${caseData.riskScore}/100`} />
            <ReportField label="Risk Level" value={caseData.riskLevel.toUpperCase()} />
            <ReportField label="Status" value={caseData.status.toUpperCase()} />
          </div>
          <div className="mt-3 p-3 bg-slate-50 rounded border border-slate-200">
            <p className="text-xs font-semibold text-slate-700 mb-1">Description:</p>
            <p className="text-xs text-slate-600">{caseData.description}</p>
          </div>
        </ReportSection>

        {/* Section 2: Money Trail */}
        <ReportSection icon={Network} title="2. Money Trail">
          <table className="w-full text-xs border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 px-2 py-1.5 text-left">Layer</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left">From</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left">To</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left">Method</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right">Amount</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {caseTxns.map((t) => {
                const from = accounts.find((a) => a.id === t.fromAccount);
                const to = accounts.find((a) => a.id === t.toAccount);
                return (
                  <tr key={t.id}>
                    <td className="border border-slate-300 px-2 py-1.5">L{t.layer}</td>
                    <td className="border border-slate-300 px-2 py-1.5">{from ? name(from.holderName, caseData.id) : t.fromAccount}</td>
                    <td className="border border-slate-300 px-2 py-1.5">{to ? name(to.holderName, caseData.id) : t.toAccount}</td>
                    <td className="border border-slate-300 px-2 py-1.5 font-mono">{t.method}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-medium">{formatCurrency(t.amount)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-slate-500">{formatDateTime(t.timestamp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-700 mb-1">Chain:</p>
            <p className="text-xs text-slate-600">
              {caseAccounts.map((a) => `${name(a.holderName, caseData.id)} (${a.type})`).join(' → ')} → ATM Cash-Out
            </p>
          </div>
        </ReportSection>

        {/* Section 3: Linked Accounts */}
        <ReportSection icon={AlertTriangle} title="3. Linked Accounts">
          <table className="w-full text-xs border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 px-2 py-1.5 text-left">Holder</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left">Bank</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left">Account No.</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left">Type</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left">Location</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left">KYC</th>
              </tr>
            </thead>
            <tbody>
              {caseAccounts.map((a) => (
                <tr key={a.id}>
                  <td className="border border-slate-300 px-2 py-1.5">{name(a.holderName, caseData.id)}</td>
                  <td className="border border-slate-300 px-2 py-1.5">{a.bank}</td>
                  <td className="border border-slate-300 px-2 py-1.5 font-mono">{account(a.accountNumber, caseData.id)}</td>
                  <td className="border border-slate-300 px-2 py-1.5 capitalize">{a.type}</td>
                  <td className="border border-slate-300 px-2 py-1.5">{a.district}, {a.state}</td>
                  <td className="border border-slate-300 px-2 py-1.5">{a.kycVerified ? 'Verified' : 'Unverified'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>

        {/* Section 4: Cash-Out Prediction */}
        <ReportSection icon={Target} title="4. Cash-Out Prediction — Top 5 Locations">
          <table className="w-full text-xs border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 px-2 py-1.5 text-left">#</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left">ATM Location</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right">Probability</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right">90% Set (synthetic)</th>
                <th className="border border-slate-300 px-2 py-1.5 text-right">Distance</th>
                <th className="border border-slate-300 px-2 py-1.5 text-left">Expected Time</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p, i) => (
                <tr key={p.atmId}>
                  <td className="border border-slate-300 px-2 py-1.5 font-bold">{i + 1}</td>
                  <td className="border border-slate-300 px-2 py-1.5">{p.label}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right font-bold">{p.probability}%</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right">{p.conformal.inSet ? 'Inside' : 'Outside'}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right">{p.distanceKm} km</td>
                  <td className="border border-slate-300 px-2 py-1.5">{formatDateTime(p.expectedTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>

        {/* Section 5: Explainable AI */}
        <ReportSection icon={Brain} title="5. Explainable AI — Why This Location Was Predicted">
          <div className="space-y-2">
            {factors.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-2 border border-slate-200 rounded">
                <span className="text-xs font-bold text-blue-600 w-8">{f.weight}%</span>
                <div>
                  <p className="text-xs font-semibold text-slate-800">{text(f.label, caseData.id)}</p>
                  <p className="text-xs text-slate-600">{text(f.description, caseData.id)}</p>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Section 6: Alerts */}
        {caseAlerts.length > 0 && (
          <ReportSection icon={AlertTriangle} title="6. Generated Alerts">
            <div className="space-y-2">
              {caseAlerts.map((a) => (
                <div key={a.id} className="p-2 border border-slate-200 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase text-red-600">{a.level}</span>
                    <span className="text-xs font-mono text-slate-500">{a.caseId}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-800">{a.title}</p>
                  <p className="text-xs text-slate-600">Location: {a.predictedLocation} · Risk Score: {a.riskScore}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-300 text-center">
          <p className="text-[10px] text-slate-400">
            This report is generated by CYBERTRACE AI — Predictive Analytics Framework for Cybercrime Complaints (SIH26184).
            All data is synthetic/demo. This is a prototype for the Smart India Hackathon 2026.
            The prediction engine is designed to be replaceable with a Python ML API.
          </p>
          <p className="text-[10px] text-slate-500 mt-2">
            Generated by {officer.name} ({officer.badge}, {officer.role} access). Personal data {masked ? 'masked' : 'visible'}.
            Access to this report is recorded in the audit log.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

function ReportSection({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-blue-600" />
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{value}</p>
    </div>
  );
}
