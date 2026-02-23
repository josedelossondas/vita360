import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { mockAnalytics } from '../data/mockData';

const monthlyCases = [
  { mes: 'Sep', Infraestructura: 62, Aseo: 48, Espacios: 35, Alumbrado: 20 },
  { mes: 'Oct', Infraestructura: 71, Aseo: 52, Espacios: 40, Alumbrado: 22 },
  { mes: 'Nov', Infraestructura: 58, Aseo: 45, Espacios: 38, Alumbrado: 18 },
  { mes: 'Dic', Infraestructura: 80, Aseo: 61, Espacios: 47, Alumbrado: 25 },
  { mes: 'Ene', Infraestructura: 75, Aseo: 55, Espacios: 42, Alumbrado: 21 },
  { mes: 'Feb', Infraestructura: 85, Aseo: 60, Espacios: 45, Alumbrado: 24 },
];

const slaData = [
  { mes: 'Sep', cumplimiento: 79 },
  { mes: 'Oct', cumplimiento: 82 },
  { mes: 'Nov', cumplimiento: 80 },
  { mes: 'Dic', cumplimiento: 84 },
  { mes: 'Ene', cumplimiento: 86 },
  { mes: 'Feb', cumplimiento: 89 },
];

const topZones = [
  { name: 'Av. Kennedy', cases: 47 },
  { name: 'Av. Las Condes', cases: 39 },
  { name: 'Av. Vicuña Mackenna', cases: 31 },
  { name: 'Av. Providencia', cases: 24 },
  { name: 'Av. Grecia', cases: 18 },
];

const byArea = [
  { area: 'Infraestructura', total: 85, resolved: 66, pending: 19, slaCompliance: 78 },
  { area: 'Aseo', total: 60, resolved: 57, pending: 3, slaCompliance: 95 },
  { area: 'Espacios Públicos', total: 45, resolved: 39, pending: 6, slaCompliance: 87 },
  { area: 'Alumbrado', total: 24, resolved: 22, pending: 2, slaCompliance: 92 },
  { area: 'Tránsito', total: 20, resolved: 12, pending: 8, slaCompliance: 60 },
];

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-5">
        <h1>Analytics</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Métricas ejecutivas y análisis de desempeño</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Casos este mes', value: '342', color: 'text-primary', bar: 65, barColor: 'bg-primary' },
          { label: 'Tasa de resolución', value: '91%', color: 'text-green-600', bar: 91, barColor: 'bg-green-500' },
          { label: 'Reincidencias detectadas', value: '32', color: 'text-amber-600', bar: 30, barColor: 'bg-amber-500' },
          { label: 'Cumplimiento SLA', value: `${mockAnalytics.slaCompliance.compliant}%`, color: 'text-green-600', bar: mockAnalytics.slaCompliance.compliant, barColor: 'bg-green-500' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-border p-5 shadow-sm">
            <div className="text-[12.5px] text-muted-foreground mb-2">{k.label}</div>
            <div className={`text-3xl font-semibold mb-2 ${k.color}`}>{k.value}</div>
            <div className="h-1 rounded-full bg-border overflow-hidden">
              <div className={`h-full rounded-full ${k.barColor}`} style={{ width: `${k.bar}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Bar chart */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 className="text-[14px] font-semibold mb-4">Casos por área – últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyCases} barSize={8} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E8F0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E4E8F0', fontSize: 12 }} />
              <Bar dataKey="Infraestructura" fill="#1C3A8A" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Aseo" fill="#D97706" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Espacios" fill="#16A34A" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Alumbrado" fill="#7C3AED" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 flex-wrap">
            {[['#1C3A8A', 'Infraestructura'], ['#D97706', 'Aseo'], ['#16A34A', 'Espacios'], ['#7C3AED', 'Alumbrado']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Line chart SLA */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 className="text-[14px] font-semibold mb-4">Evolución Cumplimiento SLA</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={slaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E8F0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E4E8F0', fontSize: 12 }}
                formatter={(v: any) => [`${v}%`, 'Cumplimiento']}
              />
              <Line type="monotone" dataKey="cumplimiento" stroke="#16A34A" strokeWidth={2.5} dot={{ fill: '#16A34A', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Top zonas */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 className="text-[14px] font-semibold mb-4">Top Zonas con más incidentes</h2>
          {topZones.map((zone, i) => (
            <div key={zone.name} className="mb-3 last:mb-0">
              <div className="flex justify-between text-[12.5px] mb-1.5">
                <span className="font-medium">{zone.name}</span>
                <span className="text-muted-foreground font-mono">{zone.cases} casos</span>
              </div>
              <div className="h-2 rounded-full bg-border overflow-hidden">
                <div className="h-full rounded-full" style={{
                  width: `${(zone.cases / topZones[0].cases) * 100}%`,
                  backgroundColor: ['#DC2626', '#D97706', '#1C3A8A', '#16A34A', '#7C3AED'][i],
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Reincidencias */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 className="text-[14px] font-semibold mb-4">Reincidencias detectadas</h2>
          {mockAnalytics.recurrences.map((r: any) => (
            <div key={r.location} className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
              <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold text-orange-600">{r.count}</span>
              </div>
              <div>
                <div className="text-[13px] font-medium">{r.location}</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">{r.type}</div>
              </div>
              <span className="ml-auto px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-md text-[11.5px] font-medium flex-shrink-0">
                {r.count}x
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Por área + Riesgos críticos */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[14px] font-semibold">Resumen por área</h2>
          </div>
          <div className="divide-y divide-border">
            {byArea.map(a => (
              <div key={a.area} className="flex items-center px-5 py-3.5 gap-3">
                <div className="flex-1">
                  <div className="text-[13px] font-medium mb-1">{a.area}</div>
                  <div className="flex gap-3 text-[11.5px] text-muted-foreground">
                    <span>Total: <span className="text-foreground font-medium">{a.total}</span></span>
                    <span>Resueltos: <span className="text-green-600 font-medium">{a.resolved}</span></span>
                    <span>Pendientes: <span className="text-amber-600 font-medium">{a.pending}</span></span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-[14px] font-semibold font-mono ${a.slaCompliance >= 85 ? 'text-green-600' : a.slaCompliance >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                    {a.slaCompliance}%
                  </span>
                  <div className="text-[11px] text-muted-foreground">SLA</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Riesgos críticos IA */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 className="text-[14px] font-semibold mb-4">Riesgos críticos detectados por IA</h2>
          {mockAnalytics.criticalRisks.map((r: any) => (
            <div key={r.title} className="mb-4 last:mb-0">
              <div className="flex justify-between text-[13px] mb-1.5">
                <span className="font-medium">{r.title}</span>
                <span className={`font-mono font-semibold ${r.severity >= 85 ? 'text-red-600' : 'text-amber-600'}`}>{r.severity}</span>
              </div>
              <div className="h-2 rounded-full bg-border overflow-hidden mb-1">
                <div className="h-full rounded-full" style={{
                  width: `${r.severity}%`,
                  backgroundColor: r.severity >= 85 ? '#DC2626' : '#D97706',
                }} />
              </div>
              <div className="text-[11.5px] text-muted-foreground">{r.area}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
