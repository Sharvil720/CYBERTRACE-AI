import { useMemo, useState, useSyncExternalStore } from 'react';
import { ScrollText, ShieldCheck, ShieldX, Download, Search, Loader2, Info } from 'lucide-react';
import { useAccess } from '@/context/AccessContext';
import { getEntries, subscribe, toCsv, verifyChain, type AuditAction, type AuditEntry, type ChainCheck } from '@/services/auditLog';

type Group = 'all' | 'security' | 'data' | 'field' | 'reports' | 'session';

const GROUPS: { id: Group; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'security', label: 'Security' },
  { id: 'data', label: 'Data access' },
  { id: 'field', label: 'Field actions' },
  { id: 'reports', label: 'Reports' },
  { id: 'session', label: 'Sessions' },
];

const GROUP_OF: Record<AuditAction, Exclude<Group, 'all'>> = {
  'access.denied': 'security',
  'auth.failed': 'security',
  'auth.lockout': 'security',
  'audit.verify': 'security',
  'audit.export': 'security',
  'pii.reveal': 'data',
  'pii.remask': 'data',
  'pii.expire': 'data',
  'case.open': 'data',
  'view.open': 'data',
  'alert.ack': 'field',
  'target.lock': 'field',
  'target.release': 'field',
  'coords.copy': 'field',
  'brief.copy': 'field',
  'maps.open': 'field',
  'demo.run': 'field',
  'report.print': 'reports',
  'report.download': 'reports',
  'auth.login': 'session',
  'auth.logout': 'session',
  'auth.timeout': 'session',
};

const DANGER = new Set<AuditAction>(['access.denied', 'auth.failed', 'auth.lockout']);
const NOTABLE = new Set<AuditAction>(['pii.reveal', 'report.download', 'report.print', 'brief.copy', 'audit.export']);

function chip(action: AuditAction): string {
  if (DANGER.has(action)) return 'bg-red-950/40 text-red-300 border-red-800/50';
  if (NOTABLE.has(action)) return 'bg-amber-950/40 text-amber-300 border-amber-800/50';
  if (GROUP_OF[action] === 'session') return 'bg-navy-800 text-slate-300 border-navy-600';
  return 'bg-cyan-950/30 text-cyan-300 border-cyan-900/50';
}

const PAGE = 50;

