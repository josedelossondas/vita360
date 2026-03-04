import { Outlet, Navigate } from "react-router";
import { LogOut, Activity, Map as MapIcon, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export function LayoutJefe() {
    const { user, logout } = useAuth();
    if (!user || user.role !== "jefe_cuadrilla") {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-gray-50/50 text-gray-800 flex flex-col font-sans">
            <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.02)] sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1e293b] to-[#334155] flex items-center justify-center shadow-lg shadow-slate-200">
                        <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-[17px] font-bold tracking-tight text-[#1e293b] leading-none">Portal Cuadrillas</h1>
                        <p className="text-[11px] text-[#64748b] mt-0.5 font-medium tracking-wide uppercase">Operaciones en terreno</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Hola, {user.name}
                    </div>
                    <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Cerrar sesión">
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
                <Outlet />
            </main>
        </div>
    );
}
