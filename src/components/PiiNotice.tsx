import { useEffect, useRef, useState } from 'react';
import { EyeOff, Eye, ShieldAlert, X } from 'lucide-react';
import { useAccess } from '@/context/AccessContext';
import { MIN_REASON_LENGTH, REVEAL_MS } from '@/services/access';
import { formatTime } from '@/utils/helpers';

/**
 * Sits at the top of any view that shows account holders. Renders nothing for roles that see
 * personal data by default; for the others it explains the masking and offers the audited reveal.
 */
export default function PiiNotice({ caseId }: { caseId: string }) {
  const { can, isMasked, revealExpiry, remask } = useAccess();
  const [asking, setAsking] = useState(false);

  if (can('pii.full')) return null;

  const expiry = revealExpiry(caseId);

  if (expiry) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-amber-800/50 bg-amber-950/20 px-4 py-2.5 text-xs text-amber-200 print:hidden">
        <Eye className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">
          Personal data for <span className="font-mono">{caseId}</span> is visible until{' '}
          <b>{formatTime(new Date(expiry).toISOString())}</b>. This reveal is on the audit log.
        </span>
        <button
          onClick={() => remask(caseId)}
          className="px-2.5 py-1 rounded border border-amber-800/60 hover:bg-amber-900/30 text-[11px] transition-colors"
        >
          Mask again
        </button>
      </div>
    );
  }

  if (!isMasked(caseId)) return null;

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border border-navy-600 bg-navy-900 px-4 py-2.5 text-xs text-slate-300 print:hidden">
        <EyeOff className="w-4 h-4 flex-shrink-0 text-slate-400" />
        <span className="flex-1">
          Names, account numbers and IFSC codes are masked for your role.
          {!can('pii.reveal') && ' Ask a supervisor if you need the full record.'}
        </span>
        {can('pii.reveal') && (
          <button
            onClick={() => setAsking(true)}
            className="px-2.5 py-1 rounded border border-cyan-800/60 text-cyan-300 hover:bg-cyan-950/40 text-[11px] transition-colors"
          >
            Reveal with reason
          </button>
        )}
      </div>
      {asking && <RevealDialog caseId={caseId} onClose={() => setAsking(false)} />}
    </>
  );
}

function RevealDialog({ caseId, onClose }: { caseId: string; onClose: () => void }) {
  const { reveal } = useAccess();
  const [reason, setReason] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const long = reason.trim().length >= MIN_REASON_LENGTH;

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = () => {
    if (long && reveal(caseId, reason)) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="reveal-title" className="card w-full max-w-md p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-300" />
          </div>
          <div className="flex-1">
            <h3 id="reveal-title" className="text-sm font-semibold text-white">
              Reveal personal data for {caseId}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Visible for {REVEAL_MS / 60000} minutes, then masked again. Your badge, this case and your reason are written
              to the audit log.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label htmlFor="reveal-reason" className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
            Reason
          </label>
          <textarea
            id="reveal-reason"
            ref={ref}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && submit()}
            rows={3}
            maxLength={200}
            placeholder="e.g. Matching mule account against FIU watchlist for CASE-001"
            className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-700 focus:outline-none focus:ring-1 focus:ring-cyan-800 resize-none"
          />
          <p className={`text-[10px] mt-1 ${long ? 'text-slate-500' : 'text-amber-400'}`}>
            {long ? `${reason.trim().length}/200` : `At least ${MIN_REASON_LENGTH} characters (${reason.trim().length} so far)`}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 border border-navy-600 text-xs text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!long}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs text-white font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Reveal and log
          </button>
        </div>
      </div>
    </div>
  );
}
