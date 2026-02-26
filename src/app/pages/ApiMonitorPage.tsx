/**
 * /operador/api — Monitor de procesamiento de tickets en tiempo real
 *
 * Cada ticket nuevo pasa por dos fases vía ChatGPT API (gpt-4o-mini):
 *   1. Definir área
 *   2. Calcular prioridad / score
 *
 * TODO cuando tengas API key:
 *   - Añade VITE_OPENAI_API_KEY en .env
 *   - Implementa callOpenAI() con el query que me pases
 *   - El polling de tickets nuevos ya está listo
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth, API_URL } from '../../context/AuthContext';
import { Activity, Zap, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

// 🔑 Pon aquí tu API key o usa variable de entorno VITE_OPENAI_API_KEY
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY ?? '';
const OPENAI_MODEL = 'gpt-4o-mini';
const POLL_INTERVAL_MS = 4000; // cada 4s chequea tickets nuevos

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ProcessingPhase = 'waiting' | 'classifying_area' | 'calculating_priority' | 'done' | 'error';

interface AreaResult {
  area: string;
  color: string; // tailwind bg class
}

const AREA_COLORS: Record<string, string> = {
  'Áreas Verdes':      'bg-[#48946F]',
  'Aseo':              'bg-[#306CBB]',
  'Infraestructura':   'bg-[#7C3AED]',
  'Atención General':  'bg-[#98A6B1]',
  'Eléctrico':         'bg-[#F2B23A]',
};

function areaColor(area: string): string {
  return AREA_COLORS[area] ?? 'bg-[#306CBB]';
}

interface TicketLog {
  id: number;
  title: string;
  description: string;
  phase: ProcessingPhase;
  area: AreaResult | null;
  priority_score: number | null;
  priority_label: string | null;
  error: string | null;
  started_at: Date;
  finished_at: Date | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ChatGPT integration — stubs ready for your query
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TODO: reemplaza el cuerpo de esta función con tu query a ChatGPT.
 * Devuelve el nombre del área clasificada.
 * Ejemplo de retorno esperado: "Áreas Verdes"
 */
async function classifyArea(title: string, description: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    // Simulación sin API key — elimina esto cuando tengas la key
    await new Promise(r => setTimeout(r, 1200));
    const areas = ['Áreas Verdes', 'Aseo', 'Infraestructura', 'Atención General'];
    return areas[Math.floor(Math.random() * areas.length)];
  }

  // ── Aquí irá tu query ──────────────────────────────────────────────────────
  // const response = await fetch('https://api.openai.com/v1/chat/completions', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Authorization: `Bearer ${OPENAI_API_KEY}`,
  //   },
  //   body: JSON.stringify({
  //     model: OPENAI_MODEL,
  //     max_tokens: 60,
  //     messages: [
  //       { role: 'system', content: 'Eres un clasificador de solicitudes municipales...' },
  //       { role: 'user', content: `Título: ${title}\nDescripción: ${description}\nDevuelve solo el nombre del área.` },
  //     ],
  //   }),
  // });
  // const data = await response.json();
  // return data.choices[0].message.content.trim();
  // ──────────────────────────────────────────────────────────────────────────

  throw new Error('Configura VITE_OPENAI_API_KEY y el query de área');
}

/**
 * TODO: reemplaza el cuerpo de esta función con tu query a ChatGPT.
 * Devuelve un score de prioridad entre 0 y 100.
 */
async function calculatePriority(title: string, description: string, area: string): Promise<number> {
  if (!OPENAI_API_KEY) {
    await new Promise(r => setTimeout(r, 1000));
    return Math.floor(Math.random() * 60) + 30;
  }

  // ── Aquí irá tu query ──────────────────────────────────────────────────────
  // const response = await fetch('https://api.openai.com/v1/chat/completions', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
  //   body: JSON.stringify({
  //     model: OPENAI_MODEL,
  //     max_tokens: 10,
  //     messages: [
  //       { role: 'system', content: 'Devuelve solo un número entre 0 y 100 indicando la prioridad.' },
  //       { role: 'user', content: `Área: ${area}\nTítulo: ${title}\nDescripción: ${description}` },
  //     ],
  //   }),
  // });
  // const data = await response.json();
  // return parseInt(data.choices[0].message.content.trim(), 10);
  // ──────────────────────────────────────────────────────────────────────────

  throw new Error('Configura VITE_OPENAI_API_KEY y el query de prioridad');
}

function priorityLabel(score: number): string {
  if (score >= 85) return 'Crítica';
  if (score >= 65) return 'Alta';
  if (score >= 45) return 'Media';
  return 'Baja';
}

