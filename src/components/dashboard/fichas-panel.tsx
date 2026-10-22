'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Pill,
  Accessibility,
  Ambulance,
  Phone,
  Mail,
  MapPin,
  FileText,
  Loader2,
  Save,
  Search,
  RefreshCw,
} from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import type { FichaFIBER, RiskLevel, FichaStatus, AgeRange } from '@/lib/types';
import {
  riskLevelLabel,
  riskLevelBadgeClass,
  fichaStatusLabel,
} from '@/lib/severity';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const COMMUNES = [
  'Viña del Mar',
  'Valparaíso',
  'Concón',
  'Quilpué',
  'Villa Alemana',
] as const;

const RISK_LEVELS: RiskLevel[] = ['critico', 'alto', 'medio', 'bajo'];
const STATUSES: FichaStatus[] = ['registrada', 'evaluada', 'derivada', 'cerrada'];
const AGE_RANGES: AgeRange[] = ['0-17', '18-29', '30-59', '60+'];

const FILTER_ALL = '__all__';

// ---------------------------------------------------------------------------
// Schemas (zod)
// ---------------------------------------------------------------------------
const newFichaSchema = z.object({
  fullName: z.string().min(1, 'Nombre obligatorio'),
  rut: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  commune: z.string().default('Viña del Mar'),
  lat: z.coerce.number().optional().nullable(),
  lng: z.coerce.number().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable().or(z.literal('')),
  ageRange: z.enum(['0-17', '18-29', '30-59', '60+']).optional().nullable(),
  riskLevel: z.enum(['bajo', 'medio', 'alto', 'critico']).default('bajo'),
  vulnerability: z.string().optional().nullable(),
  householdSize: z.coerce.number().int().min(1, '≥1').default(1),
  hasPets: z.boolean().default(false),
  needsMedication: z.boolean().default(false),
  needsMobility: z.boolean().default(false),
  needsEvacuation: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
});
type NewFichaForm = z.infer<typeof newFichaSchema>;

