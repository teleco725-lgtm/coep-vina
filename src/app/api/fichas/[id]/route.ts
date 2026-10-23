import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { writeAudit, extractRequestMeta } from "@/lib/audit";

/**
 * GET /api/fichas/[id]
 * Devuelve una ficha FIBER puntual por id.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ficha = await db.fichaFIBER.findUnique({ where: { id } });
    if (!ficha) {
      return NextResponse.json(
        { error: "Ficha no encontrada" },
        { status: 404 }
      );
    }
    return NextResponse.json(ficha);
  } catch (err) {
    console.error("[api/fichas/[id]] GET error:", err);
    return NextResponse.json(
      { error: "Error al obtener la ficha" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/fichas/[id]
 * Actualiza campos editables de la ficha (riesgo, estado, notas, asignación,
 * necesidades de evacuación, etc.). Escribe AuditLog (action=update).
 */
const patchSchema = z.object({
  riskLevel: z.enum(["bajo", "medio", "alto", "critico"]).optional(),
  status: z
    .enum(["registrada", "evaluada", "derivada", "cerrada"])
    .optional(),
  notes: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  needsEvacuation: z.boolean().optional(),
  needsMedication: z.boolean().optional(),
  needsMobility: z.boolean().optional(),
  vulnerability: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  householdSize: z.number().int().positive().optional(),
  hasPets: z.boolean().optional(),
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
    const existing = await db.fichaFIBER.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Ficha no encontrada" },
        { status: 404 }
      );
    }

    // Construimos el objeto de actualización respetando nullable vs undefined.
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) updateData[key] = value;
    }

    const updated = await db.fichaFIBER.update({
      where: { id },
      data: updateData,
    });

    const { ip, userAgent } = extractRequestMeta(req);
    await writeAudit({
      actor: "operador",
      action: "update",
      entity: "FichaFIBER",
      entityId: id,
      ip,
      userAgent,
      meta: {
        before: {
          riskLevel: existing.riskLevel,
          status: existing.status,
          needsEvacuation: existing.needsEvacuation,
        },
        after: {
          riskLevel: updated.riskLevel,
          status: updated.status,
          needsEvacuation: updated.needsEvacuation,
        },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[api/fichas/[id]] PATCH error:", err);
    return NextResponse.json(
      { error: "No se pudo actualizar la ficha" },
      { status: 500 }
    );
  }
}
