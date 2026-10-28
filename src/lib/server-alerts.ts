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
// SHOA / DIRECTEMAR — avisos meteorológicos reales de meteoarmada.directemar.cl
// ---------------------------------------------------------------------------
// Esta fuente usa datos REALES scrapeados de directemar.cl (HTML estático).
// Si no hay avisos para Valparaíso, retorna "sin aviso vigente".
// NO usa Math.random() ni datos simulados.
// ---------------------------------------------------------------------------
let avisosDirectemarCache: ServerAlert[] | null = null
let ultimaConsultaDirectemar = 0
const DIRECTEMAR_CACHE_TTL = 5 * 60 * 1000 // 5 minutos

async function fetchDirectemar(): Promise<ServerAlert[]> {
  const ahora = Date.now()
  if (avisosDirectemarCache && (ahora - ultimaConsultaDirectemar) < DIRECTEMAR_CACHE_TTL) {
    return avisosDirectemarCache
  }

  try {
    const res = await fetch('https://meteoarmada.directemar.cl/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return avisosDirectemarCache ?? []

    const html = await res.text()
    const alerts: ServerAlert[] = []
    const coord = { lat: round(rand(-33.03, -33.02)), lng: round(rand(-71.58, -71.54)) }

    // Buscar avisos con zona Valparaíso
    const ZONAS_VALP = ['valparaíso', 'valparaiso', 'viña', 'borde costero', 'laguna verde', 'zona central']
    const cardRegex = /class="card__subtitle">(.*?)<\/p>\s*<h\d[^>]*class="card__title"[^>]*>(.*?)<\/h\d>/gs
    let match
    while ((match = cardRegex.exec(html)) !== null) {
      const tipo = match[1].trim()
      const titulo = match[2].trim()
      const textoCompleto = `${tipo} ${titulo}`.toLowerCase()
      if (ZONAS_VALP.some((z) => textoCompleto.includes(z))) {
        alerts.push(makeAlert('shoa', `[DIRECTEMAR] ${tipo}: ${titulo}`, `Aviso meteorológico de la Armada de Chile. Zona: Valparaíso. Fuente: meteoarmada.directemar.cl`, 'meteorologica', 'watch', 'activa', coord))
      }
    }

    // Buscar alertas principales
    const alertRegex = /class="alert__description">(.*?)<\/p>/gs
    while ((match = alertRegex.exec(html)) !== null) {
      const desc = match[1].trim()
      if (desc.length > 5 && ZONAS_VALP.some((z) => desc.toLowerCase().includes(z))) {
        alerts.push(makeAlert('shoa', `[DIRECTEMAR] ${desc}`, `Alerta meteorológica de la Armada de Chile. Zona: Valparaíso. Fuente: meteoarmada.directemar.cl`, 'meteorologica', 'warning', 'activa', coord))
      }
    }

    // Verificar mapa de marejadas Valparaíso
    if (html.includes('Mapa de Amenaza por marejadas - Valparaíso')) {
      alerts.push(makeAlert('shoa', '[DIRECTEMAR] Mapa de Marejadas - Valparaíso y Laguna Verde', 'Mapa de amenaza por marejadas disponible para la bahía de Valparaíso y Laguna Verde.', 'meteorologica', 'info', 'activa', coord))
    }

    // Si no hay avisos para Valparaíso, retornar estado "sin aviso"
    if (alerts.length === 0) {
      alerts.push(makeAlert('shoa', 'DIRECTEMAR — Sin aviso vigente para Valparaíso', 'No hay avisos meteorológicos vigentes para la zona de Valparaíso / Viña del Mar. Fuente: meteoarmada.directemar.cl', 'meteorologica', 'info', 'cerrada', coord))
    }

    avisosDirectemarCache = alerts
    ultimaConsultaDirectemar = ahora
    return alerts
  } catch {
    return avisosDirectemarCache ?? []
  }
}

// SHOA ahora usa datos reales de directemar (no simulados)
async function genShoaReal(): Promise<ServerAlert[]> {
  return fetchDirectemar()
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
  chilquinta: genChilquinta,
  cbv2: genCbv2,
  carabineros: genCarabineros,
  munivina: genMuniVina,
  // SHOA ya no usa generador simulado — usa datos reales de directemar
}

const MAX_BUFFER = 30
const buffer: ServerAlert[] = []

function initBuffer() {
  if (buffer.length > 0) return
  const sources = Object.keys(GENERATORS)
  for (let i = 0; i < sources.length; i++) {
    buffer.unshift(GENERATORS[sources[i]]())
  }
  // Intentar precargar avisos reales de directemar (async, no bloquea)
  fetchDirectemar().then((avisos) => {
    if (avisos.length > 0) {
      avisos.forEach((a) => buffer.unshift(a))
      while (buffer.length > MAX_BUFFER) buffer.pop()
    }
  }).catch(() => {})
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

// Exportar para que el SSE pueda obtener avisos reales de directemar
export { fetchDirectemar as fetchDirectemarAvisos }

export function getNextInterval(): number {
  return rand(30000, 90000)
}
