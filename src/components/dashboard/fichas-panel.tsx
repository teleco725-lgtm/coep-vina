'use client';

import { useEffect, useMemo, useState } from 'react';
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
  IdCard,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
const COMMUNES = ['Viña del Mar'] as const;

const RISK_LEVELS: RiskLevel[] = ['critico', 'alto', 'medio', 'bajo'];
const STATUSES: FichaStatus[] = ['registrada', 'evaluada', 'derivada', 'cerrada'];
const AGE_RANGES: AgeRange[] = ['0-17', '18-29', '30-59', '60+'];

const FILTER_ALL = '__all__';

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
// New ficha dialog (plain useState controlled form)
// ---------------------------------------------------------------------------
interface NewFichaState {
  fullName: string;
  rut: string;
  address: string;
  commune: string;
  lat: string;
  lng: string;
  phone: string;
  email: string;
  ageRange: AgeRange | '';
  riskLevel: RiskLevel;
  vulnerability: string;
  householdSize: string;
  hasPets: boolean;
  needsMedication: boolean;
  needsMobility: boolean;
  needsEvacuation: boolean;
  notes: string;
  assignedTo: string;
}

const NEW_FICHA_INITIAL: NewFichaState = {
  fullName: '',
  rut: '',
  address: '',
  commune: 'Viña del Mar',
  lat: '',
  lng: '',
  phone: '',
  email: '',
  ageRange: '',
  riskLevel: 'bajo',
  vulnerability: '',
  householdSize: '1',
  hasPets: false,
  needsMedication: false,
  needsMobility: false,
  needsEvacuation: false,
  notes: '',
  assignedTo: '',
};

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
  const [form, setForm] = useState<NewFichaState>(NEW_FICHA_INITIAL);
  const [errors, setErrors] = useState<{
    fullName?: string;
    commune?: string;
    ageRange?: string;
    riskLevel?: string;
    email?: string;
  }>({});

  const setField = <K extends keyof NewFichaState>(
    key: K,
    value: NewFichaState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key in errors) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const resetForm = () => {
    setForm(NEW_FICHA_INITIAL);
    setErrors({});
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: typeof errors = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'Nombre obligatorio';
    if (!form.commune.trim()) nextErrors.commune = 'Comuna obligatoria';
    if (!form.ageRange) nextErrors.ageRange = 'Rango etario obligatorio';
    if (!form.riskLevel) nextErrors.riskLevel = 'Nivel de riesgo obligatorio';
    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      nextErrors.email = 'Email inválido';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const latNum = form.lat.trim() === '' ? null : Number(form.lat);
      const lngNum = form.lng.trim() === '' ? null : Number(form.lng);
      const body = {
        fullName: form.fullName.trim(),
        rut: form.rut.trim() || null,
        address: form.address.trim() || null,
        commune: form.commune,
        lat: latNum === null || !Number.isFinite(latNum) ? null : latNum,
        lng: lngNum === null || !Number.isFinite(lngNum) ? null : lngNum,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        ageRange: form.ageRange || null,
        riskLevel: form.riskLevel,
        vulnerability: form.vulnerability.trim() || null,
        householdSize: Number(form.householdSize) || 1,
        hasPets: form.hasPets,
        needsMedication: form.needsMedication,
        needsMobility: form.needsMobility,
        needsEvacuation: form.needsEvacuation,
        notes: form.notes.trim() || null,
        assignedTo: form.assignedTo.trim() || null,
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
      resetForm();
      onCreated();
    } catch {
      toast.error('Error de red al crear la ficha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva Ficha FIBER</DialogTitle>
          <DialogDescription>
            Registro individual de bienestar y riesgo. Datos sensibles bajo Ley
            19.628 — requiere consentimiento informado del titular.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="ficha-fullName">Nombre completo *</Label>
            <Input
              id="ficha-fullName"
              placeholder="Ej. María González Pérez"
              value={form.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              aria-invalid={!!errors.fullName}
            />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ficha-rut">RUT</Label>
            <Input
              id="ficha-rut"
              placeholder="12.345.678-9"
              value={form.rut}
              onChange={(e) => setField('rut', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ficha-ageRange">Rango etario</Label>
            <Select
              value={form.ageRange || undefined}
              onValueChange={(v) => setField('ageRange', v as AgeRange)}
            >
              <SelectTrigger id="ficha-ageRange" className="w-full">
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {AGE_RANGES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r} años
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.ageRange && (
              <p className="text-xs text-destructive">{errors.ageRange}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="ficha-address">Dirección</Label>
            <Input
              id="ficha-address"
              placeholder="Calle, número, sector"
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ficha-commune">Comuna</Label>
            <Select
              value={form.commune}
              onValueChange={(v) => setField('commune', v)}
            >
              <SelectTrigger id="ficha-commune" className="w-full">
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
            {errors.commune && (
              <p className="text-xs text-destructive">{errors.commune}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ficha-riskLevel">Nivel de riesgo</Label>
            <Select
              value={form.riskLevel}
              onValueChange={(v) => setField('riskLevel', v as RiskLevel)}
            >
              <SelectTrigger id="ficha-riskLevel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RISK_LEVELS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {riskLevelLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.riskLevel && (
              <p className="text-xs text-destructive">{errors.riskLevel}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ficha-lat">Latitud</Label>
            <Input
              id="ficha-lat"
              type="number"
              step="any"
              placeholder="-33.0245"
              value={form.lat}
              onChange={(e) => setField('lat', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ficha-lng">Longitud</Label>
            <Input
              id="ficha-lng"
              type="number"
              step="any"
              placeholder="-71.5517"
              value={form.lng}
              onChange={(e) => setField('lng', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ficha-phone">Teléfono</Label>
            <Input
              id="ficha-phone"
              placeholder="+56 32 …"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ficha-email">Email</Label>
            <Input
              id="ficha-email"
              type="email"
              placeholder="correo@dominio.cl"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ficha-householdSize">Tamaño hogar</Label>
            <Input
              id="ficha-householdSize"
              type="number"
              min={1}
              step={1}
              value={form.householdSize}
              onChange={(e) => setField('householdSize', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="ficha-vulnerability">Vulnerabilidad</Label>
            <Input
              id="ficha-vulnerability"
              placeholder="Movilidad reducida, salud crónica, …"
              value={form.vulnerability}
              onChange={(e) => setField('vulnerability', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="ficha-assignedTo">Asignado a</Label>
            <Input
              id="ficha-assignedTo"
              placeholder="Profesional responsable"
              value={form.assignedTo}
              onChange={(e) => setField('assignedTo', e.target.value)}
            />
          </div>

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
              <div
                key={key}
                className="flex flex-row items-center gap-2"
              >
                <input
                  type="checkbox"
                  id={`ficha-${key}`}
                  checked={form[key] as boolean}
                  onChange={(e) => setField(key, e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label
                  htmlFor={`ficha-${key}`}
                  className="text-xs font-normal"
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="ficha-notes">Notas</Label>
            <Textarea
              id="ficha-notes"
              placeholder="Observaciones, antecedentes relevantes…"
              rows={3}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Trazabilidad: AuditLog (Ley 19.628 art. 2).
            </p>
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
              Crear ficha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit ficha dialog (PATCH, plain useState controlled form)
// ---------------------------------------------------------------------------
interface EditFichaState {
  riskLevel: RiskLevel;
  status: FichaStatus;
  assignedTo: string;
  notes: string;
}

function buildEditState(ficha: FichaFIBER): EditFichaState {
  return {
    riskLevel: ficha.riskLevel,
    status: ficha.status,
    assignedTo: ficha.assignedTo ?? '',
    notes: ficha.notes ?? '',
  };
}

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
  const [form, setForm] = useState<EditFichaState>(() =>
    buildEditState(ficha),
  );

  // Reset local state when the ficha prop changes.
  useEffect(() => {
    setForm(buildEditState(ficha));
  }, [ficha]);

  const setField = <K extends keyof EditFichaState>(
    key: K,
    value: EditFichaState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        riskLevel: form.riskLevel,
        status: form.status,
        assignedTo: form.assignedTo.trim() || null,
        notes: form.notes.trim() || null,
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
        description: `${ficha.code} · ${riskLevelLabel(form.riskLevel)} · ${fichaStatusLabel(
          form.status,
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

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-riskLevel">Nivel de riesgo</Label>
            <Select
              value={form.riskLevel}
              onValueChange={(v) => setField('riskLevel', v as RiskLevel)}
            >
              <SelectTrigger id="edit-riskLevel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RISK_LEVELS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {riskLevelLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-status">Estado</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setField('status', v as FichaStatus)}
            >
              <SelectTrigger id="edit-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {fichaStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="edit-assignedTo">Asignado a</Label>
            <Input
              id="edit-assignedTo"
              placeholder="Profesional responsable"
              value={form.assignedTo}
              onChange={(e) => setField('assignedTo', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="edit-notes">Notas</Label>
            <Textarea
              id="edit-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Cambio registrado en AuditLog.
            </p>
          </div>

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
