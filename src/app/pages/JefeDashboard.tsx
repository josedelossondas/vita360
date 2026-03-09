import { useState, useEffect, useMemo, useRef } from 'react';
import { API_URL, useAuth } from '../../context/AuthContext';
import { Clock, MapPin, CheckCircle2, Briefcase, TrendingUp, Filter, ChevronDown, AlertTriangle, Activity } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Ticket {
    id: number;
    title: string;
    description: string;
    status: string;
    urgency_level: string;
    priority_score: number;
    area_name: string;
    squad_name: string | null;
    lat: number | null;
    lon: number | null;
    created_at: string;
    planned_date?: string | null;
}
interface Squad { id: number; name: string; area_name: string; pending_tasks: number; }

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

export function JefeDashboard() {
    const { token } = useAuth();
    const [squads, setSquads] = useState<Squad[]>([]);
    const [selectedSquad, setSelectedSquad] = useState<string>('');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [filterToday, setFilterToday] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [dropOpen, setDropOpen] = useState(false);
    const dropRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Fetch all data ONCE on mount
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
                // Auto-select: prefer localStorage, fallback to first squad
                const saved = localStorage.getItem('vita_jefe_squad');
                const match = sqData.find(s => s.name === saved);
                const pick = match ? match.name : sqData[0]?.name ?? '';
                setSelectedSquad(pick);
                if (pick) localStorage.setItem('vita_jefe_squad', pick);
            } catch (e) {
                console.error('JefeDashboard fetch error:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [token]);

    const handleSquadChange = (name: string) => {
        setSelectedSquad(name);
        setDropOpen(false);
        setSelectedTicket(null);
        localStorage.setItem('vita_jefe_squad', name);
    };

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
            setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: next } : t));
            if (selectedTicket?.id === ticket.id) setSelectedTicket(p => p ? { ...p, status: next } : null);
        } finally {
            setUpdatingId(null);
        }
    };

    // Derived
    const squadTickets = useMemo(() => tickets.filter(t => t.squad_name === selectedSquad), [tickets, selectedSquad]);
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
    const selectedSquadObj = squads.find(s => s.name === selectedSquad);

    // ── Leaflet Map ────────────────────────────────────────────────────────────
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const layerGroup = useRef<L.FeatureGroup | null>(null);
    const [mapReady, setMapReady] = useState(false);

    // Initialize map once
    useEffect(() => {
        if (mapInstance.current || !mapRef.current) return;
        const map = L.map(mapRef.current, { zoomControl: true }).setView([-33.393, -70.58], 14);
        mapInstance.current = map;
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© CARTO', subdomains: 'abcd', maxZoom: 20,
        }).addTo(map);
        layerGroup.current = L.featureGroup().addTo(map);
        setMapReady(true);
        return () => { map.remove(); mapInstance.current = null; };
    }, []);

    // Update markers when tickets change
    useEffect(() => {
        if (!mapReady || !layerGroup.current) return;
        const group = layerGroup.current;
        group.clearLayers();
        const pts: [number, number][] = [];
        activeTickets.forEach((t, i) => {
            if (!t.lat || !t.lon) return;
            pts.push([t.lat, t.lon]);
            const color = URGENCY_DOT[t.urgency_level] || '#2596be';
            const sz = i === 0 ? 36 : 28;
            const html = `<div style="width:${sz}px;height:${sz}px;background:${color};border-radius:50%;border:${i === 0 ? 4 : 2.5}px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${i === 0 ? 14 : 11}px">${i + 1}</div>`;
            L.marker([t.lat, t.lon], {
                icon: L.divIcon({ html, className: '', iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] }),
            }).bindPopup(`<b>#${i + 1} ${t.title}</b><br>Urgencia: ${t.urgency_level}`).addTo(group);
        });
        if (pts.length > 1) L.polyline(pts, { color: '#1e293b', weight: 3, opacity: 0.45, dashArray: '8,6' }).addTo(group);
        if (pts.length > 0 && mapInstance.current) mapInstance.current.fitBounds(L.latLngBounds(pts), { padding: [50, 50] });
    }, [activeTickets, mapReady]);

    // ── Render ─────────────────────────────────────────────────────────────────
    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', border: '2.5px solid #2596be', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', marginRight: 10 }} />
            <span style={{ fontSize: 14, color: '#94a3b8' }}>Cargando operaciones…</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const cardStyle = { background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', border: '1px solid rgba(37,150,190,0.1)', borderRadius: 16, boxShadow: '0 4px 20px rgba(37,150,190,0.06)' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Header row ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: 0 }}>Panel de Operaciones</h1>
                    <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>
                        {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>

                {/* Squad dropdown */}
                <div ref={dropRef} style={{ position: 'relative', zIndex: 1000 }}>
                    <button
                        onClick={() => setDropOpen(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 12, cursor: 'pointer', ...cardStyle, border: '1px solid rgba(37,150,190,0.2)' }}
                    >
                        <Briefcase size={14} style={{ color: '#2596be', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                            {selectedSquad || 'Seleccionar cuadrilla'}
                        </span>
                        {selectedSquadObj && (
                            <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, background: 'rgba(37,150,190,0.1)', color: '#2596be' }}>
                                {selectedSquadObj.area_name}
                            </span>
                        )}
                        <ChevronDown size={13} style={{ color: '#94a3b8', transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                    </button>

                    {dropOpen && squads.length > 0 && (
                        <div style={{
                            position: 'absolute', right: 0, top: 'calc(100% + 6px)', minWidth: 240,
                            background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(37,150,190,0.12)', borderRadius: 12,
                            boxShadow: '0 12px 40px rgba(37,150,190,0.15)', padding: 6,
                        }}>
                            {squads.map(s => (
                                <button key={s.id} onClick={() => handleSquadChange(s.name)} style={{
                                    width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8,
                                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: s.name === selectedSquad ? 'rgba(37,150,190,0.08)' : 'transparent',
                                    color: s.name === selectedSquad ? '#2596be' : '#1e293b',
                                }}
                                    onMouseEnter={e => { if (s.name !== selectedSquad) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,150,190,0.04)'; }}
                                    onMouseLeave={e => { if (s.name !== selectedSquad) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                                >
                                    <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{s.area_name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── KPIs ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                <KPI icon={<Briefcase size={17} />} label="Tareas activas" value={activeTickets.length} accent="#2596be" sub={filterToday ? 'solo hoy' : 'total'} />
                <KPI icon={<CheckCircle2 size={17} />} label="Resueltas hoy" value={resolvedToday} accent="#7a8504"
                    sub={todayTotal > 0 ? `${Math.round((resolvedToday / todayTotal) * 100)}% del día` : undefined} />
                <KPI icon={<Clock size={17} />} label="Tiempo medio res." value={avgTime} accent="#7c3aed" sub="tickets resueltos" />
                <KPI icon={<TrendingUp size={17} />} label="Score promedio" value={avgScore} accent="#b82c87" sub="prioridad IA" />
            </div>

            {/* ── Grid: lista + mapa ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 16, alignItems: 'start' }}>

                {/* Lista de tickets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Filtro */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                            <MapPin size={14} style={{ color: '#2596be' }} /> Orden de ruta
                        </h2>
                        <button onClick={() => setFilterToday(v => !v)} style={{
                            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, cursor: 'pointer', fontSize: 11.5, fontWeight: 500,
                            background: filterToday ? 'rgba(37,150,190,0.1)' : 'rgba(255,255,255,0.7)',
                            border: `1px solid ${filterToday ? 'rgba(37,150,190,0.3)' : 'rgba(37,150,190,0.15)'}`,
                            color: filterToday ? '#2596be' : '#64748b',
                        }}>
                            <Filter size={11} /> {filterToday ? 'Solo hoy' : 'Todos'}
                        </button>
                    </div>

                    {activeTickets.length === 0 ? (
                        <div style={{ ...cardStyle, padding: '32px 16px', textAlign: 'center' }}>
                            <CheckCircle2 size={26} style={{ color: '#7a8504', margin: '0 auto 8px' }} />
                            <p style={{ fontSize: 13, color: '#94a3b8' }}>{filterToday ? 'Sin tareas para hoy 🎉' : 'No hay tareas pendientes'}</p>
                        </div>
                    ) : (
                        activeTickets.map((t, i) => {
                            const isSelect = selectedTicket?.id === t.id;
                            const statusIdx = STATUS_FLOW.indexOf(t.status);
                            const canAdv = statusIdx >= 0 && statusIdx < STATUS_FLOW.length - 1;
                            return (
                                <div key={t.id} onClick={() => setSelectedTicket(isSelect ? null : t)}
                                    style={{ ...cardStyle, padding: 14, cursor: 'pointer', borderColor: isSelect ? 'rgba(37,150,190,0.4)' : 'rgba(37,150,190,0.1)', boxShadow: isSelect ? '0 0 0 3px rgba(37,150,190,0.1)' : cardStyle.boxShadow }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? '#b82c87' : i === 1 ? '#f59e0b' : '#2596be', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                                                <Badge color={(S_COLORS[t.status] ?? S_COLORS.Cerrado) as [string, string, string]} label={t.status} />
                                                <Badge color={(U_COLORS[t.urgency_level] ?? U_COLORS.Baja) as [string, string, string]} label={t.urgency_level} />
                                            </div>
                                            <p style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.title}</p>
                                            <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{t.area_name}</p>
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#2596be', fontFamily: 'monospace', flexShrink: 0 }}>{t.priority_score}%</span>
                                    </div>

                                    {isSelect && (
                                        <div onClick={e => e.stopPropagation()} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(37,150,190,0.1)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.5, margin: 0 }}>{t.description}</p>
                                            {/* Barra de progreso */}
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                {STATUS_FLOW.map((st, si) => (
                                                    <div key={st} style={{ flex: 1, height: 4, borderRadius: 2, background: si <= statusIdx ? '#2596be' : 'rgba(0,0,0,0.08)' }} title={st} />
                                                ))}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                {STATUS_FLOW.map(st => <span key={st} style={{ fontSize: 10, color: '#94a3b8' }}>{st}</span>)}
                                            </div>
                                            {canAdv && (
                                                <button onClick={() => advanceStatus(t)} disabled={updatingId === t.id} style={{
                                                    width: '100%', padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                                                    background: updatingId === t.id ? '#e2e8f0' : 'linear-gradient(135deg, #2596be 0%, #1a7fa0 100%)',
                                                    color: updatingId === t.id ? '#94a3b8' : '#fff',
                                                    boxShadow: updatingId === t.id ? 'none' : '0 3px 10px rgba(37,150,190,0.3)',
                                                }}>
                                                    {updatingId === t.id ? 'Actualizando…' : `Avanzar → ${STATUS_FLOW[statusIdx + 1]}`}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Mapa */}
                <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden', height: 560 }}>
                    {/* Overlay título */}
                    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 500, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(37,150,190,0.15)', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                        <Activity size={12} style={{ color: '#2596be' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>Mapa de operaciones</span>
                        {activeTickets.filter(t => t.lat && t.lon).length > 0 && (
                            <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 5, background: 'rgba(37,150,190,0.1)', color: '#2596be' }}>{activeTickets.filter(t => t.lat && t.lon).length} pts</span>
                        )}
                    </div>

                    {/* Leyenda */}
                    <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 500, display: 'flex', alignItems: 'center', gap: 12, padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(37,150,190,0.1)' }}>
                        {[['Alta', '#b82c87'], ['Media', '#f59e0b'], ['Baja', '#2596be']].map(([lb, c]) => (
                            <span key={lb} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                                <span style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />{lb}
                            </span>
                        ))}
                    </div>

                    {/* Sin coords */}
                    {activeTickets.filter(t => t.lat && t.lon).length === 0 && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 400, pointerEvents: 'none' }}>
                            <AlertTriangle size={22} style={{ color: '#cbd5e1', marginBottom: 8 }} />
                            <p style={{ fontSize: 12, color: '#94a3b8' }}>Sin coordenadas disponibles para trazar ruta</p>
                        </div>
                    )}

                    {/* Map container — explicit px height, Leaflet needs this */}
                    <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
                </div>
            </div>
        </div>
    );
}
