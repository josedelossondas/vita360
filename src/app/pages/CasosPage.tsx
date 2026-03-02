import { mockCases } from '../data/mockData';
import { Link } from 'react-router';
import { useState } from 'react';

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

export default function CasosPage() {
  const [filter, setFilter] = useState('todos');
  const [area, setArea] = useState('todas');

  const areas = Array.from(new Set(mockCases.map(c => c.area)));
  const filtered = mockCases.filter(c => {
    if (filter !== 'todos' && c.status !== filter) return false;
    if (area !== 'todas' && c.area !== area) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1>Todos los Casos</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Vista completa del registro de casos ciudadanos</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors">
          + Nuevo Caso
        </button>
      </div>

      <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex gap-3 flex-wrap">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[13px] outline-none focus:border-primary cursor-pointer">
            <option value="todos">Todos los estados</option>
            <option value="abierto">Abierto</option>
            <option value="en-proceso">En proceso</option>
            <option value="resuelto">Resuelto</option>
          </select>
          <select value={area} onChange={e => setArea(e.target.value)}
            className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[13px] outline-none focus:border-primary cursor-pointer">
            <option value="todas">Todas las áreas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr>
                {['ID', 'Título', 'Tipo', 'Urgencia IA', 'Área', 'SLA Restante', 'Estado', 'Reportado por'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11.5px] text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(caso => (
                <tr key={caso.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link to={`/casos/${caso.id}`} className="text-[12.5px] text-primary font-medium font-mono hover:underline">
                      {caso.id}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] max-w-[200px] truncate">{caso.title}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-[13px]">
                      {caso.type}
                      {caso.isRecurring && (
                        <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 text-[10.5px] rounded-md font-medium">
                          Reinc.
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><UrgencyBadge value={caso.urgencyAI} /></td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{caso.area}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[12.5px] font-mono font-medium ${
                      caso.slaRemaining < 12 ? 'text-red-600' : caso.slaRemaining < 24 ? 'text-amber-600' : 'text-muted-foreground'
                    }`}>{caso.slaRemaining}h / {caso.slaTotal}h</span>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={caso.status} /></td>
                  <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{caso.reportedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
