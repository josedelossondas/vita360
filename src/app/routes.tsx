import { createBrowserRouter } from "react-router";
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import CasosPage from './pages/CasosPage';
import CaseDetail from './pages/CaseDetail';
import MapaUrbano from './pages/MapaUrbano';
import OrdenesTrabajoPage from './pages/OrdenesTrabajoPage';
import SLAPage from './pages/SLAPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ConocimientoPage from './pages/ConocimientoPage';
import ConfiguracionPage from './pages/ConfiguracionPage';

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "casos", Component: CasosPage },
      { path: "casos/:id", Component: CaseDetail },
      { path: "mapa", Component: MapaUrbano },
      { path: "ordenes", Component: OrdenesTrabajoPage },
      { path: "sla", Component: SLAPage },
      { path: "analytics", Component: AnalyticsPage },
      { path: "conocimiento", Component: ConocimientoPage },
      { path: "configuracion", Component: ConfiguracionPage },
    ],
  },
]);
