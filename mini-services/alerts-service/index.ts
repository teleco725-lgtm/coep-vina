/**
 * ============================================================================
 * Mini-service: WebSocket real-time emergency alerts for Viña del Mar, Chile
 * ============================================================================
 *
 * Broadcasts simulated emergency alerts from:
 *   - SENAPRED   (Servicio Nacional de Prevención y Respuesta ante Desastres)
 *   - CONAF/COGRIG (Corporación Nacional Forestal)
 *   - SHOA       (Servicio Hidrográfico y Oceanográfico de la Armada)
 *   - Guardia Marina
 *   - CBV2       (Cuerpo de Bomberos de Viña del Mar 2da Compañía)
 *   - Carabineros de Chile
 *   - Radio      (comunicaciones de emergencia / radioperiodismo)
 *
 * Server: socket.io on port 3003, path: '/' (REQUIRED for Caddy forwarding).
 * Run with `bun --hot index.ts` for hot reload during development.
 * ============================================================================
 */

import { createServer } from 'http'
import { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'

// ============================================================================
// Public types
// ============================================================================
export interface BroadcastAlert {
  id: string                  // unique id (uuid)
  externalId?: string | null  // official id if any
  sourceCode: string          // 'senapred' | 'conaf' | 'shoa' | 'guardiamarina' | 'cbv2' | 'carabineros' | 'radio'
  sourceName: string          // human name in Spanish
  category: string            // 'sismo' | 'incendio' | 'marea' | 'meteorologica' | 'tsunami' | 'quimico' | 'inundacion' | 'seguridad' | 'transito' | 'radio'
  subcategory?: string | null // e.g. marea: 'alta' | 'media' | 'baja'
  severity: 'info' | 'watch' | 'warning' | 'critical'
  state: 'activa' | 'en_proceso' | 'cerrada'
  title: string
  description: string
  location?: string | null
  lat: number                 // Viña del Mar area: ~ -33.02 to -33.06, lng ~ -71.50 to -71.62
  lng: number
  region: 'Valparaíso'
  commune?: string | null     // 'Viña del Mar' | 'Valparaíso' | 'Concón' | 'Quilpué' | 'Villa Alemana'
  meta?: Record<string, unknown> | null
  issuedAt: string            // ISO 8601
}

export interface Stats {
  total: number
  bySource: Record<string, number>
  bySeverity: Record<string, number>
  byCategory: Record<string, number>
  byState: Record<string, number>
  connectedClients: number
  generatedAt: string
}

type Severity = BroadcastAlert['severity']
type State = BroadcastAlert['state']
type SourceCode = 'senapred' | 'conaf' | 'shoa' | 'guardiamarina' | 'cbv2' | 'carabineros' | 'radio'

// ============================================================================
// Constants - Viña del Mar geography & sources
// ============================================================================
const PORT = 3003

// Viña del Mar (comuna) center ~ -33.0245, -71.5517
// Se restringe a la comuna de Viña del Mar ÚNICAMENTE (sin Valparaíso/Concón/etc.)
const VINA_CENTER = { lat: -33.0245, lng: -71.5517 }
const VINA_LAT_RANGE = { min: -33.055, max: -33.005 }
const VINA_LNG_RANGE = { min: -71.575, max: -71.525 }

const COMMUNES = ['Viña del Mar'] as const

const SOURCE_NAMES: Record<SourceCode, string> = {
  senapred: 'SENAPRED - Servicio Nacional de Prevención y Respuesta ante Desastres',
  conaf: 'CONAF / COGRIG - Corporación Nacional Forestal',
  shoa: 'SHOA - Servicio Hidrográfico y Oceanográfico de la Armada',
  guardiamarina: 'Guardia Marina de Chile',
  cbv2: 'Cuerpo de Bomberos de Viña del Mar 2da Compañía',
  carabineros: 'Carabineros de Chile',
  radio: 'Red de Radio de Emergencias',
}

// ============================================================================
// Helpers
// ============================================================================
function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}
function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1))
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
/**
 * Pick a variant from the array filtered by critical-ness.
 * `criticalOnly=true` returns only critical variants; `false` returns only
 * non-critical ones. This is what keeps critical alerts globally sparse (~5%):
 * the regular stream NEVER produces a critical variant; only the dedicated
 * 5% path does.
 */