const editFichaSchema = z.object({
  riskLevel: z.enum(['bajo', 'medio', 'alto', 'critico']),
  status: z.enum(['registrada', 'evaluada', 'derivada', 'cerrada']),
  assignedTo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
type EditFichaForm = z.infer<typeof editFichaSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fetchFichas(
  filters: Record<string, string | undefined>,
): Promise<FichaFIBER[]> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v && v !== FILTER_ALL) params.set(k, v);
  }
  params.set('limit', '200');
  const res = await fetch(`/api/fichas?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('No se pudieron cargar las fichas');
  return (await res.json()) as FichaFIBER[];
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------
export function FichasPanel() {
  const queryClient = useQueryClient();
  const [communeFilter, setCommuneFilter] = useState<string>(FILTER_ALL);
  const [riskFilter, setRiskFilter] = useState<string>(FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL);
  const [search, setSearch] = useState<string>('');

  const [selected, setSelected] = useState<FichaFIBER | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

  const queryKey = useMemo(
    () => ['fichas', { communeFilter, riskFilter, statusFilter }],
    [communeFilter, riskFilter, statusFilter],
  );

  const { data: fichas = [], isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      fetchFichas({
        commune: communeFilter,
        riskLevel: riskFilter,
        status: statusFilter,
      }),
    staleTime: 30_000,
  });

  const filteredFichas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fichas;
    return fichas.filter(
      (f) =>
        f.fullName.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q) ||
        (f.rut ?? '').toLowerCase().includes(q) ||
        (f.address ?? '').toLowerCase().includes(q),
    );
  }, [fichas, search]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['fichas'] });
  };

  return (
    <Card className="flex h-full flex-col gap-3 p-4">
      <CardHeader className="px-0 pt-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Fichas FIBER · Registro de Bienestar y Riesgo
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refresh}
              aria-label="Refrescar fichas"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refrescar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsNewDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva Ficha
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-1.5 rounded-md border bg-background px-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar nombre, RUT, dirección…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 bg-transparent px-1 text-sm focus-visible:ring-0"
            aria-label="Buscar fichas"
          />
        </div>
        <Select value={communeFilter} onValueChange={setCommuneFilter}>
          <SelectTrigger className="h-8 w-full text-xs" size="sm">
            <SelectValue placeholder="Comuna" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Todas las comunas</SelectItem>
            {COMMUNES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="h-8 w-full text-xs" size="sm">
            <SelectValue placeholder="Riesgo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Todo riesgo</SelectItem>
            {RISK_LEVELS.map((r) => (
              <SelectItem key={r} value={r}>
                {riskLevelLabel(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-full text-xs" size="sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Todo estado</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {fichaStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <CardContent className="max-h-96 overflow-y-auto p-0">
        <div className="rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">Comuna</TableHead>
                <TableHead className="hidden md:table-cell">Edad</TableHead>
                <TableHead>Riesgo</TableHead>
                <TableHead className="hidden lg:table-cell">Estado</TableHead>
                <TableHead>Necesidades</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredFichas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    No se encontraron fichas con los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFichas.map((f) => (
                  <TableRow
                    key={f.id}
                    onClick={() => setSelected(f)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-mono text-xs">{f.code}</TableCell>
                    <TableCell className="font-medium">{f.fullName}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {f.commune}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {f.ageRange ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${riskLevelBadgeClass(f.riskLevel)} text-[10px]`}>
                        {riskLevelLabel(f.riskLevel)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline" className="text-[10px]">
                        {fichaStatusLabel(f.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {f.needsEvacuation && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-sev-critical/10 text-sev-critical">
                                <Ambulance className="h-3.5 w-3.5" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Requiere evacuación</TooltipContent>
                          </Tooltip>
                        )}
                        {f.needsMedication && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-sev-warning/10 text-sev-warning">
                                <Pill className="h-3.5 w-3.5" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Requiere medicación</TooltipContent>
                          </Tooltip>
                        )}
                        {f.needsMobility && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-sev-watch/20 text-sev-watch">
                                <Accessibility className="h-3.5 w-3.5" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Movilidad reducida</TooltipContent>
                          </Tooltip>
                        )}
                        {!f.needsEvacuation &&
                          !f.needsMedication &&
                          !f.needsMobility && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Mostrando <strong className="tabular-nums">{filteredFichas.length}</strong>{' '}
          de <strong className="tabular-nums">{fichas.length}</strong> fichas
        </span>
        <span>Ley 19.628 · Datos sensibles</span>
      </div>

      {/* Edit dialog */}
      {selected && (
        <EditFichaDialog
          ficha={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            setSelected(null);
            refresh();
          }}
        />
      )}

      {/* New dialog */}
      <NewFichaDialog
        open={isNewDialogOpen}
        onOpenChange={setIsNewDialogOpen}
        onCreated={() => {
          setIsNewDialogOpen(false);
          refresh();
        }}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// New ficha dialog (react-hook-form + zod)
