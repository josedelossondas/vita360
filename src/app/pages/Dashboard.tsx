import { MapPin, FileQuestion, ChevronDown, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAuth, API_URL } from '../../context/AuthContext';
import { useFleetStream, type FleetVehicle } from '../../hooks/useFleetStream';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  urgency_level: string;
  area_name: string;
  assigned_to: string | null;
  created_at: string;
  _urgency_score?: number;
  _priority_label?: string;
  evidences?: { image_url: string; description?: string; created_at: string }[];
}

interface DashboardStats {
  total_tickets: number;
  tickets_by_status: Record<string, number>;
  avg_response_time: string;
  tickets_at_risk: number;
}

type SortColumn = 'priority' | 'date' | 'status' | 'area' | 'id' | 'title';
type DatePreset = 'all' | 'hour' | 'today' | '7d' | '30d' | 'custom';

interface DateRange {
  preset: DatePreset;
  from: Date | null;
  to: Date | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LIST = ['Recibido', 'Asignado', 'En Gestión', 'Resuelto', 'Cerrado'];

// ─────────────────────────────────────────────────────────────────────────────
// Color helpers
// ─────────────────────────────────────────────────────────────────────────────

const mapStatusToColor = (s: string) => {
  switch (s?.toLowerCase()) {
    case 'resuelto':   return 'bg-[#48946F]';
    case 'recibido':   return 'bg-[#306CBB]';
    case 'asignado':   return 'bg-[#7C3AED]';
    case 'en gestión': return 'bg-[#F2B23A]';
    case 'cerrado':    return 'bg-[#98A6B1]';
    default:           return 'bg-[#98A6B1]';
  }
};

const mapUrgencyToColor = (u: string) => {
  switch (u?.toLowerCase()) {
    case 'alta':  return 'bg-[#DA4F44]';
    case 'media': return 'bg-[#F2A23A]';
    case 'baja':  return 'bg-[#48946F]';
    default:      return 'bg-[#98A6B1]';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────────────────

function KPICard({ title, value, color, progress }: { title: string; value: string | number; color: string; progress: number }) {
  const big = title === 'Tiempo Promedio Respuesta';
  return (
    <div className="bg-white border border-[#E6EAF0] rounded-lg p-5 shadow-[0_2px_8px_rgba(16,24,40,0.06)] flex-1">
      <div className="text-[12px] text-[#6D7783] mb-2">{title}</div>
      <div className={`${big ? 'text-[30px]' : 'text-[36px]'} font-semibold mb-3 ${color === 'green' ? 'text-[#48946F]' : color === 'red' ? 'text-[#DA4F44]' : 'text-[#2F3A46]'}`}>{value}</div>
      <div className="w-full h-1.5 bg-[#E6EAF0] rounded-full overflow-hidden">
        <div className={`h-full ${color === 'green' ? 'bg-[#48946F]' : color === 'red' ? 'bg-[#DA4F44]' : color === 'orange' ? 'bg-[#F2A23A]' : 'bg-[#306CBB]'}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flip Switch
// ─────────────────────────────────────────────────────────────────────────────

function FlipSwitch({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E5E7EB] bg-white text-[12px] select-none hover:border-[#306CBB]/40 transition-colors">
      <span className={value ? 'text-[#306CBB] font-medium' : 'text-[#4B5563]'}>{label}</span>
      <div className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${value ? 'bg-[#306CBB]' : 'bg-[#D1D5DB]'}`}>
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-select dropdown — closes when another opens via openId
// ─────────────────────────────────────────────────────────────────────────────

function MultiSelect({ id, openId, setOpenId, label, options, selected, onChange }: {
  id: string;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  label: string;
  options: string[];
  selected: string[];
  onChange: (fn: (prev: string[]) => string[]) => void;
}) {
  const open = openId === id;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpenId(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const n = selected.length;

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpenId(open ? null : id)}
        className={`px-3 py-1.5 rounded-full border text-[12px] inline-flex items-center gap-1.5 transition-colors ${n > 0 ? 'border-[#306CBB] bg-[#EFF6FF] text-[#306CBB]' : 'border-[#E5E7EB] bg-white text-[#4B5563]'}`}>
        {label}
        {n > 0 && <span className="bg-[#306CBB] text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">{n}</span>}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 mt-1.5 min-w-[165px] bg-white border border-[#E5E7EB] rounded-xl shadow-xl z-50 p-1.5 space-y-0.5">
          {options.map(opt => {
            const checked = selected.includes(opt);
            return (
              <label key={opt} className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-[12.5px] ${checked ? 'bg-[#EFF6FF] text-[#306CBB]' : 'hover:bg-[#F9FAFB] text-[#374151]'}`}>
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-[#306CBB] border-[#306CBB]' : 'border-[#D1D5DB]'}`}>
                  {checked && <svg viewBox="0 0 10 8" width="8" height="8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                {opt}
              </label>
            );
          })}
          {n > 0 && <>
            <div className="border-t border-[#F3F4F6] mx-1 my-1" />
            <button type="button" onClick={() => { onChange(() => []); setOpenId(null); }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11.5px] text-[#6B7280] hover:bg-[#F3F4F6] flex items-center gap-1.5">
              <X size={11} /> Limpiar filtro
            </button>
          </>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Date Range Picker
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_ES = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

function MiniCalendar({ id, openId, setOpenId, dateRange, setDateRange }: {
  id: string;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  dateRange: DateRange;
  setDateRange: (r: DateRange) => void;
}) {
  const open = openId === id;
  const ref = useRef<HTMLDivElement>(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectingFrom, setSelectingFrom] = useState(true);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpenId(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const applyPreset = (preset: DatePreset) => {
    const now = new Date();
    if (preset === 'all') { setDateRange({ preset: 'all', from: null, to: null }); setOpenId(null); return; }
    if (preset === 'hour') { setDateRange({ preset: 'hour', from: new Date(now.getTime() - 3600000), to: now }); setOpenId(null); return; }
    if (preset === 'today') { const s = new Date(now.getFullYear(), now.getMonth(), now.getDate()); setDateRange({ preset: 'today', from: s, to: now }); setOpenId(null); return; }
    if (preset === '7d') { setDateRange({ preset: '7d', from: new Date(now.getTime() - 7*86400000), to: now }); setOpenId(null); return; }
    if (preset === '30d') { setDateRange({ preset: '30d', from: new Date(now.getTime() - 30*86400000), to: now }); setOpenId(null); return; }
    setDateRange({ preset: 'custom', from: null, to: null });
    setSelectingFrom(true);
  };

  const handleDayClick = (day: Date) => {
    if (selectingFrom) {
      setDateRange({ preset: 'custom', from: day, to: null });
      setSelectingFrom(false);
    } else {
      const from = dateRange.from!;
      if (day < from) { setDateRange({ preset: 'custom', from: day, to: from }); }
      else { setDateRange({ preset: 'custom', from, to: day }); }
      setSelectingFrom(true);
      setOpenId(null);
    }
  };

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = (new Date(calYear, calMonth, 1).getDay() + 6) % 7; // Mon=0
  const days: (Date | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(calYear, calMonth, i + 1))];

  const isSame = (a: Date | null, b: Date | null) => a && b && a.toDateString() === b.toDateString();
  const inRange = (d: Date | null) => d && dateRange.from && dateRange.to && d >= dateRange.from && d <= dateRange.to;

  const presetLabel: Record<DatePreset, string> = { all: 'Todas', hour: 'Última hora', today: 'Hoy', '7d': 'Últimos 7 días', '30d': 'Últimos 30 días', custom: 'Personalizado' };
  const label = dateRange.preset === 'custom' && dateRange.from
    ? `${dateRange.from.toLocaleDateString('es-CL')}${dateRange.to ? ` – ${dateRange.to.toLocaleDateString('es-CL')}` : ' …'}`
    : presetLabel[dateRange.preset];
  const isActive = dateRange.preset !== 'all';

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpenId(open ? null : id)}
        className={`px-3 py-1.5 rounded-full border text-[12px] inline-flex items-center gap-1.5 transition-colors ${isActive ? 'border-[#306CBB] bg-[#EFF6FF] text-[#306CBB]' : 'border-[#E5E7EB] bg-white text-[#4B5563]'}`}>
        <Calendar size={12} />
        <span>{label}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-[280px] bg-white border border-[#E5E7EB] rounded-xl shadow-xl z-50 p-3">
          {/* Presets */}
          <div className="grid grid-cols-3 gap-1 mb-3">
            {(['hour', 'today', '7d', '30d', 'all'] as DatePreset[]).map(p => (
              <button key={p} type="button" onClick={() => applyPreset(p)}
                className={`px-2 py-1 rounded-lg text-[11px] border transition-colors text-center ${dateRange.preset === p ? 'bg-[#EFF6FF] border-[#306CBB] text-[#306CBB] font-medium' : 'border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]'}`}>
                {presetLabel[p]}
              </button>
            ))}
            <button type="button" onClick={() => { setDateRange({ preset: 'custom', from: null, to: null }); setSelectingFrom(true); }}
              className={`px-2 py-1 rounded-lg text-[11px] border transition-colors text-center ${dateRange.preset === 'custom' ? 'bg-[#EFF6FF] border-[#306CBB] text-[#306CBB] font-medium' : 'border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]'}`}>
              Personalizado
            </button>
          </div>

          {/* Calendar */}
          <div className="border-t border-[#F3F4F6] pt-3">
            {dateRange.preset === 'custom' && (
              <p className="text-[11px] text-[#6B7280] mb-2 text-center">{selectingFrom ? 'Selecciona fecha inicio' : 'Selecciona fecha fin'}</p>
            )}
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} className="p-1 hover:bg-[#F3F4F6] rounded-lg"><ChevronLeft size={14} /></button>
              <span className="text-[12.5px] font-medium text-[#2F3A46]">{MONTHS_ES[calMonth]} {calYear}</span>
              <button type="button" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} className="p-1 hover:bg-[#F3F4F6] rounded-lg"><ChevronRight size={14} /></button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {DAYS_ES.map(d => <div key={d} className="text-[10px] text-[#9CA3AF] text-center py-1 font-medium">{d}</div>)}
              {days.map((d, i) => (
                <div key={i} className="aspect-square">
                  {d ? (
                    <button type="button" onClick={() => handleDayClick(d)}
                      className={`w-full h-full rounded-lg text-[11.5px] transition-colors ${isSame(d, dateRange.from) || isSame(d, dateRange.to) ? 'bg-[#306CBB] text-white font-semibold' : inRange(d) ? 'bg-[#EFF6FF] text-[#306CBB]' : 'hover:bg-[#F3F4F6] text-[#374151]'}`}>
                      {d.getDate()}
                    </button>
                  ) : <div />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaflet icon helpers
// ─────────────────────────────────────────────────────────────────────────────

function makePatrolIcon(L: any) {
  return L.divIcon({
    html: `<div style="width:26px;height:26px;border-radius:50%;background:#FBBF24;border:2.5px solid #1E40AF;display:flex;align-items:center;justify-content:center;color:#1E40AF;font-weight:700;font-size:12px;font-family:sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35)">P</div>`,
    className: '', iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -16],
  });
}

function makeSuspectIcon(L: any) {
  return L.divIcon({
    html: `<div style="width:26px;height:26px;border-radius:50%;background:#EF4444;border:2.5px solid #991B1B;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;font-family:sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35)">S</div>`,
    className: '', iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -16],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Map Component
// ─────────────────────────────────────────────────────────────────────────────

function MapComponentInline({
  tickets, fleetVehicles, fleetTick,
  selectedStatuses, setSelectedStatuses,
  selectedAreas, setSelectedAreas,
  dateRange, setDateRange,
}: {
  tickets: Ticket[];
  fleetVehicles: FleetVehicle[];
  fleetTick: number;
  selectedStatuses: string[];
  setSelectedStatuses: (fn: (prev: string[]) => string[]) => void;
  selectedAreas: string[];
  setSelectedAreas: (fn: (prev: string[]) => string[]) => void;
  dateRange: DateRange;
  setDateRange: (r: DateRange) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const leafletReady = useRef(false);
  const fleetMarkers = useRef<Map<string, any>>(new Map());
  const suspectTrail = useRef<[number, number][]>([]);
  const suspectPolyline = useRef<any>(null);

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
  const [showCameras, setShowCameras] = useState(false);
  const [showVehicles, setShowVehicles] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const allAreas = useMemo(() => Array.from(new Set(tickets.map(t => t.area_name).filter(Boolean))).sort(), [tickets]);
  const suspectVisible = fleetVehicles.some(v => v.type === 'suspect');
  const patrolCount = fleetVehicles.filter(v => v.type === 'patrol').length;

  useEffect(() => {
    const i = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })), 60000);
    return () => clearInterval(i);
  }, []);

  // Fleet markers
  useEffect(() => {
    if (!leafletReady.current) return;
    const L = window.L; const map = mapInstance.current;
    if (!L || !map) return;

    if (!showVehicles) {
      for (const m of fleetMarkers.current.values()) map.removeLayer(m);
      fleetMarkers.current.clear();
      suspectTrail.current = [];
      if (suspectPolyline.current) { map.removeLayer(suspectPolyline.current); suspectPolyline.current = null; }
      return;
    }

    const seenIds = new Set<string>();
    for (const v of fleetVehicles) {
      seenIds.add(v.id);
      const popup = `<div style="font-family:system-ui;min-width:170px;padding:4px 0"><div style="font-size:13px;font-weight:600;color:#1A2332;margin-bottom:4px">${v.id}</div><div style="font-size:12px;color:#4B5563;margin-bottom:2px">Estado: <b>${v.status}</b></div><div style="font-size:12px;color:#4B5563;margin-bottom:2px">Velocidad: ${v.speed_kmh} km/h</div><div style="font-size:12px;color:#4B5563">Área: ${v.area}</div></div>`;
      if (fleetMarkers.current.has(v.id)) {
        fleetMarkers.current.get(v.id).setLatLng([v.lat, v.lng]);
        fleetMarkers.current.get(v.id).getPopup()?.setContent(popup);
      } else {
        const icon = v.type === 'suspect' ? makeSuspectIcon(L) : makePatrolIcon(L);
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
      if (!seenIds.has(id)) {
        map.removeLayer(m); fleetMarkers.current.delete(id);
        if (id.startsWith('S')) { suspectTrail.current = []; if (suspectPolyline.current) { map.removeLayer(suspectPolyline.current); suspectPolyline.current = null; } }
      }
    }
  }, [fleetVehicles, showVehicles]);

  // Init Leaflet
  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = () => {
      const L = window.L;
      const map = L.map(mapRef.current).setView([-33.383, -70.58], 14);
      mapInstance.current = map; leafletReady.current = true;
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 20 }).addTo(map);
      const urgencyColors: Record<string, string> = { Alta: '#DA4F44', Media: '#F2A23A', Baja: '#48946F' };
      const coords: [number, number][] = [[-33.449,-70.668],[-33.425,-70.680],[-33.436,-70.650],[-33.455,-70.670],[-33.418,-70.685]];
      tickets.slice(0, 10).forEach((t, i) => {
        const color = urgencyColors[t.urgency_level] || '#306CBB';
        const icon = L.divIcon({ html: `<div style="width:24px;height:24px;background:${color};border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,.2)"></div>`, className: '', iconSize: [24, 24], iconAnchor: [12, 12] });
        L.marker(coords[i % coords.length], { icon }).bindPopup(`<div style="font-family:system-ui;font-size:13px;width:200px"><div style="font-weight:600;margin-bottom:4px">${t.title}</div><div style="color:#6B7280;font-size:12px">${t.area_name||'Sin área'}</div></div>`, { maxWidth: 240 }).addTo(map);
      });
    };
    document.head.appendChild(script);
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove(); mapInstance.current = null; leafletReady.current = false;
        fleetMarkers.current.clear(); suspectTrail.current = []; suspectPolyline.current = null;
      }
    };
  }, [tickets]);

  return (
    <div className="bg-white border border-[#E6EAF0] rounded-lg shadow-[0_2px_8px_rgba(16,24,40,0.06)] p-4 mb-6">
      {/* Header row — ALL controls above the map */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#306CBB]/10 text-[#306CBB]"><MapPin size={16} /></span>
          <div className="text-[15px] font-semibold text-[#2F3A46]">VITwin</div>
          {fleetTick > 0 && <span className="px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[11px] font-mono text-[#6B7280]">tick #{fleetTick}</span>}
          {patrolCount > 0 && <span className="px-2 py-0.5 rounded-full bg-[#FBBF24]/20 text-[11px] font-medium text-[#92400E] border border-[#FBBF24]/40">{patrolCount} P</span>}
          {suspectVisible && <span className="px-2 py-0.5 rounded-full bg-[#EF4444]/15 text-[11px] font-medium text-[#991B1B] border border-[#EF4444]/30 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse inline-block" />Sospechoso</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MultiSelect id="status" openId={openDropdown} setOpenId={setOpenDropdown} label="Estado" options={STATUS_LIST} selected={selectedStatuses} onChange={setSelectedStatuses} />
          <MultiSelect id="area" openId={openDropdown} setOpenId={setOpenDropdown} label="Área" options={allAreas} selected={selectedAreas} onChange={setSelectedAreas} />
          <MiniCalendar id="date" openId={openDropdown} setOpenId={setOpenDropdown} dateRange={dateRange} setDateRange={setDateRange} />
          <FlipSwitch label="Cámaras" value={showCameras} onChange={setShowCameras} />
          <FlipSwitch label="Vehículos" value={showVehicles} onChange={setShowVehicles} />
          <div className="text-[11px] text-[#6D7783] px-2 py-1 rounded-full bg-[#F3F5F7] border border-[#E6EAF0]">⏱ {currentTime} hrs</div>
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} className="w-full h-[420px] rounded-lg bg-[#F3F5F7] border border-[#E6EAF0]" />

      {/* Legend */}
      <div className="flex gap-4 mt-2.5 text-[11.5px] text-[#6B7280]">
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-[#FBBF24] border-2 border-[#1E40AF] inline-block" />Patrulla</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-[#EF4444] border-2 border-[#991B1B] inline-block" />Sospechoso</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-[#DA4F44] inline-block" />Alta urgencia</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-[#F2A23A] inline-block" />Media</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-[#48946F] inline-block" />Baja</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticket Detail Panel
// ─────────────────────────────────────────────────────────────────────────────

function TicketDetailPanel({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const ORDER: Record<string, number> = { Recibido: 0, Asignado: 1, 'En Gestión': 2, Resuelto: 3, Cerrado: 4 };
  const currentIdx = ORDER[ticket.status] ?? 0;
  return (
    <div className="bg-white border border-[#E6EAF0] rounded-lg shadow-[0_2px_8px_rgba(16,24,40,0.06)] p-5 sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11.5px] text-[#6B7280] font-mono">#{ticket.id}</span>
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-medium text-white ${mapStatusToColor(ticket.status)}`}>{ticket.status}</span>
          {ticket.urgency_level && <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-medium text-white ${mapUrgencyToColor(ticket.urgency_level)}`}>{ticket.urgency_level}</span>}
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#374151] transition-colors"><X size={15} /></button>
      </div>
      <h2 className="text-[14.5px] font-semibold text-[#111827] mb-1.5">{ticket.title}</h2>
      {ticket.area_name && <span className="inline-block mb-3 px-2 py-0.5 rounded-md text-[11.5px] bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">{ticket.area_name}</span>}
      <p className="text-[12.5px] text-[#4B5563] whitespace-pre-line mb-4 leading-relaxed">{ticket.description}</p>
      <div className="grid grid-cols-2 gap-3 mb-4 text-[12.5px]">
        <div><div className="text-[10.5px] text-[#6B7280] uppercase tracking-wide mb-0.5">Creado</div><div className="text-[#111827]">{new Date(ticket.created_at).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></div>
        {ticket.assigned_to && <div><div className="text-[10.5px] text-[#6B7280] uppercase tracking-wide mb-0.5">Equipo</div><div className="text-[#111827]">{ticket.assigned_to}</div></div>}
        {typeof ticket._urgency_score === 'number' && <div><div className="text-[10.5px] text-[#6B7280] uppercase tracking-wide mb-0.5">Score IA</div><div className="font-mono text-[#111827]">{ticket._urgency_score}%</div></div>}
      </div>
      <div className="border-t border-[#F3F4F6] pt-4 mb-4">
        <div className="text-[10.5px] text-[#6B7280] uppercase tracking-wide mb-3">Línea de tiempo</div>
        <div className="space-y-2">
          {STATUS_LIST.map((step, idx) => {
            const done = idx <= currentIdx, current = idx === currentIdx;
            const stepDate = new Date(new Date(ticket.created_at).getTime() + idx * 2 * 3600000);
            return (
              <div key={step} className="flex items-center gap-2.5 text-[12px]">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${current ? 'bg-[#306CBB] ring-2 ring-[#306CBB]/25' : done ? 'bg-[#10B981]' : 'bg-[#E5E7EB]'}`} />
                <span className={done ? 'text-[#111827]' : 'text-[#9CA3AF]'}>{step}</span>
                {current && <span className="text-[10.5px] text-[#306CBB] font-medium">← actual</span>}
                <span className="ml-auto text-[11px] text-[#9CA3AF]">{done ? stepDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
              </div>
            );
          })}
        </div>
      </div>
      {ticket.evidences && ticket.evidences.length > 0 && (
        <div className="border-t border-[#F3F4F6] pt-4">
          <div className="text-[10.5px] text-[#6B7280] uppercase tracking-wide mb-2">Evidencias ({ticket.evidences.length})</div>
          <div className="grid grid-cols-2 gap-2">
            {ticket.evidences.map((ev, i) => (
              <div key={i} className="border border-[#E5E7EB] rounded-md overflow-hidden bg-[#F9FAFB]">
                <img src={ev.image_url} alt={`Evidencia ${i + 1}`} className="w-full h-24 object-cover" />
                {ev.description && <div className="px-2 py-1.5 text-[11px] text-[#4B5563]">{ev.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyDetailPanel() {
  return (
    <div className="bg-white border border-[#E6EAF0] rounded-lg shadow-[0_2px_8px_rgba(16,24,40,0.06)] p-8 text-center sticky top-6">
      <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-3"><FileQuestion size={20} className="text-[#9CA3AF]" /></div>
      <p className="text-[13px] text-[#6B7280]">Selecciona un ticket para ver su detalle</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
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
  const pageSize = 5;

  useEffect(() => { if (token) fetchData(); }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const enriched: Ticket[] = data.map((t: Ticket) => {
          const area_name = t.area_name || 'Atención General';
          let min = 20, max = 80;
          if (t.urgency_level === 'Alta') { min = 70; max = 100; }
          else if (t.urgency_level === 'Media') { min = 40; max = 75; }
          else if (t.urgency_level === 'Baja') { min = 10; max = 45; }
          const score = Math.floor(Math.random() * (max - min + 1)) + min;
          const priorityLabel = score >= 85 ? 'Crítica' : score >= 65 ? 'Alta' : score >= 45 ? 'Media' : 'Normal';
          return { ...t, area_name, _urgency_score: score, _priority_label: priorityLabel };
        });
        setTickets(enriched); setPage(1);
        setStats({
          total_tickets: enriched.length,
          tickets_by_status: enriched.reduce((acc: Record<string, number>, t: Ticket) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {}),
          avg_response_time: '2h 15m',
          tickets_at_risk: enriched.filter((t: Ticket) => t.status !== 'Resuelto' && t.urgency_level === 'Alta').length,
        });
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const passesDateFilter = useCallback((created_at: string) => {
    const { preset, from, to } = dateRange;
    if (preset === 'all') return true;
    const t = new Date(created_at).getTime();
    const now = Date.now();
    if (preset === 'hour') return t >= now - 3600000;
    if (preset === 'today') { const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); return t >= s; }
    if (preset === '7d') return t >= now - 7 * 86400000;
    if (preset === '30d') return t >= now - 30 * 86400000;
    if (preset === 'custom') {
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime() + 86400000) return false;
      return true;
    }
    return true;
  }, [dateRange]);

  const filteredCases = useMemo(() => {
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
    return f.slice((page - 1) * pageSize, page * pageSize);
  }, [sortColumn, sortDirection, selectedStatuses, selectedAreas, selectedUrgencies, passesDateFilter, tickets, page]);

  if (loading) return <div className="text-center py-12 text-muted-foreground">Cargando dashboard...</div>;
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));

  return (
    <div>
      {/* KPIs */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <KPICard title="Total de Tickets" value={stats?.total_tickets || 0} color="gray" progress={100} />
        <div className="bg-white border border-[#E6EAF0] rounded-lg p-5 shadow-[0_2px_8px_rgba(16,24,40,0.06)] flex-1 min-w-[220px]">
          <div className="text-[13px] text-[#4B5563] font-medium mb-2">Distribución por estado</div>
          <div className="space-y-1.5 text-[12px] text-[#4B5563]">
            {stats && Object.entries(stats.tickets_by_status).map(([status, count]) => {
              const pct = stats.total_tickets ? Math.round((count / stats.total_tickets) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-2">
                  <span className="w-24">{status} {count}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden"><div className="h-full rounded-full bg-[#306CBB]" style={{ width: `${pct}%` }} /></div>
                  <span className="w-8 text-right text-[11px] text-[#6D7783]">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
        <KPICard title="Tiempo Promedio Respuesta" value={stats?.avg_response_time || '-'} color="gray" progress={60} />
        <KPICard title="Tickets en Riesgo" value={stats?.tickets_at_risk || 0} color="red" progress={35} />
      </div>

      {/* Map */}
      <MapComponentInline
        tickets={tickets} fleetVehicles={fleetVehicles} fleetTick={currentTick}
        selectedStatuses={selectedStatuses} setSelectedStatuses={setSelectedStatuses}
        selectedAreas={selectedAreas} setSelectedAreas={setSelectedAreas}
        dateRange={dateRange} setDateRange={setDateRange}
      />

      {/* Table + Detail */}
      <div className="flex gap-6 flex-col lg:flex-row">
        <div className="flex-1 min-w-0">
          {/* Controls strip */}
          <div className="bg-white border border-[#E6EAF0] rounded-lg p-3 mb-4 flex items-center justify-between flex-wrap gap-3 text-[12.5px] text-[#4B5563]">
            <div className="flex items-center gap-3 flex-wrap">
              {tickets.length > 0 && <span>Mostrando <strong>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, tickets.length)}</strong> de <strong>{tickets.length}</strong></span>}
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280]">Urgencia:</span>
                <div className="flex gap-1">
                  {['Alta', 'Media', 'Baja'].map(level => (
                    <button key={level} type="button" onClick={() => setSelectedUrgencies(prev => prev.includes(level) ? prev.filter(u => u !== level) : [...prev, level])}
                      className={`px-2 py-1 rounded-full border text-[11px] ${selectedUrgencies.includes(level) ? 'bg-[#F97316]/10 border-[#F97316] text-[#C2410C]' : 'bg-white border-[#E5E7EB] text-[#4B5563]'}`}>{level}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 border border-[#E5E7EB] rounded-md disabled:opacity-50">◀</button>
              <span>Página {page} de {totalPages}</span>
              <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2 py-1 border border-[#E5E7EB] rounded-md disabled:opacity-50">▶</button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-[#E6EAF0] rounded-lg shadow-[0_2px_8px_rgba(16,24,40,0.06)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F1F3F5] border-b border-[#EEF1F4]">
                  {(['id','title','urgency','priority','area','status','date'] as const).map(col => {
                    const labels: Record<string,string> = { id:'ID', title:'Título', urgency:'Urgencia', priority:'Prioridad', area:'Área', status:'Estado', date:'Fecha' };
                    const skeys: Partial<Record<string,SortColumn>> = { id:'id', title:'title', priority:'priority', area:'area', status:'status', date:'date' };
                    const sk = skeys[col]; const sorted = sk && sortColumn === sk;
                    return (
                      <th key={col} onClick={() => { if (!sk) return; sortColumn === sk ? setSortDirection(d => d==='asc'?'desc':'asc') : (setSortColumn(sk), setSortDirection('desc')); }}
                        className={`text-left text-[13px] font-semibold text-[#6D7783] px-4 py-4 ${sk ? 'cursor-pointer select-none' : ''}`}>
                        <span className="inline-flex items-center gap-1">{labels[col]}{sorted && <span className="text-[10px]">{sortDirection==='asc'?'▲':'▼'}</span>}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredCases.length === 0
                  ? <tr><td colSpan={7} className="text-center py-6 text-[#6D7783] text-[13px]">No hay tickets para mostrar</td></tr>
                  : filteredCases.map(caso => (
                    <tr key={caso.id} onClick={() => setSelectedTicket(selectedTicket?.id === caso.id ? null : caso)}
                      className={`border-b border-[#EEF1F4] hover:bg-[#F9FAFB] transition-colors cursor-pointer ${selectedTicket?.id === caso.id ? 'bg-[#EFF6FF] border-l-2 border-l-[#306CBB]' : ''}`}>
                      <td className="px-4 py-4"><span className="text-[14px] font-mono text-[#306CBB]">#{caso.id}</span></td>
                      <td className="px-4 py-4"><span className="text-[13.5px] font-semibold text-[#2F3A46]">{caso.title}</span></td>
                      <td className="px-4 py-4"><span className={`inline-block px-3 py-1 rounded-full text-[12.5px] font-medium text-white ${mapUrgencyToColor(caso.urgency_level)}`}>{caso.urgency_level||'—'}</span></td>
                      <td className="px-4 py-4"><div className="flex flex-col text-[12px]"><span className="font-medium text-[#111827]">{caso._priority_label||'Normal'}</span>{typeof caso._urgency_score === 'number' && <span className="text-[11px] text-[#6B7280]">{caso._urgency_score}%</span>}</div></td>
                      <td className="px-4 py-4"><span className="text-[13px] text-[#2F3A46]">{caso.area_name||'—'}</span></td>
                      <td className="px-4 py-4"><span className={`inline-block px-3 py-1 rounded-full text-[12.5px] font-medium text-white ${mapStatusToColor(caso.status)}`}>{caso.status}</span></td>
                      <td className="px-4 py-4 text-[12px] text-[#4B5563]">{new Date(caso.created_at).toLocaleDateString('es-CL')}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        <div className="w-full lg:w-[360px] flex-shrink-0">
          {selectedTicket ? <TicketDetailPanel ticket={selectedTicket} onClose={() => setSelectedTicket(null)} /> : <EmptyDetailPanel />}
        </div>
      </div>
    </div>
  );
}