function pickVariant<T extends { severity: Severity }>(variants: T[], criticalOnly: boolean): T {
  const filtered = variants.filter((v) => (v.severity === 'critical') === criticalOnly)
  if (filtered.length === 0) {
    // Fallback for sources without criticals (shouldn't normally happen).
    return pick(variants)
  }
  return pick(filtered)
}
function round(v: number, d = 4): number {
  const p = Math.pow(10, d)
  return Math.round(v * p) / p
}
function randCoord(): { lat: number; lng: number } {
  return {
    lat: round(rand(VINA_LAT_RANGE.min, VINA_LAT_RANGE.max), 4),
    lng: round(rand(VINA_LNG_RANGE.min, VINA_LNG_RANGE.max), 4),
  }
}
function communeForCoord(): string {
  // Solo comuna de Viña del Mar (sin Valparaíso/Concón/Quilpué/Villa Alemana)
  return 'Viña del Mar'
}
function makeExternalId(prefix: string): string {
  const year = new Date().getFullYear()
  return `${prefix}-${year}-${randInt(1000, 9999)}`
}

// ============================================================================
// History buffer (in-memory)
// ============================================================================
const HISTORY_MAX = 200
const history: BroadcastAlert[] = []

function pushAlert(alert: BroadcastAlert): void {
  history.unshift(alert)
  if (history.length > HISTORY_MAX) history.pop()
}
function getRecentAlerts(n: number): BroadcastAlert[] {
  return history.slice(0, n)
}

// ============================================================================
// Source-specific alert generators
// ============================================================================
function genSenapred(criticalOnly: boolean = false): BroadcastAlert {
  const coord = randCoord()
  const commune = communeForCoord()
  type Variant = {
    category: string
    subcategory?: string | null
    title: string
    description: string
    severity: Severity
    state?: State
    meta?: Record<string, unknown> | null
  }
  const variants: Variant[] = [
    {
      category: 'sismo',
      title: 'Alerta Temprana Preventiva por Sismo',
      description:
        'SENAPRED emite Alerta Temprana Preventiva ante evento sísmico de magnitud moderada percibido en la Región de Valparaíso. Se recomienda mantener calma y seguir canales oficiales.',
      severity: 'watch',
      state: 'activa',
      meta: { magnitud: rand(4.0, 5.5).toFixed(1), profundidad_km: randInt(20, 80) },
    },
    {
      category: 'tsunami',
      title: 'Alerta Amarilla - Posible Tsunami',
      description:
        'SENAPRED emite Alerta Amarilla por posible tsunami producto de sismo de magnitud relevante en zona de subducción. SHOA evalúa niveles de marea. Población costera debe alejarse del litoral.',
      severity: 'warning',
      state: 'activa',
      meta: { evaluacion_shoa: 'en_curso' },
    },
    {
      category: 'inundacion',
      title: 'Alerta Roja - Inundación súbita',
      description:
        'SENAPRED emite Alerta Roja por inundación súbita en quebradas de Viña del Mar ante sistema frontal activo. Se activa evacuación preventiva en sectores vulnerables.',
      severity: 'critical',
      state: 'activa',
      meta: { quebradas_afectadas: ['Aguas Negras', 'San Félix', 'Reñaca'] },
    },
    {
      category: 'meteorologica',
      title: 'Alerta Amarilla - Sistema frontal activo',
      description:
        'SENAPRED emite Alerta Amarilla por sistema frontal con precipitaciones intensas y vientos fuertes en la Región de Valparaíso. Vigencia: 12 horas.',
      severity: 'warning',
      state: 'activa',
      meta: { precipitacion_esperada_mm: randInt(30, 80), vientos_kmh: randInt(40, 80) },
    },
    {
      category: 'inundacion',
      subcategory: 'aluvion',
      title: 'Alerta Temprana Preventiva - Riesgo de aluvión',
      description:
        'SENAPRED emite Alerta Temprana Preventiva ante riesgo de aluvión en quebradas de la cordillera de la costa, Región de Valparaíso.',
      severity: 'watch',
      state: 'activa',
      meta: null,
    },
    {
      category: 'quimico',
      title: 'Alerta Roja - Emergencia química',
      description:
        'SENAPRED emite Alerta Roja por emergencia química en zona industrial. Se activa protocolo de evacuación y confinamiento perimetral.',
      severity: 'critical',
      state: 'activa',
      meta: { sustancia: 'amoniaco', area_perimetro_m: randInt(200, 800) },
    },
    {
      category: 'sismo',
      title: 'Cierre de Alerta Temprana Preventiva',
      description:
        'SENAPRED cierra Alerta Temprana Preventiva por sismo al confirmarse descartada afectación mayor. Operaciones retoman normalidad.',
      severity: 'info',
      state: 'cerrada',
      meta: null,
    },
  ]
  const v = pickVariant(variants, criticalOnly)
  return {
    id: uuidv4(),
    externalId: makeExternalId('SENAPRED'),
    sourceCode: 'senapred',
    sourceName: SOURCE_NAMES.senapred,
    category: v.category,
    subcategory: v.subcategory ?? null,
    severity: v.severity,
    state: v.state ?? 'activa',
    title: v.title,
    description: v.description,
    location: `Comuna de ${commune}, Región de Valparaíso`,
    lat: coord.lat,
    lng: coord.lng,
    region: 'Valparaíso',
    commune,
    meta: v.meta ?? null,
    issuedAt: new Date().toISOString(),
  }
}

