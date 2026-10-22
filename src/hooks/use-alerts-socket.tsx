// ============================================================================
// Hook + store global (zustand) para el feed de alertas en tiempo real
// ----------------------------------------------------------------------------
// Se conecta al mini-service WebSocket (puerto 3003) a través del gateway Caddy
// usando `io('/', { query: { XTransformPort: '3003' } })`.
//
// Eventos:
//   - `history` (al conectar): últimas 20 alertas
//   - `alert`: nueva alerta broadcast
//   - `stats`: cada 15s con agregados
//
// Cuando llega una alerta `critical`:
//   1. Solicita permiso de Notification (si no se ha pedido antes).
//   2. PostMessage al Service Worker para que dispare la notificación nativa
//      (funciona aunque la pestaña pase a background).
//   3. Muestra un toast sonner de feedback in-app.
// ============================================================================
'use client';

import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Siren } from 'lucide-react';

import type { BroadcastAlert, Stats } from '@/lib/types';
import {
  severityLabel,
  sourceShortLabel,
} from '@/lib/severity';

// ---------------------------------------------------------------------------
// Store zustand
// ---------------------------------------------------------------------------
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface AlertsStore {
  alerts: BroadcastAlert[];
  stats: Stats | null;
  status: ConnectionStatus;
  setAlerts: (a: BroadcastAlert[]) => void;
  prependAlert: (a: BroadcastAlert) => void;
  setStats: (s: Stats) => void;
  setStatus: (s: ConnectionStatus) => void;
  reset: () => void;
}

const MAX_ALERTS = 200;

const useAlertsStore = create<AlertsStore>((set) => ({
  alerts: [],
  stats: null,
  status: 'connecting',
  setAlerts: (a) => set({ alerts: a.slice(0, MAX_ALERTS) }),
  prependAlert: (a) =>
    set((state) => ({
      alerts: [a, ...state.alerts].slice(0, MAX_ALERTS),
    })),
  setStats: (s) => set({ stats: s }),
  setStatus: (s) => set({ status: s }),
  reset: () => set({ alerts: [], stats: null, status: 'connecting' }),
}));

// ---------------------------------------------------------------------------
// Bandera global para pedir permiso de Notification una sola vez por sesión.
// ---------------------------------------------------------------------------
let notifPermissionRequested = false;

async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  if (notifPermissionRequested) return false;
  notifPermissionRequested = true;
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
}

async function notifyServiceWorker(alert: BroadcastAlert): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({
      type: 'NOTIFY',
      payload: {
        title: `[${severityLabel(alert.severity)}] ${sourceShortLabel(
          alert.sourceCode,
        )}`,
        body: alert.title,
        tag: alert.id,
        severity: alert.severity,
        data: { url: '/' },
      },
    });
  } catch {
    /* SW no listo aún — ignore */
  }
}

// ---------------------------------------------------------------------------
// Hook principal — una sola conexión compartida por toda la app.
// ---------------------------------------------------------------------------
let sharedSocket: Socket | null = null;
let sharedRefCount = 0;

function getSocket(): Socket {
  if (sharedSocket) return sharedSocket;
  // IMPORTANTE: la conexión debe ir al path '/' y llevar XTransformPort
  // en la query string para que el gateway Caddy lo reenvíe al puerto 3003.
  sharedSocket = io('/', {
    transports: ['websocket'],
    query: { XTransformPort: '3003' },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 10000,
  });
  return sharedSocket;
}

export function useAlertsSocket(): {
  alerts: BroadcastAlert[];
  stats: Stats | null;
  status: ConnectionStatus;
} {
  const alerts = useAlertsStore((s) => s.alerts);
  const stats = useAlertsStore((s) => s.stats);
  const status = useAlertsStore((s) => s.status);
  const setAlerts = useAlertsStore((s) => s.setAlerts);
  const prependAlert = useAlertsStore((s) => s.prependAlert);
  const setStats = useAlertsStore((s) => s.setStats);
  const setStatus = useAlertsStore((s) => s.setStatus);

  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const socket = getSocket();
    sharedRefCount += 1;
    setStatus(socket.connected ? 'connected' : 'connecting');

    const onConnect = () => setStatus('connected');
    const onDisconnect = () => setStatus('disconnected');
    const onHistory = (data: BroadcastAlert[]) => {
      if (Array.isArray(data)) {
        setAlerts(data);
      }
    };

    // Build the critical toast icon as JSX once per critical alert.
    const criticalIcon: JSX.Element = <Siren className="h-4 w-4" />;

    const onAlert = (alert: BroadcastAlert) => {
      if (!alert || !alert.id) return;
      prependAlert(alert);

      // Notificación nativa + sonner para alertas críticas.
      if (alert.severity === 'critical') {
        void ensureNotificationPermission();
        void notifyServiceWorker(alert);

        toast.error(alert.title, {
          description: `${sourceShortLabel(alert.sourceCode)} · ${
            alert.commune ?? 'Región de Valparaíso'
          }`,
          icon: criticalIcon,
          duration: 8000,
        });
      } else if (alert.severity === 'warning') {
        toast.warning(alert.title, {
          description: sourceShortLabel(alert.sourceCode),
          duration: 5000,
        });
      }
    };
    const onStats = (s: Stats) => {
      if (s) setStats(s);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('history', onHistory);
    socket.on('alert', onAlert);
    socket.on('stats', onStats);

    // Si el socket ya estaba conectado al montar, forzamos el estado.
    if (socket.connected) setStatus('connected');

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('history', onHistory);
      socket.off('alert', onAlert);
      socket.off('stats', onStats);
      sharedRefCount -= 1;
      if (sharedRefCount <= 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        sharedRefCount = 0;
      }
    };
  }, []);

  return { alerts, stats, status };
}
