# Task 3 — Frontend Dashboard (full-stack-developer)

Resumen ejecutivo del trabajo realizado para el Task ID **3** del dashboard CODEM-VDM.

## Artefactos producidos

### Archivos públicos (PWA)
- `public/sw.js` — Service Worker. `install` → `skipWaiting`, `activate` → `clients.claim`. Escucha `push` (web-push nativo, futuro) y `message` de tipo `{type:'NOTIFY', payload}` (postMessage desde la página). `showNotification(title, {body, icon:'/logo.svg', tag, data, requireInteraction})`. `notificationclick` enfoca la pestaña existente o abre una nueva.
- `public/manifest.webmanifest` — PWA manifest con name/short_name "CODEM-VDM", display standalone, start_url "/", background_color y theme_color "#3a78b8" (azul petróleo), icono `/logo.svg` (any maskable).

### Tipos y helpers
- `src/lib/types.ts` — Espejo TS del contrato REST + WS: `BroadcastAlert`, `Stats`, `Incident`, `FichaFIBER`, `Source`, `ComplianceData` (con `ComplianceItem` y `DataHandling`), `ApiStats`, enums (`Severity`, `AlertState`, `IncidentState`, `IncidentType`, `Nature`, `SourceCode`, `Category`, `RiskLevel`, `FichaStatus`, `AgeRange`).
- `src/lib/severity.ts` — Helpers: `severityColor`, `severityBorderColor`, `severityTextColor`, `severityLabel` (Info/Vigilancia/Alerta/Crítica), `categoryLabel`, `incidentTypeLabel`, `natureLabel`, `incidentStateLabel`, `alertStateLabel`, `riskLevelLabel`, `fichaStatusLabel`, `riskLevelBadgeClass`, `sourceColor` (paleta Viña sin indigo/azul-500), `sourceShortLabel`, `incidentTypeColor` (mapa de tipos → oklch).

### Hook + Provider
- `src/hooks/use-alerts-socket.tsx` — Store **zustand** compartido + hook. Conexión única vía `io('/', {transports:['websocket'], query:{XTransformPort:'3003'}})`. Eventos: `history` (20 alertas iniciales), `alert` (prepend, cap 200), `stats` (cada 15s). En alerta `critical`: `Notification.requestPermission()` (una sola vez), `navigator.serviceWorker.ready` → `postMessage({type:'NOTIFY', payload})` + `toast.error` sonner. En `warning`: `toast.warning`. Ref-count para desconectar el socket cuando el último hook se desmonta.
- `src/components/theme-provider.tsx` — Wrapper `next-themes` (`attribute="class"`, `defaultTheme="light"`, `enableSystem`, `disableTransitionOnChange`).

