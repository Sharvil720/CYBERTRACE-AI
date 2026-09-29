import { useNow } from '@/hooks/useNow';
import { cashOutWindow, formatCountdown } from '@/services/optimizer';
import type { Prediction } from '@/types';

/** Ticking HH:MM:SS to a target time. Past targets count up with a '+' prefix. */
export function Countdown({ targetMs, className = '' }: { targetMs: number; className?: string }) {
  const now = useNow(1000);
  return <span className={`font-mono tabular-nums ${className}`}>{formatCountdown(targetMs - now)}</span>;
}

/** Compact status chip for a prediction's cash-out window (P10..P90 from generation time). */
export function WindowChip({ prediction }: { prediction: Prediction }) {
  const now = useNow(1000);
  const w = cashOutWindow(prediction.generatedAt, prediction.timeToCashOut, now);
  if (w.status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-300">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-dot" />
        opens in {formatCountdown(w.toP10Ms)}
      </span>
    );
  }
  if (w.status === 'open') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 pulse-dot" />
        WINDOW OPEN · closes {formatCountdown(w.toP90Ms)}
      </span>
    );
  }
  return <span className="text-[10px] font-mono text-slate-500">window passed · regenerate</span>;
}
