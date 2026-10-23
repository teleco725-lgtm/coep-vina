'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNowStrict } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Radio,
  Info,
  Eye,
  AlertTriangle,
  Siren,
  BadgeCheck,
  ShieldAlert,
} from 'lucide-react';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import type { BroadcastAlert } from '@/lib/types';
import {
  severityBorderColor,
  severityLabel,
  severityTextColor,
  sourceColor,
  sourceShortLabel,
  categoryLabel,
  alertStateLabel,
} from '@/lib/severity';

interface AlertCardProps {
  alert: BroadcastAlert;
  index?: number;
}

// Map severity -> lucide icon component (static references, not created at render).
const SEVERITY_ICONS = {
  info: Info,
  watch: Eye,
  warning: AlertTriangle,
  critical: Siren,
} as const;

export function AlertCard({ alert, index = 0 }: AlertCardProps) {
  const [expanded, setExpanded] = useState(false);
  const SevIcon = SEVERITY_ICONS[alert.severity] ?? Info;
  const sevColor = severityTextColor(alert.severity);
  const borderClass = severityBorderColor(alert.severity);

  // Description truncation: > 180 chars
  const longDesc = (alert.description ?? '').length > 180;
  const shownDesc =
    expanded || !longDesc
      ? alert.description ?? ''
      : `${(alert.description ?? '').slice(0, 180)}…`;

  // Meta chips: flattening small primitives.
  const metaChips: { label: string; value: string }[] = [];
  if (alert.subcategory) {
    metaChips.push({ label: 'Sub', value: alert.subcategory });
  }
  if (alert.meta && typeof alert.meta === 'object') {
    for (const [k, v] of Object.entries(alert.meta)) {
      if (v === null || v === undefined) continue;
      let val: string;
      if (Array.isArray(v)) {
        val = v.join(', ');
      } else if (typeof v === 'object') {
        try {
          val = JSON.stringify(v);
        } catch {
          continue;
        }
      } else {
        val = String(v);
      }
      if (val.length > 32) val = `${val.slice(0, 32)}…`;
      metaChips.push({ label: k, value: val });
      if (metaChips.length >= 5) break;
    }
  }

  const issuedAt = new Date(alert.issuedAt);
  const timeAgo = formatDistanceToNowStrict(issuedAt, {
    addSuffix: true,
    locale: es,
  });
  const issuedTime = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(issuedAt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.25,
        ease: 'easeOut',
        delay: Math.min(index * 0.02, 0.2),
      }}
      className="w-full"
    >
      <Card
        className={`border-l-4 ${borderClass} bg-card/95 px-0 py-0 shadow-sm`}
        role="article"
        aria-label={`Alerta ${severityLabel(alert.severity)}: ${alert.title}`}
      >
        <CardContent className="flex flex-col gap-2 p-3 sm:p-4">
          {/* Header row: severity icon + source badge + verified badge + time */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted/60 ${sevColor}`}
                aria-hidden
              >
                <SevIcon className="h-4 w-4" />
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="gap-1.5 font-medium"
                    style={{ color: sourceColor(alert.sourceCode) }}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: sourceColor(alert.sourceCode) }}
                      aria-hidden
                    />
                    {sourceShortLabel(alert.sourceCode)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{alert.sourceName}</TooltipContent>
              </Tooltip>
              {/* Badge de verificación: VERIFICADA (verdadera) vs RUMOR (no
                  confirmada). Las alertas sin el campo `verified` se asumen
                  verificadas por retrocompatibilidad. */}
              {alert.verified === false ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-400/50 px-1.5 py-0 text-[10px] font-medium text-amber-700 dark:text-amber-400"
                    >
                      <ShieldAlert className="h-3 w-3" />
                      Rumor
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[16rem] text-xs">
                    Reporte no confirmado por una fuente oficial. Mostrar con
                    precaución — puede ser información no verificada.
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="gap-1 border-emerald-400/50 px-1.5 py-0 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
                    >
                      <BadgeCheck className="h-3 w-3" />
                      Verificada
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[16rem] text-xs">
                    Alerta emitida por una fuente oficial con canal de
                    difusión verificado (SENAPRED, CONAF, SHOA, Bomberos,
                    Carabineros o Guardia Marina).
                  </TooltipContent>
                </Tooltip>
              )}
              <Badge variant="outline" className="text-xs">
                {categoryLabel(alert.category)}
              </Badge>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <time
                  dateTime={alert.issuedAt}
                  className="text-[11px] text-muted-foreground tabular-nums"
                >
                  {timeAgo}
                </time>
              </TooltipTrigger>
              <TooltipContent>
                Emitida: {issuedTime} (America/Santiago)
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold leading-snug text-foreground">
            {alert.title}
          </h3>

          {/* Description */}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {shownDesc}
          </p>
          {longDesc && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 self-start text-[11px] font-medium text-primary hover:underline"
              aria-expanded={expanded}
            >
              {expanded ? (
                <>
                  Ver menos <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Ver más <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}

          {/* Meta footer: location, commune, state, chips */}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {alert.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="max-w-[12rem] truncate">{alert.location}</span>
              </span>
            )}
            {alert.commune && (
              <Badge
                variant="outline"
                className="px-1.5 py-0 text-[10px] font-normal"
              >
                {alert.commune}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="px-1.5 py-0 text-[10px] font-normal"
            >
              {alertStateLabel(alert.state)}
            </Badge>
            {alert.externalId && (
              <span className="inline-flex items-center gap-1 text-[10px]">
                <Radio className="h-3 w-3" />
                {alert.externalId}
              </span>
            )}
          </div>

          {metaChips.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {metaChips.map((chip, i) => (
                <span
                  key={`${chip.label}-${i}`}
                  className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                >
                  <span className="text-muted-foreground">{chip.label}:</span>{' '}
                  <span className="ml-1 text-foreground">{chip.value}</span>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
