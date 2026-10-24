import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { writeAudit, extractRequestMeta } from "@/lib/audit";

/**
 * GET /api/incidents
 * Devuelve incidentes georreferenciados filtrados por:
 *   - comuna = 'Viña del Mar' (siempre)
 *   - fecha de hoy (createdAt >= inicio de hoy en America/Santiago)
 *   - excluye incendios cerrados/contenidos de dias anteriores
 * Usado para poblar el mapa de catástrofes del dashboard con datos REALES.
 */
export async function GET() {
  try {
    // Calcular inicio de hoy en zona horaria de Chile (America/Santiago)
    const now = new Date();
    const chileTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
    const startOfToday = new Date(chileTime.getFullYear(), chileTime.getMonth(), chileTime.getDate());

    const incidents = await db.incident.findMany({
      where: {
        commune: 'Viña del Mar',
        createdAt: { gte: startOfToday },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(incidents);
  } catch (err) {
    console.error("[api/incidents] GET error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

/**
 * POST /api/incidents
 * Registra manualmente una nueva catástrofe/incidente georreferenciado.
 * Escribe AuditLog (action=create, entity=Incident).
 */
const incidentSchema = z.object({
  type: z.string().min(1),
  nature: z.enum(["natural", "antropico"]).default("natural"),
  severity: z.enum(["info", "watch", "warning", "critical"]).default("info"),
  state: z
    .enum(["activa", "contenida", "controlada", "cerrada"])
    .default("activa"),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  lat: z.number(),
  lng: z.number(),
  commune: z.string().default("Viña del Mar"),
  address: z.string().optional().nullable(),
  radiusMeters: z.number().int().nonnegative().default(500),
  affected: z.number().int().nonnegative().default(0),
  evacuated: z.number().int().nonnegative().default(0),
  resources: z.string().optional().nullable(),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo JSON inválido" },
      { status: 400 }
    );
  }

  const parsed = incidentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validación fallida", issues: parsed.error.issues },
      { status: 422 }
    );
  }
  const data = parsed.data;

  try {
    const incident = await db.incident.create({
      data: {
        type: data.type,
        nature: data.nature,
        severity: data.severity,
        state: data.state,
        title: data.title,
        description: data.description ?? null,
        lat: data.lat,
        lng: data.lng,
        commune: data.commune,
        address: data.address ?? null,
        radiusMeters: data.radiusMeters,
        affected: data.affected,
        evacuated: data.evacuated,
        resources: data.resources ?? null,
        meta: data.meta ? JSON.stringify(data.meta) : null,
      },
    });

    const { ip, userAgent } = extractRequestMeta(req);
    await writeAudit({
      actor: "operador",
      action: "create",
      entity: "Incident",
      entityId: incident.id,
      ip,
      userAgent,
      meta: {
        type: incident.type,
        severity: incident.severity,
        title: incident.title,
      },
    });

    return NextResponse.json(incident, { status: 201 });
  } catch (err) {
    console.error("[api/incidents] POST error:", err);
    return NextResponse.json(
      { error: "No se pudo crear el incidente" },
      { status: 500 }
    );
  }
}
