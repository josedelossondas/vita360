import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BrandTopbar } from './BrandTopbar';
import { Outlet } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect } from 'react';

// Logo institucional Vitacura
const VITACURA_LOGO =
  'https://vitacura.cl/app/themes/vitacura-sage/public/images/logos-vitacura_sineslogan_hor.36ae38.png';

interface LayoutProps {
  citizen?: boolean;
}

export function Layout({ citizen }: LayoutProps) {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!citizen) return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [citizen]);

  if (citizen) {
    return (
      <div className="min-h-screen bg-background">
        {/* Topbar institucional fija */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <BrandTopbar />

          {/* Header principal — glass cuando hay scroll */}
          <header
            className={`h-[64px] flex items-center justify-between px-4 sm:px-6 transition-all duration-200 ${
              scrolled
                ? 'glass border-b border-glass-border shadow-sm'
                : 'bg-card border-b border-border'
            }`}
          >
            {/* Logo + marca */}
            <div className="flex items-center gap-3">
              <img
                src={VITACURA_LOGO}
                alt="Municipalidad de Vitacura"
                className="h-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="h-5 w-px bg-border hidden sm:block" />
              <div className="hidden sm:block">
                <span className="text-[15px] font-semibold text-foreground">
                  Vita<span className="text-primary">360</span>
                </span>
                <div className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  Atención al Vecino
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2 sm:gap-3">
              {user && (
                <span className="text-[12.5px] text-muted-foreground hidden sm:block">
                  {user.name}
                </span>
              )}
              <button
                type="button"
                onClick={logout}
                className="px-3 py-1.5 border border-border rounded-lg text-[12px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cerrar sesión
              </button>
            </div>
          </header>
        </div>

        {/* Offset = topbar (30px) + header (64px) */}
        <main className="pt-[94px] px-4 sm:px-6 pb-8 max-w-4xl mx-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 50%, #ede9fe 100%)' }}>
      {/* Decorative radial blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, #93c5fd, transparent)' }} />
        <div className="absolute top-1/2 -right-48 w-[500px] h-[500px] rounded-full opacity-25 blur-3xl" style={{ background: 'radial-gradient(circle, #a5b4fc, transparent)' }} />
        <div className="absolute -bottom-32 left-1/3 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #c4b5fd, transparent)' }} />
      </div>
      <Sidebar />
      <Header />
      <main className="relative z-10 ml-[240px] mt-[72px] p-6">
        <div className="max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
