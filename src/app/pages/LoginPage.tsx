import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';

// Hero: bosque urbano Vitacura
const HERO_IMG =
  'https://vitanew.tchile.com/app/uploads/2023/10/bosque-urbano.jpg';
// Logo institucional
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

    if (mode === 'register' && !name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (!email.trim()) {
      setError('El email es obligatorio');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        navigate('/app');
      } else {
        await register(name.trim(), email.trim(), password, role);
        setSuccess('✅ Cuenta creada correctamente. Ahora podés iniciar sesión.');
        setMode('login');
        setName('');
        setPassword('');
      }
    } catch (e: any) {
      setError(e.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Panel izquierdo: formulario ── */}
      <div className="relative flex flex-col justify-center w-full md:w-[480px] lg:w-[520px] shrink-0 bg-background px-8 py-12 z-10">
        {/* Logo institucional + marca */}
        <div className="mb-10">
          <img
            src={VITACURA_LOGO}
            alt="Municipalidad de Vitacura"
            className="h-10 object-contain mb-5"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-semibold text-foreground leading-tight">
            Vita<span className="text-primary">360</span>
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Plataforma de Gestión Urbana Municipal
          </p>
        </div>

        {/* Card glass con el formulario */}
        <div className="glass rounded-2xl p-6 shadow-lg">
          {/* Tabs */}
          <div className="flex rounded-lg bg-secondary p-1 mb-6">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={`flex-1 py-1.5 rounded-md text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                  mode === m
                    ? 'bg-white text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1.5 font-medium">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-background focus-visible:ring-2 focus-visible:ring-ring/30"
                />
              </div>
            )}

            <div>
              <label className="block text-[12px] text-muted-foreground mb-1.5 font-medium">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-background"
              />
            </div>

            <div>
              <label className="block text-[12px] text-muted-foreground mb-1.5 font-medium">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-background"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1.5 font-medium">
                  Tipo de cuenta
                </label>
                <div className="flex gap-2">
                  {(['ciudadano', 'operador'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 py-2 rounded-lg text-[13px] border transition-colors ${
                        role === r
                          ? 'bg-primary text-white border-primary'
                          : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground'
                      }`}
                    >
                      {r === 'ciudadano' ? '👤 Ciudadano' : '🛠 Operador'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {role === 'ciudadano'
                    ? 'Puede enviar solicitudes y ver el estado de sus tickets'
                    : 'Puede gestionar tickets, asignar equipos y marcar como resuelto'}
                </p>
              </div>
            )}

            {error && (
              <div className="px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-[12.5px] text-red-700">
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div className="px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-[12.5px] text-green-700">
                {success}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {loading ? 'Cargando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-[11px] text-muted-foreground text-center">
          Municipalidad de Vitacura · Portal de Atención Digital
        </p>
      </div>

      {/* ── Panel derecho: imagen hero (solo desktop) ── */}
      <div className="hidden md:block flex-1 relative overflow-hidden">
        <img
          src={HERO_IMG}
          alt="Bosque Urbano Vitacura"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay gradiente suave para dar legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
        {/* Texto sobre la imagen */}
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <div className="max-w-sm">
            <h2 className="text-white text-2xl font-semibold leading-tight mb-3">
              Vitacura, una ciudad que escucha
            </h2>
            <p className="text-white/80 text-[14px] leading-relaxed">
              Reporta problemas, haz seguimiento de tus solicitudes y mantente
              informado sobre los servicios de tu municipio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
