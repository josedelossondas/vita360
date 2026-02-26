import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from './components/Layout';
import { LayoutOperador } from './components/LayoutOperador';
import LoginPage from './pages/LoginPage';
import CiudadanoPage from './pages/CiudadanoPage';
import OperadorPage from './pages/OperadorPage';
import Dashboard from './pages/Dashboard';
import ApiMonitorPage from './pages/ApiMonitorPage';
import ReportarProblemaPage from './pages/ReportarProblemaPage';
import { useAuth } from '../context/AuthContext';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-[13px]">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleRouter() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-[13px]">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ciudadano') return <Navigate to="/ciudadano" replace />;
  if (user.role === 'operador') return <Navigate to="/operador" replace />;
  return <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  {
    path: "/ciudadano",
    element: <RequireAuth><Layout citizen /></RequireAuth>,
    children: [
      { index: true, Component: CiudadanoPage },
      { path: "reportar", Component: ReportarProblemaPage },
    ],
  },
  {
    path: "/operador",
    element: <RequireAuth><LayoutOperador /></RequireAuth>,
    children: [
      { index: true, Component: Dashboard },
      { path: "tickets", Component: OperadorPage },
      { path: "api", Component: ApiMonitorPage },
    ],
  },
  { path: "/login", Component: LoginPage },
  { path: "/app", Component: RoleRouter },
  { path: "/", Component: LoginPage },
]);
