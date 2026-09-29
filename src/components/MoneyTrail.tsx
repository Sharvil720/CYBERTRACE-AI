import { useState } from 'react';
import { useAccess, useCaseViewAudit } from '@/context/AccessContext';
import PiiNotice from '@/components/PiiNotice';
import { Network, ArrowRight, Layers, Ghost, Crosshair, Users, Link2 } from 'lucide-react';
import { cases, accounts, transactions, atms, patrolUnits } from '@/data/mockData';
import { useCasePlan } from '@/hooks/useCasePlan';
import { useNow } from '@/hooks/useNow';
import { Countdown, WindowChip } from '@/components/Countdown';
import { gangContextForCase } from '@/services/gangs';
import { cashOutWindow, formatCountdown } from '@/services/optimizer';
import { formatCurrency, formatDateTime } from '@/utils/helpers';
import type { Prediction, Transaction } from '@/types';

interface MoneyTrailProps {
  caseId: string | null;
  onSelectCase: (caseId: string) => void;
  onLockTarget: (caseId: string, atmId: string) => void;
}

interface GraphNode {
  id: string;
  label: string;
  type: 'victim' | 'mule' | 'beneficiary';
  x: number;
  y: number;
  bank: string;
  location: string;
}

const GHOST_COUNT = 4;
const GANG_COLORS = ['#e879f9', '#38bdf8', '#fb7185', '#a3e635'];

/** SVG text that ticks: shows the P10 countdown, or a status once the window is open. */
function GhostTimer({ p, x, y }: { p: Prediction; x: number; y: number }) {
  const now = useNow(1000);
  const w = cashOutWindow(p.generatedAt, p.timeToCashOut, now);
  const text =
    w.status === 'pending' ? `T-${formatCountdown(w.toP10Ms)}` : w.status === 'open' ? 'WINDOW OPEN' : 'PASSED';
  const fill = w.status === 'pending' ? '#22d3ee' : w.status === 'open' ? '#fbbf24' : '#64748b';
  return (
    <text x={x} y={y} textAnchor="middle" fill={fill} fontSize="10" fontWeight="bold" fontFamily="monospace">
      {text}
    </text>
  );
}

