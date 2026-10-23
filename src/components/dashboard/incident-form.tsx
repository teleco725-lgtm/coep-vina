'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Loader2, Save, MapPin, AlertOctagon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type {
  IncidentType,
  Nature,
  Severity,
  IncidentState,
} from '@/lib/types';
import {
  incidentTypeLabel,
  natureLabel,
  severityLabel,
  incidentStateLabel,
} from '@/lib/severity';

const COMMUNES = ['Viña del Mar'] as const;

const INCIDENT_TYPES: IncidentType[] = [
  'incendio_forestal',
  'incendio_urbano',
  'sismo',
  'tsunami',
  'inundacion',
  'deslizamiento',
  'quimico',
  'accidente',
  'delito',
  'otro',
];
const NATURES: Nature[] = ['natural', 'antropico'];
const SEVERITIES: Severity[] = ['info', 'watch', 'warning', 'critical'];
const STATES: IncidentState[] = ['activa', 'contenida', 'controlada', 'cerrada'];

interface IncidentFormState {
  type: IncidentType;
  nature: Nature;
  severity: Severity;
  state: IncidentState;
  title: string;
  description: string;
  commune: string;
  address: string;
  lat: string;
  lng: string;
  radiusMeters: string;
  affected: string;
  evacuated: string;
  resources: string;
}

const INITIAL_STATE: IncidentFormState = {
  type: 'incendio_forestal',
  nature: 'natural',
  severity: 'warning',
  state: 'activa',
  title: '',
  description: '',
  commune: 'Viña del Mar',
  address: '',
  lat: '-33.0245',
  lng: '-71.5517',
  radiusMeters: '500',
  affected: '0',
  evacuated: '0',
  resources: '',
};

interface IncidentFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

export function IncidentFormDialog({
  open,
  onOpenChange,
  onCreated,
}: IncidentFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<IncidentFormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<{ title?: string; lat?: string; lng?: string }>({});

  const setField = <K extends keyof IncidentFormState>(
    key: K,
    value: IncidentFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const resetForm = () => {
    setForm(INITIAL_STATE);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: typeof errors = {};
    if (!form.title.trim()) nextErrors.title = 'Título obligatorio';
    const latNum = Number(form.lat);
    if (!form.lat.trim() || !Number.isFinite(latNum)) {
      nextErrors.lat = 'Latitud obligatoria';
    }
    const lngNum = Number(form.lng);
    if (!form.lng.trim() || !Number.isFinite(lngNum)) {
      nextErrors.lng = 'Longitud obligatoria';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        type: form.type,
        nature: form.nature,
        severity: form.severity,
        state: form.state,
        title: form.title.trim(),
        description: form.description.trim() || null,
        commune: form.commune,
        address: form.address.trim() || null,
        lat: latNum,
        lng: lngNum,
        radiusMeters: Number(form.radiusMeters) || 0,
        affected: Number(form.affected) || 0,
        evacuated: Number(form.evacuated) || 0,
        resources: form.resources.trim() || null,
      };
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
          issues?: { message: string }[];
        } | null;
        const msg =
          err?.error ?? err?.issues?.[0]?.message ?? 'No se pudo crear el incidente.';
        toast.error('Error al registrar catástrofe', { description: msg });
        return;
      }
      toast.success('Catástrofe registrada', {
        description: form.title.trim(),
      });
      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch {
      toast.error('Error de red al registrar el incidente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      // Reset on close so re-open starts fresh.
      resetForm();
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-destructive" />
            Registrar Nueva Catástrofe
          </DialogTitle>
          <DialogDescription>
            Complete los datos del incidente georreferenciado. La creación se
            registra en AuditLog para trazabilidad legal.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident-type">Tipo</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setField('type', v as IncidentType)}
            >
              <SelectTrigger id="incident-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {incidentTypeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident-nature">Naturaleza</Label>
            <Select
              value={form.nature}
              onValueChange={(v) => setField('nature', v as Nature)}
            >
              <SelectTrigger id="incident-nature" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NATURES.map((n) => (
                  <SelectItem key={n} value={n}>
                    {natureLabel(n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident-severity">Severidad</Label>
            <Select
              value={form.severity}
              onValueChange={(v) => setField('severity', v as Severity)}
            >
              <SelectTrigger id="incident-severity" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {severityLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident-state">Estado</Label>
            <Select
              value={form.state}
              onValueChange={(v) => setField('state', v as IncidentState)}
            >
              <SelectTrigger id="incident-state" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {incidentStateLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="incident-title">Título *</Label>
            <Input
              id="incident-title"
              placeholder="Ej. Incendio forestal sector Reñaca Alto"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="incident-description">Descripción</Label>
            <Textarea
              id="incident-description"
              rows={3}
              placeholder="Detalle del evento, antecedentes…"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident-commune">Comuna</Label>
            <Select
              value={form.commune}
              onValueChange={(v) => setField('commune', v)}
            >
              <SelectTrigger id="incident-commune" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMUNES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident-address">Dirección</Label>
            <Input
              id="incident-address"
              placeholder="Calle, número, sector"
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident-lat">Latitud *</Label>
            <Input
              id="incident-lat"
              type="number"
              step="any"
              placeholder="-33.0245"
              value={form.lat}
              onChange={(e) => setField('lat', e.target.value)}
              aria-invalid={!!errors.lat}
            />
            <p className="text-[11px] text-muted-foreground">
              Centro de Viña del Mar: -33.0245
            </p>
            {errors.lat && (
              <p className="text-xs text-destructive">{errors.lat}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident-lng">Longitud *</Label>
            <Input
              id="incident-lng"
              type="number"
              step="any"
              placeholder="-71.5517"
              value={form.lng}
              onChange={(e) => setField('lng', e.target.value)}
              aria-invalid={!!errors.lng}
            />
            <p className="text-[11px] text-muted-foreground">
              Centro de Viña del Mar: -71.5517
            </p>
            {errors.lng && (
              <p className="text-xs text-destructive">{errors.lng}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident-radius">Radio (m)</Label>
            <Input
              id="incident-radius"
              type="number"
              min={0}
              step={10}
              value={form.radiusMeters}
              onChange={(e) => setField('radiusMeters', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incident-affected">Afectados</Label>
              <Input
                id="incident-affected"
                type="number"
                min={0}
                step={1}
                value={form.affected}
                onChange={(e) => setField('affected', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incident-evacuated">Evacuados</Label>
              <Input
                id="incident-evacuated"
                type="number"
                min={0}
                step={1}
                value={form.evacuated}
                onChange={(e) => setField('evacuated', e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="incident-resources">Recursos desplegados</Label>
            <Textarea
              id="incident-resources"
              rows={2}
              placeholder="Ej. 2 carros bomba, 1 ambulancia, 30 bomberos…"
              value={form.resources}
              onChange={(e) => setField('resources', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground sm:col-span-2">
            <MapPin className="h-3.5 w-3.5" />
            <span>
              Sugerencia: obtén lat/lng del mapa (popup) o de Google Maps.
            </span>
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Registrar catástrofe
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Convenience trigger button
export function IncidentFormTrigger({
  onCreated,
  label = 'Nueva Catástrofe',
  variant = 'default',
  size = 'sm',
}: {
  onCreated?: () => void;
  label?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        {label}
      </Button>
      <IncidentFormDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={onCreated}
      />
    </>
  );
}
