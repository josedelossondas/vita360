import { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../../context/AuthContext';
import { RefreshCw, UserCheck, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface Evidence {
  image_url: string;
  description: string;
  created_at: string;
}

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  urgency_level: string;
  priority_score: number;
  area_name: string;
  assigned_to: string | null;
  planned_date: string;
  created_at: string;
  reported_by: string;
  reported_by_email: string;
  evidences: Evidence[];
}

const EQUIPOS = [
  'Cuadrilla Áreas Verdes',
  'Equipo Aseo y Limpieza',
  'Brigada Infraestructura',
  'Equipo Eléctrico',
  'Equipo Obras Sanitarias',
  'Equipo General',
];

const STATUS_FLOW = ['Recibido', 'Asignado', 'En Gestión', 'Resuelto', 'Cerrado'];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Recibido: 'bg-blue-50 text-blue-700 border border-blue-200',
    Asignado: 'bg-purple-50 text-purple-700 border border-purple-200',
    'En Gestión': 'bg-amber-50 text-amber-700 border border-amber-200',
    Resuelto: 'bg-green-50 text-green-700 border border-green-200',
    Cerrado: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11.5px] font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function UrgencyBar({ score }: { score: number }) {
  const color = score >= 85 ? 'bg-red-500' : score >= 60 ? 'bg-amber-500' : 'bg-green-500';
  const text = score >= 85 ? 'text-red-600' : score >= 60 ? 'text-amber-600' : 'text-green-600';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[12px] font-mono font-medium ${text}`}>{score}</span>
    </div>
  );
}

export default function OperadorPage() {
  const { token, user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterArea, setFilterArea] = useState('todas');
  const [assignTeam, setAssignTeam] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [expandedEvidences, setExpandedEvidences] = useState<number | null>(null);

  const fetchTickets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTickets(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchTickets(); }, [token]);

  const areas = Array.from(new Set(tickets.map(t => t.area_name).filter(Boolean)));

  const filtered = tickets.filter(t => {
    if (filterStatus !== 'todos' && t.status !== filterStatus) return false;
    if (filterArea !== 'todas' && t.area_name !== filterArea) return false;
    return true;
  });

  const handleAssign = async () => {
    if (!token || !selectedTicket || !assignTeam) return;
    setAssigning(true);
    try {
      const res = await fetch(`${API_URL}/tickets/${selectedTicket.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assigned_to: assignTeam }),
      });
      if (res.ok) {
        await fetchTickets();
        const freshTickets = await (await fetch(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${token}` } })).json();
        const updated = freshTickets.find((t: Ticket) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!token || !selectedTicket) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API_URL}/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchTickets();
        const freshTickets = await (await fetch(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${token}` } })).json();
        const updated = freshTickets.find((t: Ticket) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Contadores KPI
  const countByStatus = (s: string) => tickets.filter(t => t.status === s).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Panel Operador</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Hola, <span className="font-medium">{user?.name}</span> — Gestión y seguimiento de solicitudes ciudadanas</p>
        </div>
        <button onClick={fetchTickets} disabled={loading}
          className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total', count: tickets.length, color: 'text-foreground', bg: 'bg-white' },
          { label: 'Recibidos', count: countByStatus('Recibido'), color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Asignados', count: countByStatus('Asignado'), color: 'text-purple-700', bg: 'bg-purple-50' },
          { label: 'En Gestión', count: countByStatus('En Gestión'), color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Resueltos', count: countByStatus('Resuelto'), color: 'text-green-700', bg: 'bg-green-50' },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`rounded-xl border border-border shadow-sm p-4 ${bg}`}>
            <div className="text-[11.5px] text-muted-foreground mb-1">{label}</div>
            <div className={`text-2xl font-semibold ${color}`}>{count}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-5">
        {/* Tabla tickets */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex gap-3 flex-wrap items-center">
            <h2 className="text-[13.5px] font-semibold flex-1">Solicitudes ({filtered.length})</h2>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[13px] outline-none focus:border-primary cursor-pointer">
              <option value="todos">Todos los estados</option>
              {STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
              className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[13px] outline-none focus:border-primary cursor-pointer">
              <option value="todas">Todas las áreas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  {['#', 'Título', 'Urgencia', 'Área', 'Equipo', 'Estado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11.5px] text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(ticket => (
                  <tr key={ticket.id}
                    onClick={() => setSelectedTicket(ticket === selectedTicket ? null : ticket)}
                    className={`cursor-pointer hover:bg-secondary/50 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-primary/5' : ''}`}>
                    <td className="px-4 py-3 text-[12px] font-mono text-muted-foreground">#{ticket.id}</td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium text-foreground truncate max-w-[180px]">{ticket.title}</div>
                      <div className="text-[11.5px] text-muted-foreground">por {ticket.reported_by}</div>
                    </td>
                    <td className="px-4 py-3"><UrgencyBar score={ticket.priority_score} /></td>
                    <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{ticket.area_name || '—'}</td>
                    <td className="px-4 py-3 text-[12.5px] text-muted-foreground">{ticket.assigned_to || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                      {loading ? 'Cargando...' : 'No hay solicitudes con estos filtros'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel de gestión */}
        {selectedTicket ? (
          <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-5 sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto">
            {/* Info básica */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11.5px] text-muted-foreground font-mono">#{selectedTicket.id}</span>
                <StatusBadge status={selectedTicket.status} />
                <UrgencyBar score={selectedTicket.priority_score} />
              </div>
              <h2 className="text-[14px] font-semibold mb-1">{selectedTicket.title}</h2>
              <p className="text-[12.5px] text-muted-foreground">{selectedTicket.description}</p>
            </div>

            {/* Detalles */}
            <div className="space-y-2 text-[12.5px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Solicitante</span>
                <span className="font-medium">{selectedTicket.reported_by}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="text-muted-foreground">{selectedTicket.reported_by_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Área clasificada</span>
                <span className="font-medium">{selectedTicket.area_name || '—'}</span>
              </div>
              {selectedTicket.assigned_to && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Equipo actual</span>
                  <span className="font-medium text-purple-700">{selectedTicket.assigned_to}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha límite</span>
                <span>{new Date(selectedTicket.planned_date).toLocaleDateString('es-CL')}</span>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Asignar equipo */}
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2.5">Asignar equipo</div>
              <div className="space-y-2">
                <select value={assignTeam} onChange={e => setAssignTeam(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-background">
                  <option value="">Seleccionar equipo...</option>
                  {EQUIPOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <button onClick={handleAssign} disabled={!assignTeam || assigning}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  <UserCheck className="w-4 h-4" />
                  {assigning ? 'Asignando...' : 'Asignar equipo'}
                </button>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Cambiar estado */}
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2.5">Cambiar estado</div>
              <div className="space-y-1.5">
                {STATUS_FLOW.map(s => {
                  const currentIdx = STATUS_FLOW.indexOf(selectedTicket.status);
                  const idx = STATUS_FLOW.indexOf(s);
                  const isCurrent = s === selectedTicket.status;
                  const isNext = idx === currentIdx + 1;
                  return (
                    <button
                      key={s}
                      onClick={() => handleUpdateStatus(s)}
                      disabled={updatingStatus || isCurrent || idx < currentIdx}
                      className={`w-full text-left px-3 py-2 rounded-lg text-[13px] border transition-colors ${
                        isCurrent
                          ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                          : isNext
                          ? 'border-border hover:border-green-400 hover:bg-green-50 hover:text-green-700 cursor-pointer'
                          : idx < currentIdx
                          ? 'border-border text-muted-foreground/50 cursor-not-allowed bg-secondary'
                          : 'border-border text-muted-foreground hover:border-primary hover:text-foreground cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-primary' : idx < currentIdx ? 'bg-green-500' : 'bg-border'}`} />
                        {s}
                        {isCurrent && <span className="ml-auto text-[11px] text-primary/70">actual</span>}
                        {isNext && <span className="ml-auto text-[11px] text-green-600">← marcar</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              {updatingStatus && (
                <p className="text-[12px] text-muted-foreground mt-2 text-center">Actualizando estado...</p>
              )}
            </div>

            {/* Evidencias */}
            {selectedTicket.evidences?.length > 0 && (
              <>
                <div className="h-px bg-border" />
                <div>
                  <button
                    onClick={() => setExpandedEvidences(expandedEvidences === selectedTicket.id ? null : selectedTicket.id)}
                    className="w-full flex items-center justify-between text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2">
                    Evidencias del ciudadano ({selectedTicket.evidences.length})
                    {expandedEvidences === selectedTicket.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {expandedEvidences === selectedTicket.id && (
                    <div className="space-y-2">
                      {selectedTicket.evidences.map((ev, i) => (
                        <div key={i} className="border border-border rounded-lg overflow-hidden">
                          {ev.image_url && (
                            <img src={ev.image_url} alt={`Evidencia ${i + 1}`} className="w-full object-cover max-h-40" />
                          )}
                          {ev.description && (
                            <div className="px-3 py-2 text-[12px] text-muted-foreground">{ev.description}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border shadow-sm p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-[13px] text-muted-foreground">Selecciona un ticket para gestionar, asignar equipo y actualizar estado</p>
          </div>
        )}
      </div>
    </div>
  );
}
