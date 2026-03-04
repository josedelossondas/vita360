import { useState, useEffect, useMemo, useRef } from 'react';
import { API_URL, useAuth } from '../../context/AuthContext';
import { Clock, MapPin, CheckCircle, Activity, Briefcase } from 'lucide-react';
import L from 'leaflet';

interface Ticket {
    id: number;
    title: string;
    description: string;
    status: string;
    urgency_level: string;
    priority_score: number;
    area_name: string;
    squad_name: string | null;
    lat: number | null;
    lon: number | null;
    created_at: string;
}

interface Squad {
    id: number;
    name: string;
    area_name: string;
    pending_tasks: number;
}

export function JefeDashboard() {
    const { token } = useAuth();
    const [squads, setSquads] = useState<Squad[]>([]);
    const [selectedSquad, setSelectedSquad] = useState<string>('');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    // Load squad choice
    useEffect(() => {
        const saved = localStorage.getItem('vita_jefe_squad');
        if (saved) setSelectedSquad(saved);
    }, []);

    const handleSquadChange = (name: string) => {
        setSelectedSquad(name);
        localStorage.setItem('vita_jefe_squad', name);
    };

    useEffect(() => {
        if (!token) return;
        Promise.all([
            fetch(`${API_URL}/tickets?limit=500`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_URL}/squads`, { headers: { Authorization: `Bearer ${token}` } })
        ])
            .then(async ([resT, resSq]) => {
                if (!resT.ok || !resSq.ok) throw new Error('Error de red');
                const tObj = await resT.json();
                const sqObj = await resSq.json();
                setTickets(tObj);
                setSquads(sqObj);
                if (!selectedSquad && sqObj.length > 0) handleSquadChange(sqObj[0].name);
            })
            .catch(e => console.error("Error fetching data:", e))
            .finally(() => setLoading(false));
    }, [token, selectedSquad]);


    const activeTickets = useMemo(() => {
        if (!selectedSquad) return [];
        return tickets.filter(t => t.squad_name === selectedSquad && t.status !== 'Resuelto' && t.status !== 'Cerrado')
            // Recommend Route Order: Highest urgency first. If same urgency, highest priority_score.
            .sort((a, b) => b.priority_score - a.priority_score);
    }, [tickets, selectedSquad]);

    // Map initialization
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const layerGroup = useRef<any>(null);

    useEffect(() => {
        if (mapInstance.current || !mapRef.current) return;
        const map = L.map(mapRef.current).setView([-33.393, -70.58], 14);
        mapInstance.current = map;
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© CARTO'
        }).addTo(map);
        layerGroup.current = L.featureGroup().addTo(map);
        setIsMapReady(true);
        return () => {
            map.remove();
            mapInstance.current = null;
        };
    }, []);

    useEffect(() => {
        if (!isMapReady || !layerGroup.current) return;
        const group = layerGroup.current;
        group.clearLayers();

        const pts: [number, number][] = [];
        const colors: Record<string, string> = { Alta: '#e11d48', Media: '#d97706', Baja: '#0284c7' };

        activeTickets.forEach((t, i) => {
            if (!t.lat || !t.lon) return;
            pts.push([t.lat, t.lon]);
            const color = colors[t.urgency_level] || '#0284c7';
            const isFirst = i === 0;

            const html = `<div style="
          width:${isFirst ? 32 : 24}px; height:${isFirst ? 32 : 24}px; 
          background:${color}; 
          border-radius:50%; 
          border:${isFirst ? 4 : 2}px solid white; 
          box-shadow:0 4px 10px rgba(0,0,0,0.3);
          display:flex; align-items:center; justify-content:center;
          color:white; font-weight:bold; font-size:${isFirst ? '14px' : '11px'}">
        ${i + 1}
      </div>`;

            const m = L.marker([t.lat, t.lon], {
                icon: L.divIcon({ html, className: '', iconSize: [32, 32], iconAnchor: [16, 16] })
            }).bindPopup(`<b>#${i + 1} ${t.title}</b><br/>Urgencia: ${t.urgency_level}`);

            m.addTo(group);
        });

        if (pts.length > 1) {
            L.polyline(pts, { color: '#0f172a', weight: 4, opacity: 0.6, dashArray: '8, 8' }).addTo(group);
        }

        if (pts.length > 0 && mapInstance.current) {
            mapInstance.current.fitBounds(L.latLngBounds(pts), { padding: [50, 50] });
        }
    }, [activeTickets, isMapReady]);


    if (loading) return <div className="p-10 text-center">Cargando operaciones...</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Mi Cuadrilla</label>
                    <select
                        value={selectedSquad}
                        onChange={(e) => handleSquadChange(e.target.value)}
                        className="w-full border-slate-200 rounded-xl px-4 py-3 bg-slate-50 text-slate-800 font-medium"
                    >
                        <option value="" disabled>Seleccione cuadrilla</option>
                        {squads.map(s => <option key={s.id} value={s.name}>{s.name} ({s.area_name})</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-3xl font-black text-slate-800">{activeTickets.length}</span>
                        <span className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wide">Tickets para Hoy</span>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                            <Clock className="w-5 h-5 text-emerald-600" />
                        </div>
                        <span className="text-3xl font-black text-slate-800">4.5h</span>
                        <span className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wide">Tiempo Medio Res.</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[500px]">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-4">
                        <MapPin className="text-[#2596be] w-5 h-5" /> Orden de Gestión (Ruta Estimada)
                    </h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                        {activeTickets.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-10">No hay tareas pendientes.</p>
                        ) : (
                            activeTickets.map((t, i) => (
                                <div key={t.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 relative group">
                                    <div className="absolute top-4 left-4 w-6 h-6 rounded-full bg-slate-800 text-white font-bold text-xs flex items-center justify-center">
                                        {i + 1}
                                    </div>
                                    <div className="pl-10">
                                        <h4 className="font-semibold text-sm text-slate-800 line-clamp-1">{t.title}</h4>
                                        <p className="text-xs text-slate-500 mt-1">{t.area_name}</p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide" style={{
                                                background: t.urgency_level === 'Alta' ? '#ffe4e6' : t.urgency_level === 'Media' ? '#fef3c7' : '#e0f2fe',
                                                color: t.urgency_level === 'Alta' ? '#e11d48' : t.urgency_level === 'Media' ? '#d97706' : '#0284c7'
                                            }}>
                                                {t.urgency_level}
                                            </span>
                                            <span className="text-xs font-medium text-slate-400">Score: {t.priority_score}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative" style={{ minHeight: '700px' }}>
                <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200 shadow-sm font-semibold text-sm text-slate-700">
                    Mapa de Operaciones en Terreno
                </div>
                <div ref={mapRef} className="w-full h-full" />
            </div>
        </div>
    );
}
