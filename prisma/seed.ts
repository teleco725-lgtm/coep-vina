/**
 * ============================================================================
 * Seed - Dashboard de Emergencias Viña del Mar (CODEM-VDM)
 * ============================================================================
 *
 * Puebla la base SQLite con datos realistas para desarrollo:
 *   - 7 Source  (senapred, conaf, shoa, guardiamarina, cbv2, carabineros, radio)
 *   - ~15 Incident  (incendio_forestal, sismo, inundacion, quimico, etc.)
 *   - ~12 FichaFIBER  (variedad de riesgo / estado / comuna)
 *   - algunos AuditLog
 *
 * Es idempotente: usa `upsert` por campos únicos (Source.code, FichaFIBER.code).
 *
 * Ejecutar:  bun prisma/seed.ts   (script npm: db:seed)
 * ============================================================================
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// ----------------------------------------------------------------------------
// Utilidades
// ----------------------------------------------------------------------------

/** Calcula el dígito verificador chileno (RUT). */
function computeRutVD(num: number): string {
  let sum = 0;
  let mul = 2;
  const s = num.toString();
  for (let i = s.length - 1; i >= 0; i--) {
    sum += parseInt(s[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const mod = 11 - (sum % 11);
  if (mod === 11) return "0";
  if (mod === 10) return "K";
  return mod.toString();
}

/** Formatea un número como RUT XX.XXX.XXX-X. */
function formatRut(num: number): string {
  const s = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${s}-${computeRutVD(num)}`;
}

/** Horas atrás, helper para timestamps. */
function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}
function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

// ----------------------------------------------------------------------------
// Sources (7) — idempotente por `code`
// ----------------------------------------------------------------------------
const SOURCES = [
  {
    code: "senapred",
    name: "SENAPRED - Servicio Nacional de Prevención y Respuesta ante Desastres",
    description:
      "Alertas oficiales del Servicio Nacional de Prevención y Respuesta ante Desastres (Ley 21.151).",
    severity: "watch",
  },
  {
    code: "conaf",
    name: "CONAF / COGRIG - Corporación Nacional Forestal",
    description:
      "Alertas de incendios forestales y manejo del fuego (COGRIG Región de Valparaíso).",
    severity: "warning",
  },
  {
    code: "shoa",
    name: "SHOA - Servicio Hidrográfico y Oceanográfico de la Armada",
    description:
      "Alertas de mareas, mareas de fondo y tsunamis. Boletines hidrográficos del litoral.",
    severity: "info",
  },
  {
    code: "guardiamarina",
    name: "Guardia Marina de Chile",
    description:
      "Avisos de seguridad costera y operaciones en el mar (litoral de Viña del Mar).",
    severity: "info",
  },
  {
    code: "cbv2",
    name: "Cuerpo de Bomberos de Viña del Mar 2da Compañía",
    description:
      "Despachos e incidentes atendidos por la 2da Compañía de Bomberos de Viña del Mar.",
    severity: "warning",
  },
  {
    code: "carabineros",
    name: "Carabineros de Chile",
    description:
      "Avisos de seguridad ciudadana y hechos delictuales de la 1ra. Comisaría de Viña del Mar.",
    severity: "info",
  },
  {
    code: "radio",
    name: "Red de Radio de Emergencias",
    description:
      "Comunicaciones de radio de emergencia y radioperiodismo de la zona.",
    severity: "info",
  },
];

// ----------------------------------------------------------------------------
// Incidents (~15) — todos dentro de la comuna de Viña del Mar ÚNICAMENTE
// ----------------------------------------------------------------------------
// Centro Viña ~ -33.0245, -71.5517. Rango comunal: lat -33.005 a -33.055, lng -71.575 a -71.525
const INCIDENTS = [
  {
    type: "incendio_forestal",
    nature: "natural" as const,
    severity: "critical",
    state: "activa",
    title: "Incendio forestal quebrada de Forestal",
    description:
      "Foco activo en ladera oriente del cerro, avanzando hacia sectores poblados. Viento sur-este 25 km/h.",
    lat: -33.0432,
    lng: -71.5491,
    commune: "Viña del Mar",
    address: "Quebrada de Forestal, altura Parcela 12",
    radiusMeters: 1200,
    affected: 850,
    evacuated: 420,
    resources: "4 carros bomba, 2 helicópteros COGRIG, brigada CONAF 18 personas",
    meta: { wind_kmh: 25, humidity: 28, fuel: "pino eucalipto" },
  },
  {
    type: "incendio_urbano",
    nature: "antropico" as const,
    severity: "warning",
    state: "contenida",
    title: "Incendio en edificio departamentos 15 Norte",
    description:
      "Conato en departamento 4°. Bomberos controló foco principal. Evaluación estructural pendiente.",
    lat: -33.0248,
    lng: -71.5412,
    commune: "Viña del Mar",
    address: "Av. San Martín 1450, depto 402",
    radiusMeters: 200,
    affected: 60,
    evacuated: 48,
    resources: "CBV2 — 3 carros bomba, 1 escala",
    meta: { floors: 8 },
  },
  {
    type: "sismo",
    nature: "natural" as const,
    severity: "watch",
    state: "cerrada",
    title: "Sismo magnitud 5.2 - costa de Viña del Mar",
    description:
      "Sismo de profundidad intermedia sentido en Viña del Mar. Sin daños reportados.",
    lat: -33.035,
    lng: -71.57,
    commune: "Viña del Mar",
    address: "Mar, 32 km al SO",
    radiusMeters: 30000,
    affected: 0,
    evacuated: 0,
    resources: "Reconocimiento de SHOA y SENAPRED",
    meta: { magnitude: 5.2, depth_km: 42 },
  },
  {
    type: "inundacion",
    nature: "natural" as const,
    severity: "warning",
    state: "activa",
    title: "Anegamiento canal Margen Sur",
    description:
      "Lluvia intensa provocó desborde de canal. Tránsito interrumpido en Av. Valparaíso.",
    lat: -33.0312,
    lng: -71.5479,
    commune: "Viña del Mar",
    address: "Canal Margen Sur con Av. Valparaíso",
    radiusMeters: 400,
    affected: 220,
    evacuated: 90,
    resources: "Bomberos, Municipalidad Viña (maquinaria)",
    meta: { rainfall_mm: 48 },
  },
  {
    type: "deslizamiento",
    nature: "natural" as const,
    severity: "critical",
    state: "activa",
    title: "Deslizamiento cerro Achupallas",
    description:
      "Deslizamiento de tierra afecta 4 viviendas en la ladera. Evacuación preventiva en curso.",
    lat: -33.0488,
    lng: -71.5553,
    commune: "Viña del Mar",
    address: "Cerro Achupallas, pasaje Los Almendros",
    radiusMeters: 250,
    affected: 38,
    evacuated: 38,
    resources: "Defensa Civil, Carabineros, Bomberos",
    meta: { volume_m3: 600 },
  },
  {
    type: "quimico",
    nature: "antropico" as const,
    severity: "critical",
    state: "contenida",
    title: "Fuga amoníaco sector industrial Viña",
    description:
      "Fuga de amoníaco en bodega industrial. Perímetro de seguridad establecido 800 m.",
    lat: -33.042,
    lng: -71.528,
    commune: "Viña del Mar",
    address: "Parque Industrial Viña del Mar, galpón 4",
    radiusMeters: 800,
    affected: 150,
    evacuated: 150,
    resources: "CBV2, SIICH/SIIT, mutual aid",
    meta: { substance: "amoníaco", ppm: 35 },
  },
  {
    type: "accidente",
    nature: "antropico" as const,
    severity: "watch",
    state: "cerrada",
    title: "Choque múltiple Ruta 68 acceso Viña",
    description:
      "Choque múltiple en acceso a Viña del Mar. Tránsito restablecido tras retiro de vehículos.",
    lat: -33.0209,
    lng: -71.5587,
    commune: "Viña del Mar",
    address: "Ruta 68 km 105",
    radiusMeters: 300,
    affected: 6,
    evacuated: 0,
    resources: "Carabineros, SAMU",
    meta: { vehicles: 4 },
  },
  {
    type: "delito",
    nature: "antropico" as const,
    severity: "info",
    state: "activa",
    title: "Asalto a comercio Av. San Martín",
    description:
      "Asalto a mano armada a supermercado. Carabineros realiza pesquisa sectorial.",
    lat: -33.027,
    lng: -71.544,
    commune: "Viña del Mar",
    address: "Av. San Martín con calle 5 Norte",
    radiusMeters: 200,
    affected: 12,
    evacuated: 0,
    resources: "Carabineros 1ra Comisaría VDM",
    meta: { suspects: 2, weapon: "arma blanca" },
  },
  {
    type: "incendio_forestal",
    nature: "natural" as const,
    severity: "warning",
    state: "contenida",
    title: "Incendio forestal cerro La Víbora (borde)",
    description:
      "Foco combatido por brigada CONAF. Condiciones de viento favorables para control total.",
    lat: -33.041,
    lng: -71.5561,
    commune: "Viña del Mar",
    address: "Borde quebrada La Víbora",
    radiusMeters: 600,
    affected: 0,
    evacuated: 15,
    resources: "Brigada CONAF 8 personas, 1 helicóptero",
    meta: { controlled_pct: 70 },
  },
  {
    type: "inundacion",
    nature: "natural" as const,
    severity: "info",
    state: "cerrada",
    title: "Anegamiento calle Álvarez",
    description:
      "Anegamiento puntual por precipitación. Tránsito normalizado.",
    lat: -33.0405,
    lng: -71.5318,
    commune: "Viña del Mar",
    address: "Av. Álvarez esq. Baquedano",
    radiusMeters: 150,
    affected: 20,
    evacuated: 0,
    resources: "Municipalidad Viña del Mar",
    meta: { rainfall_mm: 22 },
  },
  {
    type: "accidente",
    nature: "antropico" as const,
    severity: "warning",
    state: "activa",
    title: "Volcamiento bus Av. Borgoño",
    description:
      "Bus de locomoción colectiva volcó en curva. Múltiples heridos, atención en curso.",
    lat: -33.019,
    lng: -71.528,
    commune: "Viña del Mar",
    address: "Av. Borgoño km 6",
    radiusMeters: 250,
    affected: 32,
    evacuated: 0,
    resources: "SAMU, CBV2, Carabineros",
    meta: { injured: 8, critical: 2 },
  },
  {
    type: "delito",
    nature: "antropico" as const,
    severity: "watch",
    state: "activa",
    title: "Hurto en viviendas cerro Miraflores",
    description:
      "Serie de hurtos en viviendas del cerro Miraflores. Patrullaje intensificado.",
    lat: -33.037,
    lng: -71.528,
    commune: "Viña del Mar",
    address: "Cerro Miraflores, calle Los Pinos",
    radiusMeters: 400,
    affected: 9,
    evacuated: 0,
    resources: "Carabineros 1ra Comisaría VDM",
    meta: { incidents: 5 },
  },
  {
    type: "quimico",
    nature: "antropico" as const,
    severity: "watch",
    state: "contenida",
    title: "Derrame de aceite en caleta Viña",
    description:
      "Derrame de aceite desde embarcación en caleta. Capitanía de Puerto despliega barreras.",
    lat: -33.015,
    lng: -71.548,
    commune: "Viña del Mar",
    address: "Caleta Higuerillas, sitio 3",
    radiusMeters: 500,
    affected: 0,
    evacuated: 0,
    resources: "Capitanía de Puerto, Armada, SHOA monitoreo",
    meta: { substance: "aceite diésel", liters: 400 },
  },
  {
    type: "incendio_urbano",
    nature: "antropico" as const,
    severity: "critical",
    state: "cerrada",
    title: "Incendio local comercial calle Valparaíso",
    description:
      "Incendio controlado en local comercial del centro de Viña. Investigación en curso.",
    lat: -33.025,
    lng: -71.548,
    commune: "Viña del Mar",
    address: "Calle Valparaíso 1100",
    radiusMeters: 100,
    affected: 5,
    evacuated: 25,
    resources: "CBV2 — 4 carros bomba",
    meta: { cause: "cortocircuito (presunto)" },
  },
  {
    type: "sismo",
    nature: "natural" as const,
    severity: "info",
    state: "cerrada",
    title: "Sismo magnitud 3.8 - interior Viña",
    description:
      "Sismo leve sentido en Viña del Mar. Sin reportes de daños.",
    lat: -33.02,
    lng: -71.55,
    commune: "Viña del Mar",
    address: "Interior, 8 km NE",
    radiusMeters: 10000,
    affected: 0,
    evacuated: 0,
    resources: "Monitoreo SHOA",
    meta: { magnitude: 3.8, depth_km: 22 },
  },
];

// ----------------------------------------------------------------------------
// Fichas FIBER (~12)
// ----------------------------------------------------------------------------
const FICHAS = [
  {
    fullName: "María Elena Soto Vásquez",
    rut: formatRut(12345678),
    address: "Pasaje Los Olmos 124, Recreo",
    commune: "Viña del Mar",
    lat: -33.032,
    lng: -71.533,
    phone: "+56 32 234 5678",
    email: "maria.soto@example.cl",
    ageRange: "60+",
    riskLevel: "critico",
    vulnerability: "Movilidad reducida (silla de ruedas), hipertensión crónica",
    householdSize: 2,
    hasPets: true,
    needsMedication: true,
    needsMobility: true,
    needsEvacuation: true,
    notes: "Vive con hijo adulto. Requiere rampa de acceso para evacuación.",
    assignedTo: "T.S. Pamela Rojas",
    status: "evaluada",
  },
  {
    fullName: "Joaquín Andrés Muñoz Carvajal",
    rut: formatRut(98765432),
    address: "Calle 6 Norte 185, depto 3",
    commune: "Viña del Mar",
    lat: -33.028,
    lng: -71.538,
    phone: "+56 9 8123 4567",
    email: "j.munoz@example.cl",
    ageRange: "30-59",
    riskLevel: "medio",
    vulnerability: "Diabetes tipo 2",
    householdSize: 4,
    hasPets: false,
    needsMedication: true,
    needsMobility: false,
    needsEvacuation: false,
    notes: "Familia con dos escolares. Requiere plan de evacuación colegio.",
    assignedTo: "T.S. Pamela Rojas",
    status: "registrada",
  },
  {
    fullName: "Clara Beatriz Núñez Araneda",
    rut: formatRut(15678901),
    address: "Subida Agua Santa 245, cerro Castillo",
    commune: "Viña del Mar",
    lat: -33.045,
    lng: -71.526,
    phone: "+56 32 318 9090",
    email: "clara.nunez@example.cl",
    ageRange: "60+",
    riskLevel: "alto",
    vulnerability: "Enfermedad cardiovascular, vive sola",
    householdSize: 1,
    hasPets: true,
    needsMedication: true,
    needsMobility: false,
    needsEvacuation: true,
    notes: "Acceso por escaleras, difícil para vehículos de emergencia.",
    assignedTo: "T.S. Roberto Fuentes",
    status: "derivada",
  },
  {
    fullName: "Ignacio Esteban Bravo Loyola",
    rut: formatRut(18456789),
    address: "Av. Borgoño 800, sector Marga-Marga",
    commune: "Viña del Mar",
    lat: -33.023,
    lng: -71.528,
    phone: "+56 9 7234 5678",
    email: "ignacio.bravo@example.cl",
    ageRange: "18-29",
    riskLevel: "bajo",
    vulnerability: "Sin condiciones crónicas",
    householdSize: 1,
    hasPets: false,
    needsMedication: false,
    needsMobility: false,
    needsEvacuation: false,
    notes: "Trabajador de planta industrial. Capaz de ayudar en evacuación.",
    assignedTo: null,
    status: "registrada",
  },
  {
    fullName: "Sofía Catalina Reyes Tapia",
    rut: formatRut(20123456),
    address: "Av. San Martín 1450",
    commune: "Viña del Mar",
    lat: -33.025,
    lng: -71.541,
    phone: "+56 32 259 1212",
    email: "sofia.reyes@example.cl",
    ageRange: "30-59",
    riskLevel: "medio",
    vulnerability: "Asma severa",
    householdSize: 3,
    hasPets: true,
    needsMedication: true,
    needsMobility: false,
    needsEvacuation: false,
    notes: "Requiere oxígeno concentrado ante cortes de energía.",
    assignedTo: "T.S. Roberto Fuentes",
    status: "evaluada",
  },
  {
    fullName: "Pedro Hugo Salinas Aravena",
    rut: formatRut(11223344),
    address: "Calle 4 Poniente 56",
    commune: "Viña del Mar",
    lat: -33.037,
    lng: -71.547,
    phone: "+56 9 9012 3456",
    email: "pedro.salinas@example.cl",
    ageRange: "60+",
    riskLevel: "alto",
    vulnerability: "EPOC, uso de oxígeno domiciliario",
    householdSize: 2,
    hasPets: false,
    needsMedication: true,
    needsMobility: true,
    needsEvacuation: true,
    notes: "Bomberos debe estar al tanto de tanques de O2 en evacuación.",
    assignedTo: "T.S. Pamela Rojas",
    status: "derivada",
  },
  {
    fullName: "Daniela Paz Fuentes Cisternas",
    rut: formatRut(23456789),
    address: "Av. San Martín 1200, depto 9",
    commune: "Viña del Mar",
    lat: -33.026,
    lng: -71.543,
    phone: "+56 32 218 4567",
    email: "daniela.fuentes@example.cl",
    ageRange: "18-29",
    riskLevel: "bajo",
    vulnerability: "Sin condiciones crónicas",
    householdSize: 1,
    hasPets: false,
    needsMedication: false,
    needsMobility: false,
    needsEvacuation: false,
    notes: "Voluntaria de Cruz Roja, disponible como apoyo.",
    assignedTo: null,
    status: "cerrada",
  },
  {
    fullName: "Alejandro Ignacio Reyes Pino",
    rut: formatRut(34567890),
    address: "Pasaje El Sauce 12, Achupallas",
    commune: "Viña del Mar",
    lat: -33.056,
    lng: -71.552,
    phone: "+56 9 8456 7890",
    email: "alejandro.reyes@example.cl",
    ageRange: "30-59",
    riskLevel: "critico",
    vulnerability: "Hemodiálisis - 3 sesiones/semana",
    householdSize: 5,
    hasPets: false,
    needsMedication: true,
    needsMobility: false,
    needsEvacuation: true,
    notes: "Necesita traslado asegurado al centro de diálisis ante emergencia.",
    assignedTo: "T.S. Pamela Rojas",
    status: "evaluada",
  },
  {
    fullName: "Rosa del Carmen Bravo Henríquez",
    rut: formatRut(14567890),
    address: "Calle Cochrane 230, Recreo Alto",
    commune: "Viña del Mar",
    lat: -33.036,
    lng: -71.529,
    phone: "+56 32 292 3344",
    email: "rosa.bravo@example.cl",
    ageRange: "60+",
    riskLevel: "alto",
    vulnerability: "Demencia senil leve, vive con hija",
    householdSize: 2,
    hasPets: true,
    needsMedication: false,
    needsMobility: true,
    needsEvacuation: true,
    notes: "Identificación con pulsera. Cuidadora es la hija, Ana Bravo.",
    assignedTo: "T.S. Roberto Fuentes",
    status: "derivada",
  },
  {
    fullName: "Matías Ignacio Soto Lizana",
    rut: formatRut(19023456),
    address: "Av. Borgoño 1240, sector coastal",
    commune: "Viña del Mar",
    lat: -33.019,
    lng: -71.528,
    phone: "+56 9 6123 4567",
    email: "matias.soto@example.cl",
    ageRange: "0-17",
    riskLevel: "medio",
    vulnerability: "Trastorno del espectro autista, sensible a ruido",
    householdSize: 3,
    hasPets: true,
    needsMedication: false,
    needsMobility: false,
    needsEvacuation: true,
    notes: "Usar protectores auditivos en evacuación. Mantener con cuidador.",
    assignedTo: "T.S. Pamela Rojas",
    status: "evaluada",
  },
  {
    fullName: "Camila Andrea Lobos Vergara",
    rut: formatRut(17890123),
    address: "Av. Valparaíso 980, depto 12",
    commune: "Viña del Mar",
    lat: -33.025,
    lng: -71.542,
    phone: "+56 9 5678 9012",
    email: "camila.lobos@example.cl",
    ageRange: "30-59",
    riskLevel: "bajo",
    vulnerability: "Sin condiciones crónicas",
    householdSize: 1,
    hasPets: false,
    needsMedication: false,
    needsMobility: false,
    needsEvacuation: false,
    notes: "Trabaja en zona céntrica, disponible para apoyo.",
    assignedTo: null,
    status: "registrada",
  },
  {
    fullName: "Hernán Eduardo Cárdenas Maldonado",
    rut: formatRut(20198765),
    address: "Calle Freire 145, cerro Bellavista (VDM)",
    commune: "Viña del Mar",
    lat: -33.033,
    lng: -71.529,
    phone: "+56 32 218 0909",
    email: "hernan.cardenas@example.cl",
    ageRange: "60+",
    riskLevel: "medio",
    vulnerability: "Cirugía de cadera reciente",
    householdSize: 1,
    hasPets: false,
    needsMedication: true,
    needsMobility: true,
    needsEvacuation: false,
    notes: "En recuperación. Movilidad limitada pero sin evacuación inmediata.",
    assignedTo: "T.S. Roberto Fuentes",
    status: "evaluada",
  },
];

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
async function main() {
  console.log("→ Seed iniciado");

  // 1) Sources
  console.log(`• Upsert ${SOURCES.length} fuentes...`);
  for (const s of SOURCES) {
    await db.source.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        description: s.description,
        severity: s.severity,
        region: "Valparaíso",
        enabled: true,
      },
      create: {
        code: s.code,
        name: s.name,
        description: s.description,
        severity: s.severity,
        region: "Valparaíso",
        enabled: true,
      },
    });
  }

  // 2) Incidents — borramos previos (semilla) para mantener idempotencia simple.
  console.log(`• Upsert ${INCIDENTS.length} incidentes...`);
  // Sin campo único natural: usamos marca `meta.seedId` para localizar y actualizar.
  // Para mantener idempotencia, eliminamos los incidentes sembrados anteriormente
  // (todos cuyo meta contiene la marca `seed:true`) y los recreamos.
  await db.incident.deleteMany({
    where: { meta: { contains: '"seed":true' } },
  });
  for (const inc of INCIDENTS) {
    await db.incident.create({
      data: {
        type: inc.type,
        nature: inc.nature,
        severity: inc.severity,
        state: inc.state,
        title: inc.title,
        description: inc.description,
        lat: inc.lat,
        lng: inc.lng,
        commune: inc.commune,
        address: inc.address,
        radiusMeters: inc.radiusMeters,
        affected: inc.affected,
        evacuated: inc.evacuated,
        resources: inc.resources,
        meta: JSON.stringify({ ...inc.meta, seed: true }),
        // Los cerrados/contenidos más antiguos llevan closedAt para realismo.
        closedAt:
          inc.state === "cerrada"
            ? hoursAgo(2 + Math.floor(Math.random() * 12))
            : null,
      },
    });
  }

  // 3) Fichas FIBER — idempotente por `code`
  console.log(`• Upsert ${FICHAS.length} fichas FIBER...`);
  const year = new Date().getFullYear();
  for (let i = 0; i < FICHAS.length; i++) {
    const f = FICHAS[i];
    const code = `FIBER-${year}-${(i + 1).toString().padStart(5, "0")}`;
    const data = {
      code,
      fullName: f.fullName,
      rut: f.rut,
      address: f.address,
      commune: f.commune,
      lat: f.lat,
      lng: f.lng,
      phone: f.phone,
      email: f.email,
      ageRange: f.ageRange,
      riskLevel: f.riskLevel,
      vulnerability: f.vulnerability,
      householdSize: f.householdSize,
      hasPets: f.hasPets,
      needsMedication: f.needsMedication,
      needsMobility: f.needsMobility,
      needsEvacuation: f.needsEvacuation,
      status: f.status,
      notes: f.notes,
      assignedTo: f.assignedTo,
    };
    await db.fichaFIBER.upsert({
      where: { code },
      update: data,
      create: data,
    });
  }

  // 4) AuditLog — algunas entradas de ejemplo (idempotente: solo si la tabla está vacía).
  console.log("• AuditLog (entradas de ejemplo)...");
  const auditCount = await db.auditLog.count();
  if (auditCount === 0) {
    await db.auditLog.createMany({
      data: [
        {
          actor: "sistema",
          action: "create",
          entity: "Source",
          entityId: null,
          meta: JSON.stringify({ note: "Carga inicial de fuentes (seed)" }),
          createdAt: daysAgo(3),
        },
        {
          actor: "operador",
          action: "create",
          entity: "Incident",
          entityId: null,
          meta: JSON.stringify({ note: "Registro de incidente sembrado", seed: true }),
          createdAt: hoursAgo(8),
        },
        {
          actor: "operador",
          action: "create",
          entity: "FichaFIBER",
          entityId: null,
          meta: JSON.stringify({ note: "Fichas FIBER sembradas para demo" }),
          createdAt: hoursAgo(4),
        },
        {
          actor: "supervisor",
          action: "view",
          entity: "FichaFIBER",
          entityId: null,
          meta: JSON.stringify({ filter: "critico" }),
          createdAt: hoursAgo(2),
        },
        {
          actor: "operador",
          action: "update",
          entity: "Incident",
          entityId: null,
          meta: JSON.stringify({ field: "state", from: "activa", to: "contenida" }),
          createdAt: hoursAgo(1),
        },
      ],
    });
  }

  console.log("✓ Seed completado");
}

main()
  .catch((err) => {
    console.error("Seed falló:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
