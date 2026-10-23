# Task 2-a — Backend API + Seed (full-stack-developer)

Resumen ejecutivo del trabajo realizado para el Task ID **2-a** del dashboard CODEM-VDM.

## Artefactos producidos

### API routes (`src/app/api/`)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/sources` | Lista de fuentes (ordenadas por `code`) con `_count.alerts` |
| GET | `/api/alerts` | Historial de alertas con filtros (`limit`, `source`, `severity`, `category`, `state`, `commune`) — incluye relación `source` |
| GET | `/api/incidents` | Lista de incidentes georreferenciados (`createdAt DESC`) |
| POST | `/api/incidents` | Crea incidente (zod) + AuditLog `create` |
| GET | `/api/incidents/[id]` | Incidente puntual |
| PATCH | `/api/incidents/[id]` | Actualiza state/severity/affected/evacuated/resources/closedAt + AuditLog `update` |
| GET | `/api/fichas` | Fichas ordenadas por prioridad de riesgo (critico > alto > medio > bajo) y `updatedAt DESC`; filtros `commune`, `riskLevel`, `status`, `limit` |
| POST | `/api/fichas` | Crea ficha; autogenera `FIBER-{AÑO}-{XXXXX}` + AuditLog `create` |
| GET | `/api/fichas/[id]` | Ficha puntual |
| PATCH | `/api/fichas/[id]` | Actualiza riesgo/estado/notas/asignación/necesidades + AuditLog `update` |
| GET | `/api/compliance` | JSON estático: marco normativo chileno (SENAPRED, Ley 19.628, 21.099, 21.519, ISO 27001, NIST, CSIRT, etc.) |
| GET | `/api/stats` | Agregaciones alerts/incidents/fichas/sources + `generatedAt` |
| GET | `/api/audit` | Bitácora con filtros `entity`, `actor`, `action`, `limit` |

### Helpers
- `src/lib/audit.ts` — `writeAudit()` y `extractRequestMeta()` (IP desde `x-forwarded-for`/`x-real-ip` + User-Agent).

### Seed
- `prisma/seed.ts` — idempotente (upserts por `Source.code` y `FichaFIBER.code`).
- `package.json` añade `"db:seed": "bun prisma/seed.ts"`.

## Estado de la base de datos tras el seed
- 7 `Source` (senapred, conaf, shoa, guardiamarina, cbv2, carabineros, radio), región "Valparaíso".
- 15 `Incident` repartidos en Viña del Mar / Valparaíso / Concón / Quilpué, mix de `natural`/`antropico`, variedades de severity/state.
- 12 `FichaFIBER` con RUTs válidos (DV calculada), variedad de riskLevel/status, varios con `needsEvacuation`/`needsMedication`.
- 5 `AuditLog` de ejemplo.

## Detalles técnicos para el frontend
- Todos los endpoints devuelven JSON; en caso de error o DB vacía devuelven `[]` o un objeto de stats vacío (nunca 500 excepto si la creación/actualización falla en BD).
- Códigos FIBER usan año actual: el próximo disponible tras el seed es `FIBER-2026-00013` (el año del entorno sandbox es 2026).
- `meta` de incidentes y fichas se persiste como **string** (JSON stringificado). El frontend debe hacer `JSON.parse(meta)` cuando necesite leerlo.
- Filtros `severity`/`state`/`riskLevel`/`status` de las API son sensibles a mayúsculas y deben coincidir con los enums del schema.
- `/api/compliance` se puede cachear (Cabecera `Cache-Control: public, max-age=3600`).
- AuditLog del POST/PATCH incluye `before/after` en `meta` para trazabilidad.

## Issue detectado y resuelto
- `z.record(z.unknown())` está roto en zod v4.3.5 (lanza `Cannot read properties of undefined (reading '_zod')`). Fix: usar `z.record(z.string(), z.unknown())`. Solo afectaba a `POST /api/incidents` (era el único lugar con `z.record`).

## Lint y verificación
- `bun run lint` → limpio.
- Smoke tests en vivo contra dev server en puerto 3000: todas las rutas respondieron correctamente.
  - POST /api/incidents → 201, AuditLog con `ip: "::1"` y `userAgent: "curl/8.14.1"`.
  - POST /api/fichas → 201 con código `FIBER-2026-00013`.
  - PATCH /api/fichas/[id] → 200 con AuditLog diff `before/after`.
  - PATCH /api/fichas/{inexistente} → 404.
  - POST /api/fichas con body inválido → 422 + `issues`.

## Notas para futuros agentes
- No se modificó `prisma/schema.prisma`, `mini-services/alerts-service/`, `globals.css`, `layout.tsx` ni `page.tsx`.
- Las alertas en tiempo real siguen viniendo por WebSocket (puerto 3003); `/api/alerts` es solo historial persistido.
- Para más fichas de ejemplo se puede ejecutar nuevamente `bun run db:seed` (es idempotente; no duplicará).
