import { useState, useEffect } from "react";
import {
  RefreshCw,
  UserCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { useAuth, API_URL } from "../../context/AuthContext";
import { LeafletMap } from "../components/LeafletMap";
import type { MapMarker } from "../components/LeafletMap";

const VITACURA_LOGO =
  "https://vitacura.cl/app/themes/vitacura-sage/public/images/logos-vitacura_sineslogan_hor.36ae38.png";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Evidence {
  image_url: string;
  description: string;
  created_at: string;
}

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  urgency_level: string;
  priority_score: number;
  area_name: string;
  squad_name: string | null;
  assigned_to: string | null;
  planned_date: string;
  created_at: string;
  reported_by: string;
  reported_by_email: string;
  evidences: Evidence[];
}

interface Squad {
  id: number;
  name: string;
  area_name: string;
  pending_tasks: number;
}

const STATUS_FLOW = ["Recibido", "Asignado", "En Gestión", "Resuelto", "Cerrado"];

// ── Badges ────────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    Recibido: { bg: "rgba(37,150,190,0.1)", text: "#2596be", border: "rgba(37,150,190,0.25)" },
    Asignado: { bg: "rgba(139,92,246,0.1)", text: "#7c3aed", border: "rgba(139,92,246,0.25)" },
    "En Gestión": { bg: "rgba(245,158,11,0.1)", text: "#b45309", border: "rgba(245,158,11,0.25)" },
    Resuelto: { bg: "rgba(192,207,5,0.12)", text: "#7a8504", border: "rgba(192,207,5,0.3)" },
    Cerrado: { bg: "rgba(100,116,139,0.1)", text: "#475569", border: "rgba(100,116,139,0.2)" },
  };
  const c = map[status] || map.Cerrado;
  return (
    <span className="px-2 py-0.5 rounded-md text-[11.5px] font-medium border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}>
      {status}
    </span>
  );
}

