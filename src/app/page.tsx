'use client';

// ============================================================================
// CODEM-VDM · Centro de Operaciones de Emergencias · Viña del Mar
// Página principal del dashboard (única ruta visible: /)
// ----------------------------------------------------------------------------
// Compone todos los paneles del dashboard: KPIs, mapa, feed en vivo, fichas
// FIBER, gráficos y panel de cumplimiento legal. Header sticky con reloj,
// estado de conexión y modo oscuro. Footer sticky al fondo (mt-auto).
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import {
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  Moon,
  Plus,
  RadioTower,
  Sun,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

import { StatsOverview } from '@/components/dashboard/stats-overview';
import { LiveFeed } from '@/components/dashboard/live-feed';
import { ChartsPanel } from '@/components/dashboard/charts-panel';
import { FichasPanel } from '@/components/dashboard/fichas-panel';
import { CompliancePanel } from '@/components/dashboard/compliance-panel';
import { IncidentFormDialog } from '@/components/dashboard/incident-form';

import { useAlertsSocket } from '@/hooks/use-alerts-socket';
import type { Incident } from '@/lib/types';

// Leaflet must be client-side only — dynamic with ssr:false prevents SSR.
const IncidentMap = dynamic(
  () =>
    import('@/components/dashboard/incident-map').then((m) => m.IncidentMap),
  { ssr: false, loading: () => <div className="h-[22rem] sm:h-[32rem]" /> },
);

// ---------------------------------------------------------------------------
// QueryClient provider (creates a single client per browser session)
// ---------------------------------------------------------------------------
function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

// ---------------------------------------------------------------------------
// Live clock (America/Santiago) — updates every second
// ---------------------------------------------------------------------------
function LiveClock() {
  const [now, setNow] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const d = new Date();
      const time = new Intl.DateTimeFormat('es-CL', {
        timeZone: 'America/Santiago',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(d);
      const dateStr = new Intl.DateTimeFormat('es-CL', {
        timeZone: 'America/Santiago',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(d);
      setNow(time);
      setDate(dateStr);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="hidden flex-col items-end md:flex"
      aria-label="Hora local en America/Santiago"
    >
      <span className="font-mono text-lg font-bold tabular-nums leading-none">
        {now}
      </span>
      <span className="text-[10px] text-muted-foreground">{date} · CLT</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Theme toggle (light/dark)
// ---------------------------------------------------------------------------
function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? theme) === 'dark';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Cambiar modo de color"
        >
          {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="h-4 w-4" />
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="h-4 w-4" />
          Oscuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Activity className="h-4 w-4" />
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Connection status badge — uses the socket store
// ---------------------------------------------------------------------------
function ConnectionBadge() {
  const { status } = useAlertsSocket();
  const info =
    status === 'connected'
      ? { label: 'En línea', cls: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' }
      : status === 'connecting'
      ? { label: 'Conectando', cls: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' }
      : { label: 'Desconectado', cls: 'text-destructive', dot: 'bg-destructive' };
  return (
    <Badge
      variant="outline"
      className={`gap-1.5 ${info.cls}`}
      aria-label={`Estado de conexión: ${info.label}`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${info.dot} ${
          status === 'connected' ? 'animate-pulse' : ''
        }`}
        aria-hidden
      />
      {info.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------
function Dashboard() {
  const queryClient = useQueryClient();
  const { alerts } = useAlertsSocket();
  const [incidentFormOpen, setIncidentFormOpen] = useState(false);

  // Fetch incidents for the map & stats.
  const { data: incidents = [], isLoading: incidentsLoading } = useQuery<
    Incident[]
  >({
    queryKey: ['incidents'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/incidents', { cache: 'no-store' });
        if (!res.ok) return [];
        return (await res.json()) as Incident[];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  // Live alerts overlay for the map: only those with valid coords, newest 10.
  const liveMapAlerts = useMemo(() => {
    return alerts
      .filter(
        (a) =>
          typeof a.lat === 'number' &&
          typeof a.lng === 'number' &&
          !Number.isNaN(a.lat) &&
          !Number.isNaN(a.lng),
      )
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        lat: a.lat,
        lng: a.lng,
        sourceCode: a.sourceCode,
        title: a.title,
        commune: a.commune,
        severity: a.severity,
        issuedAt: a.issuedAt,
      }));
  }, [alerts]);

  const refreshIncidents = () =>
    void queryClient.invalidateQueries({ queryKey: ['incidents'] });

  // Critical count badge in header
  const criticalCount = useMemo(
    () =>
      alerts.filter(
        (a) => a.severity === 'critical' && a.state === 'activa',
      ).length,
    [alerts],
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* ===== Header (sticky) ===== */}
      <header
        className="glass sticky top-0 z-30 border-b backdrop-blur"
        aria-label="Cabecera del dashboard"
      >
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          {/* Logo + title */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="Escudo institucional CODEM-VDM"
              className="h-10 w-10 shrink-0"
            />
            <div className="flex flex-col leading-tight">
              <h1 className="text-sm font-bold text-foreground sm:text-base">
                CODEM-VDM · Centro de Operaciones de Emergencias
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Viña del Mar · Región de Valparaíso
              </p>
            </div>
          </div>

          {/* Right: clock, status, theme, actions */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
              <RadioTower className="h-3.5 w-3.5" />
              <span className="tabular-nums">WS 3003</span>
            </div>

            {criticalCount > 0 && (
              <Badge
                variant="destructive"
                className="gap-1"
                aria-label={`${criticalCount} alertas críticas activas`}
              >
                <AlertTriangle className="h-3 w-3" />
                {criticalCount} crítica{criticalCount === 1 ? '' : 's'}
              </Badge>
            )}

            <ConnectionBadge />

            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <Calendar className="h-3.5 w-3.5" />
              <Clock className="h-3.5 w-3.5" />
            </div>

            <LiveClock />

            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => setIncidentFormOpen(true)}
              aria-label="Registrar nueva catástrofe"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nueva Catástrofe</span>
            </Button>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ===== Main ===== */}
      <main
        className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-4 sm:px-6 sm:py-6"
        aria-label="Panel principal de monitoreo"
      >
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4 sm:gap-6"
        >
          {/* Row 1: KPIs */}
          <StatsOverview
            incidents={incidents}
            incidentsLoading={incidentsLoading}
          />

          {/* Row 2: Map + Live Feed */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
            <div className="lg:col-span-8">
              <IncidentMap
                incidents={incidents}
                loading={incidentsLoading}
                liveAlerts={liveMapAlerts}
              />
            </div>
            <div className="lg:col-span-4">
              <LiveFeed />
            </div>
          </div>

          {/* Row 3: Fichas + Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
            <div className="lg:col-span-8">
              <FichasPanel />
            </div>
            <div className="lg:col-span-4">
              <ChartsPanel
                incidents={incidents}
                incidentsLoading={incidentsLoading}
              />
            </div>
          </div>

          {/* Row 4: Compliance */}
          <CompliancePanel />

          {/* Hidden trigger to refresh incidents when a new one is registered */}
          <IncidentFormDialog
            open={incidentFormOpen}
            onOpenChange={setIncidentFormOpen}
            onCreated={() => {
              refreshIncidents();
              toast.success('Lista de incidentes actualizada');
            }}
          />
        </motion.div>
      </main>

      {/* ===== Footer (sticky to bottom via mt-auto) ===== */}
      <footer
        className="glass mt-auto border-t backdrop-blur"
        aria-label="Pie institucional"
      >
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-2 px-4 py-3 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" />
            <span>
              Municipalidad de Viña del Mar · CODEM · Sistema de Gestión de
              Emergencias
            </span>
          </div>
          <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span>
              Datos sensibles protegidos por{' '}
              <strong className="font-medium text-foreground">Ley 19.628</strong>
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="tabular-nums">v1.0.0 · {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (wrapped in providers)
// ---------------------------------------------------------------------------
export default function Home() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        <Dashboard />
        {/* Sonner toaster — must live inside ThemeProvider to respect theme */}
        <SonnerToaster position="top-right" richColors closeButton />
      </QueryProvider>
    </ThemeProvider>
  );
}
