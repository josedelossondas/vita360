import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Clock,
  BarChart3,
  BookOpen,
  ChevronDown,
  Map,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarFallback } from './ui/avatar';

// Logo institucional
const VITACURA_LOGO =
  'https://vitacura.cl/app/themes/vitacura-sage/public/images/logos-vitacura_sineslogan_hor.36ae38.png';

interface MenuItemWithSub {
  path?: string;
  label: string;
  icon: any;
  section?: string;
  submenu?: Array<{
    path: string;
    label: string;
    icon: any;
  }>;
}

const menuItems: MenuItemWithSub[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  {
    label: 'Gestión',
    icon: FolderOpen,
    section: 'Gestión',
    submenu: [
      { path: '/casos', label: 'Casos', icon: FolderOpen },
      { path: '/mapa', label: 'Mapa Urbano', icon: Map },
      { path: '/tramites', label: 'Trámites', icon: FileText },
    ],
  },
  {
    label: 'Monitoreo',
    icon: Clock,
    section: 'Monitoreo',
    submenu: [
      { path: '/sla', label: 'SLA', icon: Clock },
      { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  { path: '/conocimiento', label: 'Base de Conocimiento', icon: BookOpen },
];

const NavItem = ({
  icon: Icon,
  label,
  isActive,
  submenu,
  isOpen,
  onToggle,
  children,
}: {
  icon: any;
  label: string;
  isActive: boolean;
  submenu?: any[];
  isOpen?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
}) => {
  if (submenu && submenu.length > 0) {
    return (
      <div className="w-full">
        <button
          onClick={onToggle}
          className={`w-full flex items-center gap-3 h-[48px] px-4 cursor-pointer transition-colors relative group rounded-none ${
            isOpen
              ? 'bg-accent text-primary'
              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
          }`}
        >
          {isOpen && (
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r-full" />
          )}
          <Icon size={18} />
          <span className="text-[13.5px] font-medium flex-1 text-left">{label}</span>
          <ChevronDown
            size={14}
            className={`transition-transform text-muted-foreground ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="bg-secondary/40 border-l-2 border-border ml-4">
            {submenu.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-2.5 h-[40px] px-5 text-muted-foreground hover:bg-accent hover:text-primary transition-colors text-[12.5px] font-medium"
              >
                <item.icon size={14} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return children;
};

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  // Iniciales para avatar
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'OP';

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      {/* Logo */}
      <div className="h-[72px] flex items-center px-5 border-b border-sidebar-border gap-3 shrink-0">
        <img
          src={VITACURA_LOGO}
          alt="Municipalidad de Vitacura"
          className="h-7 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="h-4 w-px bg-sidebar-border" />
        <div className="text-[15px] font-semibold text-sidebar-foreground leading-none">
          Vita<span className="text-primary">360</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {menuItems.map((item) => {
          const isOpen = openMenus[item.label];

          return (
            <NavItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              isActive={location.pathname === item.path}
              submenu={item.submenu}
              isOpen={isOpen}
              onToggle={() => toggleMenu(item.label)}
            >
              {!item.submenu && item.path && (
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 h-[48px] px-4 cursor-pointer transition-colors relative ${
                    location.pathname === item.path
                      ? 'bg-accent text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                  }`}
                >
                  {location.pathname === item.path && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r-full" />
                  )}
                  <item.icon size={18} />
                  <span className="text-[13.5px] font-medium">{item.label}</span>
                </Link>
              )}
            </NavItem>
          );
        })}
      </nav>

      {/* Sección de usuario */}
      <div className="border-t border-sidebar-border p-3 space-y-1 shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-[11px] font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-sidebar-foreground truncate">{user?.name}</div>
            <div className="text-[11px] text-muted-foreground capitalize">{user?.role}</div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-muted-foreground hover:bg-accent hover:text-destructive rounded-lg transition-colors"
        >
          <LogOut size={14} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
