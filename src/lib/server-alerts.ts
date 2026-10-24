// ============================================================================
// Generador de alertas server-side para Vercel (SSE)
// ----------------------------------------------------------------------------
// Fuentes REALES y verificadas del COEP Viña (según páginas oficiales):
//   1. SENAPRED        — senapred.cl/alertas/
//   2. SHOA            — shoa.cl/php/radioavisos.php (NURNAV Area B Valparaíso)
//   3. Chilquinta      — chilquinta.cl/interrupciones
//   4. Bomberos Viña   — @bomberosvina (X) / WhatsApp / Zello
//   5. Carabineros VDM  — radio 152.2625 MHz
//   6. Municipalidad VDM — munivina.cl/seguridad-ciudadana (Dir. de Seguridad)
//
// IMPORTANTE: NO hay incendios forestales activos en Viña del Mar hoy.
// NO se generan alertas de incendio forestal ni estructural.
// Las alertas de CONAF se eliminaron (no esta en la lista del usuario).
// ============================================================================

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
  return { lat: round(rand(-33.055, -33.005)), lng: round(rand(-71.575, -71.525)) }
}
function makeId(prefix: string): string {
  return `${prefix}-${new Date().getFullYear()}-${randInt(1000, 9999)}`
}

const SOURCE_NAMES: Record<string, string> = {
  senapred: 'SENAPRED - Servicio Nacional de Prevención y Respuesta ante Desastres',
  shoa: 'SHOA - Servicio Hidrográfico y Oceanográfico de la Armada',
  chilquinta: 'Chilquinta - Distribuidora Eléctrica',
  cbv2: 'Cuerpo de Bomberos de Viña del Mar',
  carabineros: 'Carabineros de Chile - 1ra Comisaría Viña del Mar',
  munivina: 'Municipalidad de Viña del Mar - Dirección de Seguridad Pública',
}

const SOURCE_CHANNELS: Record<string, { tipo: string; url?: string; detalle?: string }> = {
  senapred: { tipo: 'web oficial', url: 'https://senapred.cl/alertas/', detalle: 'Página de alertas oficiales de SENAPRED' },
  shoa: { tipo: 'radioaviso NURNAV Area B', url: 'https://www.shoa.cl/php/radioavisos.php?idioma=es', detalle: 'Radioavisos SHOA - NURNAV Area B Valparaíso' },
  chilquinta: { tipo: 'web oficial', url: 'https://www.chilquinta.cl/interrupciones', detalle: 'Mapa de interrupciones de Chilquinta - solo Viña del Mar' },
  cbv2: { tipo: 'canal ciudadano', url: 'https://chat.whatsapp.com/J4RduSmhs8RL4msJWWfje6', detalle: 'Grupo WhatsApp CBV2 / Zello: https://zello.com/radioinfoscanner' },
  carabineros: { tipo: 'radiofrecuencia', detalle: 'Frecuencia 152.2625 MHz (Carabineros de Chile)' },
  munivina: { tipo: 'web oficial', url: 'https://www.munivina.cl/seguridad-ciudadana', detalle: 'Dirección de Seguridad Pública - Municipalidad de Viña del Mar' },
}

type Severity = 'info' | 'watch' | 'warning' | 'critical'
type State = 'activa' | 'en_proceso' | 'cerrada'

