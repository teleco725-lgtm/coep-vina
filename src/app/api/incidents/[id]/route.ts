import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { writeAudit, extractRequestMeta } from "@/lib/audit";

/**
 * PATCH /api/incidents/[id]
 * Actualiza el estado, severidad, personas afectadas/evacuadas, recursos y/o
 * la fecha de cierre de un incidente existente. Escribe AuditLog (action=update).
 */
const patchSchema = z.object({
  state: z
    .enum(["activa", "contenida", "controlada", "cerrada"])
    .optional(),
  severity: z
    .enum(["info", "watch", "warning", "critical"])
    .optional(),
  affected: z.number().int().nonnegative().optional(),
  evacuated: z.number().int().nonnegative().optional(),
  resources: z.string().optional().nullable(),
  closedAt: z.coerce.date().optional().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo JSON inválido" },
      { status: 400 }
    );
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validación fallida", issues: parsed.error.issues },
      { status: 422 }
    );
  }
  const data = parsed.data;

  try {
    const existing = await db.incident.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Incidente no encontrado" },
        { status: 404 }
      );
    }

    const updated = await db.incident.update({
      where: { id },
      data: {
        ...(data.state !== undefined ? { state: data.state } : {}),
        ...(data.severity !== undefined ? { severity: data.severity } : {}),
        ...(data.affected !== undefined ? { affected: data.affected } : {}),
        ...(data.evacuated !== undefined ? { evacuated: data.evacuated } : {}),
        ...(data.resources !== undefined ? { resources: data.resources } : {}),
        ...(data.closedAt !== undefined ? { closedAt: data.closedAt } : {}),
      },
    });

    const { ip, userAgent } = extractRequestMeta(req);
    await writeAudit({
      actor: "operador",
      action: "update",
      entity: "Incident",
      entityId: id,
      ip,
      userAgent,
      meta: {
        before: {
          state: existing.state,
          severity: existing.severity,
          affected: existing.affected,
          evacuated: existing.evacuated,
        },
        after: {
          state: updated.state,
          severity: updated.severity,
          affected: updated.affected,
          evacuated: updated.evacuated,
        },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[api/incidents/[id]] PATCH error:", err);
    return NextResponse.json(
      { error: "No se pudo actualizar el incidente" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/incidents/[id]
 * Devuelve un incidente puntual por id (utilidad para el frontend).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const incident = await db.incident.findUnique({ where: { id } });
    if (!incident) {
      return NextResponse.json(
        { error: "Incidente no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(incident);
  } catch (err) {
    console.error("[api/incidents/[id]] GET error:", err);
    return NextResponse.json(
      { error: "Error al obtener el incidente" },
      { status: 500 }
    );
  }
}
