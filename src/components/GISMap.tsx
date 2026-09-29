import { Fragment, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { MapPin, Layers, Crosshair } from 'lucide-react';
import { useAccess } from '@/context/AccessContext';
import { cases, atms, atmClusters, districts, patrolUnits } from '@/data/mockData';
import { useCasePlan } from '@/hooks/useCasePlan';
import CoordinatePanel from '@/components/CoordinatePanel';
import { riskColor } from '@/utils/helpers';
import type { RiskLevel } from '@/types';

interface GISMapProps {
  caseId: string | null;
  lockedAtmId: string | null;
  onLockChange: (atmId: string | null) => void;
  onSelectCase: (caseId: string) => void;
}

const INDIA_CENTER: [number, number] = [22.5, 80];
const LOCK_ZOOM = 15;
const UNIT_COLOR = '#a78bfa';

const reticleIcon = divIcon({
  className: 'target-reticle',
  iconSize: [80, 80],
  iconAnchor: [40, 40],
  html: '<div class="reticle"><span class="r-ring"></span><span class="r-pulse"></span><span class="r-tick n"></span><span class="r-tick s"></span><span class="r-tick e"></span><span class="r-tick w"></span></div>',
});

/** Flies the map to the locked ATM, or back out to the national view when released. */
function LockCamera({ target }: { target: [number, number] | null }) {
  const map = useMap();
  const mounted = useRef(false);
  const lat = target?.[0];
  const lng = target?.[1];
  useEffect(() => {
    // The first run only syncs with the initial state: MapContainer already starts at the right place.
    const firstRun = !mounted.current;
    mounted.current = true;
    if (lat !== undefined && lng !== undefined) {
      if (!firstRun) map.flyTo([lat, lng], LOCK_ZOOM, { duration: 1.2 });
    } else if (!firstRun) {
      map.flyTo(INDIA_CENTER, 5, { duration: 1.0 });
    }
  }, [lat, lng, map]);
  return null;
}

export default function GISMap({ caseId, lockedAtmId, onLockChange, onSelectCase }: GISMapProps) {
  const [showATMs, setShowATMs] = useState(true);
  const [showClusters, setShowClusters] = useState(true);
  const [showPredictions, setShowPredictions] = useState(true);
  const [showCases, setShowCases] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [initialLock] = useState(lockedAtmId);

  const caseData = cases.find((c) => c.id === caseId) ?? cases[0];
  const { all, top5: predictions, plan } = useCasePlan(caseData);

  const locked = all.find((p) => p.atmId === lockedAtmId) ?? null;
  const lockedAssignment = plan.assignments.find((a) => a.atmId === lockedAtmId) ?? null;
  const unitById = new Map(patrolUnits.map((u) => [u.id, u]));
  const initialTarget = all.find((p) => p.atmId === initialLock);

  // Build polyline from case origin through predicted locations
  const predictionPath: [number, number][] = [
    [caseData.originLat, caseData.originLng],
    ...predictions.slice(0, 3).map((p) => [p.lat, p.lng] as [number, number]),
  ];

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">GIS Intelligence Map</h3>
            <select
              value={caseData.id}
              onChange={(e) => onSelectCase(e.target.value)}
              className="ml-2 bg-navy-950 border border-navy-700 rounded px-2 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-800"
              aria-label="Select case"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.status}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ToggleChip label="ATMs" active={showATMs} onClick={() => setShowATMs(!showATMs)} color="cyan" />
            <ToggleChip label="Clusters" active={showClusters} onClick={() => setShowClusters(!showClusters)} color="blue" />
            <ToggleChip label="Predictions" active={showPredictions} onClick={() => setShowPredictions(!showPredictions)} color="orange" />
            <ToggleChip label="Complaints" active={showCases} onClick={() => setShowCases(!showCases)} color="red" />
            <ToggleChip label="Risk Zones" active={showZones} onClick={() => setShowZones(!showZones)} color="green" />
            <ToggleChip label="Units" active={showUnits} onClick={() => setShowUnits(!showUnits)} color="violet" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
      {/* Map */}
      <div className="card p-1 overflow-hidden">
        <div style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}>
          <MapContainer
            center={initialTarget ? [initialTarget.lat, initialTarget.lng] : INDIA_CENTER}
            zoom={initialTarget ? LOCK_ZOOM : 5}
            className="w-full h-full rounded-lg"
            scrollWheelZoom={true}
          >
            <LockCamera target={locked ? [locked.lat, locked.lng] : null} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />

            {/* Risk Zones (districts) */}
            {showZones &&
              districts.map((d) => {
                const color = riskColor(d.riskZone as RiskLevel);
                return (
                  <CircleMarker
                    key={d.id}
                    center={[d.lat, d.lng]}
                    radius={30}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.08,
                      weight: 1,
                    }}
                  >
                    <Tooltip>
                      <div className="text-xs">
                        <p className="font-semibold text-white">{d.name}</p>
                        <p className="text-slate-400">{d.state} — {d.riskZone} risk zone</p>
                      </div>
                    </Tooltip>
                  </CircleMarker>
                );
              })}

            {/* ATM Clusters */}
            {showClusters &&
              atmClusters.map((cluster) => {
                const color = riskColor(cluster.riskLevel);
                return (
                  <CircleMarker
                    key={cluster.id}
                    center={[cluster.centerLat, cluster.centerLng]}
                    radius={20}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.15,
                      weight: 2,
                      dashArray: '4,2',
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-white">{cluster.name}</p>
                        <p className="text-slate-300">{cluster.atmCount} ATMs · {cluster.district}, {cluster.state}</p>
                        <p className="text-slate-300">Risk: <span style={{ color }}>{cluster.riskLevel.toUpperCase()}</span></p>
                        <p className="text-slate-300">Historical Hit Rate: {(cluster.historicalHitRate * 100).toFixed(0)}%</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

            {/* Individual ATMs */}
            {showATMs &&
              atms.map((atm) => {
                const color = riskColor(atm.riskLevel);
                return (
                  <CircleMarker
                    key={atm.id}
                    center={[atm.lat, atm.lng]}
                    radius={5}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.8,
                      weight: 1.5,
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-white">{atm.bank} ATM</p>
                        <p className="text-slate-300">{atm.address}</p>
                        <p className="text-slate-300">{atm.district}, {atm.state}</p>
                        <p className="text-slate-300">Risk: <span style={{ color }}>{atm.riskLevel.toUpperCase()}</span></p>
                        <LockButton onClick={() => onLockChange(atm.id)} />
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

            {/* Complaint locations */}
            {showCases &&
              cases.map((c) => (
                <CircleMarker
                  key={c.id}
                  center={[c.originLat, c.originLng]}
                  radius={8}
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.6,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-white">{c.id}</p>
                      <p className="text-slate-300">{c.fraudType}</p>
                      <p className="text-slate-300">Amount: ₹{c.amount.toLocaleString('en-IN')}</p>
                      <p className="text-slate-300">Origin: {c.originLocation}</p>
                      <p className="text-slate-300">Risk Score: {c.riskScore}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

            {/* Predicted cash-out locations */}
            {showPredictions &&
              predictions.map((pred, i) => {
                const color = i === 0 ? '#ef4444' : i === 1 ? '#f97316' : i === 2 ? '#eab308' : '#22d3ee';
                return (
                  <CircleMarker
                    key={pred.atmId}
                    center={[pred.lat, pred.lng]}
                    radius={i === 0 ? 14 : 10 - i}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.4,
                      weight: 3,
                    }}
                  >
                    <Popup>
                      <div className="text-xs space-y-1">
                        <p className="font-bold" style={{ color }}>#{i + 1} Prediction — {pred.probability}%</p>
                        <p className="text-white font-semibold">{pred.label}</p>
                        <p className="text-slate-300">Expected: {new Date(pred.expectedTime).toLocaleString('en-IN')}</p>
                        <p className="text-slate-300">{Math.round(pred.conformal.targetCoverage * 100)}% set: {pred.conformal.inSet ? 'inside' : 'outside'} ({pred.conformal.setSize} ATMs)</p>
                        <p className="text-slate-300">Distance: {pred.distanceKm} km</p>
                        <LockButton onClick={() => onLockChange(pred.atmId)} />
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}

            {/* Patrol units (simulated) and their assigned routes */}
            {showUnits &&
              patrolUnits.map((u) => {
                const a = plan.assignments.find((x) => x.unitId === u.id);
                const dest = a ? all.find((p) => p.atmId === a.atmId) : null;
                const isLockedUnit = !!a && a.atmId === lockedAtmId;
                return (
                  <Fragment key={u.id}>
                    {a && dest && (
                      <Polyline
                        positions={[[u.lat, u.lng], [dest.lat, dest.lng]]}
                        pathOptions={{
                          color: isLockedUnit ? '#f87171' : UNIT_COLOR,
                          weight: isLockedUnit ? 3 : 1.5,
                          opacity: isLockedUnit ? 0.95 : 0.5,
                          dashArray: '6,5',
                        }}
                      />
                    )}
                    <CircleMarker
                      center={[u.lat, u.lng]}
                      radius={6}
                      pathOptions={{ color: UNIT_COLOR, fillColor: a ? UNIT_COLOR : '#1c2550', fillOpacity: 0.9, weight: 2 }}
                    >
                      <Tooltip direction="top" offset={[0, -6]}>
                        <div className="text-xs">
                          <p className="font-mono font-semibold text-violet-300">{u.callsign}</p>
                          <p className="text-slate-400">{u.station}</p>
                          <p className="text-slate-400">
                            {a && dest ? `→ ${dest.label} · ${a.travelMin.toFixed(0)} min` : 'standby'}
                          </p>
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  </Fragment>
                );
              })}

            {/* Target lock: reticle + range rings */}
            {locked && (
              <>
                {[500, 1000, 2000].map((r) => (
                  <Circle
                    key={r}
                    center={[locked.lat, locked.lng]}
                    radius={r}
                    pathOptions={{ color: '#ef4444', weight: 1, opacity: 0.55, fillOpacity: r === 500 ? 0.06 : 0, dashArray: '3,5' }}
                  />
                ))}
                <Marker position={[locked.lat, locked.lng]} icon={reticleIcon} interactive={false} zIndexOffset={1000} />
              </>
            )}

            {/* Prediction path */}
            {showPredictions && predictions.length > 0 && (
              <Polyline
                positions={predictionPath}
                pathOptions={{
                  color: '#22d3ee',
                  weight: 2,
                  opacity: 0.6,
                  dashArray: '8,4',
                }}
              />
            )}
          </MapContainer>
        </div>
      </div>

      <CoordinatePanel
        caseData={caseData}
        predictions={all}
        plan={plan}
        units={patrolUnits}
        lockedAtmId={locked ? locked.atmId : null}
        onLock={onLockChange}
        onRelease={() => onLockChange(null)}
      />
      </div>

      {/* Map legend */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Map Legend</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <LegendItem color="#ef4444" label="Critical / #1 Prediction" />
          <LegendItem color="#f97316" label="High Risk / #2 Prediction" />
          <LegendItem color="#eab308" label="Medium Risk / #3 Prediction" />
          <LegendItem color="#22c55e" label="Low Risk Zone" />
          <LegendItem color="#22d3ee" label="ATM / Cluster" />
          <LegendItem color="#3b82f6" label="Prediction Path" dashed />
          <LegendItem color={UNIT_COLOR} label="Patrol unit (simulated)" />
          <LegendItem color="#ef4444" label="Lock rings 0.5 / 1 / 2 km" dashed />
        </div>
      </div>
    </div>
  );
}

function ToggleChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'bg-cyan-950/40 border-cyan-800/50 text-cyan-300',
    blue: 'bg-blue-950/40 border-blue-800/50 text-blue-300',
    orange: 'bg-orange-950/40 border-orange-800/50 text-orange-300',
    red: 'bg-red-950/40 border-red-800/50 text-red-300',
    green: 'bg-green-950/40 border-green-800/50 text-green-300',
    violet: 'bg-violet-950/40 border-violet-800/50 text-violet-300',
    inactive: 'bg-navy-950 border-navy-700 text-slate-600',
  };
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-[10px] uppercase rounded border transition-colors ${active ? colorMap[color] : colorMap.inactive}`}
    >
      {label}
    </button>
  );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {dashed ? (
        <span className="w-6 h-0.5" style={{ borderTop: `2px dashed ${color}` }} />
      ) : (
        <span className="w-3 h-3 rounded-full" style={{ background: color, opacity: 0.7 }} />
      )}
      <span className="text-[10px] text-slate-400">{label}</span>
    </div>
  );
}

function LockButton({ onClick }: { onClick: () => void }) {
  const { can } = useAccess();
  if (!can('dispatch')) return null;
  return (
    <button
      onClick={onClick}
      className="mt-1 flex items-center gap-1 px-2 py-1 rounded bg-red-950/40 border border-red-800/50 text-red-300 text-[10px] uppercase tracking-wider hover:bg-red-900/40"
    >
      <Crosshair className="w-3 h-3" /> Lock target
    </button>
  );
}
