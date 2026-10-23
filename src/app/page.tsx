'use client';

// ============================================================================
// COEP Viña · Centro de Operaciones de Emergencia Provincial · VeltrixIntegra Ecosistema Digital 360
// Página principal del dashboard (única ruta visible: /)
// ----------------------------------------------------------------------------
// Compone todos los paneles del dashboard: KPIs, mapa, feed en vivo, fichas
// FIBER, gráficos, mareas y panel de cumplimiento legal. Header sticky con
// reloj, estado de conexión, campana de notificaciones, exportar y modo
// oscuro. Footer sticky al fondo (mt-auto).
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
  Bell,
  Calendar,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Moon,
  Plus,
  RadioTower,
  Presentation,
  Sun,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

import { StatsOverview } from '@/components/dashboard/stats-overview';
import { LiveFeed } from '@/components/dashboard/live-feed';
import { ChartsPanel } from '@/components/dashboard/charts-panel';
import { FichasPanel } from '@/components/dashboard/fichas-panel';
import { CompliancePanel } from '@/components/dashboard/compliance-panel';
import { IncidentFormDialog } from '@/components/dashboard/incident-form';

import { useAlertsSocket, useRecentNotifications, useUnreadCount, useMarkAllRead } from '@/hooks/use-alerts-socket';
import type { Incident } from '@/lib/types';
import {
  severityColor,
  severityLabel,
  sourceShortLabel,
  sourceColor,
} from '@/lib/severity';