export default function MoneyTrail({ caseId, onSelectCase, onLockTarget }: MoneyTrailProps) {
  const [selectedEdge, setSelectedEdge] = useState<Transaction | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedGhostId, setSelectedGhostId] = useState<string | null>(null);

  const caseData = cases.find((c) => c.id === caseId) ?? cases[0];
  const { name, can } = useAccess();
  useCaseViewAudit(caseData.id, 'money-trail');
  const holder = (id: string) => {
    const a = accounts.find((x) => x.id === id);
    return a ? name(a.holderName, caseData.id) : id;
  };
  const caseTxns = transactions.filter((t) => t.caseId === caseData.id);
  const { top5, plan } = useCasePlan(caseData);
  const ghosts = top5.slice(0, GHOST_COUNT);
  const selectedGhost = ghosts.find((g) => g.atmId === selectedGhostId) ?? null;
  const gangCtx = gangContextForCase(caseData.id);
  const gangColor = gangCtx.gang ? GANG_COLORS[Number(gangCtx.gang.id.charCodeAt(5) - 65) % GANG_COLORS.length] : null;
  const unitById = new Map(patrolUnits.map((u) => [u.id, u]));

  /** Other cases that touch this account (any link strength). */
  const otherCasesFor = (accountId: string) =>
    [...new Set(transactions.filter((t) => t.caseId !== caseData.id && (t.fromAccount === accountId || t.toAccount === accountId)).map((t) => t.caseId))];

  // Build chain: victim → mule1 → mule2 → ... → beneficiary/atm
  const chain: string[] = [];
  if (caseTxns.length > 0) {
    chain.push(caseTxns[0].fromAccount);
    caseTxns.forEach((t) => {
      if (!chain.includes(t.toAccount)) chain.push(t.toAccount);
    });
  }

  const chainAccounts = chain.map((id) => accounts.find((a) => a.id === id)!).filter(Boolean);

  // Position nodes in a flowing path
  const nodeSpacing = 200;
  const startX = 80;
  const centerY = 240;
  const nodes: GraphNode[] = chainAccounts.map((acc, i) => {
    const lastNode = i === chainAccounts.length - 1;
    return {
      id: acc.id,
      label: name(acc.holderName, caseData.id),
      type: lastNode ? 'beneficiary' : acc.type,
      x: startX + i * nodeSpacing,
      y: centerY + (i % 2 === 0 ? -40 : 40),
      bank: acc.bank,
      location: `${acc.district}, ${acc.state}`,
    };
  });

  // Ghost column: predicted cash-out ATMs fan out from the last real hop
  const ghostX = startX + chainAccounts.length * nodeSpacing;
  const ghostNodes = ghosts.map((g, i) => ({
    pred: g,
    x: ghostX,
    y: centerY + (i - (ghosts.length - 1) / 2) * 92,
    assignment: plan.assignments.find((a) => a.atmId === g.atmId) ?? null,
  }));
  const lastReal = nodes[nodes.length - 1];

  const edges = caseTxns.map((t, i) => ({
    from: t.fromAccount,
    to: t.toAccount,
    txn: t,
    index: i,
  }));

  const nodeColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
    victim: { bg: '#0c1a3e', border: '#3b82f6', text: '#60a5fa', label: 'Victim' },
    mule: { bg: '#2a0a0e', border: '#ef4444', text: '#f87171', label: 'Mule' },
    beneficiary: { bg: '#0a2a1a', border: '#22c55e', text: '#4ade80', label: 'Beneficiary' },
  };

  const svgWidth = Math.max(ghostX + 200, 800);
  const svgHeight = 480;

  return (
    <div className="space-y-4">
      <PiiNotice caseId={caseData.id} />
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Network className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Money Trail Graph</h3>
          <span className="text-xs text-slate-500 font-mono ml-2">{caseData.id}</span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Following the money: Victim → Mule Accounts → predicted cash-out ATMs (ghost nodes). Click nodes, edges and ghosts for details.
        </p>

        {/* Graph */}
        <div className="overflow-x-auto bg-navy-950 rounded-lg border border-navy-700 p-4">
          <svg width={svgWidth} height={svgHeight} className="min-w-full" style={{ minWidth: svgWidth }}>
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1c2550" strokeWidth="0.5" />
              </pattern>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#22d3ee" />
              </marker>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Edges */}
            {edges.map((edge, i) => {
              const fromNode = nodes.find((n) => n.id === edge.from);
              const toNode = nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const midX = (fromNode.x + toNode.x) / 2;
              const midY = (fromNode.y + toNode.y) / 2;
              const isSel = selectedEdge?.id === edge.txn.id;

              return (
                <g key={edge.txn.id} onClick={() => setSelectedEdge(edge.txn)} className="cursor-pointer">
                  {/* Edge path with curve */}
                  <path
                    d={`M ${fromNode.x + 50} ${fromNode.y} Q ${midX} ${midY - 30} ${toNode.x - 50} ${toNode.y}`}
                    fill="none"
                    stroke={isSel ? '#22d3ee' : '#283366'}
                    strokeWidth={isSel ? 2.5 : 1.5}
                    markerEnd="url(#arrowhead)"
                    className="transition-all"
                  />
                  {/* Layer label */}
                  <g>
                    <rect
                      x={midX - 22}
                      y={midY - 38}
                      width="44"
                      height="18"
                      rx="9"
                      fill="#0e1330"
                      stroke={isSel ? '#22d3ee' : '#1c2550'}
                      strokeWidth="1"
                    />
                    <text
                      x={midX}
                      y={midY - 26}
                      textAnchor="middle"
                      fill={isSel ? '#22d3ee' : '#64748b'}
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      L{edge.txn.layer}
                    </text>
                  </g>
                  {/* Amount label */}
                  <text
                    x={midX}
                    y={midY - 48}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="10"
                  >
                    {formatCurrency(edge.txn.amount)}
                  </text>
                </g>
              );
            })}

            {/* Predicted cash-out edges to ghost nodes */}
            {lastReal &&
              ghostNodes.map(({ pred, x, y }) => {
                const x1 = lastReal.x + 50;
                const x2 = x - 52;
                const sel = selectedGhostId === pred.atmId;
                return (
                  <g key={`ge-${pred.atmId}`}>
                    <path
                      d={`M ${x1} ${lastReal.y} C ${x1 + 60} ${lastReal.y}, ${x2 - 60} ${y}, ${x2} ${y}`}
                      fill="none"
                      stroke={sel ? '#22d3ee' : '#f97316'}
                      strokeWidth={1 + (pred.probability / 100) * 6}
                      strokeDasharray="5,4"
                      opacity={0.35 + (pred.probability / 100) * 1.2}
                      markerEnd="url(#arrowhead)"
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={(lastReal.y + y) / 2 - 6}
                      textAnchor="middle"
                      fill="#fbbf24"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {pred.probability}%
                    </text>
                  </g>
                );
              })}

            {/* Nodes */}
            {nodes.map((node) => {
              const colors = nodeColors[node.type] ?? nodeColors.mule;
              const isSel = selectedNode?.id === node.id;
              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className="cursor-pointer"
                >
                  {/* Gang ring + cross-case badge */}
                  {gangCtx.gang?.accountIds.includes(node.id) && gangColor && (
                    <rect
                      x={node.x - 56}
                      y={node.y - 36}
                      width="112"
                      height="72"
                      rx="14"
                      fill="none"
                      stroke={gangColor}
                      strokeWidth="1.5"
                      strokeDasharray="2,3"
                      opacity="0.9"
                    />
                  )}
                  {otherCasesFor(node.id).length > 0 && (
                    <g>
                      <rect x={node.x + 12} y={node.y + 30} width="46" height="14" rx="7" fill="#0e1330" stroke={gangColor ?? '#64748b'} strokeWidth="1" />
                      <text x={node.x + 35} y={node.y + 40} textAnchor="middle" fill={gangColor ?? '#94a3b8'} fontSize="9" fontFamily="monospace">
                        +{otherCasesFor(node.id).length} case{otherCasesFor(node.id).length > 1 ? 's' : ''}
                      </text>
                    </g>
                  )}
                  {/* Glow ring for selected */}
                  {isSel && (
                    <circle cx={node.x} cy={node.y} r="52" fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.4" />
                  )}
                  <rect
                    x={node.x - 50}
                    y={node.y - 30}
                    width="100"
                    height="60"
                    rx="10"
                    fill={colors.bg}
                    stroke={isSel ? '#22d3ee' : colors.border}
                    strokeWidth={isSel ? 2 : 1.5}
                    className="transition-all"
                  />
                  {/* Type badge */}
                  <rect
                    x={node.x - 30}
                    y={node.y - 38}
                    width="60"
                    height="14"
                    rx="7"
                    fill={colors.border}
                    opacity="0.2"
                  />
                  <text
                    x={node.x}
                    y={node.y - 28}
                    textAnchor="middle"
                    fill={colors.text}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {colors.label.toUpperCase()}
                  </text>
                  {/* Name */}
                  <text
                    x={node.x}
                    y={node.y - 8}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize="11"
                    fontWeight="500"
                  >
                    {node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
                  </text>
                  {/* Bank */}
                  <text
                    x={node.x}
                    y={node.y + 8}
                    textAnchor="middle"
                    fill={colors.text}
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {node.bank}
                  </text>
                  {/* Location */}
                  <text
                    x={node.x}
                    y={node.y + 22}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="8"
                  >
                    {node.location.length > 18 ? node.location.slice(0, 17) + '…' : node.location}
                  </text>
                </g>
              );
            })}

            {/* Ghost nodes: predicted ATMs */}
            {ghostNodes.map(({ pred, x, y, assignment }, i) => {
              const sel = selectedGhostId === pred.atmId;
              const unit = assignment ? unitById.get(assignment.unitId) : null;
              return (
                <g
                  key={`gn-${pred.atmId}`}
                  onClick={() => setSelectedGhostId(pred.atmId)}
                  className="cursor-pointer"
                  opacity={Math.min(1, 0.5 + (pred.probability / 100) * 1.4)}
                >
                  <rect
                    x={x - 52}
                    y={y - 32}
                    width="104"
                    height="64"
                    rx="10"
                    fill="#2a1a00"
                    fillOpacity="0.35"
                    stroke={sel ? '#22d3ee' : '#f97316'}
                    strokeWidth={sel ? 2 : 1.5}
                    strokeDasharray="5,3"
                  />
                  <text x={x} y={y - 19} textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold" fontFamily="monospace">
                    GHOST · #{i + 1} · {pred.bank}
                  </text>
                  <text x={x} y={y - 4} textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="500">
                    {pred.label.split('—')[1]?.trim().slice(0, 17) ?? pred.label.slice(0, 17)}
                  </text>
                  <GhostTimer p={pred} x={x} y={y + 11} />
                  <text
                    x={x}
                    y={y + 25}
                    textAnchor="middle"
                    fill={unit ? '#c4b5fd' : '#64748b'}
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {unit && assignment ? `▶ ${unit.callsign} ${assignment.travelMin.toFixed(0)}m` : 'no unit in range'}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {Object.entries(nodeColors).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border" style={{ background: val.bg, borderColor: val.border }} />
              <span className="text-[10px] text-slate-400 capitalize">{val.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-orange-500" style={{ borderTop: '2px dashed #f97316' }} />
            <span className="text-[10px] text-slate-400">Predicted cash-out (ghost ATM; thickness = probability)</span>
          </div>
          {gangCtx.gang && gangColor && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-3 rounded border border-dashed" style={{ borderColor: gangColor }} />
              <span className="text-[10px] text-slate-400">{gangCtx.gang.id} account</span>
            </div>
          )}
        </div>
      </div>

      {/* Detail panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Edge detail */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Transaction Detail</h4>
          </div>
          {selectedEdge ? (
            <div className="space-y-2 fade-in">
              <div className="flex justify-between"><span className="text-xs text-slate-500">Reference</span><span className="text-xs font-mono text-cyan-400">{selectedEdge.reference}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">From</span><span className="text-xs text-slate-200">{holder(selectedEdge.fromAccount)}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">To</span><span className="text-xs text-slate-200">{holder(selectedEdge.toAccount)}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">Amount</span><span className="text-xs font-medium text-white">{formatCurrency(selectedEdge.amount)}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">Method</span><span className="text-xs text-cyan-400 font-mono">{selectedEdge.method}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">Layer</span><span className="text-xs text-slate-200">Layer {selectedEdge.layer}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">Timestamp</span><span className="text-xs text-slate-200">{formatDateTime(selectedEdge.timestamp)}</span></div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Click an edge in the graph to view transaction details.</p>
          )}
        </div>

        {/* Node detail */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Account Detail</h4>
          </div>
          {selectedNode ? (
            <div className="space-y-2 fade-in">
              <div className="flex justify-between"><span className="text-xs text-slate-500">Holder</span><span className="text-xs text-slate-200">{selectedNode.label}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">Type</span><span className="text-xs text-slate-200 capitalize">{selectedNode.type}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">Bank</span><span className="text-xs text-slate-200">{selectedNode.bank}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">Location</span><span className="text-xs text-slate-200">{selectedNode.location}</span></div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Click a node in the graph to view account details.</p>
          )}
        </div>

        {/* Ghost detail */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Ghost className="w-4 h-4 text-orange-400" />
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Predicted ATM</h4>
          </div>
          {selectedGhost ? (
            <div className="space-y-2 fade-in">
              <div className="flex justify-between gap-2"><span className="text-xs text-slate-500">ATM</span><span className="text-xs text-slate-200 text-right">{selectedGhost.label}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">Probability</span><span className="text-xs font-medium text-white">{selectedGhost.probability}%</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">Window</span><WindowChip prediction={selectedGhost} /></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">Expected</span><span className="text-xs text-slate-200">{formatDateTime(selectedGhost.expectedTime)}</span></div>
              <div className="flex justify-between"><span className="text-xs text-slate-500">Median in</span><Countdown targetMs={new Date(selectedGhost.expectedTime).getTime()} className="text-xs text-cyan-300" /></div>
              {(() => {
                const a = plan.assignments.find((x) => x.atmId === selectedGhost.atmId);
                const u = a ? unitById.get(a.unitId) : null;
                return (
                  <div className="flex justify-between"><span className="text-xs text-slate-500">Unit</span><span className="text-xs text-violet-300 font-mono">{u && a ? `${u.callsign} · ${a.travelMin.toFixed(0)} min` : 'none in range'}</span></div>
                );
              })()}
              {can('dispatch') && (
              <button
                onClick={() => onLockTarget(caseData.id, selectedGhost.atmId)}
                className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/40 border border-red-800/50 text-red-300 text-[11px] uppercase tracking-wider transition-colors"
              >
                <Crosshair className="w-3.5 h-3.5" /> Lock target on map
              </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Click a ghost node to see its window, assigned unit and coordinates.</p>
          )}
        </div>
      </div>

      {/* Gang intelligence */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-fuchsia-400" />
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Gang Intelligence</h4>
          <span className="text-[10px] text-slate-600 ml-auto">rule-based: gang = 2+ shared mule accounts</span>
        </div>

        {gangCtx.gang && gangColor ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold border" style={{ color: gangColor, borderColor: gangColor }}>
                {gangCtx.gang.id}
              </span>
              <span className="text-xs text-slate-400">{gangCtx.gang.caseIds.length} cases</span>
              <span className="text-xs text-slate-400">{gangCtx.gang.accountIds.length} mule accounts</span>
              <span className="text-xs text-slate-400">{formatCurrency(gangCtx.gang.totalAmount)} stolen</span>
              <span className="text-xs text-slate-500">{gangCtx.gang.districts.join(' · ')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {gangCtx.gang.caseIds.map((id) => (
                <button
                  key={id}
                  onClick={() => onSelectCase(id)}
                  className={`px-2 py-1 rounded border text-[11px] font-mono transition-colors ${
                    id === caseData.id ? 'bg-cyan-950/30 border-cyan-800/50 text-cyan-300' : 'bg-navy-950 border-navy-700 text-slate-300 hover:border-navy-600'
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-400">
              <span className="text-slate-500">Hub accounts (used by 2+ cases): </span>
              {gangCtx.gang.hubAccountIds.map(holder).join(', ')}
            </div>
            <div className="text-[11px] text-slate-400">
              <span className="text-slate-500">Known cash-outs: </span>
              {gangCtx.gang.knownCashOuts.length === 0
                ? 'none recorded'
                : gangCtx.gang.knownCashOuts
                    .map((k) => `${k.caseId} at ${atms.find((a) => a.id === k.atmId)?.address ?? k.atmId} (${k.intercepted ? 'intercepted' : 'not intercepted'})`)
                    .join('; ')}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {caseData.id} does not share 2+ mule accounts with any other case, so it is not assigned to a gang.
          </p>
        )}

        {gangCtx.weakLinks.length > 0 && (
          <div className="mt-4 pt-3 border-t border-navy-700">
            <div className="flex items-center gap-1.5 mb-2">
              <Link2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] text-slate-400">
                Weak links: one shared account only. Possible common facilitator, not proof of one crew.
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {gangCtx.weakLinks.map((l) => {
                const other = l.caseA === caseData.id ? l.caseB : l.caseA;
                const who = l.sharedAccountIds.map(holder).join(', ');
                return (
                  <button
                    key={`${l.caseA}-${l.caseB}`}
                    onClick={() => onSelectCase(other)}
                    className="px-2 py-1 rounded border border-dashed border-navy-600 bg-navy-950 text-[11px] text-slate-300 hover:border-cyan-800/50 transition-colors"
                  >
                    <span className="font-mono">{other}</span> <span className="text-slate-500">via {who}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
