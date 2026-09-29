import type { Officer } from '@/types';
import { accounts } from '@/data/mockData';

/**
 * Role-based access policy and PII masking.
 *
 * IMPORTANT: this runs in the browser, so it controls what the UI shows, not what a determined
 * user can reach. In production the same policy has to be enforced by the API (mask before the
 * response leaves the server) and the audit trail has to be written server-side.
 */

export type Permission =
  /** Sees names, account numbers and IFSC unmasked. */
  | 'pii.full'
  /** Masked by default, may unmask one case for a limited time by giving a reason (audited). */
  | 'pii.reveal'
  /** Target lock, field coordinates and the dispatch brief. */
  | 'dispatch'
  | 'report.export'
  | 'alert.ack'
  | 'audit.view'
  | 'audit.export';

type Role = Officer['role'];

const POLICY: Record<Role, readonly Permission[]> = {
  investigator: ['pii.full', 'dispatch', 'report.export', 'alert.ack'],
  supervisor: ['pii.full', 'dispatch', 'report.export', 'alert.ack', 'audit.view'],
  // Analysts work on patterns: masked by default, and they cannot send units into the field.
  analyst: ['pii.reveal', 'report.export'],
  // Admins run the system, they are not part of case work: no PII, no dispatch, but own the audit trail.
  admin: ['audit.view', 'audit.export'],
};

export const ROLE_SUMMARY: Record<Role, string> = {
  investigator: 'Full case data, dispatch, report export, alert acknowledgement',
  supervisor: 'Everything an investigator can do, plus read access to the audit log',
  analyst: 'Masked personal data (reveal with reason), report export, no dispatch',
  admin: 'Audit log and system oversight, no personal data, no dispatch',
};

export function can(role: Role, permission: Permission): boolean {
  return POLICY[role].includes(permission);
}

/** How long a reason-based reveal lasts. */
export const REVEAL_MS = 10 * 60 * 1000;
export const MIN_REASON_LENGTH = 12;

// ---- masking -------------------------------------------------------------------------

const DOT = '•';

/** "Rajesh Kumar" -> "R•••• K••••", "Faisal M." -> "F•••• M." (initials are kept as they are). */
export function maskName(name: string): string {
  return name
    .split(/(\s+)/)
    .map((part) => {
      if (!part.trim() || part.endsWith('.') || part.length <= 1) return part;
      return part[0] + DOT.repeat(Math.min(part.length - 1, 4));
    })
    .join('');
}

/** Keeps the last four characters only. */
export function maskAccountNumber(n: string): string {
  if (n.length <= 4) return DOT.repeat(n.length);
  return DOT.repeat(n.length - 4) + n.slice(-4);
}

/** Keeps the 4-letter bank code, which identifies the bank and not the person. */
export function maskIfsc(ifsc: string): string {
  return ifsc.slice(0, 4) + DOT.repeat(Math.max(ifsc.length - 4, 0));
}

// Longest first so "Faisal M." is replaced before any shorter overlapping string.
const TEXT_RULES: { needle: string; masked: string }[] = accounts
  .flatMap((a) => [
    { needle: a.holderName, masked: maskName(a.holderName) },
    { needle: a.accountNumber, masked: maskAccountNumber(a.accountNumber) },
    { needle: a.ifsc, masked: maskIfsc(a.ifsc) },
  ])
  .sort((x, y) => y.needle.length - x.needle.length);

/**
 * Masks any known holder name, account number or IFSC inside free text. The prediction engine
 * writes holder names into its `reasons` and XAI strings, so field-level masking alone would leak.
 */
export function maskText(text: string): string {
  let out = text;
  for (const r of TEXT_RULES) {
    if (out.includes(r.needle)) out = out.split(r.needle).join(r.masked);
  }
  return out;
}
