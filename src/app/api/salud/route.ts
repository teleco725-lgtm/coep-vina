import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/salud
 * Devuelve el directorio de salud de Viña del Mar (dato estático fijo).
 * No requiere filtro de fecha — es una lista de contactos, no alertas.
 */
export async function GET() {
  try {
    const centros = await db.centroSalud.findMany({
      orderBy: [{ tipo: "asc" }, { nombre: "asc" }],
    });
    return NextResponse.json(centros);
  } catch (err) {
    console.error("[api/salud] GET error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