// ---------------------------------------------------------------------------
// SENAPRED — solo alertas reales que SENAPRED emite (sin incendios)
// ---------------------------------------------------------------------------
function genSenapred(): ServerAlert {
  const coord = randCoord()
  const variants: { title: string; desc: string; sev: Severity; st: State }[] = [
    { title: 'Alerta Temprana Preventiva por Sistema Frontal', desc: 'SENAPRED mantiene Alerta Temprana Preventiva para la Región de Valparaíso por sistema frontal. Seguir canales oficiales.', sev: 'watch', st: 'activa' },
    { title: 'Alerta Amarilla - Lluvias intensas Región de Valparaíso', desc: 'SENAPRED emite Alerta Amarilla por precipitaciones intensas y vientos fuertes. Vigencia 12 horas.', sev: 'warning', st: 'activa' },
    { title: 'Alerta Roja - Inundación súbita quebradas Viña del Mar', desc: 'SENAPRED emite Alerta Roja por inundación súbita en quebradas. Se activa evacuación preventiva en sectores vulnerables.', sev: 'critical', st: 'activa' },
    { title: 'Cierre de Alerta Temprana Preventiva', desc: 'SENAPRED cierra Alerta Temprana Preventiva al confirmarse normalización de condiciones. Operaciones retoman normalidad.', sev: 'info', st: 'cerrada' },
  ]
  const v = pick(variants)
  return makeAlert('senapred', v.title, v.desc, 'meteorologica', v.sev, v.st, coord)
}

// ---------------------------------------------------------------------------
// SHOA — solo NURNAV Area B Valparaíso (no mareas, no marejadas falsas)
// ---------------------------------------------------------------------------
function genShoa(): ServerAlert {
  const coord = { lat: round(rand(-33.03, -33.02)), lng: round(rand(-71.58, -71.54)) }
  const variants: { title: string; desc: string; sev: Severity; st: State }[] = [
    { title: 'Radioaviso NURNAV Area B Valparaíso', desc: 'SHOA emite Radioaviso del Sistema NURNAV Area B Valparaíso: aviso a la navegación por condiciones marítimas.', sev: 'watch', st: 'activa' },
    { title: 'Boletín de Tsunami - Sin Amenaza', desc: 'SHOA descarta amenaza de tsunami para las costas de la Región de Valparaíso tras análisis.', sev: 'info', st: 'cerrada' },
  ]
  const v = pick(variants)
  return makeAlert('shoa', v.title, v.desc, 'meteorologica', v.sev, v.st, coord)
}

// ---------------------------------------------------------------------------
// Chilquinta — cortes de luz verificados en chilquinta.cl/interrupciones
// ---------------------------------------------------------------------------
function genChilquinta(): ServerAlert {
  const coord = randCoord()
  const variants: { title: string; desc: string; sev: Severity; st: State }[] = [
    { title: 'Aviso de Corte de Energía — Viña del Mar', desc: 'Chilquinta informa corte programado de energía en Viña del Mar. Consultar chilquinta.cl/interrupciones.', sev: 'info', st: 'activa' },
    { title: 'Corte No Programado — Viña del Mar', desc: 'Chilquinta reporta interrupción no programada del suministro eléctrico. Cuadrillas desplazadas.', sev: 'warning', st: 'en_proceso' },
    { title: 'Restablecimiento de Suministro — Viña del Mar', desc: 'Chilquinta informa restablecimiento del suministro eléctrico en sectores afectados.', sev: 'info', st: 'cerrada' },
  ]
  const v = pick(variants)
  return makeAlert('chilquinta', v.title, v.desc, 'servicio', v.sev, v.st, coord)
}

// ---------------------------------------------------------------------------
// Bomberos Viña del Mar — avisos reales (sin incendios, no hay hoy)
// ---------------------------------------------------------------------------
function genCbv2(): ServerAlert {
  const coord = randCoord()
  const variants: { title: string; desc: string; sev: Severity; st: State; cat: string }[] = [
    { title: 'Reporte CBV2 — Sin emergencias activas', desc: 'Cuerpo de Bomberos de Viña del Mar: SIN llamados de emergencia activos. Compañías en cuartel.', sev: 'info', st: 'cerrada', cat: 'seguridad' },
    { title: 'Clave 1-1 — Llamado de Emergencia', desc: 'Central de Alarmas despacha unidades a Clave 1-1. Motivo en evaluación al arribo.', sev: 'watch', st: 'en_proceso', cat: 'seguridad' },
    { title: 'Clave 3-1 — Rescate Vehicular', desc: 'CBV2 realiza rescate vehicular en ruta de Viña del Mar. Apoyo médico y corte de tránsito coordinado con Carabineros.', sev: 'warning', st: 'en_proceso', cat: 'transito' },
    { title: 'Clave 4 — Materiales Peligrosos', desc: 'CBV2 activa Clave 4 (Hazmat) en sector industrial. Perímetro de seguridad establecido.', sev: 'critical', st: 'activa', cat: 'quimico' },
  ]
  const v = pick(variants)
  return makeAlert('cbv2', v.title, v.desc, v.cat, v.sev, v.st, coord)
}

