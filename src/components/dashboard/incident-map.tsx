'use client';

// ============================================================================
// Mapa georreferenciado de incidentes + overlay de alertas en vivo (Leaflet)
// ----------------------------------------------------------------------------
// react-leaflet v5 + leaflet requieren window, por lo que el componente debe
// cargarse solo en el cliente. La página lo importa con `dynamic(..., {ssr:false})`,
// por lo que este archivo nunca se ejecuta en el servidor.
// ============================================================================
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  useMap,
} from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers, MapPin, Users, Footprints, Package } from 'lucide-react';

import type { Incident } from '@/lib/types';
import {
  incidentTypeColor,
  incidentTypeLabel,
  natureLabel,
  severityLabel,
  severityColor,
  incidentStateLabel,
  sourceColor,
  sourceShortLabel,
} from '@/lib/severity';

const VINA_CENTER: LatLngExpression = [-33.0245, -71.5517];
const DEFAULT_ZOOM = 13;

// ---------------------------------------------------------------------------
// Componente auxiliar: ajusta el mapa al bounds de los incidentes cuando
// cambia la lista (sin re-crear el MapContainer, que rompe Leaflet).
// ---------------------------------------------------------------------------
function FitBounds({
  incidents,
}: {
  incidents: Incident[];
}) {
  const map = useMap();
  useEffect(() => {
    if (incidents.length === 0) return;
    const latLngs = incidents.map((i) => [i.lat, i.lng] as [number, number]);
    if (latLngs.length === 0) return;
    const bounds = latLngs as LatLngBoundsExpression;
    try {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } catch {
      /* noop */
    }
  }, [incidents, map]);
  return null;
}

interface IncidentMapProps {
  incidents: Incident[];
  loading: boolean;
  liveAlerts: {
    id: string;
    lat: number;
    lng: number;
    sourceCode: string;
    title: string;
    commune?: string | null;
    severity: 'info' | 'watch' | 'warning' | 'critical';
    issuedAt: string;
  }[];
}

