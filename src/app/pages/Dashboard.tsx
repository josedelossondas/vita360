import {
  AlertTriangle,
  Clock,
  ChevronDown,
  MapPin,
  FileQuestion,
  Zap,
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth, API_URL } from '../../context/AuthContext';
import { useFleetStream, type FleetVehicle } from '../../hooks/useFleetStream';

// Tipos de iconos por tipo de caso
const caseTypeIcons: Record<string, any> = {
  'Árbol en Riesgo': AlertTriangle,
  'Bache en Calle': MapPin,
  'Consulta General': FileQuestion,
  'Reclamo Basura': AlertTriangle,
  'Semáforo Roto': AlertTriangle,
};

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  urgency_level: string;
  area_name: string;
  assigned_to: string | null;
  created_at: string;
  // Campos sintéticos solo para el dashboard
  _urgency_score?: number;
  _priority_label?: string;
  // Solo para detalle rápido en dashboard (texto completo)
  // description ya viene del backend
  evidences?: {
    image_url: string;
    description?: string;
    created_at: string;
  }[];
}

interface DashboardStats {
  total_tickets: number;
  tickets_by_status: Record<string, number>;
  avg_response_time: string;
  tickets_at_risk: number;
}

const mapUrgencyToLabel = (urgency: number): string => {
  if (urgency >= 80) return 'Crítica';
  if (urgency >= 60) return 'Alta';
  return 'Media';
};

const mapStatusToColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'resuelto':
      return 'bg-[#48946F]';
    case 'recibido':
      return 'bg-[#306CBB]';
    case 'asignado':
      return 'bg-[#7C3AED]';
    case 'en gestión':
      return 'bg-[#F2B23A]';
    case 'cerrado':
      return 'bg-[#98A6B1]';
    default:
      return 'bg-[#98A6B1]';
  }
};

const mapStatusToLabel = (status: string): string => {
  return status || 'Desconocido';
};

function KPICard({
  title,
  value,
  color,
  progress
}: {
  title: string;
  value: string | number;
  color: string;
  progress: number;
}) {
  const isAvgTime = title === 'Tiempo Promedio Respuesta';
  return (
    <div className="bg-white border border-[#E6EAF0] rounded-lg p-5 shadow-[0_2px_8px_rgba(16,24,40,0.06)] flex-1">
      <div className="text-[12px] text-[#6D7783] mb-2">{title}</div>
      <div
        className={`${isAvgTime ? 'text-[30px]' : 'text-[36px]'} font-semibold mb-3 ${
          color === 'green'
            ? 'text-[#48946F]'
            : color === 'red'
            ? 'text-[#DA4F44]'
            : 'text-[#2F3A46]'
        }`}
      >
        {value}
      </div>
      <div className="w-full h-1.5 bg-[#E6EAF0] rounded-full overflow-hidden">
        <div 
          className={`h-full ${
            color === 'green' ? 'bg-[#48946F]' : 
            color === 'red' ? 'bg-[#DA4F44]' : 
            color === 'orange' ? 'bg-[#F2A23A]' :
            'bg-[#306CBB]'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function mapUrgencyToColor(urgency: string): string {
  switch (urgency?.toLowerCase()) {
    case 'alta':
      return 'bg-[#DA4F44]';
    case 'media':
      return 'bg-[#F2A23A]';
    case 'baja':
      return 'bg-[#48946F]';
    default:
      return 'bg-[#98A6B1]';
  }
}

// ── divIcon helpers ────────────────────────────────────────────────────────
function makePatrolIcon(L: any) {
  return L.divIcon({
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:#FBBF24;border:2.5px solid #1E40AF;
      display:flex;align-items:center;justify-content:center;
      color:#1E40AF;font-weight:700;font-size:12px;font-family:sans-serif;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
    ">P</div>`,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
  });
}

function makeSuspectIcon(L: any) {
  return L.divIcon({
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:#EF4444;border:2.5px solid #991B1B;
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:700;font-size:12px;font-family:sans-serif;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
    ">S</div>`,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
  });
}

