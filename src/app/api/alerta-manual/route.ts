import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { writeAudit, extractRequestMeta } from "@/lib/audit";

/**
 * GET /api/alerta-manual
 * Devuelve alertas manuales confirmadas por operadores.
 * Filtra por fecha de hoy (America/Santiago) y comuna Viña del Mar.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const soloHoy = url.searchParams.get("hoy") !== "false";

    const now = new Date();
    const chileTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
    const startOfToday = new Date(chileTime.getFullYear(), chileTime.getMonth(), chileTime.getDate());

    const where: Record<string, unknown> = {
      comuna: "Viña del Mar",
    };
    if (soloHoy) {
      where.fechaEvento = { gte: startOfToday };
    }

    const alertas = await db.alertaManual.findMany({
      where,
      orderBy: { fechaEvento: "desc" },
    });

    return NextResponse.json(alertas);
  } catch (err) {
    console.error("[api/alerta-manual] GET error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

const alertaManualSchema = z.object({
  fuente: z.enum(["senapred", "shoa", "cbv2", "carabineros", "chilquinta", "munivina"]),
  titulo: z.string().min(1),
  descripcion: z.string().optional().nullable(),
  categoria: z.string().default("otro"),
  severidad: z.enum(["info", "watch", "warning", "critical"]).default("info"),
  comuna: z.string().default("Viña del Mar"),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  urlFuente: z.string().url().optional().nullable(),
  operador: z.string().min(1),
  fechaEvento: z.string().datetime(),
});

/**
 * POST /api/alerta-manual
 * Registra una alerta confirmada manualmente por un operador.
 * Requiere: fuente, titulo, operador, fechaEvento.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = alertaManualSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validación fallida", issues: parsed.error.issues }, { status: 422 });
  }

  const d = parsed.data;

  try {
    const alerta = await db.alertaManual.create({
      data: {
        fuente: d.fuente,
        titulo: d.titulo,
        descripcion: d.descripcion ?? null,
        categoria: d.categoria,
        severidad: d.severidad,
        comuna: d.comuna,
        lat: d.lat ?? null,
        lng: d.lng ?? null,
        urlFuente: d.urlFuente ?? null,
        operador: d.operador,
        fechaEvento: new Date(d.fechaEvento),
        estado: "activa",
      },
    });

    const { ip, userAgent } = extractRequestMeta(req);
    await writeAudit({
      actor: d.operador,
      action: "create",
      entity: "AlertaManual",
      entityId: alerta.id,
      ip,
      userAgent,
      meta: { fuente: d.fuente, titulo: d.titulo },
    });

    return NextResponse.json(alerta, { status: 201 });
  } catch (err) {
    console.error("[api/alerta-manual] POST error:", err);
    return NextResponse.json({ error: "No se pudo crear la alerta" }, { status: 500 });
  }
}

/**
 * PATCH /api/alerta-manual/[id]
 * Cierra una alerta manual (cambia estado a "cerrada").
 */
export async function PATCH(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const alerta = await db.alertaManual.update({
      where: { id },
      data: { estado: "cerrada", closedAt: new Date() },
    });

    return NextResponse.json(alerta);
  } catch (err) {
    console.error("[api/alerta-manual] PATCH error:", err);
    return NextResponse.json({ error: "No se pudo cerrar la alerta" }, { status: 500 });
  }
}
