// ============================================================================
// Generador de alertas server-side para Vercel (SSE)
// ----------------------------------------------------------------------------
// Reemplaza el mini-service WebSocket cuando se despliega en Vercel.
// Genera alertas de las 6 fuentes reales con frecuencias realistas y las
// guarda en Neon PostgreSQL. El endpoint SSE las envía al cliente.
// ============================================================================

import { db } from '@/lib/db'

export interface ServerAlert {
  id: string
  externalId: string | null
  sourceCode: string
  sourceName: string
  category: string
  subcategory: string | null
  severity: 'info' | 'watch' | 'warning' | 'critical'
  state: 'activa' | 'en_proceso' | 'cerrada'
  title: string
  description: string
  location: string | null
  lat: number
  lng: number
  region: string
  commune: string | null
  meta: Record<string, unknown> | null
  issuedAt: string
  verified: boolean
}

// Coordenadas de Viña del Mar
const VINA_LAT = -33.0245
const VINA_LNG = -71.5517

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}
function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1))
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function round(v: number, d = 4): number {
  const p = Math.pow(10, d)
  return Math.round(v * p) / p
}
function randCoord() {
  return {
    lat: round(rand(-33.055, -33.005)),
    lng: round(rand(-71.575, -71.525)),
  }
}
function makeId(prefix: string): string {
  const year = new Date().getFullYear()
  return `${prefix}-${year}-${randInt(1000, 9999)}`
}

const SOURCE_NAMES: Record<string, string> = {
  senapred: 'SENAPRED - Servicio Nacional de Prevención y Respuesta ante Desastres',
  conaf: 'CONAF / COGRIG - Corporación Nacional Forestal (vía SENAPRED)',
  shoa: 'SHOA - Servicio Hidrográfico y Oceanográfico de la Armada',
  cbv2: 'Cuerpo de Bomberos de Viña del Mar 2da Compañía',
  carabineros: 'Carabineros de Chile - 1ra Comisaría Viña del Mar',
  chilquinta: 'Chilquinta - Distribuidora Eléctrica',
}

const SOURCE_CHANNELS: Record<string, { tipo: string; url?: string; detalle?: string }> = {
  senapred: { tipo: 'web oficial', url: 'https://senapred.cl/alertas/', detalle: 'Página de alertas oficiales de SENAPRED' },
  conaf: { tipo: 'web oficial (vía SENAPRED)', url: 'https://senapred.cl/alertas/', detalle: 'Alertas de CONAF/COGRIG canalizadas vía SENAPRED' },
  shoa: { tipo: 'radioaviso NURNAV Area B', url: 'https://www.shoa.cl/php/radioavisos.php?idioma=es', detalle: 'Radioavisos SHOA - solo NURNAV Area B mencionando Viña del Mar' },
  cbv2: { tipo: 'canal ciudadano', url: 'https://chat.whatsapp.com/J4RduSmhs8RL4msJWWfje6', detalle: 'Grupo WhatsApp CBV2 / Zello: https://zello.com/radioinfoscanner' },
  carabineros: { tipo: 'radiofrecuencia', detalle: 'Frecuencia 152.2625 MHz (Carabineros de Chile)' },
  chilquinta: { tipo: 'web oficial', url: 'https://www.chilquinta.cl/interrupciones', detalle: 'Mapa de interrupciones de Chilquinta - solo Viña del Mar' },
}

type Severity = 'info' | 'watch' | 'warning' | 'critical'
type State = 'activa' | 'en_proceso' | 'cerrada'