function genConaf(criticalOnly: boolean = false): BroadcastAlert {
  const coord = randCoord()
  const commune = communeForCoord()
  type Variant = {
    title: string
    description: string
    severity: Severity
    state: State
    meta?: Record<string, unknown> | null
  }
  const variants: Variant[] = [
    {
      title: 'Alerta de Incendio Forestal - COGRIG detecta focos de calor',
      description:
        'COGRIG detecta focos de calor en zona boscosa. CONAF coordina brigadas de combate y evaluación aérea del sector.',
      severity: 'watch',
      state: 'en_proceso',
      meta: { cogrig_deteccion: true, indice_alerta: 0 },
    },
    {
      title: 'Alerta Amarilla - Incendio Forestal en progreso',
      description:
        'CONAF confirma incendio forestal activo. Brigadas desplegadas, se evalúa comportamiento del fuego y condiciones meteorológicas adversas.',
      severity: 'warning',
      state: 'en_proceso',
      meta: { cogrig_deteccion: true, indice_alerta: 1 },
    },
    {
      title: 'Alerta Roja - Incendio Forestal descontrolado',
      description:
        'CONAF declara Alerta Roja por incendio forestal descontrolado con amenaza a viviendas. Se activa apoyo de helicóptero MAULEN y aeronaves.',
      severity: 'critical',
      state: 'activa',
      meta: { cogrig_deteccion: true, indice_alerta: 2 },
    },
  ]
  const v = pickVariant(variants, criticalOnly)
  return {
    id: uuidv4(),
    externalId: makeExternalId('CONAF'),
    sourceCode: 'conaf',
    sourceName: SOURCE_NAMES.conaf,
    category: 'incendio',
    subcategory: null,
    severity: v.severity,
    state: v.state,
    title: v.title,
    description: v.description,
    location: `Sector forestal, ${commune}`,
    lat: coord.lat,
    lng: coord.lng,
    region: 'Valparaíso',
    commune,
    meta: {
      hectareas_afectadas: randInt(1, 80),
      brigadas_desplegadas: randInt(2, 8),
      ...(v.meta ?? {}),
    },
    issuedAt: new Date().toISOString(),
  }
}

// Tide cycle simulator (SHOA)
// Cycle: alta -> media (descendente) -> baja -> media (ascendente) -> alta ...
// Realistic Chilean Pacific coast tides are semi-diurnal (~12h25m); we accelerate
// the cadence for the simulation so the dashboard can visualise the cycle.
const TIDE_CYCLE: Array<'alta' | 'media' | 'baja'> = ['alta', 'media', 'baja', 'media']
let tideIndex = 0

