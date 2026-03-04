import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const VITACURA_LOGO =
  "https://vitacura.cl/app/themes/vitacura-sage/public/images/logos-vitacura_sineslogan_hor.36ae38.png";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [tab, setTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"ciudadano" | "operador" | "jefe_cuadrilla">("ciudadano");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(""); setSuccess("");
    if (tab === "register" && !name.trim()) { setError("El nombre es obligatorio"); return; }
    if (!email.trim()) { setError("El correo es obligatorio"); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    setLoading(true);
    try {
      if (tab === "login") {
        const userData = await login(email.trim(), password);
        if (userData?.role === "jefe_cuadrilla") {
          navigate("/jefe-cuadrilla");
        } else if (userData?.role === "operador" || userData?.role === "supervisor" || userData?.role === "operator") {
          navigate("/app");
        } else {
          navigate("/");
        }
      } else {
        await register(name.trim(), email.trim(), password, role);
        setSuccess("Cuenta creada. Ahora puedes iniciar sesión.");
        setTab("login"); setName(""); setPassword("");
      }
    } catch (e: any) {
      setError(e.message || "Error inesperado");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: "url(https://vitanew.tchile.com/app/uploads/2023/10/bosque-urbano.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}>

      {/* ── Overlay suave blanquecino con tono azul ── */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(37,150,190,0.25) 50%, rgba(184,44,135,0.15) 100%)"
      }} />

      {/* ── Orbs decorativos difuminados ── */}
      <div className="absolute top-10 left-10 w-64 h-64 rounded-full" style={{
        background: "radial-gradient(circle, rgba(37,150,190,0.2) 0%, transparent 70%)",
        filter: "blur(40px)"
      }} />
      <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full" style={{
        background: "radial-gradient(circle, rgba(184,44,135,0.2) 0%, transparent 70%)",
        filter: "blur(40px)"
      }} />
      <div className="absolute top-1/2 right-1/4 w-40 h-40 rounded-full" style={{
        background: "radial-gradient(circle, rgba(192,207,5,0.15) 0%, transparent 70%)",
        filter: "blur(35px)"
      }} />

      {/* ── Card principal ── */}
      <div className="relative z-10 w-full mx-4" style={{ maxWidth: 420 }}>

        {/* Barra tricolor superior */}
        <div className="h-1 rounded-t-2xl w-full" style={{
          background: "linear-gradient(90deg, #2596be 0%, #c0cf05 50%, #b82c87 100%)"
        }} />

        <div className="rounded-b-2xl p-8" style={{
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.75)",
          borderTop: "none",
          boxShadow: "0 24px 64px rgba(37,150,190,0.18), 0 8px 24px rgba(0,0,0,0.08)",
        }}>

          {/* Logo + título */}
          <div className="flex flex-col items-center mb-6">
            <img src={VITACURA_LOGO} alt="Municipalidad de Vitacura" className="h-9 object-contain mb-3"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <h1 className="text-2xl tracking-tight" style={{ color: "#1e293b" }}>
              Vita<span style={{ color: "#2596be", fontWeight: 700 }}>360</span>
            </h1>
            <p className="text-xs mt-1 tracking-wide" style={{ color: "#64748b" }}>
              Municipalidad de Vitacura &middot; Plataforma Ciudadana
            </p>
            {/* Separador tricolor decorativo */}
            <div className="mt-3 h-0.5 w-16 rounded-full" style={{
              background: "linear-gradient(90deg, #2596be, #c0cf05, #b82c87)"
            }} />
          </div>

          {/* Tabs login/register */}
          <div className="flex rounded-xl p-1 mb-6" style={{
            background: "rgba(37,150,190,0.07)",
            border: "1px solid rgba(37,150,190,0.12)",
          }}>
            {(["login", "register"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                className="flex-1 py-2 text-xs rounded-lg transition-all duration-200"
                style={{
                  background: tab === t
                    ? "linear-gradient(135deg, #2596be 0%, #1a7fa0 100%)"
                    : "transparent",
                  color: tab === t ? "#ffffff" : "#2596be",
                  fontWeight: tab === t ? 600 : 400,
                  boxShadow: tab === t ? "0 2px 12px rgba(37,150,190,0.3)" : "none",
                }}>
                {t === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "register" && (
              <div>
                <label className="block mb-1" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Nombre Completo</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Pérez"
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all"
                  style={{ borderColor: "rgba(37,150,190,0.2)", background: "rgba(255,255,255,0.8)", color: "#1e293b" }}
                  onFocus={(e) => { e.target.style.borderColor = "#2596be"; e.target.style.boxShadow = "0 0 0 3px rgba(37,150,190,0.12)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(37,150,190,0.2)"; e.target.style.boxShadow = "none"; }} />
              </div>
            )}
            <div>
              <label className="block mb-1" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Correo Electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@vitacura.cl"
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all"
                style={{ borderColor: "rgba(37,150,190,0.2)", background: "rgba(255,255,255,0.8)", color: "#1e293b" }}
                onFocus={(e) => { e.target.style.borderColor = "#2596be"; e.target.style.boxShadow = "0 0 0 3px rgba(37,150,190,0.12)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(37,150,190,0.2)"; e.target.style.boxShadow = "none"; }} />
            </div>
            <div>
              <label className="block mb-1" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Contraseña</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border text-sm outline-none transition-all"
                  style={{ borderColor: "rgba(37,150,190,0.2)", background: "rgba(255,255,255,0.8)", color: "#1e293b" }}
                  onFocus={(e) => { e.target.style.borderColor = "#2596be"; e.target.style.boxShadow = "0 0 0 3px rgba(37,150,190,0.12)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(37,150,190,0.2)"; e.target.style.boxShadow = "none"; }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {tab === "register" && (
              <div>
                <label className="block mb-1" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b" }}>Tipo de Cuenta</label>
                <div className="flex gap-2">
                  {(["ciudadano", "operador", "jefe_cuadrilla"] as const).map((r) => (
                    <button key={r} type="button" onClick={() => setRole(r)} className="flex-1 py-2 rounded-lg border text-xs transition-all duration-200"
                      style={{
                        borderColor: role === r ? "#2596be" : "rgba(37,150,190,0.15)",
                        background: role === r ? "rgba(37,150,190,0.1)" : "rgba(255,255,255,0.6)",
                        color: role === r ? "#2596be" : "#64748b",
                        fontWeight: role === r ? 600 : 400,
                      }}>
                      {r === "ciudadano" ? "Ciudadano" : r === "operador" ? "Operador Muni" : "Jefe Cuadrilla"}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {error && <div className="px-3 py-2.5 rounded-lg border text-xs" style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.25)", color: "#dc2626" }}>⚠️ {error}</div>}
            {success && <div className="px-3 py-2.5 rounded-lg border text-xs" style={{ background: "rgba(192,207,5,0.08)", borderColor: "rgba(192,207,5,0.3)", color: "#7a8504" }}>{success}</div>}
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm transition-all duration-200 mt-2"
              style={{
                background: loading
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #2596be 0%, #1a7fa0 100%)",
                color: "#ffffff",
                fontWeight: 600,
                boxShadow: loading ? "none" : "0 4px 20px rgba(37,150,190,0.35)",
                cursor: loading ? "not-allowed" : "pointer",
              }}>
              {loading ? "Cargando..." : tab === "login" ? "Ingresar al sistema" : "Crear cuenta"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Chips de marca */}
          <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
            {[
              { label: "Portal Municipal", bg: "rgba(37,150,190,0.08)", border: "rgba(37,150,190,0.2)", color: "#2596be" },
              { label: "Atención 24/7", bg: "rgba(192,207,5,0.1)", border: "rgba(192,207,5,0.3)", color: "#7a8504" },
              { label: "Vitacura", bg: "rgba(184,44,135,0.07)", border: "rgba(184,44,135,0.2)", color: "#b82c87" },
            ].map((chip) => (
              <span key={chip.label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ background: chip.bg, border: "1px solid " + chip.border, color: chip.color, fontSize: 10.5, fontWeight: 500 }}>
                <span className="w-1 h-1 rounded-full" style={{ background: chip.color }} />{chip.label}
              </span>
            ))}
          </div>

          <div className="mt-4">
            <div className="h-px mb-3" style={{ background: "linear-gradient(90deg, transparent, rgba(37,150,190,0.2), rgba(184,44,135,0.2), transparent)" }} />
            <p className="text-center" style={{ fontSize: 11, color: "#94a3b8" }}>© 2025 Municipalidad de Vitacura &middot; Sistema de Gestión Ciudadana</p>
          </div>
        </div>
      </div>
    </div>
  );
}
