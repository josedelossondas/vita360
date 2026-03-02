import { useState } from 'react';
import { mockWorkOrders } from '../data/mockData';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pendiente: ['bg-amber-50 text-amber-700 border border-amber-200', 'Pendiente'],
    'en-progreso': ['bg-blue-50 text-blue-700 border border-blue-200', 'En Progreso'],
    completada: ['bg-green-50 text-green-700 border border-green-200', 'Completada'],
    cancelada: ['bg-gray-100 text-gray-600', 'Cancelada'],
  };
  const [cls, label] = map[status] || ['bg-gray-100 text-gray-600', status];
  return <span className={`px-2 py-0.5 rounded-md text-[11.5px] font-medium ${cls}`}>{label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    alta: 'bg-red-50 text-red-700 border border-red-200',
    media: 'bg-amber-50 text-amber-700 border border-amber-200',
    baja: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11.5px] font-medium capitalize ${map[priority] || 'bg-gray-100 text-gray-600'}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

export default function OrdenesTrabajoPage() {
  const [sortBy, setSortBy] = useState<'priority' | 'sla' | 'status'>('priority');

  const sortedOrders = [...mockWorkOrders].sort((a, b) => {
    if (sortBy === 'priority') {
      const o = { alta: 3, media: 2, baja: 1 };
      return (o[b.priority] || 0) - (o[a.priority] || 0);
    }
    if (sortBy === 'sla') return a.slaTechnical - b.slaTechnical;
    return 0;
  });

  const stats = [
    { label: 'Pendientes', value: mockWorkOrders.filter(o => o.status === 'pendiente').length, color: 'text-amber-600' },
    { label: 'En Progreso', value: mockWorkOrders.filter(o => o.status === 'en-progreso').length, color: 'text-primary' },
    { label: 'Completadas', value: mockWorkOrders.filter(o => o.status === 'completada').length, color: 'text-green-600' },
    { label: 'SLA en riesgo', value: mockWorkOrders.filter(o => o.slaTechnical < 12 && o.status !== 'completada').length, color: 'text-red-600' },
  ];

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1>Órdenes de Trabajo</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Gestión de órdenes técnicas y asignación de cuadrillas</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors">
          + Nueva Orden
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {stats.map(s => (
          <div key={s.label} className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-5 shadow-xl">
            <div className="text-[12.5px] text-muted-foreground mb-2">{s.label}</div>
            <div className={`text-3xl font-semibold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Trazabilidad */}
      <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-xl p-5 mb-5">
        <h3 className="text-[14px] font-semibold mb-4">Flujo de Trazabilidad</h3>
        <div className="flex items-center gap-4">
          {[
            { num: '1', label: 'Caso', sub: 'Recibido', done: true },
            { num: '2', label: 'Orden de Trabajo', sub: 'Generada', done: true },
            { num: '3', label: 'Cuadrilla', sub: 'Asignada', done: true },
            { num: '4', label: 'Trabajo', sub: 'En terreno', done: false },
            { num: '5', label: 'Cierre', sub: 'Verificado', done: false },
          ].map((step, i, arr) => (
            <div key={step.num} className="flex items-center gap-4 flex-1 last:flex-none">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${step.done ? 'bg-primary text-white' : 'bg-secondary border-2 border-border text-muted-foreground'}`}>
                  {step.num}
                </div>
                <div className={`text-[12px] mt-1.5 font-medium ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</div>
                <div className="text-[11px] text-muted-foreground">{step.sub}</div>
              </div>
              {i < arr.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">Órdenes Activas</h2>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[13px] outline-none focus:border-primary cursor-pointer">
            <option value="priority">Ordenar: Prioridad</option>
            <option value="sla">Ordenar: SLA Técnico</option>
            <option value="status">Ordenar: Estado</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr>
                {['ID Orden', 'Caso', 'Activo', 'Cuadrilla', 'SLA Técnico', 'Prioridad', 'Estado'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11.5px] text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedOrders.map(o => (
                <tr key={o.id} className="hover:bg-secondary/40 transition-colors cursor-pointer">
                  <td className="px-5 py-3.5 text-[12.5px] text-primary font-medium font-mono">{o.id}</td>
                  <td className="px-5 py-3.5 text-[12.5px] text-muted-foreground font-mono">{o.caseId}</td>
                  <td className="px-5 py-3.5 text-[13px]">{o.asset}</td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{o.crew}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[12.5px] font-mono font-medium ${o.slaTechnical < 12 ? 'text-red-600' : o.slaTechnical < 24 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {o.slaTechnical}h
                    </span>
                  </td>
                  <td className="px-5 py-3.5"><PriorityBadge priority={o.priority} /></td>
                  <td className="px-5 py-3.5"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
