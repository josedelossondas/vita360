import { createBrowserRouter, Navigate } from "react-router";
import { LoginPage } from "./pages/LoginPage";
import { CiudadanoPage } from "./pages/CiudadanoPage";
import { OperadorPage } from "./pages/OperadorPage";
import { Dashboard } from "./pages/Dashboard";
import { ApiMonitorPage } from "./pages/ApiMonitorPage";
import { LayoutOperador } from "./components/LayoutOperador";
import { useAuth } from "../context/AuthContext";

function AppRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f8f9fa" }}>
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-2" style={{ borderColor: "#2596be", borderTopColor: "transparent" }} />
          <p className="text-xs" style={{ color: "#94a3b8" }}>Cargando...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (user.role === "operador") return <Navigate to="/operador" replace />;
  return <Navigate to="/ciudadano" replace />;
}

function ProtectedCiudadano() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== "ciudadano") return <Navigate to="/operador" replace />;
  return <CiudadanoPage />;
}

function ProtectedOperadorLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== "operador") return <Navigate to="/ciudadano" replace />;
  return <LayoutOperador />;
}

export const router = createBrowserRouter([
  { path: "/", Component: LoginPage },
  { path: "/login", Component: LoginPage },
  { path: "/app", Component: AppRedirect },
  { path: "/ciudadano", Component: ProtectedCiudadano },
  {
    path: "/operador",
    Component: ProtectedOperadorLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "tickets", Component: OperadorPage },
      { path: "api", Component: ApiMonitorPage },
    ],
  },
]);
