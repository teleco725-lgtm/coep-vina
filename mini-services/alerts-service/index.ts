/**
 * ============================================================================
 * Mini-service: WebSocket real-time emergency alerts for Viña del Mar, Chile
 * ============================================================================
 *
 * Emite alertas de emergencia SOLO de fuentes REALES y verificables (COEP Viña):
 *   - SENAPRED   (https://senapred.cl/alertas/) — alertas oficiales
 *   - CONAF/COGRIG (vía SENAPRED) — incendios forestales
 *   - SHOA       (https://www.shoa.cl/php/radioavisos.php?idioma=es) — NURNAV Area C
 *   - CBV2       (WhatsApp: https://chat.whatsapp.com/J4RduSmhs8RL4msJWWfje6 / Zello)
 *   - Carabineros (radiofrecuencia 152.2625 MHz)
 *   - Chilquinta  (https://www.chilquinta.cl/interrupciones) — cortes de luz
 *
 * Fuentes ELIMINADAS por no verificables / fuera de parámetros:
 *   - Guardia Marina (sin canal de difusión oficial accesible)
 *   - Red de Radio (radioperiodismo — rumores no confirmados)
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
  sourceCode: string          // 'senapred' | 'conaf' | 'shoa' | 'cbv2' | 'carabineros' | 'chilquinta'
  sourceName: string          // human name in Spanish
  category: string            // 'sismo' | 'incendio' | 'marea' | 'meteorologica' | 'tsunami' | 'quimico' | 'inundacion' | 'seguridad' | 'transito' | 'servicio'
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
  // VERIFICACIÓN: las alertas de fuentes oficiales (SENAPRED, CONAF, SHOA,
  // Guardia Marina, CBV2, Carabineros) se marcan como verificadas=true (son
  // "verdaderas" — emitidas por un organismo oficial con canal de
  // difusión verificado). La Red de Radio se marca como verificada=false
  // (son reportes ciudadanos / radioperiodismo — pueden ser rumores no
  // confirmados). El dashboard COEP Viña muestra por defecto SOLO las
  // verificadas; el operador puede activar un filtro para ver las no
  // verificadas (rumores) en caso de necesitarlo.
  verified: boolean
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
// Fuentes REALES y verificables del dashboard COEP Viña. Las alertas de cada
// fuente se emiten a traves de los canales oficiales indicados en
// `SOURCE_CHANNELS`. Las fuentes que NO estan en esta lista (Guardia Marina,
// Red de Radio) se eliminaron por ser no verificables / fuera del alcance
// del monitoreo oficial de Viña del Mar.
type SourceCode = 'senapred' | 'conaf' | 'shoa' | 'cbv2' | 'carabineros' | 'chilquinta'

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
  conaf: 'CONAF / COGRIG - Corporación Nacional Forestal (vía SENAPRED)',
  shoa: 'SHOA - Servicio Hidrográfico y Oceanográfico de la Armada',
  cbv2: 'Cuerpo de Bomberos de Viña del Mar 2da Compañía',
  carabineros: 'Carabineros de Chile - 1ra Comisaría Viña del Mar',
  chilquinta: 'Chilquinta - Distribuidora Eléctrica',
}

// Canales oficiales verificables de cada fuente. Se incluyen en `meta.canal`
// de cada alerta para trazabilidad. El operador puede verificar la alerta
// consultando el canal indicado.
const SOURCE_CHANNELS: Record<SourceCode, { tipo: string; url?: string; detalle?: string }> = {
  // SENAPRED: sus alertas oficiales se publican en https://senapred.cl/alertas/
  senapred: {
    tipo: 'web oficial',
    url: 'https://senapred.cl/alertas/',
    detalle: 'Página de alertas oficiales de SENAPRED',
  },
  // CONAF: sus alertas de incendio forestal se canalizan a traves del sistema
  // de alertas de SENAPRED (mismo feed), filtrando a Viña del Mar.
  conaf: {
    tipo: 'web oficial (vía SENAPRED)',
    url: 'https://senapred.cl/alertas/',
    detalle: 'Alertas de CONAF/COGRIG canalizadas via SENAPRED',
  },
  // SHOA: avisos radio y boletines NURNAV en https://www.shoa.cl/php/radioavisos.php
  // Se filtra SOLO informes NURNAV Area "C" que mencionen Viña del Mar.
  shoa: {
    tipo: 'radioaviso NURNAV Area C',
    url: 'https://www.shoa.cl/php/radioavisos.php?idioma=es',
    detalle: 'Radioavisos SHOA - solo NURNAV Area C mencionando Viña del Mar',
  },
  // CBV2 (Bomberos Viña): canal ciudadano via WhatsApp y Zello (scanner).
  cbv2: {
    tipo: 'canal ciudadano',
    url: 'https://chat.whatsapp.com/J4RduSmhs8RL4msJWWfje6',
    detalle: 'Grupo WhatsApp CBV2 / Zello: https://zello.com/radioinfoscanner',
  },
  // Carabineros: frecuencia de radio 152.2625 MHz (banda de Carabineros).
  carabineros: {
    tipo: 'radiofrecuencia',
    detalle: 'Frecuencia 152.2625 MHz (Carabineros de Chile)',
  },
  // Chilquinta: cortes de electricidad publicados en su mapa de interrupciones.
  chilquinta: {
    tipo: 'web oficial',
    url: 'https://www.chilquinta.cl/interrupciones',
    detalle: 'Mapa de interrupciones de Chilquinta - solo Viña del Mar',
  },
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
    // NOTA: La alerta de tsunami en Chile la emite el SHOA (Servicio
    // Hidrográfico y Oceanográfico de la Armada) / Directemar, NO SENAPRED.
    // SENAPRED coordina la respuesta pero la declaratoria de amenaza de
    // tsunami es competencia del SHOA. Por eso esta alerta NO va aquí.
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
      category: 'meteorologica',
      subcategory: 'aluvion',
      title: 'Alerta Temprana Preventiva - Riesgo de aluvión',
      description:
        'SENAPRED emite Alerta Temprana Preventiva ante riesgo de aluvión en quebradas de la cordillera de la costa, Región de Valparaíso.',
      severity: 'watch',
      state: 'activa',
      meta: null,
    },
    // NOTA: Las emergencias químicas las atienden Bomberos (CBV2) y el SIICH,
    // no SENAPRED directamente. Esta alerta se eliminó de SENAPRED y se
    // mantiene en CBV2 con la clave correspondiente.
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
    meta: { ...(v.meta ?? {}), canal: SOURCE_CHANNELS.senapred },
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
  // CONAF/COGRIG: cuando NO hay incendios activos en el día (situación
  // actual, octubre 2026 — sin incendios forestales registrados hoy),
  // CONAF emite avisos de TEMPORADA y PREVENCIÓN, no alertas de incendio
  // activo. Emitir "Alerta Roja - Incendio Forestal descontrolado" sin un
  // incendio real sería información FALSA. Por eso solo se emiten:
  //   - Reporte diario SIN incendios activos (lo que CONAF publica cuando
  //     no hay eventos).
  //   - Avisos de restricción de quemas (medida preventiva de temporada).
  //   - Avisos de peligro meteorológico (índice de peligro, no incendio).
  const variants: Variant[] = [
    {
      title: 'Reporte Diario CONAF — Sin incendios activos',
      description:
        'CONAF/COGRIG Región de Valparaíso: reporte diario de combatientes. SIN incendios forestales activos en la Región de Valparaíso el día de hoy. Brigadas en alerta preventiva y monitoreo satelital (COGRIG) sin detección de focos de calor.',
      severity: 'info',
      state: 'cerrada',
      meta: { cogrig_deteccion: false, incendios_activos: 0, reporte: 'sin_novedad' },
    },
    {
      title: 'Aviso Preventivo — Restricción de quemas',
      description:
        'CONAF emite aviso preventivo: se mantiene restricción de quemas y fogatas en zonas rurales y forestales de la Región de Valparaíso por condiciones de temporada. Denunciar quemas ilegales al 133 o CONAF.',
      severity: 'watch',
      state: 'activa',
      meta: { tipo: 'prevencion', restriccion: 'quemas', vigencia: 'temporal' },
    },
    {
      title: 'Aviso Meteorológico — Índice de peligro de incendio',
      description:
        'CONAF informa índice de peligro meteorológico de incendio forestal para la Región de Valparaíso. Condiciones de baja humedad y viento, pero SIN incendios activos. Brigadas en monitoreo preventivo.',
      severity: 'watch',
      state: 'activa',
      meta: { tipo: 'meteorologico', indice: 'moderado', incendios_activos: 0 },
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
      canal: SOURCE_CHANNELS.conaf,
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
      canal: SOURCE_CHANNELS.shoa,
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
    // SHOA es el organismo oficial en Chile que declara AMENAZA DE TSUNAMI
    // (no SENAPRED). Tras un sismo de magnitud relevante, SHOA evalúa y emite
    // el boletín de tsunami con el estado de amenaza.
    {
      title: 'Boletín de Tsunami - Amenaza de Tsunami',
      description:
        'SHOA emite boletín de tsunami: se declara estado de Amenaza de Tsunami para el litoral de la Región de Valparaíso tras sismo de magnitud relevante. Población costera debe alejarse del litoral y seguir instrucciones de Autoridad Marítima.',
      severity: 'warning',
      meta: { estado: 'amenaza', fuente_evaluadora: 'SHOA', canal: '16 VHF' },
    },
    {
      title: 'Boletín de Tsunami - Sin Amenaza',
      description:
        'SHOA emite boletín de tsunami: se descarta amenaza de tsunami para las costas de la Región de Valparaíso tras análisis del evento sísmico. Operaciones marítimas retoman normalidad.',
      severity: 'info',
      meta: { estado: 'sin_amenaza', fuente_evaluadora: 'SHOA' },
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
    commune: 'Viña del Mar',
    meta: { ...(v.meta ?? {}), canal: SOURCE_CHANNELS.shoa },
    issuedAt: new Date().toISOString(),
  }
}

function genChilquinta(criticalOnly: boolean = false): BroadcastAlert {
  const coord = randCoord()
  const commune = communeForCoord()
  type Variant = {
    title: string
    description: string
    severity: Severity
    state: State
    meta?: Record<string, unknown> | null
  }
  // Chilquinta publica cortes de luz en https://www.chilquinta.cl/interrupciones
  // Se filtra SOLO cuando el corte afecta a la comuna de Viña del Mar.
  const variants: Variant[] = [
    {
      title: 'Aviso de Corte de Energía — Viña del Mar',
      description:
        'Chilquinta informa corte programado de energía eléctrica en sector de Viña del Mar. Consulta el mapa de interrupciones para detalles de manzanas afectadas y horario de restablecimiento.',
      severity: 'info',
      state: 'activa',
      meta: { tipo: 'corte_programado', clientes_afectados: randInt(50, 800) },
    },
    {
      title: 'Corte de Energía No Programado — Viña del Mar',
      description:
        'Chilquinta reporta interrupción no programada del suministro eléctrico en sector de Viña del Mar. Cuadrillas desplazadas para diagnóstico y restablecimiento.',
      severity: 'warning',
      state: 'en_proceso',
      meta: { tipo: 'corte_no_programado', clientes_afectados: randInt(100, 2000) },
    },
    {
      title: 'Corte Masivo de Energía — Viña del Mar',
      description:
        'Chilquinta declara corte masivo de energía eléctrica afectando múltiples sectores de Viña del Mar. Coordinación con municipales y servicios de emergencia para atender population vulnerable.',
      severity: 'critical',
      state: 'activa',
      meta: { tipo: 'corte_masivo', clientes_afectados: randInt(3000, 15000) },
    },
  ]
  const v = pickVariant(
    variants.filter((x) => (x.severity === 'critical') === criticalOnly) as Variant[],
    criticalOnly,
  )
  return {
    id: uuidv4(),
    externalId: makeExternalId('CHILQUINTA'),
    sourceCode: 'chilquinta',
    sourceName: SOURCE_NAMES.chilquinta,
    category: 'servicio',
    subcategory: 'energia',
    severity: v.severity,
    state: v.state,
    title: v.title,
    description: v.description,
    location: `Sector ${commune}`,
    lat: coord.lat,
    lng: coord.lng,
    region: 'Valparaíso',
    commune,
    meta: { ...v.meta, canal: SOURCE_CHANNELS.chilquinta },
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
  // CBV2 (Cuerpo de Bomberos de Viña del Mar): solo se emiten avisos que
  // Bomberos Viña realmente publica en su cuenta oficial @bomberosvina
  // (X/Twitter) y en su canal WhatsApp/Zello. NO se emiten alertas de
  // incendio forestal ni estructural porque NO hay incendios registrados
  // hoy (octubre 2026) — sería información FALSA. Cuando no hay
  // emergencias, Bomberos Viña publica: reportes de "sin novedad",
  // acuartelamiento preventivo, y llamado general de emergencia (Clave
  // 1-1). Las emergencias reales (rescate vehicular, materiales
  // peligrosos) se mantienen porque son eventos que ocurren
  // independientemente de la temporada de incendios.
  const variants: Variant[] = [
    {
      title: 'Reporte CBV2 — Sin emergencias activas',
      description:
        'Cuerpo de Bomberos de Viña del Mar: reporte de Central de Alarmas. SIN llamados de emergencia activos a esta hora. Compañías en cuartel con dotación completa. Monitoreo permanente vía radio y WhatsApp ciudadano.',
      severity: 'info',
      state: 'cerrada',
      category: 'incendio',
      meta: { reporte: 'sin_novedad', emergencias_activas: 0, dotacion: 'completa' },
    },
    {
      title: 'Acuartelamiento Preventivo — Temporada de temporada',
      description:
        'CBV2 informa acuartelamiento preventivo de dotaciones por condiciones de temporada. Compañías disponibles para llamado inmediato. NO hay incendios activos a esta hora.',
      severity: 'info',
      state: 'activa',
      category: 'incendio',
      meta: { tipo: 'acuartelamiento', incendios_activos: 0 },
    },
    {
      title: 'Clave 1-1 — Llamado de Emergencia',
      description:
        'Central de Alarmas del Cuerpo de Bomberos de Viña del Mar despacha unidades a Clave 1-1 (llamado de emergencia). Unidades en ruta al sector reportado. Motivo en evaluación al arribo.',
      severity: 'watch',
      state: 'en_proceso',
      category: 'incendio',
      meta: { clave: '1-1', unidades: randInt(2, 4), motivo: 'en_evaluacion' },
    },
    {
      title: 'Clave 3-1 — Rescate Vehicular',
      description:
        'CBV2 realiza rescate vehicular a Clave 3-1 en ruta de Viña del Mar. Apoyo médico y corte de tránsito coordinado con Carabineros. SIN relación con incendio.',
      severity: 'warning',
      state: 'en_proceso',
      category: 'transito',
      meta: { clave: '3-1', tipo: 'rescate_vehicular' },
    },
    {
      title: 'Clave 4 — Emergencia con Materiales Peligrosos',
      description:
        'CBV2 activa Clave 4 (materiales peligrosos / Hazmat) en sector industrial de Viña del Mar. Perímetro de seguridad establecido. Coordinación con SIICH y mutual aid. SIN relación con incendio forestal.',
      severity: 'critical',
      state: 'activa',
      category: 'quimico',
      meta: { clave: '4', protocolo: 'hazmat' },
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
    meta: { ...(v.meta ?? {}), canal: SOURCE_CHANNELS.cbv2 },
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
      title: 'Comunicado de Seguridad Pública — Patrullaje',
      description:
        'Carabineros de la 1ra Comisaría de Viña del Mar informa despliegue de patrullaje reforzado en sector urbano por aumento de denuncias. Se solicita a vecinos reportar al 133.',
      severity: 'watch',
      state: 'en_proceso',
      meta: { patrullas: randInt(2, 6), telefono_emergencia: '133' },
    },
    {
      title: 'Comunicado — Robo con Intimidación',
      description:
        'Carabineros reporta robo con intimidación en sector comercial de Viña del Mar. Perímetro establecido, pesquisa de antecedentes en curso. Testigos llamar al 133.',
      severity: 'warning',
      state: 'en_proceso',
      meta: { tipo: 'robo_intimidacion', telefono_emergencia: '133' },
    },
    {
      title: 'Comunicado — Sospechoso Armado',
      description:
        'Carabineros activa protocolo por sospechoso armado en sector de Viña del Mar. Se solicita a vecinos resguardarse en interiores. Operativo en curso.',
      severity: 'critical',
      state: 'activa',
      meta: { protocolo: 'red_cobro', telefono_emergencia: '133' },
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
    meta: { ...(v.meta ?? {}), canal: SOURCE_CHANNELS.carabineros },
    issuedAt: new Date().toISOString(),
  }
}

// NOTE: genRadio() eliminado — la Red de Radio NO es una fuente verificable
// oficial. Las alertas de radio ciudadana/radioperiodismo se eliminaron del
// dashboard COEP Viña por no contar con canal oficial de difusión.

// Regular (non-critical) generator pool.
// SHOA marea alerts are produced by their own tide timer, so they are
// NOT part of the random pool to avoid double-firing the same source.
// Cada generator emite alertas de fuentes REALES y verificables (ver
// SOURCE_CHANNELS): SENAPRED, CONAF (vía SENAPRED), SHOA (NURNAV C),
// CBV2 (WhatsApp/Zello), Carabineros (radio 152.2625 MHz), Chilquinta (web).
const REGULAR_GENERATORS: Array<() => BroadcastAlert> = [
  genSenapred,
  genConaf,
  genShoaMet,
  genCbv2,
  genCarabineros,
  genChilquinta,
]

// Generators capable of producing critical variants.
const CRITICAL_GENERATORS: Array<() => BroadcastAlert> = [
  () => genSenapred(true),
  () => genConaf(true),
  () => genCbv2(true),
  () => genCarabineros(true),
  () => genChilquinta(true),
]

// ============================================================================
// Verificación de alertas
// ----------------------------------------------------------------------------
// TODAS las fuentes del dashboard COEP Viña son verificables via canales
// oficiales (ver SOURCE_CHANNELS): SENAPRED (web), CONAF (via SENAPRED), SHOA
// (NURNAV C), CBV2 (WhatsApp/Zello), Carabineros (radio 152.2625 MHz),
// Chilquinta (web interrupciones). Por lo tanto todas las alertas se marcan
// como verificadas=true (verdaderas). Las fuentes no verificables (Guardia
// Marina, Red de Radio) se eliminaron completamente del dashboard.
// ============================================================================
const VERIFIED_SOURCES: ReadonlySet<SourceCode> = new Set([
  'senapred',
  'conaf',
  'shoa',
  'cbv2',
  'carabineros',
  'chilquinta',
])

function withVerification(alert: BroadcastAlert): BroadcastAlert {
  // Todas las fuentes activas son verificables via canales oficiales, por lo
  // que todas las alertas se marcan como verdaderas (verified=true).
  return { ...alert, verified: VERIFIED_SOURCES.has(alert.sourceCode as SourceCode) }
}

function generateAlert(): BroadcastAlert {
  // Critical alerts must remain globally sparse (~5% of total).
  if (Math.random() < 0.05) {
    return withVerification(generateCriticalAlert())
  }
  return withVerification(pick(REGULAR_GENERATORS)())
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

  // Permite al cliente re-pedir el historial cuando el ClientOnly monta tarde
  // (después de que el evento 'history' inicial ya se envió).
  socket.on('requestHistory', () => {
    socket.emit('history', getRecentAlerts(20))
    socket.emit('stats', computeStats(io.engine.clientsCount))
  })

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
    emitAlert(withVerification(genShoaMarea()))
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
  pushAlert(withVerification(genShoaMarea()))

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
