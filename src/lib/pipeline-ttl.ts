// ============================================================================
// Pipeline de Depuración de Pines — COEP Viña
// ----------------------------------------------------------------------------
// Implementa el algoritmo de filtrado temporal y territorial del dashboard
// COEP Viña para eliminar pines falsos y datos obsoletos del mapa en tiempo
// real. Basado en la matriz de control:
//   - Filtro territorial: solo comuna "Viña del Mar"
//   - TTL emergencias críticas (Bomberos/Carabineros/Scanner): 4 horas
//   - TTL boletines del Estado (SENAPRED/SHOA/SEC/Chilquinta): 12 horas
//   - Filtro mismo día: rechazar datos de días anteriores
// ============================================================================

import type { BroadcastAlert, SourceCode } from '@/lib/types';

// Umbrales máximos de vida para los pines (TTL en milisegundos)
export const TTL_EMERGENCIAS_CRITICAS = 4 * 60 * 60 * 1000; // 4 horas
export const TTL_BOLETINES_ALERTAS = 12 * 60 * 60 * 1000; // 12 horas

// Restricción territorial: solo la comuna de Viña del Mar
export const COMUNA_RESTRICCION = 'Viña del Mar';

// Fuentes de emergencias críticas (TTL 4h): Bomberos, Carabineros, Scanner
const FUENTES_EMERGENCIA: ReadonlySet<string> = new Set([
  'cbv2',
  'carabineros',
  // 'scanner' — el scanner de WhatsApp se mapea a cbv2 (Bomberos) o carabineros
]);

// Fuentes de boletines del Estado (TTL 12h): SENAPRED, SHOA, SEC/Chilquinta, CONAF
const FUENTES_BOLETINES: ReadonlySet<string> = new Set([
  'senapred',
  'shoa',
  'conaf',
  'chilquinta',
]);

export type DecisionPipeline =
  | 'aprobado'
  | 'rechazado_territorio'
  | 'rechazado_ttl_emergencia'
  | 'rechazado_ttl_boletin'
  | 'rechazado_dia_anterior';

export interface ResultadoDepuracion {
  alert: BroadcastAlert;
  decision: 'aprobado' | 'rechazado';
  motivo: string;
  ttlAplicado: number; // ms
  edadMs: number;
  mismoDia: boolean;
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

// ---------------------------------------------------------------------------
// Filtro 3: Anti-Falso Positivo por Estado del evento
// ---------------------------------------------------------------------------
// Palabras clave que indican que el evento está CERRADO o es informativo
// (no una emergencia viva). Estas alertas se descartan del mapa activo.
const PALABRAS_CERRADO = [
  'terminado',
  'controlado',
  'balance',
  'informativo',
  'cierre',
  'cerrada',
  'cerrado',
  'descartado',
  'sin novedad',
  'superada',
  'finalizado',
  'extinto',
  'extinguido',
];

/**
 * Determina si una alerta es un "evento cerrado" (falso positivo para el
 * mapa activo). Revisa el título y la descripción en busca de palabras
 * clave como "terminado", "controlado", "balance", "informativo".
 */
export function esEventoCerrado(alert: BroadcastAlert): boolean {
  const texto = `${alert.title ?? ''} ${alert.description ?? ''}`.toLowerCase();
  return PALABRAS_CERRADO.some((palabra) => texto.includes(palabra));
}

/**
 * Calcula el TTL aplicable según la fuente.
 */
export function ttlParaFuente(sourceCode: SourceCode | string): number {
  if (esFuenteEmergencia(sourceCode)) return TTL_EMERGENCIAS_CRITICAS;
  return TTL_BOLETINES_ALERTAS;
}

/**
 * Ejecuta el pipeline de depuración sobre una alerta.
 * Devuelve el resultado con la decisión (aprobado/rechazado) y el motivo.
 */
export function depurarAlerta(
  alert: BroadcastAlert,
  ahora: Date = new Date(),
): ResultadoDepuracion {
  const fechaAlerta = new Date(alert.issuedAt);
  const edadMs = ahora.getTime() - fechaAlerta.getTime();
  const mismoDia = fechaAlerta.toDateString() === ahora.toDateString();
  const ttlAplicado = ttlParaFuente(alert.sourceCode);

  // Filtro 1: Territorial — solo Viña del Mar
  if (alert.commune && alert.commune !== COMUNA_RESTRICCION) {
    return {
      alert,
      decision: 'rechazado',
      motivo: `Rechazado: Incidente fuera de jurisdicción territorial (${alert.commune}).`,
      ttlAplicado,
      edadMs,
      mismoDia,
    };
  }

  // Filtro 2: Mismo día — rechazar datos de días anteriores
  if (!mismoDia) {
    return {
      alert,
      decision: 'rechazado',
      motivo:
        'Rechazado: Boletín antiguo. Datos históricos de días anteriores.',
      ttlAplicado,
      edadMs,
      mismoDia,
    };
  }

  // Filtro 2.5: Anti-Falso Positivo por Estado del evento
  // Descarta eventos cerrados/informativos: "terminado", "controlado",
  // "balance", "informativo", "cierre", "sin novedad", etc. Estos no son
  // emergencias vivas y NO deben pintarse en el mapa activo.
  if (esEventoCerrado(alert)) {
    return {
      alert,
      decision: 'rechazado',
      motivo:
        'Rechazado: Evento cerrado/informativo (terminado, controlado, balance, cierre). No es una emergencia viva.',
      ttlAplicado,
      edadMs,
      mismoDia,
    };
  }

  // Filtro 3: TTL según tipo de fuente
  if (esFuenteEmergencia(alert.sourceCode)) {
    // Emergencias críticas: TTL 4 horas
    if (edadMs > TTL_EMERGENCIAS_CRITICAS) {
      return {
        alert,
        decision: 'rechazado',
        motivo:
          'Rechazado: Emergencia extinta / Excedió margen de 4 horas sin reportes activos.',
        ttlAplicado: TTL_EMERGENCIAS_CRITICAS,
        edadMs,
        mismoDia,
      };
    }
  } else {
    // Boletines del Estado: TTL 12 horas
    if (edadMs > TTL_BOLETINES_ALERTAS) {
      return {
        alert,
        decision: 'rechazado',
        motivo:
          'Rechazado: Boletín antiguo. Excede el límite de 12 horas para datos del Estado.',
        ttlAplicado: TTL_BOLETINES_ALERTAS,
        edadMs,
        mismoDia,
      };
    }
  }

  // Aprobado: dentro de TTL y mismo día
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
 * de depuración (dentro de TTL y mismo día).
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
