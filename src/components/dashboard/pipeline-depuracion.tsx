'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Filter,
  Loader2,
  Radio,
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useAlertsSocket } from '@/hooks/use-alerts-socket';
import {
  depurarAlerta,
  formatearEdad,
  formatearTTL,
  TTL_EMERGENCIAS_CRITICAS,
  TTL_BOLETINES_ALERTAS,
  COMUNA_RESTRICCION,
} from '@/lib/pipeline-ttl';
import { sourceShortLabel, sourceColor } from '@/lib/severity';
import type { SourceCode } from '@/lib/types';

export function PipelineDepuracion() {
  const { alerts, status } = useAlertsSocket();
  const [mostrarRechazados, setMostrarRechazados] = useState(true);

  // Ejecutar el pipeline de depuración sobre todas las alertas del buffer.
  const resultados = useMemo(() => {
    const ahora = new Date();
    return alerts.map((a) => depurarAlerta(a, ahora));
  }, [alerts]);

  const aprobados = useMemo(
    () => resultados.filter((r) => r.decision === 'aprobado'),
    [resultados],
  );
  const rechazados = useMemo(
    () => resultados.filter((r) => r.decision === 'rechazado'),
    [resultados],
  );

  const visibles = mostrarRechazados ? resultados : aprobados;

  const statusInfo = (() => {
    switch (status) {
      case 'connected':
        return { label: 'Conectado', color: 'text-emerald-600 dark:text-emerald-400', Icon: Radio };
      case 'connecting':
        return { label: 'Conectando…', color: 'text-amber-600 dark:text-amber-400', Icon: Loader2 };
      default:
        return { label: 'Desconectado', color: 'text-destructive', Icon: Radio };
    }
  })();
  const StatusIcon = statusInfo.Icon;

  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden p-0">
      <CardHeader className="glass sticky top-0 z-10 flex flex-row items-start justify-between gap-2 border-b bg-card/80 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-0.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-primary" />
            Pipeline de Depuración
          </CardTitle>
          <div className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
            <StatusIcon
              className={`h-3 w-3 ${status === 'connecting' ? 'animate-spin' : ''}`}
            />
            {statusInfo.label}
            <span className="text-muted-foreground">·</span>
            <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
              {aprobados.length}
            </span>
            <span className="text-muted-foreground">vigentes /</span>
            <span className="tabular-nums text-red-600 dark:text-red-400">
              {rechazados.length}
            </span>
            <span className="text-muted-foreground">rechazadas</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline" className="gap-1 text-[10px]">
            <MapPin className="h-3 w-3" />
            {COMUNA_RESTRICCION}
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant={mostrarRechazados ? 'default' : 'outline'}
                className="h-6 px-2 text-[10px]"
                onClick={() => setMostrarRechazados((v) => !v)}
                aria-pressed={mostrarRechazados}
              >
                {mostrarRechazados ? 'Ver vigentes' : 'Ver rechazados'}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">
              Alternar entre mostrar solo aprobados o también los rechazados
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>

      {/* Umbrales TTL */}
      <div className="flex flex-wrap gap-2 border-b bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground">
        <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] font-normal">
          <Clock className="h-3 w-3 text-red-500" />
          Emergencias: {formatearTTL(TTL_EMERGENCIAS_CRITICAS)}
        </Badge>
        <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] font-normal">
          <Clock className="h-3 w-3 text-amber-500" />
          Boletines: {formatearTTL(TTL_BOLETINES_ALERTAS)}
        </Badge>
        <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] font-normal">
          <MapPin className="h-3 w-3 text-primary" />
          Solo: {COMUNA_RESTRICCION}
        </Badge>
      </div>

      {/* Log de decisiones */}
      <CardContent className="max-h-[28rem] overflow-y-auto p-3">
        {visibles.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-2 py-10 text-center"
            role="status"
          >
            <Filter className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {status === 'connected'
                ? 'No hay alertas para depurar.'
                : 'Esperando conexión con el feed en tiempo real…'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {visibles.map((r, idx) => {
                const aprobado = r.decision === 'aprobado';
                return (
                  <motion.div
                    key={`${r.alert.id}-${idx}`}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: aprobado ? 1 : 0.55, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`rounded-md border-l-4 bg-card/95 px-3 py-2 text-xs shadow-sm ${
                      aprobado
                        ? 'border-emerald-500'
                        : 'border-red-500'
                    }`}
                  >
                    {/* Header: badge fuente + estado */}
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
                          style={{ backgroundColor: sourceColor(r.alert.sourceCode as SourceCode) }}
                        >
                          {sourceShortLabel(r.alert.sourceCode)}
                        </span>
                        {aprobado ? (
                          <Badge
                            variant="outline"
                            className="gap-1 border-emerald-400/50 px-1.5 py-0 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Vigente
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="gap-1 border-red-400/50 px-1.5 py-0 text-[10px] font-medium text-red-700 dark:text-red-400"
                          >
                            <XCircle className="h-3 w-3" />
                            Descartado
                          </Badge>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        edad {formatearEdad(r.edadMs)}
                      </span>
                    </div>

                    {/* Título */}
                    <p className="font-medium leading-snug text-foreground">
                      {r.alert.title}
                    </p>

                    {/* Comuna + TTL aplicado */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                      {r.alert.commune && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {r.alert.commune}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        TTL {formatearTTL(r.ttlAplicado)}
                      </span>
                      {!r.mismoDia && (
                        <span className="text-red-600 dark:text-red-400">
                          día anterior
                        </span>
                      )}
                    </div>

                    {/* Motivo (solo rechazados) */}
                    {!aprobado && (
                      <p className="mt-1.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                        {r.motivo}
                      </p>
                    )}
                    {aprobado && (
                      <p className="mt-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        ✓ Validado para el mapa activo
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