function UrgencyBadge({ level, score }: { level: string; score: number }) {
  const cfg: Record<string, { pill: string; pillBorder: string; pillText: string; bar: string }> = {
    Alta: { pill: "rgba(184,44,135,0.08)", pillBorder: "rgba(184,44,135,0.3)", pillText: "#b82c87", bar: "#b82c87" },
    Media: { pill: "rgba(245,158,11,0.08)", pillBorder: "rgba(245,158,11,0.3)", pillText: "#b45309", bar: "#f59e0b" },
    Baja: { pill: "rgba(37,150,190,0.08)", pillBorder: "rgba(37,150,190,0.2)", pillText: "#2596be", bar: "#2596be" },
  };
  const c = cfg[level] ?? cfg.Baja;
  return (
    <div className="flex items-center gap-1.5">
      <span className="px-2 py-0.5 rounded-md text-[11.5px] font-medium border"
        style={{ background: c.pill, borderColor: c.pillBorder, color: c.pillText }}>
        {level === "Alta" ? "Alto" : level === "Media" ? "Medio" : level || "—"}
      </span>
      <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
        <div className="h-full rounded-full" style={{ width: `${score ?? 0}%`, background: c.bar }} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function OperadorPage() {
  const { token, user } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterArea, setFilterArea] = useState("todas");
  const [assignSquad, setAssignSquad] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [expandedEvidences, setExpandedEvidences] = useState<number | null>(null);

  const fetchTickets = async (): Promise<Ticket[]> => {
    if (!token) return [];
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tickets`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data: Ticket[] = await res.json(); setTickets(data); return data; }
      return [];
    } finally { setLoading(false); }
  };

  const fetchSquads = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/squads`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSquads(await res.json());
    } catch { /* optional */ }
  };

  useEffect(() => { if (token) { fetchTickets(); fetchSquads(); } }, [token]);

  const areas = Array.from(new Set(tickets.map(t => t.area_name).filter(Boolean)));

  const filtered = tickets.filter(t => {
    if (filterStatus !== "todos" && t.status !== filterStatus) return false;
    if (filterArea !== "todas" && t.area_name !== filterArea) return false;
    return true;
  });

  const availableSquads = selectedTicket
    ? squads.filter(s => s.area_name === selectedTicket.area_name)
    : squads;

  const handleAssign = async () => {
    if (!token || !selectedTicket || !assignSquad) return;
    setAssigning(true);
    try {
      const res = await fetch(`${API_URL}/tickets/${selectedTicket.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ squad_name: assignSquad }),
      });
      if (res.ok) {
        const currentIdx = STATUS_FLOW.indexOf(selectedTicket.status);
        if (currentIdx < STATUS_FLOW.indexOf("Asignado")) {
          await fetch(`${API_URL}/tickets/${selectedTicket.id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: "Asignado" }),
          });
        }
        const fresh = await fetchTickets();
        const updated = fresh.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
        await fetchSquads();
      }
    } finally { setAssigning(false); }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!token || !selectedTicket) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API_URL}/tickets/${selectedTicket.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const fresh = await fetchTickets();
        const updated = fresh.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
        if (newStatus === "Resuelto" || newStatus === "Cerrado") await fetchSquads();
      }
    } finally { setUpdatingStatus(false); }
  };

  const countByStatus = (s: string) => tickets.filter(t => t.status === s).length;

  return (
    <div>
      {/* ── Contenido principal ── */}

      {/* ── Panel header ── */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#1e293b" }}>Panel Operador</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#64748b" }}>
            Hola, <span className="font-medium">{user?.name}</span> — Gestión y seguimiento de solicitudes ciudadanas
          </p>
        </div>
        <button onClick={() => { fetchTickets(); fetchSquads(); }} disabled={loading}
          className="p-2 rounded-lg border transition-all"
          style={{ borderColor: "rgba(37,150,190,0.15)", color: "#64748b", background: "rgba(255,255,255,0.7)" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── KPIs x5 ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          { label: "Total", count: tickets.length, color: "#1e293b", bg: "rgba(255,255,255,0.85)", border: "rgba(37,150,190,0.12)" },
          { label: "Recibidos", count: countByStatus("Recibido"), color: "#2596be", bg: "rgba(37,150,190,0.07)", border: "rgba(37,150,190,0.2)" },
          { label: "Asignados", count: countByStatus("Asignado"), color: "#7c3aed", bg: "rgba(139,92,246,0.07)", border: "rgba(139,92,246,0.2)" },
          { label: "En Gestión", count: countByStatus("En Gestión"), color: "#b45309", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.2)" },
          { label: "Resueltos", count: countByStatus("Resuelto"), color: "#7a8504", bg: "rgba(192,207,5,0.09)", border: "rgba(192,207,5,0.25)" },
        ].map(({ label, count, color, bg, border }) => (
          <div key={label} className="rounded-2xl border p-4"
            style={{ background: bg, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: border, boxShadow: "0 2px 12px rgba(37,150,190,0.05)" }}>
            <div className="text-[11.5px] mb-1" style={{ color: "#94a3b8" }}>{label}</div>
            <div className="text-2xl font-semibold" style={{ color }}>{count}</div>
          </div>
        ))}
      </div>

      {/* ── Mapa de solicitudes ── */}
      {tickets.length > 0 && (
        <div className="mb-5 rounded-2xl border overflow-hidden"
          style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "rgba(37,150,190,0.1)", boxShadow: "0 4px 24px rgba(37,150,190,0.07)" }}>
          {/* Franja tricolor */}
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #2596be 0%, #c0cf05 50%, #b82c87 100%)" }} />
          <div className="px-5 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "rgba(37,150,190,0.08)" }}>
            <h2 className="text-[13.5px] font-semibold" style={{ color: "#1e293b" }}>
              Mapa de solicitudes
            </h2>
            <div className="flex items-center gap-3 text-[11.5px]" style={{ color: "#94a3b8" }}>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#b82c87" }} /> Alta</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#f59e0b" }} /> Media</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#2596be" }} /> Baja</span>
            </div>
          </div>
          <LeafletMap
            markers={tickets
              .filter(t => t.status !== "Cerrado")
              .map((t, i): MapMarker => {
                // Distribute within Vitacura bounding box with deterministic offset from ticket id
                const seed = (t.id * 7 + i * 13) % 100;
                const lat = -33.388 + (seed % 20) * 0.0015 - 0.015;
                const lng = -70.572 + (seed % 15) * 0.002 - 0.015;
                return {
                  id: `#${t.id}`,
                  lat,
                  lng,
                  title: t.title,
                  desc: t.area_name || t.description?.slice(0, 60) || "",
                  urgency: t.urgency_level,
                  status: t.status,
                };
              })}
            height={320}
            center={[-33.392, -70.578]}
            zoom={14}
          />
        </div>
      )}

      {/* ── Tabla + Panel lateral ── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: selectedTicket ? "1fr 360px" : "1fr" }}>

        {/* Tabla de tickets */}
        <div className="rounded-2xl border overflow-hidden"
          style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "rgba(37,150,190,0.1)", boxShadow: "0 4px 24px rgba(37,150,190,0.07)" }}>
          {/* Barra tricolor top */}
          <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, #2596be 0%, #c0cf05 50%, #b82c87 100%)" }} />

          {/* Filtros */}
          <div className="px-5 py-3.5 border-b flex gap-3 flex-wrap items-center"
            style={{ borderColor: "rgba(37,150,190,0.08)" }}>
            <h2 className="text-[13.5px] font-semibold flex-1" style={{ color: "#1e293b" }}>
              Solicitudes ({filtered.length})
            </h2>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-[13px] outline-none cursor-pointer border"
              style={{ background: "rgba(255,255,255,0.8)", borderColor: "rgba(37,150,190,0.15)", color: "#64748b" }}>
              <option value="todos">Todos los estados</option>
              {STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-[13px] outline-none cursor-pointer border"
              style={{ background: "rgba(255,255,255,0.8)", borderColor: "rgba(37,150,190,0.15)", color: "#64748b" }}>
              <option value="todas">Todas las áreas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "rgba(37,150,190,0.04)", borderBottom: "1px solid rgba(37,150,190,0.08)" }}>
                  {["#", "Título", "Urgencia", "Área", "Cuadrilla", "Estado"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11.5px] font-medium" style={{ color: "#94a3b8" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ticket => (
                  <tr key={ticket.id}
                    onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : (tickets.find(t => t.id === ticket.id) ?? ticket))}
                    className="cursor-pointer border-b transition-colors"
                    style={{
                      borderColor: "rgba(37,150,190,0.06)",
                      background: selectedTicket?.id === ticket.id ? "rgba(37,150,190,0.05)" : "transparent",
                    }}
                    onMouseEnter={e => { if (selectedTicket?.id !== ticket.id) (e.currentTarget as HTMLTableRowElement).style.background = "rgba(37,150,190,0.03)"; }}
                    onMouseLeave={e => { if (selectedTicket?.id !== ticket.id) (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                  >
                    <td className="px-4 py-3 text-[12px] font-mono" style={{ color: "#94a3b8" }}>#{ticket.id}</td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium truncate max-w-[180px]" style={{ color: "#1e293b" }}>{ticket.title}</div>
                      <div className="text-[11.5px]" style={{ color: "#94a3b8" }}>por {ticket.reported_by}</div>
                    </td>
                    <td className="px-4 py-3"><UrgencyBadge level={ticket.urgency_level} score={ticket.priority_score} /></td>
                    <td className="px-4 py-3 text-[12.5px]" style={{ color: "#64748b" }}>{ticket.area_name || "—"}</td>
                    <td className="px-4 py-3 text-[12.5px] truncate max-w-[140px]" style={{ color: "#64748b" }}>{ticket.squad_name || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[13px]" style={{ color: "#94a3b8" }}>
                      {loading ? "Cargando..." : "No hay solicitudes con estos filtros"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Panel de gestión ── */}
        {selectedTicket ? (
          <div className="rounded-2xl border p-5 space-y-5 sticky top-[93px] max-h-[calc(100vh-120px)] overflow-y-auto"
            style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: "rgba(37,150,190,0.12)", boxShadow: "0 8px 32px rgba(37,150,190,0.1)" }}>

            {/* Franja tricolor */}
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: "linear-gradient(90deg, #2596be, #c0cf05, #b82c87)" }} />

            {/* Info básica */}
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[11.5px] font-mono" style={{ color: "#94a3b8" }}>#{selectedTicket.id}</span>
                <StatusBadge status={selectedTicket.status} />
                <UrgencyBadge level={selectedTicket.urgency_level} score={selectedTicket.priority_score} />
              </div>
              <h2 className="text-[14px] font-semibold mb-1" style={{ color: "#1e293b" }}>{selectedTicket.title}</h2>
              <p className="text-[12.5px]" style={{ color: "#64748b" }}>{selectedTicket.description}</p>
            </div>

            {/* Detalles */}
            <div className="space-y-2 text-[12.5px]">
              <div className="flex justify-between">
                <span style={{ color: "#94a3b8" }}>Solicitante</span>
                <span className="font-medium" style={{ color: "#1e293b" }}>{selectedTicket.reported_by}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#94a3b8" }}>Email</span>
                <span style={{ color: "#64748b" }}>{selectedTicket.reported_by_email}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#94a3b8" }}>Área clasificada</span>
                <span className="font-medium" style={{ color: "#1e293b" }}>{selectedTicket.area_name || "—"}</span>
              </div>
              {selectedTicket.squad_name && (
                <div className="flex justify-between">
                  <span style={{ color: "#94a3b8" }}>Cuadrilla asignada</span>
                  <span className="font-medium" style={{ color: "#7c3aed" }}>{selectedTicket.squad_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{ color: "#94a3b8" }}>Fecha límite SLA</span>
                <span style={{ color: "#1e293b" }}>{new Date(selectedTicket.planned_date).toLocaleDateString("es-CL")}</span>
              </div>
            </div>

            <div className="h-px" style={{ background: "rgba(37,150,190,0.1)" }} />

            {/* Asignar cuadrilla */}
            <div>
              <div className="text-[11px] uppercase tracking-wide font-medium mb-2.5" style={{ color: "#94a3b8" }}>
                Reasignar cuadrilla
              </div>
              <div className="space-y-2">
                <select value={assignSquad} onChange={e => setAssignSquad(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none border"
                  style={{ background: "rgba(255,255,255,0.9)", borderColor: "rgba(37,150,190,0.2)", color: "#1e293b" }}
                  onFocus={e => e.target.style.borderColor = "#2596be"}
                  onBlur={e => e.target.style.borderColor = "rgba(37,150,190,0.2)"}>
                  <option value="">Seleccionar cuadrilla...</option>
                  {(availableSquads.length > 0 ? availableSquads : squads).map(s => (
                    <option key={s.id} value={s.name}>{s.name} ({s.pending_tasks} tareas)</option>
                  ))}
                </select>
                <button onClick={handleAssign} disabled={!assignSquad || assigning}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-medium transition-all"
                  style={{
                    background: assignSquad && !assigning ? "linear-gradient(135deg, #2596be 0%, #1a7fa0 100%)" : "rgba(0,0,0,0.07)",
                    color: assignSquad && !assigning ? "white" : "#94a3b8",
                    boxShadow: assignSquad && !assigning ? "0 3px 10px rgba(37,150,190,0.3)" : "none",
                  }}>
                  <UserCheck className="w-4 h-4" />
                  {assigning ? "Asignando..." : "Asignar cuadrilla"}
                </button>
              </div>
            </div>

            <div className="h-px" style={{ background: "rgba(37,150,190,0.1)" }} />

            {/* Cambiar estado */}
            <div>
              <div className="text-[11px] uppercase tracking-wide font-medium mb-2.5" style={{ color: "#94a3b8" }}>Cambiar estado</div>
              <div className="space-y-1.5">
                {STATUS_FLOW.map(s => {
                  const currentIdx = STATUS_FLOW.indexOf(selectedTicket.status);
                  const idx = STATUS_FLOW.indexOf(s);
                  const isCurrent = s === selectedTicket.status;
                  const isNext = idx === currentIdx + 1;
                  return (
                    <button key={s}
                      onClick={() => handleUpdateStatus(s)}
                      disabled={updatingStatus || isCurrent || idx < currentIdx}
                      className="w-full text-left px-3 py-2 rounded-lg text-[13px] border transition-all"
                      style={{
                        background: isCurrent ? "rgba(37,150,190,0.08)" : "transparent",
                        borderColor: isCurrent ? "rgba(37,150,190,0.25)" : isNext ? "rgba(192,207,5,0.3)" : "rgba(0,0,0,0.08)",
                        color: isCurrent ? "#2596be" : idx < currentIdx ? "rgba(0,0,0,0.2)" : "#64748b",
                        fontWeight: isCurrent ? 600 : 400,
                        cursor: isCurrent || idx < currentIdx ? "default" : "pointer",
                      }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full"
                          style={{ background: isCurrent ? "#2596be" : idx < currentIdx ? "#c0cf05" : "rgba(0,0,0,0.15)" }} />
                        {s}
                        {isCurrent && <span className="ml-auto text-[11px]" style={{ color: "#2596be" }}>actual</span>}
                        {isNext && !updatingStatus && <span className="ml-auto text-[11px]" style={{ color: "#c0cf05" }}>← marcar</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              {updatingStatus && (
                <p className="text-[12px] mt-2 text-center" style={{ color: "#94a3b8" }}>Actualizando estado...</p>
              )}
            </div>

            {/* Evidencias */}
            {selectedTicket.evidences?.length > 0 && (
              <>
                <div className="h-px" style={{ background: "rgba(37,150,190,0.1)" }} />
                <div>
                  <button
                    onClick={() => setExpandedEvidences(expandedEvidences === selectedTicket.id ? null : selectedTicket.id)}
                    className="w-full flex items-center justify-between text-[11px] uppercase tracking-wide font-medium mb-2"
                    style={{ color: "#94a3b8" }}>
                    Evidencias del ciudadano ({selectedTicket.evidences.length})
                    {expandedEvidences === selectedTicket.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {expandedEvidences === selectedTicket.id && (
                    <div className="space-y-2">
                      {selectedTicket.evidences.map((ev, i) => (
                        <div key={i} className="rounded-xl overflow-hidden border" style={{ borderColor: "rgba(37,150,190,0.12)" }}>
                          {ev.image_url && <img src={ev.image_url} alt={`Evidencia ${i + 1}`} className="w-full object-cover max-h-40" loading="lazy" />}
                          {ev.description && <div className="px-3 py-2 text-[12px]" style={{ color: "#64748b" }}>{ev.description}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Empty state cuando no hay ticket seleccionado: mensaje flotante */}
      {!selectedTicket && (
        <div className="mt-4 rounded-2xl border p-5 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(37,150,190,0.1)", color: "#94a3b8" }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: "#2596be" }} />
          <p className="text-[13px]">Selecciona un ticket de la tabla para gestionarlo, asignar cuadrilla y actualizar estado</p>
        </div>
      )}
    </div>
  );
}
