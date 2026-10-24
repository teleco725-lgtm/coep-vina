// ============================================================================
// Datos compartidos por las 4 rutas de export (excel/word/pdf/pptx)
// ----------------------------------------------------------------------------
// Toda la información se saca directamente de Prisma para evitar la latencia
// de pasar por las otras APIs. El JSON de cumplimiento va inline porque ya
// está definido en /api/compliance/route.ts y no depende de la BD.
// ============================================================================
import { db } from '@/lib/db';
import type {
  Incident,
  FichaFIBER,
  Source,
  ApiStats,
  ComplianceData,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Compliance (idéntico a /api/compliance — sin consultar la BD)
// ---------------------------------------------------------------------------
export const COMPLIANCE_PAYLOAD: ComplianceData = {
  frameworks: [
    {
      id: 'senapred',
      name: 'SENAPRED - Ley 21.151',
      description:
        'Servicio Nacional de Prevención y Respuesta ante Desastres. Marco normativo para la gestión de emergencias y catástrofes en Chile, sucesor de la antigua ONEMI.',
      url: 'https://www.senapred.cl',
      obligations: [
        'Mantener un sistema de información de emergencias actualizado y trazable',
        'Coordinar la respuesta con organismos de primera línea (Bomberos, Carabineros, Salud, SHOA, CONAF)',
        'Difundir alertas oficiales a la población de forma oportuna',
        'Llevar registro de incidentes y catástrofes para análisis post-evento',
      ],
    },
    {
      id: 'politica_seguridad_escolar',
      name: 'Política Nacional de Seguridad Escolar',
      description:
        'Marco orientador del MINEDUC y SENAPRED para la planificación de evacuación y resguardo de la comunidad escolar ante emergencias.',
      url: 'https://www.mineduc.cl',
      obligations: [
        'Identificar estudiantes y docentes con necesidades de evacuación especial (movilidad reducida, salud crónica)',
        'Mantener fichas de bienestar y riesgo actualizadas por establecimiento',
      ],
    },
    {
      id: 'onemi_legacy',
      name: 'ONEMI - Sistema Nacional de Protección Civil (legado)',
      description:
        'Antecedentes del Sistema Nacional de Protección Civil que SENAPRED administra hoy. Incluye el Plan de Protección Civil Comunal obligatorio para cada municipalidad.',
      url: 'https://www.senapred.cl/onemi/',
      obligations: [
        'Plan de Protección Civil Comunal actualizado anualmente',
        'Censo de recursos y capacidades comunales',
        'Bitácora de operaciones y novedades',
      ],
    },
    {
      id: 'plan_dmc',
      name: 'Plan DMC - Dirección de Emergencia Municipal',
      description:
        'Plan de respuesta de la Dirección Municipal de Emergencia. Define roles, cadena de mando y procedimientos de activación en cada comuna.',
      url: 'https://www.senapred.cl',
      obligations: [
        'Activar Comité de Operaciones de Emergencia (COE) ante alerta grave',
        'Coordinar refugios temporales y evacuación de zonas de riesgo',
        'Reportar a SENAPRED regional los incidentes relevantes',
      ],
    },
  ],
  dataProtection: [
    {
      id: 'ley19628',
      name: 'Ley 19.628 - Protección de Datos de Carácter Personal',
      description:
        'Establece el tratamiento de datos personales en Chile. Obliga al responsable a garantizar confidencialidad, finalidad y seguridad de los datos (art. 2). Las fichas FIBER, al contener datos sensibles (salud, ubicación, RUT), requieren consentimiento informado y resguardo.',
      url: 'https://www.bcn.cl/leychile/navegar?idNorma=141599',
    },
    {
      id: 'ley21099',
      name: 'Ley 21.099 - Fortalecimiento de la Transparencia y Probidad',
      description:
        'Amplía el alcance de transparencia activa de los órganos de la Administración del Estado. Aplica a SENAPRED y municipalidades que administren datos de emergencias.',
      url: 'https://www.bcn.cl/leychile/navegar?idNorma=1127813',
    },
    {
      id: 'ley21519',
      name: 'Ley 21.519 - Marco de Ciberseguridad de Chile',
      description:
        'Crea la Agencia Nacional de Ciberseguridad (ANCI) y define obligadores para servicios esenciales. Un sistema de emergencias comunales se considera servicio esencial y debe reportar incidentes de ciberseguridad.',
      url: 'https://www.bcn.cl/leychile/navegar?idNorma=1201261',
    },
  ],
  cybersecurity: [
    {
      id: 'iso27001',
      name: 'ISO/IEC 27001 - Gestión de Seguridad de la Información',
      description:
        'Estándar internacional que define un Sistema de Gestión de Seguridad de la Información (SGSI). Recomendado para todo sistema que maneje datos sensibles de personas en emergencias.',
      url: 'https://www.iso.org/standard/27001',
    },
    {
      id: 'nist',
      name: 'NIST CSF - Framework de Ciberseguridad',
      description:
        'Marco del NIST (Identificar, Proteger, Detectar, Responder, Recuperar). Sirve de guía para alinear controles técnicos y organizacionales del dashboard.',
      url: 'https://www.nist.gov/cyberframework',
    },
    {
      id: 'csirt',
      name: 'CSIRT Nacional - Equipo de Respuesta ante Incidentes',
      description:
        'Equipo nacional (ANCI / Gobierno de Chile) que coordina la respuesta a incidentes de ciberseguridad que afecten servicios esenciales como la gestión de emergencias.',
      url: 'https://www.gob.cl/ciberseguridad/',
    },
    {
      id: 'owasp',
      name: 'OWASP Top 10 - Buenas prácticas de desarrollo seguro',
      description:
        'Catálogo de los 10 riesgos más comunes en aplicaciones web. Aplica a las APIs y formularios de registro de fichas e incidentes.',
      url: 'https://owasp.org/Top10/',
    },
  ],
  disasterLaws: [
    {
      id: 'ley21151',
      name: 'Ley 21.151 - SENAPRED',
      description:
        'Crea el Servicio Nacional de Prevención y Respuesta ante Desastres, reemplazando a ONEMI. Define el Sistema Nacional de Prevención y Respuesta ante Desastres.',
      url: 'https://www.bcn.cl/leychile/navegar?idNorma=1128557',
    },
    {
      id: 'dfl536',
      name: 'DFL N°536 - Sistema Nacional de Protección Civil (ONEMI)',
      description:
        'Cuerpo legal que originó el Sistema Nacional de Protección Civil y el rol de la ONEMI. Base histórica para los planes comunales de emergencia.',
      url: 'https://www.bcn.cl/leychile/navegar?idNorma=1096038',
    },
    {
      id: 'plan_dae',
      name: 'Plan DAE - Plan de Acción ante Emergencias y Catástrofes',
      description:
        'Plan operativo que cada municipalidad debe mantener para activar la respuesta ante emergencias y catástrofes en su territorio.',
      url: 'https://www.senapred.cl',
    },
    {
      id: 'ley18243',
      name: 'Ley 18.243 - Cuerpo de Bomberos',
      description:
        'Norma que regula la organización y funcionamiento del Cuerpo de Bomberos. Marco para el registro de incidentes atendidos por CBV2.',
      url: 'https://www.bcn.cl/leychile/navegar?idNorma=29488',
    },
  ],
  dataHandling: {
    principles: [
      'Minimización de datos',
      'Finalidad',
      'Confidencialidad',
      'Integridad',
      'Disponibilidad',
      'Trazabilidad',
    ],
    retention:
      'Las fichas FIBER se conservan mientras dure la emergencia + 5 años (estándar SENAPRED)',
    encryption:
      'Cifrado en tránsito (TLS) y en reposo (SQLite con acceso restringido)',
    audit:
      'Toda acción sobre fichas, alertas e incidentes se registra en AuditLog (Ley 19.628 art. 2)',
    backup: 'Respaldo diario incremental y mensual completo de la base local',
    access:
      'Acceso basado en roles (admin / supervisor / operador) — Ley 19.628 art. 4.',
    consent:
      'El registro de una ficha FIBER implica consentimiento informado del titular para uso en gestión de emergencias (Ley 19.628).',
  },
};

// ---------------------------------------------------------------------------
// Datos cargados en cada export
// ---------------------------------------------------------------------------
export interface ExportData {
  sources: Source[];
  alerts: Array<
    Omit<
      Awaited<ReturnType<typeof db.alert.findMany>>[number],
      never
    >
  >;
  incidents: Incident[];
  fichas: FichaFIBER[];
  stats: ApiStats;
  compliance: ComplianceData;
  generatedAt: Date;
}

export async function loadExportData(): Promise<ExportData> {
  const [sources, alertsRows, incidents, fichas] = await Promise.all([
    db.source.findMany({
      orderBy: { code: 'asc' },
    }),
    db.alert.findMany({
      orderBy: { issuedAt: 'desc' },
      take: 200,
      include: { source: true },
    }),
    db.incident.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    db.fichaFIBER.findMany({
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Build aggregated stats inline (same logic as /api/stats)
  const alertsTotal = alertsRows.length;
  const bySource: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byState: Record<string, number> = {};
  for (const a of alertsRows) {
    bySource[a.source.code] = (bySource[a.source.code] ?? 0) + 1;
    bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;
    byCategory[a.category] = (byCategory[a.category] ?? 0) + 1;
    byState[a.state] = (byState[a.state] ?? 0) + 1;
  }

  const incidentsTotal = incidents.length;
  const byType: Record<string, number> = {};
  const byNature: Record<string, number> = {};
  const byStateInc: Record<string, number> = {};
  let active = 0;
  for (const i of incidents) {
    byType[i.type] = (byType[i.type] ?? 0) + 1;
    byNature[i.nature] = (byNature[i.nature] ?? 0) + 1;
    byStateInc[i.state] = (byStateInc[i.state] ?? 0) + 1;
    if (i.state === 'activa') active += 1;
  }

  const fichasTotal = fichas.length;
  const byRiskLevel: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byCommune: Record<string, number> = {};
  for (const f of fichas) {
    byRiskLevel[f.riskLevel] = (byRiskLevel[f.riskLevel] ?? 0) + 1;
    byStatus[f.status] = (byStatus[f.status] ?? 0) + 1;
    byCommune[f.commune] = (byCommune[f.commune] ?? 0) + 1;
  }

  return {
    sources: sources as unknown as Source[],
    alerts: alertsRows as unknown as ExportData['alerts'],
    incidents: incidents as unknown as Incident[],
    fichas: fichas as unknown as FichaFIBER[],
    stats: {
      alerts: {
        total: alertsTotal,
        bySource,
        bySeverity,
        byCategory,
        byState,
      },
      incidents: {
        total: incidentsTotal,
        byType,
        byNature,
        byState: byStateInc,
        active,
      },
      fichas: {
        total: fichasTotal,
        byRiskLevel,
        byStatus,
        byCommune,
      },
      sources: sources.length,
      generatedAt: new Date().toISOString(),
    },
    compliance: COMPLIANCE_PAYLOAD,
    generatedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Helpers de etiquetas (espejo de src/lib/severity.ts, sin importar React)
// ---------------------------------------------------------------------------
const SEVERITY_LABELS: Record<string, string> = {
  info: 'Info',
  watch: 'Vigilancia',
  warning: 'Alerta',
  critical: 'Crítica',
};

const SOURCE_LABELS: Record<string, string> = {
  senapred: 'SENAPRED',
  conaf: 'CONAF',
  shoa: 'SHOA',
  cbv2: 'CBV2',
  carabineros: 'Carabineros',
  chilquinta: 'Chilquinta',
};

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  incendio_forestal: 'Incendio forestal',
  incendio_urbano: 'Incendio urbano',
  sismo: 'Sismo',
  tsunami: 'Tsunami',
  inundacion: 'Inundación',
  deslizamiento: 'Deslizamiento',
  quimico: 'Químico',
  accidente: 'Accidente',
  delito: 'Delito',
  otro: 'Otro',
};

const INCIDENT_STATE_LABELS: Record<string, string> = {
  activa: 'Activa',
  contenida: 'Contenida',
  controlada: 'Controlada',
  cerrada: 'Cerrada',
};

const ALERT_STATE_LABELS: Record<string, string> = {
  activa: 'Activa',
  en_proceso: 'En proceso',
  cerrada: 'Cerrada',
};

const RISK_LEVEL_LABELS: Record<string, string> = {
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Medio',
  bajo: 'Bajo',
};

const FICHA_STATUS_LABELS: Record<string, string> = {
  registrada: 'Registrada',
  evaluada: 'Evaluada',
  derivada: 'Derivada',
  cerrada: 'Cerrada',
};

const CATEGORY_LABELS: Record<string, string> = {
  sismo: 'Sismo',
  incendio: 'Incendio',
  marea: 'Marea',
  meteorologica: 'Meteorológica',
  tsunami: 'Tsunami',
  quimico: 'Químico',
  inundacion: 'Inundación',
  seguridad: 'Seguridad',
  transito: 'Tránsito',
  radio: 'Radio',
};

export const LABELS = {
  severity: SEVERITY_LABELS,
  source: SOURCE_LABELS,
  incidentType: INCIDENT_TYPE_LABELS,
  incidentState: INCIDENT_STATE_LABELS,
  alertState: ALERT_STATE_LABELS,
  riskLevel: RISK_LEVEL_LABELS,
  fichaStatus: FICHA_STATUS_LABELS,
  category: CATEGORY_LABELS,
};

export function sourceLabel(code: string): string {
  return SOURCE_LABELS[code] ?? code;
}
export function severityLabel(sev: string): string {
  return SEVERITY_LABELS[sev] ?? sev;
}
export function incidentTypeLabel(t: string): string {
  return INCIDENT_TYPE_LABELS[t] ?? t;
}
export function incidentStateLabel(s: string): string {
  return INCIDENT_STATE_LABELS[s] ?? s;
}
export function riskLevelLabel(r: string): string {
  return RISK_LEVEL_LABELS[r] ?? r;
}
export function fichaStatusLabel(s: string): string {
  return FICHA_STATUS_LABELS[s] ?? s;
}
export function categoryLabel(c: string): string {
  return CATEGORY_LABELS[c] ?? c;
}

// ---------------------------------------------------------------------------
// Helpers de fecha y formato
// ---------------------------------------------------------------------------
export function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatLongDate(d: Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/** Enmascara un RUT dejando el formato XX.XXX.XXX-X visible pero con leyenda. */
export function formatRutForReport(rut: string | null | undefined): string {
  if (!rut) return '—';
  // Si el RUT ya viene formateado (XX.XXX.XXX-X) lo dejamos igual; si no, lo
  // pasamos por el formateador básico. No alteramos el DV porque ya está
  // calculado en el seed.
  const cleaned = rut.replace(/[^0-9kK-]/g, '');
  if (cleaned.includes('-')) return cleaned.toUpperCase();
  const m = rut.match(/^(\d{1,2})(\d{3})(\d{3})([0-9kK])$/);
  if (m) return `${m[1]}.${m[2]}.${m[3]}-${m[4].toUpperCase()}`;
  return rut;
}

/**
 * Genera el resumen ejecutivo en español humanizado para incluirlo en Word
 * y PDF. Se construye en función de los datos que se le pasan.
 */
export function buildResumenEjecutivo(data: ExportData): string[] {
  const activeIncidents = data.incidents.filter(
    (i) => i.state === 'activa',
  );
  const containedIncidents = data.incidents.filter(
    (i) => i.state === 'contenida',
  );
  const fichasCriticas = data.fichas.filter(
    (f) => f.riskLevel === 'critico' || f.riskLevel === 'alto',
  );
  const peopleAffected = data.incidents.reduce((s, i) => s + (i.affected ?? 0), 0);
  const peopleEvacuated = data.incidents.reduce(
    (s, i) => s + (i.evacuated ?? 0),
    0,
  );
  const criticalAlerts = data.alerts.filter(
    (a) => a.severity === 'critical' && a.state === 'activa',
  ).length;

  const paragraphs: string[] = [];

  paragraphs.push(
    `Este informe resume la situación de emergencias de la comuna de Viña del Mar, Región de Valparaíso, al cierre del ${formatLongDate(
      data.generatedAt,
    )}. La información se obtiene en tiempo real desde los siguientes canales oficiales: SENAPRED, CONAF, SHOA (meteorología y mareas), Cuerpo de Bomberos de Viña del Mar (CBV2), Carabineros de Chile y reportes de Radio.`,
  );

  const incParts: string[] = [];
  if (activeIncidents.length > 0) {
    const grouped: Record<string, number> = {};
    for (const i of activeIncidents) {
      grouped[i.type] = (grouped[i.type] ?? 0) + 1;
    }
    const parts = Object.entries(grouped).map(
      ([t, n]) => `${n} ${n === 1 ? incidentTypeLabel(t).toLowerCase() : incidentTypeLabel(t).toLowerCase() + 's'}`,
    );
    incParts.push(`Hoy hay ${parts.join(', ')} activo${activeIncidents.length === 1 ? '' : 's'} en la comuna`);
  } else {
    incParts.push('Hoy no hay incidentes activos en la comuna');
  }
  if (containedIncidents.length > 0) {
    incParts.push(
      `${containedIncidents.length} ${
        containedIncidents.length === 1 ? 'está contenido' : 'están contenidos'
      } y en proceso de cierre`,
    );
  }
  if (criticalAlerts > 0) {
    incParts.push(`se mantiene${criticalAlerts === 1 ? '' : 'n'} ${criticalAlerts} alerta${criticalAlerts === 1 ? '' : 's'} crítica${criticalAlerts === 1 ? '' : 's'} activa${criticalAlerts === 1 ? '' : 's'}`);
  }

  paragraphs.push(
    `${incParts.join('; ')}. ${
      peopleAffected > 0 || peopleEvacuated > 0
        ? `Hasta ahora se registran ${peopleAffected} ${
            peopleAffected === 1 ? 'persona afectada' : 'personas afectadas'
          } y ${peopleEvacuated} ${
            peopleEvacuated === 1 ? 'persona evacuada' : 'personas evacuadas'
          }.`
        : 'Hasta ahora no se registran personas afectadas ni evacuadas.'
    } El equipo de respuesta está coordinado con SENAPRED regional y los servicios de primera línea.`,
  );

  paragraphs.push(
    `En paralelo, el sistema mantiene ${data.fichas.length} fichas FIBER (registro de personas en situación de riesgo o vulnerabilidad) para la comuna. De ellas, ${fichasCriticas.length} están marcadas como riesgo crítico o alto y son prioridad para seguimiento y derivación. El cumplimiento normativo (SENAPRED, Ley 19.628 sobre datos personales, Ley 21.519 de ciberseguridad) se mantiene al día, con trazabilidad de cada acción en la bitácora de auditoría.`,
  );

  return paragraphs;
}

/** Recomendaciones en español humanizado */
export function buildRecomendaciones(data: ExportData): string[] {
  const recs: string[] = [];
  const activeIncidents = data.incidents.filter((i) => i.state === 'activa');
  const fichasCriticas = data.fichas.filter(
    (f) => f.riskLevel === 'critico' || f.riskLevel === 'alto',
  );
  const fichasEvac = data.fichas.filter((f) => f.needsEvacuation);

  if (activeIncidents.length > 0) {
    recs.push(
      'Mantener la coordinación con SENAPRED regional y los servicios de primera línea mientras los incidentes activos estén en curso. Comunicar a la población los canales oficiales (radio comunitaria, redes sociales municipales y portal de SENAPRED).',
    );
  } else {
    recs.push(
      'Aprovechar la baja en incidentes para revisar los planes de respuesta comunales y actualizar el censo de recursos de la Dirección de Emergencia Municipal (DEM).',
    );
  }

  if (fichasCriticas.length > 0) {
    recs.push(
      `Priorizar el contacto y seguimiento de las ${fichasCriticas.length} fichas FIBER con riesgo crítico o alto. Confirmar telefonía, contactos de emergencia y necesidades de medicación o movilidad.`,
    );
  } else {
    recs.push(
      'Revisar las fichas FIBER y completar los datos de contacto y necesidades de las personas registradas, especialmente en sectores costeros y quebradas.',
    );
  }

  if (fichasEvac.length > 0) {
    recs.push(
      `Tener listos los refugios temporales y los equipos de evacuación para las ${fichasEvac.length} fichas que requieren traslado ante una activación.`,
    );
  }

  recs.push(
    'Verificar el estado de las mareas con SHOA antes de actividades costeras o de pesca artesanal. En marea alta, vigilar caletas y desembocaduras de esteros.',
  );

  recs.push(
    'Reforzar la difusión del cumplimiento de la Ley 19.628 en el manejo de datos personales: cada nuevo ingreso o modificación de fichas e incidentes queda registrado en la bitácora de auditoría del sistema.',
  );

  return recs;
}
