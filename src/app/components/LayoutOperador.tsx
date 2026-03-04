/**
 * LayoutOperador — Shell con header y tabs de navegación + footer institucional
 */
import { Outlet, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Ticket, Activity, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';

const VITACURA_LOGO =
    'https://vitacura.cl/app/themes/vitacura-sage/public/images/logos-vitacura_sineslogan_hor.36ae38.png';

// ── Footer Vitacura ───────────────────────────────────────────────────────────
function VitacuraFooter() {
    return (
        <footer className="w-full mt-16" style={{ background: '#ffffff', borderTop: '1px solid rgba(37,150,190,0.1)' }}>
            <div className="max-w-6xl mx-auto px-6 py-10">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 items-start">
                    {/* Logo */}
                    <div className="flex items-center">
                        <img src={VITACURA_LOGO} alt="Municipalidad de Vitacura" className="h-10 object-contain"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>

                    {/* Contacto */}
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#2596be' }}>Contacto</p>
                        <div className="space-y-2 text-[12.5px]" style={{ color: '#64748b' }}>
                            <div className="flex items-start gap-2">
                                {/* Phone icon */}
                                <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.07 1.18 2 2 0 012.07 0h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L6.14 7.82a16 16 0 006.29 6.29l1.18-1.18a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 15v1.92z" /></svg>
                                <a href="tel:+56222402200" className="hover:text-[#2596be] transition-colors">2 2240 22 00</a>
                            </div>
                            <div className="flex items-start gap-2">
                                {/* Mail icon */}
                                <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                <a href="mailto:atencionalvecino@vitacura.cl" className="hover:text-[#2596be] transition-colors">atencionalvecino@vitacura.cl</a>
                            </div>
                            <div className="flex items-start gap-2">
                                {/* Location icon */}
                                <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                <span>Av. Bicentenario 3800, Vitacura, Santiago</span>
                            </div>
                        </div>
                    </div>

                    {/* Síguenos */}
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#2596be' }}>Síguenos</p>
                        <div className="grid grid-cols-3 gap-3">
                            {/* Facebook */}
                            <a href="https://www.facebook.com/MuniVitacura" target="_blank" rel="noopener noreferrer"
                                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                                style={{ background: 'rgba(37,150,190,0.07)', color: '#2596be' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,150,190,0.16)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,150,190,0.07)'; }}>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                            </a>
                            {/* X / Twitter */}
                            <a href="https://twitter.com/MuniVitacura" target="_blank" rel="noopener noreferrer"
                                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                                style={{ background: 'rgba(37,150,190,0.07)', color: '#2596be' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,150,190,0.16)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,150,190,0.07)'; }}>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                            </a>
                            {/* Instagram */}
                            <a href="https://www.instagram.com/munivitacura" target="_blank" rel="noopener noreferrer"
                                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                                style={{ background: 'rgba(37,150,190,0.07)', color: '#2596be' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,150,190,0.16)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,150,190,0.07)'; }}>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                            </a>
                            {/* YouTube */}
                            <a href="https://www.youtube.com/munivitacura" target="_blank" rel="noopener noreferrer"
                                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                                style={{ background: 'rgba(37,150,190,0.07)', color: '#2596be' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,150,190,0.16)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,150,190,0.07)'; }}>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                            </a>
                            {/* LinkedIn */}
                            <a href="https://www.linkedin.com/company/municipalidad-de-vitacura" target="_blank" rel="noopener noreferrer"
                                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                                style={{ background: 'rgba(37,150,190,0.07)', color: '#2596be' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,150,190,0.16)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,150,190,0.07)'; }}>
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                            </a>
                            {/* Flickr */}
                            <a href="https://www.flickr.com/photos/munivitacura" target="_blank" rel="noopener noreferrer"
                                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                                style={{ background: 'rgba(37,150,190,0.07)', color: '#2596be' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,150,190,0.16)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,150,190,0.07)'; }}>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="6.5" cy="12" r="4" /><circle cx="17.5" cy="12" r="4" /></svg>
                            </a>
                        </div>
                    </div>

                    {/* Alcaldesa */}
                    <div className="flex flex-col items-center text-center gap-2">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center text-[18px] font-bold border-2"
                            style={{ background: 'linear-gradient(135deg, rgba(37,150,190,0.15) 0%, rgba(184,44,135,0.1) 100%)', borderColor: 'rgba(37,150,190,0.2)', color: '#2596be' }}>
                            CM
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#2596be' }}>Alcaldesa</p>
                            <p className="text-[13px] font-semibold" style={{ color: '#1e293b' }}>Camila Merino</p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Copyright bar */}
            <div className="border-t text-center py-4 text-[12px]" style={{ borderColor: 'rgba(37,150,190,0.08)', color: '#94a3b8' }}>
                © Municipalidad de Vitacura
            </div>
        </footer>
    );
}

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
        <div className="min-h-screen flex flex-col" style={{
            background: 'linear-gradient(150deg, #ffffff 0%, rgba(37,150,190,0.04) 35%, rgba(192,207,5,0.02) 65%, rgba(184,44,135,0.03) 100%)',
        }}>
            {/* Orbs de fondo */}
            <div className="fixed top-0 right-0 w-96 h-96 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,150,190,0.07) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0 }} />
            <div className="fixed bottom-0 left-0 w-72 h-72 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(184,44,135,0.06) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: 0 }} />

            {/* Hairline tricolor top */}
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
            <main className="flex-1 px-4 sm:px-6 py-6 relative z-10">
                <Outlet />
            </main>

            {/* Footer institucional */}
            <div className="relative z-10">
                <VitacuraFooter />
            </div>
        </div>
    );
}
