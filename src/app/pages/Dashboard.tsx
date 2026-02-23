import { AlertTriangle, TrendingUp, Clock, AlertCircle, Zap } from 'lucide-react';
import { useState, useMemo } from 'react';
import { mockCases } from '../data/mockData';
import { Link } from 'react-router';

function KPICard({ title, value, change, status, bar }: {
  title: string; value: string | number; change?: string;
  status: 'success' | 'warning' | 'danger' | 'neutral'; bar?: number;
}) {
  const colors = {
    success: 'text-green-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
    neutral: 'text-primary',
  };
  const barColors = {
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    neutral: 'bg-primary',
  };
  return (
    <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
      <div className="text-[12.5px] text-muted-foreground mb-2">{title}</div>
      <div className={`text-3xl font-semibold mb-2 ${colors[status]}`}>{value}</div>
      {bar !== undefined && (
        <div className="h-1 rounded-full bg-border mb-2 overflow-hidden">
          <div className={`h-full rounded-full ${barColors[status]}`} style={{ width: `${bar}%` }} />
        </div>
      )}
      {change && <div className="text-[11.5px] text-muted-foreground">{change}</div>}
    </div>
  );
}

function UrgencyBadge({ value }: { value: number }) {
  const color = value >= 80 ? 'text-red-600' : value >= 60 ? 'text-amber-600' : 'text-green-600';
  const bg = value >= 80 ? 'bg-red-500' : value >= 60 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-10 h-1.5 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full ${bg}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-[12px] font-mono font-medium ${color}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    abierto: ['bg-blue-50 text-blue-700 border border-blue-200', 'Abierto'],
    'en-proceso': ['bg-amber-50 text-amber-700 border border-amber-200', 'En Proceso'],
    resuelto: ['bg-green-50 text-green-700 border border-green-200', 'Resuelto'],
    cerrado: ['bg-gray-100 text-gray-600', 'Cerrado'],
  };
  const [cls, label] = map[status] || ['bg-gray-100 text-gray-600', status];
  return <span className={`px-2 py-0.5 rounded-md text-[11.5px] font-medium ${cls}`}>{label}</span>;
}

export default function Dashboard() {
  const [sortBy, setSortBy] = useState<'urgency' | 'sla' | 'date'>('urgency');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterArea, setFilterArea] = useState('todas');

  const casesOpenToday = mockCases.filter(c => {
    const today = new Date('2026-02-23').toDateString();
    return new Date(c.createdAt).toDateString() === today && c.status !== 'cerrado';
  }).length;
  const casesAtRisk = mockCases.filter(c => c.slaRemaining < 12 && c.status !== 'resuelto').length;
  const areas = Array.from(new Set(mockCases.map(c => c.area)));

  const filteredCases = useMemo(() => {
    let filtered = mockCases.filter(c => {
      if (filterStatus !== 'todos' && c.status !== filterStatus) return false;
      if (filterArea !== 'todas' && c.area !== filterArea) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      if (sortBy === 'urgency') return b.urgencyAI - a.urgencyAI;
      if (sortBy === 'sla') return a.slaRemaining - b.slaRemaining;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [sortBy, filterStatus, filterArea]);

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <KPICard title="Casos abiertos hoy" value={casesOpenToday} change="+12% vs ayer" status="neutral" bar={65} />
        <KPICard title="% Resueltos en 1er contacto" value="82%" change="+5% vs semana anterior" status="success" bar={82} />
        <KPICard title="Tiempo Promedio de Respuesta" value="2h 15m" change="–0.8h vs meta" status="warning" bar={55} />
        <KPICard title="Casos en riesgo de incumplir SLA" value={casesAtRisk} change="Requieren atención urgente" status="danger" bar={30} />
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-5">
        {/* Tabla */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[14px] font-semibold mb-3">Casos Activos</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[13px] text-foreground outline-none focus:border-primary cursor-pointer">
                <option value="urgency">Ordenar: Riesgo IA</option>
                <option value="sla">Ordenar: SLA restante</option>
                <option value="date">Ordenar: Más recientes</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[13px] text-foreground outline-none focus:border-primary cursor-pointer">
                <option value="todos">Todos los estados</option>
                <option value="abierto">Abierto</option>
                <option value="en-proceso">En proceso</option>
                <option value="resuelto">Resuelto</option>
              </select>
              <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
                className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[13px] text-foreground outline-none focus:border-primary cursor-pointer">
                <option value="todas">Todas las áreas</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  {['ID', 'Tipo', 'Urgencia IA', 'Área Asignada', 'SLA Restante', 'Estado'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11.5px] text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCases.map(caso => (
                  <tr key={caso.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link to={`/casos/${caso.id}`} className="text-[12.5px] text-primary font-medium font-mono hover:underline">
                        {caso.id}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 text-[13px]">
                        {caso.type}
                        {caso.isRecurring && (
                          <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 text-[10.5px] rounded-md font-medium">
                            Reincidencia
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><UrgencyBadge value={caso.urgencyAI} /></td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{caso.area}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[12.5px] font-mono font-medium ${
                        caso.slaRemaining < 12 ? 'text-red-600' : caso.slaRemaining < 24 ? 'text-amber-600' : 'text-muted-foreground'
                      }`}>
                        {caso.slaRemaining}h / {caso.slaTotal}h
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={caso.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Status flow */}
          <div className="px-5 py-3.5 border-t border-border bg-secondary/30">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: 'Recibido', done: true },
                { label: 'Asignado', done: true },
                { label: 'En Gestión', done: true },
                { label: 'Resuelto', done: false },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    {step.done ? (
                      <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-border" />
                    )}
                    <span className={`text-[12px] ${step.done ? 'text-green-700 font-medium' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && <span className="text-border text-[12px]">→</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Triage IA */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-[14px] font-semibold">Triage Automático</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Mensaje del Vecino</div>
              <div className="p-3 bg-secondary border border-border rounded-lg text-[13px] text-foreground italic leading-relaxed">
                "Hay un árbol grande, está por caer en la calle..."
              </div>
            </div>

            <div className="h-px bg-border" />

            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Clasificación</div>
              <span className="px-3 py-1.5 bg-primary text-white rounded-lg text-[13px] font-medium inline-block">
                Árbol en Riesgo
              </span>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Área Sugerida</div>
              <span className="px-3 py-1.5 bg-accent text-primary border border-primary/20 rounded-lg text-[13px] font-medium inline-block">
                Espacios Públicos
              </span>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Prioridad</div>
              <span className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[13px] font-medium inline-block">
                Alta
              </span>
            </div>

            <div className="h-px bg-border" />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Nivel IA</div>
                <span className="text-[12.5px] font-mono font-semibold text-red-600">92/100</span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full bg-red-500" style={{ width: '92%' }} />
              </div>
              <p className="text-[11.5px] text-muted-foreground mt-1.5">
                Alta prioridad por frecuencia y ubicación de riesgo
              </p>
            </div>

            <div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Respuesta Sugerida</div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-[12.5px] text-green-900 leading-relaxed">
                "Hemos recibido su reporte. Un equipo de áreas verdes será enviado de manera prioritaria."
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
              <span className="text-[12px] text-orange-700 font-medium">Reincidencia detectada – 4 reclamos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
