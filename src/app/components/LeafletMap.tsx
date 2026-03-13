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
