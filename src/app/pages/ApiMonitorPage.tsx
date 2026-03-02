/**
 * /operador/api — Monitor de procesamiento de tickets en tiempo real
 *
 * Cambios vs versión anterior:
 *  - Polling basado en COUNT (no descarga toda la lista de tickets).
 *    Solo cuando hay nuevos tickets se pide el detalle del recién llegado.
 *  - Intervalo aumentado a 8 segundos (era 4s).
 *  - Se limpia el intervalo al desmontar el componente (navegar a otra pestaña).
 *  - Las imágenes NO se cargan en el monitor para ahorrar datos.
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth, API_URL } from '../../context/AuthContext';
import { Activity, Zap, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';

const POLL_INTERVAL_MS = 8_000;

type ProcessingPhase = 'waiting' | 'classifying_area' | 'calculating_priority' | 'done' | 'error';

interface AreaResult {
  area: string;
  color: string;
}

const AREA_COLORS: Record<string, string> = {
  'Áreas Verdes':     'bg-green-600',
  'Aseo':             'bg-primary',
  'Infraestructura':  'bg-purple-600',
  'Atención General': 'bg-slate-400',
  'Eléctrico':        'bg-amber-500',
};

function areaColor(area: string): string {
  return AREA_COLORS[area] ?? 'bg-primary';
}

interface TicketLog {
  id: number;
  title: string;
  description: string;
  phase: ProcessingPhase;
  area: AreaResult | null;
  priority_score: number | null;
  priority_label: string | null;
  metrics: Record<string, number> | null;
  weights: Record<string, number> | null;
  error: string | null;
  started_at: Date;
  finished_at: Date | null;
}

async function classifyAreaViaBackend(title: string, description: string, token: string | null): Promise<string> {
  if (!token) throw new Error('Token no disponible');
  const response = await fetch(`${API_URL}/ai/tickets/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, description }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as any).detail || 'Error en clasificación IA');
  }
  const data: any = await response.json();
  return data?.area ?? 'Atención General';
}

async function calculatePriorityViaBackend(
  title: string, description: string, token: string | null
): Promise<{ score: number; metrics: Record<string, number> | null; weights: Record<string, number> | null }> {
  if (!token) throw new Error('Token no disponible');
  const response = await fetch(`${API_URL}/ai/tickets/priority`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, description }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as any).detail || 'Error en cálculo de prioridad');
  }
  const data: any = await response.json();
  const score = typeof data?.score === 'number' ? data.score : NaN;
  if (Number.isNaN(score)) throw new Error('Score inválido del backend');
  return {
    score,
    metrics: data?.metrics && typeof data.metrics === 'object' ? data.metrics : null,
    weights: data?.weights && typeof data.weights === 'object' ? data.weights : null,
  };
}

function priorityLabel(score: number): string {
  if (score >= 85) return 'Crítica';
  if (score >= 65) return 'Alta';
  if (score >= 45) return 'Media';
  return 'Baja';
}

function priorityBarColor(score: number): string {
  if (score >= 85) return 'bg-red-500';
  if (score >= 65) return 'bg-amber-500';
  if (score >= 45) return 'bg-primary';
  return 'bg-green-600';
}

function priorityTextColor(score: number): string {
  if (score >= 85) return 'text-red-600';
  if (score >= 65) return 'text-amber-600';
  if (score >= 45) return 'text-primary';
  return 'text-green-600';
}

function PhaseBadge({ phase }: { phase: ProcessingPhase }) {
  const map: Record<ProcessingPhase, { label: string; className: string; icon: React.ReactNode }> = {
    waiting:              { label: 'En cola',               className: 'bg-white/20 text-gray-600 border-white/30',        icon: <Clock size={11} /> },
    classifying_area:     { label: 'Definiendo área…',      className: 'bg-blue-50/80 text-blue-700 border-blue-200',      icon: <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" /> },
    calculating_priority: { label: 'Calculando prioridad…', className: 'bg-amber-50/80 text-amber-700 border-amber-200',   icon: <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block" /> },
    done:                 { label: 'Procesado',              className: 'bg-green-50/80 text-green-700 border-green-200',   icon: <CheckCircle2 size={11} /> },
    error:                { label: 'Error',                  className: 'bg-red-50/80 text-red-700 border-red-200',         icon: <AlertCircle size={11} /> },
  };
  const { label, className, icon } = map[phase];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-medium backdrop-blur-sm ${className}`}>
      {icon}{label}
    </span>
  );
}

function TicketLogCard({ log }: { log: TicketLog }) {
  const elapsed = log.finished_at
    ? `${((log.finished_at.getTime() - log.started_at.getTime()) / 1000).toFixed(1)}s`
    : null;

  const borderColor = log.phase === 'done'
    ? 'border-green-200/60'
    : log.phase === 'error'
    ? 'border-red-200/60'
    : 'border-white/20';

  return (
    <div className={`bg-white/60 backdrop-blur-md rounded-2xl p-4 shadow-xl transition-all duration-300 hover:bg-white/70 border ${borderColor}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11.5px] font-mono text-primary">#{log.id}</span>
            <PhaseBadge phase={log.phase} />
            {elapsed && <span className="text-[10.5px] text-muted-foreground ml-auto">{elapsed}</span>}
          </div>
          <p className="text-[13.5px] font-semibold text-foreground truncate">{log.title}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{log.description}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
            log.phase === 'classifying_area' ? 'bg-primary text-white animate-pulse' :
            log.area ? 'bg-green-500 text-white' : 'bg-white/30 text-muted-foreground'
          }`}>1</div>
          <span className="text-[12px] text-muted-foreground w-32 flex-shrink-0">Definir área</span>
          <div className="flex-1">
            {log.phase === 'classifying_area' && (
              <div className="flex gap-1">
                {[0,1,2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce inline-block" style={{ animationDelay: `${i*150}ms` }} />
                ))}
              </div>
            )}
            {log.area && (
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-medium text-white ${log.area.color}`}>
                {log.area.area}
              </span>
            )}
            {!log.area && log.phase !== 'classifying_area' && log.phase !== 'waiting' && (
              <span className="text-[11.5px] text-muted-foreground">—</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
            log.phase === 'calculating_priority' ? 'bg-amber-500 text-white animate-pulse' :
            log.priority_score !== null ? 'bg-green-500 text-white' : 'bg-white/30 text-muted-foreground'
          }`}>2</div>
          <span className="text-[12px] text-muted-foreground w-32 flex-shrink-0">Calcular prioridad</span>
          <div className="flex-1">
            {log.phase === 'calculating_priority' && (
              <div className="flex gap-1">
                {[0,1,2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce inline-block" style={{ animationDelay: `${i*150}ms` }} />
                ))}
              </div>
            )}
            {log.priority_score !== null && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full bg-white/30 overflow-hidden">
                  <div className={`h-full rounded-full ${priorityBarColor(log.priority_score)}`} style={{ width: `${log.priority_score}%` }} />
                </div>
                <span className={`text-[12px] font-semibold font-mono ${priorityTextColor(log.priority_score)}`}>{log.priority_score}%</span>
                <span className="text-[11.5px] text-muted-foreground">{log.priority_label}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {log.metrics && log.weights && (
        <div className="mt-3 border-t border-white/20 pt-3">
          <div className="text-[11px] text-muted-foreground mb-1">Factores de prioridad (0–100) · ponderados</div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {Object.entries(log.metrics).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between bg-white/20 rounded-lg px-2 py-1">
                <span className="truncate mr-2 text-foreground">{key}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {value}
                  {log.weights?.[key] !== undefined && ` · w=${log.weights[key].toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {log.error && (
        <div className="mt-3 px-3 py-2 bg-red-50/80 border border-red-200 rounded-xl text-[11.5px] text-red-700">
          {log.error}
        </div>
      )}
    </div>
  );
}

export default function ApiMonitorPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<TicketLog[]>([]);
  const [isPolling, setIsPolling] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [totalProcessed, setTotalProcessed] = useState(0);

  // Solo guarda el conteo, no la lista completa
  const knownCount = useRef<number | null>(null);
  const processingQueue = useRef<Set<number>>(new Set());

  // Rehidratar logs
  useEffect(() => {
    try {
      const raw = localStorage.getItem('vita360_ia_logs_v1');
      if (!raw) return;
      const parsed = JSON.parse(raw) as any[];
      if (!Array.isArray(parsed)) return;
      setLogs(parsed.map((item) => ({
        ...item,
        started_at: item.started_at ? new Date(item.started_at) : new Date(),
        finished_at: item.finished_at ? new Date(item.finished_at) : null,
      })));
    } catch { /* ignore */ }
  }, []);

  // Persistir logs
  useEffect(() => {
    try {
      localStorage.setItem('vita360_ia_logs_v1', JSON.stringify(
        logs.map((l) => ({
          ...l,
          started_at: l.started_at.toISOString(),
          finished_at: l.finished_at ? l.finished_at.toISOString() : null,
        }))
      ));
    } catch { /* ignore */ }
  }, [logs]);

  const processTicket = async (ticket: { id: number; title: string; description: string }) => {
    if (processingQueue.current.has(ticket.id)) return;
    processingQueue.current.add(ticket.id);

    setLogs((prev) => [{
      id: ticket.id, title: ticket.title, description: ticket.description,
      phase: 'classifying_area', area: null, priority_score: null,
      priority_label: null, metrics: null, weights: null, error: null,
      started_at: new Date(), finished_at: null,
    }, ...prev].slice(0, 50));

    try {
      const areaName = await classifyAreaViaBackend(ticket.title, ticket.description, token || null);
      setLogs((prev) => prev.map((l) => l.id === ticket.id
        ? { ...l, area: { area: areaName, color: areaColor(areaName) }, phase: 'calculating_priority' as ProcessingPhase }
        : l));

      const { score, metrics, weights } = await calculatePriorityViaBackend(ticket.title, ticket.description, token || null);
      setLogs((prev) => prev.map((l) => l.id === ticket.id
        ? { ...l, priority_score: score, priority_label: priorityLabel(score), metrics, weights, phase: 'done' as ProcessingPhase, finished_at: new Date() }
        : l));
      setTotalProcessed((n) => n + 1);
    } catch (err: any) {
      setLogs((prev) => prev.map((l) => l.id === ticket.id
        ? { ...l, phase: 'error' as ProcessingPhase, error: err?.message ?? 'Error desconocido', finished_at: new Date() }
        : l));
    } finally {
      processingQueue.current.delete(ticket.id);
    }
  };

  useEffect(() => {
    if (!token || !isPolling) return;

    const poll = async () => {
      try {
        // Intenta endpoint /tickets/count primero para minimizar datos transferidos
        const countRes = await fetch(`${API_URL}/tickets/count`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        let currentCount: number;
        if (countRes.ok) {
          const countData = await countRes.json();
          currentCount = typeof countData?.count === 'number' ? countData.count : Number(countData);
        } else {
          // Fallback: pide solo IDs (campo mínimo) para obtener el conteo
          const fallback = await fetch(`${API_URL}/tickets`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!fallback.ok) return;
          const fallbackData = await fallback.json();
          currentCount = Array.isArray(fallbackData) ? fallbackData.length : 0;
        }

        setLastChecked(new Date());

        // Primera llamada: solo inicializa el conteo base, no procesa nada
        if (knownCount.current === null) {
          knownCount.current = currentCount;
          return;
        }

        // Sin cambios
        if (currentCount <= knownCount.current) return;

        // Hay tickets nuevos: pide SOLO los que faltan
        const diff = currentCount - knownCount.current;
        const newRes = await fetch(
          `${API_URL}/tickets?limit=${diff}&offset=0&order=desc`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!newRes.ok) return;

        const newTickets: { id: number; title: string; description: string }[] = await newRes.json();
        knownCount.current = currentCount;
        newTickets.forEach((t) => processTicket(t));
      } catch { /* silently retry */ }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    // Limpieza al desmontar — detiene consultas al salir de la pestaña
    return () => clearInterval(interval);
  }, [token, isPolling]);

  const activeCount = logs.filter((l) => l.phase === 'classifying_area' || l.phase === 'calculating_priority').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-[18px] font-semibold text-foreground">Monitor de procesamiento IA</h1>
          </div>
          <p className="text-[13px] text-muted-foreground ml-10">
            Tickets entrantes clasificados en tiempo real · IA ejecutándose en el backend
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLogs([])}
            className="px-3 py-1.5 rounded-xl bg-white/50 backdrop-blur-md border border-white/30 text-[12.5px] text-muted-foreground hover:bg-white/70 transition-all shadow-sm"
          >
            Limpiar log
          </button>
          <button
            type="button"
            onClick={() => setIsPolling((p) => !p)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[12.5px] font-medium transition-all backdrop-blur-md shadow-sm ${
              isPolling
                ? 'border-green-200/60 bg-green-50/60 text-green-700'
                : 'border-red-200/60 bg-red-50/60 text-red-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isPolling ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {isPolling ? 'Escuchando' : 'Pausado'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {[
          { label: 'Procesados hoy', value: totalProcessed, icon: <CheckCircle2 size={15} className="text-green-600" />, color: 'text-green-600' },
          { label: 'En proceso', value: activeCount, icon: <Zap size={15} className="text-primary" />, color: 'text-primary' },
          { label: 'Última verificación', value: lastChecked ? lastChecked.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—', icon: <RefreshCw size={15} className="text-muted-foreground" />, color: 'text-muted-foreground' },
          { label: 'Intervalo polling', value: `${POLL_INTERVAL_MS / 1000}s`, icon: <Clock size={15} className="text-muted-foreground" />, color: 'text-muted-foreground' },
        ].map((s) => (
          <div key={s.label} className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-4 shadow-xl flex-1 min-w-[160px] hover:bg-white/70 transition-all duration-300">
            <div className="flex items-center gap-2 mb-1.5">{s.icon}<span className="text-[11.5px] text-muted-foreground">{s.label}</span></div>
            <div className={`text-[20px] font-semibold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Log list */}
      {logs.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-16 text-center shadow-xl">
          <div className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center mx-auto mb-4">
            <Activity size={24} className="text-muted-foreground" />
          </div>
          <p className="text-[14px] font-medium text-foreground mb-1">Esperando tickets nuevos</p>
          <p className="text-[12.5px] text-muted-foreground">
            Cuando se cree un ticket desde la app de ciudadano, aparecerá aquí en tiempo real.
          </p>
          <p className="text-[11px] text-muted-foreground mt-2 opacity-60">
            Verificando cada {POLL_INTERVAL_MS / 1000}s · Solo descarga conteo, no imágenes
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => <TicketLogCard key={log.id} log={log} />)}
        </div>
      )}
    </div>
  );
}
