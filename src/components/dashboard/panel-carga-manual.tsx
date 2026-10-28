'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  X,
  Loader2,
  Clock,
  ExternalLink,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
  MapPin,
  AlertTriangle,
} from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface AlertaManual {
  id: string;
  fuente: string;
  titulo: string;
  descripcion: string | null;
  categoria: string;
  severidad: string;
  estado: string;
  comuna: string;
  urlFuente: string | null;
  operador: string;
  confirmadoEn: string;
  fechaEvento: string;
  closedAt: string | null;
}

const FUENTES = [
  { value: 'senapred', label: 'SENAPRED', url: 'senapred.cl/eventos/' },
  { value: 'shoa', label: 'SHOA', url: 'shoa.cl/php/radioavisos.php' },
  { value: 'cbv2', label: 'Bomberos Viña', url: 'x.com/bomberosvina' },
  { value: 'carabineros', label: 'Carabineros', url: 'x.com/ZonaCarabValpo' },
  { value: 'chilquinta', label: 'Chilquinta', url: 'chilquinta.cl/interrupciones' },
  { value: 'munivina', label: 'Municipalidad', url: 'munivina.cl/seguridad-ciudadana' },
];

const CATEGORIAS = [
  { value: 'sismo', label: 'Sismo' },
  { value: 'inundacion', label: 'Inundación' },
  { value: 'corte_luz', label: 'Corte de Luz' },
  { value: 'accidente', label: 'Accidente' },
  { value: 'delito', label: 'Delito' },
  { value: 'meteorologica', label: 'Meteorológica' },
  { value: 'transito', label: 'Tránsito' },
  { value: 'otro', label: 'Otro' },
];

const SEVERIDADES = [
  { value: 'info', label: 'Información', color: 'text-sev-info' },
  { value: 'watch', label: 'Vigilancia', color: 'text-sev-watch' },
  { value: 'warning', label: 'Alerta', color: 'text-sev-warning' },
  { value: 'critical', label: 'Crítica', color: 'text-sev-critical' },
];

function fuenteLabel(code: string): string {
  return FUENTES.find((f) => f.value === code)?.label ?? code;
}

function fuenteUrl(code: string): string {
  return FUENTES.find((f) => f.value === code)?.url ?? '';
}

function categoriaLabel(cat: string): string {
  return CATEGORIAS.find((c) => c.value === cat)?.label ?? cat;
}

