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
// Notificaciones:
//   - Las alertas críticas disparan una notificación nativa vía Service Worker
//     (para que el operador la vea aunque la pestaña esté en background).
//   - El toast sonner en pantalla se ELIMINÓ para no ocupar espacio; en su
//     lugar, las alertas se acumulan en el badge de la campana del header,
//     donde el operador puede revisarlas cuando quiera.
// ============================================================================
'use client';

import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { io, type Socket } from 'socket.io-client';

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
  unreadCount: number;
  setAlerts: (a: BroadcastAlert[]) => void;
  prependAlert: (a: BroadcastAlert) => void;
  setStats: (s: Stats) => void;
  setStatus: (s: ConnectionStatus) => void;
  markAllRead: () => void;
  reset: () => void;
}

const MAX_ALERTS = 200;

const useAlertsStore = create<AlertsStore>((set) => ({
  alerts: [],
  stats: null,
  status: 'connecting',
  unreadCount: 0,
  setAlerts: (a) => set({ alerts: a.slice(0, MAX_ALERTS) }),
  prependAlert: (a) =>
    set((state) => ({
      alerts: [a, ...state.alerts].slice(0, MAX_ALERTS),
      // Solo las alertas VERIFICadas (verdaderas) incrementan el contador de
      // la campana. Los rumores (verified=false) se acumulan en la lista pero
      // no generan notificación visible para no molestar al operador con
      // reportes no confirmados.
      unreadCount: a.verified === false ? state.unreadCount : state.unreadCount + 1,
    })),
  setStats: (s) => set({ stats: s }),
  setStatus: (s) => set({ status: s }),
  markAllRead: () => set({ unreadCount: 0 }),
  reset: () => set({ alerts: [], stats: null, status: 'connecting', unreadCount: 0 }),
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
  // useShallow evita re-renders innecesarios: el objeto retornado solo
  // cambia cuando alerts/stats/status cambian de valor (no en cada render).
  // Sin esto, zustand v5 + React 19 entra en loop "getServerSnapshot should
  // be cached" / "Maximum update depth exceeded".
  const { alerts, stats, status } = useAlertsStore(
    useShallow((s) => ({
      alerts: s.alerts,
      stats: s.stats,
      status: s.status,
    })),
  );
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

    const onAlert = (alert: BroadcastAlert) => {
      if (!alert || !alert.id) return;
      prependAlert(alert);

      // Notificación nativa del sistema operativo vía Service Worker, SOLO
      // para alertas críticas. Esto funciona aunque la pestaña esté en
      // background. NO mostramos toast en pantalla: el contador de la
      // campana del header ya da feedback visible al operador.
      if (alert.severity === 'critical') {
        void ensureNotificationPermission();
        void notifyServiceWorker(alert);
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
    // Dependencias vacías: el effect solo corre una vez al montar.
    // Las funciones set* son estables (zustand las mantiene referenciadas).
  }, []);

  return { alerts, stats, status };
}

// ---------------------------------------------------------------------------
// Hooks derivados para la campana de notificaciones del header.
// ---------------------------------------------------------------------------

/** Lista de las últimas 30 alertas para mostrar en el popover de la campana.
 *  Usa useShallow para que el selector devuelva una referencia estable cuando
 *  el contenido del array no cambia (evita loop infinito de re-renderizado). */
export function useRecentNotifications(limit = 30): BroadcastAlert[] {
  return useAlertsStore(
    useShallow((s) => s.alerts.slice(0, limit)),
  );
}

/** Contador de alertas no leídas (se resetea al abrir la campana). */
export function useUnreadCount(): number {
  return useAlertsStore((s) => s.unreadCount);
}

/** Función para marcar todas las notificaciones como leídas. */
export function useMarkAllRead(): () => void {
  return useAlertsStore((s) => s.markAllRead);
}
