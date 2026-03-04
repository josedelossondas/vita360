/**
 * /operador/api — Monitor de procesamiento de tickets IA + vista de todos los tickets
 *
 * Pipeline de auto-asignación:
 *   Fase 1: POST /ai/tickets/classify  → área + score + métricas (1 sola llamada IA)
 *   Fase 2: Promise.all([
 *              POST /ai/tickets/task   → descripción concisa + horas estimadas
 *              GET  /squads            → lista de cuadrillas disponibles
 *           ])
 *   Fase 3: min(pending_tasks) por área → POST /tickets/{id}/assign
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth, API_URL } from '../../context/AuthContext';
import { Activity, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, UserCheck } from 'lucide-react';

const POLL_INTERVAL_MS = 4_000;
const PAGE_SIZE = 20;
const MAX_CONCURRENT = 2;

type ProcessingPhase =
    | 'classifying'       // Fase 1: clasificar área + prioridades
    | 'task_and_squads'   // Fase 2: tarea IA + cargar cuadrillas (paralelo)
    | 'assigning'         // Fase 3: asignar cuadrilla
    | 'done'
    | 'error';

interface AreaResult { area: string; color: string; }

const AREA_COLORS: Record<string, string> = {
    'Áreas Verdes': '#16a34a', 'Aseo': '#2596be', 'Infraestructura': '#7c3aed',
    'Atención General': '#64748b', 'Eléctrico': '#b45309', 'Seguridad': '#b82c87', 'Tránsito': '#0891b2',
};
function areaColor(area: string): string { return AREA_COLORS[area] ?? '#2596be'; }

interface TicketLog {
    id: number; title: string; description: string;
    phase: ProcessingPhase;
    area: AreaResult | null;
    priority_score: number | null; priority_label: string | null;
    metrics: Record<string, number> | null; weights: Record<string, number> | null;
    task_summary: string | null; estimated_hours: number | null;
    assigned_squad: string | null;
    error: string | null; started_at: Date; finished_at: Date | null;
}

interface AllTicket {
    id: number; title: string; description: string;
    urgency_level: string; status: string; priority_score: number;
    area_name: string; created_at: string;
}

interface Squad { id: number; name: string; area_name: string; pending_tasks: number; }

function priorityLabel(s: number) { if (s >= 85) return 'Crítica'; if (s >= 65) return 'Alta'; if (s >= 45) return 'Media'; return 'Baja'; }
function priorityBarColor(s: number) { if (s >= 85) return '#ef4444'; if (s >= 65) return '#f59e0b'; if (s >= 45) return '#2596be'; return '#16a34a'; }
function priorityTextColor(s: number) { if (s >= 85) return '#dc2626'; if (s >= 65) return '#b45309'; if (s >= 45) return '#2596be'; return '#16a34a'; }

// ── Phase label helpers ────────────────────────────────────────────────────────
const PHASE_META: Record<ProcessingPhase, { label: string; bg: string; text: string; border: string }> = {
    classifying: { label: 'Clasificando área y prioridades…', bg: 'rgba(37,150,190,0.1)', text: '#2596be', border: 'rgba(37,150,190,0.25)' },
    task_and_squads: { label: 'Generando tarea y buscando cuadrillas…', bg: 'rgba(245,158,11,0.1)', text: '#b45309', border: 'rgba(245,158,11,0.3)' },
    assigning: { label: 'Asignando cuadrilla…', bg: 'rgba(139,92,246,0.1)', text: '#7c3aed', border: 'rgba(139,92,246,0.25)' },
    done: { label: 'Procesado y asignado', bg: 'rgba(192,207,5,0.1)', text: '#7a8504', border: 'rgba(192,207,5,0.3)' },
    error: { label: 'Error', bg: 'rgba(239,68,68,0.08)', text: '#dc2626', border: 'rgba(239,68,68,0.2)' },
};

function PhaseBadge({ phase }: { phase: ProcessingPhase }) {
    const { label, bg, text, border } = PHASE_META[phase];
    const animate = phase === 'classifying' || phase === 'task_and_squads' || phase === 'assigning';
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-medium"
            style={{ background: bg, color: text, borderColor: border }}>
            <span className={`w-2 h-2 rounded-full inline-block${animate ? ' animate-pulse' : ''}`} style={{ background: text }} />
            {label}
        </span>
    );
}

// ── Urgency badge ─────────────────────────────────────────────────────────────
function UrgencyBadge({ level }: { level: string }) {
    const map: Record<string, { bg: string; text: string; border: string }> = {
        Alta: { bg: 'rgba(184,44,135,0.08)', text: '#b82c87', border: 'rgba(184,44,135,0.25)' },
        Media: { bg: 'rgba(245,158,11,0.1)', text: '#b45309', border: 'rgba(245,158,11,0.25)' },
        Baja: { bg: 'rgba(37,150,190,0.1)', text: '#2596be', border: 'rgba(37,150,190,0.2)' },
    };
    const c = map[level] || { bg: 'rgba(100,116,139,0.1)', text: '#475569', border: 'rgba(100,116,139,0.2)' };
    return (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium border"
            style={{ background: c.bg, color: c.text, borderColor: c.border }}>{level || '—'}</span>
    );
}

// ── Log card ──────────────────────────────────────────────────────────────────
function TicketLogCard({ log }: { log: TicketLog }) {
    const elapsed = log.finished_at
        ? `${((log.finished_at.getTime() - log.started_at.getTime()) / 1000).toFixed(1)}s`
        : null;
    const borderColor = log.phase === 'done'
        ? 'rgba(192,207,5,0.25)'
        : log.phase === 'error'
            ? 'rgba(239,68,68,0.2)'
            : 'rgba(37,150,190,0.1)';

    return (
        <div className="rounded-2xl p-4 border transition-all duration-300"
            style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)', borderColor, boxShadow: '0 4px 20px rgba(37,150,190,0.06)' }}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[11.5px] font-mono" style={{ color: '#2596be' }}>#{log.id}</span>
                        <PhaseBadge phase={log.phase} />
                        {elapsed && <span className="text-[10.5px] ml-auto" style={{ color: '#94a3b8' }}>{elapsed}</span>}
                    </div>
                    <p className="text-[13.5px] font-semibold truncate" style={{ color: '#1e293b' }}>{log.title}</p>
                </div>
            </div>

            {/* Fases */}
            <div className="space-y-2">
                {/* FASE 1: Área + Prioridad */}
                <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5"
                        style={{ background: (log.phase === 'classifying') ? '#2596be' : (log.area ? '#c0cf05' : 'rgba(0,0,0,0.08)'), color: (log.phase === 'classifying' || log.area) ? 'white' : '#94a3b8' }}>1</div>
                    <div className="flex-1">
                        <div className="text-[11.5px] mb-1" style={{ color: '#64748b' }}>Área + Prioridades</div>
                        {log.phase === 'classifying' && <div className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full inline-block animate-bounce" style={{ background: '#2596be', animationDelay: `${i * 150}ms` }} />)}</div>}
                        {log.area && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-medium text-white" style={{ background: areaColor(log.area.area) }}>{log.area.area}</span>
                                {log.priority_score !== null && (
                                    <>
                                        <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
                                            <div className="h-full rounded-full" style={{ width: `${log.priority_score}%`, background: priorityBarColor(log.priority_score) }} />
                                        </div>
                                        <span className="text-[12px] font-semibold font-mono" style={{ color: priorityTextColor(log.priority_score) }}>{log.priority_score}%</span>
                                        <span className="text-[11.5px]" style={{ color: '#94a3b8' }}>{log.priority_label}</span>
                                    </>
                                )}
                            </div>
                        )}
                        {/* Métricas IA */}
                        {log.metrics && (
                            <div className="grid grid-cols-2 gap-1 mt-1.5">
                                {Object.entries(log.metrics).map(([key, val]) => (
                                    <div key={key} className="flex items-center gap-1 text-[10.5px]">
                                        <span className="truncate flex-1" style={{ color: '#64748b' }}>{key}</span>
                                        <span className="font-mono" style={{ color: '#94a3b8' }}>{val}</span>
                                        {log.weights?.[key] !== undefined && <span style={{ color: '#c0cf05' }}>·w{log.weights[key].toFixed(2)}</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* FASE 2: Tarea IA */}
                <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5"
                        style={{ background: log.phase === 'task_and_squads' ? '#f59e0b' : log.task_summary ? '#c0cf05' : 'rgba(0,0,0,0.08)', color: log.phase === 'task_and_squads' || log.task_summary ? 'white' : '#94a3b8' }}>2</div>
                    <div className="flex-1">
                        <div className="text-[11.5px] mb-1" style={{ color: '#64748b' }}>Descripción de tarea</div>
                        {log.phase === 'task_and_squads' && <div className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full inline-block animate-bounce" style={{ background: '#f59e0b', animationDelay: `${i * 150}ms` }} />)}</div>}
                        {log.task_summary && (
                            <div className="rounded-lg px-2.5 py-1.5" style={{ background: 'rgba(245,158,11,0.06)', borderLeft: '2px solid rgba(245,158,11,0.3)' }}>
                                <p className="text-[12px]" style={{ color: '#1e293b' }}>{log.task_summary}</p>
                                {log.estimated_hours && (
                                    <span className="text-[11px]" style={{ color: '#94a3b8' }}>~{log.estimated_hours}h estimadas</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* FASE 3: Asignación */}
                <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5"
                        style={{ background: log.phase === 'assigning' ? '#7c3aed' : log.assigned_squad ? '#c0cf05' : 'rgba(0,0,0,0.08)', color: log.phase === 'assigning' || log.assigned_squad ? 'white' : '#94a3b8' }}>3</div>
                    <div className="flex-1">
                        <div className="text-[11.5px] mb-1" style={{ color: '#64748b' }}>Asignación de cuadrilla</div>
                        {log.phase === 'assigning' && <div className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full inline-block animate-bounce" style={{ background: '#7c3aed', animationDelay: `${i * 150}ms` }} />)}</div>}
                        {log.assigned_squad && (
                            <div className="flex items-center gap-1.5">
                                <UserCheck size={13} style={{ color: '#7c3aed' }} />
                                <span className="text-[12px] font-medium" style={{ color: '#7c3aed' }}>{log.assigned_squad}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {log.error && (
                <div className="mt-3 px-3 py-2 rounded-xl text-[11.5px] border"
                    style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)', color: '#dc2626' }}>
                    {log.error}
                </div>
            )}
        </div>
    );
}

// ── All-Tickets mini card ──────────────────────────────────────────────────────
function AllTicketCard({ ticket, log }: { ticket: AllTicket; log?: TicketLog }) {
    const title = ticket.title || '';
    const truncated = title.length > 70 ? title.slice(0, 67) + '…' : title;
    const metrics = log?.metrics ?? null;
    const metricEntries = metrics
        ? Object.entries(metrics)
        : [['Urgencia', null], ['Impacto', null], ['Tiempo', null], ['Ciudadanos', null], ['Recursos', null]] as [string, number | null][];
    const isProcessing = log?.phase === 'classifying' || log?.phase === 'task_and_squads' || log?.phase === 'assigning';

    return (
        <div className="rounded-xl border p-3 flex flex-col gap-2 transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)', borderColor: log?.phase === 'done' ? 'rgba(192,207,5,0.25)' : 'rgba(37,150,190,0.1)', boxShadow: '0 2px 10px rgba(37,150,190,0.05)' }}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-mono font-semibold" style={{ color: '#2596be' }}>#{ticket.id}</span>
                <UrgencyBadge level={ticket.urgency_level} />
            </div>
            <p className="text-[11.5px] leading-snug font-medium" style={{ color: '#1e293b' }}>{truncated}</p>
            {log?.assigned_squad && (
                <div className="flex items-center gap-1">
                    <UserCheck size={10} style={{ color: '#7c3aed' }} />
                    <span className="text-[10px]" style={{ color: '#7c3aed' }}>{log.assigned_squad}</span>
                </div>
            )}
            <div className="grid grid-cols-1 gap-1">
                {isProcessing && (
                    <div className="flex gap-1 justify-center py-1">{[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full inline-block animate-bounce" style={{ background: '#2596be', animationDelay: `${i * 150}ms` }} />)}</div>
                )}
                {!isProcessing && metricEntries.map(([key, val]) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <span className="text-[10px] w-20 flex-shrink-0" style={{ color: '#94a3b8' }}>{key}</span>
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.07)' }}>
                            {val !== null && <div className="h-full rounded-full" style={{ width: `${val}%`, background: priorityBarColor(val as number) }} />}
                        </div>
                        <span className="text-[10px] font-mono w-6 text-right" style={{ color: '#94a3b8' }}>{val !== null ? val : '—'}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function ApiMonitorPage() {
    const { token } = useAuth();
    const [logs, setLogs] = useState<TicketLog[]>([]);
    const [isPolling, setIsPolling] = useState(true);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);
    const [allTickets, setAllTickets] = useState<AllTicket[]>([]);
    const [page, setPage] = useState(1);

    const knownCount = useRef<number | null>(null);
    const processingQueue = useRef<Set<number>>(new Set());
    const concurrency = useRef(0);
    const pendingQueue = useRef<Array<{ id: number; title: string; description: string }>>([]);
    const initialAutoProcessDone = useRef(false);

    // Cargar todos los tickets al montar
    useEffect(() => {
        if (!token) return;
        fetch(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : [])
            .then((data: AllTicket[]) => {
                setAllTickets([...data].sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ));
            })
            .catch(() => { });
    }, [token]);

    // Rehidratar logs desde localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem('vita360_ia_logs_v2');
            if (!raw) return;
            const parsed = JSON.parse(raw) as any[];
            if (!Array.isArray(parsed)) return;
            setLogs(parsed.map(item => ({
                ...item,
                started_at: item.started_at ? new Date(item.started_at) : new Date(),
                finished_at: item.finished_at ? new Date(item.finished_at) : null,
            })));
        } catch { /* ignore */ }
    }, []);

    // Persistir logs
    useEffect(() => {
        try {
            localStorage.setItem('vita360_ia_logs_v2', JSON.stringify(
                logs.map(l => ({
                    ...l,
                    started_at: l.started_at.toISOString(),
                    finished_at: l.finished_at ? l.finished_at.toISOString() : null,
                }))
            ));
        } catch { /* ignore */ }
    }, [logs]);

    // ── Pipeline de procesamiento ─────────────────────────────────────────────
    const processTicket = async (ticket: { id: number; title: string; description: string }) => {
        if (processingQueue.current.has(ticket.id)) return;
        if (concurrency.current >= MAX_CONCURRENT) {
            if (!pendingQueue.current.some(p => p.id === ticket.id)) pendingQueue.current.push(ticket);
            return;
        }

        processingQueue.current.add(ticket.id);
        concurrency.current++;

        // Init log entry
        setLogs(prev => [{
            id: ticket.id, title: ticket.title, description: ticket.description,
            phase: 'classifying',
            area: null, priority_score: null, priority_label: null,
            metrics: null, weights: null, task_summary: null,
            estimated_hours: null, assigned_squad: null,
            error: null, started_at: new Date(), finished_at: null,
        }, ...prev].slice(0, 50));

        try {
            // ── FASE 1: Una sola llamada IA → área + score + métricas ────────
            const classifyRes = await fetch(`${API_URL}/ai/tickets/classify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token!}` },
                body: JSON.stringify({ title: ticket.title, description: ticket.description }),
            });
            if (!classifyRes.ok) { const e = await classifyRes.json().catch(() => ({})); throw new Error((e as any).detail || 'Error IA clasificación'); }
            const classified: any = await classifyRes.json();

            const areaName: string = classified.area ?? 'Atención General';
            const score: number = typeof classified.score === 'number' ? classified.score : 50;
            const metrics: Record<string, number> = classified.metrics ?? {};
            const weights: Record<string, number> = classified.weights ?? {};

            setLogs(prev => prev.map(l => l.id === ticket.id ? {
                ...l,
                phase: 'task_and_squads',
                area: { area: areaName, color: areaColor(areaName) },
                priority_score: score,
                priority_label: priorityLabel(score),
                metrics, weights,
            } : l));

            // ── FASE 2: Paralelo — descripción tarea IA + lista cuadrillas ──
            const [taskData, squadsData] = await Promise.all([
                fetch(`${API_URL}/ai/tickets/task`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token!}` },
                    body: JSON.stringify({
                        title: ticket.title,
                        description: ticket.description,
                        area: areaName,
                        squad_types: [`Cuadrilla ${areaName} A`, `Cuadrilla ${areaName} B`],
                    }),
                }).then(r => r.ok ? r.json() : { task_summary: ticket.title.slice(0, 60), estimated_hours: 24 }),

                fetch(`${API_URL}/squads`, {
                    headers: { Authorization: `Bearer ${token!}` },
                }).then(r => r.ok ? r.json() : []),
            ]);

            const taskSummary: string = (taskData as any).task_summary ?? ticket.title.slice(0, 60);
            const estimatedHours: number = (taskData as any).estimated_hours ?? 24;
            const squads: Squad[] = squadsData as Squad[];

            setLogs(prev => prev.map(l => l.id === ticket.id ? {
                ...l,
                phase: 'assigning',
                task_summary: taskSummary,
                estimated_hours: estimatedHours,
            } : l));

            // ── FASE 3: Lógica pura JS — cuadrilla con menor carga en el área
            const areaSquads = squads.filter(s =>
                s.area_name?.toLowerCase() === areaName.toLowerCase()
            );
            const candidatePool = areaSquads.length > 0 ? areaSquads : squads;
            const bestSquad = candidatePool.reduce(
                (best, s) => (s.pending_tasks ?? 0) < (best.pending_tasks ?? 0) ? s : best,
                candidatePool[0]
            );

            if (bestSquad) {
                await fetch(`${API_URL}/tickets/${ticket.id}/assign`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token!}` },
                    body: JSON.stringify({ squad_name: bestSquad.name, estimated_hours: estimatedHours }),
                });
            }

            setLogs(prev => prev.map(l => l.id === ticket.id ? {
                ...l,
                phase: 'done',
                assigned_squad: bestSquad?.name ?? null,
                finished_at: new Date(),
            } : l));

        } catch (err: any) {
            setLogs(prev => prev.map(l => l.id === ticket.id ? {
                ...l, phase: 'error', error: err?.message ?? 'Error desconocido', finished_at: new Date(),
            } : l));
        } finally {
            processingQueue.current.delete(ticket.id);
            concurrency.current--;
            const next = pendingQueue.current.shift();
            if (next) processTicket(next);
        }
    };

    // Auto-procesar tickets que aún no tienen log (solo una vez al cargar)
    useEffect(() => {
        if (!token || allTickets.length === 0 || initialAutoProcessDone.current) return;
        const timer = setTimeout(() => {
            initialAutoProcessDone.current = true;
            const logIds = new Set(logs.map(l => l.id));
            allTickets.forEach(t => {
                if (!logIds.has(t.id)) processTicket({ id: t.id, title: t.title, description: t.description });
            });
        }, 700);
        return () => clearTimeout(timer);
    }, [allTickets, token]);

    // Polling cada 4s — detectar tickets nuevos
    useEffect(() => {
        if (!token || !isPolling) return;
        const poll = async () => {
            try {
                const countRes = await fetch(`${API_URL}/tickets/count`, { headers: { Authorization: `Bearer ${token}` } });
                let currentCount: number;
                if (countRes.ok) {
                    const cd = await countRes.json();
                    currentCount = typeof cd?.count === 'number' ? cd.count : Number(cd);
                } else {
                    const fb = await fetch(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${token}` } });
                    if (!fb.ok) return;
                    currentCount = (await fb.json()).length ?? 0;
                }
                setLastChecked(new Date());
                if (knownCount.current === null) { knownCount.current = currentCount; return; }
                if (currentCount <= knownCount.current) return;
                const diff = currentCount - knownCount.current;
                knownCount.current = currentCount;
                // Refrescar la lista completa
                const fresh = await fetch(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${token}` } });
                if (!fresh.ok) return;
                const data: AllTicket[] = await fresh.json();
                const sorted = [...data].sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setAllTickets(sorted);
                setPage(1);
                // Procesar solo los nuevos (los primeros `diff` por fecha)
                sorted.slice(0, diff).forEach(t => processTicket(t));
            } catch { /* silently retry */ }
        };
        poll();
        const interval = setInterval(poll, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [token, isPolling]);

    const logMap = new Map(logs.map(l => [l.id, l]));
    const totalPages = Math.ceil(allTickets.length / PAGE_SIZE);
    const pagedTickets = allTickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div>
            {/* ── Header ── */}
            <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #2596be 0%, #1a7fa0 100%)' }}>
                            <Activity className="w-4 h-4 text-white" />
                        </div>
                        <h1 className="text-[18px] font-semibold" style={{ color: '#1e293b' }}>Monitor de procesamiento IA</h1>
                    </div>
                    <p className="text-[13px] ml-10" style={{ color: '#94a3b8' }}>
                        Tickets entrantes · Clasificación → Tarea → Asignación automática
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {lastChecked && (
                        <span className="text-[11px]" style={{ color: '#94a3b8' }}>
                            Verificado: {lastChecked.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                    )}
                    <button type="button" onClick={() => setIsPolling(p => !p)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[12.5px] font-medium transition-all"
                        style={{
                            background: isPolling ? 'rgba(192,207,5,0.08)' : 'rgba(239,68,68,0.06)',
                            borderColor: isPolling ? 'rgba(192,207,5,0.3)' : 'rgba(239,68,68,0.2)',
                            color: isPolling ? '#7a8504' : '#dc2626',
                        }}>
                        <span className={`w-2 h-2 rounded-full${isPolling ? ' animate-pulse' : ''}`}
                            style={{ background: isPolling ? '#c0cf05' : '#ef4444', boxShadow: isPolling ? '0 0 6px rgba(192,207,5,0.6)' : 'none' }} />
                        {isPolling ? 'VIT activo' : 'Pausado'}
                    </button>
                </div>
            </div>

            {/* ── Log de procesamiento IA (ARRIBA) ── */}
            <div className="mb-8">
                <h2 className="text-[13.5px] font-semibold mb-3" style={{ color: '#1e293b' }}>Log de procesamiento IA</h2>
                {logs.length === 0 ? (
                    <div className="rounded-2xl border p-10 text-center"
                        style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', borderColor: 'rgba(37,150,190,0.1)', boxShadow: '0 4px 20px rgba(37,150,190,0.06)' }}>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(37,150,190,0.08)' }}>
                            <Activity size={22} style={{ color: '#94a3b8' }} />
                        </div>
                        <p className="text-[14px] font-medium" style={{ color: '#1e293b' }}>Esperando tickets nuevos</p>
                    </div>
                ) : (
                    <div className="space-y-3">{logs.map(log => <TicketLogCard key={log.id} log={log} />)}</div>
                )}
            </div>

            {/* ── Todos los tickets (ABAJO, paginados) ── */}
            {allTickets.length > 0 && (
                <div>
                    <div className="h-0.5 w-full mb-4" style={{ background: 'linear-gradient(90deg, #2596be 0%, #c0cf05 50%, #b82c87 100%)' }} />
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <h2 className="text-[13.5px] font-semibold" style={{ color: '#1e293b' }}>
                            Todos los tickets <span className="text-[12px] font-normal" style={{ color: '#94a3b8' }}>({allTickets.length})</span>
                        </h2>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="p-1.5 rounded-lg border transition-all disabled:opacity-40"
                                    style={{ borderColor: 'rgba(37,150,190,0.2)', color: '#64748b', background: 'rgba(255,255,255,0.7)' }}>
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[12px]" style={{ color: '#64748b' }}>{page} / {totalPages}</span>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    className="p-1.5 rounded-lg border transition-all disabled:opacity-40"
                                    style={{ borderColor: 'rgba(37,150,190,0.2)', color: '#64748b', background: 'rgba(255,255,255,0.7)' }}>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {pagedTickets.map(ticket => (
                            <AllTicketCard key={ticket.id} ticket={ticket} log={logMap.get(ticket.id)} />
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-4">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[12.5px] transition-all disabled:opacity-40"
                                style={{ borderColor: 'rgba(37,150,190,0.2)', color: '#64748b', background: 'rgba(255,255,255,0.7)' }}>
                                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                            </button>
                            <span className="text-[12px]" style={{ color: '#94a3b8' }}>Página {page} de {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[12.5px] transition-all disabled:opacity-40"
                                style={{ borderColor: 'rgba(37,150,190,0.2)', color: '#64748b', background: 'rgba(255,255,255,0.7)' }}>
                                Siguiente <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