function formatearFecha(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function PanelCargaManual() {
  const [alertas, setAlertas] = useState<AlertaManual[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [fuente, setFuente] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('otro');
  const [severidad, setSeveridad] = useState('info');
  const [urlFuente, setUrlFuente] = useState('');
  const [operador, setOperador] = useState('');
  const [fechaEvento, setFechaEvento] = useState('');

  // Cargar alertas manuales
  const cargarAlertas = async () => {
    try {
      const res = await fetch('/api/alerta-manual', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAlertas(data);
      }
    } catch {
      // noop
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarAlertas();
  }, []);

  // Reset form
  const resetForm = () => {
    setFuente('');
    setTitulo('');
    setDescripcion('');
    setCategoria('otro');
    setSeveridad('info');
    setUrlFuente('');
    setOperador('');
    setFechaEvento('');
  };

  // Submit
  const handleSubmit = async () => {
    if (!fuente || !titulo || !operador || !fechaEvento) {
      toast.error('Complete los campos obligatorios: fuente, título, operador y fecha del evento.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/alerta-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fuente,
          titulo,
          descripcion: descripcion || null,
          categoria,
          severidad,
          urlFuente: urlFuente || null,
          operador,
          fechaEvento: new Date(fechaEvento).toISOString(),
        }),
      });

      if (res.ok) {
        toast.success(`Alerta confirmada manualmente por ${operador}`);
        resetForm();
        setDialogOpen(false);
        cargarAlertas();
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Error al registrar la alerta');
      }
    } catch {
      toast.error('Error de conexión');
    }
    setSubmitting(false);
  };

  // Cerrar alerta
  const handleCerrar = async (id: string) => {
    try {
      const res = await fetch(`/api/alerta-manual?id=${id}`, { method: 'PATCH' });
      if (res.ok) {
        toast.success('Alerta cerrada');
        cargarAlertas();
      }
    } catch {
      toast.error('Error al cerrar la alerta');
    }
  };

  // Autofill URL al seleccionar fuente
  const handleFuenteChange = (value: string) => {
    setFuente(value);
    const url = fuenteUrl(value);
    if (url) {
      setUrlFuente(`https://${url}`);
    }
  };

  return (
    <Card className="flex h-full flex-col gap-0 overflow-hidden p-0">
      <CardHeader className="glass sticky top-0 z-10 flex flex-row items-center justify-between gap-2 border-b bg-card/80 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-0.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Carga Manual de Alertas
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Confirmadas manualmente — sin simulación
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setDialogOpen(true)}
          aria-label="Registrar nueva alerta manual"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Nueva Alerta</span>
        </Button>
      </CardHeader>

      <CardContent className="max-h-[26rem] overflow-y-auto p-3">
        {loading ? (
          <div className="flex h-[20rem] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : alertas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <ShieldCheck className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No hay alertas manuales registradas hoy.
            </p>
            <p className="max-w-xs text-[11px] text-muted-foreground">
              Las fuentes oficiales no se pueden consultar automáticamente
              (SENAPRED requiere Cognito, SHOA tiene captcha, X no tiene
              API gratuita). Use el botón <b>Nueva Alerta</b> para registrar
              una alerta confirmada.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {alertas.map((a, idx) => (
              <div
                key={`manual-${idx}-${a.id}`}
                className={`rounded-md border-l-4 bg-card/95 px-3 py-2.5 text-xs shadow-sm ${
                  a.estado === 'activa' ? 'border-l-emerald-500' : 'border-l-gray-400 opacity-60'
                }`}
              >
                {/* Header: fuente + estado + hora */}
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                      {fuenteLabel(a.fuente)}
                    </Badge>
                    {a.estado === 'activa' ? (
                      <Badge variant="outline" className="gap-1 border-emerald-400/50 px-1.5 py-0 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Vigente
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 border-gray-400/50 px-1.5 py-0 text-[10px] font-medium text-gray-500">
                        <XCircle className="h-3 w-3" />
                        Cerrada
                      </Badge>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {formatearFecha(a.fechaEvento)}
                  </span>
                </div>

                {/* Título */}
                <p className="font-medium leading-snug text-foreground">{a.titulo}</p>

                {/* Descripción */}
                {a.descripcion && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{a.descripcion}</p>
                )}

                {/* Meta: operador + fecha confirmación + URL */}
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {a.operador}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Operador que confirmó</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatearFecha(a.confirmadoEn)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Fecha/hora de confirmación manual</TooltipContent>
                  </Tooltip>

                  <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                    {categoriaLabel(a.categoria)}
                  </Badge>

                  {a.urlFuente && (
                    <a
                      href={a.urlFuente}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Fuente
                    </a>
                  )}
                </div>

                {/* Etiqueta de confirmación manual */}
                <p className="mt-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ Confirmado manualmente — {formatearFecha(a.confirmadoEn)} por {a.operador}
                </p>

                {/* Botón cerrar */}
                {a.estado === 'activa' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1.5 h-6 px-2 text-[10px]"
                    onClick={() => handleCerrar(a.id)}
                  >
                    Cerrar alerta
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Dialog: Nueva alerta manual */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Alerta Manual</DialogTitle>
            <DialogDescription>
              Confirme manualmente una alerta de fuente oficial. Esta alerta
              aparecerá con la etiqueta &quot;Confirmado manualmente&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            {/* Fuente */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Fuente oficial *</Label>
              <Select value={fuente} onValueChange={handleFuenteChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccione la fuente" />
                </SelectTrigger>
                <SelectContent>
                  {FUENTES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label} ({f.url})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Título */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Título de la alerta *</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Alerta Amarilla - Sistema frontal activo"
                className="h-9"
              />
            </div>

            {/* Descripción */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Descripción</Label>
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalle de la alerta..."
                rows={2}
                className="text-sm"
              />
            </div>

            {/* Categoría + Severidad */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Categoría</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Severidad</Label>
                <Select value={severidad} onValueChange={setSeveridad}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERIDADES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* URL fuente */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">URL de la fuente (de donde sacó la info)</Label>
              <Input
                value={urlFuente}
                onChange={(e) => setUrlFuente(e.target.value)}
                placeholder="https://senapred.cl/eventos/..."
                className="h-9"
              />
            </div>

            {/* Operador + Fecha */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Nombre del operador *</Label>
                <Input
                  value={operador}
                  onChange={(e) => setOperador(e.target.value)}
                  placeholder="Su nombre"
                  className="h-9"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Fecha/hora del evento *</Label>
                <Input
                  type="datetime-local"
                  value={fechaEvento}
                  onChange={(e) => setFechaEvento(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-1 h-4 w-4" />
                  Confirmar alerta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