function genShoaMarea(): BroadcastAlert {
  const phase = TIDE_CYCLE[tideIndex % TIDE_CYCLE.length]
  tideIndex = (tideIndex + 1) % TIDE_CYCLE.length

  // Coastal coords near Viña del Mar / Valparaíso shoreline
  const coord = {
    lat: round(rand(-33.03, -33.02), 4),
    lng: round(rand(-71.58, -71.54), 4),
  }
  const titles: Record<string, string> = {
    alta: 'Marea Alta (Pleamar)',
    media: 'Marea Media',
    baja: 'Marea Baja (Bajamar)',
  }
  const descs: Record<string, string> = {
    alta:
      'SHOA reporta pleamar en el litoral de Viña del Mar. Nivel del mar alcanza máximo predictivo. Restringir faenas portuarias menores en zonas sensibles.',
    media:
      'SHOA reporta marea media. Transición estable entre pleamar y bajamar. Condiciones normales de navegación.',
    baja:
      'SHOA reporta bajamar en el litoral de Viña del Mar. Nivel del mar alcanza mínimo predictivo. Considerar calado para embarcaciones menores.',
  }
  const heights: Record<string, number> = {
    alta: rand(1.5, 2.0),
    media: rand(0.7, 1.2),
    baja: rand(0.2, 0.6),
  }
  return {
    id: uuidv4(),
    externalId: makeExternalId('SHOA-MAREA'),
    sourceCode: 'shoa',
    sourceName: SOURCE_NAMES.shoa,
    category: 'marea',
    subcategory: phase,
    severity: 'info',
    state: 'activa',
    title: titles[phase],
    description: descs[phase],
    location: 'Litoral de Viña del Mar',
    lat: coord.lat,
    lng: coord.lng,
    region: 'Valparaíso',
    commune: 'Viña del Mar',
    meta: {
      altura_m: heights[phase].toFixed(2),
      fase: phase,
      ciclo: 'semidiurno',
      hora_referencia_utc: new Date().toISOString(),
    },
    issuedAt: new Date().toISOString(),
  }
}

function genShoaMet(): BroadcastAlert {
  const coord = randCoord()
  type Variant = {
    title: string
    description: string
    severity: Severity
    meta?: Record<string, unknown> | null
  }
  const variants: Variant[] = [
    {
      title: 'Boletín Meteorológico Marítimo',
      description:
        'SHOA emite boletín meteorológico marítimo. Viento del suroeste 20-30 nudos, mar de fondo 2.5 m. Condiciones adversas para embarcaciones menores.',
      severity: 'watch',
      meta: { viento_nudos: randInt(20, 35), mar_fondo_m: rand(2, 3.5).toFixed(1) },
    },
    {
      title: 'Aviso de Mal Tiempo Costero',
      description:
        'SHOA emite aviso de mal tiempo para zona costera de Valparaíso. Mar de leva esperada en las próximas 12 horas.',
      severity: 'warning',
      meta: { mar_leva_m: rand(2.5, 4.0).toFixed(1) },
    },
  ]
  const v = pick(variants)
  return {
    id: uuidv4(),
    externalId: makeExternalId('SHOA-MET'),
    sourceCode: 'shoa',
    sourceName: SOURCE_NAMES.shoa,
    category: 'meteorologica',
    subcategory: null,
    severity: v.severity,
    state: 'activa',
    title: v.title,
    description: v.description,
    location: 'Litoral de Valparaíso',
    lat: coord.lat,
    lng: coord.lng,
    region: 'Valparaíso',
    commune: 'Valparaíso',
    meta: v.meta ?? null,
    issuedAt: new Date().toISOString(),
  }
}

function genGuardiaMarina(): BroadcastAlert {
  // Maritime coords slightly offshore of Valparaíso bay
  const coord = {
    lat: round(rand(-33.05, -33.01), 4),
    lng: round(rand(-71.65, -71.55), 4),
  }
  type Variant = {
    title: string
    description: string
    severity: Severity
    meta?: Record<string, unknown> | null
  }
  const variants: Variant[] = [
    {
      title: 'Aviso a la Navegación',
      description:
        'Guardia Marina emite aviso a la navegación: artefacto naval a la deriva reportado en sector de bahía de Valparaíso. Tránsito con precaución.',
      severity: 'watch',
      meta: { tipo_aviso: 'deriva' },
    },
    {
      title: 'Viento y Mar Lluvia',
      description:
        'Guardia Marina reporta viento y mar lluvia en sector costero. Se recomienda a embarcaciones menores permanecer en puerto.',
      severity: 'warning',
      meta: { viento_kmh: randInt(40, 70) },
    },
    {
      title: 'Zona de exclusión temporal',
      description:
        'Guardia Marina establece zona de exclusión temporal por operación de rescate marítimo. Coordenadas comunicadas por canal 16 VHF.',
      severity: 'warning',
      meta: { canal: 'VHF 16', operacion: 'rescate' },
    },
  ]
  const v = pick(variants)
  return {
    id: uuidv4(),
    externalId: makeExternalId('GM'),
    sourceCode: 'guardiamarina',
    sourceName: SOURCE_NAMES.guardiamarina,
    category: 'transito',
    subcategory: 'maritimo',
    severity: v.severity,
    state: 'activa',
    title: v.title,
    description: v.description,
    location: 'Bahía de Valparaíso / Litoral',
    lat: coord.lat,
    lng: coord.lng,
    region: 'Valparaíso',
    commune: 'Valparaíso',
    meta: v.meta ?? null,
    issuedAt: new Date().toISOString(),
  }
}

