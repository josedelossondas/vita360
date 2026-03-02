import { useEffect, useRef, useState } from 'react';
import { MapPin, Layers, AlertTriangle, TrendingUp } from 'lucide-react';
import { mockCases, mockAlerts, mockLayers, type MapLayer } from '../data/mockData';
import { useFleetStream, type FleetVehicle } from '../../hooks/useFleetStream';

declare global {
  interface Window { L: any; }
}

const LAYER_COLORS: Record<string, string> = {
  veredas: '#DC2626',
  arboles: '#16A34A',
  contenedores: '#D97706',
  alumbrado: '#7C3AED',
};

// ── Helper: create divIcon for patrol/suspect ──────────────────────────────
function makeVehicleIcon(L: any, type: 'patrol' | 'suspect') {
  if (type === 'suspect') {
    return L.divIcon({
      html: `<div style="
        width:26px;height:26px;border-radius:50%;
        background:#EF4444;border:2.5px solid #991B1B;
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-weight:700;font-size:12px;font-family:sans-serif;
        box-shadow:0 2px 8px rgba(0,0,0,.35);
      ">S</div>`,
      className: '',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -16],
    });
  }
  return L.divIcon({
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:#FBBF24;border:2.5px solid #1E40AF;
      display:flex;align-items:center;justify-content:center;
      color:#1E40AF;font-weight:700;font-size:12px;font-family:sans-serif;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
    ">P</div>`,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -16],
  });
}

