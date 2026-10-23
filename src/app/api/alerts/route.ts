import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/alerts
 * Historial persistido de alertas (el feed en tiempo real llega por WebSocket).
 *
 * Query params:
 *   - limit    (default 50, máximo 200)
 *   - source   (filtra por Source.code: senapred | conaf | shoa | guardiamarina | cbv2 | carabineros | radio)
 *   - severity (info | watch | warning | critical)
 *   - category (sismo | incendio | marea | meteorologica | tsunami | quimico | inundacion | seguridad | transito | radio)
 *   - state    (activa | en_proceso | cerrada)
 *   - commune  (texto libre, p.ej. "Viña del Mar")
 *
 * Devuelve alertas ordenadas por issuedAt DESC, incluyendo la relación `source`
 * para que el frontend pueda mostrar sourceName sin otra consulta.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitRaw = Number(searchParams.get("limit") ?? 50);
    const limit = Math.min(Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50), 200);

    const sourceCode = searchParams.get("source");
    const severity = searchParams.get("severity");
    const category = searchParams.get("category");
    const state = searchParams.get("state");
    const commune = searchParams.get("commune");

    const where: Prisma.AlertWhereInput = {};
    if (severity) where.severity = severity;
    if (category) where.category = category;
    if (state) where.state = state;
    if (commune) where.commune = commune;
    if (sourceCode) where.source = { code: sourceCode };

    const alerts = await db.alert.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      take: limit,
      include: { source: true },
    });

    return NextResponse.json(alerts);
  } catch (err) {
    console.error("[api/alerts] Error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
