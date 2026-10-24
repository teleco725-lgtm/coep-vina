// ============================================================================
// Pipeline de Depuración de Pines — COEP Viña | Tolerancia Cero
// ----------------------------------------------------------------------------
// Analista Operativo de Seguridad y Emergencias de Nivel Crítico.
// Filtrado de tolerancia cero: si un dato falla un solo filtro, se descarta
// automáticamente del contador activo.
//
// Filtro 1: RESTRICCIÓN TERRITORIAL ABSOLUTA (Solo Viña del Mar)
// Filtro 2: FILTRO DE VIGENCIA OPERATIVA (Fecha de hoy + TTL)
// Filtro 3: FILTRO SEMÁNTICO ANTI-FALSO POSITIVO (Estado de Cierre)
// ============================================================================

import type { BroadcastAlert, SourceCode } from '@/lib/types';

// Umbrales máximos de vida para los pines (TTL en milisegundos)
export const TTL_EMERGENCIAS_CRITICAS = 4 * 60 * 60 * 1000; // 4 horas
export const TTL_BOLETINES_ALERTAS = 12 * 60 * 60 * 1000; // 12 horas

// Restricción territorial: solo la comuna de Viña del Mar
export const COMUNA_RESTRICCION = 'Viña del Mar';

// ---------------------------------------------------------------------------
// Filtro 1: RESTRICCIÓN TERRITORIAL ABSOLUTA
// ---------------------------------------------------------------------------
// Sectores urbanos/cerros dependientes de Viña del Mar que SI se aceptan
const SECTORES_VINA = [
  'viña del mar',
  'nueva aurora',
  'reñaca',
  'miraflores',
  'gómez carreño',
  'gomez carreño',
  'forestal',
  'achupallas',
  'chorrillos',
  'santa inés',
  'santa ines',
  'centro',
  'el salto',
  'limonares',
  'recreo',
  'montemar',
  'marga marga',
  'bosques de san sebastián',
  'bosques de san sebastian',
  'canal chacao',
  'glorias',
  'marina',
  'san martín',
  'san martin',
  'plaza viña',
  'óvalo',
  'ovalo',
  '1 norte',
  'uno norte',
  '15 norte',
  'quince norte',
  'avenida valparaíso',
  'avenida valparaiso',
];

// Provincias y comunas vecinas que se RECHAZAN automáticamente
const COMUNAS_RECHAZADAS = [
  'valparaíso',
  'valparaiso',
  'quilpué',
  'quilpue',
  'villa alemana',
  'concón',
  'concon',
  'puchuncaví',
  'puchuncavi',
  'la calera',
  'catemu',
  'putaendo',
  'santa maría',
  'santa maria',
  'los andes',
  'san felipe',
  'quillota',
  'olmué',
  'olmue',
  'limache',
  'panquehue',
  'casablanca',
  'cartagena',
  'el quisco',
  'el tabo',
  'algarrobo',
  'isla de pascua',
  'marga marga',
  'petorca',
  'cabildo',
  'la ligua',
  'zapallar',
  'papudo',
  'nogales',
  'hijuelas',
  'calera',
  'catemu',
  'llaillay',
  'putendo',
  'rinconada',
  'san esteban',
  'santa maria',
];

// Fuentes de emergencias críticas (TTL 4h): Bomberos, Carabineros, Scanner
const FUENTES_EMERGENCIA: ReadonlySet<string> = new Set([
  'cbv2',
  'carabineros',
]);

// Fuentes de boletines (TTL 12h): SENAPRED, SHOA, Chilquinta, Municipalidad
const FUENTES_BOLETINES: ReadonlySet<string> = new Set([
  'senapred',
  'shoa',
  'chilquinta',
  'munivina',
]);

export type DecisionPipeline =
  | 'aprobado'
  | 'rechazado_territorio'
  | 'rechazado_ttl_emergencia'
  | 'rechazado_ttl_boletin'
  | 'rechazado_dia_anterior'
  | 'rechazado_cerrado';

export interface ResultadoDepuracion {
  alert: BroadcastAlert;
  decision: 'aprobado' | 'rechazado';
  motivo: string;
  ttlAplicado: number; // ms
  edadMs: number;
  mismoDia: boolean;
}

