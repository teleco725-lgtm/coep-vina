'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const COMMUNES = [
  'Viña del Mar',
  'Valparaíso',
  'Concón',
  'Quilpué',
  'Villa Alemana',
] as const;

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

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const incidentSchema = z.object({
  type: z.string().min(1, 'Tipo obligatorio'),
  nature: z.enum(['natural', 'antropico']).default('natural'),
  severity: z.enum(['info', 'watch', 'warning', 'critical']).default('info'),
  state: z
    .enum(['activa', 'contenida', 'controlada', 'cerrada'])
    .default('activa'),
  title: z.string().min(1, 'Título obligatorio'),
  description: z.string().optional().nullable(),
  commune: z.string().default('Viña del Mar'),
  address: z.string().optional().nullable(),
  lat: z.coerce.number({
    required_error: 'Latitud obligatoria',
    invalid_type_error: 'Latitud inválida',
  }),
  lng: z.coerce.number({
    required_error: 'Longitud obligatoria',
    invalid_type_error: 'Longitud inválida',
  }),
  radiusMeters: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(500),
  affected: z.coerce.number().int().nonnegative().default(0),
  evacuated: z.coerce.number().int().nonnegative().default(0),
  resources: z.string().optional().nullable(),
});
type IncidentForm = z.infer<typeof incidentSchema>;

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
  const form = useForm<IncidentForm>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      type: 'incendio_forestal',
      nature: 'natural',
      severity: 'warning',
      state: 'activa',
      title: '',
      description: '',
      commune: 'Viña del Mar',
      address: '',
      lat: -33.0245,
      lng: -71.5517,
      radiusMeters: 500,
      affected: 0,
      evacuated: 0,
      resources: '',
    },
  });

  const onSubmit = async (values: IncidentForm) => {
    setSubmitting(true);
    try {
      const body = {
        ...values,
        description: values.description || null,
        address: values.address || null,
        resources: values.resources || null,
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
        description: values.title,
      });
      form.reset();
      onOpenChange(false);
      onCreated?.();
    } catch {
      toast.error('Error de red al registrar el incidente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INCIDENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {incidentTypeLabel(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Naturaleza</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v as Nature)}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {NATURES.map((n) => (
                        <SelectItem key={n} value={n}>
                          {natureLabel(n)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severidad</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v as Severity)}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {severityLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v as IncidentState)}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {incidentStateLabel(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. Incendio forestal sector Reñaca Alto"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Detalle del evento, antecedentes…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="commune"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comuna</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COMMUNES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Calle, número, sector" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Latitud *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="-33.0245"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Centro de Viña del Mar: -33.0245
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lng"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Longitud *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="-71.5517"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Centro de Viña del Mar: -71.5517
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="radiusMeters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Radio (m)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={10} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-2 sm:col-span-2">
              <FormField
                control={form.control}
                name="affected"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Afectados</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="evacuated"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evacuados</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="resources"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Recursos desplegados</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Ej. 2 carros bomba, 1 ambulncia, 30 bomberos…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
        </Form>
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
