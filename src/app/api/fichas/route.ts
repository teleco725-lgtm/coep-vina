import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { writeAudit, extractRequestMeta } from "@/lib/audit";

/**
 * Genera el siguiente código de ficha con formato FIBER-{AÑO}-{XXXXX}.
 * Busca el número máximo ya existente para el año actual y suma 1.
 */
async function generateFiberCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `FIBER-${year}-`;
  const existing = await db.fichaFIBER.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });
  let max = 0;
  for (const f of existing) {
    const n = parseInt(f.code.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  const next = (max + 1).toString().padStart(5, "0");
  return `${prefix}${next}`;
}

/** Prioridad de riesgo para ordenar (critico > alto > medio > bajo). */
const RISK_PRIORITY: Record<string, number> = {
  critico: 0,
  alto: 1,
  medio: 2,
  bajo: 3,
};

/**
 * GET /api/fichas
 * Devuelve fichas FIBER ordenadas por prioridad de riesgo (critico > alto > medio > bajo)
 * y luego por updatedAt DESC.
 *
 * Query params:
 *   - commune   (texto libre)
 *   - riskLevel (critico | alto | medio | bajo)
 *   - status    (registrada | evaluada | derivada | cerrada)
 *   - limit     (default 100)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitRaw = Number(searchParams.get("limit") ?? 100);
    const limit = Math.min(
      Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 100),
      500
    );

    const commune = searchParams.get("commune");
    const riskLevel = searchParams.get("riskLevel");
    const status = searchParams.get("status");

    const fichas = await db.fichaFIBER.findMany({
      where: {
        ...(commune ? { commune } : {}),
        ...(riskLevel ? { riskLevel } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });

    // Ordenamiento por prioridad de riesgo (SQLite no soporta orderBy con CASE
    // directamente a través de Prisma sin raw SQL; ordenamos en JS, que para
    // volúmenes de fichas de emergencia es trivial).
    fichas.sort((a, b) => {
      const pa = RISK_PRIORITY[a.riskLevel] ?? 99;
      const pb = RISK_PRIORITY[b.riskLevel] ?? 99;
      if (pa !== pb) return pa - pb;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    return NextResponse.json(fichas.slice(0, limit));
  } catch (err) {
    console.error("[api/fichas] GET error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

/**
 * POST /api/fichas
 * Crea una nueva FichaFIBER. El código se autogenera (FIBER-2025-XXXXX).
 * Escribe AuditLog (action=create, entity=FichaFIBER).
 */
const fichaSchema = z.object({
  fullName: z.string().min(1),
  rut: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  commune: z.string().default("Viña del Mar"),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  ageRange: z
    .enum(["0-17", "18-29", "30-59", "60+"])
    .optional()
    .nullable(),
  riskLevel: z.enum(["bajo", "medio", "alto", "critico"]).default("bajo"),
  vulnerability: z.string().optional().nullable(),
  householdSize: z.number().int().positive().default(1),
  hasPets: z.boolean().default(false),
  needsMedication: z.boolean().default(false),
  needsMobility: z.boolean().default(false),
  needsEvacuation: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  status: z
    .enum(["registrada", "evaluada", "derivada", "cerrada"])
    .default("registrada"),
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

  const parsed = fichaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validación fallida", issues: parsed.error.issues },
      { status: 422 }
    );
  }
  const data = parsed.data;

  try {
    const code = await generateFiberCode();
    const ficha = await db.fichaFIBER.create({
      data: {
        code,
        fullName: data.fullName,
        rut: data.rut ?? null,
        address: data.address ?? null,
        commune: data.commune,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        ageRange: data.ageRange ?? null,
        riskLevel: data.riskLevel,
        vulnerability: data.vulnerability ?? null,
        householdSize: data.householdSize,
        hasPets: data.hasPets,
        needsMedication: data.needsMedication,
        needsMobility: data.needsMobility,
        needsEvacuation: data.needsEvacuation,
        status: data.status,
        notes: data.notes ?? null,
        assignedTo: data.assignedTo ?? null,
      },
    });

    const { ip, userAgent } = extractRequestMeta(req);
    await writeAudit({
      actor: "operador",
      action: "create",
      entity: "FichaFIBER",
      entityId: ficha.id,
      ip,
      userAgent,
      meta: {
        code: ficha.code,
        riskLevel: ficha.riskLevel,
        needsEvacuation: ficha.needsEvacuation,
      },
    });

    return NextResponse.json(ficha, { status: 201 });
  } catch (err) {
    console.error("[api/fichas] POST error:", err);
    return NextResponse.json(
      { error: "No se pudo crear la ficha FIBER" },
      { status: 500 }
    );
  }
}
