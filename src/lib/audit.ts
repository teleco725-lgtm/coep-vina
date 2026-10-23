import { db } from "@/lib/db";

/**
 * Helper para escribir entradas en la bitácora de auditoría (Ley 19.628 / Ley 21.099).
 * Toda acción sobre fichas, alertas e incidentes debe quedar registrada para trazabilidad.
 */
export interface AuditInput {
  actor?: string;
  action: string; // create | update | delete | login | view
  entity: string; // Alert | FichaFIBER | Incident | Source
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown> | null;
}

export async function writeAudit(input: AuditInput) {
  try {
    await db.auditLog.create({
      data: {
        actor: input.actor ?? "sistema",
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        meta: input.meta ? JSON.stringify(input.meta) : null,
      },
    });
  } catch (err) {
    // No queremos que la auditoría rompa la operación principal del endpoint.
    console.error("[audit] No se pudo escribir AuditLog:", err);
  }
}

/** Extrae IP y User-Agent desde una Request de Next.js para el AuditLog. */
export function extractRequestMeta(req: Request) {
  const headers = req.headers ?? new Headers();
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    null;
  const userAgent = headers.get("user-agent") || null;
  return { ip, userAgent };
}
