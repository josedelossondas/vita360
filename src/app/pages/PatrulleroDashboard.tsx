import { useState, useEffect, useMemo, useRef } from 'react';
import { API_URL, useAuth } from '../../context/AuthContext';
import { CheckCircle2, AlertTriangle, Activity, Radio, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VITChat } from '../components/VITChat';
import { useFleetStream } from '../../hooks/useFleetStream';
import type { FleetVehicle } from '../../hooks/useFleetStream';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Ticket {
  id: number; title: string; description: string; status: string;
  urgency_level: string; priority_score: number; area_name: string;
  squad_name: string | null; lat: number | null; lon: number | null;
  created_at: string; planned_date?: string | null;
}
interface Squad { id: number; name: string; area_name: string; pending_tasks: number; squad_type?: string; }

const URGENCY_DOT: Record<string, string> = { Alta: '#b82c87', Media: '#f59e0b', Baja: '#2596be' };
const S_COLORS: Record<string, [string, string, string]> = {
  Recibido: ['rgba(37,150,190,0.1)', '#2596be', 'rgba(37,150,190,0.25)'],
  Asignado: ['rgba(139,92,246,0.1)', '#7c3aed', 'rgba(139,92,246,0.25)'],
  'En Gestión': ['rgba(245,158,11,0.1)', '#b45309', 'rgba(245,158,11,0.25)'],
  Resuelto: ['rgba(192,207,5,0.12)', '#7a8504', 'rgba(192,207,5,0.3)'],
  Cerrado: ['rgba(100,116,139,0.1)', '#475569', 'rgba(100,116,139,0.2)'],
};
const U_COLORS: Record<string, [string, string, string]> = {
  Alta: ['rgba(184,44,135,0.08)', '#b82c87', 'rgba(184,44,135,0.25)'],
  Media: ['rgba(245,158,11,0.1)', '#b45309', 'rgba(245,158,11,0.25)'],
  Baja: ['rgba(37,150,190,0.1)', '#2596be', 'rgba(37,150,190,0.2)'],
};

// ── Quadrant definitions for Vitacura ─────────────────────────────────────────
const QUADRANTS: Record<string, { label: string; color: string; bounds: [[number,number],[number,number]]; center: [number,number] }> = {
  'Patrulla Norte': { label: 'Cuadrante Norte', color: '#2596be', bounds: [[-33.362, -70.612], [-33.383, -70.548]], center: [-33.372, -70.580] },
  'Patrulla Sur':   { label: 'Cuadrante Sur',   color: '#b82c87', bounds: [[-33.383, -70.612], [-33.410, -70.548]], center: [-33.396, -70.580] },
  'Patrulla Este':  { label: 'Cuadrante Este',  color: '#c0cf05', bounds: [[-33.362, -70.548], [-33.410, -70.520]], center: [-33.386, -70.534] },
  'Patrulla Oeste': { label: 'Cuadrante Oeste', color: '#f59e0b', bounds: [[-33.362, -70.640], [-33.410, -70.612]], center: [-33.386, -70.626] },
};

