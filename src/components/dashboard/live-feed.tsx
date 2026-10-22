'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Radio, WifiOff, Loader2, Inbox } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useAlertsSocket } from '@/hooks/use-alerts-socket';
import { AlertCard } from '@/components/dashboard/alert-card';
import type { SourceCode } from '@/lib/types';
import { sourceShortLabel, sourceColor } from '@/lib/severity';

type FilterCode = 'all' | SourceCode;

const FILTERS: { code: FilterCode; label: string }[] = [
  { code: 'all', label: 'Todas' },
  { code: 'senapred', label: 'SENAPRED' },
  { code: 'conaf', label: 'CONAF' },
  { code: 'shoa', label: 'SHOA' },
  { code: 'cbv2', label: 'CBV2' },
  { code: 'carabineros', label: 'Carabineros' },
  { code: 'radio', label: 'Radio' },
];

export function LiveFeed() {
  const { alerts, status } = useAlertsSocket();
  const [filter, setFilter] = useState<FilterCode>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return alerts;
    return alerts.filter((a) => a.sourceCode === filter);
  }, [alerts, filter]);

  const statusInfo = (() => {
    switch (status) {
      case 'connected':
        return {
          label: 'Conectado',
          color: 'text-emerald-600 dark:text-emerald-400',
          Icon: Radio,
        };
      case 'connecting':
        return {
          label: 'Conectando…',
          color: 'text-amber-600 dark:text-amber-400',
          Icon: Loader2,
        };
      case 'disconnected':
      default:
        return {
          label: 'Desconectado',
          color: 'text-destructive',
          Icon: WifiOff,
        };
    }
  })();

  const Icon = statusInfo.Icon;

  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden p-0">
      <CardHeader className="glass sticky top-0 z-10 flex flex-row items-start justify-between gap-2 border-b bg-card/80 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-0.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="relative inline-flex h-3 w-3 items-center justify-center">
              {status === 'connected' && (
                <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-emerald-500/60" />
              )}
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  status === 'connected'
                    ? 'bg-emerald-500'
                    : status === 'connecting'
                    ? 'bg-amber-500'
                    : 'bg-destructive'
                }`}
                aria-hidden
              />
            </span>
            En Vivo
          </CardTitle>
          <div className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
            <Icon
              className={`h-3 w-3 ${status === 'connecting' ? 'animate-spin' : ''}`}
            />
            {statusInfo.label}
            <span className="text-muted-foreground">·</span>
            <span className="tabular-nums">{filtered.length}</span>
            <span className="text-muted-foreground">
              {filter === 'all' ? ' alertas' : ' filtradas'}
            </span>
          </div>
        </div>
        <Badge variant="outline" className="hidden sm:inline-flex">
          WS · 3003
        </Badge>
      </CardHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 border-b bg-muted/30 px-3 py-2">
        {FILTERS.map((f) => {
          const active = filter === f.code;
          const dot =
            f.code !== 'all' ? (
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: sourceColor(f.code as SourceCode) }}
                aria-hidden
              />
            ) : null;
          return (
            <Button
              key={f.code}
              type="button"
              size="sm"
              variant={active ? 'default' : 'outline'}
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setFilter(f.code)}
              aria-pressed={active}
            >
              {dot}
              {f.label}
            </Button>
          );
        })}
      </div>

      {/* List */}
      <CardContent className="max-h-[28rem] overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-2 py-10 text-center"
            role="status"
          >
            <Inbox className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {status === 'connected'
                ? 'No hay alertas para este filtro.'
                : 'Esperando conexión con el feed en tiempo real…'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {filtered.map((alert, idx) => (
                <AlertCard key={alert.id} alert={alert} index={idx} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
