/**
 * useFleetStream
 *
 * Connects to the backend via WebSocket (preferred) and falls back to
 * HTTP polling every 800 ms if WebSocket fails.
 *
 * Env vars (set in .env.development / .env.production / Vercel):
 *   VITE_BACKEND_WS_URL   — WebSocket URL, e.g. wss://your-app.onrender.com
 *   VITE_BACKEND_HTTP_URL — HTTP URL,      e.g. https://your-app.onrender.com
 *
 * If neither is set the hook falls back to the API_URL already in the project.
 */

import { useEffect, useRef, useState } from 'react';

export interface FleetVehicle {
  id: string;
  type: 'patrol' | 'suspect';
  lat: number;
  lng: number;
  status: string;
  speed_kmh: number;
  area: string;
  phase: string;
}

export interface FleetTick {
  tick: number;
  vehicles: FleetVehicle[];
}

const TICK_MS = 800;

function getWsUrl(): string {
  const ws = import.meta.env.VITE_BACKEND_WS_URL;
  if (ws) return `${ws}/ws/fleet`;
  // Derive from HTTP url
  const http = import.meta.env.VITE_BACKEND_HTTP_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const wsBase = http.replace(/^http/, 'ws');
  return `${wsBase}/ws/fleet`;
}

function getHttpUrl(): string {
  const http = import.meta.env.VITE_BACKEND_HTTP_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return `${http}/api/fleet/state`;
}

export function useFleetStream(): FleetTick | null {
  const [data, setData] = useState<FleetTick | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsFailedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    function startPolling() {
      if (pollingRef.current) return;
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(getHttpUrl());
          if (!res.ok) return;
          const payload: FleetTick = await res.json();
          if (!cancelled) setData(payload);
        } catch {
          // ignore
        }
      }, TICK_MS);
    }

    function stopPolling() {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    function connectWs() {
      try {
        const ws = new WebSocket(getWsUrl());
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const payload: FleetTick = JSON.parse(event.data);
            if (!cancelled) setData(payload);
          } catch {
            // ignore
          }
        };

        ws.onerror = () => {
          wsFailedRef.current = true;
          ws.close();
        };

        ws.onclose = () => {
          if (cancelled) return;
          if (wsFailedRef.current) {
            // WS not available — use polling
            startPolling();
          } else {
            // Reconnect after 2s
            setTimeout(connectWs, 2000);
          }
        };
      } catch {
        wsFailedRef.current = true;
        startPolling();
      }
    }

    connectWs();

    return () => {
      cancelled = true;
      wsRef.current?.close();
      stopPolling();
    };
  }, []);

  return data;
}