function genCbv2(criticalOnly: boolean = false): BroadcastAlert {
  const coord = randCoord()
  const commune = communeForCoord()
  type Variant = {
    title: string
    description: string
    severity: Severity
    state: State
    category: string
    meta?: Record<string, unknown> | null
  }
  const variants: Variant[] = [
    {
      title: 'Llamado de Emergencia',
      description:
        'CBV2 2da Compañía de Bomberos de Viña del Mar atiende llamado de emergencia. Unidades desplazadas al sector reportado.',
      severity: 'watch',
      state: 'en_proceso',
      category: 'incendio',
      meta: { unidades: randInt(2, 4) },
    },
    {
      title: 'Incendio Estructural',
      description:
        'CBV2 combate incendio estructural en vivienda del sector. Trabajo de extinción y ventilación en progreso. Bomberos solicitan cortar suministro eléctrico.',
      severity: 'warning',
      state: 'activa',
      category: 'incendio',
      meta: { viviendas_afectadas: randInt(1, 3) },
    },
    {
      title: 'Rescate Vehicular',
      description:
        'CBV2 realiza rescate vehicular en ruta. Apoyo médico y corte de tránsito coordinado con Carabineros.',
      severity: 'warning',
      state: 'en_proceso',
      category: 'transito',
      meta: { tipo: 'rescate_vehicular' },
    },
    {
      title: 'Emergencia con Materiales Peligrosos',
      description:
        'CBV2 activa protocolo de materiales peligrosos en sector industrial. Perímetro de seguridad establecido.',
      severity: 'critical',
      state: 'activa',
      category: 'quimico',
      meta: { protocolo: 'hazmat' },
    },
  ]
  const v = pickVariant(variants, criticalOnly)
  return {
    id: uuidv4(),
    externalId: makeExternalId('CBV2'),
    sourceCode: 'cbv2',
    sourceName: SOURCE_NAMES.cbv2,
    category: v.category,
    subcategory: null,
    severity: v.severity,
    state: v.state,
    title: v.title,
    description: v.description,
    location: `Sector ${commune}`,
    lat: coord.lat,
    lng: coord.lng,
    region: 'Valparaíso',
    commune,
    meta: v.meta ?? null,
    issuedAt: new Date().toISOString(),
  }
}

function genCarabineros(criticalOnly: boolean = false): BroadcastAlert {
  const coord = randCoord()
  const commune = communeForCoord()
  type Variant = {
    title: string
    description: string
    severity: Severity
    state: State
    meta?: Record<string, unknown> | null
  }
  const variants: Variant[] = [
    {
      title: 'Nueva alerta de seguridad',
      description:
        'Carabineros reporta nueva alerta de seguridad en sector urbano. Patrullas desplegadas para disuadir y proteger a la población.',
      severity: 'watch',
      state: 'en_proceso',
      meta: { patrullas: randInt(2, 6) },
    },
    {
      title: 'Alerta de seguridad - Robo con intimidación',
      description:
        'Carabineros reporta robo con intimidación en sector comercial. Perímetro establecido, búsqueda de antecedentes en curso.',
      severity: 'warning',
      state: 'en_proceso',
      meta: { tipo: 'robo_intimidacion' },
    },
    {
      title: 'Alerta de seguridad - Sospechoso armado',
      description:
        'Carabineros activa protocolo de seguridad por sospechoso armado en sector. Se solicita a vecinos resguardarse en interiores.',
      severity: 'critical',
      state: 'activa',
      meta: { protocolo: 'red_cobro' },
    },
  ]
  const v = pickVariant(variants, criticalOnly)
  return {
    id: uuidv4(),
    externalId: makeExternalId('CARAB'),
    sourceCode: 'carabineros',
    sourceName: SOURCE_NAMES.carabineros,
    category: 'seguridad',
    subcategory: null,
    severity: v.severity,
    state: v.state,
    title: v.title,
    description: v.description,
    location: `Sector ${commune}`,
    lat: coord.lat,
    lng: coord.lng,
    region: 'Valparaíso',
    commune,
    meta: v.meta ?? null,
    issuedAt: new Date().toISOString(),
  }
}

