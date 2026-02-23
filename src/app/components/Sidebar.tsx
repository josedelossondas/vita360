import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard,
  FolderOpen,
  Map,
  ClipboardList,
  Clock,
  BarChart3,
  BookOpen,
  Settings
} from 'lucide-react';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/casos', label: 'Casos', icon: FolderOpen },
  { path: '/mapa', label: 'Mapa Urbano', icon: Map },
  { path: '/ordenes', label: 'Órdenes de Trabajo', icon: ClipboardList },
  { path: '/sla', label: 'SLA', icon: Clock },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/conocimiento', label: 'Base de Conocimiento', icon: BookOpen },
  { path: '/configuracion', label: 'Configuración', icon: Settings }
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-white border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="h-[60px] flex items-center px-5 border-b border-border gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary flex-shrink-0">
          <LayoutDashboard className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground leading-tight">Vita360</div>
          <div className="text-[11px] text-muted-foreground">Gestión Urbana</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-[13px] transition-colors ${
                isActive
                  ? 'bg-primary text-white font-medium'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <div className="text-[11px] text-muted-foreground">
          Municipalidad Digital
          <div className="mt-0.5">v2.4.1</div>
        </div>
      </div>
    </aside>
  );
}