// Componente Mapa Integrado
function MapComponentInline({
  tickets,
  selectedStatuses,
  setSelectedStatuses,
  selectedAreas,
  setSelectedAreas,
  fleetVehicles,
}: {
  tickets: Ticket[];
  selectedStatuses: string[];
  setSelectedStatuses: (fn: (prev: string[]) => string[]) => void;
  selectedAreas: string[];
  setSelectedAreas: (fn: (prev: string[]) => string[]) => void;
  fleetVehicles: FleetVehicle[];
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const leafletReady = useRef(false);
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  );
  const [statusOpen, setStatusOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);

  // Fleet marker refs
  const fleetMarkers = useRef<Map<string, any>>(new Map());
  const suspectTrail = useRef<[number, number][]>([]);
  const suspectPolyline = useRef<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Update fleet markers whenever fleetVehicles changes ──────────────────
  useEffect(() => {
    if (!leafletReady.current) return;
    const L = window.L;
    const map = mapInstance.current;
    if (!L || !map) return;

    const seenIds = new Set<string>();

    for (const v of fleetVehicles) {
      seenIds.add(v.id);

      const popupHtml = `
        <div style="font-family:system-ui,sans-serif;min-width:170px;padding:4px 0">
          <div style="font-size:13px;font-weight:600;color:#1A2332;margin-bottom:4px">${v.id}</div>
          <div style="font-size:12px;color:#4B5563;margin-bottom:2px">Estado: <b>${v.status}</b></div>
          <div style="font-size:12px;color:#4B5563;margin-bottom:2px">Velocidad: ${v.speed_kmh} km/h</div>
          <div style="font-size:12px;color:#4B5563">Área: ${v.area}</div>
        </div>`;

      if (fleetMarkers.current.has(v.id)) {
        const marker = fleetMarkers.current.get(v.id);
        marker.setLatLng([v.lat, v.lng]);
        marker.getPopup()?.setContent(popupHtml);
      } else {
        const icon = v.type === 'suspect' ? makeSuspectIcon(L) : makePatrolIcon(L);
        const marker = L.marker([v.lat, v.lng], { icon })
          .bindPopup(popupHtml)
          .addTo(map);
        fleetMarkers.current.set(v.id, marker);
      }

      // Suspect trail polyline
      if (v.type === 'suspect') {
        suspectTrail.current.push([v.lat, v.lng]);
        if (suspectTrail.current.length > 40) suspectTrail.current.shift();
        if (suspectPolyline.current) {
          suspectPolyline.current.setLatLngs(suspectTrail.current);
        } else {
          suspectPolyline.current = L.polyline(suspectTrail.current, {
            color: '#EF4444',
            weight: 2,
            opacity: 0.45,
            dashArray: '4 4',
          }).addTo(map);
        }
      }
    }

    // Remove markers for vehicles no longer visible
    for (const [id, marker] of fleetMarkers.current) {
      if (!seenIds.has(id)) {
        map.removeLayer(marker);
        fleetMarkers.current.delete(id);
        if (id.startsWith('S')) {
          suspectTrail.current = [];
          if (suspectPolyline.current) {
            map.removeLayer(suspectPolyline.current);
            suspectPolyline.current = null;
          }
        }
      }
    }
  }, [fleetVehicles]);

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;

    // Load Leaflet dynamically
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = () => {
      const L = window.L;
      // Centro de ejemplo: comuna de Vitacura
      const map = L.map(mapRef.current).setView([-33.383, -70.58], 14);
      mapInstance.current = map;
      leafletReady.current = true;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      // Agregar marcadores por tickets
      const urgencyColors: Record<string, string> = {
        'Alta': '#DA4F44',
        'Media': '#F2A23A',
        'Baja': '#48946F',
      };

      tickets.slice(0, 10).forEach((ticket, idx) => {
        // Coordenadas de ejemplo para Santiago
        const coords = [
          [-33.449, -70.668],
          [-33.425, -70.680],
          [-33.436, -70.650],
          [-33.455, -70.670],
          [-33.418, -70.685],
        ];
        const coord = coords[idx % coords.length] as [number, number];

        const color = urgencyColors[ticket.urgency_level] || '#306CBB';
        const icon = L.divIcon({
          html: `<div style="width:24px;height:24px;background:${color};border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,.2)"></div>`,
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const popupContent = `
          <div style="font-family:'DM Sans',system-ui,sans-serif;font-size:13px;width:200px">
            <div style="font-weight:600;margin-bottom:4px">${ticket.title}</div>
            <div style="color:#6B7280;font-size:12px;margin-bottom:6px">${ticket.area_name || 'Sin área'}</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">
              <span style="background:${urgencyColors[ticket.urgency_level]};color:white;padding:2px 6px;border-radius:3px;font-size:11px">${ticket.urgency_level}</span>
              <span style="background:#E5E7EB;color:#374151;padding:2px 6px;border-radius:3px;font-size:11px">${ticket.status}</span>
            </div>
            <div style="font-size:11px;color:#9CA3AF">Ticket #${ticket.id}</div>
          </div>`;

        L.marker(coord, { icon })
          .bindPopup(popupContent, { maxWidth: 240 })
          .addTo(map);
      });
    };
    script.onerror = () => console.error('Error loading Leaflet');
    document.head.appendChild(script);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        leafletReady.current = false;
        fleetMarkers.current.clear();
        suspectTrail.current = [];
        suspectPolyline.current = null;
      }
    };
  }, [tickets]);

  return (
    <div className="bg-white border border-[#E6EAF0] rounded-lg shadow-[0_2px_8px_rgba(16,24,40,0.06)] p-4 mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#306CBB]/10 text-[#306CBB]">
            <MapPin size={16} />
          </span>
          <div className="text-[15px] font-semibold text-[#2F3A46]">
            VITwin
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtros rápidos en el header del mapa */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setStatusOpen(o => !o)}
              className="px-3 py-1.5 rounded-full border border-[#E5E7EB] bg-white text-[12px] text-[#4B5563] inline-flex items-center gap-1"
            >
              Estado
              <ChevronDown size={12} className={`transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
            </button>
            {statusOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-[#E5E7EB] rounded-md shadow-lg z-30 p-2 space-y-1 text-[12px]">
                {['Recibido', 'Asignado', 'En Gestión', 'Resuelto', 'Cerrado'].map(status => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status)}
                      onChange={() => {
                        setSelectedStatuses(prev =>
                          prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
                        );
                      }}
                    />
                    <span>{status}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setAreaOpen(o => !o)}
              className="px-3 py-1.5 rounded-full border border-[#E5E7EB] bg-white text-[12px] text-[#4B5563] inline-flex items-center gap-1"
            >
              Área
              <ChevronDown size={12} className={`transition-transform ${areaOpen ? 'rotate-180' : ''}`} />
            </button>
            {areaOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-[#E5E7EB] rounded-md shadow-lg z-30 p-2 space-y-1 text-[12px] max-h-60 overflow-y-auto">
                {Array.from(new Set(tickets.map(t => t.area_name))).map(area => (
                  <label key={area} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAreas.includes(area)}
                      onChange={() => {
                        setSelectedAreas(prev =>
                          prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
                        );
                      }}
                    />
                    <span>{area}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-full border border-[#E5E7EB] bg-white text-[12px] text-[#4B5563]"
          >
            Cámaras
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-full border border-[#E5E7EB] bg-white text-[12px] text-[#4B5563]"
          >
            Vehículos
          </button>
          <div className="text-[11px] text-[#6D7783] px-2 py-1 rounded-full bg-[#F3F5F7] border border-[#E6EAF0]">
            ⏱ {currentTime} hrs
          </div>
        </div>
      </div>
      <div
        ref={mapRef}
        className="w-full h-[400px] rounded-lg bg-[#F3F5F7] border border-[#E6EAF0]"
      />
    </div>
  );
}

type SortColumn = 'priority' | 'date' | 'status' | 'area' | 'id' | 'title';

export default function Dashboard() {
  const { token } = useAuth();
  const fleetTick = useFleetStream();
  const fleetVehicles = fleetTick?.vehicles ?? [];
  const [sortColumn, setSortColumn] = useState<SortColumn>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedUrgencies, setSelectedUrgencies] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [areaFilterOpen, setAreaFilterOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Obtener tickets
      const ticketsRes = await fetch(`${API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        const enriched: Ticket[] = ticketsData.map((t: Ticket) => {
          // Área placeholder si no viene definida
          const areasFallback = ['Atención General', 'Áreas Verdes', 'Aseo', 'Infraestructura'];
          const area_name = t.area_name || areasFallback[Math.floor(Math.random() * areasFallback.length)];

          // Asignar un score sintético de urgencia según el nivel
          let min = 20;
          let max = 80;
          if (t.urgency_level === 'Alta') {
            min = 70;
            max = 100;
          } else if (t.urgency_level === 'Media') {
            min = 40;
            max = 75;
          } else if (t.urgency_level === 'Baja') {
            min = 10;
            max = 45;
          }
          const score = Math.floor(Math.random() * (max - min + 1)) + min;

          let priorityLabel = 'Normal';
          if (score >= 85) priorityLabel = 'Crítica';
          else if (score >= 65) priorityLabel = 'Alta';
          else if (score >= 45) priorityLabel = 'Media';

          return {
            ...t,
            area_name,
            _urgency_score: score,
            _priority_label: priorityLabel,
          };
        });

        setTickets(enriched);
        setPage(1);
        
        // Calcular stats
        const stats: DashboardStats = {
          total_tickets: enriched.length,
          tickets_by_status: enriched.reduce((acc: Record<string, number>, t: Ticket) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
          }, {}),
          avg_response_time: '2h 15m',
          tickets_at_risk: enriched.filter((t: Ticket) => t.status !== 'Resuelto' && t.urgency_level === 'Alta').length,
        };
        setStats(stats);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = useMemo(() => {
    let filtered = tickets.filter(c => {
      if (selectedStatuses.length && !selectedStatuses.includes(c.status)) return false;
      if (selectedAreas.length && !selectedAreas.includes(c.area_name)) return false;
      if (selectedUrgencies.length && !selectedUrgencies.includes(c.urgency_level)) return false;

      if (dateRange !== 'all') {
        const created = new Date(c.created_at).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (dateRange === 'today') {
          const today = new Date();
          const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
          const end = start + oneDay;
          if (created < start || created >= end) return false;
        } else if (dateRange === '7d') {
          if (created < now - 7 * oneDay) return false;
        } else if (dateRange === '30d') {
          if (created < now - 30 * oneDay) return false;
        }
      }
      return true;
    });

    const sorted = filtered.sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortColumn) {
        case 'priority': {
          const aScore = a._urgency_score ?? 0;
          const bScore = b._urgency_score ?? 0;
          return (aScore - bScore) * -dir; // mayor score = más prioritario
        }
        case 'date':
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * -dir;
        case 'status':
          return a.status.localeCompare(b.status) * dir;
        case 'area':
          return (a.area_name || '').localeCompare(b.area_name || '') * dir;
        case 'id':
          return (a.id - b.id) * dir;
        case 'title':
          return a.title.localeCompare(b.title) * dir;
        default:
          return 0;
      }
    });

    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sortColumn, sortDirection, selectedStatuses, selectedAreas, tickets, page, pageSize]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Cargando dashboard...</div>;
  }

  return (
    <div>
      {/* KPI Cards - Datos Reales */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <KPICard title="Total de Tickets" value={stats?.total_tickets || 0} color="gray" progress={100} />
        <div className="bg-white border border-[#E6EAF0] rounded-lg p-5 shadow-[0_2px_8px_rgba(16,24,40,0.06)] flex-1 min-w-[220px]">
          <div className="text-[13px] text-[#4B5563] font-medium mb-2">Distribución por estado (%)</div>
          <div className="space-y-1.5 text-[12px] text-[#4B5563]">
            {stats && Object.entries(stats.tickets_by_status).map(([status, count]) => {
              const pct = stats.total_tickets ? Math.round((count / stats.total_tickets) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-2">
                  <span className="w-24">{status} {count}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden">
                    <div className="h-full rounded-full bg-[#306CBB]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-[11px] text-[#6D7783]">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
        <KPICard title="Tiempo Promedio Respuesta" value={stats?.avg_response_time || '-'} color="gray" progress={60} />
        <KPICard title="Tickets en Riesgo" value={stats?.tickets_at_risk || 0} color="red" progress={35} />
      </div>

      {/* Mapa Urbano siempre visible */}
      <MapComponentInline
        tickets={tickets}
        selectedStatuses={selectedStatuses}
        setSelectedStatuses={setSelectedStatuses}
        selectedAreas={selectedAreas}
        setSelectedAreas={setSelectedAreas}
        fleetVehicles={fleetVehicles}
      />

      {/* Main Content - Two Columns */}
      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Left Column - Table */}
        <div className="flex-1">
          {/* Controls Strip: filtros de urgencia/fecha + paginación */}
          <div className="bg-white border border-[#E6EAF0] rounded-lg p-3 mb-4 flex items-center justify-between flex-wrap gap-3 text-[12.5px] text-[#4B5563]">
            <div className="flex items-center gap-3 flex-wrap">
              {tickets.length > 0 && (
                <span>
                  Mostrando{' '}
                  <strong>
                    {(page - 1) * pageSize + 1}–
                    {Math.min(page * pageSize, tickets.length)}
                  </strong>{' '}
                  de <strong>{tickets.length}</strong> tickets
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280]">Urgencia:</span>
                <div className="flex gap-1">
                  {['Alta', 'Media', 'Baja'].map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() =>
                        setSelectedUrgencies(prev =>
                          prev.includes(level)
                            ? prev.filter(u => u !== level)
                            : [...prev, level]
                        )
                      }
                      className={`px-2 py-1 rounded-full border text-[11px] ${
                        selectedUrgencies.includes(level)
                          ? 'bg-[#F97316]/10 border-[#F97316] text-[#C2410C]'
                          : 'bg-white border-[#E5E7EB] text-[#4B5563]'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280]">Fecha:</span>
                <select
                  value={dateRange}
                  onChange={e => {
                    setDateRange(e.target.value as any);
                    setPage(1);
                  }}
                  className="px-2 py-1 border border-[#E5E7EB] rounded-md text-[12px] bg-white cursor-pointer"
                >
                  <option value="all">Todas</option>
                  <option value="today">Hoy</option>
                  <option value="7d">Últimos 7 días</option>
                  <option value="30d">Últimos 30 días</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 border border-[#E5E7EB] rounded-md disabled:opacity-50"
              >
                ◀
              </button>
              <span>
                Página {page} de {Math.max(1, Math.ceil(tickets.length / pageSize))}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage(p => Math.min(Math.ceil(tickets.length / pageSize) || 1, p + 1))
                }
                disabled={page >= Math.ceil(tickets.length / pageSize)}
                className="px-2 py-1 border border-[#E5E7EB] rounded-md disabled:opacity-50"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-[#E6EAF0] rounded-lg shadow-[0_2px_8px_rgba(16,24,40,0.06)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F1F3F5] border-b border-[#EEF1F4]">
                  {(['id','title','urgency','priority','area','status','date'] as const).map(col => {
                    const labelMap: Record<string,string> = {
                      id: 'ID',
                      title: 'Título',
                      urgency: 'Urgencia',
                      priority: 'Prioridad',
                      area: 'Área',
                      status: 'Estado',
                      date: 'Fecha',
                    };
                    const sortKeyMap: Partial<Record<string, SortColumn>> = {
                      id: 'id',
                      title: 'title',
                      priority: 'priority',
                      area: 'area',
                      status: 'status',
                      date: 'date',
                    };
                    const sortKey = sortKeyMap[col];
                    const isSorted = sortKey && sortColumn === sortKey;
                    const arrow = isSorted ? (sortDirection === 'asc' ? '▲' : '▼') : '';
                    const handleClick = () => {
                      if (!sortKey) return;
                      if (sortColumn === sortKey) {
                        setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
                      } else {
                        setSortColumn(sortKey);
                        setSortDirection('desc');
                      }
                    };
                    return (
                      <th
                        key={col}
                        onClick={handleClick}
                        className={`text-left text-[13px] font-semibold text-[#6D7783] px-4 py-4 ${sortKey ? 'cursor-pointer select-none' : ''}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {labelMap[col]}
                          {arrow && <span className="text-[10px]">{arrow}</span>}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-[#6D7783] text-[13px]">
                      No hay tickets para mostrar
                    </td>
                  </tr>
                ) : (
                  filteredCases.map((caso) => {
                    const urgencyColor = mapUrgencyToColor(caso.urgency_level);
                    const statusColor = mapStatusToColor(caso.status);

                    return (
                      <tr
                        key={caso.id}
                        className="border-b border-[#EEF1F4] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                        onClick={() => setSelectedTicket(caso)}
                      >
                        <td className="px-4 py-4">
                          <span className="text-[14px] font-mono text-[#306CBB]">#{caso.id}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-[14px] font-semibold text-[#2F3A46]">{caso.title}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-[13px] font-medium text-white ${urgencyColor}`}>
                            {caso.urgency_level || 'Sin definir'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col text-[12px] text-[#111827]">
                            <span className="font-medium">{caso._priority_label || 'Normal'}</span>
                            {typeof caso._urgency_score === 'number' && (
                              <span className="text-[11px] text-[#6B7280]">{caso._urgency_score}%</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-[14px] text-[#2F3A46]">{caso.area_name || '-'}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-[13px] font-medium text-white ${statusColor}`}>
                            {mapStatusToLabel(caso.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[12px] text-[#4B5563]">
                          {new Date(caso.created_at).toLocaleDateString('es-CL')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - placeholder simple */}
        <div className="w-full lg:w-[380px]">
          <div className="bg-white border border-[#E6EAF0] rounded-lg shadow-[0_2px_8px_rgba(16,24,40,0.06)] p-6 sticky top-6 flex flex-col gap-3 text-[12.5px] text-[#4B5563]">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[#306CBB] flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-[15px] font-semibold text-[#2F3A46]">Panel inteligente</h2>
            </div>
            <p className="text-[12px] text-[#6B7280]">
              Vista rápida de la carga actual, priorización y riesgos según urgencia y estado.
            </p>
          </div>
        </div>
      </div>
      {/* Detalle rápido del ticket seleccionado */}
      {selectedTicket && (
        <div className="mt-6 bg-white border border-[#E6EAF0] rounded-lg shadow-[0_2px_8px_rgba(16,24,40,0.06)] p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11.5px] text-[#6B7280] font-mono">#{selectedTicket.id}</span>
                <span className={`inline-block px-3 py-1 rounded-full text-[12px] font-medium text-white ${mapStatusToColor(selectedTicket.status)}`}>
                  {selectedTicket.status}
                </span>
                {selectedTicket.urgency_level && (
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-medium text-white ${mapUrgencyToColor(selectedTicket.urgency_level)}`}>
                    {selectedTicket.urgency_level}
                  </span>
                )}
                {selectedTicket.area_name && (
                  <span className="px-2 py-0.5 rounded-md text-[11.5px] bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">
                    {selectedTicket.area_name}
                  </span>
                )}
              </div>
              <h2 className="text-[14px] font-semibold text-[#111827] mb-1">
                {selectedTicket.title}
              </h2>
              <p className="text-[12.5px] text-[#4B5563] whitespace-pre-line mb-3">
                {selectedTicket.description}
              </p>
              {/* Fotos si existen */}
              {selectedTicket.evidences && selectedTicket.evidences.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-3 max-w-[420px]">
                  {selectedTicket.evidences.map((ev, idx) => (
                    <div key={idx} className="border border-[#E5E7EB] rounded-md overflow-hidden bg-[#F9FAFB]">
                      <img
                        src={ev.image_url}
                        alt={`Evidencia ${idx + 1}`}
                        className="w-full h-28 object-cover"
                      />
                      {ev.description && (
                        <div className="px-2 py-1.5 text-[11px] text-[#4B5563]">
                          {ev.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="text-[12px] text-[#6B7280] hover:text-[#111827]"
            >
              Cerrar
            </button>
          </div>
          <div className="flex flex-wrap gap-4 text-[12px] text-[#4B5563] mb-4">
            <div>
              <div className="text-[#6B7280] text-[11px]">Creado</div>
              <div>{new Date(selectedTicket.created_at).toLocaleString('es-CL')}</div>
            </div>
            {selectedTicket.assigned_to && (
              <div>
                <div className="text-[#6B7280] text-[11px]">Equipo asignado</div>
                <div>{selectedTicket.assigned_to}</div>
              </div>
            )}
          </div>
          {/* Línea de tiempo simple */}
          <div className="mt-2">
            <div className="text-[11px] text-[#6B7280] uppercase tracking-wide mb-2">Línea de tiempo</div>
            <div className="space-y-1.5">
              {['Recibido', 'Asignado', 'En Gestión', 'Resuelto', 'Cerrado'].map((step, idx) => {
                const statusOrder: Record<string, number> = {
                  'Recibido': 0,
                  'Asignado': 1,
                  'En Gestión': 2,
                  'Resuelto': 3,
                  'Cerrado': 4,
                };
                const currentIdx = statusOrder[selectedTicket.status] ?? 0;
                const done = idx <= currentIdx;
                const baseDate = new Date(selectedTicket.created_at);
                const stepDate = new Date(baseDate.getTime() + idx * 2 * 60 * 60 * 1000);
                return (
                  <div key={step} className="flex items-center gap-2 text-[11.5px]">
                    <div className={`w-2.5 h-2.5 rounded-full ${done ? 'bg-[#10B981]' : 'bg-[#E5E7EB]'}`} />
                    <span className={`${done ? 'text-[#111827]' : 'text-[#9CA3AF]'}`}>
                      {step}
                    </span>
                    <span className="text-[#9CA3AF] ml-auto">
                      {done ? stepDate.toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
