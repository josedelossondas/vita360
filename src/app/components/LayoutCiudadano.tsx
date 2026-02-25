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
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-[72px] bg-white border-b border-[#E6EAF0] flex items-center px-4 sm:px-6 z-40">
        <div className="flex-1">
          <div className="text-[18px] font-semibold">
            <span className="text-[#2F3A46]">Atención</span>
            <span className="text-[#306CBB]"> 360</span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {isInstallable && (
            <button
              onClick={installPWA}
              className="px-3 py-1.5 bg-[#306CBB] text-white text-[12px] rounded-lg font-medium hover:bg-[#2555a0]"
            >
              Instalar
            </button>
          )}
          <button className="relative p-2 hover:bg-[#f0f0f0] rounded-lg">
            <Bell size={20} className="text-[#6D7783]" />
            <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#E53935] rounded-full" />
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-[#f0f0f0] rounded-lg"
          >
            {showMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Menu móvil */}
        {showMenu && (
          <div className="absolute top-[72px] left-0 right-0 bg-white border-b border-[#E6EAF0] p-4 space-y-2 sm:hidden">
            <div className="py-3 border-b border-[#E6EAF0]">
              <p className="text-[14px] font-semibold text-[#2F3A46]">{user?.name}</p>
              <p className="text-[12px] text-[#6D7783]">Ciudadano</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="pt-[72px] pb-[80px] sm:pb-6">
        <Outlet />
      </main>

      {/* Bottom Navigation - móvil */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E6EAF0] sm:hidden z-40">
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
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                  isActive
                    ? 'text-[#306CBB]'
                    : 'text-[#6D7783] hover:text-[#306CBB]'
                } ${item.highlight ? 'relative' : ''}`}
              >
                {item.highlight && (
                  <div className="absolute inset-0 -top-6 flex items-start justify-center">
                    <div className="w-12 h-12 bg-[#306CBB] rounded-full flex items-center justify-center text-white shadow-lg">
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
      <nav className="hidden sm:block fixed bottom-0 left-0 right-0 bg-white border-t border-[#E6EAF0] z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-[14px] transition-colors ${
                  isActive
                    ? 'bg-[#306CBB] text-white'
                    : 'text-[#6D7783] hover:bg-[#f0f0f0]'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={handleLogout}
            className="ml-auto flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium text-[14px] transition-colors"
          >
            <LogOut size={18} />
            <span>Salir</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