export function IncidentMap({
  incidents,
  loading,
  liveAlerts,
}: IncidentMapProps) {
  const [showIncidents, setShowIncidents] = useState(true);
  const [showLiveAlerts, setShowLiveAlerts] = useState(true);

  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.state !== 'cerrada'),
    [incidents],
  );

  const legendItems: { type: string; color: string }[] = [
    { type: 'incendio_forestal', color: incidentTypeColor('incendio_forestal') },
    { type: 'incendio_urbano', color: incidentTypeColor('incendio_urbano') },
    { type: 'sismo', color: incidentTypeColor('sismo') },
    { type: 'inundacion', color: incidentTypeColor('inundacion') },
    { type: 'deslizamiento', color: incidentTypeColor('deslizamiento') },
    { type: 'quimico', color: incidentTypeColor('quimico') },
    { type: 'accidente', color: incidentTypeColor('accidente') },
    { type: 'delito', color: incidentTypeColor('delito') },
  ];

  return (
    <Card className="flex h-full flex-col gap-3 p-4">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Mapa de Catástrofes · Viña del Mar
          </span>
          <Badge variant="outline" className="text-xs">
            <span className="text-muted-foreground">Incidentes:</span>{' '}
            <span className="ml-1 tabular-nums">{incidents.length}</span>
            <span className="mx-1 text-muted-foreground">·</span>
            <span className="text-muted-foreground">Activos:</span>{' '}
            <span className="ml-1 tabular-nums text-emerald-600 dark:text-emerald-400">
              {activeIncidents.length}
            </span>
          </Badge>
        </CardTitle>
      </CardHeader>

      {/* Layer toggles */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="layer-incidents"
            checked={showIncidents}
            onCheckedChange={(v) => setShowIncidents(v === true)}
          />
          <label
            htmlFor="layer-incidents"
            className="flex cursor-pointer items-center gap-1 text-xs font-medium"
          >
            <Layers className="h-3.5 w-3.5" />
            Incidentes
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="layer-live-alerts"
            checked={showLiveAlerts}
            onCheckedChange={(v) => setShowLiveAlerts(v === true)}
          />
          <label
            htmlFor="layer-live-alerts"
            className="flex cursor-pointer items-center gap-1 text-xs font-medium"
          >
            <Layers className="h-3.5 w-3.5" />
            Alertas en vivo ({liveAlerts.length})
          </label>
        </div>
        <div className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          tiempo real
        </div>
      </div>

      {/* Map container */}
      <CardContent className="relative h-[22rem] overflow-hidden rounded-lg border p-0 sm:h-[32rem]">
        {loading ? (
          <Skeleton className="h-full w-full rounded-lg" />
        ) : (
          <MapContainer
            center={VINA_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom={false}
            className="h-full w-full"
            aria-label="Mapa georreferenciado de incidentes de Viña del Mar"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds incidents={incidents} />

            {/* Incidents */}
            {showIncidents &&
              incidents.map((inc) => {
                const color = incidentTypeColor(inc.type);
                const isCriticalActive =
                  inc.severity === 'critical' && inc.state === 'activa';
                return (
                  <Circle
                    key={inc.id}
                    center={[inc.lat, inc.lng]}
                    radius={Math.max(50, inc.radiusMeters || 500)}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: 0.18,
                      weight: 1.5,
                    }}
                  >
                    <Popup>
                      <div className="min-w-[220px] space-y-1 text-xs">
                        <p className="text-sm font-semibold">{inc.title}</p>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {incidentTypeLabel(inc.type)}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {natureLabel(inc.nature)}
                          </Badge>
                          <Badge
                            className={`${severityColor(
                              inc.severity,
                            )} text-[10px] text-white`}
                          >
                            {severityLabel(inc.severity)}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {incidentStateLabel(inc.state)}
                          </Badge>
                        </div>
                        {inc.address && (
                          <p className="text-muted-foreground">
                            {inc.address}, {inc.commune}
                          </p>
                        )}
                        {!inc.address && (
                          <p className="text-muted-foreground">{inc.commune}</p>
                        )}
                        {inc.description && (
                          <p className="text-muted-foreground">
                            {inc.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 pt-1">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Afectados: <strong>{inc.affected}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Footprints className="h-3 w-3" />
                            Evacuados: <strong>{inc.evacuated}</strong>
                          </span>
                        </div>
                        {inc.resources && (
                          <p className="inline-flex items-center gap-1 pt-1 text-muted-foreground">
                            <Package className="h-3 w-3" />
                            {inc.resources}
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Circle>
                );
              })}

            {/* Pulsing critical markers */}
            {showIncidents &&
              incidents
                .filter((i) => i.severity === 'critical' && i.state === 'activa')
                .map((inc) => (
                  <CircleMarker
                    key={`pulse-${inc.id}`}
                    center={[inc.lat, inc.lng]}
                    radius={10}
                    pathOptions={{
                      color: incidentTypeColor(inc.type),
                      fillColor: incidentTypeColor(inc.type),
                      fillOpacity: 0.7,
                      weight: 2,
                    }}
                    className="pulse-critical"
                  />
                ))}

            {/* Live alerts overlay (small dots) */}
            {showLiveAlerts &&
              liveAlerts.map((a) => (
                <CircleMarker
                  key={`live-${a.id}`}
                  center={[a.lat, a.lng]}
                  radius={4}
                  pathOptions={{
                    color: sourceColor(a.sourceCode),
                    fillColor: sourceColor(a.sourceCode),
                    fillOpacity: 0.85,
                    weight: 1.5,
                  }}
                >
                  <Popup>
                    <div className="min-w-[180px] space-y-1 text-xs">
                      <p className="text-sm font-semibold">{a.title}</p>
                      <Badge
                        variant="secondary"
                        style={{ color: sourceColor(a.sourceCode) }}
                        className="text-[10px]"
                      >
                        {sourceShortLabel(a.sourceCode)}
                      </Badge>
                      {a.commune && (
                        <p className="text-muted-foreground">{a.commune}</p>
                      )}
                      <p className="text-muted-foreground">
                        {new Intl.DateTimeFormat('es-CL', {
                          timeZone: 'America/Santiago',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }).format(new Date(a.issuedAt))}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
          </MapContainer>
        )}

        {/* Legend overlay */}
        <Card className="glass absolute right-2 top-2 z-[1000] w-44 rounded-md border p-2 shadow-sm">
          <CardHeader className="px-0 pt-0 pb-1">
            <CardTitle className="text-xs font-semibold">Leyenda</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-1 p-0">
            {legendItems.map((l) => (
              <div
                key={l.type}
                className="flex items-center gap-2 text-[11px]"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: l.color }}
                  aria-hidden
                />
                <span className="text-muted-foreground">
                  {incidentTypeLabel(l.type)}
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center gap-2 border-t pt-1 text-[11px]">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: 'oklch(0.55 0.05 250)',
                  boxShadow: '0 0 0 4px oklch(0.58 0.24 27 / 0.45)',
                }}
                aria-hidden
              />
              <span className="text-muted-foreground">Crítica activa</span>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
