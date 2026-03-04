/**
 * Dashboard — Panel principal del operador Vita360
 * Basado en vita360-main con estética glassmorphism Vitacura
 */

import { MapPin, FileQuestion, ChevronDown, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAuth, API_URL } from '../../context/AuthContext';
import { useFleetStream } from '../../hooks/useFleetStream';
import type { FleetVehicle } from '../../hooks/useFleetStream';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Ticket {
    id: number; title: string; description: string; status: string;
    urgency_level: string; priority_score: number; area_name: string;
    squad_name: string | null; assigned_to: string | null; created_at: string;
    lat?: number | null; lon?: number | null; _urgency_score?: number;
    evidences?: { image_url: string; description?: string; created_at: string }[];
}
interface DashboardStats {
    total_tickets: number; tickets_by_status: Record<string, number>;
    avg_response_time: string; tickets_at_risk: number;
}
type SortColumn = 'priority' | 'date' | 'status' | 'area' | 'id' | 'title';
type DatePreset = 'all' | 'hour' | 'today' | '7d' | '30d' | 'custom';
interface DateRange { preset: DatePreset; from: Date | null; to: Date | null; }

const STATUS_LIST = ['Recibido', 'Asignado', 'En Gestión', 'Resuelto', 'Cerrado'];

// ── Color helpers con paleta Vitacura ─────────────────────────────────────────
const statusColor = (s: string) => {
    switch (s?.toLowerCase()) {
        case 'resuelto': return { bg: 'rgba(192,207,5,0.12)', text: '#7a8504', border: 'rgba(192,207,5,0.3)' };
        case 'recibido': return { bg: 'rgba(37,150,190,0.1)', text: '#2596be', border: 'rgba(37,150,190,0.25)' };
        case 'asignado': return { bg: 'rgba(139,92,246,0.1)', text: '#7c3aed', border: 'rgba(139,92,246,0.25)' };
        case 'en gestión': return { bg: 'rgba(245,158,11,0.1)', text: '#b45309', border: 'rgba(245,158,11,0.25)' };
        default: return { bg: 'rgba(100,116,139,0.1)', text: '#475569', border: 'rgba(100,116,139,0.2)' };
    }
};
const urgencyColor = (u: string) => {
    switch (u?.toLowerCase()) {
        case 'alta': return { bg: 'rgba(184,44,135,0.08)', text: '#b82c87', border: 'rgba(184,44,135,0.25)' };
        case 'media': return { bg: 'rgba(245,158,11,0.08)', text: '#b45309', border: 'rgba(245,158,11,0.25)' };
        default: return { bg: 'rgba(37,150,190,0.08)', text: '#2596be', border: 'rgba(37,150,190,0.2)' };
    }
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ title, value, accent, progress }: { title: string; value: string | number; accent: string; progress: number }) {
    return (
        <div className="flex-1 min-w-[160px] rounded-2xl border p-5 transition-all duration-300"
            style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', borderColor: 'rgba(37,150,190,0.1)', boxShadow: '0 4px 20px rgba(37,150,190,0.07)' }}>
            <div className="text-[12px] mb-2" style={{ color: '#94a3b8' }}>{title}</div>
            <div className="text-[34px] font-semibold mb-3" style={{ color: accent }}>{value}</div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                <div className="h-full rounded-full" style={{ width: `${progress}%`, background: accent }} />
            </div>
        </div>
    );
}

