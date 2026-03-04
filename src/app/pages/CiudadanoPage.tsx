import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Mic,
  Phone,
  ChevronRight,
  HelpCircle,
  LogOut,
  Bell,
  MapPin,
  Camera,
} from "lucide-react";
import { useAuth, API_URL } from "../../context/AuthContext";

const VITACURA_LOGO =
  "https://vitacura.cl/app/themes/vitacura-sage/public/images/logos-vitacura_sineslogan_hor.36ae38.png";
const HERO_IMG =
  "https://vitacura.cl/app/themes/vitacura-sage/public/images/parque-bicentenario/header/header_parque-bicentenario.e6912a.jpg";

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
  area_name: string;
  assigned_to: string | null;
  squad_name?: string | null;
  planned_date: string;
  created_at: string;
  evidences: Evidence[];
}

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

function UrgencyBadge({ level }: { level: string }) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    Alta: { bg: "rgba(184,44,135,0.08)", text: "#b82c87", border: "rgba(184,44,135,0.25)" },
    Media: { bg: "rgba(245,158,11,0.1)", text: "#b45309", border: "rgba(245,158,11,0.25)" },
    Baja: { bg: "rgba(37,150,190,0.1)", text: "#2596be", border: "rgba(37,150,190,0.2)" },
  };
  const c = map[level] || { bg: "rgba(100,116,139,0.1)", text: "#475569", border: "rgba(100,116,139,0.2)" };
  return (
    <span className="px-2 py-0.5 rounded-md text-[11.5px] font-medium border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}>
      {level}
    </span>
  );
}

