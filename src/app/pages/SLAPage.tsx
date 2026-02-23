export default function SLAPage() {
  const slaByArea = [
    { area: 'Infraestructura', total: 45, pct: 78, avg: '22h', status: 'warning' },
    { area: 'Aseo', total: 38, pct: 95, avg: '10h', status: 'success' },
    { area: 'Espacios Públicos', total: 31, pct: 87, avg: '16h', status: 'success' },
    { area: 'Alumbrado', total: 24, pct: 92, avg: '14h', status: 'success' },
    { area: 'Tránsito', total: 20, pct: 60, avg: '30h', status: 'danger' },
  ];

  const slaByType = [
    { type: 'Vereda dañada', sla: '48h', pct: 75, color: '#16A34A' },
    { type: 'Árbol en riesgo', sla: '24h', pct: 82, color: '#16A34A' },
    { type: 'Contenedor desborde', sla: '24h', pct: 68, color: '#D97706' },
    { type: 'Iluminación', sla: '72h', pct: 91, color: '#16A34A' },
    { type: 'Bache', sla: '48h', pct: 72, color: '#16A34A' },
  ];

  const statusStyle: Record<string, string> = {
    success: 'bg-green-50 text-green-700 border border-green-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-red-50 text-red-700 border border-red-200',
  };
  const statusLabel: Record<string, string> = { success: 'Bueno', warning: 'Moderado', danger: 'Crítico' };

  return (
    <div>
      <div className="mb-5">
        <h1>Gestión de SLA</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Monitoreo de acuerdos de nivel de servicio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: '% Cumplimiento SLA', value: '89%', color: 'text-green-600', bar: 89, barColor: 'bg-green-500', change: '+3% vs mes anterior' },
          { label: 'Casos dentro del SLA', value: '141', color: 'text-green-600', bar: 89, barColor: 'bg-green-500' },
          { label: 'Casos fuera del SLA', value: '17', color: 'text-red-600', bar: 11, barColor: 'bg-red-500' },
          { label: 'Tiempo promedio resolución', value: '18h', color: 'text-primary', bar: 60, barColor: 'bg-primary' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-border p-5 shadow-sm">
            <div className="text-[12.5px] text-muted-foreground mb-2">{k.label}</div>
            <div className={`text-3xl font-semibold mb-2 ${k.color}`}>{k.value}</div>
            <div className="h-1 rounded-full bg-border mb-2 overflow-hidden">
              <div className={`h-full rounded-full ${k.barColor}`} style={{ width: `${k.bar}%` }} />
            </div>
            {k.change && <div className="text-[11.5px] text-muted-foreground">{k.change}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-5">
        {/* Table by area */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[14px] font-semibold">SLA por Área</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  {['Área', 'Total Casos', 'Cumplimiento', 'Tiempo Promedio', 'Estado'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11.5px] text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {slaByArea.map(row => (
                  <tr key={row.area} className="hover:bg-secondary/40 transition-colors">
                    <td className="px-5 py-3.5 text-[13px] font-medium">{row.area}</td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{row.total}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: row.pct >= 85 ? '#16A34A' : row.pct >= 70 ? '#D97706' : '#DC2626' }} />
                        </div>
                        <span className={`text-[12.5px] font-mono font-medium ${row.pct >= 85 ? 'text-green-600' : row.pct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{row.pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-muted-foreground font-mono">{row.avg}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-md text-[11.5px] font-medium ${statusStyle[row.status]}`}>
                        {statusLabel[row.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary + by type */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-border shadow-sm p-5 text-center">
            <div className="text-[52px] font-bold text-green-600 leading-none mb-1">89%</div>
            <div className="text-[13px] text-muted-foreground mb-4">Cumplimiento global SLA</div>
            <div className="h-px bg-border mb-4" />
            {[
              { label: 'Dentro del SLA', val: '141', cls: 'bg-green-50 text-green-700 border border-green-200' },
              { label: 'Fuera del SLA', val: '17', cls: 'bg-red-50 text-red-700 border border-red-200' },
              { label: 'En riesgo (próx. 2h)', val: '8', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between py-2 border-b border-border last:border-b-0 text-[13px]">
                <span>{r.label}</span>
                <span className={`px-2 py-0.5 rounded-md text-[11.5px] font-medium ${r.cls}`}>{r.val}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-[13.5px] font-semibold mb-4">SLA por tipo de caso</h3>
            {slaByType.map(t => (
              <div key={t.type} className="mb-3 last:mb-0">
                <div className="flex justify-between text-[12.5px] mb-1.5">
                  <span className="text-foreground">{t.type}</span>
                  <span className="text-muted-foreground font-mono">{t.sla}</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${t.pct}%`, backgroundColor: t.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
