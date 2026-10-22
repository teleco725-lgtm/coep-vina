'use client';

import { useEffect, useMemo, useState } from 'react';
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

// Palette for the bar chart — uses CSS vars so dark mode works.
const BAR_PALETTE = [
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

  // Donut chart (SVG native, no recharts) — lightweight for the bundler.
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0) || 1;
  const slices = pieData.reduce<
    Array<{
      name: string;
      code: string;
      value: number;
      color: string;
      startAngle: number;
      angle: number;
      fraction: number;
    }>
  >((acc, d) => {
    const fraction = d.value / pieTotal;
    const startAngle = acc.length > 0 ? acc[acc.length - 1].startAngle + acc[acc.length - 1].angle : 0;
    const angle = fraction * 360;
    return [...acc, { ...d, startAngle, angle, fraction }];
  }, []);

  // SVG arc helper for donut slices.
  function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }
  function describeSlice(
    cx: number,
    cy: number,
    rOuter: number,
    rInner: number,
    startAngle: number,
    endAngle: number,
  ) {
    const startOuter = polarToCartesian(cx, cy, rOuter, endAngle);
    const endOuter = polarToCartesian(cx, cy, rOuter, startAngle);
    const startInner = polarToCartesian(cx, cy, rInner, endAngle);
    const endInner = polarToCartesian(cx, cy, rInner, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return [
      `M ${startOuter.x} ${startOuter.y}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
      `L ${endInner.x} ${endInner.y}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 1 ${startInner.x} ${startInner.y}`,
      'Z',
    ].join(' ');
  }

  const maxBar = barData.reduce((m, d) => Math.max(m, d.value), 0) || 1;

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
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                {/* Donut SVG */}
                <svg
                  viewBox="0 0 160 160"
                  className="h-[10rem] w-[10rem] shrink-0"
                  aria-label="Distribución de alertas por fuente"
                  role="img"
                >
                  {slices.map((s) => (
                    <path
                      key={s.code}
                      d={describeSlice(80, 80, 70, 36, s.startAngle, s.startAngle + s.angle)}
                      fill={s.color}
                      stroke="var(--background)"
                      strokeWidth={2}
                    >
                      <title>
                        {s.name}: {s.value} alertas ({(s.fraction * 100).toFixed(0)}%)
                      </title>
                    </path>
                  ))}
                  <text
                    x="80"
                    y="76"
                    textAnchor="middle"
                    className="fill-foreground text-[16px] font-bold"
                  >
                    {pieTotal}
                  </text>
                  <text
                    x="80"
                    y="92"
                    textAnchor="middle"
                    className="fill-muted-foreground text-[8px]"
                  >
                    alertas
                  </text>
                </svg>
                {/* Legend */}
                <ul className="flex flex-col gap-1.5 text-xs">
                  {slices.map((s) => (
                    <li key={s.code} className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: s.color }}
                        aria-hidden
                      />
                      <span className="text-foreground">{s.name}</span>
                      <span className="ml-auto tabular-nums text-muted-foreground">
                        {s.value}
                      </span>
                    </li>
                  ))}
                </ul>
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
              <div className="flex h-[16rem] flex-col justify-center gap-2">
                {barData.map((d, idx) => {
                  const pct = (d.value / maxBar) * 100;
                  return (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-[7.5rem] shrink-0 truncate text-muted-foreground">
                        {d.name}
                      </span>
                      <div className="relative h-4 flex-1 overflow-hidden rounded-sm bg-muted/40">
                        <div
                          className="h-full rounded-sm transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: BAR_PALETTE[idx % BAR_PALETTE.length],
                          }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right font-medium tabular-nums">
                        {d.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
