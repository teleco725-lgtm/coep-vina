// ============================================================================
// Tipos compartidos del dashboard CODEM-VDM
// ----------------------------------------------------------------------------
// Reflejan el contrato de los endpoints REST (Task 2-a) y del mini-service
// WebSocket en puerto 3003 (Task 2-a / alerts-service). El frontend los usa
// en cliente; el backend ya los valida con zod.
// ============================================================================

export type Severity = 'info' | 'watch' | 'warning' | 'critical';

export type AlertState = 'activa' | 'en_proceso' | 'cerrada';

export type IncidentState = 'activa' | 'contenida' | 'controlada' | 'cerrada';

export type IncidentType =
  | 'incendio_forestal'
  | 'incendio_urbano'
  | 'sismo'
  | 'tsunami'
  | 'inundacion'
  | 'deslizamiento'
  | 'quimico'
  | 'accidente'
  | 'delito'
  | 'otro';

export type Nature = 'natural' | 'antropico';

// Fuentes REALES y verificables del dashboard COEP Viña. Las fuentes no
// verificables (Guardia Marina, Red de Radio) se eliminaron.
export type SourceCode =
  | 'senapred'
  | 'conaf'
  | 'shoa'
  | 'cbv2'
  | 'carabineros'
  | 'chilquinta';

export type Category =
  | 'sismo'
  | 'incendio'
  | 'marea'
  | 'meteorologica'
  | 'tsunami'
  | 'quimico'
  | 'inundacion'
  | 'seguridad'
  | 'transito'
  | 'servicio';

export type RiskLevel = 'bajo' | 'medio' | 'alto' | 'critico';

export type FichaStatus = 'registrada' | 'evaluada' | 'derivada' | 'cerrada';

export type AgeRange = '0-17' | '18-29' | '30-59' | '60+';

// ---------------------------------------------------------------------------
// WebSocket (mini-service puerto 3003) — evento `alert` y `history`
// ---------------------------------------------------------------------------
export interface BroadcastAlert {
  id: string;
  externalId?: string | null;
  sourceCode: SourceCode;
  sourceName: string;
  category: Category;
  subcategory?: string | null;
  severity: Severity;
  state: AlertState;
  title: string;
  description: string;
  location?: string | null;
  lat: number;
  lng: number;
  region: string;
  commune?: string | null;
  meta?: Record<string, unknown> | null;
  issuedAt: string; // ISO
  // true = alerta verificada (emitida por fuente oficial con canal confirmado).
  // Todas las fuentes activas (senapred, conaf, shoa, cbv2, carabineros,
  // chilquinta) son verificables via canales oficiales, por lo que todas las
  // alertas del dashboard COEP Viña son verdaderas (verified=true).
  verified?: boolean;
}

// Evento `stats` del WS cada 15s.
export interface Stats {
  total: number;
  bySource: Record<string, number>;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  byState: Record<string, number>;
  connectedClients: number;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// REST API — /api/incidents
// ---------------------------------------------------------------------------
export interface Incident {
  id: string;
  type: string;
  nature: Nature;
  severity: Severity;
  state: IncidentState;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  commune: string;
  address: string | null;
  radiusMeters: number;
  affected: number;
  evacuated: number;
  resources: string | null;
  meta: string | null; // JSON stringificado en BD
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

// ---------------------------------------------------------------------------
// REST API — /api/fichas
// ---------------------------------------------------------------------------
export interface FichaFIBER {
  id: string;
  code: string;
  fullName: string;
  rut: string | null;
  address: string | null;
  commune: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  ageRange: AgeRange | null;
  riskLevel: RiskLevel;
  vulnerability: string | null;
  householdSize: number;
  hasPets: boolean;
  needsMedication: boolean;
  needsMobility: boolean;
  needsEvacuation: boolean;
  status: FichaStatus;
  notes: string | null;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// REST API — /api/sources
// ---------------------------------------------------------------------------
export interface Source {
  id: string;
  code: SourceCode;
  name: string;
  description: string | null;
  enabled: boolean;
  severity: Severity;
  region: string;
  createdAt: string;
  updatedAt: string;
  _count?: { alerts: number };
}

// ---------------------------------------------------------------------------
// REST API — /api/compliance
// ---------------------------------------------------------------------------
export interface ComplianceItem {
  id: string;
  name: string;
  description: string;
  url: string;
  obligations?: string[];
}

export interface DataHandling {
  principles: string[];
  retention: string;
  encryption: string;
  audit: string;
  backup?: string;
  access?: string;
  consent?: string;
}

export interface ComplianceData {
  frameworks: ComplianceItem[];
  dataProtection: ComplianceItem[];
  cybersecurity: ComplianceItem[];
  disasterLaws: ComplianceItem[];
  dataHandling: DataHandling;
}

// ---------------------------------------------------------------------------
// REST API — /api/stats
// ---------------------------------------------------------------------------
export interface ApiStats {
  alerts: {
    total: number;
    bySource: Record<string, number>;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    byState: Record<string, number>;
  };
  incidents: {
    total: number;
    byType: Record<string, number>;
    byNature: Record<string, number>;
    byState: Record<string, number>;
    active: number;
  };
  fichas: {
    total: number;
    byRiskLevel: Record<string, number>;
    byStatus: Record<string, number>;
    byCommune: Record<string, number>;
  };
  sources: number;
  generatedAt: string;
}
