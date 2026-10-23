'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  PieChartIcon,
  BarChart3,
  Loader2,
  Waves,
  Droplets,
  TrendingDown,
  Minus,
} from 'lucide-react';

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
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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
  const { stats, alerts } = useAlertsSocket();
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

  // ---- Mareas: SHOA alerts with category 'marea' ----
  // The mini-service broadcasts SHOA alerts with category 'marea' and
  // subcategory 'alta' | 'media' | 'baja'. We surface them in a dedicated
  // tab with a horizontal gauge and a clear, readable legend.
  const mareaAlerts = useMemo(() => {
    const seen = new Set<string>();
    return alerts.filter((a) => {
      if (a.sourceCode !== 'shoa' || a.category !== 'marea') return false;
      if (seen.has(a.id)) return false; // dedup
      seen.add(a.id);
      return true;
    });
  }, [alerts]);
  const currentMarea = mareaAlerts[0] ?? null;
  const recentMareas = mareaAlerts.slice(0, 5);

  type TideLevel = 'baja' | 'media' | 'alta';
  const currentLevel: TideLevel | null =
    currentMarea?.subcategory === 'alta' ||
    currentMarea?.subcategory === 'media' ||
    currentMarea?.subcategory === 'baja'
      ? (currentMarea.subcategory as TideLevel)
      : null;

  const TIDE_SEGMENTS: Array<{
    level: TideLevel;
    label: string;
    short: string;
    color: string;
    description: string;
    icon: typeof Droplets;
  }> = [
    {
      level: 'baja',
      label: 'Marea Baja (Bajamar)',
      short: 'Baja',
      color: 'oklch(0.55 0.16 240)', // azul marino
      description:
        'El mar está en su punto más bajo. Buen momento para revisar el litoral, embarcaciones varadas y faenas de pesca.',
      icon: TrendingDown,
    },
    {
      level: 'media',
      label: 'Marea Media',
      short: 'Media',
      color: 'oklch(0.62 0.10 200)', // teal mar
      description:
        'El mar está en un nivel intermedio. Condiciones normales para actividades costeras, manteniendo vigilancia.',
      icon: Minus,
    },
    {
      level: 'alta',
      label: 'Marea Alta (Pleamar)',
      short: 'Alta',
      color: 'oklch(0.62 0.18 35)', // naranja-rojo
      description:
        'El mar alcanza su nivel máximo. Vigilar zonas bajas, caletas y desembocaduras; posibilidad de oleaje fuerte.',
      icon: Droplets,
    },
  ];

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
            <TabsTrigger value="mareas" className="flex-1">
              <Waves className="h-3.5 w-3.5" />
              Mareas
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

          <TabsContent
            value="mareas"
            className="flex min-h-[18rem] flex-col gap-3"
          >
            <p className="text-xs text-muted-foreground">
              Estado de mareas · SHOA ·{' '}
              <strong className="tabular-nums">{mareaAlerts.length}</strong>{' '}
              alerta{mareaAlerts.length === 1 ? '' : 's'} reciente
              {mareaAlerts.length === 1 ? '' : 's'}
            </p>

            {currentLevel === null ? (
              <div className="flex h-[16rem] items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Esperando datos de SHOA…
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Horizontal gauge: 3 segments */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Nivel actual del mar</span>
                    <span className="font-medium text-foreground">
                      {TIDE_SEGMENTS.find((s) => s.level === currentLevel)
                        ?.short ?? '—'}
                    </span>
                  </div>
                  <div
                    className="flex h-8 w-full overflow-hidden rounded-md border"
                    role="meter"
                    aria-label={`Marea actual: ${
                      TIDE_SEGMENTS.find((s) => s.level === currentLevel)?.label
                    }`}
                    aria-valuemin={0}
                    aria-valuemax={2}
                    aria-valuenow={
                      currentLevel === 'baja'
                        ? 0
                        : currentLevel === 'media'
                        ? 1
                        : 2
                    }
                  >
                    {TIDE_SEGMENTS.map((seg) => {
                      const isActive = seg.level === currentLevel;
                      const Icon = seg.icon;
                      return (
                        <div
                          key={seg.level}
                          className="flex flex-1 items-center justify-center gap-1.5 transition-all"
                          style={{
                            backgroundColor: isActive
                              ? seg.color
                              : 'var(--muted)',
                            color: isActive
                              ? 'white'
                              : 'var(--muted-foreground)',
                            opacity: isActive ? 1 : 0.45,
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-semibold sm:text-xs">
                            {seg.short}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {currentMarea && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Última lectura{' '}
                      {formatDistanceToNow(new Date(currentMarea.issuedAt), {
                        addSuffix: true,
                        locale: es,
                      })}
                      {currentMarea.title ? ` · ${currentMarea.title}` : ''}
                    </p>
                  )}
                </div>

                {/* Current level description */}
                <div
                  className="rounded-md border p-2.5"
                  style={{
                    backgroundColor: 'var(--muted)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <p className="text-xs text-foreground">
                    {
                      TIDE_SEGMENTS.find((s) => s.level === currentLevel)
                        ?.description
                    }
                  </p>
                </div>

                {/* LEGEND — placed BELOW the gauge, text >= 12px */}
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Leyenda
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {TIDE_SEGMENTS.map((seg) => {
                      const Icon = seg.icon;
                      const isActive = seg.level === currentLevel;
                      return (
                        <li
                          key={seg.level}
                          className="flex items-center gap-2 rounded-sm border p-1.5"
                          style={{
                            borderColor: isActive
                              ? seg.color
                              : 'var(--border)',
                            backgroundColor: isActive
                              ? 'var(--accent)'
                              : 'transparent',
                          }}
                        >
                          <span
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm"
                            style={{ backgroundColor: seg.color }}
                            aria-hidden
                          >
                            <Icon className="h-3 w-3 text-white" />
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {seg.label}
                          </span>
                          {isActive && (
                            <span
                              className="ml-auto rounded-sm px-1.5 py-0.5 text-[10px] font-bold text-white"
                              style={{ backgroundColor: seg.color }}
                            >
                              ACTUAL
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Last 5 marea alerts */}
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Últimas 5 lecturas
                  </p>
                  {recentMareas.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Sin lecturas recientes.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {recentMareas.map((a, idx) => {
                        const seg = TIDE_SEGMENTS.find(
                          (s) => s.level === a.subcategory,
                        );
                        return (
                          <li
                            key={`marea-${idx}-${a.id}`}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                              style={{
                                backgroundColor: seg?.color ?? 'var(--muted)',
                              }}
                              aria-hidden
                            />
                            <span className="font-medium text-foreground">
                              {seg?.short ?? a.subcategory ?? '—'}
                            </span>
                            <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                              {formatDistanceToNow(new Date(a.issuedAt), {
                                addSuffix: true,
                                locale: es,
                              })}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
