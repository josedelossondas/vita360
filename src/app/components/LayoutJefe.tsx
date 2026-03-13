import { Outlet, Navigate, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import { LogOut, ShieldCheck, Radio } from "lucide-react";
import { useAuth, API_URL } from "../../context/AuthContext";

const VITACURA_LOGO =
    'https://vitacura.cl/app/themes/vitacura-sage/public/images/logos-vitacura_sineslogan_hor.36ae38.png';

export function LayoutJefe() {
    const { user, logout, token } = useAuth();
    const navigate = useNavigate();

    if (!user || user.role !== "jefe_cuadrilla") {
        return <Navigate to="/" replace />;
    }

    const [isPatrol, setIsPatrol] = useState(false);
    const [squadName, setSquadName] = useState('');

    useEffect(() => {
        if (!token) return;
        const savedSquad = localStorage.getItem('vita_jefe_squad');
        setSquadName(savedSquad || '');
        fetch(`${API_URL}/squads`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then((squads: any[]) => {
                const mine = squads.find(s => s.name === savedSquad);
                setIsPatrol(mine?.squad_type === 'patrulla');
            }).catch(() => {});
    }, [token]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(150deg, #ffffff 0%, rgba(37,150,190,0.04) 35%, rgba(192,207,5,0.02) 65%, rgba(184,44,135,0.03) 100%)',
            position: 'relative',
        }}>
            {/* Orbes decorativos */}
            <div style={{
                position: 'fixed', top: 0, right: 0, width: 380, height: 380,
                background: 'radial-gradient(circle, rgba(37,150,190,0.08) 0%, transparent 70%)',
                filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0,
            }} />
            <div style={{
                position: 'fixed', bottom: 0, left: 0, width: 280, height: 280,
                background: 'radial-gradient(circle, rgba(184,44,135,0.07) 0%, transparent 70%)',
                filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0,
            }} />

            {/* Línea tricolor superior */}
            <div style={{
                height: 3, width: '100%', position: 'relative', zIndex: 50,
                background: 'linear-gradient(90deg, #2596be 0%, #c0cf05 50%, #b82c87 100%)',
            }} />

            {/* Header */}
            <header style={{
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(37,150,190,0.1)',
                boxShadow: '0 4px 24px rgba(37,150,190,0.08)',
                position: 'sticky', top: 0, zIndex: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 24px', height: 60,
            }}>
                {/* Logo + Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img
                        src={VITACURA_LOGO}
                        alt="Municipalidad de Vitacura"
                        style={{ height: 28, objectFit: 'contain' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div style={{ width: 1, height: 16, background: 'rgba(37,150,190,0.2)' }} />
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', lineHeight: 1 }}>
                            Vita<span style={{ color: '#2596be' }}>360</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Portal Cuadrillas</div>
                    </div>
                </div>

                {/* Usuario + Logout */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 12px', borderRadius: 999,
                        background: 'rgba(37,150,190,0.06)', border: '1px solid rgba(37,150,190,0.12)',
                        fontSize: 12, fontWeight: 600, color: '#2596be',
                    }}>
                        <span style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: '#22c55e', display: 'inline-block',
                        }} />
                        {user.name}
                    </div>
                    <button
                        onClick={() => { logout(); navigate('/'); }}
                        title="Cerrar sesión"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', borderRadius: 8,
                            border: '1px solid rgba(239,68,68,0.15)',
                            background: 'transparent', cursor: 'pointer',
                            color: '#dc2626', fontSize: 12,
                        }}
                        onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(239,68,68,0.06)'; }}
                        onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; }}
                    >
                        <LogOut size={14} />
                        <span>Salir</span>
                    </button>
                </div>
            </header>

            {/* Contenido principal */}
            <main style={{
                flex: 1, maxWidth: 1280, width: '100%',
                margin: '0 auto', padding: '24px',
                position: 'relative', zIndex: 10,
            }}>
                <Outlet />
            </main>
        </div>
    );
}
