import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Clock,
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  Map,
  User,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface MenuItemWithSub {
  path?: string;
  label: string;
  icon: any;
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
    submenu: [
      { path: '/casos', label: 'Casos', icon: FolderOpen },
      { path: '/mapa', label: 'Mapa Urbano', icon: Map },
      { path: '/tramites', label: 'Trámites', icon: FileText },
    ]
  },
  {
    label: 'Monitoreo',
    icon: Clock,
    submenu: [
      { path: '/sla', label: 'SLA', icon: Clock },
      { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    ]
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
  children
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
          className={`w-full flex items-center gap-3 h-[52px] px-4 cursor-pointer transition-colors relative group ${
            isOpen 
              ? 'bg-[#E7E9EE] text-[#306CBB]' 
              : 'text-[#6F7F8F] hover:bg-[#E7E9EE]/50'
          }`}
        >
          {isOpen && <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#306CBB]" />}
          <Icon size={20} />
          <span className="text-[14px] font-medium flex-1 text-left">{label}</span>
          <ChevronDown 
            size={16} 
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        
        {/* Submenu */}
        {isOpen && (
          <div className="bg-[#F8F9FA] border-l-2 border-[#E6EAF0]">
            {submenu.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 h-[44px] px-8 text-[#6F7F8F] hover:bg-[#E7E9EE] hover:text-[#306CBB] transition-colors text-[13px] font-medium"
              >
                <item.icon size={16} />
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
    setOpenMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#F4F5F7] border-r border-[#E6EAF0] flex flex-col z-50">
      {/* Logo */}
      <div className="h-[72px] flex items-center px-6 border-b border-[#E6EAF0] gap-2">
        <div className="w-10 h-10 bg-[#306CBB] rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 size={24} className="text-white" />
        </div>
        <div>
          <div className="text-[20px] font-semibold">
            <span className="text-[#2F3A46]">Atención</span>
            <span className="text-[#306CBB]"> 360</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
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
                  className={`flex items-center gap-3 h-[52px] px-4 cursor-pointer transition-colors relative ${
                    location.pathname === item.path
                      ? 'bg-[#E7E9EE] text-[#306CBB]'
                      : 'text-[#6F7F8F] hover:bg-[#E7E9EE]/50'
                  }`}
                >
                  {location.pathname === item.path && (
                    <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#306CBB]" />
                  )}
                  <item.icon size={20} />
                  <span className="text-[14px] font-medium">{item.label}</span>
                </Link>
              )}
            </NavItem>
          );
        })}
      </nav>

      {/* User Section - Footer */}
      <div className="border-t border-[#E6EAF0] p-4 space-y-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 bg-[#306CBB]/10 rounded-full flex items-center justify-center">
            <User size={16} className="text-[#306CBB]" />
          </div>
          <div className="flex-1">
            <div className="text-[12px] font-semibold text-[#2F3A46]">{user?.name}</div>
            <div className="text-[11px] text-[#6D7783]">{user?.role}</div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#6F7F8F] hover:bg-[#E7E9EE] rounded-md transition-colors"
        >
          <LogOut size={16} />
          <span>Salir</span>
        </button>
      </div>
    </aside>
  );
}