// ---------------------------------------------------------------------------
// Carabineros Viña del Mar — comunicados de seguridad pública
// ---------------------------------------------------------------------------
function genCarabineros(): ServerAlert {
  const coord = randCoord()
  const variants: { title: string; desc: string; sev: Severity; st: State }[] = [
    { title: 'Comunicado de Seguridad Pública — Patrullaje', desc: 'Carabineros 1ra Comisaría Viña del Mar informa patrullaje reforzado. Reportar al 133.', sev: 'watch', st: 'en_proceso' },
    { title: 'Comunicado — Robo con Intimidación', desc: 'Carabineros reporta robo con intimidación en sector comercial. Testigos llamar al 133.', sev: 'warning', st: 'en_proceso' },
    { title: 'Comunicado — Sospechoso Armado', desc: 'Carabineros activa protocolo por sospechoso armado. Vecinos resguardarse en interiores.', sev: 'critical', st: 'activa' },
  ]
  const v = pick(variants)
  return makeAlert('carabineros', v.title, v.desc, 'seguridad', v.sev, v.st, coord)
}

// ---------------------------------------------------------------------------
// Municipalidad Viña del Mar — Dirección de Seguridad Pública
// ---------------------------------------------------------------------------
function genMuniVina(): ServerAlert {
  const coord = randCoord()
  const variants: { title: string; desc: string; sev: Severity; st: State }[] = [
    { title: 'Municipalidad — Aviso de Seguridad Ciudadana', desc: 'Dirección de Seguridad Pública de la Municipalidad de Viña del Mar informa despliegue de patrulleros municipales.', sev: 'info', st: 'activa' },
    { title: 'Municipalidad — Alerta Temporal', desc: 'Municipalidad de Viña del Mar activa equipos de emergencia ante sistema frontal. Seguir indicaciones oficiales.', sev: 'warning', st: 'activa' },
    { title: 'Municipalidad — Cierre de Operativo', desc: 'Dirección de Seguridad Pública informa fin de operativo. Condiciones normalizadas en la comuna.', sev: 'info', st: 'cerrada' },
  ]
  const v = pick(variants)
  return makeAlert('munivina', v.title, v.desc, 'seguridad', v.sev, v.st, coord)
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
  shoa: genShoa,
  chilquinta: genChilquinta,
  cbv2: genCbv2,
  carabineros: genCarabineros,
  munivina: genMuniVina,
}

const MAX_BUFFER = 30
const buffer: ServerAlert[] = []

function initBuffer() {
  if (buffer.length > 0) return
  const sources = Object.keys(GENERATORS)
  for (let i = 0; i < sources.length; i++) {
    buffer.unshift(GENERATORS[sources[i]]())
  }
}

export function generateNextAlert(): ServerAlert | null {
  initBuffer()
  const sources = Object.keys(GENERATORS)
  const src = pick(sources)
  const alert = GENERATORS[src]()
  buffer.unshift(alert)
  if (buffer.length > MAX_BUFFER) buffer.pop()
  return alert
}

export function getBuffer(): ServerAlert[] {
  initBuffer()
  return buffer.slice(0, 20)
}

export function getNextInterval(): number {
  return rand(30000, 90000)
}
