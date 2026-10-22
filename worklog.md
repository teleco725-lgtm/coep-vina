# Worklog - Dashboard de Emergencias Viña del Mar

Proyecto: Dashboard integral de gestión de emergencias para Viña del Mar, Chile.
Integra alertas de SENAPRED, CONAF/COGRIG, SHOA (meteorología + mareas), Guardia Marina, Bomberos CBV2, Carabineros y Radio.
Incluye mapa georreferenciado de catástrofes, fichas FIBER, panel de cumplimiento legal y notificaciones en tiempo real.

---
Task ID: 0
Agent: Main Orchestrator
Task: Inicializar plan y arquitectura del dashboard

Work Log:
- Análisis de proyecto Next.js 16 existente (shadcn/ui + Prisma)
- Definición de arquitectura:
  * Mini-service WebSocket en puerto 3003 para broadcasts de alertas
  * API routes de Next.js: alerts, fichas, incidents, sources, compliance, stats
  * Frontend: dashboard con mapa Leaflet + feed en tiempo real + fichas FIBER + panel cumplimiento
  * Service Worker + Notification API para alertas con página inactiva
- Paleta: gradientes azul petróleo -> arena dorada (colores municipalidad de Viña del Mar, suaves y amigables a la vista)

Stage Summary:
- Plan listo para ejecución en paralelo
- Subagentes se asignarán a Tasks 2-a (mini-service WS), 2-b (API routes), 3 (frontend dashboard)

---
Task ID: 2-a
Agent: full-stack-developer (backend API + seed)
Task: Crear todas las rutas API de App Router (sources, alerts, incidents + [id], fichas + [id], compliance, stats, audit), el script de semilla `prisma/seed.ts`, ejecutar `db:push` y el seed, y dejar todo listo para el frontend.

Work Log:
- Lectura de `worklog.md`, `prisma/schema.prisma` y `src/lib/db.ts` (singleton de Prisma ya configurado).
- Lectura del mini-service WebSocket (puerto 3003) para entender el contrato `BroadcastAlert` y alinear nombres de fuentes/categorías.
- Creación del helper `src/lib/audit.ts` con `writeAudit()` y `extractRequestMeta()` (extrae IP desde `x-forwarded-for`/`x-real-ip` y User-Agent) — registro trazable según Ley 19.628 art. 2.
- `GET /api/sources` → lista ordenada por `code` con `_count.alerts` para badges del frontend.
- `GET /api/alerts` → soporta `limit` (default 50, max 200), `source`, `severity`, `category`, `state`, `commune`; incluye relación `source`. Devuelve `[]` si no hay datos.
- `GET /api/incidents` y `POST /api/incidents` → POST valida con zod (incluye `meta` como objeto y lo stringifica al guardar) y escribe AuditLog (`action=create`, `entity=Incident`).
- `PATCH /api/incidents/[id]` → actualiza `state`, `severity`, `affected`, `evacuated`, `resources`, `closedAt`; registra AuditLog (`action=update`) con `before/after`. Incluye GET por id.
- `GET /api/fichas` y `POST /api/fichas` → GET ordena por prioridad de riesgo (critico > alto > medio > bajo) y luego `updatedAt DESC` (en JS tras fetch, evita raw SQL); POST autogenera código `FIBER-{AÑO}-{XXXXX}` calculando el máximo existente.
- `GET /api/fichas/[id]` y `PATCH /api/fichas/[id]` → GET simple, PATCH actualiza riesgo/estado/notas/asignación/necesidades con AuditLog.
- `GET /api/compliance` → JSON estático enriquecido con marco normativo chileno: SENAPRED (Ley 21.151), Política Nacional de Seguridad Escolar, ONEMI legacy, Plan DMC; Ley 19.628, 21.099, 21.519; ISO 27001, NIST CSF, CSIRT Nacional, OWASP; DFL 536, Plan DAE, Ley 18.243; `dataHandling` con principios, retención, cifrado, auditoría y consentimiento.
- `GET /api/stats` → agrega `alerts.by{Source,Severity,Category,State}`, `incidents.by{Type,Nature,State}` + `active`, `fichas.by{RiskLevel,Status,Commune}`, `sources`, `generatedAt`. Estructura siempre válida aunque DB esté vacía.
- `GET /api/audit` → filtra por `entity`, `actor`, `action`, `limit` (default 100, max 500). Ordenado por `createdAt DESC`.
- `prisma/seed.ts` → idempotente: upserts por `Source.code` y `FichaFIBER.code`; incidentes marcados con `meta.seed=true` y recreados. 7 fuentes, 15 incidentes (incendio_forestal/urbano, sismo, inundacion, deslizamiento, quimico, accidente, delito) repartidos en Viña del Mar/Valparaíso/Concón/Quilpué con coordenadas reales (~ -33.00 a -33.07, -71.50 a -71.62); 12 fichas con RUTs válidos (DV calculada), variedad de riskLevel/status/commune, varias con needsEvacuation/needsMedication; 5 AuditLog de ejemplo. Helper `formatRut` genera XX.XXX.XXX-X.
- Script npm `db:seed` añadido a `package.json` (corre `bun prisma/seed.ts`).
- `bun run db:push` ejecutado (schema ya estaba en sync; regeneró Prisma Client v6.19.2).
- `bun run db:seed` ejecutado: 7 fuentes, 15 incidentes, 12 fichas, 5 audit-logs.
- Smoke test en vivo contra dev server: `/api/sources`, `/api/stats`, `/api/fichas`, `/api/incidents` (POST + PATCH), `/api/fichas/[id]` (POST + PATCH + 404 + 422), `/api/compliance`, `/api/audit` — todos responden correctamente. AuditLog creado con IP `::1` y user-agent `curl/8.14.1`.
- Bug encontrado y corregido: `z.record(z.unknown())` está roto en zod v4.3.5 (lanza `Cannot read properties of undefined (reading '_zod')`). Cambiado a `z.record(z.string(), z.unknown())` en `incidents/route.ts`. Repro y fix verificados en Bun.
- `bun run lint` pasa limpio (sin warnings ni errores).

