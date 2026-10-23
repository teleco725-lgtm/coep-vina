// ============================================================================
// Helpers de severidad, categorías, fuentes y naturaleza de incidentes
// ----------------------------------------------------------------------------
// Centralizan etiquetas en español y los colores CSS de la paleta Viña del Mar
// definidos en globals.css (bg-sev-*, --chart-*).
// ============================================================================
import {
  Info,
  Eye,
  AlertTriangle,
  Siren,
  type LucideIcon,
} from 'lucide-react';

import type {
  Category,
  Nature,
  Severity,
  SourceCode,
  IncidentType,
  RiskLevel,
  FichaStatus,
  IncidentState,
} from '@/lib/types';

/** Clase de utilidad (bg-sev-*) según severidad. */
export function severityColor(sev: Severity): string {
  switch (sev) {
    case 'info':
      return 'bg-sev-info';
    case 'watch':
      return 'bg-sev-watch';
    case 'warning':
      return 'bg-sev-warning';
    case 'critical':
      return 'bg-sev-critical';
    default:
      return 'bg-sev-info';
  }
}

/** Color de borde por severidad (border-sev-*). */
export function severityBorderColor(sev: Severity): string {
  switch (sev) {
    case 'info':
      return 'border-sev-info';
    case 'watch':
      return 'border-sev-watch';
    case 'warning':
      return 'border-sev-warning';
    case 'critical':
      return 'border-sev-critical';
    default:
      return 'border-sev-info';
  }
}

/** Texto de color por severidad (sev-*). */
export function severityTextColor(sev: Severity): string {
  switch (sev) {
    case 'info':
      return 'sev-info';
    case 'watch':
      return 'sev-watch';
    case 'warning':
      return 'sev-warning';
    case 'critical':
      return 'sev-critical';
    default:
      return 'sev-info';
  }
}

/** Etiqueta en español de cada severidad SENAPRED. */
export function severityLabel(sev: Severity): string {
  switch (sev) {
    case 'info':
      return 'Info';
    case 'watch':
      return 'Vigilancia';
    case 'warning':
      return 'Alerta';
    case 'critical':
      return 'Crítica';
    default:
      return 'Info';
  }
}

/** Icono lucide representativo de cada severidad. */
export function severityIcon(sev: Severity): LucideIcon {
  switch (sev) {
    case 'info':
      return Info;
    case 'watch':
      return Eye;
    case 'warning':
      return AlertTriangle;
    case 'critical':
      return Siren;
    default:
      return Info;
  }
}

/** Etiqueta en español de cada categoría de alerta. */
export function categoryLabel(cat: Category | string): string {
  const map: Record<string, string> = {
    sismo: 'Sismo',
    incendio: 'Incendio',
    marea: 'Marea',
    meteorologica: 'Meteorológica',
    tsunami: 'Tsunami',
    quimico: 'Químico',
    inundacion: 'Inundación',
    seguridad: 'Seguridad',
    transito: 'Tránsito',
    servicio: 'Servicio',
  };
  return map[cat] ?? cat;
}

/** Etiqueta legible de cada tipo de incidente del mapa. */
export function incidentTypeLabel(t: IncidentType | string): string {
  const map: Record<string, string> = {
    incendio_forestal: 'Incendio Forestal',
    incendio_urbano: 'Incendio Urbano',
    sismo: 'Sismo',
    tsunami: 'Tsunami',
    inundacion: 'Inundación',
    deslizamiento: 'Deslizamiento',
    quimico: 'Químico',
    accidente: 'Accidente',
    delito: 'Delito',
    otro: 'Otro',
  };
  return map[t] ?? t;
}

/** Etiqueta de naturaleza de incidente. */
export function natureLabel(n: Nature | string): string {
  return n === 'antropico' ? 'Antrópico' : 'Natural';
}