// Leaflet/react-leaflet requieren `window`, por lo que el mapa se carga
// como chunk dinamico (ssr:false). El resto de paneles son estaticos:
// tras eliminar recharts y react-hook-form el bundle principal es ligero.
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
// Notifications bell — consolidates recent alerts into a popover instead of
// occupying screen space with toasts. Unread counter resets on open.
// ---------------------------------------------------------------------------
function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const recent = useRecentNotifications(30);
  const unread = useUnreadCount();
  const markAllRead = useMarkAllRead();

  // La campana muestra SOLO alertas verificadas (verdaderas). Los rumores
  // (verified=false) no aparecen aquí para evitar distraer al operador con
  // reportes no confirmados — pueden revisarse en el feed en vivo.
  const verifiedRecent = useMemo(
    () => recent.filter((a) => a.verified !== false),
    [recent],
  );

  // When the popover opens, mark all notifications as read so the badge
  // resets visually while the operator reviews the list.
  useEffect(() => {
    if (open) markAllRead();
  }, [open, markAllRead]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`Notificaciones${unread > 0 ? `, ${unread} sin leer` : ''}`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground"
              aria-hidden
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[360px] max-w-[calc(100vw-2rem)] p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Notificaciones</span>
            {unread > 0 && (
              <Badge
                variant="destructive"
                className="h-5 px-1.5 text-[10px]"
              >
                {unread} nueva{unread === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={markAllRead}
            disabled={unread === 0}
            aria-label="Marcar todas las notificaciones como leídas"
          >
            Marcar todas leídas
          </Button>
        </div>
        <ScrollArea className="max-h-[24rem]">
          {verifiedRecent.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              No hay notificaciones verificadas recientes. Las alertas que
              emitan las fuentes oficiales aparecerán aquí en tiempo real.
            </p>
          ) : (
            <ul className="divide-y">
              {verifiedRecent.map((a) => (
                <li
                  key={a.id}
                  className="flex gap-2 px-3 py-2.5 transition-colors hover:bg-accent/40"
                >
                  <span
                    className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${severityColor(
                      a.severity,
                    )}`}
                    aria-label={`Severidad ${severityLabel(a.severity)}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span
                        className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: sourceColor(a.sourceCode),
                          color: 'white',
                        }}
                      >
                        {sourceShortLabel(a.sourceCode)}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {formatDistanceToNow(new Date(a.issuedAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs font-medium text-foreground">
                      {a.title}
                    </p>
                    {a.commune && (
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {a.commune}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Export menu — triggers /api/export/{excel,word,pdf,pptx}
// ---------------------------------------------------------------------------
type ExportFormat = 'excel' | 'word' | 'pdf' | 'pptx';

function ExportMenu() {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  async function handleExport(format: ExportFormat) {
    if (exporting) return;
    try {
      setExporting(format);
      const friendly: Record<ExportFormat, string> = {
        excel: 'Excel',
        word: 'Word',
        pdf: 'PDF',
        pptx: 'PowerPoint',
      };
      toast.loading(`Generando documento ${friendly[format]}…`, {
        id: 'export',
      });

      if (format === 'excel') {
        // Excel is a GET that streams the file directly.
        window.open('/api/export/excel', '_blank');
        toast.success(`Documento ${friendly[format]} generado`, {
          id: 'export',
        });
        return;
      }

      const res = await fetch(`/api/export/${format}`, { method: 'POST' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'word' ? 'docx' : format === 'pptx' ? 'pptx' : 'pdf';
      a.download = `informe-emergencias-vina-del-mar.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Documento ${friendly[format]} generado`, {
        id: 'export',
      });
    } catch (err) {
      console.error('[export] error:', err);
      toast.error('No se pudo generar el documento. Intente nuevamente.', {
        id: 'export',
      });
    } finally {
      setExporting(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label="Exportar datos del dashboard"
          disabled={exporting !== null}
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">
            {exporting ? 'Generando…' : 'Exportar'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Descargar informe</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void handleExport('excel')}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void handleExport('word')}
          className="gap-2"
        >
          <FileText className="h-4 w-4 text-sky-600" />
          Word (.docx)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void handleExport('pdf')}
          className="gap-2"
        >
          <FileText className="h-4 w-4 text-rose-600" />
          PDF (.pdf)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void handleExport('pptx')}
          className="gap-2"
        >
          <Presentation className="h-4 w-4 text-amber-600" />
          PowerPoint (.pptx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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

  // Live alerts overlay for the map: ONLY verified (true) alerts with valid
  // coords, newest 10. Las alertas falsas (rumores, verified=false) NO se
  // muestran en el mapa para evitar confundir al operador con reportes no
  // confirmados por una fuente oficial.
  const liveMapAlerts = useMemo(() => {
    return alerts
      .filter(
        (a) =>
          a.verified !== false && // <-- SOLO alertas verdaderas (verificadas)
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
              alt="Escudo institucional COEP Viña"
              className="h-10 w-10 shrink-0"
            />
            <div className="flex flex-col leading-tight">
              <h1 className="text-sm font-bold text-foreground sm:text-base">
                COEP Viña · Centro de Operaciones de Emergencia Provincial
              </h1>
              <p className="text-[11px] text-muted-foreground">
                VeltrixIntegra · Ecosistema Digital 360 · Comuna de Viña del Mar
              </p>
            </div>
          </div>

          {/* Right: clock, status, theme, actions */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
              <RadioTower className="h-3.5 w-3.5" />
              <span className="tabular-nums">WS 3003</span>
            </div>

            <ConnectionBadge />

            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <Calendar className="h-3.5 w-3.5" />
              <Clock className="h-3.5 w-3.5" />
            </div>

            <LiveClock />

            <NotificationsBell />

            <ExportMenu />

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
              COEP Viña · Centro de Operaciones de Emergencia Provincial ·
              VeltrixIntegra Ecosistema Digital 360
            </span>
          </div>
          <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span>
              Datos sensibles protegidos por{' '}
              <strong className="font-medium text-foreground">Ley 19.628</strong>
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="tabular-nums">v1.1.0 · {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (wrapped in providers)
// ---------------------------------------------------------------------------
// El Dashboard solo se monta en el cliente (no durante SSR) para evitar
// el conflicto de hidratación de zustand v5 con React 19. Usamos el patrón
// estándar mounted-flag; la regla react-hooks/set-state-in-effect se
// desactiva para esta línea porque es el patrón idiomático client-only.
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="glass sticky top-0 z-30 border-b backdrop-blur">
          <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-4 py-3 sm:px-6">
            <img src="/logo.svg" alt="Escudo institucional" className="h-10 w-10 shrink-0" />
            <div className="flex flex-col leading-tight">
              <h1 className="text-sm font-bold text-foreground sm:text-base">
                COEP Viña · Centro de Operaciones de Emergencia Provincial
              </h1>
              <p className="text-[11px] text-muted-foreground">
                VeltrixIntegra · Ecosistema Digital 360 · Comuna de Viña del Mar
              </p>
            </div>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-screen-2xl flex-1 items-center justify-center px-4 py-20">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm">Cargando panel de emergencias…</p>
          </div>
        </main>
      </div>
    );
  }
  return <>{children}</>;
}

export default function Home() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        <ClientOnly>
          <Dashboard />
        </ClientOnly>
        {/* Sonner toaster — must live inside ThemeProvider to respect theme */}
        <SonnerToaster position="top-right" richColors closeButton />
      </QueryProvider>
    </ThemeProvider>
  );
}