// ── MultiSelect ───────────────────────────────────────────────────────────────
function MultiSelect({ id, openId, setOpenId, label, options, selected, onChange }: {
    id: string; openId: string | null; setOpenId: (id: string | null) => void;
    label: string; options: string[]; selected: string[];
    onChange: (fn: (prev: string[]) => string[]) => void;
}) {
    const open = openId === id;
    const ref = useRef<HTMLDivElement>(null);
    const n = selected.length;
    useEffect(() => {
        const h = (e: MouseEvent) => { if (open && ref.current && !ref.current.contains(e.target as Node)) setOpenId(null); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open]);
    return (
        <div className="relative" ref={ref}>
            <button type="button" onClick={() => setOpenId(open ? null : id)}
                className="px-3 py-1.5 rounded-full border text-[12px] inline-flex items-center gap-1.5 transition-colors"
                style={{ background: n > 0 ? 'rgba(37,150,190,0.08)' : 'rgba(255,255,255,0.7)', borderColor: n > 0 ? 'rgba(37,150,190,0.3)' : 'rgba(37,150,190,0.15)', color: n > 0 ? '#2596be' : '#64748b' }}>
                {label}
                {n > 0 && <span className="rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold" style={{ background: '#2596be', color: 'white' }}>{n}</span>}
                <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute left-0 mt-1.5 min-w-[165px] rounded-xl shadow-xl z-50 p-1.5 space-y-0.5"
                    style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(37,150,190,0.12)' }}>
                    {options.map((opt) => {
                        const checked = selected.includes(opt);
                        return (
                            <label key={opt} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer text-[12.5px] transition-colors"
                                style={{ background: checked ? 'rgba(37,150,190,0.08)' : 'transparent', color: checked ? '#2596be' : '#1e293b' }}>
                                <div className="w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0"
                                    style={{ background: checked ? '#2596be' : 'transparent', borderColor: checked ? '#2596be' : 'rgba(0,0,0,0.2)' }}>
                                    {checked && <svg viewBox="0 0 10 8" width="8" height="8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                </div>
                                {opt}
                                <input type="checkbox" className="sr-only" checked={checked} onChange={() => onChange(prev => checked ? prev.filter(x => x !== opt) : [...prev, opt])} />
                            </label>
                        );
                    })}
                    {n > 0 && <>
                        <div className="border-t mx-1 my-1" style={{ borderColor: 'rgba(37,150,190,0.1)' }} />
                        <button type="button" onClick={() => { onChange(() => []); setOpenId(null); }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11.5px] flex items-center gap-1.5"
                            style={{ color: '#94a3b8' }}><X size={11} /> Limpiar</button>
                    </>}
                </div>
            )}
        </div>
    );
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

function MiniCalendar({ id, openId, setOpenId, dateRange, setDateRange }: {
    id: string; openId: string | null; setOpenId: (id: string | null) => void;
    dateRange: DateRange; setDateRange: (r: DateRange) => void;
}) {
    const open = openId === id;
    const ref = useRef<HTMLDivElement>(null);
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [selectingFrom, setSelectingFrom] = useState(true);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (open && ref.current && !ref.current.contains(e.target as Node)) setOpenId(null); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open]);
    const applyPreset = (preset: DatePreset) => {
        const now = new Date();
        if (preset === 'all') { setDateRange({ preset: 'all', from: null, to: null }); setOpenId(null); return; }
        if (preset === 'hour') { setDateRange({ preset: 'hour', from: new Date(now.getTime() - 3600000), to: now }); setOpenId(null); return; }
        if (preset === 'today') { const s = new Date(now.getFullYear(), now.getMonth(), now.getDate()); setDateRange({ preset: 'today', from: s, to: now }); setOpenId(null); return; }
        if (preset === '7d') { setDateRange({ preset: '7d', from: new Date(now.getTime() - 7 * 86400000), to: now }); setOpenId(null); return; }
        if (preset === '30d') { setDateRange({ preset: '30d', from: new Date(now.getTime() - 30 * 86400000), to: now }); setOpenId(null); return; }
        setDateRange({ preset: 'custom', from: null, to: null }); setSelectingFrom(true);
    };
    const handleDayClick = (day: Date) => {
        if (selectingFrom) { setDateRange({ preset: 'custom', from: day, to: null }); setSelectingFrom(false); }
        else {
            const from = dateRange.from!;
            setDateRange({ preset: 'custom', from: day < from ? day : from, to: day < from ? from : day });
            setSelectingFrom(true); setOpenId(null);
        }
    };
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDay = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
    const days: (Date | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(calYear, calMonth, i + 1))];
    const isSame = (a: Date | null, b: Date | null) => a && b && a.toDateString() === b.toDateString();
    const inRange = (d: Date | null) => d && dateRange.from && dateRange.to && d >= dateRange.from && d <= dateRange.to;
    const presetLabel: Record<DatePreset, string> = { all: 'Todas', hour: 'Última hora', today: 'Hoy', '7d': '7 días', '30d': '30 días', custom: 'Personalizado' };
    const label = dateRange.preset === 'custom' && dateRange.from
        ? `${dateRange.from.toLocaleDateString('es-CL')}${dateRange.to ? ` – ${dateRange.to.toLocaleDateString('es-CL')}` : ' …'}`
        : presetLabel[dateRange.preset];
    return (
        <div className="relative" ref={ref}>
            <button type="button" onClick={() => setOpenId(open ? null : id)}
                className="px-3 py-1.5 rounded-full border text-[12px] inline-flex items-center gap-1.5 transition-colors"
                style={{ background: dateRange.preset !== 'all' ? 'rgba(37,150,190,0.08)' : 'rgba(255,255,255,0.7)', borderColor: dateRange.preset !== 'all' ? 'rgba(37,150,190,0.3)' : 'rgba(37,150,190,0.15)', color: dateRange.preset !== 'all' ? '#2596be' : '#64748b' }}>
                <Calendar size={12} /><span>{label}</span>
                <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute right-0 mt-1.5 w-[260px] rounded-xl shadow-xl z-50 p-3"
                    style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(37,150,190,0.12)' }}>
                    <div className="grid grid-cols-3 gap-1 mb-3">
                        {(['hour', 'today', '7d', '30d', 'all'] as DatePreset[]).map(p => (
                            <button key={p} type="button" onClick={() => applyPreset(p)}
                                className="px-2 py-1 rounded-lg text-[11px] border transition-colors text-center"
                                style={{ background: dateRange.preset === p ? 'rgba(37,150,190,0.1)' : 'transparent', borderColor: dateRange.preset === p ? '#2596be' : 'rgba(0,0,0,0.1)', color: dateRange.preset === p ? '#2596be' : '#64748b' }}>
                                {presetLabel[p]}
                            </button>
                        ))}
                    </div>
                    <div className="border-t pt-3" style={{ borderColor: 'rgba(37,150,190,0.1)' }}>
                        <div className="flex items-center justify-between mb-2">
                            <button type="button" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} className="p-1 rounded-lg hover:bg-gray-100"><ChevronLeft size={14} /></button>
                            <span className="text-[12.5px] font-medium" style={{ color: '#1e293b' }}>{MONTHS_ES[calMonth]} {calYear}</span>
                            <button type="button" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} className="p-1 rounded-lg hover:bg-gray-100"><ChevronRight size={14} /></button>
                        </div>
                        <div className="grid grid-cols-7 gap-0.5">
                            {DAYS_ES.map(d => <div key={d} className="text-[10px] text-center py-1 font-medium" style={{ color: '#94a3b8' }}>{d}</div>)}
                            {days.map((d, i) => (
                                <div key={i} className="aspect-square">
                                    {d ? <button type="button" onClick={() => handleDayClick(d)}
                                        className="w-full h-full rounded-lg text-[11.5px] transition-colors"
                                        style={{ background: isSame(d, dateRange.from) || isSame(d, dateRange.to) ? '#2596be' : inRange(d) ? 'rgba(37,150,190,0.1)' : 'transparent', color: isSame(d, dateRange.from) || isSame(d, dateRange.to) ? 'white' : inRange(d) ? '#2596be' : '#1e293b' }}>
                                        {d.getDate()}
                                    </button> : <div />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Leaflet map icons ─────────────────────────────────────────────────────────
function makePatrolIcon() {
    return L.divIcon({ html: `<div style="width:26px;height:26px;border-radius:50%;background:#FBBF24;border:2.5px solid #1E40AF;display:flex;align-items:center;justify-content:center;color:#1E40AF;font-weight:700;font-size:12px;font-family:sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35)">P</div>`, className: '', iconSize: [26, 26] as [number, number], iconAnchor: [13, 13] as [number, number], popupAnchor: [0, -16] as [number, number] });
}
function makeSuspectIcon() {
    return L.divIcon({ html: `<div style="width:26px;height:26px;border-radius:50%;background:#EF4444;border:2.5px solid #991B1B;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;font-family:sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35)">S</div>`, className: '', iconSize: [26, 26] as [number, number], iconAnchor: [13, 13] as [number, number], popupAnchor: [0, -16] as [number, number] });
}

// ── Map Component ─────────────────────────────────────────────────────────────
function MapComponent({ tickets, fleetVehicles, fleetTick, selectedStatuses, setSelectedStatuses, selectedAreas, setSelectedAreas, dateRange, setDateRange }: {
    tickets: Ticket[]; fleetVehicles: FleetVehicle[]; fleetTick: number;
    selectedStatuses: string[]; setSelectedStatuses: (fn: (prev: string[]) => string[]) => void;
    selectedAreas: string[]; setSelectedAreas: (fn: (prev: string[]) => string[]) => void;
    dateRange: DateRange; setDateRange: (r: DateRange) => void;
}) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const leafletReady = useRef(false);
    const fleetMarkers = useRef<Map<string, any>>(new Map());
    const suspectTrail = useRef<[number, number][]>([]);
    const suspectPolyline = useRef<any>(null);
    const [showVehicles, setShowVehicles] = useState(true);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const allAreas = useMemo(() => Array.from(new Set(tickets.map(t => t.area_name).filter(Boolean))).sort(), [tickets]);
    const suspectVisible = fleetVehicles.some(v => v.type === 'suspect');
    const patrolCount = fleetVehicles.filter(v => v.type === 'patrol').length;

    // Fleet markers update
    useEffect(() => {
        if (!leafletReady.current) return;
        const map = mapInstance.current; if (!map) return;
        if (!showVehicles) { for (const m of fleetMarkers.current.values()) map.removeLayer(m); fleetMarkers.current.clear(); suspectTrail.current = []; if (suspectPolyline.current) { map.removeLayer(suspectPolyline.current); suspectPolyline.current = null; } return; }
        const seenIds = new Set<string>();
        for (const v of fleetVehicles) {
            seenIds.add(v.id);
            const popup = `<div style="font-family:system-ui;min-width:170px;padding:4px 0"><div style="font-size:13px;font-weight:600;color:#1A2332;margin-bottom:4px">${v.id}</div><div style="font-size:12px;color:#6B7280;margin-bottom:2px">Estado: <b>${v.status}</b></div><div style="font-size:12px;color:#6B7280">Área: ${v.area}</div></div>`;
            if (fleetMarkers.current.has(v.id)) { fleetMarkers.current.get(v.id).setLatLng([v.lat, v.lng]); fleetMarkers.current.get(v.id).getPopup()?.setContent(popup); }
            else { fleetMarkers.current.set(v.id, L.marker([v.lat, v.lng], { icon: v.type === 'suspect' ? makeSuspectIcon() : makePatrolIcon() }).bindPopup(popup).addTo(map)); }
            if (v.type === 'suspect') {
                suspectTrail.current.push([v.lat, v.lng]);
                if (suspectTrail.current.length > 40) suspectTrail.current.shift();
                if (suspectPolyline.current) suspectPolyline.current.setLatLngs(suspectTrail.current);
                else suspectPolyline.current = L.polyline(suspectTrail.current, { color: '#EF4444', weight: 2, opacity: 0.45, dashArray: '4 4' }).addTo(map);
            }
        }
        for (const [id, m] of fleetMarkers.current) { if (!seenIds.has(id)) { map.removeLayer(m); fleetMarkers.current.delete(id); } }
    }, [fleetVehicles, showVehicles]);

    // Init Leaflet
    useEffect(() => {
        if (mapInstance.current || !mapRef.current) return;
        const map = L.map(mapRef.current).setView([-33.383, -70.58], 13);
        mapInstance.current = map; leafletReady.current = true;
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '© CARTO', subdomains: 'abcd', maxZoom: 20 }).addTo(map);
        const urgencyColors: Record<string, string> = { Alta: '#b82c87', Media: '#f59e0b', Baja: '#2596be' };
        tickets.forEach(t => {
            if (!t.lat || !t.lon) return;
            const color = urgencyColors[t.urgency_level] || '#2596be';
            L.marker([t.lat, t.lon], { icon: L.divIcon({ html: `<div style="width:22px;height:22px;background:${color};border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,.2)"></div>`, className: '', iconSize: [22, 22] as [number, number], iconAnchor: [11, 11] as [number, number] }) })
                .bindPopup(`<div style="font-family:system-ui;font-size:13px;width:210px"><div style="font-weight:600;margin-bottom:4px">${t.title}</div><div style="color:#6B7280;font-size:12px">${t.area_name || 'Sin área'} · ${t.urgency_level || '—'}</div></div>`, { maxWidth: 240 }).addTo(map);
        });
        return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; leafletReady.current = false; fleetMarkers.current.clear(); suspectTrail.current = []; suspectPolyline.current = null; } };
    }, [tickets]);

    return (
        <div className="rounded-2xl border mb-6 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', borderColor: 'rgba(37,150,190,0.1)', boxShadow: '0 4px 24px rgba(37,150,190,0.08)' }}>
            <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #2596be 0%, #c0cf05 50%, #b82c87 100%)' }} />
            <div className="relative z-[1001] px-5 py-3 border-b" style={{ borderColor: 'rgba(37,150,190,0.08)' }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(37,150,190,0.1)' }}><MapPin size={16} style={{ color: '#2596be' }} /></span>
                        <span className="text-[14px] font-semibold" style={{ color: '#1e293b' }}>VITwin — Mapa en tiempo real</span>
                        {fleetTick > 0 && <span className="px-2 py-0.5 rounded-md text-[11px] font-mono" style={{ background: 'rgba(0,0,0,0.05)', color: '#94a3b8' }}>tick #{fleetTick}</span>}
                        {patrolCount > 0 && <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border" style={{ background: 'rgba(251,191,36,0.1)', color: '#b45309', borderColor: 'rgba(251,191,36,0.3)' }}>{patrolCount} patrullas</span>}
                        {suspectVisible && <span className="px-2 py-0.5 rounded-full text-[11px] font-medium border flex items-center gap-1" style={{ background: 'rgba(239,68,68,0.05)', color: '#dc2626', borderColor: 'rgba(239,68,68,0.2)' }}><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />Sospechoso</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <MultiSelect id="ms-status" openId={openDropdown} setOpenId={setOpenDropdown} label="Estado" options={STATUS_LIST} selected={selectedStatuses} onChange={setSelectedStatuses} />
                        <MultiSelect id="ms-area" openId={openDropdown} setOpenId={setOpenDropdown} label="Área" options={allAreas} selected={selectedAreas} onChange={setSelectedAreas} />
                        <MiniCalendar id="mc-date" openId={openDropdown} setOpenId={setOpenDropdown} dateRange={dateRange} setDateRange={setDateRange} />
                        <button type="button" onClick={() => setShowVehicles(v => !v)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px]"
                            style={{ background: showVehicles ? 'rgba(37,150,190,0.08)' : 'rgba(255,255,255,0.7)', borderColor: 'rgba(37,150,190,0.2)', color: showVehicles ? '#2596be' : '#64748b' }}>
                            Vehículos
                            <div className="relative w-8 h-4 rounded-full transition-colors" style={{ background: showVehicles ? '#2596be' : 'rgba(0,0,0,0.15)' }}>
                                <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform" style={{ transform: showVehicles ? 'translateX(17px)' : 'translateX(2px)' }} />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
            <div ref={mapRef} style={{ width: '100%', height: 400 }} />
            <div className="flex gap-4 px-5 py-2 text-[11.5px]" style={{ color: '#94a3b8' }}>
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full inline-block" style={{ background: '#FBBF24', border: '2px solid #1E40AF' }} />Patrulla</span>
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full inline-block bg-red-500 border-2 border-red-800" />Sospechoso</span>
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full inline-block" style={{ background: '#b82c87' }} />Alta urgencia</span>
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full inline-block" style={{ background: '#f59e0b' }} />Media</span>
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-full inline-block" style={{ background: '#2596be' }} />Baja</span>
            </div>
        </div>
    );
}

// ── Ticket Detail Panel ───────────────────────────────────────────────────────
function TicketDetailPanel({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
    const ORDER: Record<string, number> = { Recibido: 0, Asignado: 1, 'En Gestión': 2, Resuelto: 3, Cerrado: 4 };
    const currentIdx = ORDER[ticket.status] ?? 0;
    const sc = statusColor(ticket.status); const uc = urgencyColor(ticket.urgency_level);
    return (
        <div className="rounded-2xl border p-5 sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto"
            style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderColor: 'rgba(37,150,190,0.12)', boxShadow: '0 8px 32px rgba(37,150,190,0.1)' }}>
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #2596be, #c0cf05, #b82c87)' }} />
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11.5px] font-mono" style={{ color: '#94a3b8' }}>#{ticket.id}</span>
                    <span className="px-2 py-0.5 rounded-md text-[11.5px] font-medium border" style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>{ticket.status}</span>
                    {ticket.urgency_level && <span className="px-2 py-0.5 rounded-md text-[11.5px] font-medium border" style={{ background: uc.bg, color: uc.text, borderColor: uc.border }}>{ticket.urgency_level}</span>}
                </div>
                <button type="button" onClick={onClose} className="p-1 rounded-md" style={{ color: '#94a3b8' }}><X size={15} /></button>
            </div>
            <h2 className="text-[14.5px] font-semibold mb-1.5" style={{ color: '#1e293b' }}>{ticket.title}</h2>
            {ticket.area_name && <span className="inline-block mb-3 px-2 py-0.5 rounded-md text-[11.5px] border" style={{ background: 'rgba(37,150,190,0.06)', color: '#64748b', borderColor: 'rgba(37,150,190,0.15)' }}>{ticket.area_name}</span>}
            <p className="text-[12.5px] whitespace-pre-line mb-4 leading-relaxed" style={{ color: '#64748b' }}>{ticket.description}</p>
            <div className="grid grid-cols-2 gap-3 mb-4 text-[12.5px]">
                <div><div className="text-[10.5px] uppercase tracking-wide mb-0.5" style={{ color: '#94a3b8' }}>Creado</div><div style={{ color: '#1e293b' }}>{new Date(ticket.created_at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></div>
                {ticket.assigned_to && <div><div className="text-[10.5px] uppercase tracking-wide mb-0.5" style={{ color: '#94a3b8' }}>Equipo</div><div style={{ color: '#1e293b' }}>{ticket.assigned_to}</div></div>}
                {typeof ticket._urgency_score === 'number' && <div><div className="text-[10.5px] uppercase tracking-wide mb-0.5" style={{ color: '#94a3b8' }}>Score IA</div><div className="font-mono" style={{ color: '#2596be' }}>{ticket._urgency_score}%</div></div>}
            </div>
            <div className="border-t pt-4 mb-4" style={{ borderColor: 'rgba(37,150,190,0.08)' }}>
                <div className="text-[10.5px] uppercase tracking-wide mb-3" style={{ color: '#94a3b8' }}>Línea de tiempo</div>
                <div className="space-y-2">
                    {STATUS_LIST.map((step, idx) => {
                        const done = idx <= currentIdx, current = idx === currentIdx;
                        return (
                            <div key={step} className="flex items-center gap-2.5 text-[12px]">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: current ? '#2596be' : done ? '#c0cf05' : 'rgba(0,0,0,0.12)', boxShadow: current ? '0 0 0 3px rgba(37,150,190,0.2)' : 'none' }} />
                                <span style={{ color: done ? '#1e293b' : '#94a3b8' }}>{step}</span>
                                {current && <span className="text-[10.5px] font-medium" style={{ color: '#2596be' }}>← actual</span>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function Dashboard() {
    const { token } = useAuth();
    const fleetData = useFleetStream();
    const fleetVehicles = fleetData?.vehicles ?? [];
    const currentTick = fleetData?.tick ?? 0;

    const [sortColumn, setSortColumn] = useState<SortColumn>('priority');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
    const [selectedUrgencies, setSelectedUrgencies] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<DateRange>({ preset: 'all', from: null, to: null });
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const pageSize = 8;

    useEffect(() => { if (token) fetchData(); }, [token]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                const enriched: Ticket[] = data.map((t: Ticket) => ({ ...t, area_name: t.area_name || 'Atención General', _urgency_score: t.priority_score ?? 0 }));
                setTickets(enriched); setPage(1);
                setStats({ total_tickets: enriched.length, tickets_by_status: enriched.reduce((acc: Record<string, number>, t: Ticket) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {}), avg_response_time: '2h 15m', tickets_at_risk: enriched.filter((t: Ticket) => t.status !== 'Resuelto' && t.urgency_level === 'Alta').length });
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const passesDateFilter = useCallback((created_at: string) => {
        const { preset, from, to } = dateRange;
        if (preset === 'all') return true;
        const t = new Date(created_at).getTime(), now = Date.now();
        if (preset === 'hour') return t >= now - 3600000;
        if (preset === 'today') { const d = new Date(); return t >= new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
        if (preset === '7d') return t >= now - 7 * 86400000;
        if (preset === '30d') return t >= now - 30 * 86400000;
        if (preset === 'custom') { if (from && t < from.getTime()) return false; if (to && t > to.getTime() + 86400000) return false; return true; }
        return true;
    }, [dateRange]);

    const filteredAndSorted = useMemo(() => {
        const f = tickets.filter(c => {
            if (selectedStatuses.length && !selectedStatuses.includes(c.status)) return false;
            if (selectedAreas.length && !selectedAreas.includes(c.area_name)) return false;
            if (selectedUrgencies.length && !selectedUrgencies.includes(c.urgency_level)) return false;
            if (!passesDateFilter(c.created_at)) return false;
            return true;
        });
        f.sort((a, b) => {
            const dir = sortDirection === 'asc' ? 1 : -1;
            switch (sortColumn) {
                case 'priority': return ((a._urgency_score ?? 0) - (b._urgency_score ?? 0)) * -dir;
                case 'date': return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * -dir;
                case 'status': return a.status.localeCompare(b.status) * dir;
                case 'area': return (a.area_name || '').localeCompare(b.area_name || '') * dir;
                case 'id': return (a.id - b.id) * dir;
                case 'title': return a.title.localeCompare(b.title) * dir;
                default: return 0;
            }
        });
        return f;
    }, [sortColumn, sortDirection, selectedStatuses, selectedAreas, selectedUrgencies, passesDateFilter, tickets]);

    const paginated = filteredAndSorted.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));

    if (loading) return (
        <div className="flex items-center justify-center py-16" style={{ color: '#94a3b8' }}>
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin mr-3" style={{ borderColor: '#2596be', borderTopColor: 'transparent' }} />
            Cargando dashboard…
        </div>
    );

    const kpiAccents = ['#1e293b', '#2596be', '#64748b', '#b82c87'];

    return (
        <div>
            {/* KPIs */}
            <div className="flex gap-4 mb-6 flex-wrap">
                <KPICard title="Total de Tickets" value={stats?.total_tickets || 0} accent={kpiAccents[0]} progress={100} />
                <div className="flex-1 min-w-[220px] rounded-2xl border p-5 transition-all duration-300"
                    style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', borderColor: 'rgba(37,150,190,0.1)', boxShadow: '0 4px 20px rgba(37,150,190,0.07)' }}>
                    <div className="text-[13px] font-medium mb-2" style={{ color: '#1e293b' }}>Distribución por estado</div>
                    <div className="space-y-1.5 text-[12px]">
                        {stats && Object.entries(stats.tickets_by_status).map(([status, count]) => {
                            const pct = stats.total_tickets ? Math.round((count / stats.total_tickets) * 100) : 0;
                            const sc = statusColor(status);
                            return (
                                <div key={status} className="flex items-center gap-2">
                                    <span className="w-24" style={{ color: '#64748b' }}>{status} {count}</span>
                                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: sc.text }} />
                                    </div>
                                    <span className="w-8 text-right text-[11px]" style={{ color: '#94a3b8' }}>{pct}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <KPICard title="Tiempo Promedio" value={stats?.avg_response_time || '—'} accent={kpiAccents[2]} progress={60} />
                <KPICard title="Tickets en Riesgo" value={stats?.tickets_at_risk || 0} accent={kpiAccents[3]} progress={35} />
            </div>

            {/* Mapa */}
            <MapComponent tickets={tickets} fleetVehicles={fleetVehicles} fleetTick={currentTick}
                selectedStatuses={selectedStatuses} setSelectedStatuses={setSelectedStatuses}
                selectedAreas={selectedAreas} setSelectedAreas={setSelectedAreas}
                dateRange={dateRange} setDateRange={setDateRange} />

            {/* Tabla + detalle */}
            <div className="flex gap-6 flex-col lg:flex-row">
                <div className="flex-1 min-w-0">
                    {/* Barra de controles */}
                    <div className="rounded-2xl border p-3 mb-4 flex items-center justify-between flex-wrap gap-3"
                        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', borderColor: 'rgba(37,150,190,0.1)', boxShadow: '0 4px 20px rgba(37,150,190,0.07)' }}>
                        <div className="flex items-center gap-3 flex-wrap text-[12.5px]" style={{ color: '#64748b' }}>
                            {filteredAndSorted.length > 0 && (
                                <span>Mostrando <strong style={{ color: '#1e293b' }}>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredAndSorted.length)}</strong> de <strong style={{ color: '#1e293b' }}>{filteredAndSorted.length}</strong></span>
                            )}
                            <div className="flex items-center gap-2">
                                <span>Urgencia:</span>
                                <div className="flex gap-1">
                                    {['Alta', 'Media', 'Baja'].map(level => (
                                        <button key={level} type="button"
                                            onClick={() => setSelectedUrgencies(prev => prev.includes(level) ? prev.filter(u => u !== level) : [...prev, level])}
                                            className="px-2 py-1 rounded-full border text-[11px] transition-colors"
                                            style={{ background: selectedUrgencies.includes(level) ? urgencyColor(level).bg : 'rgba(255,255,255,0.7)', borderColor: selectedUrgencies.includes(level) ? urgencyColor(level).border : 'rgba(0,0,0,0.1)', color: selectedUrgencies.includes(level) ? urgencyColor(level).text : '#64748b' }}>
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[12.5px]" style={{ color: '#64748b' }}>
                            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="px-2 py-1 border rounded-md disabled:opacity-40 transition-colors hover:bg-gray-50"
                                style={{ borderColor: 'rgba(37,150,190,0.15)' }}>◀</button>
                            <span>Pág {page} / {totalPages}</span>
                            <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                                className="px-2 py-1 border rounded-md disabled:opacity-40 transition-colors hover:bg-gray-50"
                                style={{ borderColor: 'rgba(37,150,190,0.15)' }}>▶</button>
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="rounded-2xl border overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', borderColor: 'rgba(37,150,190,0.1)', boxShadow: '0 4px 20px rgba(37,150,190,0.07)' }}>
                        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #2596be 0%, #c0cf05 50%, #b82c87 100%)' }} />
                        <table className="w-full">
                            <thead>
                                <tr style={{ background: 'rgba(37,150,190,0.04)', borderBottom: '1px solid rgba(37,150,190,0.08)' }}>
                                    {(['id', 'title', 'urgency', 'priority', 'area', 'status', 'date'] as const).map(col => {
                                        const labels: Record<string, string> = { id: 'ID', title: 'Título', urgency: 'Urgencia', priority: 'Prioridad', area: 'Área', status: 'Estado', date: 'Fecha' };
                                        const skeys: Partial<Record<string, SortColumn>> = { id: 'id', title: 'title', priority: 'priority', area: 'area', status: 'status', date: 'date' };
                                        const sk = skeys[col]; const sorted = sk && sortColumn === sk;
                                        return (
                                            <th key={col}
                                                onClick={() => { if (!sk) return; sortColumn === sk ? setSortDirection(d => d === 'asc' ? 'desc' : 'asc') : (setSortColumn(sk), setSortDirection('desc')); }}
                                                className={`text-left text-[12px] font-semibold px-4 py-3 ${sk ? 'cursor-pointer select-none' : ''}`}
                                                style={{ color: '#94a3b8' }}>
                                                {labels[col]}{sorted && <span className="text-[10px] ml-1">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0
                                    ? <tr><td colSpan={7} className="text-center py-8 text-[13px]" style={{ color: '#94a3b8' }}>No hay tickets para mostrar</td></tr>
                                    : paginated.map(caso => {
                                        const sc = statusColor(caso.status); const uc = urgencyColor(caso.urgency_level);
                                        const isSelected = selectedTicket?.id === caso.id;
                                        return (
                                            <tr key={caso.id} onClick={() => setSelectedTicket(isSelected ? null : caso)}
                                                className="border-b cursor-pointer transition-colors"
                                                style={{ borderColor: 'rgba(37,150,190,0.06)', background: isSelected ? 'rgba(37,150,190,0.05)' : 'transparent' }}
                                                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(37,150,190,0.02)'; }}
                                                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}>
                                                <td className="px-4 py-3"><span className="text-[13px] font-mono" style={{ color: '#2596be' }}>#{caso.id}</span></td>
                                                <td className="px-4 py-3"><span className="text-[13px] font-semibold" style={{ color: '#1e293b' }}>{caso.title}</span></td>
                                                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md text-[11.5px] font-medium border" style={{ background: uc.bg, color: uc.text, borderColor: uc.border }}>{caso.urgency_level || '—'}</span></td>
                                                <td className="px-4 py-3">{typeof caso._urgency_score === 'number' && <span className="font-mono text-[13px] font-medium" style={{ color: '#1e293b' }}>{caso._urgency_score}%</span>}</td>
                                                <td className="px-4 py-3 text-[13px]" style={{ color: '#64748b' }}>{caso.area_name || '—'}</td>
                                                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md text-[11.5px] font-medium border" style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>{caso.status}</span></td>
                                                <td className="px-4 py-3 text-[12px]" style={{ color: '#94a3b8' }}>{new Date(caso.created_at).toLocaleDateString('es-CL')}</td>
                                            </tr>
                                        );
                                    })
                                }
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Panel detalle */}
                <div className="w-full lg:w-[360px] flex-shrink-0">
                    {selectedTicket ? (
                        <TicketDetailPanel ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
                    ) : (
                        <div className="rounded-2xl border p-8 text-center sticky top-6"
                            style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', borderColor: 'rgba(37,150,190,0.1)' }}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(37,150,190,0.08)' }}>
                                <FileQuestion size={20} style={{ color: '#94a3b8' }} />
                            </div>
                            <p className="text-[13px]" style={{ color: '#94a3b8' }}>Selecciona un ticket para ver su detalle</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
