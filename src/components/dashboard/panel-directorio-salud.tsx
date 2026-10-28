'use client';

import { useState, useEffect } from 'react';
import { Heart, Phone, MapPin, Loader2 } from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CentroSalud {
  id: string;
  nombre: string;
  tipo: string;
  telefono: string;
  direccion: string | null;
  comuna: string;
}

const TIPO_LABELS: Record<string, string> = {
  hospital: 'Hospital',
  cesfam: 'CESFAM',
  clinica: 'Clínica',
  sapu: 'SAPU',
  cecosf: 'CECOSF',
  megasalud: 'Megasalud',
  ambulancia: 'Ambulancia',
};

const TIPO_COLORS: Record<string, string> = {
  hospital: 'text-red-600 dark:text-red-400',
  cesfam: 'text-blue-600 dark:text-blue-400',
  clinica: 'text-purple-600 dark:text-purple-400',
  sapu: 'text-emerald-600 dark:text-emerald-400',
  cecosf: 'text-teal-600 dark:text-teal-400',
  megasalud: 'text-cyan-600 dark:text-cyan-400',
  ambulancia: 'text-orange-600 dark:text-orange-400',
};

export function PanelDirectorioSalud() {
  const [centros, setCentros] = useState<CentroSalud[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/salud', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CentroSalud[]) => setCentros(data))
      .catch(() => setCentros([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden p-0">
      <CardHeader className="glass sticky top-0 z-10 flex flex-row items-center justify-between gap-2 border-b bg-card/80 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-0.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-rose-500" />
            Directorio de Salud
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Viña del Mar — dato fijo (verificación trimestral)
          </p>
        </div>
        <Badge variant="outline" className="gap-1 text-[10px]">
          {loading ? '...' : centros.length} centros
        </Badge>
      </CardHeader>

      <CardContent className="max-h-[26rem] overflow-y-auto p-3">
        {loading ? (
          <div className="flex h-[20rem] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : centros.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Heart className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Sin datos del directorio de salud.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {centros.map((c, idx) => (
              <div
                key={`salud-${idx}-${c.id}`}
                className="flex items-center gap-3 rounded-md border-l-4 border-l-rose-300 bg-card/95 px-3 py-2 text-xs shadow-sm"
              >
                {/* Tipo */}
                <Badge
                  variant="outline"
                  className={`shrink-0 px-1.5 py-0 text-[10px] font-bold uppercase ${TIPO_COLORS[c.tipo] ?? 'text-muted-foreground'}`}
                >
                  {TIPO_LABELS[c.tipo] ?? c.tipo}
                </Badge>

                {/* Nombre + dirección */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate font-medium text-foreground">{c.nombre}</p>
                  {c.direccion && (
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{c.direccion}</span>
                    </p>
                  )}
                </div>

                {/* Teléfono */}
                <a
                  href={`tel:${c.telefono.replace(/\s/g, '')}`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400"
                >
                  <Phone className="h-3 w-3" />
                  {c.telefono}
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