function isToday(dateStr: string) {
  const d = new Date(dateStr), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function Badge({ color, label }: { color: [string, string, string]; label: string }) {
  return <span style={{ background: color[0], color: color[1], border: `1px solid ${color[2]}`, padding: '1px 7px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>{label}</span>;
}
function KPI({ icon, label, value, accent, sub }: { icon: React.ReactNode; label: string; value: string | number; accent: string; sub?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(37,150,190,0.1)', borderRadius: 16, padding: '16px 20px', boxShadow: '0 4px 20px rgba(37,150,190,0.07)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>{icon}</div>
      <div>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500, color: '#94a3b8', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: accent }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

function makePatrolIcon() {
  return L.divIcon({ html: `<div style="width:26px;height:26px;border-radius:50%;background:#FBBF24;border:2.5px solid #1E40AF;display:flex;align-items:center;justify-content:center;color:#1E40AF;font-weight:700;font-size:12px;font-family:sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35)">P</div>`, className: '', iconSize: [26, 26] as [number,number], iconAnchor: [13, 13] as [number,number] });
}
function makeSuspectIcon() {
  return L.divIcon({ html: `<div style="width:26px;height:26px;border-radius:50%;background:#EF4444;border:2.5px solid #991B1B;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;font-family:sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35)">S</div>`, className: '', iconSize: [26, 26] as [number,number], iconAnchor: [13, 13] as [number,number] });
}
function makeTicketIcon(urgency: string, idx: number) {
  const color = URGENCY_DOT[urgency] || '#2596be';
  const sz = idx === 0 ? 34 : 26;
  return L.divIcon({
    html: `<div style="width:${sz}px;height:${sz}px;background:${color};border-radius:50%;border:${idx === 0 ? 3.5 : 2.5}px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${idx === 0 ? 13 : 10}px">${idx + 1}</div>`,
    className: '', iconSize: [sz, sz] as [number,number], iconAnchor: [sz / 2, sz / 2] as [number,number],
  });
}

// ── Vitacura polygon ─────────────────────────────────────────────────────────
const VITACURA_LATLNG: [number, number][] = [
  [-33.40979121627189, -70.60720212276362],
  [-33.40062873415507, -70.60840916155004],
  [-33.389499332962856, -70.60289165587551],
  [-33.384992599105885, -70.60089636010098],
  [-33.38235000758301, -70.60277694816887],
  [-33.3760046376323, -70.60036296220976],
  [-33.36285230108139, -70.59916175951844],
  [-33.353903448919226, -70.5857895350789],
  [-33.3514840846016, -70.57726401140697],
  [-33.35481947183783, -70.56659382227234],
  [-33.358284938330605, -70.55266896741463],
  [-33.366885883318275, -70.54445398028918],
  [-33.37061534300281, -70.53934955826718],
  [-33.36750323758047, -70.52074458758153],
  [-33.37295876607694, -70.51749157581536],
  [-33.37655552632404, -70.5258190410902],
  [-33.38463659966653, -70.53453836833025],
  [-33.4050878306965, -70.58657798777993],
  [-33.409295179207504, -70.60055765154465],
  [-33.4098027342863, -70.60727829770096],
  [-33.40979121627189, -70.60720212276362],
];

// ── PATRULLERO DASHBOARD ──────────────────────────────────────────────────────
export function PatrulleroDashboard() {
  const { token } = useAuth();
  const fleetData = useFleetStream();
  const fleetVehicles: FleetVehicle[] = fleetData?.vehicles ?? [];
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySquadName, setMySquadName] = useState('');

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const fleetMarkers = useRef<Map<string, any>>(new Map());
  const ticketMarkers = useRef<any[]>([]);
  const suspectTrail = useRef<[number, number][]>([]);
  const suspectPolyline = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // Load data
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [rT, rSq] = await Promise.all([
          fetch(`${API_URL}/tickets?limit=500`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/squads`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const tData: Ticket[] = rT.ok ? await rT.json() : [];
        const sqData: Squad[] = rSq.ok ? await rSq.json() : [];
        setTickets(tData);
        setSquads(sqData);
        // Find patrol squad from localStorage or pick first patrol squad
        const saved = localStorage.getItem('vita_patrullero_squad');
        const patrolSquads = sqData.filter(s => s.squad_type === 'patrulla');
        const match = patrolSquads.find(s => s.name === saved) || patrolSquads[0];
        if (match) {
          setMySquadName(match.name);
          localStorage.setItem('vita_patrullero_squad', match.name);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token]);

  // Determine quadrant
  const quadrant = QUADRANTS[mySquadName];
  const squadTickets = useMemo(() =>
    tickets.filter(t => t.squad_name === mySquadName && !['Resuelto', 'Cerrado'].includes(t.status))
      .sort((a, b) => b.priority_score - a.priority_score),
    [tickets, mySquadName]
  );

  // Route order
  const routeTickets = useMemo(() => {
    if (!quadrant) return squadTickets;
    const [sw, ne] = quadrant.bounds;
    const inQuadrant = squadTickets.filter(t => {
      if (!t.lat || !t.lon) return true;
      return t.lat >= ne[0] && t.lat <= sw[0] && t.lon >= sw[1] && t.lon <= ne[1];
    });
    const outside = squadTickets.filter(t => !inQuadrant.includes(t));
    return [...inQuadrant, ...outside];
  }, [squadTickets, quadrant]);

  // Init map
  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;
    const map = L.map(mapRef.current).setView(quadrant?.center || [-33.38, -70.57], 13);
    mapInstance.current = map;
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© CARTO', subdomains: 'abcd', maxZoom: 20,
    }).addTo(map);

    // Overlay oscuro fuera de Vitacura
    const outerWorld: [number, number][] = [[90, -180], [90, 180], [-90, 180], [-90, -180]];
    L.polygon([outerWorld, [...VITACURA_LATLNG].reverse()], {
      stroke: false, fillColor: '#94a3b8', fillOpacity: 0.45,
    }).addTo(map);
    L.polygon(VITACURA_LATLNG, {
      color: '#64748b', weight: 2, opacity: 0.6, dashArray: '6 4', fill: false,
    }).addTo(map);

    // Draw ALL quadrant bounds with labels
    for (const [name, q] of Object.entries(QUADRANTS)) {
      const [[s, w], [n, e]] = q.bounds;
      const isOwn = name === mySquadName;
      L.rectangle([[n, w], [s, e]], {
        color: q.color, fillColor: q.color,
        fillOpacity: isOwn ? 0.12 : 0.04,
        weight: isOwn ? 3 : 1.5,
        opacity: isOwn ? 0.7 : 0.35,
        dashArray: isOwn ? undefined : '8 4',
      }).addTo(map);
      L.marker(q.center, {
        icon: L.divIcon({
          html: `<div style="background:${q.color};color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2);opacity:${isOwn ? 1 : 0.6}">${q.label}${isOwn ? ' ★' : ''}</div>`,
          className: '', iconAnchor: [55, 12] as [number,number],
        }),
      }).addTo(map);
    }
    setMapReady(true);
    return () => { map.remove(); mapInstance.current = null; setMapReady(false); fleetMarkers.current.clear(); ticketMarkers.current = []; };
  }, [mySquadName]);

  // Fleet markers (patrol + suspect choreography)
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const map = mapInstance.current;
    const seenIds = new Set<string>();
    for (const v of fleetVehicles) {
      seenIds.add(v.id);
      if (fleetMarkers.current.has(v.id)) {
        fleetMarkers.current.get(v.id).setLatLng([v.lat, v.lng]);
      } else {
        const icon = v.type === 'suspect' ? makeSuspectIcon() : makePatrolIcon();
        const popup = `<div style="font-family:system-ui;font-size:13px"><b>${v.id}</b><br>Estado: ${v.status}<br>Área: ${v.area}</div>`;
        fleetMarkers.current.set(v.id, L.marker([v.lat, v.lng], { icon }).bindPopup(popup).addTo(map));
      }
      if (v.type === 'suspect') {
        suspectTrail.current.push([v.lat, v.lng]);
        if (suspectTrail.current.length > 40) suspectTrail.current.shift();
        if (suspectPolyline.current) suspectPolyline.current.setLatLngs(suspectTrail.current);
        else suspectPolyline.current = L.polyline(suspectTrail.current, { color: '#EF4444', weight: 2, opacity: 0.45, dashArray: '4 4' }).addTo(map);
      }
    }
    for (const [id, m] of fleetMarkers.current) {
      if (!seenIds.has(id)) { map.removeLayer(m); fleetMarkers.current.delete(id); }
    }
  }, [fleetVehicles, mapReady]);

  // Ticket markers
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;
    const map = mapInstance.current;
    for (const m of ticketMarkers.current) map.removeLayer(m);
    ticketMarkers.current = [];
    routeTickets.forEach((t, i) => {
      if (!t.lat || !t.lon) return;
      const icon = makeTicketIcon(t.urgency_level, i);
      const m = L.marker([t.lat, t.lon], { icon })
        .bindPopup(`<div style="font-family:system-ui;font-size:13px;min-width:160px"><b>#${i+1} ${t.title}</b><br><span style="color:#64748b">${t.area_name} · ${t.urgency_level}</span></div>`)
        .addTo(map);
      ticketMarkers.current.push(m);
    });
    const pts: [number, number][] = routeTickets.filter(t => t.lat && t.lon).map(t => [t.lat!, t.lon!]);
    if (pts.length > 0 && mapInstance.current) mapInstance.current.fitBounds(L.latLngBounds(pts), { padding: [50, 50] });
  }, [routeTickets, mapReady]);

  const patrolCount = fleetVehicles.filter(v => v.type === 'patrol').length;
  const suspectActive = fleetVehicles.some(v => v.type === 'suspect');
  const cardStyle = { background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(184,44,135,0.12)', borderRadius: 16, boxShadow: '0 4px 20px rgba(184,44,135,0.07)' };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: '2.5px solid #b82c87', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', marginRight: 10 }} />
      <span style={{ fontSize: 14, color: '#94a3b8' }}>Cargando patrullaje…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#b82c87,#8b1a6b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Radio size={22} style={{ color: 'white' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>Patrullero Municipal</h1>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              {quadrant ? quadrant.label : 'Patrulla activa'} ·&nbsp;
              {mySquadName && <span style={{ fontWeight: 600, color: '#b82c87' }}>{mySquadName}</span>}
              &nbsp;· {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          {suspectActive && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', fontSize: 12, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              Sospechoso activo
            </div>
          )}
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <KPI icon={<Navigation size={17} />} label="Tickets en ruta" value={routeTickets.length} accent="#b82c87" />
          <KPI icon={<Activity size={17} />} label="Patrullas activas" value={patrolCount} accent="#2596be" sub="en el mapa" />
          <KPI icon={<AlertTriangle size={17} />} label="Alta urgencia" value={routeTickets.filter(t => t.urgency_level === 'Alta').length} accent="#ef4444" />
          <KPI icon={<CheckCircle2 size={17} />} label="Resueltos hoy" value={tickets.filter(t => t.squad_name === mySquadName && t.status === 'Resuelto' && isToday(t.created_at)).length} accent="#7a8504" />
        </div>

        {/* Map + Ticket list side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
          {/* Map */}
          <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden', borderColor: 'rgba(184,44,135,0.2)' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg,#b82c87,#2596be,#c0cf05)' }} />
            {/* Status bar */}
            <div style={{ position: 'absolute', top: 13, left: 10, zIndex: 500, display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ padding: '5px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(184,44,135,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>En patrulla</span>
                {patrolCount > 0 && <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 5, background: 'rgba(37,150,190,0.1)', color: '#2596be' }}>{patrolCount} unidades</span>}
              </div>
            </div>
            {/* Leyenda */}
            <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 500, display: 'flex', gap: 10, padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.06)' }}>
              {[['Alta', '#b82c87'], ['Media', '#f59e0b'], ['Baja', '#2596be']].map(([lb, c]) => (
                <span key={lb} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'inline-block' }} />{lb}
                </span>
              ))}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FBBF24', border: '1.5px solid #1E40AF', display: 'inline-block' }} />Patrulla
              </span>
            </div>
            <div ref={mapRef} style={{ width: '100%', height: 580 }} />
          </div>

          {/* Ticket route list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 620 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <Navigation size={14} style={{ color: '#b82c87' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>Orden de ruta</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(184,44,135,0.08)', color: '#b82c87', border: '1px solid rgba(184,44,135,0.2)' }}>{routeTickets.length} paradas</span>
            </div>

            {routeTickets.length === 0 ? (
              <div style={{ ...cardStyle, padding: '24px 16px', textAlign: 'center' }}>
                <CheckCircle2 size={24} style={{ color: '#7a8504', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Sin tickets pendientes 🎉</p>
              </div>
            ) : routeTickets.map((t, i) => (
              <div key={t.id} style={{ ...cardStyle, padding: 12, borderLeft: `3px solid ${URGENCY_DOT[t.urgency_level] || '#2596be'}`, borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: URGENCY_DOT[t.urgency_level] || '#2596be', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 3 }}>
                      <Badge color={(S_COLORS[t.status] ?? S_COLORS.Cerrado) as [string,string,string]} label={t.status} />
                      <Badge color={(U_COLORS[t.urgency_level] ?? U_COLORS.Baja) as [string,string,string]} label={t.urgency_level} />
                    </div>
                    <p style={{ fontSize: 12.5, fontWeight: 500, color: '#1e293b', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.title}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{t.area_name}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#b82c87', fontFamily: 'monospace', flexShrink: 0 }}>{t.priority_score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <VITChat mode="patrol" squadName={mySquadName} />
    </>
  );
}