// ---------------------------------------------------------------------------
// Filtro 3: FILTRO SEMÁNTICO ANTI-FALSO POSITIVO (Estado de Cierre)
// ---------------------------------------------------------------------------
// Palabras clave que indican que el evento está CERRADO o es informativo
// (no una emergencia viva). Estas alertas se descartan del mapa activo.
const PALABRAS_CERRADO = [
  'terminado',
  'controlado',
  'extinguido',
  'superado',
  'servicio repuesto',
  'normalizado',
  'retorno de unidades',
  'descarte de riesgo',
  'descartado',
  'balance',
  'informativo',
  'cierre',
  'cerrada',
  'cerrado',
  'sin novedad',
  'finalizado',
  'extinto',
  'sin amenaza',
  'restablecimiento',
  'restablecido',
  'sin emergencias',
  'sin emergencia',
  'sin actividad',
];

/**
 * Filtro 1: Verifica si la alerta es territorialmente válida para Viña del Mar.
 * REGLA DE EXPULSIÓN: Si menciona provincias o comunas vecinas, se rechaza.
 */
export function esTerritorioValido(alert: BroadcastAlert): boolean {
  const texto = `${alert.commune ?? ''} ${alert.location ?? ''} ${alert.title ?? ''} ${alert.description ?? ''}`.toLowerCase();

  // Si menciona alguna comuna/provincia rechazada, verificar que no sea
  // solo una referencia a "Región de Valparaíso" (que es aceptable como
  // contexto regional, siempre que Viña del Mar sea el epicentro).
  for (const rechazada of COMUNAS_RECHAZADAS) {
    if (texto.includes(rechazada)) {
      // Si también menciona Viña del Mar explícitamente, puede ser que
      // la alerta es de Viña pero menciona la región. Verificar si Viña
      // del Mar aparece como epicentro.
      if (!texto.includes('viña del mar') && !texto.includes('viña')) {
        return false; // Menciona otra comuna y NO menciona Viña del Mar
      }
    }
  }

  // Si no tiene comuna, verificar si el texto menciona Viña del Mar
  if (!alert.commune) {
    return texto.includes('viña del mar') || texto.includes('viña');
  }

  // Si la comuna es Viña del Mar, aceptar
  return alert.commune.toLowerCase() === COMUNA_RESTRICCION.toLowerCase();
}

/**
 * Filtro 3: Determina si una alerta es un "evento cerrado" (falso positivo).
 * Analiza el texto del reporte en busca de palabras de cierre.
 */
export function esEventoCerrado(alert: BroadcastAlert): boolean {
  const texto = `${alert.title ?? ''} ${alert.description ?? ''}`.toLowerCase();
  return PALABRAS_CERRADO.some((palabra) => texto.includes(palabra));
}

/**
 * Determina si una fuente es de emergencia crítica (TTL 4h) o boletín (TTL 12h).
 */
export function esFuenteEmergencia(sourceCode: SourceCode | string): boolean {
  return FUENTES_EMERGENCIA.has(sourceCode);
}

export function esFuenteBoletin(sourceCode: SourceCode | string): boolean {
  return FUENTES_BOLETINES.has(sourceCode);
}

/**
 * Calcula el TTL aplicable según la fuente.
 */
export function ttlParaFuente(sourceCode: SourceCode | string): number {
  if (esFuenteEmergencia(sourceCode)) return TTL_EMERGENCIAS_CRITICAS;
  return TTL_BOLETINES_ALERTAS;
}

/**
 * Ejecuta el pipeline de depuración de TOLERANCIA CERO sobre una alerta.
 * Si un dato falla un solo filtro, se descarta automáticamente.
 *
 * Filtro 1: RESTRICCIÓN TERRITORIAL ABSOLUTA (Solo Viña del Mar)
 * Filtro 2: FILTRO DE VIGENCIA OPERATIVA (Fecha de hoy + TTL)
 * Filtro 3: FILTRO SEMÁNTICO ANTI-FALSO POSITIVO (Estado de Cierre)
 */
