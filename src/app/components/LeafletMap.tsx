import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  desc: string;
  urgency: string;
  status: string;
}

interface LeafletMapProps {
  markers: MapMarker[];
  height?: number | string;
  center?: [number, number];
  zoom?: number;
}

// Polígono de Vitacura (mismo que Dashboard)
const VITACURA_LATLNG: [number, number][] = [
  [-33.40979121627189, -70.60720212276362],
  [-33.40062873415507, -70.60840916155004],
  [-33.389499332962856, -70.60289165587551],
  [-33.384992599105885, -70.60089636010098],
  [-33.38235000758301, -70.60277694816887],
  [-33.3760046376323, -70.60036296220976],
  [-33.36285230108139, -70.59916175951844],
  [-33.353903448919226, -70.5857895350789],
  [-33.3514840846016, -70.57726401140697],
  [-33.35481947183783, -70.56659382227234],
  [-33.358284938330605, -70.55266896741463],
  [-33.366885883318275, -70.54445398028918],
  [-33.37061534300281, -70.53934955826718],
  [-33.36750323758047, -70.52074458758153],
  [-33.37295876607694, -70.51749157581536],
  [-33.37655552632404, -70.5258190410902],
  [-33.38463659966653, -70.53453836833025],
  [-33.4050878306965, -70.58657798777993],
  [-33.409295179207504, -70.60055765154465],
  [-33.4098027342863, -70.60727829770096],
  [-33.40979121627189, -70.60720212276362],
];

// Matches Dashboard urgency colors exactly
const urgencyColors: Record<string, string> = {
  Alta: "#b82c87",
  Media: "#f59e0b",
  Baja: "#2596be",
};

// Status border colors matching Dashboard statusColor helper
const statusBorderColors: Record<string, string> = {
  Recibido: "#2596be",
  Asignado: "#7c3aed",
  "En Gestión": "#b45309",
  Resuelto: "#7a8504",
  Cerrado: "#475569",
};

function createDashboardIcon(urgency: string, status: string) {
  const fillColor = urgencyColors[urgency] || "#2596be";
  const borderColor = statusBorderColors[status] || "#2596be";
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 24px; height: 24px;
      background: ${fillColor};
      border-radius: 50%;
      border: 3.5px solid ${borderColor};
      box-shadow: 0 2px 6px rgba(0,0,0,.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -16],
  });
}

export function LeafletMap({
  markers,
  height = 500,
  center = [-33.392, -70.578],
  zoom = 14,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      scrollWheelZoom: false,
    });

    // Same Voyager tiles as Dashboard
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "© CARTO",
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    // Overlay oscuro fuera de Vitacura (igual que Dashboard)
    const outerWorld: [number, number][] = [
      [90, -180], [90, 180], [-90, 180], [-90, -180],
    ];
    const innerVitacura = [...VITACURA_LATLNG].reverse();

    L.polygon([outerWorld, innerVitacura], {
      stroke: false,
      fillColor: "#94a3b8",
      fillOpacity: 0.45,
    }).addTo(map);

    // Contorno del límite de Vitacura
    L.polygon(VITACURA_LATLNG, {
      color: "#64748b",
      weight: 2,
      opacity: 0.6,
      dashArray: "6 4",
      fill: false,
    }).addTo(map);

    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    markers.forEach((m) => {
      const icon = createDashboardIcon(m.urgency, m.status);
      const marker = L.marker([m.lat, m.lng], { icon });
      marker.bindPopup(`
        <div style="min-width:160px; font-family: system-ui, sans-serif; font-size: 13px; padding: 4px 0;">
          <p style="font-weight:600; color:#1e293b; margin:0 0 4px">${m.title}</p>
          <p style="font-size:11.5px; color:#64748b; margin:0 0 6px">${m.desc}</p>
          <div style="display:flex; gap:4px; flex-wrap:wrap;">
            <span style="font-size:10px; padding:1px 6px; border-radius:999px; background:${urgencyColors[m.urgency] || '#e2e8f0'}22; color:${urgencyColors[m.urgency] || '#64748b'}; border:1px solid ${urgencyColors[m.urgency] || '#e2e8f0'}55; font-weight:600">${m.urgency}</span>
            <span style="font-size:10px; padding:1px 6px; border-radius:999px; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0">${m.status}</span>
          </div>
        </div>
      `);
      markersLayerRef.current!.addLayer(marker);
    });
  }, [markers]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
    />
  );
}
