/**
 * Gang clustering from shared mule accounts.
 *
 * Two cases are STRONGLY linked if they share at least `minShared` non-victim accounts
 * (mule / beneficiary hops). Gangs are the connected components of the strong-link graph
 * that contain 2+ cases. A pair sharing exactly one account is only a WEAK link: it is
 * reported (a single account can be a rented mule serving unrelated crews) but does not
 * merge cases into a gang. Otherwise one shared account would collapse everything into a
 * single blob.
 *
 * This is a rule-based heuristic on simulated data, not a fitted model.
 */
import type { Account, CashOutEvent, Transaction } from '@/types';
import { accounts, cases, transactions, cashOutEvents } from '@/data/mockData';

export interface GangLink {
  caseA: string;
  caseB: string;
  sharedAccountIds: string[];
  strong: boolean;
}

export interface GangCluster {
  id: string; // GANG-A, GANG-B ...
  caseIds: string[];
  accountIds: string[];
  /** Accounts used by 2+ cases of this gang. */
  hubAccountIds: string[];
  totalAmount: number;
  districts: string[];
  /** Cash-outs already recorded for this gang's cases (from the simulated log). */
  knownCashOuts: { caseId: string; atmId: string; intercepted: boolean }[];
}

export interface GangGraph {
  gangs: GangCluster[];
  links: GangLink[];
  gangOfCase: Map<string, string>;
}

export function buildGangGraph(
  minShared = 2,
  data: {
    accounts: Account[];
    transactions: Transaction[];
    cashOutEvents: CashOutEvent[];
    caseAmounts: Map<string, number>;
  } = {
    accounts,
    transactions,
    cashOutEvents,
    caseAmounts: new Map(cases.map((c) => [c.id, c.amount])),
  },
): GangGraph {
  const acc = new Map(data.accounts.map((a) => [a.id, a]));
  const caseIds = [...data.caseAmounts.keys()];

  // non-victim accounts touched by each case
  const accountsOf = new Map<string, Set<string>>();
  for (const id of caseIds) accountsOf.set(id, new Set());
  for (const t of data.transactions) {
    const set = accountsOf.get(t.caseId);
    if (!set) continue;
    for (const aid of [t.fromAccount, t.toAccount]) if (acc.get(aid)?.type !== 'victim') set.add(aid);
  }

  const links: GangLink[] = [];
  for (let i = 0; i < caseIds.length; i++) {
    for (let j = i + 1; j < caseIds.length; j++) {
      const a = accountsOf.get(caseIds[i])!;
      const b = accountsOf.get(caseIds[j])!;
      const shared = [...a].filter((x) => b.has(x));
      if (shared.length) {
        links.push({ caseA: caseIds[i], caseB: caseIds[j], sharedAccountIds: shared, strong: shared.length >= minShared });
      }
    }
  }

  // union-find over strong links
  const parent = new Map(caseIds.map((c) => [c, c]));
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  for (const l of links) if (l.strong) parent.set(find(l.caseA), find(l.caseB));

  const groups = new Map<string, string[]>();
  for (const c of caseIds) {
    const r = find(c);
    groups.set(r, [...(groups.get(r) ?? []), c]);
  }

  const multi = [...groups.values()]
    .filter((g) => g.length >= 2)
    .sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));

  const gangOfCase = new Map<string, string>();
  const gangs: GangCluster[] = multi.map((members, idx) => {
    const id = `GANG-${String.fromCharCode(65 + idx)}`;
    members.forEach((m) => gangOfCase.set(m, id));
    const counts = new Map<string, number>();
    members.forEach((m) => accountsOf.get(m)!.forEach((a) => counts.set(a, (counts.get(a) ?? 0) + 1)));
    const accountIds = [...counts.keys()];
    const districts = [...new Set(accountIds.map((a) => acc.get(a)?.district).filter((d): d is string => !!d))];
    return {
      id,
      caseIds: members,
      accountIds,
      hubAccountIds: accountIds.filter((a) => (counts.get(a) ?? 0) >= 2),
      totalAmount: members.reduce((s, m) => s + (data.caseAmounts.get(m) ?? 0), 0),
      districts,
      knownCashOuts: data.cashOutEvents
        .filter((e) => members.includes(e.caseId))
        .map((e) => ({ caseId: e.caseId, atmId: e.atmId, intercepted: e.intercepted })),
    };
  });

  return { gangs, links, gangOfCase };
}

let cached: GangGraph | null = null;
export function getGangGraph(): GangGraph {
  return (cached ??= buildGangGraph());
}

/** Everything the UI needs to show a case's gang context. */
export function gangContextForCase(caseId: string) {
  const g = getGangGraph();
  const gangId = g.gangOfCase.get(caseId) ?? null;
  const gang = g.gangs.find((x) => x.id === gangId) ?? null;
  const caseLinks = g.links.filter((l) => l.caseA === caseId || l.caseB === caseId);
  return {
    gang,
    strongLinks: caseLinks.filter((l) => l.strong),
    weakLinks: caseLinks.filter((l) => !l.strong),
  };
}