function priorityColor(score: number): string {
  if (score >= 85) return 'text-[#DA4F44]';
  if (score >= 65) return 'text-[#F2A23A]';
  if (score >= 45) return 'text-[#306CBB]';
  return 'text-[#48946F]';
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase badge
// ─────────────────────────────────────────────────────────────────────────────

function PhaseBadge({ phase }: { phase: ProcessingPhase }) {
  const map: Record<ProcessingPhase, { label: string; className: string; icon: React.ReactNode }> = {
    waiting: { label: 'En cola', className: 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]', icon: <Clock size={11} /> },
    classifying_area: { label: 'Definiendo área…', className: 'bg-[#EFF6FF] text-[#306CBB] border-[#BFDBFE]', icon: <span className="w-2 h-2 rounded-full bg-[#306CBB] animate-pulse inline-block" /> },
    calculating_priority: { label: 'Calculando prioridad…', className: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]', icon: <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse inline-block" /> },
    done: { label: 'Procesado', className: 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]', icon: <CheckCircle2 size={11} /> },
    error: { label: 'Error', className: 'bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]', icon: <AlertCircle size={11} /> },
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
    <div className={`bg-white border rounded-xl p-4 shadow-sm transition-all duration-300 ${log.phase === 'done' ? 'border-[#BBF7D0]' : log.phase === 'error' ? 'border-[#FECDD3]' : 'border-[#E6EAF0]'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11.5px] font-mono text-[#306CBB]">#{log.id}</span>
            <PhaseBadge phase={log.phase} />
            {elapsed && <span className="text-[10.5px] text-[#9CA3AF] ml-auto">{elapsed}</span>}
          </div>
          <p className="text-[13.5px] font-semibold text-[#111827] truncate">{log.title}</p>
          <p className="text-[12px] text-[#6B7280] mt-0.5 line-clamp-2">{log.description}</p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {/* Step 1: Área */}
        <div className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold
            ${log.phase === 'classifying_area' ? 'bg-[#306CBB] text-white animate-pulse' :
              log.area ? 'bg-[#10B981] text-white' : 'bg-[#E5E7EB] text-[#9CA3AF]'}`}>1</div>
          <span className="text-[12px] text-[#4B5563] w-32 flex-shrink-0">Definir área</span>
          <div className="flex-1">
            {log.phase === 'classifying_area' && (
              <div className="flex gap-1">
                {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#306CBB] animate-bounce inline-block" style={{ animationDelay: `${i*150}ms` }} />)}
              </div>
            )}
            {log.area && (
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-medium text-white ${log.area.color}`}>
                {log.area.area}
              </span>
            )}
            {!log.area && log.phase !== 'classifying_area' && log.phase !== 'waiting' && (
              <span className="text-[11.5px] text-[#9CA3AF]">—</span>
            )}
          </div>
        </div>

        {/* Step 2: Prioridad */}
        <div className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold
            ${log.phase === 'calculating_priority' ? 'bg-[#D97706] text-white animate-pulse' :
              log.priority_score !== null ? 'bg-[#10B981] text-white' : 'bg-[#E5E7EB] text-[#9CA3AF]'}`}>2</div>
          <span className="text-[12px] text-[#4B5563] w-32 flex-shrink-0">Calcular prioridad</span>
          <div className="flex-1">
            {log.phase === 'calculating_priority' && (
              <div className="flex gap-1">
                {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-bounce inline-block" style={{ animationDelay: `${i*150}ms` }} />)}
              </div>
            )}
            {log.priority_score !== null && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full bg-[#E5E7EB] overflow-hidden">
                  <div className={`h-full rounded-full ${log.priority_score >= 85 ? 'bg-[#DA4F44]' : log.priority_score >= 65 ? 'bg-[#F2A23A]' : log.priority_score >= 45 ? 'bg-[#306CBB]' : 'bg-[#48946F]'}`}
                    style={{ width: `${log.priority_score}%` }} />
                </div>
                <span className={`text-[12px] font-semibold font-mono ${priorityColor(log.priority_score)}`}>{log.priority_score}%</span>
                <span className="text-[11.5px] text-[#6B7280]">{log.priority_label}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {log.error && (
        <div className="mt-3 px-3 py-2 bg-[#FFF1F2] border border-[#FECDD3] rounded-lg text-[11.5px] text-[#E11D48]">
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

  // ── Process a single ticket through both phases ───────────────────────────
  const processTicket = async (ticket: { id: number; title: string; description: string }) => {
    if (processingQueue.current.has(ticket.id)) return;
    processingQueue.current.add(ticket.id);

    const newLog: TicketLog = {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      phase: 'classifying_area',
      area: null,
      priority_score: null,
      priority_label: null,
      error: null,
      started_at: new Date(),
      finished_at: null,
    };

    setLogs(prev => [newLog, ...prev].slice(0, 50)); // keep last 50

    try {
      // Phase 1: classify area
      const areaName = await classifyArea(ticket.title, ticket.description);
      const areaResult: AreaResult = { area: areaName, color: areaColor(areaName) };

      setLogs(prev => prev.map(l => l.id === ticket.id ? { ...l, area: areaResult, phase: 'calculating_priority' as ProcessingPhase } : l));

      // Phase 2: calculate priority
      const score = await calculatePriority(ticket.title, ticket.description, areaName);
      const label = priorityLabel(score);

      setLogs(prev => prev.map(l => l.id === ticket.id
        ? { ...l, priority_score: score, priority_label: label, phase: 'done' as ProcessingPhase, finished_at: new Date() }
        : l));

      setTotalProcessed(n => n + 1);
    } catch (err: any) {
      setLogs(prev => prev.map(l => l.id === ticket.id
        ? { ...l, phase: 'error' as ProcessingPhase, error: err?.message ?? 'Error desconocido', finished_at: new Date() }
        : l));
    } finally {
      processingQueue.current.delete(ticket.id);
    }
  };

  // ── Poll for new tickets ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !isPolling) return;

    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const tickets: { id: number; title: string; description: string }[] = await res.json();
        setLastChecked(new Date());

        // Detect genuinely new tickets (not seen before)
        const newTickets = tickets.filter(t => !knownIds.current.has(t.id));

        // On first load, mark all existing as known without processing
        if (knownIds.current.size === 0) {
          tickets.forEach(t => knownIds.current.add(t.id));
          return;
        }

        // Process each new ticket
        newTickets.forEach(t => {
          knownIds.current.add(t.id);
          processTicket(t);
        });
      } catch { /* network error, retry next interval */ }
    };

    poll(); // immediate
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token, isPolling]);

  const activeCount = logs.filter(l => l.phase === 'classifying_area' || l.phase === 'calculating_priority').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#306CBB] flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-[18px] font-semibold text-[#2F3A46]">Monitor de procesamiento IA</h1>
          </div>
          <p className="text-[13px] text-[#6B7280] ml-10">Tickets entrantes clasificados en tiempo real · powered by {OPENAI_API_KEY ? 'ChatGPT API' : <span className="text-[#F2A23A]">sin API key — modo simulación</span>}</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setLogs([])}
            className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[12.5px] text-[#4B5563] hover:bg-[#F9FAFB] transition-colors">
            Limpiar log
          </button>
          <button type="button" onClick={() => setIsPolling(p => !p)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12.5px] font-medium transition-colors ${isPolling ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]' : 'border-[#FECDD3] bg-[#FFF1F2] text-[#E11D48]'}`}>
            <span className={`w-2 h-2 rounded-full ${isPolling ? 'bg-[#16A34A] animate-pulse' : 'bg-[#E11D48]'}`} />
            {isPolling ? 'Escuchando' : 'Pausado'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {[
          { label: 'Procesados hoy', value: totalProcessed, icon: <CheckCircle2 size={15} className="text-[#16A34A]" />, color: 'text-[#16A34A]' },
          { label: 'En proceso', value: activeCount, icon: <Zap size={15} className="text-[#306CBB]" />, color: 'text-[#306CBB]' },
          { label: 'Última verificación', value: lastChecked ? lastChecked.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—', icon: <RefreshCw size={15} className="text-[#9CA3AF]" />, color: 'text-[#6B7280]' },
          { label: 'Modelo', value: OPENAI_MODEL, icon: <Activity size={15} className="text-[#9CA3AF]" />, color: 'text-[#6B7280]' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#E6EAF0] rounded-lg p-4 shadow-sm flex-1 min-w-[160px]">
            <div className="flex items-center gap-2 mb-1.5">{s.icon}<span className="text-[11.5px] text-[#6B7280]">{s.label}</span></div>
            <div className={`text-[20px] font-semibold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Setup notice if no API key */}
      {!OPENAI_API_KEY && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[12.5px] text-[#92400E] flex items-start gap-3">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-[#D97706]" />
          <div>
            <strong>Modo simulación activo.</strong> Para conectar con ChatGPT API: añade <code className="bg-[#FEF3C7] px-1 rounded font-mono">VITE_OPENAI_API_KEY=sk-…</code> a tu <code className="bg-[#FEF3C7] px-1 rounded font-mono">.env</code>, implementa los queries en <code className="bg-[#FEF3C7] px-1 rounded font-mono">classifyArea()</code> y <code className="bg-[#FEF3C7] px-1 rounded font-mono">calculatePriority()</code> dentro de <code className="bg-[#FEF3C7] px-1 rounded font-mono">ApiMonitorPage.tsx</code>, y redespliega.
          </div>
        </div>
      )}

      {/* Log */}
      {logs.length === 0 ? (
        <div className="bg-white border border-[#E6EAF0] rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
            <Activity size={24} className="text-[#9CA3AF]" />
          </div>
          <p className="text-[14px] font-medium text-[#374151] mb-1">Esperando tickets nuevos</p>
          <p className="text-[12.5px] text-[#9CA3AF]">Cuando se cree un ticket desde la app de ciudadano, aparecerá aquí en tiempo real.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => <TicketLogCard key={log.id} log={log} />)}
        </div>
      )}
    </div>
  );
}