export default function MapaUrbano() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const layerGroups = useRef<Record<string, any>>({});
  const [activeLayers, setActiveLayers] = useState<MapLayer[]>(mockLayers);
  const [selectedCase, setSelectedCase] = useState<typeof mockCases[0] | null>(null);

  // ── Fleet stream ────────────────────────────────────────────────────────────
  const fleetTick = useFleetStream();
  const fleetMarkers = useRef<Map<string, any>>(new Map());
  const suspectTrail = useRef<[number, number][]>([]);
  const suspectPolyline = useRef<any>(null);
  const leafletReady = useRef(false);

  // ── Update fleet markers on each tick ──────────────────────────────────────
  useEffect(() => {
    if (!fleetTick || !leafletReady.current) return;
    const L = window.L;
    const map = mapInstance.current;
    if (!L || !map) return;

    const seenIds = new Set<string>();

    for (const v of fleetTick.vehicles) {
      seenIds.add(v.id);

      const popupHtml = `
        <div style="font-family:system-ui,sans-serif;min-width:160px;padding:4px 0">
          <div style="font-size:13px;font-weight:600;color:#1A2332;margin-bottom:4px">${v.id}</div>
          <div style="font-size:12px;color:#4B5563;margin-bottom:2px">Estado: <b>${v.status}</b></div>
          <div style="font-size:12px;color:#4B5563;margin-bottom:2px">Velocidad: ${v.speed_kmh} km/h</div>
          <div style="font-size:12px;color:#4B5563">Área: ${v.area}</div>
        </div>`;

      if (fleetMarkers.current.has(v.id)) {
        const marker = fleetMarkers.current.get(v.id);
        marker.setLatLng([v.lat, v.lng]);
        marker.getPopup()?.setContent(popupHtml);
      } else {
        const icon = makeVehicleIcon(L, v.type as 'patrol' | 'suspect');
        const marker = L.marker([v.lat, v.lng], { icon })
          .bindPopup(popupHtml)
          .addTo(map);
        fleetMarkers.current.set(v.id, marker);
      }

      // Suspect trail
      if (v.type === 'suspect') {
        suspectTrail.current.push([v.lat, v.lng]);
        if (suspectTrail.current.length > 40) suspectTrail.current.shift();
        if (suspectPolyline.current) {
          suspectPolyline.current.setLatLngs(suspectTrail.current);
        } else {
          suspectPolyline.current = L.polyline(suspectTrail.current, {
            color: '#EF4444',
            weight: 2,
            opacity: 0.45,
            dashArray: '4 4',
          }).addTo(map);
        }
      }
    }

    // Remove markers for vehicles no longer in the tick
    for (const [id, marker] of fleetMarkers.current) {
      if (!seenIds.has(id)) {
        mapInstance.current?.removeLayer(marker);
        fleetMarkers.current.delete(id);
        // Clear suspect trail if suspect disappears
        if (id.startsWith('S')) {
          suspectTrail.current = [];
          if (suspectPolyline.current) {
            mapInstance.current?.removeLayer(suspectPolyline.current);
            suspectPolyline.current = null;
          }
        }
      }
    }
  }, [fleetTick]);

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;

    // Load Leaflet dynamically
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = () => {
      const L = window.L;
      const map = L.map(mapRef.current).setView([-33.449, -70.668], 15);
      mapInstance.current = map;
      leafletReady.current = true;      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      // Create layer groups
      const layerMap: Record<string, string[]> = {
        veredas: ['CASO-2026-0234', 'CASO-2026-0231'],
        arboles: ['CASO-2026-0236'],
        contenedores: ['CASO-2026-0235'],
        alumbrado: ['CASO-2026-0233'],
      };

      Object.entries(layerMap).forEach(([layerKey, caseIds]) => {
        const group = L.layerGroup().addTo(map);
        layerGroups.current[layerKey] = group;

        caseIds.forEach(caseId => {
          const caso = mockCases.find(c => c.id === caseId);
          if (!caso) return;
          const color = LAYER_COLORS[layerKey] || '#1C3A8A';
          const urgColor = caso.urgencyAI >= 80 ? '#B91C1C' : caso.urgencyAI >= 60 ? '#92400E' : '#065F46';
          const urgBg = caso.urgencyAI >= 80 ? '#FEE2E2' : caso.urgencyAI >= 60 ? '#FEF3C7' : '#D1FAE5';
          const urgLabel = caso.urgencyAI >= 80 ? 'Alto' : caso.urgencyAI >= 60 ? 'Medio' : 'Bajo';
          const slaColor = caso.slaRemaining < 12 ? '#DC2626' : caso.slaRemaining < 24 ? '#D97706' : '#6B7280';

          const icon = L.divIcon({
            html: `<div style="width:26px;height:26px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>`,
            className: '',
            iconSize: [26, 26],
            iconAnchor: [13, 26],
            popupAnchor: [0, -30],
          });

          const popupContent = `
            <div style="font-family:'DM Sans',system-ui,sans-serif;padding:0;min-width:220px">
              <div style="padding:14px 14px 10px">
                <div style="font-size:13.5px;font-weight:600;color:#1A2332;margin-bottom:3px">${caso.title}</div>
                <div style="font-size:12px;color:#6B7280;margin-bottom:10px">${caso.location}</div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
                  <span style="padding:3px 8px;border-radius:5px;font-size:11.5px;font-weight:500;background:${urgBg};color:${urgColor}">${urgLabel}</span>
                  ${caso.isRecurring ? `<span style="padding:3px 8px;border-radius:5px;font-size:11.5px;font-weight:500;background:#FFEDD5;color:#C2410C">Reincidencia</span>` : ''}
                </div>
                <div style="font-size:12px;color:${slaColor};font-family:monospace;font-weight:500;margin-bottom:6px">
                  SLA: ${caso.slaRemaining}h / ${caso.slaTotal}h restantes
                </div>
                <div style="font-size:11px;color:#9CA3AF;font-family:monospace">${caso.id}</div>
              </div>
              <div style="border-top:1px solid #F3F4F6;padding:10px 14px">
                <div style="background:#1C3A8A;color:white;border-radius:7px;padding:7px 12px;font-size:12.5px;font-weight:500;text-align:center;cursor:pointer">
                  Ver detalle completo →
                </div>
              </div>
            </div>`;

          L.marker([caso.coordinates.lat, caso.coordinates.lng], { icon })
            .bindPopup(popupContent, { maxWidth: 260, minWidth: 240 })
            .addTo(group);
        });
      });
    };
    document.body.appendChild(script);
  }, []);

  const toggleLayer = (layerId: string) => {
    const newLayers = activeLayers.map(l => l.id === layerId ? { ...l, active: !l.active } : l);
    setActiveLayers(newLayers);

    const group = layerGroups.current[layerId];
    const map = mapInstance.current;
    if (!group || !map) return;
    const isActive = newLayers.find(l => l.id === layerId)?.active;
    if (isActive) group.addTo(map); else map.removeLayer(group);
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-foreground mb-1">Mapa Urbano Inteligente</h1>
        <p className="text-[13px] text-muted-foreground">Monitoreo de infraestructura y casos ciudadanos en tiempo real</p>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-5 items-start">
        {/* Mapa */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="text-[14px] font-semibold">Vista del territorio</h3>
            </div>
            <button className="px-3 py-1.5 bg-accent text-primary border border-primary/20 rounded-lg text-[12.5px] font-medium hover:bg-primary hover:text-white transition-colors">
              + Crear caso desde mapa
            </button>
          </div>

          {/* Layer filters */}
          <div className="px-4 py-3 border-b border-border flex gap-2 flex-wrap">
            {activeLayers.map(layer => (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors ${
                  layer.active
                    ? 'border-current text-primary bg-accent'
                    : 'border-border text-muted-foreground bg-secondary'
                }`}
                style={layer.active ? { borderColor: layer.color, color: layer.color, backgroundColor: layer.color + '18' } : {}}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: layer.active ? layer.color : '#9CA3AF' }} />
                {layer.name}
                <span className="text-muted-foreground">({layer.count})</span>
              </button>
            ))}
          </div>

          {/* Map container */}
          <div ref={mapRef} style={{ height: 500 }} />
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Alertas IA */}
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[14px] font-semibold">Alertas IA</span>
              </div>
              <span className="text-muted-foreground text-sm">···</span>
            </div>
            {mockAlerts.map(alert => (
              <div key={alert.id} className="flex items-start gap-3 px-4 py-3.5 border-b border-border last:border-b-0">
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: alert.type === 'critical' ? '#DC2626' : '#D97706' }}
                />
                <div>
                  <div className="text-[13px] font-medium text-foreground leading-snug mb-1">{alert.title}</div>
                  <div className="text-[11.5px] text-muted-foreground">{alert.location}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{alert.type === 'critical' ? 'Hace 0:00h' : 'Hace 5:00h'}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <h3 className="text-[13.5px] font-semibold mb-3">Estadísticas del mapa</h3>
            {[
              { label: 'Casos críticos', value: '3', color: 'bg-red-50 text-red-700 border border-red-200' },
              { label: 'Reincidencias', value: '2', color: 'bg-orange-50 text-orange-700 border border-orange-200' },
              { label: 'En riesgo SLA', value: '3', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
              { label: 'Total activos', value: '23', color: 'bg-blue-50 text-blue-700 border border-blue-200' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                <span className="text-[13px] text-foreground">{s.label}</span>
                <span className={`px-2 py-0.5 rounded-md text-[11.5px] font-medium ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Criterios IA */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-[13.5px] font-semibold">Criterios de Priorización IA</h3>
            </div>
            {[
              { label: 'Impacto', pct: 35 },
              { label: 'Frecuencia', pct: 30 },
              { label: 'SLA', pct: 20 },
              { label: 'Reincidencia', pct: 15 },
            ].map(c => (
              <div key={c.label} className="mb-3 last:mb-0">
                <div className="flex justify-between text-[12px] mb-1">
                  <span className="text-foreground">{c.label}</span>
                  <span className="text-muted-foreground">{c.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
