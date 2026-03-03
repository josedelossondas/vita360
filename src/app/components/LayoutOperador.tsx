import { Outlet, NavLink } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, LogOut, Ticket, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import { BrandTopbar } from './BrandTopbar';

const VITACURA_LOGO =
  'https://vitacura.cl/app/themes/vitacura-sage/public/images/logos-vitacura_sineslogan_hor.36ae38.png';

export function LayoutOperador() {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { to: '/operador', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/operador/tickets', label: 'Tickets', icon: Ticket, end: false },
    { to: '/operador/api', label: 'Monitor IA', icon: Activity, end: false },
  ];

  // Iniciales del usuario
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'OP';

  return (
    <div className="min-h-screen bg-background">
      {/* Barra institucional + header fijo */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <BrandTopbar />

        <header
          className={`h-[60px] flex items-center justify-between px-6 transition-all duration-200 ${scrolled
              ? 'glass border-b border-white/30'
              : 'bg-card border-b border-border'
            }`}
        >
          {/* Logo + brand + navegación */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <img
                src={VITACURA_LOGO}
                alt="Municipalidad de Vitacura"
                className="h-7 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="h-4 w-px bg-border" />
              <div>
                <div className="text-[15px] font-semibold text-foreground leading-tight">
                  Vita<span className="text-primary">360</span>
                </div>
                <div className="text-[10px] text-muted-foreground leading-none">Panel Operador</div>
              </div>
            </div>

            {/* Tab navigation */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${isActive
                      ? 'bg-accent text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`
                  }
                >
                  <item.icon size={14} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Derecha: usuario + logout */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center border border-border">
                  <span className="text-[10px] font-semibold text-primary">{initials}</span>
                </div>
                <span className="text-[13px] text-muted-foreground max-w-[160px] truncate hidden sm:block">
                  {user.name}
                </span>
              </div>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-[12.5px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </header>
      </div>

      {/* offset: topbar 30px + header 60px = 90px */}
      <main className="mt-[90px] p-6">
        <Outlet />
      </main>
    </div>
  );
}
