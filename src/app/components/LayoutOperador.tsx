import { Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, LogOut, ChevronDown
} from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  { path: '/operador', label: 'Gestión Tickets', icon: LayoutDashboard, exact: true },
  { path: '/operador/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export function LayoutOperador() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-[220px] bg-white border-r border-border flex flex-col z-50">
        <div className="h-[60px] flex items-center px-5 border-b border-border gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary flex-shrink-0">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground leading-tight">Vita360</div>
            <div className="text-[11px] text-muted-foreground">Operador</div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-[13px] transition-colors ${
                  isActive ? 'bg-primary text-white font-medium' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-border">
          <div className="text-[12px] text-muted-foreground mb-2 truncate">
            🛠 <span className="font-medium text-foreground">{user?.name}</span>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-muted-foreground hover:bg-red-50 hover:text-red-700 transition-colors">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Header */}
      <header className="fixed top-0 left-[220px] right-0 h-[60px] bg-white border-b border-border flex items-center px-6 z-40">
        <div className="text-[13px] text-muted-foreground">
          Panel de Operador — <span className="text-foreground font-medium">Vita360</span>
        </div>
      </header>

      <main className="ml-[220px] mt-[60px] p-6">
        <Outlet />
      </main>
    </div>
  );
}
