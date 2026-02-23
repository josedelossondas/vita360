import { useState } from 'react';

export default function ConfiguracionPage() {
  const [aiThreshold, setAiThreshold] = useState(80);
  const [recurDays, setRecurDays] = useState(30);
  const [autoClass, setAutoClass] = useState(true);
  const [autoNotif, setAutoNotif] = useState(true);

  const slaTypes = [
    { type: 'Vereda dañada', normal: 48, critical: 12 },
    { type: 'Árbol en riesgo', normal: 24, critical: 6 },
    { type: 'Contenedor desborde', normal: 24, critical: 8 },
    { type: 'Alumbrado', normal: 72, critical: 24 },
    { type: 'Microbasural', normal: 48, critical: 16 },
  ];

  return (
    <div>
      <div className="mb-5">
        <h1>Configuración</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Ajustes del sistema y parámetros operativos</p>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-5">
        <div className="flex flex-col gap-5">
          {/* IA Settings */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <h2 className="text-[14px] font-semibold mb-4">Parámetros de IA</h2>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[13.5px] font-medium">Umbral de prioridad crítica</span>
                  <span className="text-[13px] text-primary font-mono font-medium">{aiThreshold}/100</span>
                </div>
                <input type="range" min="0" max="100" value={aiThreshold}
                  onChange={e => setAiThreshold(+e.target.value)}
                  className="w-full accent-primary" />
                <p className="text-[11.5px] text-muted-foreground mt-1">Casos con urgencia IA superior a este valor se marcan como críticos automáticamente.</p>
              </div>
              <div className="h-px bg-border" />
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[13.5px] font-medium">Ventana detección de reincidencias</span>
                  <span className="text-[13px] text-primary font-mono font-medium">{recurDays} días</span>
                </div>
                <input type="range" min="7" max="90" value={recurDays}
                  onChange={e => setRecurDays(+e.target.value)}
                  className="w-full accent-primary" />
              </div>
              <div className="h-px bg-border" />
              {[
                { label: 'Clasificación automática', sub: 'Clasificar casos sin intervención humana', val: autoClass, set: setAutoClass },
                { label: 'Notificaciones automáticas', sub: 'Enviar alertas a supervisores por casos críticos', val: autoNotif, set: setAutoNotif },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div>
                    <div className="text-[13.5px] font-medium">{s.label}</div>
                    <div className="text-[12px] text-muted-foreground">{s.sub}</div>
                  </div>
                  <button
                    onClick={() => s.set(!s.val)}
                    className={`w-10 h-5.5 rounded-full relative transition-colors flex-shrink-0 ${s.val ? 'bg-primary' : 'bg-border'}`}
                    style={{ width: 40, height: 22 }}
                  >
                    <div className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform ${s.val ? 'translate-x-[20px]' : 'translate-x-[3px]'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SLA Table */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-[14px] font-semibold">SLA por tipo de caso</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary border-b border-border">
                  <tr>
                    {['Tipo de Caso', 'SLA Normal (h)', 'SLA Crítico (h)'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11.5px] text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {slaTypes.map(t => (
                    <tr key={t.type} className="hover:bg-secondary/40 transition-colors">
                      <td className="px-5 py-3.5 text-[13px] font-medium">{t.type}</td>
                      <td className="px-5 py-3.5 text-[13px] font-mono text-muted-foreground">{t.normal}h</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[13px] font-mono font-medium ${t.critical <= 8 ? 'text-red-600' : 'text-amber-600'}`}>{t.critical}h</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: System Status */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-[13.5px] font-semibold mb-4">Estado del Sistema</h3>
            {[
              { label: 'Motor de IA', status: 'Activo', ok: true },
              { label: 'Integración OIRS', status: 'Conectado', ok: true },
              { label: 'API Municipalidad', status: 'Activo', ok: true },
              { label: 'Notificaciones SMS', status: 'Parcial', ok: false },
              { label: 'Backup automático', status: 'Activo', ok: true },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0">
                <span className="text-[13px]">{s.label}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${s.ok ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span className={`text-[12.5px] font-medium ${s.ok ? 'text-green-600' : 'text-amber-600'}`}>{s.status}</span>
                </div>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-border text-[11.5px] text-muted-foreground space-y-1">
              <div>Última sincronización: hace 3 min</div>
              <div>Versión IA: v3.1.2</div>
              <div>Uptime: 99.8%</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-[13.5px] font-semibold mb-3">Integraciones</h3>
            {[
              { name: 'OIRS Municipal', connected: true },
              { name: 'Portal Ciudadano', connected: true },
              { name: 'Sistema GIS', connected: true },
              { name: 'SAP Municipal', connected: false },
            ].map(i => (
              <div key={i.name} className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0">
                <span className="text-[13px]">{i.name}</span>
                <span className={`px-2 py-0.5 rounded-md text-[11.5px] font-medium ${i.connected ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500'}`}>
                  {i.connected ? 'Conectado' : 'Inactivo'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
