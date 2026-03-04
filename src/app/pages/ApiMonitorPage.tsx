/**
 * /operador/api — Monitor de procesamiento de tickets IA + vista de todos los tickets
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth, API_URL } from '../../context/AuthContext';
import { Activity, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

type ProcessingPhase = 'waiting' | 'classifying_area' | 'calculating_priority' | 'done' | 'error';

interface AreaResult { area: string; color: string; }

const AREA_COLORS: Record<string, string> = {
    'Áreas Verdes': '#16a34a', 'Aseo': '#2596be', 'Infraestructura': '#7c3aed',
    'Atención General': '#64748b', 'Eléctrico': '#b45309', 'Seguridad': '#b82c87', 'Tránsito': '#0891b2',
};
function areaColor(area: string): string { return AREA_COLORS[area] ?? '#2596be'; }

interface TicketLog {
    id: number; title: string; description: string;
    phase: ProcessingPhase; area: AreaResult | null;
    priority_score: number | null; priority_label: string | null;
    metrics: Record<string, number> | null; weights: Record<string, number> | null;
    error: string | null; started_at: Date; finished_at: Date | null;
}

interface AllTicket {
    id: number;
    title: string;
    description: string;
    urgency_level: string;
    status: string;
    priority_score: number;
    area_name: string;
    created_at: string;
}

async function classifyArea(title: string, description: string, token: string): Promise<string> {
    const res = await fetch(`${API_URL}/ai/tickets/classify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).detail || 'Error clasificación IA'); }
    const data: any = await res.json();
    return data?.area ?? 'Atención General';
}

async function calcPriority(title: string, description: string, token: string): Promise<{ score: number; metrics: Record<string, number> | null; weights: Record<string, number> | null }> {
    const res = await fetch(`${API_URL}/ai/tickets/priority`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description }),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).detail || 'Error prioridad IA'); }
    const data: any = await res.json();
    const score = typeof data?.score === 'number' ? data.score : NaN;
    if (Number.isNaN(score)) throw new Error('Score inválido del backend');
    return { score, metrics: data?.metrics ?? null, weights: data?.weights ?? null };
}

function priorityLabel(s: number) { if (s >= 85) return 'Crítica'; if (s >= 65) return 'Alta'; if (s >= 45) return 'Media'; return 'Baja'; }
function priorityBarColor(s: number) { if (s >= 85) return '#ef4444'; if (s >= 65) return '#f59e0b'; if (s >= 45) return '#2596be'; return '#16a34a'; }
function priorityTextColor(s: number) { if (s >= 85) return '#dc2626'; if (s >= 65) return '#b45309'; if (s >= 45) return '#2596be'; return '#16a34a'; }

// ── Phase Badge ───────────────────────────────────────────────────────────────
function PhaseBadge({ phase }: { phase: ProcessingPhase }) {
    const map: Record<ProcessingPhase, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
        waiting: { label: 'En cola', bg: 'rgba(100,116,139,0.08)', text: '#64748b', border: 'rgba(100,116,139,0.2)', icon: <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#64748b' }} /> },
        classifying_area: { label: 'Definiendo área…', bg: 'rgba(37,150,190,0.1)', text: '#2596be', border: 'rgba(37,150,190,0.25)', icon: <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ background: '#2596be' }} /> },
        calculating_priority: { label: 'Calculando prioridad…', bg: 'rgba(245,158,11,0.1)', text: '#b45309', border: 'rgba(245,158,11,0.3)', icon: <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ background: '#f59e0b' }} /> },
        done: { label: 'Procesado', bg: 'rgba(192,207,5,0.1)', text: '#7a8504', border: 'rgba(192,207,5,0.3)', icon: <CheckCircle2 size={11} /> },
        error: { label: 'Error', bg: 'rgba(239,68,68,0.08)', text: '#dc2626', border: 'rgba(239,68,68,0.2)', icon: <AlertCircle size={11} /> },
    };
    const { label, bg, text, border, icon } = map[phase];
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-medium"
            style={{ background: bg, color: text, borderColor: border }}>{icon}{label}</span>
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
            style={{ background: c.bg, color: c.text, borderColor: c.border }}>
            {level || '—'}
        </span>
    );
}

// ── Ticket Log Card (processing) ──────────────────────────────────────────────
function TicketLogCard({ log }: { log: TicketLog }) {
    const elapsed = log.finished_at ? `${((log.finished_at.getTime() - log.started_at.getTime()) / 1000).toFixed(1)}s` : null;
    const borderColor = log.phase === 'done' ? 'rgba(192,207,5,0.25)' : log.phase === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(37,150,190,0.1)';
    return (
        <div className="rounded-2xl p-4 transition-all duration-300 border"
            style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', borderColor, boxShadow: '0 4px 20px rgba(37,150,190,0.06)' }}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11.5px] font-mono" style={{ color: '#2596be' }}>#{log.id}</span>
                        <PhaseBadge phase={log.phase} />
                        {elapsed && <span className="text-[10.5px] ml-auto" style={{ color: '#94a3b8' }}>{elapsed}</span>}
                    </div>
                    <p className="text-[13.5px] font-semibold truncate" style={{ color: '#1e293b' }}>{log.title}</p>
                    <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: '#64748b' }}>{log.description}</p>
                </div>
            </div>
            <div className="space-y-2">
                {/* Paso 1: Área */}
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                        style={{ background: log.phase === 'classifying_area' ? '#2596be' : log.area ? '#c0cf05' : 'rgba(0,0,0,0.08)', color: log.phase === 'classifying_area' || log.area ? 'white' : '#94a3b8' }}>1</div>
                    <span className="text-[12px] w-32 flex-shrink-0" style={{ color: '#64748b' }}>Definir área</span>
                    <div className="flex-1">
                        {log.phase === 'classifying_area' && (
                            <div className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full inline-block animate-bounce" style={{ background: '#2596be', animationDelay: `${i * 150}ms` }} />)}</div>
                        )}
                        {log.area && (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11.5px] font-medium text-white"
                                style={{ background: areaColor(log.area.area) }}>{log.area.area}</span>
                        )}
                    </div>
                </div>
                {/* Paso 2: Prioridad */}
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                        style={{ background: log.phase === 'calculating_priority' ? '#f59e0b' : log.priority_score !== null ? '#c0cf05' : 'rgba(0,0,0,0.08)', color: log.phase === 'calculating_priority' || log.priority_score !== null ? 'white' : '#94a3b8' }}>2</div>
                    <span className="text-[12px] w-32 flex-shrink-0" style={{ color: '#64748b' }}>Calcular prioridad</span>
                    <div className="flex-1">
                        {log.phase === 'calculating_priority' && (
                            <div className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full inline-block animate-bounce" style={{ background: '#f59e0b', animationDelay: `${i * 150}ms` }} />)}</div>
                        )}
                        {log.priority_score !== null && (
                            <div className="flex items-center gap-2">
                                <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
                                    <div className="h-full rounded-full" style={{ width: `${log.priority_score}%`, background: priorityBarColor(log.priority_score) }} />
                                </div>
                                <span className="text-[12px] font-semibold font-mono" style={{ color: priorityTextColor(log.priority_score) }}>{log.priority_score}%</span>
                                <span className="text-[11.5px]" style={{ color: '#94a3b8' }}>{log.priority_label}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {log.metrics && log.weights && (
                <div className="mt-3 border-t pt-3" style={{ borderColor: 'rgba(37,150,190,0.08)' }}>
                    <div className="text-[11px] mb-1" style={{ color: '#94a3b8' }}>Factores de prioridad (0–100) · ponderados</div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                        {Object.entries(log.metrics).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between rounded-lg px-2 py-1" style={{ background: 'rgba(37,150,190,0.04)' }}>
                                <span className="truncate mr-2" style={{ color: '#1e293b' }}>{key}</span>
                                <span className="font-mono" style={{ color: '#64748b' }}>{value}{log.weights?.[key] !== undefined && ` · w=${log.weights[key].toFixed(2)}`}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {log.error && (
                <div className="mt-3 px-3 py-2 rounded-xl text-[11.5px] border" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)', color: '#dc2626' }}>{log.error}</div>
            )}
        </div>
    );
}

// ── All-Tickets mini card ──────────────────────────────────────────────────────
function AllTicketCard({ ticket, log }: { ticket: AllTicket; log?: TicketLog }) {
    const desc = ticket.description || ticket.title || '';
    const truncated = desc.length > 90 ? desc.slice(0, 87) + '…' : desc;

    // Metrics from the IA log if available
    const metrics = log?.metrics ?? null;
    const METRIC_KEYS = ['Urgencia', 'Impacto', 'Tiempo', 'Ciudadanos', 'Recursos'];

    return (
        <div className="rounded-xl border p-3 flex flex-col gap-2 transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)', borderColor: 'rgba(37,150,190,0.1)', boxShadow: '0 2px 10px rgba(37,150,190,0.05)' }}>
            {/* ID + urgencia */}
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] font-mono font-semibold" style={{ color: '#2596be' }}>#{ticket.id}</span>
                <UrgencyBadge level={ticket.urgency_level} />
            </div>
            {/* Descripción */}
            <p className="text-[11.5px] leading-snug" style={{ color: '#64748b' }}>{truncated}</p>
            {/* Prioridades por área (5 métricas) */}
            <div className="grid grid-cols-1 gap-1">
                {METRIC_KEYS.map(key => {
                    const val = metrics?.[key] ?? null;
                    return (
                        <div key={key} className="flex items-center gap-1.5">
                            <span className="text-[10px] w-20 flex-shrink-0" style={{ color: '#94a3b8' }}>{key}</span>
                            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.07)' }}>
                                {val !== null && (
                                    <div className="h-full rounded-full" style={{ width: `${val}%`, background: priorityBarColor(val) }} />
                                )}
                            </div>
                            <span className="text-[10px] font-mono w-6 text-right" style={{ color: '#94a3b8' }}>
                                {val !== null ? val : '—'}
                            </span>
                        </div>
                    );
                })}
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
    const [totalProcessed, setTotalProcessed] = useState(0);
    const [allTickets, setAllTickets] = useState<AllTicket[]>([]);

    const knownCount = useRef<number | null>(null);
    const processingQueue = useRef<Set<number>>(new Set());

    // Cargar todos los tickets existentes al montar
    useEffect(() => {
        if (!token) return;
        fetch(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : [])
            .then((data: AllTicket[]) => setAllTickets(data))
            .catch(() => { });
    }, [token]);

    // Rehidratar logs desde localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem('vita360_ia_logs_v1');
            if (!raw) return;
            const parsed = JSON.parse(raw) as any[];
            if (!Array.isArray(parsed)) return;
            setLogs(parsed.map(item => ({ ...item, started_at: item.started_at ? new Date(item.started_at) : new Date(), finished_at: item.finished_at ? new Date(item.finished_at) : null })));
        } catch { /* ignore */ }
    }, []);

    // Persistir logs
    useEffect(() => {
        try {
            localStorage.setItem('vita360_ia_logs_v1', JSON.stringify(
                logs.map(l => ({ ...l, started_at: l.started_at.toISOString(), finished_at: l.finished_at ? l.finished_at.toISOString() : null }))
            ));
        } catch { /* ignore */ }
    }, [logs]);

    const processTicket = async (ticket: { id: number; title: string; description: string }) => {
        if (processingQueue.current.has(ticket.id)) return;
        processingQueue.current.add(ticket.id);
        setLogs(prev => [{ id: ticket.id, title: ticket.title, description: ticket.description, phase: 'classifying_area' as ProcessingPhase, area: null, priority_score: null, priority_label: null, metrics: null, weights: null, error: null, started_at: new Date(), finished_at: null }, ...prev].slice(0, 50));
        try {
            const areaName = await classifyArea(ticket.title, ticket.description, token!);
            setLogs(prev => prev.map(l => l.id === ticket.id ? { ...l, area: { area: areaName, color: areaColor(areaName) }, phase: 'calculating_priority' as ProcessingPhase } : l));
            const { score, metrics, weights } = await calcPriority(ticket.title, ticket.description, token!);
            setLogs(prev => prev.map(l => l.id === ticket.id ? { ...l, priority_score: score, priority_label: priorityLabel(score), metrics, weights, phase: 'done' as ProcessingPhase, finished_at: new Date() } : l));
            setTotalProcessed(n => n + 1);
        } catch (err: any) {
            setLogs(prev => prev.map(l => l.id === ticket.id ? { ...l, phase: 'error' as ProcessingPhase, error: err?.message ?? 'Error desconocido', finished_at: new Date() } : l));
        } finally { processingQueue.current.delete(ticket.id); }
    };

    // Verificación única al montar (sin intervalo)
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
                const newRes = await fetch(`${API_URL}/tickets?limit=${diff}&offset=0&order=desc`, { headers: { Authorization: `Bearer ${token}` } });
                if (!newRes.ok) return;
                const newTickets: { id: number; title: string; description: string }[] = await newRes.json();
                knownCount.current = currentCount;
                // Also refresh all tickets list
                fetch(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.ok ? r.json() : [])
                    .then((data: AllTicket[]) => setAllTickets(data))
                    .catch(() => { });
                newTickets.forEach(t => processTicket(t));
            } catch { /* silently retry */ }
        };
        poll();
    }, [token, isPolling]);

    const activeCount = logs.filter(l => l.phase === 'classifying_area' || l.phase === 'calculating_priority').length;

    // Build a log map by ticket id for quick lookup
    const logMap = new Map(logs.map(l => [l.id, l]));

    return (
        <div>
            {/* Header */}
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
                        Tickets entrantes clasificados en tiempo real
                    </p>
                </div>
                <div className="flex items-center gap-3">
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

            {/* Stats */}
            <div className="flex gap-4 mb-6 flex-wrap">
                {[
                    { label: 'Procesados esta sesión', value: totalProcessed, icon: <CheckCircle2 size={15} style={{ color: '#7a8504' }} />, accent: '#7a8504' },
                    { label: 'En proceso ahora', value: activeCount, icon: <Zap size={15} style={{ color: '#2596be' }} />, accent: '#2596be' },
                    { label: 'Última verificación', value: lastChecked ? lastChecked.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—', icon: <Activity size={15} style={{ color: '#94a3b8' }} />, accent: '#94a3b8' },
                ].map(s => (
                    <div key={s.label} className="rounded-2xl border p-4 flex-1 min-w-[160px] transition-all duration-300"
                        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', borderColor: 'rgba(37,150,190,0.1)', boxShadow: '0 4px 20px rgba(37,150,190,0.07)' }}>
                        <div className="flex items-center gap-2 mb-1.5">{s.icon}<span className="text-[11.5px]" style={{ color: '#94a3b8' }}>{s.label}</span></div>
                        <div className="text-[20px] font-semibold" style={{ color: s.accent }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* ── Todos los tickets (tarjetas pequeñas) ── */}
            {allTickets.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #2596be 0%, #c0cf05 50%, #b82c87 100%)' }} />
                    </div>
                    <h2 className="text-[13.5px] font-semibold mb-3" style={{ color: '#1e293b' }}>
                        Todos los tickets <span className="text-[12px] font-normal" style={{ color: '#94a3b8' }}>({allTickets.length})</span>
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {allTickets.map(ticket => (
                            <AllTicketCard key={ticket.id} ticket={ticket} log={logMap.get(ticket.id)} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Log de procesamiento IA ── */}
            <div>
                <h2 className="text-[13.5px] font-semibold mb-3" style={{ color: '#1e293b' }}>
                    Log de procesamiento IA
                </h2>
                {logs.length === 0 ? (
                    <div className="rounded-2xl border p-16 text-center"
                        style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', borderColor: 'rgba(37,150,190,0.1)', boxShadow: '0 4px 20px rgba(37,150,190,0.06)' }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(37,150,190,0.08)' }}>
                            <Activity size={24} style={{ color: '#94a3b8' }} />
                        </div>
                        <p className="text-[14px] font-medium mb-1" style={{ color: '#1e293b' }}>Esperando tickets nuevos</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {logs.map(log => <TicketLogCard key={log.id} log={log} />)}
                    </div>
                )}
            </div>
        </div>
    );
}