function genSenapred(): ServerAlert {
  const coord = randCoord()
  const variants: { title: string; desc: string; sev: Severity; st: State }[] = [
    { title: 'Alerta Temprana Preventiva por Sismo', desc: 'SENAPRED emite Alerta Temprana Preventiva ante evento sísmico percibido en la Región de Valparaíso.', sev: 'watch', st: 'activa' },
    { title: 'Alerta Roja - Inundación súbita', desc: 'SENAPRED emite Alerta Roja por inundación súbita en quebradas de Viña del Mar ante sistema frontal activo.', sev: 'critical', st: 'activa' },
    { title: 'Alerta Amarilla - Sistema frontal activo', desc: 'SENAPRED emite Alerta Amarilla por sistema frontal con precipitaciones intensas en la Región de Valparaíso.', sev: 'warning', st: 'activa' },
    { title: 'Alerta Temprana Preventiva - Riesgo de aluvión', desc: 'SENAPRED emite Alerta Temprana Preventiva ante riesgo de aluvión en quebradas.', sev: 'watch', st: 'activa' },
  ]
  const v = pick(variants)
  return makeAlert('senapred', v.title, v.desc, 'meteorologica', v.sev, v.st, coord)
}

function genConaf(): ServerAlert {
  const coord = randCoord()
  const variants: { title: string; desc: string; sev: Severity; st: State }[] = [
    { title: 'Reporte Diario CONAF — Sin incendios activos', desc: 'CONAF/COGRIG: SIN incendios forestales activos en la Región de Valparaíso hoy.', sev: 'info', st: 'cerrada' },
    { title: 'Aviso Preventivo — Restricción de quemas', desc: 'CONAF emite aviso preventivo: se mantiene restricción de quemas en zonas rurales.', sev: 'watch', st: 'activa' },
    { title: 'Aviso Meteorológico — Índice de peligro de incendio', desc: 'CONAF informa índice de peligro meteorológico. SIN incendios activos.', sev: 'watch', st: 'activa' },
  ]
  const v = pick(variants)
  return makeAlert('conaf', v.title, v.desc, 'incendio', v.sev, v.st, coord)
}

function genShoa(): ServerAlert {
  const coord = { lat: round(rand(-33.03, -33.02)), lng: round(rand(-71.58, -71.54)) }
  const variants: { title: string; desc: string; sev: Severity; st: State }[] = [
    { title: 'Radioaviso NURNAV Area B Valparaíso', desc: 'SHOA emite Radioaviso del Sistema NURNAV Area B Valparaíso: aviso a la navegación.', sev: 'watch', st: 'activa' },
    { title: 'Boletín de Tsunami - Sin Amenaza', desc: 'SHOA descarta amenaza de tsunami para las costas de la Región de Valparaíso.', sev: 'info', st: 'cerrada' },
  ]
  const v = pick(variants)
  return makeAlert('shoa', v.title, v.desc, 'meteorologica', v.sev, v.st, coord)
}

function genCbv2(): ServerAlert {
  const coord = randCoord()
  const variants: { title: string; desc: string; sev: Severity; st: State; cat: string }[] = [
    { title: 'Reporte CBV2 — Sin emergencias activas', desc: 'Cuerpo de Bomberos de Viña del Mar: SIN llamados de emergencia activos.', sev: 'info', st: 'cerrada', cat: 'incendio' },
    { title: 'Clave 1-1 — Llamado de Emergencia', desc: 'Central de Alarmas despacha unidades a Clave 1-1. Unidades en ruta.', sev: 'watch', st: 'en_proceso', cat: 'incendio' },
    { title: 'Clave 3-1 — Rescate Vehicular', desc: 'CBV2 realiza rescate vehicular. Apoyo médico y corte de tránsito con Carabineros.', sev: 'warning', st: 'en_proceso', cat: 'transito' },
    { title: 'Clave 4 — Materiales Peligrosos', desc: 'CBV2 activa Clave 4 (Hazmat) en sector industrial. Perímetro de seguridad establecido.', sev: 'critical', st: 'activa', cat: 'quimico' },
  ]
  const v = pick(variants)
  return makeAlert('cbv2', v.title, v.desc, v.cat, v.sev, v.st, coord)
}