export function depurarAlerta(
  alert: BroadcastAlert,
  ahora: Date = new Date(),
): ResultadoDepuracion {
  const fechaAlerta = new Date(alert.issuedAt);
  const edadMs = ahora.getTime() - fechaAlerta.getTime();
  const mismoDia = fechaAlerta.toDateString() === ahora.toDateString();
  const ttlAplicado = ttlParaFuente(alert.sourceCode);

  // Filtro 1: RESTRICCIÓN TERRITORIAL ABSOLUTA
  // Solo Viña del Mar. Si menciona provincias o comunas vecinas, se rechaza.
  if (!esTerritorioValido(alert)) {
    return {
      alert,
      decision: 'rechazado',
      motivo: `FALSO POSITIVO TERRITORIAL: Incidente fuera de jurisdicción de Viña del Mar. Menciona otra comuna/provincia.`,
      ttlAplicado,
      edadMs,
      mismoDia,
    };
  }

  // Filtro 2a: Mismo día — rechazar datos de días anteriores
  if (!mismoDia) {
    return {
      alert,
      decision: 'rechazado',
      motivo: `FALSO POSITIVO POR ANTIGÜEDAD: Registro de día anterior. No corresponde a la jornada de hoy.`,
      ttlAplicado,
      edadMs,
      mismoDia,
    };
  }

  // Filtro 3: FILTRO SEMÁNTICO ANTI-FALSO POSITIVO (Estado de Cierre)
  // Si el texto contiene palabras de cierre (Terminado, Controlado, etc.)
  // el incidente se considera RESUELTO. Su valor en el panel debe ser 0.
  if (esEventoCerrado(alert)) {
    return {
      alert,
      decision: 'rechazado',
      motivo: `FALSO POSITIVO POR CIERRE: Evento resuelto (Terminado, Controlado, Normalizado, etc.). No es una emergencia viva.`,
      ttlAplicado,
      edadMs,
      mismoDia,
    };
  }

  // Filtro 2b: TTL según tipo de fuente
  if (esFuenteEmergencia(alert.sourceCode)) {
    // Fuentes Operativas (Bomberos/Carabineros/Scanner): expiran a las 4 horas
    if (edadMs > TTL_EMERGENCIAS_CRITICAS) {
      return {
        alert,
        decision: 'rechazado',
        motivo: `EMERGENCIA EXTINTA: Excedió margen de 4 horas sin reportes de rebrote activo.`,
        ttlAplicado: TTL_EMERGENCIAS_CRITICAS,
        edadMs,
        mismoDia,
      };
    }
  } else {
    // Fuentes de Suministro/Clima (Chilquinta/SENAPRED/SHOA/Municipalidad): 12 horas
    if (edadMs > TTL_BOLETINES_ALERTAS) {
      return {
        alert,
        decision: 'rechazado',
        motivo: `BOLETÍN EXPIRADO: Excede el límite de 12 horas sin boletín de reactivación.`,
        ttlAplicado: TTL_BOLETINES_ALERTAS,
        edadMs,
        mismoDia,
      };
    }
  }

  // Aprobado: pasó los 3 filtros de tolerancia cero
  return {
    alert,
    decision: 'aprobado',
    motivo: 'Validado para el mapa activo',
    ttlAplicado,
    edadMs,
    mismoDia,
  };
}

/**
 * Filtra un array de alertas, devolviendo solo las que pasan el pipeline
 * de depuración de tolerancia cero (los 3 filtros).
 */
export function filtrarAlertasVigentes(
  alerts: BroadcastAlert[],
  ahora: Date = new Date(),
): BroadcastAlert[] {
  return alerts.filter((a) => depurarAlerta(a, ahora).decision === 'aprobado');
}

/**
 * Formatea una duración en ms a texto legible (ej: "2h 30m", "45m", "1d 3h").
 */
export function formatearEdad(ms: number): string {
  if (ms < 0) return 'futuro';
  const minutos = Math.floor(ms / 60000);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  if (dias > 0) return `${dias}d ${horas % 24}h`;
  if (horas > 0) return `${horas}h ${minutos % 60}m`;
  if (minutos > 0) return `${minutos}m`;
  return '<1m';
}

/**
 * Formatea el TTL en horas.
 */
export function formatearTTL(ms: number): string {
  const horas = ms / (60 * 60 * 1000);
  return `${horas}h`;
}
