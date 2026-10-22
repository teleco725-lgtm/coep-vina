'use client';

import { useEffect, useState } from 'react';
import {
  Scale,
  Shield,
  Lock,
  Globe2,
  ExternalLink,
  Loader2,
  ServerCog,
  Database,
  FileLock,
  KeyRound,
  ClipboardCheck,
  HeartPulse,
} from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import type { ComplianceData, ComplianceItem } from '@/lib/types';

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------
async function fetchCompliance(): Promise<ComplianceData | null> {
  try {
    const res = await fetch('/api/compliance', { cache: 'force-cache' });
    if (!res.ok) return null;
    return (await res.json()) as ComplianceData;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Accordion renderer for a list of ComplianceItem
// ---------------------------------------------------------------------------
function ItemsAccordion({ items }: { items: ComplianceItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay información disponible.
      </p>
    );
  }
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((it) => (
        <AccordionItem key={it.id} value={it.id}>
          <AccordionTrigger className="text-sm font-medium hover:no-underline">
            {it.name}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground">{it.description}</p>
              {it.obligations && it.obligations.length > 0 && (
                <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                  {it.obligations.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              )}
              {it.url && (
                <a
                  href={it.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir fuente oficial
                </a>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// ---------------------------------------------------------------------------
// Data handling tab
// ---------------------------------------------------------------------------
function DataHandlingTab({ data }: { data: ComplianceData['dataHandling'] }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            Principios de tratamiento de datos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {data.principles.map((p) => (
              <Badge
                key={p}
                variant="secondary"
                className="bg-primary/10 text-primary"
              >
                {p}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DataHandlingCard
          icon={Database}
          title="Retención"
          body={data.retention}
        />
        <DataHandlingCard
          icon={KeyRound}
          title="Cifrado"
          body={data.encryption}
        />
        <DataHandlingCard
          icon={ClipboardCheck}
          title="Auditoría"
          body={data.audit}
        />
        {data.backup && (
          <DataHandlingCard
            icon={ServerCog}
            title="Respaldos"
            body={data.backup}
          />
        )}
        {data.access && (
          <DataHandlingCard
            icon={Lock}
            title="Control de acceso"
            body={data.access}
          />
        )}
        {data.consent && (
          <DataHandlingCard
            icon={FileLock}
            title="Consentimiento"
            body={data.consent}
          />
        )}
      </div>
    </div>
  );
}

function DataHandlingCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5 p-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <h4 className="text-sm font-semibold">{title}</h4>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------
export function CompliancePanel() {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCompliance()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className="p-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" />
            Cumplimiento Legal y Ciberseguridad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-4">
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          No se pudo cargar el panel de cumplimiento.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col gap-3 p-4">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-primary" />
          Cumplimiento Legal y Ciberseguridad
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Marco normativo aplicable al sistema de gestión de emergencias — SENAPRED,
          Ley 19.628 (datos), Ley 21.519 (ciberseguridad), ISO 27001, NIST CSF.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="frameworks" className="w-full">
          <TabsList className="flex w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="frameworks" className="flex-1">
              <HeartPulse className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Marcos Legales</span>
              <span className="sm:hidden">Marcos</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="flex-1">
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Protección de Datos</span>
              <span className="sm:hidden">Datos</span>
            </TabsTrigger>
            <TabsTrigger value="cyber" className="flex-1">
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ciberseguridad</span>
              <span className="sm:hidden">Cyber</span>
            </TabsTrigger>
            <TabsTrigger value="disaster" className="flex-1">
              <Scale className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Leyes de Catástrofe</span>
              <span className="sm:hidden">Catástrofe</span>
            </TabsTrigger>
            <TabsTrigger value="handling" className="flex-1">
              <Database className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Manejo de Datos</span>
              <span className="sm:hidden">Manejo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="frameworks" className="mt-3">
            <ItemsAccordion items={data.frameworks} />
          </TabsContent>
          <TabsContent value="data" className="mt-3">
            <ItemsAccordion items={data.dataProtection} />
          </TabsContent>
          <TabsContent value="cyber" className="mt-3">
            <ItemsAccordion items={data.cybersecurity} />
          </TabsContent>
          <TabsContent value="disaster" className="mt-3">
            <ItemsAccordion items={data.disasterLaws} />
          </TabsContent>
          <TabsContent value="handling" className="mt-3">
            <DataHandlingTab data={data.dataHandling} />
          </TabsContent>
        </Tabs>
      </CardContent>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Globe2 className="h-3 w-3" />
        <span>
          Información de referencia · valida siempre contra la fuente oficial
          (BCN / SENAPRED).
        </span>
      </div>
    </Card>
  );
}
