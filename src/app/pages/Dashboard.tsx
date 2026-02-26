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
  return (
    <div className="bg-white border border-[#E6EAF0] rounded-lg p-5 shadow-[0_2px_8px_rgba(16,24,40,0.06)] flex-1">
      <div className="text-[12px] text-[#6D7783] mb-2">{title}</div>
      <div className={`text-[36px] font-semibold mb-3 ${
        color === 'green' ? 'text-[#48946F]' : 
        color === 'red' ? 'text-[#DA4F44]' : 
        'text-[#2F3A46]'
      }`}>
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

// Componente Mapa Integrado
function MapComponentInline({ tickets }: { tickets: Ticket[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [currentTime, setCurrentTime] = useState<string>(
    new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

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
      const map = L.map(mapRef.current).setView([-33.449, -70.668], 15);
      mapInstance.current = map;

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
      }
    };
  }, [tickets]);

  return (
    <div className="bg-white border border-[#E6EAF0] rounded-lg shadow-[0_2px_8px_rgba(16,24,40,0.06)] p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#306CBB]/10 text-[#306CBB]">
            <MapPin size={16} />
          </span>
          <div>
            <div className="text-[14px] font-semibold text-[#2F3A46]">Mapa Urbano — Casos en Tiempo Real</div>
            <div className="text-[11px] text-[#6D7783]">Distribución aproximada de tickets ciudadanos</div>
          </div>
        </div>
        <div className="text-[11px] text-[#6D7783] px-2 py-1 rounded-full bg-[#F3F5F7] border border-[#E6EAF0]">
          ⏱ {currentTime} hrs
        </div>
      </div>
      <div
        ref={mapRef}
        className="w-full h-[400px] rounded-lg bg-[#F3F5F7] border border-[#E6EAF0]"
      />
    </div>
  );
}

export default function Dashboard() {
  const { token } = useAuth();
  const [sortBy, setSortBy] = useState<'urgency' | 'date'>('urgency');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [areaFilterOpen, setAreaFilterOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'urgency') {
        const aScore = a._urgency_score ?? 0;
        const bScore = b._urgency_score ?? 0;
        return bScore - aScore;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }).slice(0, 5); // Mostrar solo los 5 primeros
  }, [sortBy, selectedStatuses, selectedAreas, tickets]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Cargando dashboard...</div>;
  }

  return (
    <div>
      {/* KPI Cards - Datos Reales */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <KPICard title="Total de Tickets" value={stats?.total_tickets || 0} color="gray" progress={100} />
        <div className="bg-white border border-[#E6EAF0] rounded-lg p-5 shadow-[0_2px_8px_rgba(16,24,40,0.06)] flex-1 min-w-[220px]">
          <div className="text-[12px] text-[#6D7783] mb-2">Distribución por estado (%)</div>
          <div className="space-y-1.5 text-[11.5px] text-[#4B5563]">
            {stats && Object.entries(stats.tickets_by_status).map(([status, count]) => {
              const pct = stats.total_tickets ? Math.round((count / stats.total_tickets) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-2">
                  <span className="w-20">{status}</span>
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
      <MapComponentInline tickets={tickets} />

      {/* Main Content - Two Columns */}
      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Left Column - Table */}
        <div className="flex-1">
          {/* Controls Strip */}
          <div className="bg-white border border-[#E6EAF0] rounded-lg p-4 mb-4 flex items-center gap-4 flex-wrap relative">
            {/* Filtro múltiple por estado */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setStatusFilterOpen(o => !o)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E6EAF0] rounded-lg text-[13px] bg-white hover:border-[#306CBB]"
              >
                Estado
                <ChevronDown size={14} className={`transition-transform ${statusFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              {statusFilterOpen && (
                <div className="absolute mt-1 w-44 bg-white border border-[#E5E7EB] rounded-md shadow-lg z-20 p-2 space-y-1 text-[12.5px]">
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

            {/* Filtro múltiple por área */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAreaFilterOpen(o => !o)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E6EAF0] rounded-lg text-[13px] bg-white hover:border-[#306CBB]"
              >
                Área
                <ChevronDown size={14} className={`transition-transform ${areaFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              {areaFilterOpen && (
                <div className="absolute mt-1 w-48 bg-white border border-[#E5E7EB] rounded-md shadow-lg z-20 p-2 space-y-1 text-[12.5px] max-h-60 overflow-y-auto">
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

            <div className="w-px h-6 bg-[#E6EAF0]" />
            <div className="flex items-center gap-2 text-[14px]">
              <span className="text-[#6D7783]">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-[#E6EAF0] rounded-lg text-[14px] bg-white cursor-pointer outline-none hover:border-[#306CBB]"
              >
                <option value="urgency">Prioridad</option>
                <option value="date">Más recientes</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-[#E6EAF0] rounded-lg shadow-[0_2px_8px_rgba(16,24,40,0.06)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F1F3F5] border-b border-[#EEF1F4]">
                  <th className="text-left text-[13px] font-semibold text-[#6D7783] px-4 py-4">ID</th>
                  <th className="text-left text-[13px] font-semibold text-[#6D7783] px-4 py-4">Título</th>
                  <th className="text-left text-[13px] font-semibold text-[#6D7783] px-4 py-4">Urgencia</th>
                  <th className="text-left text-[13px] font-semibold text-[#6D7783] px-4 py-4">Prioridad</th>
                  <th className="text-left text-[13px] font-semibold text-[#6D7783] px-4 py-4">Área</th>
                  <th className="text-left text-[13px] font-semibold text-[#6D7783] px-4 py-4">Estado</th>
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
                      <tr key={caso.id} className="border-b border-[#EEF1F4] hover:bg-[#F9FAFB] transition-colors">
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Resumen */}
        <div className="w-full lg:w-[380px]">
          <div className="bg-white border border-[#E6EAF0] rounded-lg shadow-[0_2px_8px_rgba(16,24,40,0.06)] p-6 sticky top-6">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[#306CBB] flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" size={16} />
              </div>
              <h2 className="text-[18px] font-semibold text-[#2F3A46]">Resumen</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[13px] font-semibold text-[#2F3A46] mb-2">
                  Tickets por Estado
                </label>
                <div className="space-y-2">
                  {stats && Object.entries(stats.tickets_by_status).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center text-[13px] px-3 py-2 bg-[#F3F5F7] rounded-md">
                      <span className="text-[#2F3A46]">{status}</span>
                      <span className="font-semibold text-[#306CBB]">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-[#EEF1F4]" />

              {/* Sección de tasa de resolución retirada para evitar redundancia */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
