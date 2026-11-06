import { NextResponse } from "next/server";

/**
 * GET /api/compliance
 * "Panel de cumplimiento legal" — JSON estático que describe el marco normativo
 * chileno aplicable a este dashboard de emergencias (SENAPRED, protección de
 * datos Ley 19.628, ciberseguridad Ley 21.519, etc.). No requiere base de datos.
 *
 * Estructura:
 *   - frameworks      : marcos operativos de emergencias
 *   - dataProtection  : leyes de protección de datos personales
 *   - cybersecurity   : estándares / marcos de ciberseguridad
 *   - disasterLaws    : leyes específicas de protección civil / desastres
 *   - dataHandling    : principios, retención, cifrado y auditoría
 */
export async function GET() {
  const payload = {
    frameworks: [
      {
        id: "senapred",
        name: "SENAPRED - Ley 21.151",
        description:
          "Servicio Nacional de Prevención y Respuesta ante Desastres. Marco normativo para la gestión de emergencias y catástrofes en Chile, sucesor de la antigua ONEMI.",
        url: "https://www.senapred.cl",
        obligations: [
          "Mantener un sistema de información de emergencias actualizado y trazable",
          "Coordinar la respuesta con organismos de primera línea (Bomberos, Carabineros, Salud, SHOA, CONAF)",
          "Difundir alertas oficiales a la población de forma oportuna",
          "Llevar registro de incidentes y catástrofes para análisis post-evento",
        ],
      },
      {
        id: "politica_seguridad_escolar",
        name: "Política Nacional de Seguridad Escolar",
        description:
          "Marco orientador del MINEDUC y SENAPRED para la planificación de evacuación y resguardo de la comunidad escolar ante emergencias.",
        url: "https://www.mineduc.cl",
        obligations: [
          "Identificar estudiantes y docentes con necesidades de evacuación especial (movilidad reducida, salud crónica)",
          "Mantener fichas de bienestar y riesgo actualizadas por establecimiento",
        ],
      },
      {
        id: "onemi_legacy",
        name: "ONEMI - Sistema Nacional de Protección Civil (legado)",
        description:
          "Antecedentes del Sistema Nacional de Protección Civil que SENAPRED administra hoy. Incluye el Plan de Protección Civil Comunal obligatorio para cada municipalidad.",
        url: "https://www.senapred.cl/onemi/",
        obligations: [
          "Plan de Protección Civil Comunal actualizado anualmente",
          "Censo de recursos y capacidades comunales",
          "Bitácora de operaciones y novedades",
        ],
      },
      {
        id: "plan_dmc",
        name: "Plan DMC - Dirección de Emergencia Municipal",
        description:
          "Plan de respuesta de la Dirección Municipal de Emergencia. Define roles, cadena de mando y procedimientos de activación en cada comuna.",
        url: "https://www.senapred.cl",
        obligations: [
          "Activar Comité de Operaciones de Emergencia (COE) ante alerta grave",
          "Coordinar refugios temporales y evacuación de zonas de riesgo",
          "Reportar a SENAPRED regional los incidentes relevantes",
        ],
      },
    ],
    dataProtection: [
      {
        id: "ley1209272",
        name: "Ley 21.726 - Protección de Datos Personales",
        description:
          "Ley sobre protección de datos de carácter personal. Obliga al responsable a garantizar confidencialidad, finalidad y seguridad de los datos. Las fichas de registro operativo, al contener datos sensibles (salud, ubicación, RUT), requieren consentimiento informado y resguardo.",
        url: "https://www.bcn.cl/leychile/navegar?idNorma=1209272",
      },
      {
        id: "ley21099",
        name: "Ley 21.099 - Fortalecimiento de la Transparencia y Probidad",
        description:
          "Amplía el alcance de transparencia activa de los órganos de la Administración del Estado. Aplica a SENAPRED y municipalidades que administren datos de emergencias.",
        url: "https://www.bcn.cl/leychile/navegar?idNorma=1127813",
      },
      {
        id: "ley21519",
        name: "Ley 21.519 - Marco de Ciberseguridad de Chile",
        description:
          "Crea la Agencia Nacional de Ciberseguridad (ANCI) y define obligaciones para servicios esenciales. Un sistema de emergencias comunales se considera servicio esencial.",
        url: "https://www.bcn.cl/leychile/navegar?idNorma=1202434",
      },
    ],
    cybersecurity: [
      {
        id: "iso27001",
        name: "ISO/IEC 27001 - Gestión de Seguridad de la Información",
        description:
          "Estándar internacional que define un Sistema de Gestión de Seguridad de la Información (SGSI). Recomendado para todo sistema que maneje datos sensibles de personas en emergencias.",
        url: "https://www.iso.org/standard/27001",
      },
      {
        id: "nist",
        name: "NIST CSF - Framework de Ciberseguridad",
        description:
          "Marco del NIST (Identificar, Proteger, Detectar, Responder, Recuperar). Sirve de guía para alinear controles técnicos y organizacionales del dashboard.",
        url: "https://www.nist.gov/cyberframework",
      },
      {
        id: "csirt",
        name: "CSIRT Nacional - Equipo de Respuesta ante Incidentes",
        description:
          "Equipo nacional (ANCI / Gobierno de Chile) que coordina la respuesta a incidentes de ciberseguridad que afecten servicios esenciales como la gestión de emergencias.",
        url: "https://www.gob.cl/ciberseguridad/",
      },
      {
        id: "owasp",
        name: "OWASP Top 10 - Buenas prácticas de desarrollo seguro",
        description:
          "Catálogo de los 10 riesgos más comunes en aplicaciones web. Aplica a las APIs y formularios de registro de fichas e incidentes.",
        url: "https://owasp.org/Top10/",
      },
    ],
    disasterLaws: [
      {
        id: "ley21151",
        name: "Ley 21.151 - SENAPRED",
        description:
          "Crea el Servicio Nacional de Prevención y Respuesta ante Desastres, reemplazando a ONEMI. Define el Sistema Nacional de Prevención y Respuesta ante Desastres.",
        url: "https://www.bcn.cl/leychile/navegar?idNorma=1128557",
      },
      {
        id: "dfl536",
        name: "DFL N°536 - Sistema Nacional de Protección Civil (ONEMI)",
        description:
          "Cuerpo legal que originó el Sistema Nacional de Protección Civil y el rol de la ONEMI. Base histórica para los planes comunales de emergencia.",
        url: "https://www.bcn.cl/leychile/navegar?idNorma=1096038",
      },
      {
        id: "plan_dae",
        name: "Plan DAE - Plan de Acción ante Emergencias y Catástrofes",
        description:
          "Plan operativo que cada municipalidad debe mantener para activar la respuesta ante emergencias y catástrofes en su territorio.",
        url: "https://www.senapred.cl",
      },
      {
        id: "ley1036936",
        name: "Ley 18.243 - Cuerpo de Bomberos",
        description:
          "Norma que regula la organización y funcionamiento del Cuerpo de Bomberos. Marco para el registro de incidentes atendidos por CBV2.",
        url: "https://www.bcn.cl/leychile/navegar?idNorma=1036936",
      },
    ],
    dataHandling: {
      principles: [
        "Minimización de datos",
        "Finalidad",
        "Confidencialidad",
        "Integridad",
        "Disponibilidad",
        "Trazabilidad",
      ],
      retention:
        "Las fichas de registro operativo se conservan mientras dure la emergencia + 5 años (estándar SENAPRED)",
      encryption:
        "Cifrado en tránsito (TLS) y en reposo (Neon PostgreSQL con acceso restringido)",
      audit:
        "Toda acción sobre fichas, alertas e incidentes se registra en AuditLog (Ley de Protección de Datos Personales art. 2)",
      backup: "Respaldo diario incremental y mensual completo en Neon PostgreSQL",
      access:
        "Acceso basado en roles (admin / supervisor / operador). Gestión de credenciales bajo control del administrador del sistema.",
      consent:
        "El registro de una ficha de registro operativo implica consentimiento informado del titular para uso en gestión de emergencias.",
      denuncia: "Denunciar irregularidades: http://denunciasfibe.cl/",
      validacion: "Validar ficha: https://mifibe.gob.cl/",
    },
  };

  return NextResponse.json(payload, {
    headers: {
      // El panel es estático; podemos cachear agresivamente del lado cliente.
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