export default function AuditLog() {
  const { can, audit } = useAccess();
  const entries = useSyncExternalStore(subscribe, getEntries);
  const [group, setGroup] = useState<Group>('all');
  const [actor, setActor] = useState('all');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [check, setCheck] = useState<ChainCheck | null>(null);
  const [verifying, setVerifying] = useState(false);

  const actors = useMemo(() => [...new Set(entries.map((e) => e.actorBadge))].sort(), [entries]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => group === 'all' || GROUP_OF[e.action] === group)
      .filter((e) => actor === 'all' || e.actorBadge === actor)
      .filter((e) => !q || `${e.action} ${e.target} ${e.detail} ${e.actorBadge}`.toLowerCase().includes(q))
      .slice()
      .reverse();
  }, [entries, group, actor, query]);

  const alarms = useMemo(() => entries.filter((e) => DANGER.has(e.action)).length, [entries]);

  const runVerify = async () => {
    setVerifying(true);
    const result = await verifyChain();
    setCheck(result);
    setVerifying(false);
    audit('audit.verify', 'chain', result.ok ? `ok, ${result.checked} entries` : `FAILED at #${result.brokenAt}: ${result.reason}`);
  };

  const exportCsv = () => {
    audit('audit.export', 'csv', `${rows.length} rows${group !== 'all' || actor !== 'all' || query ? ' (filtered)' : ''}`);
    const blob = new Blob([toCsv([...rows].reverse())], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nirakshan_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ScrollText className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Audit Log</h3>
            </div>
            <p className="text-xs text-slate-500 max-w-xl">
              Every sign-in, case view, personal-data reveal, dispatch action and export. Entries are chained with SHA-256, so an
              edited or deleted entry shows up when you verify.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runVerify}
              disabled={verifying}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-600 text-xs text-slate-200 transition-colors disabled:opacity-60"
            >
              {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              Verify chain
            </button>
            {can('audit.export') && (
              <button
                onClick={exportCsv}
                disabled={rows.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs text-white font-medium transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <Stat label="Entries" value={entries.length.toString()} />
          <Stat label="Security events" value={alarms.toString()} warn={alarms > 0} />
          <Stat label="Officers seen" value={actors.filter((a) => a !== '-').length.toString()} />
        </div>

        {check && (
          <div
            role="status"
            className={`mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs ${
              check.ok
                ? 'border-green-800/50 bg-green-950/20 text-green-300'
                : 'border-red-800/60 bg-red-950/30 text-red-300'
            }`}
          >
            {check.ok ? <ShieldCheck className="w-4 h-4 flex-shrink-0" /> : <ShieldX className="w-4 h-4 flex-shrink-0" />}
            <span>
              {check.ok
                ? `Chain intact: ${check.checked} entries checked, no gaps, no edits.`
                : `Chain broken at entry #${check.brokenAt}. ${check.reason}`}
            </span>
          </div>
        )}
      </div>

      <div className="card p-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                setGroup(g.id);
                setShown(PAGE);
              }}
              className={`px-2.5 py-1 text-[10px] uppercase rounded border transition-colors ${
                group === g.id
                  ? 'bg-cyan-950/40 border-cyan-800/50 text-cyan-300'
                  : 'bg-navy-950 border-navy-700 text-slate-500 hover:text-slate-300'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <select
          value={actor}
          onChange={(e) => {
            setActor(e.target.value);
            setShown(PAGE);
          }}
          aria-label="Filter by officer"
          className="bg-navy-950 border border-navy-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-cyan-800 focus:outline-none"
        >
          <option value="all">All officers</option>
          {actors.map((a) => (
            <option key={a} value={a}>
              {a === '-' ? 'Unauthenticated' : a}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 ml-auto min-w-[180px] flex-1 sm:flex-none">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
            placeholder="Search target or detail"
            aria-label="Search audit log"
            className="flex-1 bg-navy-950 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-cyan-800 focus:outline-none"
          />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-6 text-xs text-slate-500 text-center">
            {entries.length === 0 ? 'Nothing recorded yet.' : 'No entries match these filters.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-navy-700 bg-navy-950/50">
                  <th className="px-4 py-2.5 font-medium">#</th>
                  <th className="px-2 py-2.5 font-medium">Time</th>
                  <th className="px-2 py-2.5 font-medium">Officer</th>
                  <th className="px-2 py-2.5 font-medium">Action</th>
                  <th className="px-2 py-2.5 font-medium">Target</th>
                  <th className="px-2 py-2.5 font-medium">Detail</th>
                  <th className="px-4 py-2.5 font-medium">Hash</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, shown).map((e) => (
                  <Row key={e.seq} e={e} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > shown && (
          <button
            onClick={() => setShown((s) => s + PAGE)}
            className="w-full py-2.5 text-xs text-cyan-300 hover:bg-navy-800/60 border-t border-navy-700 transition-colors"
          >
            Show {Math.min(PAGE, rows.length - shown)} more ({rows.length - shown} remaining)
          </button>
        )}
      </div>

      <div className="flex gap-2 text-[11px] text-slate-500 leading-relaxed">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p>
          Demo storage: this trail lives in this browser only and is tamper-evident, not tamper-proof. A deployment must write it
          server-side to append-only storage and enforce the role policy in the API.
        </p>
      </div>
    </div>
  );
}

function Row({ e }: { e: AuditEntry }) {
  const time = new Date(e.ts);
  return (
    <tr className="border-b border-navy-800/50 hover:bg-navy-950/50 align-top">
      <td className="px-4 py-2.5 font-mono text-slate-600">{e.seq}</td>
      <td className="px-2 py-2.5 font-mono text-slate-400 whitespace-nowrap">
        {time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{' '}
        {time.toLocaleTimeString('en-IN', { hour12: false })}
      </td>
      <td className="px-2 py-2.5 whitespace-nowrap">
        <span className="font-mono text-slate-200">{e.actorBadge === '-' ? 'unknown' : e.actorBadge}</span>
        <span className="text-slate-600"> · {e.role === '-' ? 'n/a' : e.role}</span>
      </td>
      <td className="px-2 py-2.5 whitespace-nowrap">
        <span className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${chip(e.action)}`}>{e.action}</span>
      </td>
      <td className="px-2 py-2.5 font-mono text-slate-300 whitespace-nowrap">{e.target}</td>
      <td className="px-2 py-2.5 text-slate-400 min-w-[200px]">{e.detail || <span className="text-slate-700">-</span>}</td>
      <td className="px-4 py-2.5 font-mono text-slate-600" title={e.hash}>
        {e.hash.replace('weak:', '').slice(0, 8)}
      </td>
    </tr>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="bg-navy-950 rounded-lg px-3 py-2.5 border border-navy-700">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold ${warn ? 'text-red-300' : 'text-slate-100'}`}>{value}</p>
    </div>
  );
}
