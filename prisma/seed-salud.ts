/**
 * Seed del Directorio de Salud de Viña del Mar
 * Dato estático fijo — verificar vigencia trimestralmente
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const CENTROS_SALUD = [
  { nombre: "Ambulancia Viña del Mar", tipo: "ambulancia", telefono: "32-2684328 / 791" },
  { nombre: "CECOSF Santa Julia", tipo: "cecosf", telefono: "32 2867233" },
  { nombre: "Centro Zona V de Valparaíso", tipo: "cesfam", telefono: "32 3132471", direccion: "3 Poniente 261" },
  { nombre: "CESFAM Brígida Zavala", tipo: "cesfam", telefono: "32 2581776", direccion: "Blanca Vergara 1794" },
  { nombre: "CESFAM Gómez Carreño", tipo: "cesfam", telefono: "32 2832319", direccion: "19 Poniente 5650" },
  { nombre: "CESFAM Las Torres", tipo: "cesfam", telefono: "800 500 870" },
  { nombre: "CESFAM Lusitania", tipo: "cesfam", telefono: "32 2272342", direccion: "García Lorca 101" },
  { nombre: "CESFAM Marco Maldonado", tipo: "cesfam", telefono: "32 2272361", direccion: "Álvarez 1682" },
  { nombre: "CESFAM Prof. Eugenio Cienfuegos", tipo: "cesfam", telefono: "32 2780262" },
  { nombre: "CESFAM Reñaca Alto Dr. Jorge Kaplan", tipo: "cesfam", telefono: "32 2873368", direccion: "Av. Quinta 875" },
  { nombre: "Clínica Miraflores", tipo: "clinica", telefono: "32 2389900", direccion: "Los Fresnos 276" },
  { nombre: "Clínica Reñaca", tipo: "clinica", telefono: "32 2656000", direccion: "Jardín del Mar 336" },
  { nombre: "Hospital Clínico Viña del Mar", tipo: "hospital", telefono: "32 2323800", direccion: "Limache 1741" },
  { nombre: "Hospital Dr. Gustavo Fricke", tipo: "hospital", telefono: "32 2577571", direccion: "Álvarez 1532" },
  { nombre: "Hospital de Niños y Cunas", tipo: "hospital", telefono: "32 2385000", direccion: "Limache 1667" },
  { nombre: "Megasalud Centro Viña del Mar", tipo: "megasalud", telefono: "32 3241445", direccion: "3 Norte 464" },
  { nombre: "SAPU Gómez Carreño", tipo: "sapu", telefono: "32 2832319" },
  { nombre: "SAPU Las Torres", tipo: "sapu", telefono: "800 500 870" },
  { nombre: "SAPU Nueva Aurora", tipo: "sapu", telefono: "32 2611419" },
  { nombre: "SAPU Reñaca Alto", tipo: "sapu", telefono: "32 2873368", direccion: "Av. Quinta 875" },
];

async function main() {
  console.log("→ Seed Directorio de Salud");
  await db.centroSalud.deleteMany({});
  for (const c of CENTROS_SALUD) {
    await db.centroSalud.create({
      data: {
        nombre: c.nombre,
        tipo: c.tipo,
        telefono: c.telefono,
        direccion: c.direccion ?? null,
        comuna: "Viña del Mar",
        ultimaVerificacion: new Date(),
      },
    });
  }
  console.log(`✓ ${CENTROS_SALUD.length} centros de salud cargados`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
