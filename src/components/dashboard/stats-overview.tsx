'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertOctagon,
  Flame,
  Users,
  RadioTower,
  TrendingUp,
  Activity,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { useAlertsSocket } from '@/hooks/use-alerts-socket';
import { filtrarAlertasVigentes } from '@/lib/pipeline-ttl';
import type { ApiStats, Incident } from '@/lib/types';

interface StatsOverviewProps {
  incidents: Incident[];
  incidentsLoading: boolean;
}

export function StatsOverview({
  incidents,
  incidentsLoading,
}: StatsOverviewProps) {
  const { alerts, stats, status } = useAlertsSocket();
  const [apiStats, setApiStats] = useState<ApiStats | null>(null);

  // Fetch /api/stats para fichas críticas/altas y fuentes.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ApiStats | null) => {
        if (!cancelled && data) setApiStats(data);
      })
      .catch(() => {
        /* noop */
      });
    return () => {
      cancelled = true;
    };
  }, [incidents, incidentsLoading]);

  // --- KPI computations ---
  // Total alertas activas: usamos el pipeline TTL para contar SOLO las
  // alertas vigentes (dentro de TTL, mismo día, no cerradas/informativas).
  // Esto evita contar incendios terminados o boletines obsoletos como activos.
  const alertasVigentes = filtrarAlertasVigentes(alerts);
  const activeAlerts = alertasVigentes.length;

  // Incidentes activos: SOLO los que tienen estado 'activa' (no 'contenida',
  // 'controlada' ni 'cerrada'). Los incidentes 'contenida'/'controlada' son
  // eventos que ya se resolvieron y NO deben contarse como emergencias vivas.
  const activeIncidents = incidents.filter((i) => i.state === 'activa').length;

  // Fichas críticas + altas
  const fichasCriticasAltas = apiStats
    ? (apiStats.fichas.byRiskLevel.critico ?? 0) +
      (apiStats.fichas.byRiskLevel.alto ?? 0)
    : 0;

  const sourcesConnected =
    apiStats?.sources ??
    (stats ? Object.keys(stats.bySource).length : 0);

  const kpis = [
    {
      id: 'active-alerts',
      label: 'Alertas Activas',
      value: activeAlerts,
      sublabel: `vigentes de ${alerts.length} en buffer WS`,
      Icon: AlertOctagon,
      iconColor: 'text-sev-critical',
      bgIcon: 'bg-sev-critical/10',
      trend: status === 'connected' ? 'EN VIVO' : 'CARGANDO',
      trendColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'active-incidents',
      label: 'Incidentes Activos',
      value: incidentsLoading ? null : activeIncidents,
      sublabel: activeIncidents === 0
        ? 'Nivel 0 (Normalidad) — Panel Depurado'
        : `hoy en Viña del Mar de ${incidents.length} registrados`,
      Icon: Flame,
      iconColor: activeIncidents === 0 ? 'text-emerald-600' : 'text-sev-warning',
      bgIcon: 'bg-sev-warning/10',
      trend: '+',
      trendColor: 'text-muted-foreground',
    },
    {
      id: 'fichas-criticas',
      label: 'Fichas FIBER Críticas/Altas',
      value: apiStats ? fichasCriticasAltas : null,
      sublabel: `de ${apiStats?.fichas.total ?? 0} fichas`,
      Icon: Users,
      iconColor: 'text-sev-watch',
      bgIcon: 'bg-sev-watch/20',
      trend: apiStats ? 'RIESGO' : '',
      trendColor: 'text-sev-critical',
    },
    {
      id: 'sources',
      label: 'Fuentes Conectadas',
      value: sourcesConnected,
      sublabel: 'SENAPRED · CONAF · SHOA · …',
      Icon: RadioTower,
      iconColor: 'text-primary',
      bgIcon: 'bg-primary/10',
      trend: 'OK',
      trendColor: 'text-emerald-600 dark:text-emerald-400',
    },
  ];

  return (
    <section
      aria-label="Indicadores clave"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {kpis.map((kpi, idx) => (
        <motion.div
          key={kpi.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.05 }}
        >
          <Card className="h-full">
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between">
                <div className={`rounded-md p-2 ${kpi.bgIcon}`}>
                  <kpi.Icon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold ${kpi.trendColor}`}
                >
                  {kpi.id === 'active-alerts' && (
                    <Activity className="h-3 w-3" />
                  )}
                  {kpi.trend}
                </span>
              </div>
              <div className="flex flex-col">
                {kpi.value === null ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <span
                    className="text-3xl font-bold tabular-nums leading-none"
                    aria-live="polite"
                  >
                    {kpi.value}
                  </span>
                )}
                <span className="mt-1 text-sm font-medium text-foreground">
                  {kpi.label}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {kpi.sublabel}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>CODEM-VDM · {new Date().getFullYear()}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </section>
  );
}
