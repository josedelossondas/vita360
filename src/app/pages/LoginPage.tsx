import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, API_URL } from '../../context/AuthContext';
import { LayoutDashboard } from 'lucide-react';

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

    // Validaciones locales
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">Vita360</div>
            <div className="text-[12px] text-muted-foreground">Gestión Urbana Municipal</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          {/* Tabs */}
          <div className="flex rounded-lg bg-secondary p-1 mb-6">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={`flex-1 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  mode === m ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1.5 font-medium">Nombre completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-background"
                />
              </div>
            )}

            <div>
              <label className="block text-[12px] text-muted-foreground mb-1.5 font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-background"
              />
            </div>

            <div>
              <label className="block text-[12px] text-muted-foreground mb-1.5 font-medium">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary bg-background"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1.5 font-medium">Tipo de cuenta</label>
                <div className="flex gap-2">
                  {(['ciudadano', 'operador'] as const).map(r => (
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

            {/* Mensajes de error y éxito */}
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
              className="w-full py-2.5 bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {loading ? 'Cargando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
