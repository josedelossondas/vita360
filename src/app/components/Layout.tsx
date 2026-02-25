import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Outlet, Navigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Building2 } from 'lucide-react';

interface LayoutProps {
  citizen?: boolean;
}

export function Layout({ citizen }: LayoutProps) {
  const { user, logout } = useAuth();

  if (citizen) {
    return (
      <div className="min-h-screen bg-[#F5F7FA]">
        {/* Header ciudadano */}
        <header className="fixed top-0 left-0 right-0 h-[72px] bg-white border-b border-[#E6EAF0] flex items-center justify-between px-6 z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#306CBB] rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-[20px] font-semibold">
                <span className="text-[#2F3A46]">Vita</span>
                <span className="text-[#306CBB]">360</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-[13px] text-muted-foreground">
                {user.name}
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              className="px-3 py-1.5 border border-border rounded-lg text-[12.5px] text-muted-foreground hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </header>
        <main className="mt-[72px] p-6 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <Sidebar />
      <Header />
      <main className="ml-[240px] mt-[72px] p-6">
        <div className="max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
