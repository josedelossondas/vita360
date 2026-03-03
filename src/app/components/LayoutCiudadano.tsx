import { Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Home, Plus, ClipboardList, User, LogOut, Bell, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function CiudadanoLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Detectar si la PWA es instalable
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Verificar si ya está instalada
    if (window.navigator.standalone === true) {
      setIsInstallable(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User ${outcome} the installation`);
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/ciudadano', icon: Home, label: 'Inicio' },
    { path: '/ciudadano/reportar', icon: Plus, label: 'Reportar', highlight: true },
    { path: '/ciudadano/mis-reportes', icon: ClipboardList, label: 'Mis reportes' },
    { path: '/ciudadano/perfil', icon: User, label: 'Perfil' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-[64px] bg-card border-b border-border flex items-center px-4 sm:px-6 z-40">
        <div className="flex-1">
          <div className="text-[17px] font-semibold">
            <span className="text-foreground">Atención</span>
            <span className="text-primary"> 360</span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {isInstallable && (
            <button
              onClick={installPWA}
              className="px-3 py-1.5 bg-primary text-primary-foreground text-[12px] rounded-lg font-medium hover:bg-primary/90 transition-colors animate-pulse"
              title="Instalar aplicación en tu dispositivo"
            >
              📱 Instalar
            </button>
          )}
          {!isInstallable && (
            <div className="group relative">
              <button
                className="px-3 py-1.5 bg-accent text-primary text-[12px] rounded-lg font-medium"
                title="PWA instalada o no disponible"
              >
                ✓ Instalada
              </button>
              <div className="hidden group-hover:block absolute top-full right-0 mt-2 p-2 bg-foreground text-background text-[11px] rounded whitespace-nowrap z-50">
                Usa el menú del navegador para más opciones
              </div>
            </div>
          )}
          <button className="relative p-2 hover:bg-secondary rounded-lg transition-colors">
            <Bell size={20} className="text-muted-foreground" />
            <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full" />
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            {showMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Menu móvil */}
        {showMenu && (
          <div className="absolute top-[64px] left-0 right-0 bg-card border-b border-border p-4 space-y-2 sm:hidden">
            <div className="py-3 border-b border-border">
              <p className="text-[14px] font-semibold text-foreground">{user?.name}</p>
              <p className="text-[12px] text-muted-foreground">Ciudadano</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="pt-[64px] pb-[80px] sm:pb-6">
        <Outlet />
      </main>

      {/* Bottom Navigation - móvil */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border sm:hidden z-40">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setShowMenu(false);
                }}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-primary'
                  } ${item.highlight ? 'relative' : ''}`}
              >
                {item.highlight && (
                  <div className="absolute inset-0 -top-6 flex items-start justify-center">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg">
                      <Icon size={24} />
                    </div>
                  </div>
                )}
                {!item.highlight && <Icon size={20} />}
                <span className="text-[11px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop navigation */}
      <nav className="hidden sm:block fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[13px] transition-colors ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={handleLogout}
            className="ml-auto flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg font-medium text-[13px] transition-colors"
          >
            <LogOut size={16} />
            <span>Salir</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
