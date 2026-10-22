'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
} from 'recharts';
import { PieChartIcon, BarChart3, Loader2 } from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

import { useAlertsSocket } from '@/hooks/use-alerts-socket';
import type { ApiStats, Incident } from '@/lib/types';
import { sourceShortLabel, sourceColor } from '@/lib/severity';

interface ChartsPanelProps {
  incidents: Incident[];
  incidentsLoading: boolean;
}

// Palette for the charts — uses CSS vars so dark mode works.
const CHART_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'oklch(0.65 0.10 250)',
  'oklch(0.55 0.08 60)',
];

export function ChartsPanel({ incidents, incidentsLoading }: ChartsPanelProps) {
  const { stats } = useAlertsSocket();
  const [apiStats, setApiStats] = useState<ApiStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ApiStats | null) => {
        if (!cancelled) setApiStats(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Pie: alertas por fuente (from socket stats bySource) ----
  const pieData = useMemo(() => {
    const bySource = stats?.bySource ?? apiStats?.alerts.bySource ?? {};
    return Object.entries(bySource)
      .map(([code, value]) => ({
        name: sourceShortLabel(code),
        code,
        value,
        color: sourceColor(code),
      }))
      .sort((a, b) => b.value - a.value);
  }, [stats, apiStats]);

  // ---- Bar: incidentes por tipo (from /api/incidents or /api/stats) ----
  const barData = useMemo(() => {
    const fromIncidents: Record<string, number> = {};
    for (const i of incidents) {
      fromIncidents[i.type] = (fromIncidents[i.type] ?? 0) + 1;
    }
    const source =
      Object.keys(fromIncidents).length > 0
        ? fromIncidents
        : apiStats?.incidents.byType ?? {};
    return Object.entries(source)
      .map(([type, value]) => ({
        name: type.replace(/_/g, ' '),
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [incidents, apiStats]);

  const totalAlerts = stats?.total ?? apiStats?.alerts.total ?? 0;
  const totalIncidents = incidents.length || apiStats?.incidents.total || 0;

  return (
    <Card className="flex h-full flex-col gap-3 p-4">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          Distribución de Eventos
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <Tabs defaultValue="fuentes" className="flex h-full flex-col gap-3">
          <TabsList className="w-full">
            <TabsTrigger value="fuentes" className="flex-1">
              <PieChartIcon className="h-3.5 w-3.5" />
              Fuentes
            </TabsTrigger>
            <TabsTrigger value="tipos" className="flex-1">
              <BarChart3 className="h-3.5 w-3.5" />
              Tipos
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="fuentes"
            className="flex min-h-[18rem] flex-col gap-2"
          >
            <p className="text-xs text-muted-foreground">
              Alertas por fuente · buffer en vivo ·{' '}
              <strong className="tabular-nums">{totalAlerts}</strong> total
            </p>
            {pieData.length === 0 ? (
              <div className="flex h-[16rem] items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Esperando datos del WS…
              </div>
            ) : (
              <div className="h-[16rem] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={36}
                      paddingAngle={2}
                      isAnimationActive
                    >
                      {pieData.map((entry) => (
                        <Cell
                          key={`cell-${entry.code}`}
                          fill={entry.color}
                          stroke="var(--background)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                        color: 'var(--popover-foreground)',
                      }}
                      formatter={(value: number) => [`${value} alertas`, '']}
                    />
                    <RechartsLegend
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="tipos"
            className="flex min-h-[18rem] flex-col gap-2"
          >
            <p className="text-xs text-muted-foreground">
              Incidentes por tipo · persistido en BD ·{' '}
              <strong className="tabular-nums">{totalIncidents}</strong> total
            </p>
            {incidentsLoading && barData.length === 0 ? (
              <Skeleton className="h-[16rem] w-full" />
            ) : barData.length === 0 ? (
              <div className="flex h-[16rem] items-center justify-center text-sm text-muted-foreground">
                Sin incidentes registrados.
              </div>
            ) : (
              <div className="h-[16rem] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, bottom: 4, left: 12 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      opacity={0.4}
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      width={90}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        fontSize: '12px',
                        color: 'var(--popover-foreground)',
                      }}
                      formatter={(value: number) => [
                        `${value} incidentes`,
                        '',
                      ]}
                    />
                    <Bar
                      dataKey="value"
                      radius={[0, 4, 4, 0]}
                      isAnimationActive
                    >
                      {barData.map((entry, idx) => (
                        <Cell
                          key={`bar-${entry.name}`}
                          fill={CHART_PALETTE[idx % CHART_PALETTE.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
