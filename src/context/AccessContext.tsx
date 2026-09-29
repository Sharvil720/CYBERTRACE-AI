import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Officer } from '@/types';
import { record, type AuditAction } from '@/services/auditLog';
import {
  MIN_REASON_LENGTH,
  REVEAL_MS,
  can as roleCan,
  maskAccountNumber,
  maskIfsc,
  maskName,
  maskText,
  type Permission,
} from '@/services/access';

interface AccessValue {
  officer: Officer;
  can: (permission: Permission) => boolean;
  /** Writes an audit entry as the signed-in officer. */
  audit: (action: AuditAction, target: string, detail?: string) => void;
  /** True while personal data for this case is shown masked to this officer. */
  isMasked: (caseId: string | null | undefined) => boolean;
  name: (value: string, caseId?: string | null) => string;
  account: (value: string, caseId?: string | null) => string;
  ifsc: (value: string, caseId?: string | null) => string;
  /** Masks holder names / account numbers embedded in free text. */
  text: (value: string, caseId?: string | null) => string;
  /** Epoch ms when the current reveal for this case ends, or null. */
  revealExpiry: (caseId: string) => number | null;
  /** Unmasks one case for REVEAL_MS. Returns false when not permitted or the reason is too short. */
  reveal: (caseId: string, reason: string) => boolean;
  remask: (caseId: string) => void;
}

const AccessContext = createContext<AccessValue | null>(null);

function without(map: Record<string, number>, key: string): Record<string, number> {
  const next = { ...map };
  delete next[key];
  return next;
}

export function AccessProvider({ officer, children }: { officer: Officer; children: React.ReactNode }) {
  const [reveals, setReveals] = useState<Record<string, number>>({});

  const audit = useCallback(
    (action: AuditAction, target: string, detail?: string) => record(officer, action, target, detail),
    [officer],
  );

  const can = useCallback((p: Permission) => roleCan(officer.role, p), [officer.role]);

  const revealExpiry = useCallback(
    (caseId: string) => {
      const exp = reveals[caseId];
      return exp && exp > Date.now() ? exp : null;
    },
    [reveals],
  );

  const isMasked = useCallback(
    (caseId: string | null | undefined) => {
      if (roleCan(officer.role, 'pii.full')) return false;
      return !(caseId && revealExpiry(caseId));
    },
    [officer.role, revealExpiry],
  );

  // One timer for the soonest expiry: re-masks the case and records that it happened.
  useEffect(() => {
    const pending = Object.entries(reveals);
    if (pending.length === 0) return;
    const [caseId, exp] = pending.reduce((a, b) => (a[1] <= b[1] ? a : b));
    const id = window.setTimeout(() => {
      record(officer, 'pii.expire', caseId, 'reveal window ended');
      setReveals((r) => without(r, caseId));
    }, Math.max(exp - Date.now(), 0) + 50);
    return () => window.clearTimeout(id);
  }, [reveals, officer]);

  const reveal = useCallback(
    (caseId: string, reason: string) => {
      const clean = reason.trim().replace(/\s+/g, ' ').slice(0, 200);
      if (!roleCan(officer.role, 'pii.reveal')) {
        record(officer, 'access.denied', caseId, 'pii.reveal not permitted for role');
        return false;
      }
      if (clean.length < MIN_REASON_LENGTH) return false;
      record(officer, 'pii.reveal', caseId, `${clean} (${REVEAL_MS / 60000} min)`);
      setReveals((r) => ({ ...r, [caseId]: Date.now() + REVEAL_MS }));
      return true;
    },
    [officer],
  );

  const remask = useCallback(
    (caseId: string) => {
      record(officer, 'pii.remask', caseId, 'manual');
      setReveals((r) => without(r, caseId));
    },
    [officer],
  );

  const value = useMemo<AccessValue>(() => {
    const pick = (fn: (v: string) => string) => (v: string, caseId?: string | null) => (isMasked(caseId) ? fn(v) : v);
    return {
      officer,
      can,
      audit,
      isMasked,
      name: pick(maskName),
      account: pick(maskAccountNumber),
      ifsc: pick(maskIfsc),
      text: pick(maskText),
      revealExpiry,
      reveal,
      remask,
    };
  }, [officer, can, audit, isMasked, revealExpiry, reveal, remask]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess(): AccessValue {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error('useAccess must be used inside <AccessProvider>');
  return ctx;
}

/** Records `case.open` once each time a surface starts showing a different case. */
export function useCaseViewAudit(caseId: string | null | undefined, surface: string) {
  const { audit, isMasked } = useAccess();
  const last = useRef<string | null>(null);
  const masked = isMasked(caseId);
  useEffect(() => {
    if (!caseId) return;
    const key = `${surface}:${caseId}`;
    if (last.current === key) return;
    last.current = key;
    audit('case.open', caseId, `${surface}${masked ? ' (masked)' : ''}`);
    // masked is read for the log line only; a reveal has its own entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, surface]);
}
