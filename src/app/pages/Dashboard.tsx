import { 
  AlertTriangle, 
  Clock, 
  Check, 
  Filter, 
  ChevronDown,
  MapPin,
  FileQuestion,
  Zap,
  Map as MapIcon,
  X as CloseIcon,
  ChevronRight
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth, API_URL } from '../../context/AuthContext';
import { Link } from 'react-router';

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
}

interface DashboardStats {
  total_tickets: number;
  tickets_by_status: Record<string, number>;
  avg_response_time: string;
  resolution_rate: number;
  tickets_at_risk: number;
}

const mapUrgencyToLabel = (urgency: number): string => {
  if (urgency >= 80) return 'Crítica';
  if (urgency >= 60) return 'Alta';
  return 'Media';
};

const mapUrgencyToColor = (urgency: number): string => {
  if (urgency >= 80) return 'bg-[#DA4F44]';
  if (urgency >= 60) return 'bg-[#F2B23A]';
  return 'bg-[#F2A23A]';
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
    <div 
      ref={mapRef} 
      className="w-full h-[400px] rounded-lg bg-[#F3F5F7] border border-[#E6EAF0]"
    />
  );
}

export default function Dashboard() {
  const { token } = useAuth();
  const [sortBy, setSortBy] = useState<'urgency' | 'date'>('urgency');
  const [filterStatus, setFilterStatus] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Obtener tickets
      const ticketsRes = await fetch(`${API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        setTickets(ticketsData);
        
        // Calcular stats
        const stats: DashboardStats = {
          total_tickets: ticketsData.length,
          tickets_by_status: ticketsData.reduce((acc: Record<string, number>, t: Ticket) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
          }, {}),
          avg_response_time: '2h 15m',
          resolution_rate: ticketsData.filter((t: Ticket) => t.status === 'Resuelto').length / ticketsData.length * 100 || 0,
          tickets_at_risk: ticketsData.filter((t: Ticket) => t.status !== 'Resuelto' && t.urgency_level === 'Alta').length,
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
      if (filterStatus && c.status !== filterStatus) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'urgency') {
        const urgencyOrder: Record<string, number> = { 'Alta': 0, 'Media': 1, 'Baja': 2 };
        return (urgencyOrder[a.urgency_level] || 3) - (urgencyOrder[b.urgency_level] || 3);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }).slice(0, 5); // Mostrar solo los 5 primeros
  }, [sortBy, filterStatus, tickets]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Cargando dashboard...</div>;
  }

  return (
    <div>
      {/* KPI Cards - Datos Reales */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <KPICard title="Total de Tickets" value={stats?.total_tickets || 0} color="gray" progress={100} />
        <KPICard 
          title="% Resueltos" 
          value={`${Math.round(stats?.resolution_rate || 0)}%`} 
          color="green" 
          progress={stats?.resolution_rate || 0} 
        />
        <KPICard title="Tiempo Promedio Respuesta" value={stats?.avg_response_time || '-'} color="gray" progress={60} />
        <KPICard title="Tickets en Riesgo" value={stats?.tickets_at_risk || 0} color="red" progress={35} />
      </div>

      {/* Botón Mapa */}
      <div className="mb-6">
        <button
          onClick={() => setShowMap(!showMap)}
          className="flex items-center gap-2 px-4 py-2 bg-[#306CBB] text-white rounded-lg text-[14px] font-medium hover:bg-[#2555a0] transition-colors"
        >
          <MapIcon size={16} />
          {showMap ? 'Ocultar Mapa' : 'Ver Mapa Urbano'}
          <ChevronDown size={16} className={`transition-transform ${showMap ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Panel Mapa - Integrado */}
      {showMap && (
        <div className="bg-white border border-[#E6EAF0] rounded-lg shadow-[0_2px_8px_rgba(16,24,40,0.06)] p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-semibold text-[#2F3A46]">Mapa Urbano — Casos en Tiempo Real</h2>
            <button 
              onClick={() => setShowMap(false)}
              className="p-1 hover:bg-[#f0f0f0] rounded"
            >
              <CloseIcon size={18} />
            </button>
          </div>
          <MapComponentInline tickets={tickets} />
        </div>
      )}

      {/* Main Content - Two Columns */}
      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Left Column - Table */}
        <div className="flex-1">
          {/* Controls Strip */}
          <div className="bg-white border border-[#E6EAF0] rounded-lg p-4 mb-4 flex items-center gap-4 flex-wrap">
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-[#E6EAF0] rounded-lg text-[14px] bg-white cursor-pointer outline-none hover:border-[#306CBB]"
            >
              <option value="">Todos los estados</option>
              <option value="Recibido">Recibido</option>
              <option value="Asignado">Asignado</option>
              <option value="En Gestión">En Gestión</option>
              <option value="Resuelto">Resuelto</option>
            </select>
            <div className="w-px h-6 bg-[#E6EAF0]" />
            <div className="flex items-center gap-2 text-[14px]">
              <span className="text-[#6D7783]">Ordenar por:</span>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-[#E6EAF0] rounded-lg text-[14px] bg-white cursor-pointer outline-none hover:border-[#306CBB]"
              >
                <option value="urgency">Urgencia</option>
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

              <div>
                <label className="block text-[13px] font-semibold text-[#2F3A46] mb-2">
                  Tasa de Resolución
                </label>
                <div className="bg-[#F3F5F7] border border-[#E6EAF0] rounded-md p-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-bold text-[#48946F]">
                      {Math.round(stats?.resolution_rate || 0)}%
                    </span>
                    <span className="text-[12px] text-[#6D7783]">resueltos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
