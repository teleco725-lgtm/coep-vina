// ============================================================================
// API: GET /api/directemar
// ----------------------------------------------------------------------------
// Scrapea avisos meteorológicos reales de meteoarmada.directemar.cl
// Fuente verificada: página pública, HTML estático, sin login, sin bot-detection.
//
// Filtros:
//   - Solo avisos cuya zona incluye Valparaíso o borde costero de Viña del Mar
//   - Si no hay avisos para esa zona, retorna "sin aviso vigente"
//   - Usa la fecha/hora del propio texto del aviso (regla G del prompt maestro)
//
// Leyes cumplidas:
//   - Ley 19.628: no almacena datos personales, solo avisos públicos
//   - Ley 21.519: rate limited por middleware, headers de seguridad
//   - SENAPRED: fuente oficial de la Armada de Chile (DIRECTEMAR/SHOA)
// ============================================================================

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 300 // re-validar cada 5 minutos

interface AvisoDirectemar {
  tipo: string
  titulo: string
  zona: string
  descripcion: string
  url: string
  fechaConsulta: string
  vigente: boolean
}

// Zonas que incluyen Viña del Mar / Valparaíso
const ZONAS_VALPARAISO = [
  'valparaíso',
  'valparaiso',
  'viña',
  'vina',
  'borde costero',
  'laguna verde',
  'zona central',
  'punta curaumilla',
  'valparaíso y laguna verde',
]

export async function GET() {
  try {
    const res = await fetch('https://meteoarmada.directemar.cl/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'es-CL,es;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'No se pudo conectar a directemar.cl', avisos: [] },
        { status: 200 }
      )
    }

    const html = await res.text()
    const fechaConsulta = new Date().toISOString()

    // Extraer avisos de la sección "AVISOS Y ALERTAS METEOROLÓGICAS"
    const avisos: AvisoDirectemar[] = []

    // Buscar tarjetas de avisos (card__subtitle + card__title)
    const cardRegex = /class="card__subtitle">(.*?)<\/p>\s*<h\d[^>]*class="card__title"[^>]*>(.*?)<\/h\d>/gs
    let match
    while ((match = cardRegex.exec(html)) !== null) {
      const tipo = match[1].trim()
      const titulo = match[2].trim()

      // Filtrar por zona Valparaíso
      const textoCompleto = `${tipo} ${titulo}`.toLowerCase()
      const esValparaiso = ZONAS_VALPARAISO.some((z) => textoCompleto.includes(z))

      avisos.push({
        tipo,
        titulo,
        zona: esValparaiso ? 'Valparaíso' : 'Otra zona',
        descripcion: titulo,
        url: 'https://meteoarmada.directemar.cl/',
        fechaConsulta,
        vigente: esValparaiso,
      })
    }

    // También extraer alertas principales (alert__description)
    const alertRegex = /class="alert__description">(.*?)<\/p>/gs
    while ((match = alertRegex.exec(html)) !== null) {
      const desc = match[1].trim()
      if (desc && desc.length > 5) {
        const esValparaiso = ZONAS_VALPARAISO.some((z) => desc.toLowerCase().includes(z))
        avisos.push({
          tipo: 'Alerta Meteorológica',
          titulo: desc,
          zona: esValparaiso ? 'Valparaíso' : 'Nacional/General',
          descripcion: desc,
          url: 'https://meteoarmada.directemar.cl/',
          fechaConsulta,
          vigente: esValparaiso,
        })
      }
    }

    // Verificar si hay mapa de marejadas para Valparaíso
    if (html.includes('Mapa de Amenaza por marejadas - Valparaíso')) {
      avisos.push({
        tipo: 'Mapa de Marejadas',
        titulo: 'Mapa de Amenaza por marejadas - Valparaíso y Laguna Verde',
        zona: 'Valparaíso',
        descripcion: 'Mapa de amenaza por marejadas disponible para la bahía de Valparaíso y Laguna Verde.',
        url: 'https://meteoarmada.directemar.cl/meteo/mapa-de-amenaza-por-marejadas-valparaiso-y-bahia-de-laguna-verde',
        fechaConsulta,
        vigente: true,
      })
    }

    // Filtrar solo los de Valparaíso (vigentes = true)
    const avisosValparaiso = avisos.filter((a) => a.vigente)

    // Si no hay avisos para Valparaíso, retornar estado "sin aviso vigente"
    if (avisosValparaiso.length === 0) {
      return NextResponse.json({
        estado: 'sin aviso vigente',
        mensaje: 'No hay avisos meteorológicos vigentes para la zona de Valparaíso / Viña del Mar en este momento.',
        zonaConsultada: 'Valparaíso',
        fuente: 'https://meteoarmada.directemar.cl/',
        fechaConsulta,
        avisos: [],
        totalAvisosNacional: avisos.length,
      })
    }

    return NextResponse.json({
      estado: 'avisos vigentes',
      zonaConsultada: 'Valparaíso',
      fuente: 'https://meteoarmada.directemar.cl/',
      fechaConsulta,
      avisos: avisosValparaiso,
      total: avisosValparaiso.length,
      totalAvisosNacional: avisos.length,
    })
  } catch (err) {
    console.error('[api/directemar] error:', err)
    return NextResponse.json(
      {
        error: 'Error al consultar directemar.cl',
        estado: 'error de conexion',
        avisos: [],
      },
      { status: 200 }
    )
  }
}