function genRadio(): BroadcastAlert {
  const coord = randCoord()
  const commune = communeForCoord()
  type Variant = {
    title: string
    description: string
    severity: Severity
    state: State
    meta?: Record<string, unknown> | null
  }
  const variants: Variant[] = [
    {
      title: 'Comunicado de emergencia vía radio',
      description:
        'Radioemisoras locales transmiten comunicado de emergencia. Información oficial sobre evento activo en la comuna.',
      severity: 'info',
      state: 'activa',
      meta: { frecuencia: 'AM 1360 kHz' },
    },
    {
      title: 'Boletín radioperiodístico de emergencia',
      description:
        'Boletín radioperiodístico de emergencia: coyuntura operativa en sector, recomendaciones a la población civil.',
      severity: 'watch',
      state: 'activa',
      meta: { frecuencia: 'FM 89.3 MHz' },
    },
  ]
  const v = pick(variants)
  return {
    id: uuidv4(),
    externalId: null,
    sourceCode: 'radio',
    sourceName: SOURCE_NAMES.radio,
    category: 'radio',
    subcategory: null,
    severity: v.severity,
    state: v.state,
    title: v.title,
    description: v.description,
    location: `Cobertura ${commune}`,
    lat: coord.lat,
    lng: coord.lng,
    region: 'Valparaíso',
    commune,
    meta: v.meta ?? null,
    issuedAt: new Date().toISOString(),
  }
}

// Regular (non-critical) generator pool.
// SHOA marea alerts are produced by their own tide timer, so they are
// NOT part of the random pool to avoid double-firing the same source.
// Each generator is called WITHOUT `criticalOnly`, so it defaults to false
// and only emits info/watch/warning variants (critical variants are filtered
// out by `pickVariant`). This is what keeps critical alerts globally sparse.
const REGULAR_GENERATORS: Array<() => BroadcastAlert> = [
  genSenapred,
  genConaf,
  genShoaMet,
  genGuardiaMarina,
  genCbv2,
  genCarabineros,
  genRadio,
]

// Generators capable of producing critical variants.
const CRITICAL_GENERATORS: Array<() => BroadcastAlert> = [
  () => genSenapred(true),
  () => genConaf(true),
  () => genCbv2(true),
  () => genCarabineros(true),
]

function generateAlert(): BroadcastAlert {
  // Critical alerts must remain globally sparse (~5% of total).
  if (Math.random() < 0.05) {
    return generateCriticalAlert()
  }
  return pick(REGULAR_GENERATORS)()
}

function generateCriticalAlert(): BroadcastAlert {
  // Pick a critical-capable source (SENAPRED, CONAF, CBV2 or Carabineros)
  // and emit one of its critical variants (Alerta Roja, etc.).
  return pick(CRITICAL_GENERATORS)()
}

// ============================================================================
// Stats computation
// ============================================================================
function computeStats(connectedClients: number): Stats {
  const stats: Stats = {
    total: history.length,
    bySource: {},
    bySeverity: {},
    byCategory: {},
    byState: {},
    connectedClients,
    generatedAt: new Date().toISOString(),
  }
  for (const a of history) {
    stats.bySource[a.sourceCode] = (stats.bySource[a.sourceCode] ?? 0) + 1
    stats.bySeverity[a.severity] = (stats.bySeverity[a.severity] ?? 0) + 1
    stats.byCategory[a.category] = (stats.byCategory[a.category] ?? 0) + 1
    stats.byState[a.state] = (stats.byState[a.state] ?? 0) + 1
  }
  return stats
}

