import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default icon paths
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

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

const urgencyColors: Record<string, string> = {
  Alta: "#ef4444",
  Media: "#f59e0b",
  Baja: "#3b82f6",
};

function createColoredIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
      background: ${color}; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      transform: rotate(-45deg);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

export function LeafletMap({
  markers,
  height = 420,
  center = [-33.392, -70.578],
  zoom = 14,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return; // already initialized

    const map = L.map(containerRef.current, {
      center,
      zoom,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update markers when they change
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    markers.forEach((m) => {
      const color = urgencyColors[m.urgency] || "#64748b";
      const icon = createColoredIcon(color);
      const marker = L.marker([m.lat, m.lng], { icon });
      marker.bindPopup(`
        <div style="min-width:160px; font-family: system-ui, sans-serif;">
          <p style="font-size:12px; font-weight:700; color:#1e293b; margin:0 0 4px">${m.id}</p>
          <p style="font-size:11px; color:#64748b; margin:0 0 6px">${m.desc}</p>
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
