import type { Officer } from '@/types';

/**
 * Append-only, hash-chained audit trail.
 *
 * Each entry stores the SHA-256 of its own content plus the previous entry's hash, so editing,
 * deleting or reordering a stored entry is detectable with `verifyChain()`. This is tamper-EVIDENT
 * inside one browser. It is not tamper-proof: whoever controls the browser can rewrite the whole
 * chain. A real deployment must write this trail server-side to append-only storage.
 */

export type AuditAction =
  | 'auth.login'
  | 'auth.failed'
  | 'auth.lockout'
  | 'auth.logout'
  | 'auth.timeout'
  | 'view.open'
  | 'case.open'
  | 'pii.reveal'
  | 'pii.remask'
  | 'pii.expire'
  | 'alert.ack'
  | 'target.lock'
  | 'target.release'
  | 'coords.copy'
  | 'brief.copy'
  | 'maps.open'
  | 'report.print'
  | 'report.download'
  | 'demo.run'
  | 'audit.verify'
  | 'audit.export'
  | 'access.denied';

export interface AuditEntry {
  seq: number;
  ts: string;
  actorId: string;
  actorBadge: string;
  role: string;
  action: AuditAction;
  target: string;
  detail: string;
  prevHash: string;
  hash: string;
}

export type Actor = Pick<Officer, 'id' | 'badge' | 'role'>;

const STORAGE_KEY = 'nirakshan.audit.v1';
const MAX_ENTRIES = 2000;
const GENESIS = '0'.repeat(64);

// ---- hashing -------------------------------------------------------------------------

async function sha256(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const buf = await subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // crypto.subtle only exists on secure origins (https / localhost). Fall back so logging never
  // breaks; the "weak:" prefix makes it obvious in the log that this chain is not SHA-256.
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'weak:' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

function payload(e: Omit<AuditEntry, 'hash'>): string {
  return JSON.stringify([e.seq, e.ts, e.actorId, e.actorBadge, e.role, e.action, e.target, e.detail, e.prevHash]);
}

// ---- store ---------------------------------------------------------------------------

let entries: AuditEntry[] = load();
let lastHash = entries.length ? entries[entries.length - 1].hash : GENESIS;
let queue: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function load(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AuditEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage full or blocked: the in-memory trail still works for this session */
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Stable reference between changes, as useSyncExternalStore requires. */
export function getEntries(): readonly AuditEntry[] {
  return entries;
}

/**
 * Records an event. Returns immediately; entries are hashed and appended in call order.
 * `actor` is null only for events that happen before anyone is authenticated (failed login).
 */
export function record(actor: Actor | null, action: AuditAction, target: string, detail = ''): void {
  const ts = new Date().toISOString();
  queue = queue.then(async () => {
    const base = {
      seq: entries.length ? entries[entries.length - 1].seq + 1 : 1,
      ts,
      actorId: actor?.id ?? '-',
      actorBadge: actor?.badge ?? '-',
      role: actor?.role ?? '-',
      action,
      target,
      detail,
      prevHash: lastHash,
    };
    const hash = await sha256(payload(base));
    const entry: AuditEntry = { ...base, hash };
    // Trimming drops the oldest entries; the first retained entry's prevHash becomes the anchor.
    entries = [...entries, entry].slice(-MAX_ENTRIES);
    lastHash = hash;
    persist();
    emit();
  });
}

export interface ChainCheck {
  ok: boolean;
  checked: number;
  /** seq of the first entry that fails, when not ok. */
  brokenAt?: number;
  reason?: string;
}

/** Recomputes every hash and checks each entry points at its predecessor. */
export async function verifyChain(): Promise<ChainCheck> {
  await queue; // let pending writes land first
  const list = entries;
  for (let i = 0; i < list.length; i++) {
    const { hash, ...rest } = list[i];
    if (i > 0 && rest.prevHash !== list[i - 1].hash) {
      return { ok: false, checked: i, brokenAt: rest.seq, reason: 'Link to previous entry is broken (entry removed or reordered).' };
    }
    if (i > 0 && rest.seq !== list[i - 1].seq + 1) {
      return { ok: false, checked: i, brokenAt: rest.seq, reason: 'Sequence gap (entry removed).' };
    }
    if ((await sha256(payload(rest))) !== hash) {
      return { ok: false, checked: i, brokenAt: rest.seq, reason: 'Entry content does not match its hash (entry edited).' };
    }
  }
  return { ok: true, checked: list.length };
}

function csvCell(v: string | number): string {
  let s = String(v);
  // Neutralise spreadsheet formula injection: a reason typed as "=HYPERLINK(...)" must not run in Excel.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(list: readonly AuditEntry[]): string {
  const head = ['seq', 'timestamp', 'badge', 'role', 'action', 'target', 'detail', 'prev_hash', 'hash'];
  const rows = list.map((e) =>
    [e.seq, e.ts, e.actorBadge, e.role, e.action, e.target, e.detail, e.prevHash, e.hash].map(csvCell).join(','),
  );
  return [head.join(','), ...rows].join('\n');
}