// ============================================================================
// Socket.IO server setup
// ============================================================================
const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request.
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.on('connection', (socket) => {
  console.log(`[alerts-service] client connected: ${socket.id}`)
  // On connect, send the last 20 alerts so a fresh page load has data.
  socket.emit('history', getRecentAlerts(20))

  // Send immediate stats snapshot to the new client as well.
  socket.emit('stats', computeStats(io.engine.clientsCount))

  socket.on('disconnect', (reason) => {
    console.log(`[alerts-service] client disconnected: ${socket.id} (${reason})`)
  })

  socket.on('error', (err) => {
    console.error(`[alerts-service] socket error (${socket.id}):`, err)
  })
})

// ============================================================================
// Emit helpers
// ============================================================================
function emitAlert(alert: BroadcastAlert): void {
  pushAlert(alert)
  io.emit('alert', alert)
  console.log(
    `[alert] [${alert.sourceCode}] ${alert.severity.toUpperCase()} - ${alert.title}`,
  )
}

// ============================================================================
// Timers
// ============================================================================
let alertTimer: ReturnType<typeof setTimeout> | null = null
let tideTimer: ReturnType<typeof setTimeout> | null = null
let statsTimer: ReturnType<typeof setInterval> | null = null

function scheduleNextAlert(): void {
  const delayMs = rand(8000, 20000) // 8-20s random
  alertTimer = setTimeout(() => {
    emitAlert(generateAlert())
    scheduleNextAlert()
  }, delayMs)
}

function scheduleNextTide(): void {
  // Tide cycle fires every 25-45s, cycling alta -> media -> baja -> media ...
  const delayMs = rand(25000, 45000)
  tideTimer = setTimeout(() => {
    emitAlert(genShoaMarea())
    scheduleNextTide()
  }, delayMs)
}

function scheduleStats(): void {
  statsTimer = setInterval(() => {
    const stats = computeStats(io.engine.clientsCount)
    io.emit('stats', stats)
    console.log(
      `[stats] clients=${stats.connectedClients} total=${stats.total} ` +
        `sources=${Object.keys(stats.bySource).length} ` +
        `critical=${stats.bySeverity.critical ?? 0}`,
    )
  }, 15000) // every 15s as required
}

// ============================================================================
// Bootstrap
// ============================================================================
httpServer.listen(PORT, () => {
  console.log('============================================================')
  console.log(`[alerts-service] WebSocket server running on port ${PORT}`)
  console.log(`[alerts-service]   path: '/'   (Caddy forwarding)`)
  console.log(`[alerts-service]   CORS: origin '*'`)
  console.log(`[alerts-service]   Viña del Mar center: ${VINA_CENTER.lat}, ${VINA_CENTER.lng}`)
  console.log(
    `[alerts-service]   Sources: ${Object.keys(SOURCE_NAMES).join(', ')}`,
  )
  console.log(
    `[alerts-service]   Events: 'history' (last 20 on connect), 'alert' (new), 'stats' (every 15s)`,
  )
  console.log('============================================================')

  // Seed some initial history so a freshly-loaded page immediately has data.
  for (let i = 0; i < 20; i++) {
    pushAlert(generateAlert())
  }
  // Force the first marea alert to be "alta" so the cycle starts cleanly.
  pushAlert(genShoaMarea())

  scheduleNextAlert()
  scheduleNextTide()
  scheduleStats()

  console.log('[alerts-service] bootstrapped. Awaiting client connections...')
})

// ============================================================================
// Graceful shutdown (SIGTERM / SIGINT)
// ============================================================================
let shuttingDown = false
function shutdown(signal: string): void {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[alerts-service] received ${signal}, shutting down gracefully...`)

  if (alertTimer) clearTimeout(alertTimer)
  if (tideTimer) clearTimeout(tideTimer)
  if (statsTimer) clearInterval(statsTimer)

  // Close all open connections first, then the HTTP server.
  io.close(() => {
    httpServer.close(() => {
      console.log('[alerts-service] server closed cleanly.')
      process.exit(0)
    })
  })

  // Failsafe: if for some reason close hangs, force exit after 5s.
  setTimeout(() => {
    console.warn('[alerts-service] force-exit after 5s timeout.')
    process.exit(1)
  }, 5000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('uncaughtException', (err) => {
  console.error('[alerts-service] uncaughtException:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[alerts-service] unhandledRejection:', reason)
})
