import { FileText, Search, BookOpen } from 'lucide-react';

const articles = [
  { id: 1, title: 'Protocolo: Árbol en riesgo de caída', area: 'Espacios Públicos', status: 'active', updated: 'Hace 2 días', color: '#1C3A8A', bg: '#EEF2FF' },
  { id: 2, title: 'Guía de respuesta: Vereda dañada', area: 'Infraestructura', status: 'active', updated: 'Hace 1 semana', color: '#D97706', bg: '#FFFBEB' },
  { id: 3, title: 'SLA: Tiempos por tipo de incidente', area: 'General', status: 'review', updated: 'Hace 3 semanas', color: '#DC2626', bg: '#FEF2F2' },
  { id: 4, title: 'Manual cuadrillas: Aseo urbano', area: 'Aseo', status: 'active', updated: 'Hace 5 días', color: '#16A34A', bg: '#F0FDF4' },
  { id: 5, title: 'Protocolo: Alumbrado público', area: 'Alumbrado', status: 'active', updated: 'Hace 2 semanas', color: '#7C3AED', bg: '#F5F3FF' },
];

const categories = [
  { name: 'Infraestructura', count: 24 },
  { name: 'Aseo y Limpieza', count: 18 },
  { name: 'Espacios Públicos', count: 15 },
  { name: 'Alumbrado', count: 9 },
  { name: 'Tránsito', count: 7 },
  { name: 'General', count: 12 },
];

export default function ConocimientoPage() {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1>Base de Conocimiento</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Protocolos, procedimientos y guías operativas</p>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors">
          + Nuevo artículo
        </button>
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-5">
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input type="text" placeholder="Buscar en la base de conocimiento..."
                className="w-full pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-[13.5px] outline-none focus:border-primary transition-colors" />
            </div>
          </div>
          {articles.map(a => (
            <div key={a.id} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-b-0 hover:bg-secondary/40 transition-colors cursor-pointer">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: a.bg }}>
                <FileText className="w-4 h-4" style={{ color: a.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium text-foreground">{a.title}</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">{a.updated} · {a.area}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[11.5px] font-medium flex-shrink-0 ${
                a.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {a.status === 'active' ? 'Activo' : 'Revisar'}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="text-[13.5px] font-semibold">Categorías</h3>
            </div>
            {categories.map(c => (
              <div key={c.name} className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0 cursor-pointer hover:text-primary transition-colors">
                <span className="text-[13px]">{c.name}</span>
                <span className="px-2 py-0.5 bg-accent text-primary rounded-md text-[11.5px] font-medium">{c.count}</span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <h3 className="text-[13.5px] font-semibold mb-3">Estadísticas</h3>
            {[
              { label: 'Total artículos', value: '85' },
              { label: 'Activos', value: '72' },
              { label: 'Pendientes revisión', value: '13' },
              { label: 'Actualizados este mes', value: '8' },
            ].map(s => (
              <div key={s.label} className="flex justify-between py-2 border-b border-border last:border-b-0 text-[13px]">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
