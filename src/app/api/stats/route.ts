import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/stats
 * Devuelve estadísticas agregadas desde la base de datos persistida.
 * Complementa el evento `stats` en vivo del WebSocket (que se calcula desde
 * el buffer en memoria del mini-service).
 */
export async function GET() {
  try {
    const [alerts, incidents, fichas, sources] = await Promise.all([
      db.alert.findMany({ select: { source: { select: { code: true } }, severity: true, category: true, state: true } }),
      db.incident.findMany({ select: { type: true, nature: true, state: true } }),
      db.fichaFIBER.findMany({ select: { riskLevel: true, status: true, commune: true } }),
      db.source.count(),
    ]);

    // ---- Alerts ----
    const bySource: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byState: Record<string, number> = {};
    for (const a of alerts) {
      const sc = a.source?.code ?? "desconocido";
      bySource[sc] = (bySource[sc] ?? 0) + 1;
      bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;
      byCategory[a.category] = (byCategory[a.category] ?? 0) + 1;
      byState[a.state] = (byState[a.state] ?? 0) + 1;
    }

    // ---- Incidents ----
    const byType: Record<string, number> = {};
    const byNature: Record<string, number> = {};
    const byIncidentState: Record<string, number> = {};
    let active = 0;
    for (const i of incidents) {
      byType[i.type] = (byType[i.type] ?? 0) + 1;
      byNature[i.nature] = (byNature[i.nature] ?? 0) + 1;
      byIncidentState[i.state] = (byIncidentState[i.state] ?? 0) + 1;
      if (i.state !== "cerrada") active += 1;
    }

    // ---- Fichas ----
    const byRiskLevel: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byCommune: Record<string, number> = {};
    for (const f of fichas) {
      byRiskLevel[f.riskLevel] = (byRiskLevel[f.riskLevel] ?? 0) + 1;
      byStatus[f.status] = (byStatus[f.status] ?? 0) + 1;
      byCommune[f.commune] = (byCommune[f.commune] ?? 0) + 1;
    }

    return NextResponse.json({
      alerts: {
        total: alerts.length,
        bySource,
        bySeverity,
        byCategory,
        byState,
      },
      incidents: {
        total: incidents.length,
        byType,
        byNature,
        byState: byIncidentState,
        active,
      },
      fichas: {
        total: fichas.length,
        byRiskLevel,
        byStatus,
        byCommune,
      },
      sources,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api/stats] Error:", err);
    // Devolvemos estructura vacía válida para no romper el frontend.
    return NextResponse.json({
      alerts: { total: 0, bySource: {}, bySeverity: {}, byCategory: {}, byState: {} },
      incidents: { total: 0, byType: {}, byNature: {}, byState: {}, active: 0 },
      fichas: { total: 0, byRiskLevel: {}, byStatus: {}, byCommune: {} },
      sources: 0,
      generatedAt: new Date().toISOString(),
    });
  }
}