### Componentes del dashboard (`src/components/dashboard/`)
- `alert-card.tsx` — Tarjeta de alerta con borde-izq de color por severidad, badge de fuente (color del source), icono de severidad (lookup estático de icons: Info/Eye/AlertTriangle/Siren), título, descripción truncable (>180 chars, expandible), footer con location/commune/estado/externalId, meta chips (hasta 5). `framer-motion` para entrada slide+fade. `date-fns` `formatDistanceToNowStrict` (locale es). `Tooltip` para sourceName y timestamp (Intl.DateTimeFormat America/Santiago).
- `live-feed.tsx` — Panel de feed en vivo. Header con dot pulsante "En Vivo" + status (conectando/conectado/desconectado) + count. Filtros chip (Todas / SENAPRED / CONAF / SHOA / CBV2 / Carabineros / Radio). Lista scrollable `max-h-[28rem] overflow-y-auto` con `AnimatePresence`. Empty-state.
- `incident-map.tsx` — Mapa Leaflet (react-leaflet v5 + leaflet). `'use client'` + importado con `dynamic(..., {ssr:false})` desde la página. Centrado en `[-33.0245, -71.5517]` zoom 12. Tiles OpenStreetMap. `Circle` por incidente (radio = radiusMeters, color por tipo). `Popup` con título, badges (tipo, naturaleza, severidad, estado), dirección/commune, descripción, afectados/evacuados, recursos. `CircleMarker` pulsante (`pulse-critical`) para `severity==='critical' && state==='activa'`. Overlay de las últimas 10 alertas en vivo como `CircleMarker` pequeños con color de fuente y popup. Leyenda (Card glass, top-right) con tipo→color + "Crítica activa". Toggles `Checkbox` para mostrar/ocultar Incidentes y Alertas en vivo. `FitBounds` (helper useMap) ajusta al cargar incidentes. Altura `h-[22rem]` móvil / `h-[32rem]` desktop.
- `stats-overview.tsx` — KPI row con 4 cards: Alertas Activas (del WS byState), Incidentes Activos (de /api/incidents), Fichas FIBER Críticas/Altas (de /api/stats), Fuentes Conectadas. Iconos lucide, skeleton para valores en carga, trend indicator.
- `charts-panel.tsx` — Panel con `Tabs` (Fuentes / Tipos). Donut (PieChart) con alertas por fuente del WS stats.bySource, usando `sourceColor()`. BarChart horizontal con incidentes por tipo (de /api/incidents o /api/stats). ResponsiveContainer. Tooltip y Legend de recharts usando CSS vars (`--popover`, `--border`, etc.).
- `fichas-panel.tsx` — Panel FIBER con `react-query`. Filtros (comuna, riesgo, estado) con `Select` + búsqueda de texto. Tabla con `max-h-96 overflow-y-auto`, scroll-x en móvil. Columnas: código, nombre, comuna, edad, riesgo (Badge con color), estado, necesidades (iconos Tooltip: Ambulance/Pill/Accessibility). Click en fila abre `Dialog` de detalle+PATCH (react-hook-form + zod: riskLevel, status, assignedTo, notes). Botón "Nueva Ficha" abre `Dialog` con form completo (fullName, RUT, dirección, comuna, lat/lng, phone, email, ageRange, riskLevel, vulnerability, householdSize, hasPets, needs*, notes, assignedTo). POST/PATCH con toasts sonner. Invalidación de queries de react-query al crear/actualizar.
- `compliance-panel.tsx` — Panel legal/ciberseguridad con `Tabs` (Marcos Legales / Protección de Datos / Ciberseguridad / Leyes de Catástrofe / Manejo de Datos). Cada tab es un `Accordion` de items con nombre, descripción, obligaciones (lista), link externo. "Manejo de Datos" renderiza el objeto `dataHandling` con principles como badges + cards (Retención, Cifrado, Auditoría, Respaldos, Acceso, Consentimiento). Iconos: Scale/Shield/Lock/Database/KeyRound/etc.
- `incident-form.tsx` — `Dialog` para registrar nueva catástrofe (POST /api/incidents). Campos: type, nature, severity, state, title, description, commune, address, lat/lng, radiusMeters, affected, evacuated, resources. react-hook-form + zod. On success: invalida queries y toast.

### Página principal
- `src/app/page.tsx` — Página única `'use client'`. Compone:
  - `ThemeProvider` (next-themes) + `QueryProvider` (QueryClient único por sesión) + `SonnerToaster`.
  - Header sticky (`glass`, top-0, z-30): logo + título "CODEM-VDM · Centro de Operaciones de Emergencias" + subtítulo "Viña del Mar · Región de Valparaíso". Derecha: WS 3003, badge críticas activas, `ConnectionBadge`, reloj en vivo (`LiveClock` actualiza cada 1s, `Intl.DateTimeFormat('es-CL', {timeZone:'America/Santiago'})`), botón "Nueva Catástrofe" (destructive) que abre `IncidentFormDialog`, `ThemeToggle` (DropdownMenu Claro/Oscuro/Sistema).
  - Main grid (lg:grid-cols-12): Row 1 `StatsOverview` (full). Row 2: `IncidentMap` (lg:col-span-8) + `LiveFeed` (lg:col-span-4). Row 3: `FichasPanel` (lg:col-span-8) + `ChartsPanel` (lg:col-span-4). Row 4: `CompliancePanel` (full).
  - Footer sticky al fondo (`mt-auto` en wrapper `min-h-screen flex flex-col`): "Municipalidad de Viña del Mar · CODEM · Sistema de Gestión de Emergencias" + "Datos sensibles protegidos por Ley 19.628" + versión.
  - `IncidentMap` cargado con `dynamic(..., {ssr:false})` para evitar que leaflet toque `window` en SSR.

