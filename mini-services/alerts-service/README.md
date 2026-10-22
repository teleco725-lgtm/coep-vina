# alerts-service

WebSocket real-time emergency alerts mini-service for the
**Dashboard de Emergencias Viña del Mar, Chile**.

Independent [Bun](https://bun.sh) project that simulates authentic alerts from
Chilean emergency sources and broadcasts them to all connected dashboard
clients via [socket.io](https://socket.io).

## Sources simulated

| code           | Name                                                  | Categories                              |
| -------------- | ----------------------------------------------------- | --------------------------------------- |
| `senapred`     | SENAPRED - Servicio Nacional de Prevención y Respuesta | sismo, tsunami, inundacion, meteorologica, quimico |
| `conaf`        | CONAF / COGRIG - Corporación Nacional Forestal       | incendio                                |
| `shoa`         | SHOA - Servicio Hidrográfico y Oceanográfico de la Armada | marea, meteorologica            |
| `guardiamarina`| Guardia Marina de Chile                              | transito (maritimo)                     |
| `cbv2`         | Cuerpo de Bomberos de Viña del Mar 2da Compañía       | incendio, transito, quimico             |
| `carabineros`  | Carabineros de Chile                                  | seguridad                               |
| `radio`        | Red de Radio de Emergencias                           | radio                                   |

## Usage

```bash
cd /home/z/my-project/mini-services/alerts-service
bun install        # one-time: install socket.io + uuid
bun run dev        # dev mode with bun --hot (auto-reload on file change)
# or
bun run start      # production (no hot reload)
```

The server listens on **`http://localhost:3003`** with `path: '/'`
(required by the project's Caddyfile reverse proxy).

### Background launch (used by the dashboard)

```bash
cd /home/z/my-project/mini-services/alerts-service && \
  nohup bun run dev > service.log 2>&1 &
```

Verify:
```bash
ss -tlnp | grep 3003
# or
tail -f service.log
```

## Socket.IO events

| event     | direction   | payload                          | cadence                            |
| --------- | ----------- | -------------------------------- | ---------------------------------- |
| `history` | server->client | `BroadcastAlert[]` (last 20)  | on connect                         |
| `alert`   | server->all | `BroadcastAlert`                 | every ~8-20s + every ~25-45s (tide)|
| `stats`   | server->all | `Stats`                          | every 15s                          |

### `BroadcastAlert` shape

```ts
interface BroadcastAlert {
  id: string                  // uuid
  externalId?: string | null  // official id (e.g. "SENAPRED-2024-1234")
  sourceCode: string          // 'senapred' | 'conaf' | 'shoa' | 'guardiamarina' | 'cbv2' | 'carabineros' | 'radio'
  sourceName: string          // human name in Spanish
  category: string            // 'sismo' | 'incendio' | 'marea' | 'meteorologica' | 'tsunami' | 'quimico' | 'inundacion' | 'seguridad' | 'transito' | 'radio'
  subcategory?: string | null // e.g. marea: 'alta' | 'media' | 'baja'
  severity: 'info' | 'watch' | 'warning' | 'critical'
  state: 'activa' | 'en_proceso' | 'cerrada'
  title: string
  description: string
  location?: string | null
  lat: number                 // ~ -33.02 .. -33.06
  lng: number                 // ~ -71.50 .. -71.62
  region: 'Valparaíso'
  commune?: string | null     // 'Viña del Mar' | 'Valparaíso' | 'Concón' | 'Quilpué' | 'Villa Alemana'
  meta?: Record<string, unknown> | null
  issuedAt: string            // ISO 8601
}
```

### `Stats` shape

```ts
interface Stats {
  total: number
  bySource: Record<string, number>
  bySeverity: Record<string, number>
  byCategory: Record<string, number>
  byState: Record<string, number>
  connectedClients: number
  generatedAt: string
}
```

## Client example

```ts
import { io } from 'socket.io-client'

const socket = io('http://localhost:3003', { path: '/' })

socket.on('history', (alerts: BroadcastAlert[]) => {
  console.log('Initial history:', alerts.length)
})
socket.on('alert', (alert: BroadcastAlert) => {
  console.log(`[${alert.sourceCode}] ${alert.title}`)
})
socket.on('stats', (stats: Stats) => {
  console.log('stats', stats)
})
```

## Tide cycle

SHOA marea alerts cycle `alta -> media (descendente) -> baja -> media (ascendente) -> alta ...`
A new marea alert is broadcast roughly every 25-45s so the dashboard can
visualise the tide cycle. Real Pacific-coast tides are semi-diurnal (~12h25m);
the cadence is accelerated for simulation purposes.

## Critical alerts

Critical (`severity: 'critical'`) alerts are intentionally sparse: ~5% of
generated alerts are forced to critical severity. These are typically SENAPRED
or CBV2 events (Alerta Roja, Emergencia Química, Sospechoso Armado, etc.).

## Graceful shutdown

`SIGTERM` and `SIGINT` are handled: timers are cleared, all socket
connections are closed, the HTTP server is shut down, and the process exits.
A 5s failsafe force-exit guards against hang-ups.

## Files

```
alerts-service/
├── package.json
├── index.ts      # main entry - server + generators + timers + shutdown
└── README.md     # this file
```

## Notes

- `bun --hot` automatically restarts the server on file changes during
  development while preserving listening sockets.
- The service is independent: it does not depend on the parent Next.js
  project. Its `socket.io` types and `BroadcastAlert` interface can be
  copy-pasted into the Next.js frontend for type-safety.
