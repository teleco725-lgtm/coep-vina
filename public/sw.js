/* ============================================================================
 * Service Worker — CODEM-VDM
 * ----------------------------------------------------------------------------
 * Notificaciones en background incluso cuando la pestaña está inactiva.
 *
 * Estrategia:
 *   - No hay un servidor de push real en este sandbox; en su lugar, la página
 *     (cuando está activa) usa `navigator.serviceWorker.ready` y envía
 *     `{type:'NOTIFY', payload}` por postMessage para que el SW dispare la
 *     Notification nativa del SO.
 *   - También escuchamos `push` por si en el futuro se conecta un servidor
 *     de notificaciones push (FCM, web-push, etc.).
 *   - skipWaiting + clients.claim para activar la SW de inmediato.
 * ========================================================================== */

self.addEventListener('install', (event) => {
  // Toma el control lo antes posible sin esperar a que se cierren las pestañas.
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', (event) => {
  // Reclama a todos los clientes inmediatamente para que el SW controle
  // la página actual sin tener que recargar.
  event.waitUntil(self.clients.claim());
});

// Helper: mostrar la notificación del sistema con el alerta.
function showNotify(payload) {
  try {
    const title = (payload && payload.title) || 'CODEM-VDM · Alerta';
    const body =
      (payload && (payload.body || payload.description)) ||
      'Nueva alerta de emergencia recibida.';
    const tag =
      (payload && (payload.tag || payload.id)) || `codem-${Date.now()}`;
    const data = (payload && payload.data) || { url: '/' };
    return self.registration.showNotification(title, {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      tag,
      data,
      requireInteraction: !!(payload && payload.severity === 'critical'),
    });
  } catch (err) {
    console.warn('[SW] showNotification error:', err);
  }
}

// Mensaje desde la página: la pestaña envía alertas críticas para que el SW
// dispare una notificación nativa (incluso si la pestaña pasa a background
// poco después, la notificación ya está encolada en el SO).
// H8: Validar origen del postMessage — solo aceptar del propio dominio
// Evita que paginas maliciosas envien notificaciones falsas (ISO 27001 A.13.1)
const ORIGENES_SW_PERMITIDOS = [
  'http://localhost:3000',
  'http://localhost:81',
  'https://coep-vina.vercel.app',
  'https://preview-chat-33b01503-823a-4261-a23e-8d57244c30e2.space-z.ai',
];

self.addEventListener('message', (event) => {
  // H8: Validar origen antes de procesar
  const origen = event.origin || '';
  const permitido = ORIGENES_SW_PERMITIDOS.some((o) => origen.startsWith(o)) || origen === '';
  if (!permitido) {
    console.warn('[SW] Origen no autorizado:', origen);
    return;
  }
  const msg = event && event.data;
  if (!msg) return;
  if (msg.type === 'NOTIFY' && msg.payload) {
    event.waitUntil(showNotify(msg.payload));
  } else if (msg.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push nativo (web-push / FCM) — futuro.
self.addEventListener('push', (event) => {
  let payload = null;
  try {
    if (event.data) {
      // Puede venir como JSON o texto plano.
      try {
        payload = event.data.json();
      } catch (_) {
        payload = { title: 'CODEM-VDM · Alerta', body: event.data.text() };
      }
    }
  } catch (_) {
    payload = null;
  }
  event.waitUntil(showNotify(payload || { title: 'CODEM-VDM · Alerta' }));
});

// Click en la notificación: enfoca la pestaña existente o abre una nueva.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      // Si ya hay una pestaña abierta con la misma URL, la enfocamos.
      for (const client of allClients) {
        if (client.url && client.url.includes(self.location.origin)) {
          try {
            await client.focus();
            if (typeof client.navigate === 'function') {
              await client.navigate(targetUrl);
            }
            return;
          } catch (_) {
            /* noop */
          }
        }
      }
      // Si no, abre una nueva.
      if (self.clients.openWindow) {
        try {
          await self.clients.openWindow(targetUrl);
        } catch (_) {
          /* noop */
        }
      }
    })()
  );
});