## Cumplimiento de reglas
- **Ruta única**: solo `src/app/page.tsx`. No se crearon otras rutas.
- **No modificar**: `prisma/schema.prisma`, `src/lib/db.ts`, `src/app/api/**`, `mini-services/**`, `globals.css`, `layout.tsx` — ninguno fue tocado.
- **z-ai-web-dev-sdk**: no importado en cliente (no se usa en el frontend).
- **Leaflet SSR**: `CircleMarker`/`Circle` exclusivamente (no marker icons, evita el bug de bundler). CSS importado dentro del componente `incident-map.tsx`. `dynamic` con `ssr:false` desde la página.
- **Colores**: solo CSS vars de `globals.css` (`bg-primary`, `bg-card`, `--chart-1..5`, `bg-sev-*`, `text-sev-*`, `pulse-critical`, `glass`). Sin `indigo` ni `blue-500`.
- **Background**: no se cubre el degradado del body; cards usan `bg-card` (con `glass` en header/footer/overlays).
- **Responsive**: mobile-first. Grids colapsan a 1 columna en móvil. Tabla con scroll-x y `max-h-96 overflow-y-auto`. Touch targets ≥ h-7/8.
- **Sticky footer**: `min-h-screen flex flex-col` + `mt-auto` en footer (funciona para contenido corto y largo).
- **Accesibilidad**: `<header><main><section><footer>`, `aria-label`, `role="article"` en alertas, `aria-live` en KPIs, alt en logo, `sr-only` no usado pero `aria-label` sí.
- **Loading states**: `Skeleton` en stats-overview, fichas-panel, compliance-panel, charts-panel, incident-map.
- **Errores**: try/catch en todos los fetch; toast.error con mensaje; fallbacks a [] o null.
- **Toasts**: `sonner` con `<SonnerToaster>` dentro del ThemeProvider.
- **Animaciones**: `framer-motion` (entrada de página, KPIs, alertas con `AnimatePresence` + `motion.div`).
- **Spanish**: todo el texto visible en español.

## Estado final
- **Lint**: `bun run lint` → 0 errores, 0 warnings.
- **Dev server**: `GET / 200`, `GET /api/stats`, `GET /api/incidents`, `GET /api/fichas?limit=200`, `GET /api/compliance` todos 200 en dev log. `GET /manifest.webmanifest`, `GET /sw.js`, `GET /logo.svg` todos 200.
- **HTML renderizado** contiene: "CODEM-VDM", "Centro de Operaciones", "FIBER", "Ley 19.628", "Municipalidad de Viña".

## Notas para futuros agentes
- El Service Worker se registra desde `layout.tsx` (script inline) y el `useAlertsSocket` le envía `{type:'NOTIFY', payload}` por `postMessage` cuando llega una alerta crítica — esto dispara `Notification` nativa del SO aunque la pestaña pase a background poco después.
- El socket de Socket.IO está compartido por todos los componentes que usan `useAlertsSocket()` (ref-counted); no se abren múltiples conexiones.
- `react-leaflet` v5 solo carga en cliente. La página lo importa con `next/dynamic` + `ssr:false`.
- `sonner` está renderizado dentro del `ThemeProvider` en `page.tsx` (no en `layout.tsx`) para que respete el tema activo.