Stage Summary:
- **API contract completo** bajo `src/app/api/`:
  * `GET /api/sources`
  * `GET /api/alerts?limit&source&severity&category&state&commune`
  * `GET /api/incidents` · `POST /api/incidents`
  * `GET /api/incidents/[id]` · `PATCH /api/incidents/[id]`
  * `GET /api/fichas?commune&riskLevel&status&limit` · `POST /api/fichas`
  * `GET /api/fichas/[id]` · `PATCH /api/fichas/[id]`
  * `GET /api/compliance` (estático, panel de cumplimiento legal chileno)
  * `GET /api/stats` (agregaciones)
  * `GET /api/audit?limit&entity&actor&action`
- **Helpers**: `src/lib/audit.ts` (`writeAudit`, `extractRequestMeta`).
- **Seed** `prisma/seed.ts` idempotente + script `db:seed`. DB poblada: 7 sources, 15 incidents, 12 fichas FIBER, 5 audit logs.
- **Códigos FIBER**: generados como `FIBER-{año}-{XXXXX}` (año actual). Próximo disponible tras seed = `FIBER-2026-00013`.
- **Validaciones**: zod con `safeParse` → 422 + issues. 404 cuando el recurso no existe. 500 controlado en try/catch. Todos los GET devuelven `[]` o estructura vacía si no hay datos.
- **Trazabilidad**: POST/PATCH de incidents y fichas escriben `AuditLog` con IP, User-Agent y diff `before/after` para cumplimiento Ley 19.628.
- **Lint**: 0 errores.
- **Pendiente para el agente de frontend**: consumir estos endpoints según el contrato; el feed de alertas en tiempo real sigue viniendo por el WebSocket del mini-service en puerto 3003 (no se modificó).

---
Task ID: 3
Agent: full-stack-developer (frontend dashboard)
Task: Construir el dashboard CODEM-VDM completo (frontend): Service Worker + PWA manifest, tipos compartidos, helpers de severidad, hook zustand para el feed WS, y los 8 paneles del dashboard (alert-card, live-feed, incident-map, stats-overview, charts-panel, fichas-panel, compliance-panel, incident-form) más la composición final en src/app/page.tsx con header sticky + reloj en vivo + modo oscuro + footer sticky.

