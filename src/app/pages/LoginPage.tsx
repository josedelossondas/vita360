import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

const HERO_IMG =
  'https://vitanew.tchile.com/app/uploads/2023/10/bosque-urbano.jpg';
const VITACURA_LOGO =
  'https://vitacura.cl/app/themes/vitacura-sage/public/images/logos-vitacura_sineslogan_hor.36ae38.png';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ciudadano' | 'operador'>('ciudadano');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (mode === 'register' && !name.trim()) { setError('El nombre es obligatorio'); return; }
    if (!email.trim()) { setError('El email es obligatorio'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        navigate('/app');
      } else {
        await register(name.trim(), email.trim(), password, role);
        setSuccess('✅ Cuenta creada. Ahora puedes iniciar sesión.');
        setMode('login');
        setName('');
        setPassword('');
      }
    } catch (e: any) {
      setError(e.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Pantalla completa: imagen hero de fondo */
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10 overflow-hidden">

      {/* Hero image */}
      <img
        src={HERO_IMG}
        alt="Bosque Urbano Vitacura"
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
      />

      {/* Overlay — gradiente Vitacura institucional (primary + inst-blue) */}
      <div
        className="absolute inset-0"
        style={{ background: 'var(--login-overlay)' }}
        aria-hidden="true"
      />

      {/* Tarjeta flotante centrada */}
      <div
        className="relative z-10 w-full max-w-[420px] rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.60)',
        }}
      >
        {/* Hairline GRC signature — gradiente institucional arriba de la card */}
        <div className="h-[3px] w-full" style={{ background: 'var(--card-topline)' }} />

        <div className="p-7">
          {/* Logo + título */}
          <div className="mb-7 text-center">
            <img
              src={VITACURA_LOGO}
              alt="Municipalidad de Vitacura"
              className="h-8 object-contain mx-auto mb-4"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <h1 className="text-[22px] font-bold text-foreground leading-tight tracking-tight">
              Vita<span className="text-primary">360</span>
            </h1>
            <p className="text-[12px] text-muted-foreground mt-1">
              Plataforma de Gestión Urbana · Municipalidad de Vitacura
            </p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-secondary p-1 mb-6">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-all ${mode === m
                    ? 'bg-white text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] bg-background outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Tipo de cuenta
                </label>
                <div className="flex gap-2">
                  {(['ciudadano', 'operador'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 py-2 rounded-lg text-[13px] border transition-colors ${role === r
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground'
                        }`}
                    >
                      {r === 'ciudadano' ? '👤 Ciudadano' : '🛠 Operador'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {role === 'ciudadano'
                    ? 'Envía solicitudes y haz seguimiento de tus tickets'
                    : 'Gestiona tickets, asigna equipos y cierra incidencias'}
                </p>
              </div>
            )}

            {error && (
              <div className="px-3 py-2.5 bg-destructive/8 border border-destructive/25 rounded-lg text-[12.5px] text-destructive">
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div className="px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-[12.5px] text-green-700">
                {success}
              </div>
            )}

            {/* CTA principal */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-[13.5px] font-semibold hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-primary/50 mt-1"
            >
              {loading ? 'Cargando...' : mode === 'login' ? 'Ingresar al portal' : 'Crear cuenta'}
            </button>
          </div>
        </div>

        {/* Chip institucional en el pie de la card */}
        <div
          className="px-7 pb-5 flex items-center justify-center gap-2"
        >
          {/* Chips de colores institucionales */}
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-medium"
            style={{
              background: 'var(--inst-blue-light)',
              border: '1px solid var(--inst-blue-border)',
              color: 'var(--inst-blue)',
            }}
          >
            <span className="w-1 h-1 rounded-full" style={{ background: 'var(--inst-blue)' }} />
            Portal Municipal
          </span>
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-medium"
            style={{
              background: 'var(--inst-lime-light)',
              border: '1px solid var(--inst-lime-border)',
              color: '#7a8504',
            }}
          >
            <span className="w-1 h-1 rounded-full" style={{ background: 'var(--inst-lime)' }} />
            Atención 24/7
          </span>
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-medium"
            style={{
              background: 'var(--inst-magenta-light)',
              border: '1px solid var(--inst-magenta-border)',
              color: 'var(--inst-magenta)',
            }}
          >
            <span className="w-1 h-1 rounded-full" style={{ background: 'var(--inst-magenta)' }} />
            Vitacura
          </span>
        </div>
      </div>

      {/* Footer debajo del card */}
      <p className="absolute bottom-4 left-0 right-0 text-center text-[11px] text-white/50">
        © 2025 Municipalidad de Vitacura · Portal de Atención Digital
      </p>
    </div>
  );
}
