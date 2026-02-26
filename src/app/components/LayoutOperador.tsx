import { Outlet, NavLink } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, LogOut, Ticket, Activity } from 'lucide-react';

export function LayoutOperador() {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/operador', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/operador/tickets', label: 'Tickets', icon: Ticket, end: false },
    { to: '/operador/api', label: 'Monitor IA', icon: Activity, end: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-[60px] bg-white border-b border-border flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-[16px] font-semibold text-foreground leading-tight">Vita360</div>
              <div className="text-[11px] text-muted-foreground">Operador</div>
            </div>
          </div>
          {/* Tab navigation */}
          <nav className="flex items-center gap-1 ml-4">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
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
        <div className="flex items-center gap-3">
          {user && <span className="text-[13px] text-muted-foreground max-w-[160px] truncate">{user.name}</span>}
          <button onClick={logout} className="px-3 py-1.5 border border-border rounded-lg text-[12.5px] text-muted-foreground hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-1.5">
            <LogOut size={13} /> Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mt-[60px] p-6">
        <Outlet />
      </main>
    </div>
  );
}