Work Log:
- Lectura de `worklog.md`, `agent-ctx/2-a-*.md`, `globals.css`, `layout.tsx`, `package.json`, componentes shadcn existentes (card, button, badge, dialog, table, form, select, tabs, accordion, tooltip, dropdown-menu, checkbox, skeleton, sonner), APIs (`/api/sources`, `/api/alerts`, `/api/incidents`, `/api/fichas`, `/api/compliance`, `/api/stats`), y `mini-services/alerts-service/index.ts` para confirmar el contrato WS.
- `public/sw.js` — Service Worker: `install`→skipWaiting, `activate`→clients.claim, `push` + `message` tipo NOTIFY, `showNotification` con `/logo.svg` y `requireInteraction` para críticas, `notificationclick` enfoca/abre la pestaña.
- `public/manifest.webmanifest` — PWA manifest (CODEM-VDM, standalone, theme #3a78b8, icon /logo.svg).
- `src/lib/types.ts` — espejo TS del contrato (BroadcastAlert, Stats, Incident, FichaFIBER, Source, ComplianceData con ComplianceItem+DataHandling, ApiStats, enums).
- `src/lib/severity.ts` — helpers (severityColor/Border/TextColor/Label, categoryLabel, incidentTypeLabel, natureLabel, stateLabels, riskLevelBadgeClass, sourceColor con paleta Viña sin indigo, sourceShortLabel, incidentTypeColor oklch).
- `src/hooks/use-alerts-socket.tsx` — store zustand + hook con conexión única compartida al WS vía `io('/', {query:{XTransformPort:'3003'}})`. En critical: Notification.requestPermission una sola vez + postMessage al SW + toast.error sonner. En warning: toast.warning. Ref-counted para desconexión limpia.
- `src/components/theme-provider.tsx` — wrapper next-themes (attribute="class", defaultTheme light, enableSystem).
- `src/components/dashboard/alert-card.tsx` — tarjeta con borde-izq de color por severidad, icono estático (Info/Eye/AlertTriangle/Siren), badge fuente (color del source), descripción truncable >180 chars, meta chips, time-ago con date-fns locale es, framer-motion entrada slide+fade.
- `src/components/dashboard/live-feed.tsx` — panel "En Vivo" con dot pulsante + status + count, filtros chip (Todas/SENAPRED/CONAF/SHOA/CBV2/Carabineros/Radio), lista scrollable max-h-[28rem], AnimatePresence, empty-state.
- `src/components/dashboard/incident-map.tsx` — mapa Leaflet (react-leaflet v5, ssr:false desde la página), centrado en Viña [-33.0245,-71.5517] zoom 12, tiles OSM. Circle por incidente (radio=radiusMeters, color por tipo), Popup con título+badges+afectados/evacuados+recursos, CircleMarker pulsante (`pulse-critical`) para críticas activas, overlay de últimas 10 alertas en vivo como CircleMarker pequeños con color de fuente. Leyenda glass top-right + toggles Checkbox (Incidentes / Alertas en vivo). FitBounds en carga. Altura responsive h-[22rem] móvil / h-[32rem] desktop.
- `src/components/dashboard/stats-overview.tsx` — 4 KPI cards: Alertas Activas (WS byState), Incidentes Activos (/api/incidents), Fichas FIBER Críticas+Altas (/api/stats), Fuentes Conectadas. Skeleton para carga, trend indicator.
- `src/components/dashboard/charts-panel.tsx` — Tabs (Fuentes / Tipos). Donut PieChart con alertas por fuente (sourceColor), BarChart vertical con incidentes por tipo. ResponsiveContainer + Tooltip/Legend recharts con CSS vars.
- `src/components/dashboard/fichas-panel.tsx` — panel FIBER con react-query. Filtros (comuna/riesgo/estado Select) + búsqueda texto. Tabla max-h-96 overflow-y-auto, scroll-x móvil, badges de riesgo/estado, iconos Tooltip de necesidades (Ambulance/Pill/Accessibility). Click en fila → Dialog detalle + PATCH (rhf+zod). Botón Nueva Ficha → Dialog con form completo (POST). Toasts sonner en cada operación.
- `src/components/dashboard/compliance-panel.tsx` — Tabs (Marcos Legales / Protección de Datos / Ciberseguridad / Leyes de Catástrofe / Manejo de Datos). Cada tab es un Accordion de items con name, description, obligations[], link externo. "Manejo de Datos" renderiza dataHandling: principles como badges + cards de Retención/Cifrado/Auditoría/Respaldos/Acceso/Consentimiento.
- `src/components/dashboard/incident-form.tsx` — Dialog para POST /api/incidents con rhf+zod (type, nature, severity, state, title, description, commune, address, lat/lng, radiusMeters, affected, evacuated, resources). On success: invalida react-query y toast.
- `src/app/page.tsx` — página única `'use client'` que envuelve en ThemeProvider + QueryProvider + SonnerToaster. Header sticky (glass) con logo + título + subtítulo + reloj en vivo (Intl.DateTimeFormat America/Santiago) + badge críticas + ConnectionBadge + botón "Nueva Catástrofe" + ThemeToggle (DropdownMenu Claro/Oscuro/Sistema). Main grid lg:grid-cols-12 con 4 filas (KPIs / Map+Feed / Fichas+Charts / Compliance). Footer mt-auto (sticky al fondo) con "Municipalidad de Viña del Mar · CODEM · Sistema de Gestión de Emergencias" + Ley 19.628 + versión. IncidentMap cargado con `dynamic(..., {ssr:false})`.
- Lint: primera pasada con 3 errores (Cannot create components during render en alert-card por `severityIcon()` function-call dentro de render, setState in effect en compliance-panel, JSX en `.ts` en use-alerts-socket). Fixes: lookup estático `SEVERITY_ICONS` map en alert-card, removido `setLoading(true)` del effect, archivo renombrado a `use-alerts-socket.tsx` con icon JSX construido fuera del callback. Lint final: 0 errores, 0 warnings.
- Verificación en dev.log: `GET / 200`, `GET /api/stats 200`, `GET /api/incidents 200`, `GET /api/fichas?limit=200 200`, `GET /api/compliance 200`, `GET /manifest.webmanifest 200`, `GET /sw.js 200`, `GET /logo.svg 200`. HTML renderizado contiene "CODEM-VDM", "Centro de Operaciones", "FIBER", "Ley 19.628", "Municipalidad de Viña".
- Escrito registro detallado en `agent-ctx/3-frontend-dashboard.md`.

Stage Summary:
- **Dashboard CODEM-VDM completo y funcional** bajo `src/app/page.tsx` + `src/components/dashboard/*` (8 paneles) + `src/hooks/use-alerts-socket.tsx` + `src/lib/{types,severity}.ts` + `src/components/theme-provider.tsx` + `public/{sw.js,manifest.webmanifest}`.
- **PWA instalable** con Service Worker que dispara notificaciones nativas en background cuando llega una alerta crítica (postMessage desde el hook zustand).
- **Feed en tiempo real** vía Socket.IO (`io('/', {query:{XTransformPort:'3003'}})`), ref-counted para una sola conexión compartida; store zustand global accesible por todos los componentes.
- **Mapa Leaflet** (react-leaflet v5) con círculos por incidente coloreados por tipo, popup enriquecido, CircleMarker pulsante para críticas activas, overlay de últimas 10 alertas en vivo, leyenda y toggles de capas.
- **Fichas FIBER** con tabla + filtros + búsqueda + form de creación/edición (rhf+zod) + toasts sonner + invalidación react-query.
- **Panel de cumplimiento legal** con 5 tabs (Marcos/Datos/Ciberseguridad/Catástrofes/Manejo) según SENAPRED, Ley 19.628, Ley 21.519, ISO 27001, NIST CSF.
- **Diseño**: paleta Viña del Mar (CSS vars, sin indigo/azul-500), gradient del body visible, glass en header/footer/overlays, modo claro/oscuro vía next-themes, mobile-first responsive, sticky footer con `mt-auto` + `min-h-screen flex flex-col`, animaciones framer-motion, accesibilidad (aria-labels, roles semánticos, alt), skeletons en cargas, toast feedback, español 100%.
- **Lint**: 0 errores, 0 warnings. **Dev server**: `GET / 200` sin errores de runtime tras compilar.
- **No se modificó**: `prisma/schema.prisma`, `src/lib/db.ts`, `src/app/api/**`, `mini-services/**`, `globals.css`, `layout.tsx`. No se crearon rutas adicionales.

---
Task ID: 4
Agent: Main Orchestrator (Self-Verification)
Task: Verificar end-to-end con Agent Browser que el dashboard renderiza, interactúa y el feed en tiempo real funciona

Work Log:
- Abierto http://localhost:3000/ y http://localhost:81/ (via gateway Caddy) en agent-browser
- Confirmado: header "CODEM-VDM · Centro de Operaciones de Emergencias" renderiza
- Confirmado: mapa Leaflet con tiles OpenStreetMap centrado en Viña del Mar (-33.0245, -71.5517)
- Confirmado: WebSocket conecta a través del gateway (clients=1 en alerts-service). NOTA: la conexión solo funciona via el gateway Caddy (puerto 81) porque el socket.io `io('/')` resuelve al origen; abrir localhost:3000 directamente no enruta el WS. En el preview real (puerto 81) funciona correctamente.
- Confirmado: feed en vivo muestra alertas reales (SHOA "Boletín Meteorológico Marítimo", CBV2 "Rescate Vehicular", SHOA "Marea Media") con timestamps "hace N segundos"
- Confirmado: filtro por fuente funciona (clic SENAPRED -> solo alertas SENAPRED, etiqueta cambia a "filtradas")
- Confirmado: diálogo "Registrar Nueva Catástrofe" abre con todos los campos (Tipo, Naturaleza, Severidad, Estado, Título, Lat/Lng pre-pobladas con coords de Viña del Mar, etc.)
- Confirmado: POST /api/incidents crea catástrofe (HTTP 201) + AuditLog insertado; toast "Catástrofe registrada"
- Confirmado: tabla Fichas FIBER con 12 registros sembrados (FIBER-2026-00001..00012) con nombres chilenos, RUTs, comunas, niveles de riesgo
- Confirmado: panel de cumplimiento legal con 5 tabs (Marcos Legales, Protección de Datos, Ciberseguridad, Leyes de Catástrofe, Manejo de Datos) mostrando SENAPRED Ley 21.151, ONEMI, Ley 19.628, Ley 21.519, ISO 27001, NIST CSF
- Confirmado: charts panel con tabs Fuentes/Tipos
- Confirmado: modo oscuro funciona (clase "dark" aplicada al <html>)
- Confirmado: footer con "Municipalidad de Viña del Mar · CODEM · Sistema de Gestión de Emergencias" + Ley 19.628
- Confirmado: Service Worker registrado (`/sw.js`) para notificaciones en background
- Confirmado: 0 errores en dev.log, 0 errores en consola del navegador
- Confirmado: alerts-service generó 200 alertas totales, 7 críticas; conexión/desconexión limpia

Stage Summary:
- Dashboard 100% funcional y verificado end-to-end
- Todas las fuentes integradas: SENAPRED, CONAF/COGRIG, SHOA (meteorología + marea alta/media/baja), Guardia Marina, CBV2, Carabineros, Radio
- Notificaciones en tiempo real via WebSocket (activo e inactivo vía Service Worker)
- Mapa georreferencial de catástrofes (naturales y antrópicas) con Leaflet
- Fichas FIBER con CRUD completo
- Panel de cumplimiento legal (SENAPRED, ciberseguridad, protección de datos, leyes de catástrofes)
- Tema visual de Viña del Mar (gradiente azul petróleo -> arena, suave, no molesto a la vista)
- Sticky footer, responsive, modo oscuro, accesible

---
Task ID: 5
Agent: full-stack-developer (memory-optimized forms)
Task: Eliminar `react-hook-form`, `@hookform/resolvers/zod` y `zod` de los dos componentes de formulario pesados (`fichas-panel.tsx` e `incident-form.tsx`) para reducir el consumo de memoria del bundler Turbopack y evitar OOM-kills del dev server en el sandbox de 4GB.

Work Log:
- Lectura de `worklog.md` (Tasks 0, 2-a, 3, 4) y de los dos archivos objetivo (1046 y 530 líneas respectivamente). Confirmado que ambos usaban `useForm` + `zodResolver` + schemas `z.object(...)` + los wrappers `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, `FormDescription` de `@/components/ui/form`.
- Confirmado que los ESLint rules del proyecto desactivan `no-undef` y `@typescript-eslint/no-unused-vars`, por lo que el `bun run lint` previo pasaba limpio a pesar de que `fichas-panel.tsx` referenciaba `IdCard` (lucide-react) sin importarlo (bug latente: el icono de RUT nunca renderizaba en el diálogo de detalle).
- Verificado el contrato de los endpoints contra los que los forms hacen POST/PATCH:
  * `POST /api/incidents` (zod): type, nature, severity, state, title, description?, lat, lng, commune, address?, radiusMeters, affected, evacuated, resources?, meta?.
  * `POST /api/fichas` (zod): fullName, rut?, address?, commune, lat?, lng?, phone?, email?(email), ageRange?, riskLevel, vulnerability?, householdSize(int>0), hasPets, needsMedication, needsMobility, needsEvacuation, notes?, assignedTo?, status?.
  * `PATCH /api/fichas/[id]` (zod): riskLevel?, status?, notes?, assignedTo?, needs*?, …
- **Reescritura de `src/components/dashboard/incident-form.tsx` (530 → 490 líneas)**:
  * Eliminados imports: `useForm` de `react-hook-form`, `zodResolver` de `@hookform/resolvers/zod`, `z` de `zod`, y `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, `FormDescription` de `@/components/ui/form`.
  * Eliminado el schema `incidentSchema` (`z.object`) y el tipo `IncidentForm = z.infer<...>`.
  * Añadido `Label` de `@/components/ui/label` para reemplazar `FormLabel`.
  * Definido `interface IncidentFormState` con todos los campos (type, nature, severity, state, title, description, commune, address, lat, lng, radiusMeters, affected, evacuated, resources) — los numéricos como `string` para inputs controlados nativos (se convierten con `Number(...)` en el submit).
  * Constante `INITIAL_STATE` con los mismos defaults del `useForm` anterior (severity='warning', state='activa', lat='-33.0245', lng='-71.5517', radiusMeters='500', affected='0', evacuated='0', etc.).
  * Estado: `const [form, setForm] = useState<IncidentFormState>(INITIAL_STATE)` + `const [errors, setErrors] = useState<{ title?, lat?, lng? }>({})`.
  * Helper `setField(key, value)` genérico que actualiza y limpia el error del campo correspondiente.
  * `handleSubmit` hace validación manual: `title` no vacío, `lat` y `lng` no vacíos y parseable con `Number.isFinite`. Construye el body con los tipos correctos (description/address/resources → `null` si vacíos; numéricos convertidos; `meta` no se envía porque el backend lo marca opcional).
  * Toasts sonner idénticos: `toast.error('Error al registrar catástrofe', {description})`, `toast.success('Catástrofe registrada', {description: title})`, `toast.error('Error de red al registrar el incidente.')`.
  * `handleOpenChange` resetea el form al cerrar (mismo comportamiento que `form.reset()` de RHF).
  * Llama `onCreated?.()` y `onOpenChange(false)` tras éxito, igual que antes.
  * UI/UX 100% preservada: misma grilla `sm:grid-cols-2`, mismos labels en español, mismos placeholders, mismo DialogHeader con `AlertOctagon`, mismo footer con botones Cancelar/Registrar catástrofe con iconos `Loader2`/`Save`, misma nota de sugerencia MapPin. Inputs ahora con `id="incident-*"` y `Label htmlFor` en lugar de `FormLabel`.
  * Export `IncidentFormDialog` mantiene exactamente la misma firma `({open, onOpenChange, onCreated})`. También se conserva el helper `IncidentFormTrigger`.
- **Reescritura de `src/components/dashboard/fichas-panel.tsx` (1046 → 1012 líneas)**:
  * Eliminados imports: `useForm`, `zodResolver`, `z`, y `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, `FormDescription`.
  * Eliminados los schemas `newFichaSchema` y `editFichaSchema` y sus tipos inferidos `NewFichaForm`/`EditFichaForm`.
  * Añadidos imports: `Label` de `@/components/ui/label` y `IdCard` de `lucide-react` (este último fixa el bug latente de la línea 897 donde se renderizaba `<DetailRow icon={IdCard} .../>` sin importar el icono, ahora el RUT sí muestra su icono correcto en el diálogo de detalle).
  * **`FichasPanel` (panel principal) — sin cambios**: tabla, filtros (comuna/riesgo/estado/buscar), uso de `useQuery`/`useQueryClient` con `queryKey` memoizado, `filteredFichas`, función `refresh()` que invalida `['fichas']`, toasts, contadores, label "Ley 19.628 · Datos sensibles", tooltips de necesidades (Ambulance/Pill/Accessibility), badges de riesgo/estado, skeletons durante carga. Todo idéntico.
  * **`NewFichaDialog` reescrito**:
    - `interface NewFichaState` con los 18 campos (fullName, rut, address, commune, lat, lng, phone, email, ageRange como `AgeRange | ''`, riskLevel, vulnerability, householdSize como string, hasPets, needsMedication, needsMobility, needsEvacuation, notes, assignedTo).
    - Constante `NEW_FICHA_INITIAL` con los mismos defaults del `useForm` anterior.
    - Estado `form` + `errors` (fullName, commune, ageRange, riskLevel, email).
    - Helper `setField` genérico.
    - Validación manual en `handleSubmit`: fullName no vacío, commune no vacío, ageRange presente, riskLevel presente, email (si viene) con regex simple `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Muestra `<p className="text-xs text-destructive">{error}</p>` debajo del input correspondiente (mismo efecto visual que `FormMessage`).
    - Construye el body con conversiones correctas: lat/lng a `number | null` (con `Number.isFinite`), email vacío → `null`, ageRange vacío → `null`, householdSize a `Number(...) || 1` (cumple `z.number().int().positive().default(1)` del backend), strings vacíos → `null` para los opcionales.
    - POST `/api/fichas`, toast success con el `created.code` (ej. `FIBER-2026-00013`), toast error con `error` o `issues[0].message` del backend, toast catch para error de red. Igual que antes.
    - `resetForm()` limpia `form` y `errors` (equivalente a `form.reset()`). Se invoca al cerrar el dialog y tras crear exitosamente. `onCreated()` dispara el refresh del react-query.
    - **Necesidades (checkboxes)**: grid 2x4 con `['needsEvacuation', 'needsMedication', 'needsMobility', 'hasPets']`, cada uno con `<input type="checkbox" id="ficha-{key}" className="h-4 w-4 rounded border-input">` + `<Label htmlFor="ficha-{key}" className="text-xs font-normal">` — mismo aspecto visual que el original (que usaba input nativo dentro de `FormControl`).
    - Mismas descripciones (`FormDescription` → `<p className="text-[11px] text-muted-foreground">`) para notas ("Trazabilidad: AuditLog (Ley 19.628 art. 2).").
    - Footer idéntico: Cancelar / Crear ficha con Loader2/Save.
  * **`EditFichaDialog` reescrito**:
    - `interface EditFichaState` con los 4 campos del original (riskLevel, status, assignedTo, notes).
    - `buildEditState(ficha)` helper que genera el estado inicial desde la ficha seleccionada (reemplaza al `useForm({defaultValues})` + `useEffect(form.reset(...))`).
    - Estado `form` (inicializado con `buildEditState(ficha)`) + `useEffect(() => setForm(buildEditState(ficha)), [ficha])` para resetear cuando cambia la ficha prop (mismo comportamiento que el `form.reset` dentro del useEffect de RHF).
    - `handleSubmit` construye body con `assignedTo`/`notes` vacíos → `null`, hace PATCH `/api/fichas/${ficha.id}`, toast success con `${ficha.code} · ${riskLevelLabel(...)} · ${fichaStatusLabel(...)}`, toast error, invoca `onUpdated()`.
    - Mantiene el panel de **solo lectura** con `DetailRow` (RUT con IdCard, dirección con MapPin, teléfono con Phone, email con Mail, edad y hogar con Users, vulnerabilidad con Accessibility) — ahora el icono de RUT SÍ aparece (bug fix).
    - Mantiene Selects de riskLevel/status, Input de assignedTo, Textarea de notes con su descripción "Cambio registrado en AuditLog.", footer Cancelar/Guardar cambios.
  * `DetailRow` helper sin cambios.
- **Cero uso de react-hook-form/@hookform/zod** en ambos archivos: verificado con `grep -E "react-hook-form|@hookform|zod" src/components/dashboard/fichas-panel.tsx src/components/dashboard/incident-form.tsx` → sin coincidencias (exit 1).
- **`bun run lint`** pasa limpio (exit 0, sin warnings ni errores).
- **Contrato API preservado**: el body que envían los forms cumple exactamente con los schemas zod de `/api/incidents/route.ts`, `/api/fichas/route.ts` y `/api/fichas/[id]/route.ts` (todos los campos opcionales se envían como `null` si están vacíos; los numéricos se convierten con `Number(...)` y se valida con `Number.isFinite`; lat/lng pueden ser `null`; householdSize siempre ≥1; enums se envían como string y el backend los re-valida con `z.enum`).
- **No se tocaron otros archivos**: no se modificaron `src/app/page.tsx`, rutas API, ni otros componentes. No se añadieron dependencias nuevas (`Label` ya existía en `src/components/ui/label.tsx`, `IdCard` ya existía en `lucide-react`).
- **Beneficio memoria**: al eliminar `useForm`+`zodResolver`+`z` y los wrappers `Form*` (que internamente importan `zod`, `@hookform/resolvers` y ~12KB de runtime de RHF), el bundle del cliente para estos dos chunks debería reducirse significativamente, evitando el OOM-kill de Turbopack durante la compilación de la página `/`.

Stage Summary:
- **`incident-form.tsx`** y **`fichas-panel.tsx`** ahora son forms 100% controlados con `useState` + validación manual inline, sin dependencia de `react-hook-form`/`@hookform/resolvers`/`zod`.
- **Misma UX**: mismos Dialogs, mismos Selects/Inputs/Textareas/Checkboxes/Labels, mismos placeholders y textos en español, mismos toasts sonner, mismas invalidaciones de react-query.
- **Mismo contrato HTTP**: POST `/api/incidents`, POST `/api/fichas`, PATCH `/api/fichas/[id]` reciben bodies idénticos en forma a los que enviaba la versión con RHF+zod.
- **Bug fix colateral**: el icono `IdCard` para la fila RUT en el diálogo de detalle de fichas ahora SÍ se importa y renderiza (antes estaba referenciado sin import y jamás aparecía).
- **Lint**: 0 errores, 0 warnings.
- **Verificación grep**: `grep -E "react-hook-form|@hookform|zod" src/components/dashboard/fichas-panel.tsx src/components/dashboard/incident-form.tsx` → sin output.
- **Pendiente**: el orquestador debería reiniciar `bun run dev` para confirmar que Turbopack ahora compila `/` sin OOM (los cambios reducen el working set del bundler al no tener que empaquetar el runtime de zod + RHF en estos dos chunks).

---
Task ID: 4 (update)
Agent: Main Orchestrator
Task: Filtrar todo el dashboard para mostrar SOLO Viña del Mar (ninguna otra comuna)

Work Log:
- Mini-service (mini-services/alerts-service/index.ts):
  * COMMUNES reducido a ['Viña del Mar'] (antes incluía Valparaíso, Concón, Quilpué, Villa Alemana)
  * communeForCoord() ahora retorna siempre 'Viña del Mar'
  * VINA_LAT_RANGE/LNG_RANGE ajustado al rango comunal de Viña del Mar (lat -33.005 a -33.055, lng -71.575 a -71.525)
  * Descripción de guardiamarina actualizada (eliminada mención de Concón)
- Seed (prisma/seed.ts):
  * Todos los 15 INCIDENTS reubicados a comuna "Viña del Mar" con coords dentro del rango comunal
  * Todas las 12 FICHAS reubicadas a comuna "Viña del Mar" con direcciones de Viña (Recreo, Achupallas, Marga-Marga, San Martín, etc.)
  * Re-ejecutado `bun run db:seed` → BD ahora tiene 16 incidentes y 12 fichas TODOS con comuna="Viña del Mar" (verificado con groupBy)
- Frontend:
  * fichas-panel.tsx: COMMUNES reducido a ['Viña del Mar']
  * incident-form.tsx: COMMUNES reducido a ['Viña del Mar']
  * page.tsx: subtítulo cambiado de "Viña del Mar · Región de Valparaíso" a "Comuna de Viña del Mar"
  * incident-map.tsx: DEFAULT_ZOOM 12 -> 13 para enfocar la comuna de Viña del Mar

Optimizaciones de memoria (para que el bundle compile en el sandbox de 4GB):
- charts-panel.tsx: removido recharts, reemplazado por donut+bar SVG nativo (mismo look, mucha menos memoria de compilación)
- fichas-panel.tsx e incident-form.tsx: removido react-hook-form + @hookform/resolvers + zod, reemplazado por useState + validación manual simple (mismo UI/UX y API contract)
- page.tsx: IncidentMap como único dynamic import (ssr:false); resto estático. Eliminado mountStage (ya no necesario con bundle ligero)

Stage Summary:
- DATOS: Confirmado en BD — 16 incidentes y 12 fichas, 100% comuna "Viña del Mar"
- CÓDIGO: Todas las menciones de otras comunas (Valparaíso/Concón/Quilpué/Villa Alemana) eliminadas de filtros y textos
- LINT: limpio (0 errores)
- PROBLEMA DE INFRAESTRUCTURA: El sandbox (4GB RAM, cgroup) mata el proceso next-server de forma no determinística cuando recompila el bundle de Turbopack en frío. El dashboard funcionó al inicio de la sesión (caché .next preexistente), pero al modificar código y limpiar .next, la recompilación en frío consistentemente mata el proceso node (no OUM global registrado, posiblemente límite de cgroup o watchdog del sandbox). Las optimizaciones (eliminar recharts + react-hook-form) redujeron la carga pero el proceso sigue cayéndose intermitentemente. El código está correcto; el problema es de recursos del sandbox.
- SERVICIOS: Ambos procesos (next dev puerto 3000, alerts-service WebSocket puerto 3003) reiniciados y corriendo.

---
Task ID: 6
Agent: full-stack-developer (exports + bell + tides + rename)
Task: Renombrar el centro a "Comando de Emergencia Regional", consolidar notificaciones en una campana, agregar export a Excel/Word/PDF/PPTX, y arreglar la legibilidad del tab de mareas.

Work Log:
- Lectura de `worklog.md` (Tasks 0, 2-a, 3, 4, 5, 4-update) y de los archivos objetivo: `src/app/layout.tsx`, `src/app/page.tsx`, `src/hooks/use-alerts-socket.tsx`, `src/components/dashboard/charts-panel.tsx`, `public/manifest.webmanifest`, `src/lib/db.ts`, `prisma/schema.prisma`, `src/lib/types.ts`, `src/lib/severity.ts`, `src/app/api/compliance/route.ts`, `mini-services/alerts-service/index.ts`.
- Instaladas dependencias server-side: `xlsx@0.18.5`, `docx@9.13.0`, `pdfkit@0.20.2`, `pptxgenjs@4.0.1` (viven exclusivamente en las rutas `src/app/api/export/*`, no afectan el bundle del cliente).

**Task A — Renombrado del centro:**
- `src/app/layout.tsx`: metadata.title pasa a `"Comando de Emergencia Regional | VeltrixIntegra Ecosistema Digital 360"`. Description menciona Comando de Emergencia Regional, VeltrixIntegra Ecosistema Digital 360, Viña del Mar, Región de Valparaíso, gestión de emergencias. Authors actualizado. openGraph actualizado.
- `src/app/page.tsx`: header `<h1>` ahora "Comando de Emergencia Regional", subtítulo `<p>` "VeltrixIntegra · Ecosistema Digital 360 · Viña del Mar", alt del logo actualizado. Footer actualizado a "Comando de Emergencia Regional · VeltrixIntegra Ecosistema Digital 360". Versión 1.0.0 → 1.1.0.
- `public/manifest.webmanifest`: name="Comando de Emergencia Regional", short_name="Comando Regional", description actualizada.

**Task B — Campana de notificaciones:**
- `src/hooks/use-alerts-socket.tsx`: 
  * Store zustand agrega `unreadCount` y `markAllRead`. `prependAlert` incrementa `unreadCount` en cada alerta nueva. `reset` limpia todo.
  * Eliminado el `toast.error` (críticas) y `toast.warning` (alertas) que ocupaban espacio en pantalla. Eliminados imports `toast`, `Siren`, `JSX`.
  * Se conserva la notificación nativa vía Service Worker (postMessage) para alertas críticas — esa notificación funciona aunque la pestaña esté en background.
  * Nuevos hooks: `useRecentNotifications(limit=30)` (slice de las últimas 30 alertas), `useUnreadCount()` (contador), `useMarkAllRead()` (acción para resetear).
- `src/app/page.tsx`: nuevo componente `NotificationsBell`:
  * Botón ghost con icono `Bell` (lucide) y badge destructivo con el contador no-leídas (1-99+).
  * `Popover` de 360px de ancho, max-h-[24rem] scrollable vía `ScrollArea`.
  * Header del popover con icono Bell, "Notificaciones", badge de nuevas y botón "Marcar todas leídas".
  * Cada item: dot de color por severidad, badge de fuente con color de `sourceColor`, time-ago con `formatDistanceToNow` (date-fns locale es), título (line-clamp-2), comuna truncada.
  * `useEffect` marca todo como leído al abrir el popover (`if (open) markAllRead()`).
  * Sustituye al `criticalCount` Badge anterior del header (eliminado).
- `ConnectionBadge` se conserva intacto.

**Task C — Export a Excel/Word/PDF/PPTX:**
- `src/app/api/export/_lib.ts` (privado, no se trata como ruta): 
  * `loadExportData()` — Promise.all sobre Prisma: `db.source.findMany`, `db.alert.findMany({include:{source:true}, take:200, orderBy:issuedAt desc})`, `db.incident.findMany`, `db.fichaFIBER.findMany`. Construye `ApiStats` con agregaciones `by{Source,Severity,Category,State}`, `by{Type,Nature,State}`, `by{RiskLevel,Status,Commune}`, `active`. Incluye `COMPLIANCE_PAYLOAD` inline (espejo de `/api/compliance`).
  * Helpers de etiqueta: `sourceLabel`, `severityLabel`, `incidentTypeLabel`, `incidentStateLabel`, `riskLevelLabel`, `fichaStatusLabel`, `categoryLabel`, `formatDate`, `formatLongDate`, `formatRutForReport` (XX.XXX.XXX-X).
  * `buildResumenEjecutivo(data)` — 3 párrafos en español humanizado con la situación actual (incidentes activos, personas afectadas/evacuadas, fichas críticas, cumplimiento normativo).
  * `buildRecomendaciones(data)` — 5 recomendaciones en lenguaje plano según el estado actual.
- `src/app/api/export/excel/route.ts` (GET): 5 hojas — Alertas (9 cols), Incidentes (11 cols), Fichas FIBER (10 cols), Resumen (indicadores + por fuente + por severidad + por riesgo + fecha), Cumplimiento Legal (categoría/nombre/descripción/enlace). Auto-width, freeze primera fila, header bold con fill `#3A78B8`. `XLSX.write(wb, {type:'buffer', bookType:'xlsx', cellStyles:true})`. Content-Type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Filename `informe-emergencias-vina-del-mar-YYYY-MM-DD.xlsx`. Verificado: 200, 44 KB, "Microsoft Excel 2007+".
- `src/app/api/export/word/route.ts` (POST): Documento con cover page (título 48px brand color, subtítulo, "Documento confidencial — Ley 19.628"), tabla de contenidos, 6 secciones: (1) Resumen Ejecutivo, (2) Alertas Activas (tabla 5 cols), (3) Incidentes Registrados (tabla 6 cols con descripción humanizada), (4) Personas en Riesgo (tabla con código/nombre/RUT/riesgo/necesidades/estado + footnote sobre Ley 19.628), (5) Cumplimiento Legal (subheadings SENAPRED/Ley 19.628/Ley 21.519/ISO 27001/otros marcos con bullets), (6) Recomendaciones (bullets). Header con "Informe de Emergencias — Viña del Mar" + fecha. Footer en cada página con "Comando de Emergencia Regional · VeltrixIntegra Ecosistema Digital 360 · Confidencial · Página N". `Packer.toBuffer(doc)`. Content-Type `application/vnd.openxmlformats-officedocument.wordprocessingml.document`. Verificado: 200, 17.5 KB, "Microsoft Word 2007+".
- `src/app/api/export/pdf/route.ts` (POST): PDF con cover page (bandas de brand color, título 34px, subtítulo 22px, fecha y aviso de confidencialidad), body con 6 secciones idénticas al Word, headings en color brand, párrafos justificados, tablas con header fill brand y body alternando fill blanco/gris claro, paginación en footer. Usa `pdfkit` con `LETTER` size y margins 60/50. `doc.bufferedPageRange()` para pintar footers en todas las páginas al final. Verificado: 200, 13.2 KB, "PDF document, version 1.3, 7 page(s)".
- `src/app/api/export/pptx/route.ts` (POST): 10 slides 16:9 (13.333" × 7.5") con paleta Viña (primary `#3A78B8`, accent `#D4A943`):
  1. Title (banda azul, "Comando de Emergencia Regional" 40px, "Viña del Mar · VeltrixIntegra Ecosistema Digital 360" en accent, fecha, aviso confidencial)
  2. Situación Actual — 3 big-number cards (alertas activas, incidentes en curso, personas en riesgo)
  3. Alertas por Fuente — barras horizontales con sourceLabel + número
  4. Mapa de Incidentes — tabla (Tipo/Severidad/Ubicación/Afectados/Evacuados)
  5. Personas en Riesgo — barras horizontales por nivel de riesgo (crítico/alto/medio/bajo) con descripción de cada nivel
  6. Mareas (SHOA) — 3 cards (baja/media/alta) con resaltado del nivel actual
  7. Cumplimiento Legal — 3 cards (SENAPRED, Ley 19.628, Ley 21.519) con explicación de una línea
  8. Recomendaciones — 5 bullets numerados
  9. Contactos y Canales Oficiales — tabla con 6 fuentes y qué reporta cada una
  10. Cierre "Gracias" en fondo brand color con accent.
  Header de marca en cada slide (excepto portada/cierre) y footer con paginación. Bug encontrado: pptxgenjs `addTable` requiere `TableRow[]` donde cada row ES un array de cells (no objeto con `.cells`). Fix aplicado. Verificado: 200, 268 KB, "Zip archive (.pptx)".
- Frontend `ExportMenu` en `src/app/page.tsx`: `DropdownMenu` con `Download` icon, items "Excel/Word/PowerPoint/PDF". Excel abre `window.open('/api/export/excel')`. Word/PDF/PPTX usan `fetch` POST → blob → `URL.createObjectURL` → click en `<a download>`. Loading state con `Loader2` spin y toast "Generando documento…" / "Generado" / "No se pudo generar". Posicionado junto al botón "Nueva Catástrofe".

**Task D — Tab Mareas:**
- `src/components/dashboard/charts-panel.tsx`: 
  * `useAlertsSocket` ahora también consume `alerts`.
  * `mareaAlerts` = alerts filtradas por `sourceCode==='shoa' && category==='marea'`. `currentMarea` = la más reciente. `recentMareas` = últimas 5.
  * `TIDE_SEGMENTS` con 3 niveles: baja (azul marino `oklch(0.55 0.16 240)` + icono `TrendingDown`), media (teal mar `oklch(0.62 0.10 200)` + `Minus`), alta (naranja-rojo `oklch(0.62 0.18 35)` + `Droplets`). Cada segmento incluye `label` (Marea Baja (Bajamar)), `short` (Baja), `description` (en lenguaje simple) y `icon`.
  * Tercer `TabsTrigger` "Mareas" con icono `Waves`.
  * `TabsContent` "Mareas":
    1. Header "Estado de mareas · SHOA · N alerta(s) reciente(s)"
    2. Gauge horizontal: 3 segmentos flex 1 con el actual en su color y los demás en `--muted` con opacidad 0.45. Icono + label short en cada segmento. `role="meter"` + `aria-valuenow={0|1|2}`.
    3. Descripción del nivel actual en un card muted.
    4. **Leyenda DEBAJO del gauge** (no a un lado) — `ul` vertical con cada nivel en su color, label completo en `text-sm` (≥ 14px), badge "ACTUAL" en el nivel activo. Texto legible (>= 12px).
    5. Últimas 5 lecturas: lista compacta con dot de color + label + time-ago.
- Import `Waves, Droplets, TrendingDown, Minus` desde lucide-react. Import `formatDistanceToNow` y locale `es` de date-fns. Eliminado import de `BroadcastAlert` (no se usa directamente).

**Lint & Verificación:**
- `bun run lint` pasa limpio (0 errores, 0 warnings) tras corregir: el unused eslint-disable directive en NotificationsBell, el import no usado `BroadcastAlert` en charts-panel, y los `cells: [{...}]` en pptx que debían ser arrays directos.
- Las 4 rutas de export verificadas en vivo (dev server):
  * `GET  /api/export/excel` → 200, 44 KB, `Microsoft Excel 2007+`
  * `POST /api/export/word`  → 200, 17.5 KB, `Microsoft Word 2007+`
  * `POST /api/export/pdf`   → 200, 13.2 KB, `PDF document, version 1.3, 7 page(s)`
  * `POST /api/export/pptx`  → 200, 268 KB, `Zip archive (.pptx)`
- `GET /` → 200 con contenido verificado: "Comando de Emergencia Regional" (4), "VeltrixIntegra · Ecosistema Digital 360" (1), "Exportar" (1), "Notificaciones" (1), "Mareas" (1).
- Todas las compilaciones en dev.log salen sin errores: `GET / 200`, `POST /api/export/{word,pdf,pptx} 200`, `GET /api/export/excel 200`.

Stage Summary:
- **Rename completo** del centro a "Comando de Emergencia Regional · VeltrixIntegra Ecosistema Digital 360" en metadata (layout), header `<h1>`, subtítulo, footer, manifest, alt del logo.
- **Notificaciones consolidadas** en una campana (Bell icon) en el header. El contador de no-leídas incrementa con cada alerta broadcast y se resetea al abrir el popover. El popover muestra las últimas 30 alertas con dot de severidad, badge de fuente con color, time-ago, título y comuna. Eliminados los `toast.error`/`toast.warning` para alertas críticas/warning — el feedback visual ahora vive en la campana. El Service Worker sigue disparando notificaciones nativas cuando la pestaña está en background. `ConnectionBadge` se conserva.
- **4 export routes** funcionales (`/api/export/{excel,word,pdf,pptx}`). Las 4 generan archivos válidos (verificado con `file(1)`). El contenido está escrito en español chileno humanizado, accesible a un lector no técnico (alcalde, secretario municipal, líder comunitario). Los RUT se muestran en formato XX.XXX.XXX-X con footnote sobre Ley 19.628. La portada de Word/PDF lleva el aviso "Documento confidencial — Ley 19.628". El PPTX usa la paleta Viña (azul petróleo + arena dorada) en 16:9. Las 4 librerías (`xlsx`, `docx`, `pdfkit`, `pptxgenjs`) viven exclusivamente en `src/app/api/export/*` — el bundle del cliente NO las importa y no aumentó su peso.
- **Tab "Mareas"** agregado al `ChartsPanel` (al lado de Fuentes y Tipos). Muestra el nivel actual de marea con un gauge horizontal de 3 segmentos (Baja/Media/Alta) que resalta el nivel actual, una descripción del nivel en lenguaje simple, una leyenda claramente legible DEBAJO del gauge con chips de color (texto >= 12px, label "Marea Baja (Bajamar)" / "Marea Media" / "Marea Alta (Pleamar)"), y una lista de las últimas 5 lecturas de SHOA con timestamp.
- **Lint**: 0 errores, 0 warnings.
- **No se modificó**: `prisma/schema.prisma`, `src/lib/db.ts`, `mini-services/alerts-service`, rutas API existentes (`/api/alerts`, `/api/incidents`, etc.).
- **No se reintrodujeron** recharts, react-hook-form ni zod en el bundle cliente. Las dependencias nuevas (`xlsx`, `docx`, `pdfkit`, `pptxgenjs`) son server-only.
- **Issue conocido**: el sandbox (4 GB cgroup) mata el proceso next-server de forma no determinística durante la compilación en frío de las rutas de export (sobretodo pptx y pdfkit que son más pesadas). Solución: cada ruta compila en ~700 ms una vez que el cache está caliente; las 4 se ejecutan en secuencia sin problema. Si el dev server muere, reiniciarlo — las 4 rutas ya están probadas y funcionales.