// ---------------------------------------------------------------------------
function NewFichaDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<NewFichaForm>({
    resolver: zodResolver(newFichaSchema),
    defaultValues: {
      fullName: '',
      rut: '',
      address: '',
      commune: 'Viña del Mar',
      lat: null,
      lng: null,
      phone: '',
      email: '',
      ageRange: null,
      riskLevel: 'bajo',
      vulnerability: '',
      householdSize: 1,
      hasPets: false,
      needsMedication: false,
      needsMobility: false,
      needsEvacuation: false,
      notes: '',
      assignedTo: '',
    },
  });

  const onSubmit = async (values: NewFichaForm) => {
    setSubmitting(true);
    try {
      const body = {
        ...values,
        email: values.email === '' ? null : values.email,
        lat: values.lat === null || Number.isNaN(values.lat as number) ? null : values.lat,
        lng: values.lng === null || Number.isNaN(values.lng as number) ? null : values.lng,
      };
      const res = await fetch('/api/fichas', {
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
          err?.error ??
          err?.issues?.[0]?.message ??
          'No se pudo crear la ficha.';
        toast.error('Error al crear ficha', { description: msg });
        return;
      }
      const created = (await res.json()) as FichaFIBER;
      toast.success('Ficha creada', {
        description: `Código ${created.code}`,
      });
      form.reset();
      onCreated();
    } catch {
      toast.error('Error de red al crear la ficha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva Ficha FIBER</DialogTitle>
          <DialogDescription>
            Registro individual de bienestar y riesgo. Datos sensibles bajo Ley
            19.628 — requiere consentimiento informado del titular.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nombre completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. María González Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RUT</FormLabel>
                  <FormControl>
                    <Input placeholder="12.345.678-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ageRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rango etario</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v as AgeRange)}
                    value={field.value ?? undefined}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AGE_RANGES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r} años
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
                <FormItem className="sm:col-span-2">
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Calle, número, sector"
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
              name="riskLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nivel de riesgo</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RISK_LEVELS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {riskLevelLabel(r)}
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
              name="lat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Latitud</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="-33.0245"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lng"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Longitud</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="-71.5517"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="+56 32 …" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="correo@dominio.cl"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="householdSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tamaño hogar</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} step={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vulnerability"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Vulnerabilidad</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Movilidad reducida, salud crónica, …"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Asignado a</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Profesional responsable"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Boolean needs */}
            <div className="grid grid-cols-2 gap-2 sm:col-span-2">
              {(
                [
                  ['needsEvacuation', 'Requiere evacuación'],
                  ['needsMedication', 'Requiere medicación'],
                  ['needsMobility', 'Movilidad reducida'],
                  ['hasPets', 'Tiene mascotas'],
                ] as const
              ).map(([key, label]) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value as boolean}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="h-4 w-4 rounded border-input"
                        />
                      </FormControl>
                      <FormLabel className="text-xs font-normal">
                        {label}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones, antecedentes relevantes…"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Trazabilidad: AuditLog (Ley 19.628 art. 2).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                Crear ficha
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit ficha dialog (PATCH)
// ---------------------------------------------------------------------------
function EditFichaDialog({
  ficha,
  onClose,
  onUpdated,
}: {
  ficha: FichaFIBER;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<EditFichaForm>({
    resolver: zodResolver(editFichaSchema),
    defaultValues: {
      riskLevel: ficha.riskLevel,
      status: ficha.status,
      assignedTo: ficha.assignedTo ?? '',
      notes: ficha.notes ?? '',
    },
  });

  // Reset form when ficha changes
  useEffect(() => {
    form.reset({
      riskLevel: ficha.riskLevel,
      status: ficha.status,
      assignedTo: ficha.assignedTo ?? '',
      notes: ficha.notes ?? '',
    });
  }, [ficha, form]);

  const onSubmit = async (values: EditFichaForm) => {
    setSubmitting(true);
    try {
      const body = {
        riskLevel: values.riskLevel,
        status: values.status,
        assignedTo: values.assignedTo || null,
        notes: values.notes || null,
      };
      const res = await fetch(`/api/fichas/${ficha.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error('Error al actualizar', {
          description: err?.error ?? 'Intenta de nuevo.',
        });
        return;
      }
      toast.success('Ficha actualizada', {
        description: `${ficha.code} · ${riskLevelLabel(values.riskLevel)} · ${fichaStatusLabel(
          values.status,
        )}`,
      });
      onUpdated();
    } catch {
      toast.error('Error de red al actualizar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {ficha.code}
          </DialogTitle>
          <DialogDescription>
            {ficha.fullName} · {ficha.commune}
          </DialogDescription>
        </DialogHeader>

        {/* Read-only detail */}
        <div className="grid grid-cols-1 gap-2 rounded-md border bg-muted/30 p-3 text-xs sm:grid-cols-2">
          {ficha.rut && (
            <DetailRow icon={IdCard} label="RUT" value={ficha.rut} />
          )}
          {ficha.address && (
            <DetailRow icon={MapPin} label="Dirección" value={`${ficha.address}, ${ficha.commune}`} />
          )}
          {ficha.phone && (
            <DetailRow icon={Phone} label="Teléfono" value={ficha.phone} />
          )}
          {ficha.email && (
            <DetailRow icon={Mail} label="Email" value={ficha.email} />
          )}
          {ficha.ageRange && (
            <DetailRow icon={Users} label="Edad" value={`${ficha.ageRange} años`} />
          )}
          <DetailRow
            icon={Users}
            label="Hogar"
            value={`${ficha.householdSize} personas`}
          />
          {ficha.vulnerability && (
            <DetailRow icon={Accessibility} label="Vulnerabilidad" value={ficha.vulnerability} />
          )}
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="riskLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nivel de riesgo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RISK_LEVELS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {riskLevelLabel(r)}
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {fichaStatusLabel(s)}
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
              name="assignedTo"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Asignado a</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Profesional responsable"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormDescription>
                    Cambio registrado en AuditLog.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-foreground">{value}</span>
      </div>
    </div>
  );
}
