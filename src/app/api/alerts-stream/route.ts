// ============================================================================
// Endpoint SSE (Server-Sent Events) para alertas en tiempo real
// ----------------------------------------------------------------------------
// Funciona en Vercel (serverless) sin necesidad de WebSocket.
// El cliente se conecta con EventSource a /api/alerts-stream y recibe:
//   1. Un evento "history" con las alertas actuales
//   2. Eventos "alert" periódicos con nuevas alertas
// ============================================================================

import { NextRequest } from 'next/server'
import { generateNextAlert, getBuffer, getNextInterval } from '@/lib/server-alerts'
import type { ServerAlert } from '@/lib/server-alerts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  // H7: Validar origen — rechazar conexiones de dominios no autorizados
  const origen = req.headers.get('origin') || req.headers.get('referer') || '';
  const dominiosPermitidos = [
    'localhost',
    'coep-vina.vercel.app',
    'space-z.ai',
  ];
  // Si tiene origen y no coincide con ninguno permitido, rechazar
  if (origen && !dominiosPermitidos.some(d => origen.includes(d))) {
    return new Response('Origen no autorizado', { status: 403 });
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // 1. Enviar el historial inicial
      const history = getBuffer()
      controller.enqueue(
        encoder.encode(`event: history\ndata: ${JSON.stringify(history)}\n\n`)
      )

      // 2. Enviar stats iniciales
      const stats = {
        total: history.length,
        bySource: history.reduce((acc, a) => {
          acc[a.sourceCode] = (acc[a.sourceCode] ?? 0) + 1
          return acc
        }, {} as Record<string, number>),
        bySeverity: history.reduce((acc, a) => {
          acc[a.severity] = (acc[a.severity] ?? 0) + 1
          return acc
        }, {} as Record<string, number>),
        connectedClients: 1,
        generatedAt: new Date().toISOString(),
      }
      controller.enqueue(
        encoder.encode(`event: stats\ndata: ${JSON.stringify(stats)}\n\n`)
      )

      // 3. Enviar alertas nuevas periódicamente
      let alive = true

      const sendNext = () => {
        if (!alive) return
        try {
          const alert = generateNextAlert()
          if (alert) {
            controller.enqueue(
              encoder.encode(`event: alert\ndata: ${JSON.stringify(alert)}\n\n`)
            )
            // Enviar stats actualizadas
            const buf = getBuffer()
            const newStats = {
              total: buf.length,
              bySource: buf.reduce((acc, a) => {
                acc[a.sourceCode] = (acc[a.sourceCode] ?? 0) + 1
                return acc
              }, {} as Record<string, number>),
              bySeverity: buf.reduce((acc, a) => {
                acc[a.severity] = (acc[a.severity] ?? 0) + 1
                return acc
              }, {} as Record<string, number>),
              connectedClients: 1,
              generatedAt: new Date().toISOString(),
            }
            controller.enqueue(
              encoder.encode(`event: stats\ndata: ${JSON.stringify(newStats)}\n\n`)
            )
          }
        } catch {
          // Si hay error, cerrar silenciosamente
          alive = false
          try { controller.close() } catch {}
        }
        if (alive) {
          setTimeout(sendNext, getNextInterval())
        }
      }

      // Primera alerta despues de 30-60s
      setTimeout(sendNext, rand(30000, 60000))

      // 4. Heartbeat cada 15s para mantener viva la conexión
      const heartbeat = setInterval(() => {
        if (!alive) return
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          alive = false
          clearInterval(heartbeat)
        }
      }, 15000)

      // 5. Cleanup cuando el cliente se desconecta
      _req.signal.addEventListener('abort', () => {
        alive = false
        clearInterval(heartbeat)
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}