// ── Image resize helper ───────────────────────────────────────────────────────
function resizeImage(file: File, maxSize = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Main component ────────────────────────────────────────────────────────────
export function CiudadanoPage() {
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string>("");
  const [geolocation, setGeolocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fetchTickets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/my-tickets`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setTickets(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { if (token) fetchTickets(); }, [token]);

  const getLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGeolocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => console.log("Geo error:", err)
      );
    }
  };

  const handleSubmit = async () => {
    if (!token) { alert("Sesión no lista. Intenta de nuevo."); return; }
    if (!description.trim()) { alert("Por favor describe el problema"); return; }
    setSubmitting(true);
    try {
      const problem = description.trim();
      const title = problem.length > 80 ? `${problem.slice(0, 77)}...` : problem;
      const res = await fetch(`${API_URL}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description: problem, image_url: photoDataUrl || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`✅ Solicitud #${data.ticket_id} enviada. El equipo municipal la revisará pronto.`);
        setDescription(""); setPhotoDataUrl(""); setShowForm(false); fetchTickets();
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        alert(`Error: ${data.detail || data.message || "Error al enviar"}`);
      }
    } catch { alert("Error de conexión. Intenta de nuevo."); }
    finally { setSubmitting(false); }
  };

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    try { setPhotoDataUrl(await resizeImage(file, 480)); }
    catch { const r = new FileReader(); r.onload = () => setPhotoDataUrl(r.result as string); r.readAsDataURL(file); }
  };

  const stepFlow = ["Recibido", "Asignado", "En Gestión", "Resuelto"];

  const openCount = tickets.filter(t => !["Resuelto", "Cerrado"].includes(t.status)).length;
  const resolvedCount = tickets.filter(t => ["Resuelto", "Cerrado"].includes(t.status)).length;

  return (
    <div className="min-h-screen" style={{
      background: "linear-gradient(150deg, #ffffff 0%, rgba(37,150,190,0.04) 35%, rgba(192,207,5,0.03) 65%, rgba(184,44,135,0.03) 100%)",
    }}>
      {/* Orbs */}
      <div className="fixed top-0 right-0 w-96 h-96 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(37,150,190,0.07) 0%, transparent 70%)", filter: "blur(60px)", zIndex: 0 }} />
      <div className="fixed bottom-0 left-0 w-72 h-72 pointer-events-none" style={{ background: "radial-gradient(circle, rgba(184,44,135,0.06) 0%, transparent 70%)", filter: "blur(60px)", zIndex: 0 }} />

      {/* ── Franja institucional superior ── */}
      <div className="w-full h-7 flex items-center px-4 sm:px-6 relative z-50"
        style={{ background: "rgba(255,255,255,0.9)", borderBottom: "1px solid rgba(37,150,190,0.1)" }}>
        <div className="flex items-center gap-3 text-[11px] w-full" style={{ color: "#64748b" }}>
          <span className="flex items-center gap-1.5 font-semibold hidden sm:flex" style={{ color: "#2596be" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2596be" }} />
            Municipalidad de Vitacura
          </span>
          <span className="hidden sm:inline" style={{ color: "rgba(100,116,139,0.3)" }}>|</span>
          <a href="tel:+5622585700" className="flex items-center gap-1 hover:text-[#2596be] transition-colors">
            <Phone className="w-2.5 h-2.5" /> (02) 2585 7000
          </a>
          <span style={{ color: "rgba(100,116,139,0.3)" }}>·</span>
          <a href="https://vitacura.cl/atencion-vecinos" target="_blank" rel="noopener noreferrer"
            className="hover:text-[#2596be] transition-colors hidden sm:inline">Atención al Vecino</a>
          <a href="https://vitacura.cl" target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 hover:text-[#2596be] transition-colors hidden sm:flex">
            vitacura.cl
          </a>
        </div>
      </div>
      {/* Hairline tricolor */}
      <div className="w-full h-0.5 relative z-50" style={{ background: "linear-gradient(90deg, #2596be 0%, #c0cf05 50%, #b82c87 100%)" }} />

      {/* ── Header sticky glass ── */}
      <header className="sticky top-0 z-40 w-full relative"
        style={{
          background: scrolled ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(37,150,190,0.1)",
          boxShadow: scrolled ? "0 4px 24px rgba(37,150,190,0.1)" : "none",
          transition: "box-shadow 0.2s",
        }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between">
          {/* Logo suelto + brand */}
          <div className="flex items-center gap-3">
            <img src={VITACURA_LOGO} alt="Municipalidad de Vitacura" className="h-7 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div className="h-4 w-px" style={{ background: "rgba(37,150,190,0.2)" }} />
            <div>
              <div className="text-[15px] font-semibold leading-tight" style={{ color: "#1e293b" }}>
                Vita<span style={{ color: "#2596be" }}>360</span>
              </div>
              <div className="text-[10px] leading-none" style={{ color: "#94a3b8" }}>Atención Ciudadana</div>
            </div>
          </div>

          {/* Usuario + acciones */}
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg transition-colors"
              style={{ color: "#94a3b8" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(37,150,190,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            </button>
            {user && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center border text-[11px] font-semibold"
                  style={{ background: "rgba(37,150,190,0.1)", borderColor: "rgba(37,150,190,0.2)", color: "#2596be" }}>
                  {user.name?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="text-[13px] hidden sm:block" style={{ color: "#64748b" }}>{user.name}</span>
              </div>
            )}
            <button onClick={() => { logout(); navigate("/"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] transition-colors border"
              style={{ color: "#dc2626", borderColor: "rgba(239,68,68,0.15)", background: "transparent" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Contenido principal ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 relative z-10">

        {/* ── Hero con imagen de Parque Bicentenario ── */}
        <div className="relative rounded-2xl overflow-hidden mb-6" style={{ height: 200, boxShadow: "0 8px 32px rgba(37,150,190,0.14)" }}>
          <img src={HERO_IMG} alt="Parque Bicentenario Vitacura" className="absolute inset-0 w-full h-full object-cover" />
          {/* Overlay degradado izquierda → transparente */}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(37,150,190,0.82) 0%, rgba(37,150,190,0.55) 40%, transparent 100%)" }} />

          {/* Contenido izquierda */}
          <div className="relative h-full flex flex-col justify-center px-6 sm:px-8">
            <div className="text-[11px] font-medium uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.75)" }}>
              Municipalidad de Vitacura
            </div>
            <h1 className="text-white text-xl sm:text-2xl font-semibold leading-tight mb-4">
              Atención al Vecino<br className="hidden sm:block" />
              <span style={{ color: "rgba(255,255,255,0.85)" }}>· Mis Solicitudes</span>
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all"
                style={{ background: "#ffffff", color: "#2596be", boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}>
                <PlusCircle className="w-4 h-4" /> Nueva solicitud
              </button>
              <a href="https://vitacura.cl/atencion-vecinos" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.2)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.35)" }}>
                <HelpCircle className="w-4 h-4" /> Ver guía / ayuda
              </a>
            </div>
          </div>

          {/* Estadísticas flotantes derecha */}
          <div className="absolute right-4 bottom-4 flex gap-2">
            <div className="px-3 py-2 rounded-xl text-center"
              style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
              <p className="text-lg font-bold" style={{ color: "#2596be" }}>{loading ? "—" : openCount}</p>
              <p className="text-[10px]" style={{ color: "#64748b" }}>Abiertas</p>
            </div>
            <div className="px-3 py-2 rounded-xl text-center"
              style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
              <p className="text-lg font-bold" style={{ color: "#7a8504" }}>{loading ? "—" : resolvedCount}</p>
              <p className="text-[10px]" style={{ color: "#64748b" }}>Resueltas</p>
            </div>
          </div>
        </div>

        {/* ── Mensaje de éxito ── */}
        {successMsg && (
          <div className="flex items-center gap-2.5 px-4 py-3 mb-5 rounded-xl border text-[13px] transition-all"
            style={{ background: "rgba(192,207,5,0.08)", borderColor: "rgba(192,207,5,0.25)", color: "#7a8504" }}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {successMsg}
            <button onClick={() => setSuccessMsg("")} className="ml-auto text-lg leading-none" style={{ color: "#7a8504" }}>×</button>
          </div>
        )}



        {/* ── Mis solicitudes header ── */}
        {!showForm && !selectedTicket && (
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[15px] font-semibold" style={{ color: "#1e293b" }}>Mis solicitudes</h2>
              <p className="text-[12.5px] mt-0.5" style={{ color: "#94a3b8" }}>
                Hola, <span className="font-medium" style={{ color: "#64748b" }}>{user?.name}</span> — seguimiento de tus reportes ciudadanos
              </p>
            </div>
            <button onClick={fetchTickets} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors border"
              style={{ color: "#64748b", borderColor: "rgba(37,150,190,0.15)", background: "rgba(255,255,255,0.7)" }}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        )}

        {/* ── Formulario nueva solicitud ── */}
        {showForm && (
          <div className="rounded-2xl border p-5 mb-5"
            style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: "rgba(37,150,190,0.12)", boxShadow: "0 8px 32px rgba(37,150,190,0.1)" }}>
            {/* Franja tricolor */}
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: "linear-gradient(90deg, #2596be, #c0cf05, #b82c87)" }} />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold" style={{ color: "#1e293b" }}>Nueva solicitud ciudadana</h2>
              <button onClick={() => setShowForm(false)} className="text-xl leading-none" style={{ color: "#94a3b8" }}>×</button>
            </div>
            <div className="space-y-4">
              {/* Ubicación */}
              <div className="rounded-lg p-3" style={{ background: "rgba(37,150,190,0.04)", border: "1px solid rgba(37,150,190,0.1)" }}>
                <button type="button" onClick={getLocation}
                  className="w-full px-3 py-2 rounded-lg font-medium text-[13px] transition-all flex items-center justify-center gap-2"
                  style={{ background: geolocation ? "rgba(192,207,5,0.1)" : "rgba(37,150,190,0.1)", color: geolocation ? "#7a8504" : "#2596be", border: geolocation ? "1px solid rgba(192,207,5,0.3)" : "1px solid rgba(37,150,190,0.25)" }}>
                  <MapPin className="w-4 h-4" />
                  {geolocation ? `Ubicación guardada (${geolocation.latitude.toFixed(4)}, ${geolocation.longitude.toFixed(4)})` : "Usar mi ubicación"}
                </button>
                <p className="text-[11px] mt-1.5" style={{ color: "#94a3b8" }}>La ubicación se usa como referencia aproximada del problema.</p>
              </div>

              {/* Descripción */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[12px] font-medium" style={{ color: "#64748b" }}>¿Cuál es el problema?</label>
                  <button type="button" className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border"
                    style={{ color: "#94a3b8", borderColor: "rgba(0,0,0,0.1)" }}>
                    <Mic className="w-3.5 h-3.5" /> Voz
                  </button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe el problema: dirección exacta, tipo (árbol, basura, vereda, bache, luz, agua, etc.)"
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none resize-none transition-all border"
                  style={{ borderColor: "rgba(37,150,190,0.2)", background: "rgba(255,255,255,0.9)", color: "#1e293b" }}
                  onFocus={e => e.target.style.borderColor = "#2596be"}
                  onBlur={e => e.target.style.borderColor = "rgba(37,150,190,0.2)"}
                />
                <p className="text-[11px] mt-1" style={{ color: "#94a3b8" }}>
                  💡 El sistema clasificará automáticamente tu solicitud según palabras clave
                </p>
              </div>

              {/* Foto */}
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: "#64748b" }}>Foto (opcional, máx 1)</label>
                <div className="flex gap-2 items-center flex-wrap">
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoPick} />
                  <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoPick} />
                  <button type="button" onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] border transition-all"
                    style={{ borderColor: "rgba(37,150,190,0.2)", color: "#64748b", background: "rgba(255,255,255,0.7)" }}>
                    <Camera className="w-4 h-4" /> Cámara
                  </button>
                  <button type="button" onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] border transition-all"
                    style={{ borderColor: "rgba(37,150,190,0.2)", color: "#64748b", background: "rgba(255,255,255,0.7)" }}>
                    Galería
                  </button>
                  {photoDataUrl && (
                    <button type="button" onClick={() => setPhotoDataUrl("")}
                      className="px-3 py-2 rounded-lg text-[13px] border transition-all"
                      style={{ borderColor: "rgba(184,44,135,0.3)", color: "#b82c87", background: "rgba(184,44,135,0.05)" }}>
                      Quitar
                    </button>
                  )}
                </div>
                {photoDataUrl && (
                  <div className="mt-3">
                    <img src={photoDataUrl} alt="Preview" className="w-full max-w-[360px] rounded-lg border" style={{ borderColor: "rgba(37,150,190,0.12)" }} />
                  </div>
                )}
                <p className="text-[11px] mt-1" style={{ color: "#94a3b8" }}>Se guarda como evidencia en el ticket. Imagen reducida a 480px.</p>
              </div>

              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg text-[13px] border transition-all"
                  style={{ borderColor: "rgba(0,0,0,0.1)", color: "#64748b" }}>
                  Cancelar
                </button>
                <button onClick={handleSubmit} disabled={submitting || !description.trim()}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
                  style={{
                    background: description.trim() && !submitting ? "linear-gradient(135deg, #2596be 0%, #1a7fa0 100%)" : "#e2e8f0",
                    color: description.trim() && !submitting ? "#ffffff" : "#94a3b8",
                    boxShadow: description.trim() && !submitting ? "0 3px 12px rgba(37,150,190,0.3)" : "none",
                    cursor: description.trim() && !submitting ? "pointer" : "not-allowed",
                  }}>
                  {submitting ? "Enviando..." : "Enviar solicitud"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Detalle de ticket ── */}
        {selectedTicket ? (
          <div className="space-y-3">
            <button type="button" onClick={() => setSelectedTicket(null)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] border transition-all"
              style={{ borderColor: "rgba(37,150,190,0.15)", color: "#64748b", background: "rgba(255,255,255,0.7)" }}>
              ← Volver a mis solicitudes
            </button>

            <div className="rounded-2xl border p-5 space-y-5"
              style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderColor: "rgba(37,150,190,0.1)", boxShadow: "0 4px 24px rgba(37,150,190,0.08)" }}>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[11.5px] font-mono" style={{ color: "#94a3b8" }}>#{selectedTicket.id}</span>
                  <StatusBadge status={selectedTicket.status} />
                  {selectedTicket.urgency_level && <UrgencyBadge level={selectedTicket.urgency_level} />}
                  {selectedTicket.area_name && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] border"
                      style={{ background: "rgba(37,150,190,0.06)", color: "#64748b", borderColor: "rgba(37,150,190,0.15)" }}>
                      {selectedTicket.area_name}
                    </span>
                  )}
                </div>
                <h2 className="text-[13.5px] font-medium mt-1.5" style={{ color: "#1e293b" }}>
                  {selectedTicket.description || selectedTicket.title}
                </h2>
              </div>

              {/* Timeline */}
              <div>
                <div className="text-[11px] uppercase tracking-wide font-medium mb-2.5" style={{ color: "#94a3b8" }}>Estado del proceso</div>
                <div className="space-y-2">
                  {stepFlow.map((step, i) => {
                    const currentIdx = stepFlow.indexOf(selectedTicket.status);
                    const done = i <= currentIdx;
                    const active = i === currentIdx;
                    return (
                      <div key={step} className="flex items-center gap-2.5 p-2 rounded-lg"
                        style={{ background: active ? "rgba(37,150,190,0.06)" : "transparent" }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: done ? "#c0cf05" : "rgba(0,0,0,0.1)" }}>
                          {done ? (
                            <svg className="w-3 h-3" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <span className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.5)" }} />
                          )}
                        </div>
                        <span className="text-[12.5px]"
                          style={{ color: done ? (active ? "#2596be" : "#7a8504") : "#94a3b8", fontWeight: active ? 600 : done ? 500 : 400 }}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detalles */}
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-wide font-medium" style={{ color: "#94a3b8" }}>Detalles</div>
                {selectedTicket.area_name && (
                  <div className="flex justify-between text-[12.5px]">
                    <span style={{ color: "#64748b" }}>Área asignada</span>
                    <span className="font-medium" style={{ color: "#1e293b" }}>{selectedTicket.area_name}</span>
                  </div>
                )}
                {(selectedTicket.squad_name || selectedTicket.assigned_to) && (
                  <div className="flex justify-between text-[12.5px]">
                    <span style={{ color: "#64748b" }}>Cuadrilla</span>
                    <span className="font-medium" style={{ color: "#2596be" }}>{selectedTicket.squad_name || selectedTicket.assigned_to}</span>
                  </div>
                )}
                {selectedTicket.urgency_level && (
                  <div className="flex justify-between text-[12.5px] items-center">
                    <span style={{ color: "#64748b" }}>Urgencia</span>
                    <UrgencyBadge level={selectedTicket.urgency_level} />
                  </div>
                )}
                {selectedTicket.planned_date && (
                  <div className="flex justify-between text-[12.5px]">
                    <span style={{ color: "#64748b" }}>Fecha límite SLA</span>
                    <span style={{ color: "#1e293b" }}>{new Date(selectedTicket.planned_date).toLocaleDateString("es-CL")}</span>
                  </div>
                )}
                <div className="flex justify-between text-[12.5px]">
                  <span style={{ color: "#64748b" }}>Creado</span>
                  <span style={{ color: "#1e293b" }}>{new Date(selectedTicket.created_at).toLocaleDateString("es-CL")}</span>
                </div>
              </div>

              {/* Foto adjunta */}
              <div>
                <div className="text-[11px] uppercase tracking-wide font-medium mb-2.5" style={{ color: "#94a3b8" }}>Foto adjunta</div>
                {selectedTicket.evidences?.[0]?.image_url ? (
                  <div className="rounded-xl overflow-hidden border" style={{ borderColor: "rgba(37,150,190,0.12)" }}>
                    <img src={selectedTicket.evidences[0].image_url} alt="Evidencia" className="w-full object-cover max-h-56" />
                    {selectedTicket.evidences[0].description && (
                      <div className="px-3 py-2 text-[12px]" style={{ color: "#64748b" }}>{selectedTicket.evidences[0].description}</div>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px]" style={{ color: "#94a3b8" }}>Sin foto adjunta</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Lista de tickets ── */
          <div className="space-y-3">
            {loading && tickets.length === 0 && (
              <div className="rounded-2xl border p-8 text-center text-[13px]"
                style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(37,150,190,0.1)", color: "#94a3b8" }}>
                Cargando solicitudes...
              </div>
            )}
            {!loading && tickets.length === 0 && (
              <div className="rounded-2xl border p-8 text-center"
                style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(16px)", borderColor: "rgba(37,150,190,0.1)", boxShadow: "0 4px 20px rgba(37,150,190,0.06)" }}>
                <AlertTriangle className="w-8 h-8 mx-auto mb-3" style={{ color: "#94a3b8" }} />
                <p className="text-[13px] mb-3" style={{ color: "#94a3b8" }}>No has enviado solicitudes aún</p>
                <button onClick={() => setShowForm(true)}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
                  style={{ background: "linear-gradient(135deg, #2596be 0%, #1a7fa0 100%)", color: "white", boxShadow: "0 3px 10px rgba(37,150,190,0.3)" }}>
                  Crear primera solicitud
                </button>
              </div>
            )}
            {tickets.map((ticket) => (
              <button key={ticket.id} onClick={() => setSelectedTicket(ticket)}
                className="w-full text-left rounded-2xl border p-4 transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(12px)", borderColor: "rgba(37,150,190,0.1)", boxShadow: "0 2px 8px rgba(37,150,190,0.05)" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(37,150,190,0.3)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 24px rgba(37,150,190,0.1)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(37,150,190,0.1)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(37,150,190,0.05)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11.5px] font-mono" style={{ color: "#94a3b8" }}>#{ticket.id}</span>
                    <StatusBadge status={ticket.status} />
                    {ticket.urgency_level && <UrgencyBadge level={ticket.urgency_level} />}
                  </div>
                  <span className="text-[11px] shrink-0" style={{ color: "#94a3b8" }}>
                    {new Date(ticket.created_at).toLocaleDateString("es-CL")}
                  </span>
                </div>
                <h3 className="text-[13.5px] font-medium mb-1" style={{ color: "#1e293b" }}>{ticket.title}</h3>
                <p className="text-[12px] line-clamp-2" style={{ color: "#64748b" }}>{ticket.description}</p>
                <div className="mt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[11.5px]" style={{ color: "#94a3b8" }}>
                    {ticket.area_name && <span>{ticket.area_name}</span>}
                    {ticket.assigned_to && <span>👷 {ticket.assigned_to}</span>}
                    {ticket.evidences?.length > 0 && <span>📎 {ticket.evidences.length} foto</span>}
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: "#94a3b8" }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