/** Etiqueta de estado de incidente. */
export function incidentStateLabel(s: IncidentState | string): string {
  const map: Record<string, string> = {
    activa: 'Activa',
    contenida: 'Contenida',
    controlada: 'Controlada',
    cerrada: 'Cerrada',
  };
  return map[s] ?? s;
}

/** Etiqueta de estado de alerta. */
export function alertStateLabel(s: string): string {
  const map: Record<string, string> = {
    activa: 'Activa',
    en_proceso: 'En Proceso',
    cerrada: 'Cerrada',
  };
  return map[s] ?? s;
}

/** Etiqueta de nivel de riesgo FIBER. */
export function riskLevelLabel(r: RiskLevel | string): string {
  const map: Record<string, string> = {
    critico: 'Crítico',
    alto: 'Alto',
    medio: 'Medio',
    bajo: 'Bajo',
  };
  return map[r] ?? r;
}

/** Color de badge para nivel de riesgo (clases utilitarias). */
export function riskLevelBadgeClass(r: RiskLevel | string): string {
  switch (r) {
    case 'critico':
      return 'bg-sev-critical text-white';
    case 'alto':
      return 'bg-sev-warning text-white';
    case 'medio':
      return 'bg-sev-watch text-black';
    case 'bajo':
    default:
      return 'bg-sev-info text-white';
  }
}

/** Etiqueta de estado de ficha FIBER. */
export function fichaStatusLabel(s: FichaStatus | string): string {
  const map: Record<string, string> = {
    registrada: 'Registrada',
    evaluada: 'Evaluada',
    derivada: 'Derivada',
    cerrada: 'Cerrada',
  };
  return map[s] ?? s;
}

// ============================================================================
// Colores de fuentes — paleta Viña del Mar (sin indigo/azul-500 puros)
// Usa los CSS vars --chart-1..5 + grises/teal/naranja/rojo que combinan con
// el degradado institucional.
// ============================================================================
const SOURCE_COLORS: Record<SourceCode, string> = {
  senapred: 'var(--chart-1)', // azul petróleo
  conaf: 'var(--chart-4)', // naranja (forestal)
  shoa: 'var(--chart-2)', // teal mar
  cbv2: 'var(--chart-5)', // rojo alerta (bomberos)
  carabineros: 'oklch(0.50 0.10 250)', // verde-azulado institucional
  chilquinta: 'oklch(0.55 0.12 70)', // ámbar (energía)
};

export function sourceColor(code: SourceCode | string): string {
  if (code && code in SOURCE_COLORS) {
    return SOURCE_COLORS[code as SourceCode];
  }
  return 'var(--muted-foreground)';
}

/** Nombre corto de la fuente para badges compactos. */
export function sourceShortLabel(code: SourceCode | string): string {
  const map: Record<string, string> = {
    senapred: 'SENAPRED',
    conaf: 'CONAF',
    shoa: 'SHOA',
    cbv2: 'CBV2',
    carabineros: 'Carabineros',
    chilquinta: 'Chilquinta',
  };
  return map[code] ?? code;
}

// ============================================================================
// Colores por tipo de incidente para el mapa Leaflet
// ============================================================================
const INCIDENT_TYPE_COLORS: Record<string, string> = {
  incendio_forestal: 'oklch(0.58 0.22 30)', // rojo-naranja
  incendio_urbano: 'oklch(0.62 0.18 45)', // naranja
  sismo: 'oklch(0.55 0.18 320)', // púrpura
  tsunami: 'oklch(0.50 0.16 240)', // azul marino
  inundacion: 'oklch(0.50 0.16 230)', // azul
  deslizamiento: 'oklch(0.70 0.16 75)', // ámbar
  quimico: 'oklch(0.62 0.16 145)', // verde
  accidente: 'oklch(0.55 0.04 240)', // gris
  delito: 'oklch(0.45 0.05 250)', // gris oscuro
  otro: 'oklch(0.60 0.04 230)', // gris medio
};

export function incidentTypeColor(type: string): string {
  return INCIDENT_TYPE_COLORS[type] ?? 'oklch(0.60 0.04 230)';
}
