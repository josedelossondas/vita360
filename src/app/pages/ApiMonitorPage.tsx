/**
 * /operador/api — Monitor de procesamiento de tickets en tiempo real
 *
 * Cada ticket nuevo pasa por dos fases vía ChatGPT API (gpt-4o-mini):
 *   1. Definir área
 *   2. Calcular prioridad / score
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth, API_URL } from '../../context/AuthContext';
import { Activity, Zap, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 4000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ProcessingPhase = 'waiting' | 'classifying_area' | 'calculating_priority' | 'done' | 'error';

interface AreaResult {
  area: string;
  color: string; // tailwind bg class
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

// ─────────────────────────────────────────────────────────────────────────────
// IA vía backend (sin API keys en frontend)
// ─────────────────────────────────────────────────────────────────────────────

async function classifyAreaViaBackend(title: string, description: string, token: string | null): Promise<string> {
  if (!token) throw new Error('Token no disponible para llamar IA backend');
  const response = await fetch(`${API_URL}/ai/tickets/classify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, description }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Error llamando IA de clasificación en backend');
  }
  const data: any = await response.json();
  return data?.area ?? 'Atención General';
}

async function calculatePriorityViaBackend(
  title: string,
  description: string,
  token: string | null
): Promise<{ score: number; metrics: Record<string, number> | null; weights: Record<string, number> | null; urgency?: string }> {
  if (!token) throw new Error('Token no disponible para llamar IA backend');
  const response = await fetch(`${API_URL}/ai/tickets/priority`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, description }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Error llamando IA de prioridad en backend');
  }
  const data: any = await response.json();
  const score = typeof data?.score === 'number' ? data.score : NaN;
  if (Number.isNaN(score)) throw new Error('Backend IA devolvió un score inválido');
  const metrics = data?.metrics && typeof data.metrics === 'object' ? data.metrics as Record<string, number> : null;
  const weights = data?.weights && typeof data.weights === 'object' ? data.weights as Record<string, number> : null;
  return { score, metrics, weights, urgency: data?.urgency };
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

// ─────────────────────────────────────────────────────────────────────────────
// Phase badge
// ─────────────────────────────────────────────────────────────────────────────

function PhaseBadge({ phase }: { phase: ProcessingPhase }) {
  const map: Record<ProcessingPhase, { label: string; className: string; icon: React.ReactNode }> = {
    waiting:              { label: 'En cola',                 className: 'bg-secondary text-muted-foreground border-border',              icon: <Clock size={11} /> },
    classifying_area:     { label: 'Definiendo área…',        className: 'bg-accent text-primary border-primary/30',                      icon: <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" /> },
    calculating_priority: { label: 'Calculando prioridad…',   className: 'bg-amber-50 text-amber-700 border-amber-200',                   icon: <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse inline-block" /> },
    done:                 { label: 'Procesado',               className: 'bg-green-50 text-green-700 border-green-200',                   icon: <CheckCircle2 size={11} /> },
    error:                { label: 'Error',                   className: 'bg-red-50 text-red-700 border-red-200',                         icon: <AlertCircle size={11} /> },
  };
  const { label, className, icon } = map[phase];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-medium ${className}`}>
      {icon}{label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticket Log Card
// ─────────────────────────────────────────────────────────────────────────────

function TicketLogCard({ log }: { log: TicketLog }) {
  const elapsed = log.finished_at
    ? `${((log.finished_at.getTime() - log.started_at.getTime()) / 1000).toFixed(1)}s`
    : null;

  return (
    <div className={`bg-card border rounded-xl p-4 shadow-sm transition-all duration-300 ${
      log.phase === 'done' ? 'border-green-200' : log.phase === 'error' ? 'border-red-200' : 'border-border'
    }`}>
      {/* Header */}
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

      {/* Steps */}
      <div className="space-y-2">
        {/* Step 1: Área */}
        <div className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
            log.phase === 'classifying_area' ? 'bg-primary text-white animate-pulse' :
            log.area ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
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

        {/* Step 2: Prioridad */}
        <div className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
            log.phase === 'calculating_priority' ? 'bg-amber-500 text-white animate-pulse' :
            log.priority_score !== null ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
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
                <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${priorityBarColor(log.priority_score)}`} style={{ width: `${log.priority_score}%` }} />
                </div>
                <span className={`text-[12px] font-semibold font-mono ${priorityTextColor(log.priority_score)}`}>{log.priority_score}%</span>
                <span className="text-[11.5px] text-muted-foreground">{log.priority_label}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      {log.metrics && log.weights && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="text-[11px] text-muted-foreground mb-1">Factores de prioridad (0–100) · ponderados</div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
            {Object.entries(log.metrics).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between bg-secondary rounded-lg px-2 py-1">
                <span className="truncate mr-2 text-foreground">{key}</span>
                <span className="font-mono text-[11px]">
                  {value}
                  {log.weights?.[key] !== undefined && (
                    <span className="text-muted-foreground"> · w={log.weights[key].toFixed(2)}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {log.error && (
        <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[11.5px] text-red-700">
          {log.error}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function ApiMonitorPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<TicketLog[]>([]);
  const [isPolling, setIsPolling] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const knownIds = useRef<Set<number>>(new Set());
  const processingQueue = useRef<Set<number>>(new Set());

  // Rehidratar logs desde localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('vita360_ia_logs_v1');
      if (!raw) return;
      const parsed = JSON.parse(raw) as any[];
      if (!Array.isArray(parsed)) return;
      const restored: TicketLog[] = parsed.map((item) => ({
        ...item,
        started_at: item.started_at ? new Date(item.started_at) : new Date(),
        finished_at: item.finished_at ? new Date(item.finished_at) : null,
      }));
      setLogs(restored);
      knownIds.current = new Set(restored.map((l) => l.id));
    } catch { /* ignore */ }
  }, []);

  // Persistir logs
  useEffect(() => {
    try {
      const serializable = logs.map((l) => ({
        ...l,
        started_at: l.started_at.toISOString(),
        finished_at: l.finished_at ? l.finished_at.toISOString() : null,
      }));
      localStorage.setItem('vita360_ia_logs_v1', JSON.stringify(serializable));
    } catch { /* ignore */ }
  }, [logs]);

  const processTicket = async (ticket: { id: number; title: string; description: string }) => {
    if (processingQueue.current.has(ticket.id)) return;
    processingQueue.current.add(ticket.id);

    const newLog: TicketLog = {
      id: ticket.id, title: ticket.title, description: ticket.description,
      phase: 'classifying_area', area: null, priority_score: null,
      priority_label: null, metrics: null, weights: null, error: null,
      started_at: new Date(), finished_at: null,
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 50));

    try {
      const areaName = await classifyAreaViaBackend(ticket.title, ticket.description, token || null);
      const areaResult: AreaResult = { area: areaName, color: areaColor(areaName) };
      setLogs((prev) => prev.map((l) => l.id === ticket.id ? { ...l, area: areaResult, phase: 'calculating_priority' as ProcessingPhase } : l));

      const { score, metrics, weights } = await calculatePriorityViaBackend(ticket.title, ticket.description, token || null);
      const label = priorityLabel(score);
      setLogs((prev) => prev.map((l) => l.id === ticket.id
        ? { ...l, priority_score: score, priority_label: label, metrics, weights, phase: 'done' as ProcessingPhase, finished_at: new Date() }
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
        const res = await fetch(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const tickets: { id: number; title: string; description: string }[] = await res.json();
        setLastChecked(new Date());
        const newTickets = tickets.filter((t) => !knownIds.current.has(t.id));
        if (knownIds.current.size === 0) {
          tickets.forEach((t) => knownIds.current.add(t.id));
          return;
        }
        newTickets.forEach((t) => { knownIds.current.add(t.id); processTicket(t); });
      } catch { /* retry next interval */ }
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token, isPolling]);

  const activeCount = logs.filter((l) => l.phase === 'classifying_area' || l.phase === 'calculating_priority').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" />
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
            className="px-3 py-1.5 rounded-lg border border-border text-[12.5px] text-muted-foreground hover:bg-secondary transition-colors"
          >
            Limpiar log
          </button>
          <button
            type="button"
            onClick={() => setIsPolling((p) => !p)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12.5px] font-medium transition-colors ${
              isPolling ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
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
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4 shadow-sm flex-1 min-w-[160px]">
            <div className="flex items-center gap-2 mb-1.5">{s.icon}<span className="text-[11.5px] text-muted-foreground">{s.label}</span></div>
            <div className={`text-[20px] font-semibold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Log */}
      {logs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <Activity size={24} className="text-muted-foreground" />
          </div>
          <p className="text-[14px] font-medium text-foreground mb-1">Esperando tickets nuevos</p>
          <p className="text-[12.5px] text-muted-foreground">
            Cuando se cree un ticket desde la app de ciudadano, aparecerá aquí en tiempo real.
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
