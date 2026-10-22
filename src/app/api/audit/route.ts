import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/audit
 * Bitácora de auditoría (ciberseguridad / protección de datos - Ley 19.628 / Ley 21.099).
 *
 * Query params:
 *   - limit  (default 100, máximo 500)
 *   - entity (Alert | FichaFIBER | Incident | Source)
 *   - actor  (texto libre)
 *   - action (create | update | delete | login | view)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitRaw = Number(searchParams.get("limit") ?? 100);
    const limit = Math.min(Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 100), 500);

    const entity = searchParams.get("entity");
    const actor = searchParams.get("actor");
    const action = searchParams.get("action");

    const where: Prisma.AuditLogWhereInput = {};
    if (entity) where.entity = entity;
    if (actor) where.actor = actor;
    if (action) where.action = action;

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (err) {
    console.error("[api/audit] Error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