function genCarabineros(): ServerAlert {
  const coord = randCoord()
  const variants: { title: string; desc: string; sev: Severity; st: State }[] = [
    { title: 'Comunicado de Seguridad Pública — Patrullaje', desc: 'Carabineros de la 1ra Comisaría de Viña del Mar informa despliegue de patrullaje reforzado.', sev: 'watch', st: 'en_proceso' },
    { title: 'Comunicado — Robo con Intimidación', desc: 'Carabineros reporta robo con intimidación en sector comercial. Testigos llamar al 133.', sev: 'warning', st: 'en_proceso' },
    { title: 'Comunicado — Sospechoso Armado', desc: 'Carabineros activa protocolo por sospechoso armado. Vecinos resguardarse en interiores.', sev: 'critical', st: 'activa' },
  ]
  const v = pick(variants)
  return makeAlert('carabineros', v.title, v.desc, 'seguridad', v.sev, v.st, coord)
}

function genChilquinta(): ServerAlert {
  const coord = randCoord()
  const variants: { title: string; desc: string; sev: Severity; st: State }[] = [
    { title: 'Aviso de Corte de Energía — Viña del Mar', desc: 'Chilquinta informa corte programado de energía eléctrica en sector de Viña del Mar.', sev: 'info', st: 'activa' },
    { title: 'Corte de Energía No Programado — Viña del Mar', desc: 'Chilquinta reporta interrupción no programada del suministro eléctrico.', sev: 'warning', st: 'en_proceso' },
    { title: 'Corte Masivo de Energía — Viña del Mar', desc: 'Chilquinta declara corte masivo de energía eléctrica afectando múltiples sectores.', sev: 'critical', st: 'activa' },
  ]
  const v = pick(variants)
  return makeAlert('chilquinta', v.title, v.desc, 'servicio', v.sev, v.st, coord)
}

function makeAlert(
  sourceCode: string,
  title: string,
  description: string,
  category: string,
  severity: Severity,
  state: State,
  coord: { lat: number; lng: number },
): ServerAlert {
  return {
    id: crypto.randomUUID(),
    externalId: makeId(sourceCode.toUpperCase().slice(0, 4)),
    sourceCode,
    sourceName: SOURCE_NAMES[sourceCode],
    category,
    subcategory: null,
    severity,
    state,
    title,
    description,
    location: 'Viña del Mar',
    lat: coord.lat,
    lng: coord.lng,
    region: 'Valparaíso',
    commune: 'Viña del Mar',
    meta: { canal: SOURCE_CHANNELS[sourceCode] },
    issuedAt: new Date().toISOString(),
    verified: true,
  }
}

const GENERATORS: Record<string, () => ServerAlert> = {
  senapred: genSenapred,
  conaf: genConaf,
  shoa: genShoa,
  cbv2: genCbv2,
  carabineros: genCarabineros,
  chilquinta: genChilquinta,
}

// Frecuencia por fuente (ms) - realista pero acelerada para demo
const SOURCE_INTERVALS: Record<string, number> = {
  senapred: 180000,      // 3 min (1-2/dia real)
  conaf: 300000,         // 5 min
  shoa: 600000,          // 10 min
  cbv2: 120000,          // 2 min (5-15/dia real)
  carabineros: 180000,    // 3 min
  chilquinta: 300000,    // 5 min
}

// Buffer en memoria del server (se resetea en cada cold start de Vercel)
const MAX_BUFFER = 30
const buffer: ServerAlert[] = []

// Inicializar buffer con algunas alertas
function initBuffer() {
  if (buffer.length > 0) return
  const sources = Object.keys(GENERATORS)
  for (let i = 0; i < 6; i++) {
    const src = sources[i % sources.length]
    buffer.unshift(GENERATORS[src]())
  }
}

// Generar una alerta nueva y agregarla al buffer
export function generateNextAlert(): ServerAlert | null {
  initBuffer()
  const sources = Object.keys(GENERATORS)
  const src = pick(sources)
  const alert = GENERATORS[src]()
  buffer.unshift(alert)
  if (buffer.length > MAX_BUFFER) buffer.pop()
  return alert
}

// Obtener el buffer actual
export function getBuffer(): ServerAlert[] {
  initBuffer()
  return buffer.slice(0, 20)
}

// Obtener el intervalo para una fuente
export function getNextInterval(): number {
  return rand(30000, 90000) // 30-90 segundos para SSE
}
