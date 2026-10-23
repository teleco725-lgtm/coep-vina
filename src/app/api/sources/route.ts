import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/sources
 * Devuelve todas las fuentes integradas (SENAPRED, CONAF, SHOA, Guardia Marina,
 * CBV2, Carabineros, Radio) ordenadas por código, incluyendo el conteo actual
 * de alertas por fuente para que el frontend pueda mostrar badges.
 */
export async function GET() {
  try {
    const sources = await db.source.findMany({
      orderBy: { code: "asc" },
      include: {
        _count: {
          select: { alerts: true },
        },
      },
    });
    return NextResponse.json(sources);
  } catch (err) {
    console.error("[api/sources] Error:", err);
    // Si la base está vacía o hay error de conexión, devolvemos array vacío.
    return NextResponse.json([], { status: 200 });
  }
}
