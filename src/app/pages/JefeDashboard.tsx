import { useState, useEffect, useMemo, useRef } from 'react';
import { API_URL, useAuth } from '../../context/AuthContext';
import { Clock, MapPin, CheckCircle2, Briefcase, TrendingUp, Filter, ChevronDown, AlertTriangle, Activity, Radio, Navigation } from 'lucide-react';
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

const STATUS_FLOW = ['Recibido', 'Asignado', 'En Gestión', 'Resuelto'];
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
function calcAvgHours(tickets: Ticket[]): string {
  const r = tickets.filter(t => t.status === 'Resuelto' && t.created_at && t.planned_date);
  if (!r.length) return '—';
  const avg = r.reduce((s, t) => s + Math.max(0, new Date(t.planned_date!).getTime() - new Date(t.created_at).getTime()), 0) / r.length;
  const h = avg / 3600000;
  return h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`;
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

// ── PATROL DASHBOARD ──────────────────────────────────────────────────────────
function PatrolDashboard({ tickets, squadName, squads }: { tickets: Ticket[]; squadName: string; squads: Squad[] }) {
  const fleetData = useFleetStream();
  const fleetVehicles: FleetVehicle[] = fleetData?.vehicles ?? [];

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const fleetMarkers = useRef<Map<string, any>>(new Map());
  const ticketMarkers = useRef<any[]>([]);
  const quadrantLayer = useRef<any>(null);
  const suspectTrail = useRef<[number, number][]>([]);
  const suspectPolyline = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // Determine quadrant for this patrol
  const quadrant = QUADRANTS[squadName];
  const squadTickets = useMemo(() =>
    tickets.filter(t => t.squad_name === squadName && !['Resuelto', 'Cerrado'].includes(t.status))
      .sort((a, b) => b.priority_score - a.priority_score),
    [tickets, squadName]
  );

  // Route order: sort by priority then proximity within quadrant
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
    const map = L.map(mapRef.current).setView(quadrant?.center || [-33.393, -70.58], 14);
    mapInstance.current = map;
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© CARTO', subdomains: 'abcd', maxZoom: 20,
    }).addTo(map);

    // Draw quadrant bounds
    if (quadrant) {
      const [[s, w], [n, e]] = quadrant.bounds;
      const rect = L.rectangle([[n, w], [s, e]], {
        color: quadrant.color, fillColor: quadrant.color, fillOpacity: 0.06, weight: 2.5, opacity: 0.5,
        dashArray: '8 4',
      }).addTo(map);
      quadrantLayer.current = rect;
      // Label
      L.marker(quadrant.center, {
        icon: L.divIcon({
          html: `<div style="background:${quadrant.color};color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2)">${quadrant.label}</div>`,
          className: '', iconAnchor: [55, 12] as [number,number],
        }),
      }).addTo(map);
    }
    setMapReady(true);
    return () => { map.remove(); mapInstance.current = null; setMapReady(false); fleetMarkers.current.clear(); ticketMarkers.current = []; };
  }, []);

  // Fleet markers
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
    // Draw route polyline
    const pts: [number, number][] = routeTickets.filter(t => t.lat && t.lon).map(t => [t.lat!, t.lon!]);
    if (pts.length > 1) {
      const poly = L.polyline(pts, { color: '#1e293b', weight: 3, opacity: 0.35, dashArray: '8,6' }).addTo(mapInstance.current);
      ticketMarkers.current.push(poly);
    }
  }, [routeTickets, mapReady]);

  const patrolCount = fleetVehicles.filter(v => v.type === 'patrol').length;
  const suspectActive = fleetVehicles.some(v => v.type === 'suspect');
  const cardStyle = { background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(184,44,135,0.12)', borderRadius: 16, boxShadow: '0 4px 20px rgba(184,44,135,0.07)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#b82c87,#8b1a6b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Radio size={22} style={{ color: 'white' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>{squadName}</h1>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            {quadrant ? quadrant.label : 'Patrulla activa'} ·&nbsp;
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
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
        <KPI icon={<CheckCircle2 size={17} />} label="Resueltos hoy" value={tickets.filter(t => t.squad_name === squadName && t.status === 'Resuelto' && isToday(t.created_at)).length} accent="#7a8504" />
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
  );
}

// ── REGULAR SQUAD DASHBOARD ───────────────────────────────────────────────────
function RegularSquadDashboard({ tickets, squadName, squads, allSquads }: { tickets: Ticket[]; squadName: string; squads: Squad[]; allSquads: Squad[] }) {
  const { token } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [dropOpen, setDropOpen] = useState(false);
  const [selectedSquad, setSelectedSquad] = useState(squadName);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [filterToday, setFilterToday] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [localTickets, setLocalTickets] = useState(tickets);
  useEffect(() => { setLocalTickets(tickets); }, [tickets]);

  const squadTickets = useMemo(() => localTickets.filter(t => t.squad_name === selectedSquad), [localTickets, selectedSquad]);
  const activeTickets = useMemo(() => {
    const base = squadTickets.filter(t => t.status !== 'Resuelto' && t.status !== 'Cerrado');
    return (filterToday ? base.filter(t => isToday(t.created_at)) : base).sort((a, b) => b.priority_score - a.priority_score);
  }, [squadTickets, filterToday]);
  const resolvedToday = useMemo(() => squadTickets.filter(t => (t.status === 'Resuelto' || t.status === 'Cerrado') && isToday(t.created_at)).length, [squadTickets]);
  const todayTotal = useMemo(() => squadTickets.filter(t => isToday(t.created_at)).length, [squadTickets]);
  const avgTime = useMemo(() => calcAvgHours(squadTickets), [squadTickets]);
  const avgScore = useMemo(() => {
    if (!activeTickets.length) return '—';
    return Math.round(activeTickets.reduce((s, t) => s + (t.priority_score || 0), 0) / activeTickets.length) + '%';
  }, [activeTickets]);

  const advanceStatus = async (ticket: Ticket) => {
    const idx = STATUS_FLOW.indexOf(ticket.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1];
    setUpdatingId(ticket.id);
    try {
      await fetch(`${API_URL}/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token!}` },
        body: JSON.stringify({ status: next }),
      });
      setLocalTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: next } : t));
      if (selectedTicket?.id === ticket.id) setSelectedTicket(p => p ? { ...p, status: next } : null);
    } finally { setUpdatingId(null); }
  };

  // Map
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layerGroup = useRef<L.FeatureGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([-33.393, -70.58], 14);
    mapInstance.current = map;
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '© CARTO', subdomains: 'abcd', maxZoom: 20 }).addTo(map);
    layerGroup.current = L.featureGroup().addTo(map);
    setMapReady(true);
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  useEffect(() => {
    if (!mapReady || !layerGroup.current) return;
    const group = layerGroup.current;
    group.clearLayers();
    const pts: [number, number][] = [];
    activeTickets.forEach((t, i) => {
      if (!t.lat || !t.lon) return;
      pts.push([t.lat, t.lon]);
      const icon = makeTicketIcon(t.urgency_level, i);
      L.marker([t.lat, t.lon], { icon }).bindPopup(`<b>#${i+1} ${t.title}</b><br>Urgencia: ${t.urgency_level}`).addTo(group);
    });
    if (pts.length > 1) L.polyline(pts, { color: '#1e293b', weight: 3, opacity: 0.45, dashArray: '8,6' }).addTo(group);
    if (pts.length > 0 && mapInstance.current) mapInstance.current.fitBounds(L.latLngBounds(pts), { padding: [50, 50] });
  }, [activeTickets, mapReady]);

  const cardStyle = { background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(37,150,190,0.1)', borderRadius: 16, boxShadow: '0 4px 20px rgba(37,150,190,0.06)' };
  const selectedSquadObj = allSquads.find(s => s.name === selectedSquad);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: 0 }}>Panel de Operaciones</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div ref={dropRef} style={{ position: 'relative', zIndex: 1000 }}>
          <button onClick={() => setDropOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 12, cursor: 'pointer', ...cardStyle, border: '1px solid rgba(37,150,190,0.2)' }}>
            <Briefcase size={14} style={{ color: '#2596be', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{selectedSquad || 'Seleccionar cuadrilla'}</span>
            {selectedSquadObj && <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, background: 'rgba(37,150,190,0.1)', color: '#2596be' }}>{selectedSquadObj.area_name}</span>}
            <ChevronDown size={13} style={{ color: '#94a3b8', transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {dropOpen && allSquads.length > 0 && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', minWidth: 240, background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', border: '1px solid rgba(37,150,190,0.12)', borderRadius: 12, boxShadow: '0 12px 40px rgba(37,150,190,0.15)', padding: 6 }}>
              {allSquads.filter(s => !s.squad_type || s.squad_type !== 'patrulla').map(s => (
                <button key={s.id} onClick={() => { setSelectedSquad(s.name); setDropOpen(false); localStorage.setItem('vita_jefe_squad', s.name); }}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: s.name === selectedSquad ? 'rgba(37,150,190,0.08)' : 'transparent', color: s.name === selectedSquad ? '#2596be' : '#1e293b' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{s.area_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPI icon={<Briefcase size={17} />} label="Tareas activas" value={activeTickets.length} accent="#2596be" sub={filterToday ? 'solo hoy' : 'total'} />
        <KPI icon={<CheckCircle2 size={17} />} label="Resueltas hoy" value={resolvedToday} accent="#7a8504" sub={todayTotal > 0 ? `${Math.round((resolvedToday / todayTotal) * 100)}% del día` : undefined} />
        <KPI icon={<Clock size={17} />} label="Tiempo medio" value={avgTime} accent="#7c3aed" />
        <KPI icon={<TrendingUp size={17} />} label="Score promedio" value={avgScore} accent="#b82c87" />
      </div>

      {/* Map + List */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 16, alignItems: 'start' }}>
        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <MapPin size={14} style={{ color: '#2596be' }} /> Orden de ruta
            </h2>
            <button onClick={() => setFilterToday(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, cursor: 'pointer', fontSize: 11.5, fontWeight: 500, background: filterToday ? 'rgba(37,150,190,0.1)' : 'rgba(255,255,255,0.7)', border: `1px solid ${filterToday ? 'rgba(37,150,190,0.3)' : 'rgba(37,150,190,0.15)'}`, color: filterToday ? '#2596be' : '#64748b' }}>
              <Filter size={11} /> {filterToday ? 'Solo hoy' : 'Todos'}
            </button>
          </div>
          {activeTickets.length === 0 ? (
            <div style={{ ...cardStyle, padding: '32px 16px', textAlign: 'center' }}>
              <CheckCircle2 size={26} style={{ color: '#7a8504', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: '#94a3b8' }}>{filterToday ? 'Sin tareas para hoy 🎉' : 'No hay tareas pendientes'}</p>
            </div>
          ) : activeTickets.map((t, i) => {
            const isSelect = selectedTicket?.id === t.id;
            const statusIdx = STATUS_FLOW.indexOf(t.status);
            const canAdv = statusIdx >= 0 && statusIdx < STATUS_FLOW.length - 1;
            return (
              <div key={t.id} onClick={() => setSelectedTicket(isSelect ? null : t)} style={{ ...cardStyle, padding: 14, cursor: 'pointer', borderColor: isSelect ? 'rgba(37,150,190,0.4)' : 'rgba(37,150,190,0.1)', boxShadow: isSelect ? '0 0 0 3px rgba(37,150,190,0.1)' : cardStyle.boxShadow }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? '#b82c87' : i === 1 ? '#f59e0b' : '#2596be', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                      <Badge color={(S_COLORS[t.status] ?? S_COLORS.Cerrado) as [string,string,string]} label={t.status} />
                      <Badge color={(U_COLORS[t.urgency_level] ?? U_COLORS.Baja) as [string,string,string]} label={t.urgency_level} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.title}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{t.area_name}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#2596be', fontFamily: 'monospace', flexShrink: 0 }}>{t.priority_score}%</span>
                </div>
                {isSelect && (
                  <div onClick={e => e.stopPropagation()} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(37,150,190,0.1)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, margin: 0 }}>{t.description}</p>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {STATUS_FLOW.map((st, si) => (<div key={st} style={{ flex: 1, height: 4, borderRadius: 2, background: si <= statusIdx ? '#2596be' : 'rgba(0,0,0,0.08)' }} title={st} />))}
                    </div>
                    {canAdv && (
                      <button onClick={() => advanceStatus(t)} disabled={updatingId === t.id} style={{ width: '100%', padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: updatingId === t.id ? '#e2e8f0' : 'linear-gradient(135deg, #2596be 0%, #1a7fa0 100%)', color: updatingId === t.id ? '#94a3b8' : '#fff', boxShadow: updatingId === t.id ? 'none' : '0 3px 10px rgba(37,150,190,0.3)' }}>
                        {updatingId === t.id ? 'Actualizando…' : `Avanzar → ${STATUS_FLOW[statusIdx + 1]}`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Map */}
        <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden', height: 600 }}>
          <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 500, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(37,150,190,0.15)', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
            <Activity size={12} style={{ color: '#2596be' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>Mapa de operaciones</span>
            {activeTickets.filter(t => t.lat && t.lon).length > 0 && <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 5, background: 'rgba(37,150,190,0.1)', color: '#2596be' }}>{activeTickets.filter(t => t.lat && t.lon).length} pts</span>}
          </div>
          <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 500, display: 'flex', alignItems: 'center', gap: 12, padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(37,150,190,0.1)' }}>
            {[['Alta', '#b82c87'], ['Media', '#f59e0b'], ['Baja', '#2596be']].map(([lb, c]) => (
              <span key={lb} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'inline-block' }} />{lb}
              </span>
            ))}
          </div>
          {activeTickets.filter(t => t.lat && t.lon).length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 400, pointerEvents: 'none' }}>
              <AlertTriangle size={22} style={{ color: '#cbd5e1', marginBottom: 8 }} />
              <p style={{ fontSize: 12, color: '#94a3b8' }}>Sin coordenadas disponibles</p>
            </div>
          )}
          <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export function JefeDashboard() {
  const { token, user } = useAuth();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySquad, setMySquad] = useState<Squad | null>(null);

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

        // Determine "my" squad from localStorage or first squad
        const saved = localStorage.getItem('vita_jefe_squad');
        const match = sqData.find(s => s.name === saved) || sqData[0] || null;
        setMySquad(match);
        if (match) localStorage.setItem('vita_jefe_squad', match.name);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: '2.5px solid #2596be', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', marginRight: 10 }} />
      <span style={{ fontSize: 14, color: '#94a3b8' }}>Cargando operaciones…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const isPatrol = mySquad?.squad_type === 'patrulla';
  const chatMode = isPatrol ? 'patrol' : 'squad';

  return (
    <>
      {isPatrol ? (
        <PatrolDashboard tickets={tickets} squadName={mySquad!.name} squads={squads} />
      ) : (
        <RegularSquadDashboard tickets={tickets} squadName={mySquad?.name || ''} squads={squads.filter(s => !s.squad_type || s.squad_type !== 'patrulla')} allSquads={squads} />
      )}
      <VITChat mode={chatMode} squadName={mySquad?.name} />
    </>
  );
}
