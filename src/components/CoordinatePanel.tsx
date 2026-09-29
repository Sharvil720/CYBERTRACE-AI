import { useState } from 'react';
import {
  Crosshair,
  Copy,
  Check,
  ExternalLink,
  Siren,
  Timer,
  Navigation,
  Unlock,
  Users,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react';
import { useNow } from '@/hooks/useNow';
import { useAccess } from '@/context/AccessContext';
import {
  bearingDeg,
  cashOutWindow,
  compassPoint,
  formatCountdown,
  haversineKmLocal,
  type Assignment,
  type InterceptionPlan,
} from '@/services/optimizer';
import { copyText, mapsUrl, toDMS, toDecimal, toPlusCode } from '@/utils/coordinates';
import { formatTime } from '@/utils/helpers';
import type { Case, PatrolUnit, Prediction } from '@/types';

interface CoordinatePanelProps {
  caseData: Case;
  /** Every ATM's prediction, best first. */
  predictions: Prediction[];
  plan: InterceptionPlan;
  units: PatrolUnit[];
  lockedAtmId: string | null;
  onLock: (atmId: string) => void;
  onRelease: () => void;
}

export default function CoordinatePanel({
  caseData,
  predictions,
  plan,
  units,
  lockedAtmId,
  onLock,
  onRelease,
}: CoordinatePanelProps) {
  const now = useNow(1000);
  const { can } = useAccess();
  // Target lock, field coordinates and the dispatch brief are limited to roles that can send units out.
  const restricted = !can('dispatch');
  const target = restricted ? null : (predictions.find((p) => p.atmId === lockedAtmId) ?? null);
  const unitById = new Map(units.map((u) => [u.id, u]));
  const atmById = new Map(predictions.map((p) => [p.atmId, p]));
  const assignmentFor = (atmId: string) => plan.assignments.find((a) => a.atmId === atmId) ?? null;
  const inactive = caseData.status === 'closed' || caseData.status === 'intercepted';

  return (
    <div className="card p-4 space-y-4 xl:max-h-[calc(100vh-200px)] xl:overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Crosshair className={`w-4 h-4 ${target ? 'text-red-400' : 'text-slate-500'}`} />
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Target Lock</h3>
        <span
          className={`ml-auto flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border ${
            target
              ? 'text-red-300 bg-red-950/40 border-red-800/50'
              : 'text-slate-500 bg-navy-950 border-navy-700'
          }`}
        >
          {target && <span className="w-1.5 h-1.5 rounded-full bg-red-500 pulse-dot" />}
          {target ? 'LOCKED' : restricted ? 'RESTRICTED' : 'STANDBY'}
        </span>
      </div>

      {inactive && (
        <div className="flex gap-2 text-[11px] text-amber-300 bg-amber-950/20 border border-amber-800/40 rounded-lg p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            {caseData.id} is <b>{caseData.status}</b>. This plan is illustrative, no live cash-out is being tracked.
          </span>
        </div>
      )}

      {target ? (
        <LockedTarget
          key={target.atmId}
          caseData={caseData}
          target={target}
          rank={predictions.findIndex((p) => p.atmId === target.atmId) + 1}
          assignment={assignmentFor(target.atmId)}
          unit={
            assignmentFor(target.atmId) ? (unitById.get(assignmentFor(target.atmId)!.unitId) ?? null) : null
          }
          plan={plan}
          now={now}
          onRelease={onRelease}
        />
      ) : restricted ? (
        <p className="text-xs text-slate-400 leading-relaxed bg-navy-950 border border-navy-700 rounded-lg p-3">
          Target lock, field coordinates and dispatch briefs are limited to investigators and supervisors. You can still review
          the interception plan below.
        </p>
      ) : (
        <p className="text-xs text-slate-500 leading-relaxed">
          Pick a predicted ATM below, or click one on the map, to lock on. The map will zoom to it and this panel will
          show field-ready coordinates, the cash-out countdown and the unit assigned to cover it.
        </p>
      )}

      {/* Interception plan */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Siren className="w-3.5 h-3.5 text-violet-400" />
          <h4 className="text-[11px] font-semibold text-white uppercase tracking-wider">Interception Plan</h4>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="P(unit in place first)"
            value={`${(plan.expectedInterceptionProb * 100).toFixed(1)}%`}
            sub={`of ${(plan.candidateMass * 100).toFixed(0)}% modelled mass`}
          />
          <Stat
            label="Greedy baseline"
            value={`${(plan.greedyBaselineProb * 100).toFixed(1)}%`}
            sub={
              plan.expectedInterceptionProb - plan.greedyBaselineProb > 1e-4
                ? `+${((plan.expectedInterceptionProb - plan.greedyBaselineProb) * 100).toFixed(1)} pts from optimizer`
                : 'optimizer = greedy here'
            }
          />
        </div>

        {plan.assignments.length === 0 ? (
          <p className="text-[11px] text-slate-500 bg-navy-950 border border-navy-700 rounded-lg p-2.5">
            No unit can reach any predicted ATM in time. Escalate to the local cyber cell and request bank-side holds.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {plan.assignments.map((a) => {
              const u = unitById.get(a.unitId);
              const p = atmById.get(a.atmId);
              const active = a.atmId === lockedAtmId;
              return (
                <li key={a.unitId}>
                  <button
                    onClick={() => onLock(a.atmId)}
                    disabled={restricted}
                    className={`w-full text-left px-2.5 py-2 rounded-lg border transition-colors disabled:cursor-default ${
                      active
                        ? 'bg-red-950/20 border-red-800/50'
                        : 'bg-navy-950 border-navy-700 hover:border-navy-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-violet-300">{u?.callsign ?? a.unitId}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {a.travelMin.toFixed(0)} min · v {(a.value * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 truncate mt-0.5">→ {p?.label ?? a.atmId}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {plan.uncovered.length > 0 && (
          <details className="text-[11px] text-slate-500">
            <summary className="cursor-pointer hover:text-slate-300">
              {plan.uncovered.length} ATMs uncovered (
              {(plan.uncovered.reduce((s, u) => s + u.probability, 0) * 100).toFixed(1)}% mass)
            </summary>
            <ul className="mt-1.5 space-y-1">
              {plan.uncovered
                .filter((u) => u.probability >= 0.005)
                .map((u) => (
                  <li key={u.atmId} className="flex justify-between gap-2">
                    <button className="text-left truncate enabled:hover:text-cyan-300 disabled:cursor-default" disabled={restricted} onClick={() => onLock(u.atmId)}>
                      {atmById.get(u.atmId)?.label}
                    </button>
                    <span className="font-mono flex-shrink-0">
                      {(u.probability * 100).toFixed(1)}% ·{' '}
                      {u.reason === 'no-unit-in-range' ? 'out of range' : 'no unit left'}
                    </span>
                  </li>
                ))}
            </ul>
          </details>
        )}

        <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
          <Users className="w-3 h-3" />
          {plan.assignments.length} dispatched · {plan.standbyUnitIds.length} on standby · {units.length} simulated
          units
        </div>
      </div>

      <p className="text-[10px] text-slate-600 leading-relaxed border-t border-navy-700 pt-3">
        Model estimate. Probabilities and time windows are calibrated on synthetic cases only. Units are simulated and
        ETAs use straight-line distance × 1.3 at 35 km/h plus 10 min mobilisation, not routed times; units further than 90 min away are treated as out of range. ATM coordinates
        come from the simulated registry; verify on site.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------------------

function LockedTarget({
  caseData,
  target,
  rank,
  assignment,
  unit,
  plan,
  now,
  onRelease,
}: {
  caseData: Case;
  target: Prediction;
  rank: number;
  assignment: Assignment | null;
  unit: PatrolUnit | null;
  plan: InterceptionPlan;
  now: number;
  onRelease: () => void;
}) {
  const { audit } = useAccess();
  const [copied, setCopied] = useState<string | null>(null);
  const w = cashOutWindow(target.generatedAt, target.timeToCashOut, now);

  const dms = `${toDMS(target.lat, 'lat')}  ${toDMS(target.lng, 'lng')}`;
  const dec = toDecimal(target.lat, target.lng);
  const plus = toPlusCode(target.lat, target.lng);
  const url = mapsUrl(target.lat, target.lng);

  const doCopy = async (key: string, text: string) => {
    if (await copyText(text)) {
      audit(key === 'brief' ? 'brief.copy' : 'coords.copy', target.atmId, `${caseData.id} ${key}`);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    }
  };

  const brief = buildBrief({ caseData, target, rank, assignment, unit, w, dec, dms, plus, url });

  // progress through the P10..P90 window
  const span = w.p90Ms - w.p10Ms;
  const pct = Math.max(0, Math.min(100, ((now - w.p10Ms) / span) * 100));

  const bearing = unit ? bearingDeg(unit.lat, unit.lng, target.lat, target.lng) : 0;
  const straightKm = unit ? haversineKmLocal(unit.lat, unit.lng, target.lat, target.lng) : 0;

  return (
    <div className="space-y-4 fade-in">
      {/* Identity */}
      <div className="bg-red-950/10 border border-red-800/40 rounded-lg p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] text-red-300 font-mono">
              #{rank} · {target.atmId.toUpperCase()}
            </p>
            <p className="text-sm font-semibold text-white leading-snug">{target.label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {target.district}, {target.state}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-bold text-red-300 leading-none">{target.probability}%</p>
            <p className="text-[9px] text-slate-500 uppercase mt-1">next cash-out</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          {Math.round(target.conformal.targetCoverage * 100)}% conformal set: {target.conformal.inSet ? 'inside' : 'outside'}{' '}
          ({target.conformal.setSize} ATMs, synthetic calibration)
        </p>
      </div>

      {/* Coordinates */}
      <div className="space-y-1.5">
        <SectionTitle icon={<Crosshair className="w-3.5 h-3.5 text-cyan-400" />} title="Coordinates" />
        <CoordRow label="Decimal" value={dec} copied={copied === 'dec'} onCopy={() => doCopy('dec', dec)} />
        <CoordRow label="DMS" value={dms} copied={copied === 'dms'} onCopy={() => doCopy('dms', dms)} small />
        <CoordRow label="Plus Code" value={plus} copied={copied === 'plus'} onCopy={() => doCopy('plus', plus)} />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => audit('maps.open', target.atmId, `${caseData.id} exact coordinates sent to Google Maps`)}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-navy-950 border border-navy-700 hover:border-cyan-800/50 text-[11px] text-slate-300 transition-colors"
        >
          <span className="text-slate-500 uppercase text-[10px]">Open in Maps</span>
          <ExternalLink className="w-3 h-3 text-cyan-400" />
        </a>
      </div>

      {/* Countdown */}
      <div className="space-y-2">
        <SectionTitle icon={<Timer className="w-3.5 h-3.5 text-amber-400" />} title="Cash-out Countdown" />
        <div
          className={`rounded-lg border p-3 text-center ${
            w.status === 'pending'
              ? 'bg-cyan-950/10 border-cyan-800/40'
              : w.status === 'open'
                ? 'bg-amber-950/20 border-amber-700/50'
                : 'bg-navy-950 border-navy-700'
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            {w.status === 'pending' ? 'Earliest plausible cash-out (P10) in' : w.status === 'open' ? 'Window open, closes (P90) in' : 'Window passed, regenerate prediction'}
          </p>
          <p
            className={`font-mono tabular-nums text-3xl font-bold mt-1 ${
              w.status === 'pending' ? 'text-cyan-300' : w.status === 'open' ? 'text-amber-300' : 'text-slate-500'
            }`}
          >
            {formatCountdown(w.status === 'pending' ? w.toP10Ms : w.toP90Ms)}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <Mini label="P10" clock={w.p10Ms} rel={w.toP10Ms} />
          <Mini label="Median" clock={w.medianMs} rel={w.toMedianMs} />
          <Mini label="P90" clock={w.p90Ms} rel={w.toP90Ms} />
        </div>
        <div className="h-1 rounded bg-navy-700 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-amber-400" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[10px] text-slate-600">
          Lognormal time-to-cash-out from generation ({formatTime(new Date(target.generatedAt).toISOString())}). There is a
          10% chance it happens before P10.
        </p>
      </div>

      {/* Assigned unit */}
      <div className="space-y-2">
        <SectionTitle icon={<Navigation className="w-3.5 h-3.5 text-violet-400" />} title="Assigned Unit" />
        {assignment && unit ? (
          <div className="bg-violet-950/10 border border-violet-800/40 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-violet-300">{unit.callsign}</span>
              <span className="text-[10px] text-slate-500">{unit.kind}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              From {unit.station}, {unit.district}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="ETA" value={`${assignment.travelMin.toFixed(0)} min`} sub={`in place ${formatTime(new Date(assignment.etaMs).toISOString())}`} />
              <Stat
                label="Approach"
                value={`${compassPoint(bearing)} ${bearing.toFixed(0)}°`}
                sub={`${straightKm.toFixed(1)} km straight-line`}
              />
              <Stat
                label="Slack vs P10"
                value={`${assignment.slackToP10Min >= 0 ? '+' : ''}${assignment.slackToP10Min.toFixed(0)} min`}
                sub={assignment.slackToP10Min >= 0 ? 'before earliest cash-out' : 'may arrive late'}
                warn={assignment.slackToP10Min < 0}
              />
              <Stat label="P(in place first)" value={`${(assignment.inPositionProb * 100).toFixed(0)}%`} sub="given the window" />
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 bg-navy-950 border border-navy-700 rounded-lg p-3 space-y-1">
            <p>No unit is assigned to this ATM.</p>
            <p className="text-slate-600">
              {plan.uncovered.find((u) => u.atmId === target.atmId)?.reason === 'no-units-left'
                ? 'Units in range were allocated to higher-value ATMs.'
                : 'No available unit can be in place before the modelled window. Request a local team or bank-side hold.'}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => doCopy('brief', brief)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[11px] font-medium transition-all"
        >
          {copied === 'brief' ? <Check className="w-3.5 h-3.5" /> : <ClipboardList className="w-3.5 h-3.5" />}
          {copied === 'brief' ? 'Copied' : 'Copy dispatch brief'}
        </button>
        <button
          onClick={onRelease}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-600 text-[11px] text-slate-200 transition-colors"
        >
          <Unlock className="w-3.5 h-3.5" /> Release lock
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------

function buildBrief(a: {
  caseData: Case;
  target: Prediction;
  rank: number;
  assignment: Assignment | null;
  unit: PatrolUnit | null;
  w: ReturnType<typeof cashOutWindow>;
  dec: string;
  dms: string;
  plus: string;
  url: string;
}): string {
  const t = (ms: number) => formatTime(new Date(ms).toISOString());
  const lines = [
    `NIRAKSHAN DISPATCH BRIEF (model estimate, verify on site)`,
    `Case: ${a.caseData.id} / ${a.caseData.complaintId} - ${a.caseData.fraudType}`,
    `Target: #${a.rank} ${a.target.label}, ${a.target.district}, ${a.target.state}`,
    `Probability next cash-out here: ${a.target.probability}%`,
    `Coordinates: ${a.dec}`,
    `DMS: ${a.dms}`,
    `Plus Code: ${a.plus}`,
    `Map: ${a.url}`,
    `Window: earliest ${t(a.w.p10Ms)}, median ${t(a.w.medianMs)}, latest ${t(a.w.p90Ms)} (P10 / median / P90)`,
  ];
  if (a.assignment && a.unit) {
    lines.push(
      `Unit: ${a.unit.callsign} from ${a.unit.station}, ETA ${a.assignment.travelMin.toFixed(0)} min (in place ${t(a.assignment.etaMs)}), slack vs P10 ${a.assignment.slackToP10Min.toFixed(0)} min`,
    );
  } else {
    lines.push('Unit: none assigned');
  }
  return lines.join('\n');
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h4 className="text-[11px] font-semibold text-white uppercase tracking-wider">{title}</h4>
    </div>
  );
}

function CoordRow({
  label,
  value,
  copied,
  onCopy,
  small,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  small?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-navy-950 border border-navy-700">
      <span className="text-[10px] text-slate-500 uppercase w-14 flex-shrink-0">{label}</span>
      <span className={`flex-1 font-mono text-slate-200 break-all ${small ? 'text-[10px]' : 'text-xs'}`}>{value}</span>
      <button
        onClick={onCopy}
        aria-label={`Copy ${label}`}
        className="text-slate-500 hover:text-cyan-300 transition-colors flex-shrink-0"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="bg-navy-950 rounded-lg px-2.5 py-2 border border-navy-700">
      <p className="text-[9px] text-slate-500 uppercase">{label}</p>
      <p className={`text-sm font-semibold ${warn ? 'text-amber-300' : 'text-slate-100'}`}>{value}</p>
      {sub && <p className="text-[9px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function Mini({ label, clock, rel }: { label: string; clock: number; rel: number }) {
  return (
    <div className="bg-navy-950 rounded-lg px-1.5 py-1.5 border border-navy-700">
      <p className="text-[9px] text-slate-500 uppercase">{label}</p>
      <p className="text-[11px] text-slate-200 font-mono">{formatTime(new Date(clock).toISOString())}</p>
      <p className={`text-[9px] font-mono ${rel < 0 ? 'text-amber-400' : 'text-slate-500'}`}>{formatCountdown(rel)}</p>
    </div>
  );
}
