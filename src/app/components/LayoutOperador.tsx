/**
 * LayoutOperador — Shell con header y tabs de navegación
 * Envuelve las rutas /operador/* con franja institucional, logo suelto y nav tabs
 */
import { Outlet, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Ticket, Activity, LogOut, Phone } from 'lucide-react';
import { useState, useEffect } from 'react';

const VITACURA_LOGO =
    'https://vitacura.cl/app/themes/vitacura-sage/public/images/logos-vitacura_sineslogan_hor.36ae38.png';

export function LayoutOperador() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : 'OP';

    const navItems = [
        { to: '/operador', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/operador/tickets', label: 'Tickets', icon: Ticket, end: false },
        { to: '/operador/api', label: 'Monitor IA', icon: Activity, end: false },
    ];

    return (
        <div className="min-h-screen" style={{
            background: 'linear-gradient(150deg, #ffffff 0%, rgba(37,150,190,0.04) 35%, rgba(192,207,5,0.02) 65%, rgba(184,44,135,0.03) 100%)',
        }}>
            {/* Orbs de fondo */}
            <div className="fixed top-0 right-0 w-96 h-96 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,150,190,0.07) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0 }} />
            <div className="fixed bottom-0 left-0 w-72 h-72 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(184,44,135,0.06) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0 }} />

            {/* ── Franja institucional ── */}
            <div className="w-full h-7 flex items-center px-4 sm:px-6 relative z-50"
                style={{ background: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(37,150,190,0.1)' }}>
                <div className="flex items-center gap-3 text-[11px] w-full" style={{ color: '#64748b' }}>
                    <span className="flex items-center gap-1.5 font-semibold hidden sm:flex" style={{ color: '#2596be' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#2596be' }} />
                        Municipalidad de Vitacura
                    </span>
                    <span className="hidden sm:inline" style={{ color: 'rgba(100,116,139,0.3)' }}>|</span>
                    <a href="tel:+5622585700" className="flex items-center gap-1 hover:text-[#2596be] transition-colors">
                        <Phone className="w-2.5 h-2.5" /> (02) 2585 7000
                    </a>
                    <a href="https://vitacura.cl" target="_blank" rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 hover:text-[#2596be] transition-colors hidden sm:flex">
                        vitacura.cl
                    </a>
                </div>
            </div>
            {/* Hairline tricolor */}
            <div className="w-full h-0.5 relative z-50"
                style={{ background: 'linear-gradient(90deg, #2596be 0%, #c0cf05 50%, #b82c87 100%)' }} />

            {/* ── Header sticky glass ── */}
            <header className="sticky top-0 z-40 w-full"
                style={{
                    background: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(37,150,190,0.1)',
                    boxShadow: scrolled ? '0 4px 24px rgba(37,150,190,0.1)' : 'none',
                    transition: 'box-shadow 0.2s',
                }}>
                <div className="px-4 sm:px-6 h-[60px] flex items-center justify-between">
                    {/* Logo suelto + brand + tabs */}
                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-3">
                            <img src={VITACURA_LOGO} alt="Municipalidad de Vitacura" className="h-7 object-contain"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <div className="h-4 w-px" style={{ background: 'rgba(37,150,190,0.2)' }} />
                            <div>
                                <div className="text-[15px] font-semibold leading-tight" style={{ color: '#1e293b' }}>
                                    Vita<span style={{ color: '#2596be' }}>360</span>
                                </div>
                                <div className="text-[10px] leading-none" style={{ color: '#94a3b8' }}>Panel Operador</div>
                            </div>
                        </div>
                        {/* Tab nav */}
                        <nav className="flex items-center gap-1">
                            {navItems.map(item => (
                                <NavLink key={item.to} to={item.to} end={item.end}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
                                    style={({ isActive }) => ({
                                        background: isActive ? 'rgba(37,150,190,0.1)' : 'transparent',
                                        color: isActive ? '#2596be' : '#64748b',
                                    })}>
                                    <item.icon size={14} />{item.label}
                                </NavLink>
                            ))}
                        </nav>
                    </div>

                    {/* Usuario + logout */}
                    <div className="flex items-center gap-3">
                        {user && (
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center border text-[10px] font-semibold"
                                    style={{ background: 'rgba(37,150,190,0.1)', borderColor: 'rgba(37,150,190,0.2)', color: '#2596be' }}>
                                    {initials}
                                </div>
                                <span className="text-[13px] hidden sm:block max-w-[160px] truncate" style={{ color: '#64748b' }}>{user.name}</span>
                            </div>
                        )}
                        <button onClick={() => { logout(); navigate('/'); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] border transition-all"
                            style={{ color: '#dc2626', borderColor: 'rgba(239,68,68,0.15)', background: 'transparent' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.06)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Cerrar sesión</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Contenido (Outlet) */}
            <main className="px-4 sm:px-6 py-6 relative z-10">
                <Outlet />
            </main>
        </div>
    );
}
