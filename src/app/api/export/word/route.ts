// ============================================================================
// POST /api/export/word
// ----------------------------------------------------------------------------
// Genera un archivo .docx con un INFORME en español humanizado, profesional
// y accesible para un lector no técnico. La librería `docx` corre del lado
// del servidor y no afecta el bundle del cliente.
// ============================================================================
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Footer,
  Header,
  PageNumber,
  ShadingType,
  TabStopType,
  TabStopPosition,
} from 'docx';
import {
  loadExportData,
  ExportData,
  formatDate,
  formatLongDate,
  buildResumenEjecutivo,
  buildRecomendaciones,
  sourceLabel,
  severityLabel,
  incidentTypeLabel,
  incidentStateLabel,
  riskLevelLabel,
  fichaStatusLabel,
  formatRutForReport,
  COMPLIANCE_PAYLOAD,
} from '../_lib';

export const dynamic = 'force-dynamic';

const BRAND_COLOR = '3A78B8';
const ACCENT_COLOR = 'D4A943';

// ---------------------------------------------------------------------------
// Helpers de estilo
// ---------------------------------------------------------------------------
function heading(
  text: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel],
): Paragraph {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: BRAND_COLOR,
        size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 26 : 22,
      }),
    ],
  });
}

function paragraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 160 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: 22, color: '1F2937' })],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, color: '1F2937' })],
  });
}

function tableCell(
  text: string,
  opts: { bold?: boolean; background?: string; color?: string } = {},
): TableCell {
  return new TableCell({
    width: { size: 100, type: WidthType.PERCENTAGE },
    shading: opts.background
      ? { type: ShadingType.SOLID, color: opts.background, fill: opts.background }
      : undefined,
    children: [
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text,
            bold: opts.bold ?? false,
            size: 20,
            color: opts.color ?? '1F2937',
          }),
        ],
      }),
    ],
  });
}

function tableRow(
  cells: string[],
  opts: { header?: boolean } = {},
): TableRow {
  return new TableRow({
    tableHeader: opts.header,
    children: cells.map((c) =>
      tableCell(c, {
        bold: opts.header,
        background: opts.header ? BRAND_COLOR : undefined,
        color: opts.header ? 'FFFFFF' : '1F2937',
      }),
    ),
  });
}

function tableFromRows(header: string[], rows: string[][]): Table {
  const allRows = [tableRow(header, { header: true }), ...rows.map((r) => tableRow(r))];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: allRows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
    },
  });
}

// ---------------------------------------------------------------------------
// Build cover page paragraphs
// ---------------------------------------------------------------------------
function coverPage(data: ExportData): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 2400, after: 120 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Informe de Emergencias',
          bold: true,
          size: 48,
          color: BRAND_COLOR,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Comuna de Viña del Mar',
          bold: true,
          size: 32,
          color: '1F2937',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'COEP Viña · Centro de Operaciones de Emergencia Provincial',
          size: 24,
          color: ACCENT_COLOR,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'VeltrixIntegra · Ecosistema Digital 360',
          size: 22,
          color: '6B7280',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 2000 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: formatLongDate(data.generatedAt),
          size: 22,
          color: '6B7280',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Documento confidencial — Ley 19.628 (Protección de Datos de Carácter Personal)',
          italics: true,
          size: 20,
          color: '6B7280',
        }),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: '', size: 22 })],
      pageBreakBefore: false,
    }),
  ];
}

// ---------------------------------------------------------------------------
// Build the document
// ---------------------------------------------------------------------------
function buildDocument(data: ExportData): Document {
  // Section 1: Resumen Ejecutivo
  const resumenParas = [
    heading('1. Resumen Ejecutivo', HeadingLevel.HEADING_1),
    ...buildResumenEjecutivo(data).map(paragraph),
  ];

  // Section 2: Alertas Activas (table)
  const alertsHeader = ['Fecha', 'Fuente', 'Severidad', 'Título', 'Comuna'];
  const alertsRows = data.alerts.slice(0, 20).map((a) => [
    formatDate(a.issuedAt),
    sourceLabel(a.source.code),
    severityLabel(a.severity),
    a.title,
    a.commune ?? 'Viña del Mar',
  ]);
  const alertsSection = [
    heading('2. Alertas Activas', HeadingLevel.HEADING_1),
    paragraph(
      'Las siguientes son las alertas más recientes emitidas por las fuentes oficiales integradas al COEP Viña · Centro de Operaciones de Emergencia Provincial. La severidad se interpreta como: Vigilancia (monitoreo), Alerta (acción recomendada) y Crítica (acción inmediata).',
    ),
    tableFromRows(alertsHeader, alertsRows.length > 0 ? alertsRows : [['Sin alertas recientes', '', '', '', '']]),
  ];

  // Section 3: Incidentes Registrados (table + short humanized description)
  const incHeader = [
    'Severidad',
    'Estado',
    'Ubicación',
    'Afectados',
    'Evacuados',
    'Descripción',
  ];
  const incRows = data.incidents.slice(0, 25).map((i) => {
    const desc = i.description
      ? i.description
      : `${incidentTypeLabel(i.type)} ${
          i.state === 'activa'
            ? 'activo en'
            : i.state === 'contenida'
            ? 'contenido en'
            : i.state === 'controlada'
            ? 'controlado en'
            : 'cerrado en'
        } ${i.commune}${i.address ? `, ${i.address}` : ''}. ${
          (i.affected ?? 0) > 0
            ? `${i.affected} ${
                i.affected === 1 ? 'persona afectada' : 'personas afectadas'
              }. `
            : ''
        }${(i.evacuated ?? 0) > 0 ? `${i.evacuated} evacuad${i.evacuated === 1 ? 'a' : 'os'}.` : ''}`;
    return [
      severityLabel(i.severity),
      incidentStateLabel(i.state),
      `${i.commune}${i.address ? ` · ${i.address}` : ''}`,
      String(i.affected ?? 0),
      String(i.evacuated ?? 0),
      desc,
    ];
  });
  const incidentsSection = [
    heading('3. Incidentes Registrados', HeadingLevel.HEADING_1),
    paragraph(
      'Catástrofes y emergencias georreferenciadas en la comuna. El estado indica la fase actual: Activa (en curso), Contenida (bajo control parcial), Controlada (resuelta), Cerrada (finalizada).',
    ),
    tableFromRows(
      incHeader,
      incRows.length > 0 ? incRows : [['Sin incidentes', '', '', '', '', '']],
    ),
  ];

  // Section 4: Personas en Riesgo (FIBER)
  const fichasHeader = [
    'Código',
    'Nombre',
    'RUT',
    'Riesgo',
    'Necesidades',
    'Estado',
  ];
  const fichasRows = data.fichas.slice(0, 30).map((f) => {
    const needs: string[] = [];
    if (f.needsEvacuation) needs.push('Evacuación');
    if (f.needsMedication) needs.push('Medicación');
    if (f.needsMobility) needs.push('Movilidad');
    if (f.hasPets) needs.push('Mascotas');
    return [
      f.code,
      f.fullName,
      formatRutForReport(f.rut),
      riskLevelLabel(f.riskLevel),
      needs.join(', ') || '—',
      fichaStatusLabel(f.status),
    ];
  });
  const fichasSection = [
    heading('4. Personas en Riesgo (Fichas FIBER)', HeadingLevel.HEADING_1),
    paragraph(
      'Registro de personas en situación de vulnerabilidad o riesgo. El nivel de riesgo se interpreta como: Bajo (sin vulnerabilidad especial), Medio (alguna vulnerabilidad), Alto (requiere atención prioritaria), Crítico (atención inmediata).',
    ),
    tableFromRows(
      fichasHeader,
      fichasRows.length > 0 ? fichasRows : [['Sin fichas', '', '', '', '', '']],
    ),
    new Paragraph({
      spacing: { before: 80, after: 120 },
      children: [
        new TextRun({
          text: 'Nota sobre privacidad: los RUT se incluyen para fines operativos del Comando de Emergencia. El tratamiento de estos datos personales se rige por la Ley 19.628 sobre Protección de Datos de Carácter Personal; el acceso está restringido al personal autorizado y cada consulta queda registrada en la bitácora de auditoría.',
          italics: true,
          size: 18,
          color: '6B7280',
        }),
      ],
    }),
  ];

  // Section 5: Cumplimiento Legal
  const complianceSection = [
    heading('5. Cumplimiento Legal y Ciberseguridad', HeadingLevel.HEADING_1),
    paragraph(
      'El COEP Viña · Centro de Operaciones de Emergencia Provincial opera bajo el marco normativo chileno. Las leyes y estándares aplicables son los siguientes:',
    ),
    heading('SENAPRED — Ley 21.151', HeadingLevel.HEADING_2),
    paragraph(
      'El Servicio Nacional de Prevención y Respuesta ante Desastres es el organismo rector. En términos simples: SENAPRED coordina a todos los actores de emergencia (Bomberos, Carabineros, Salud, SHOA, CONAF) y exige que cada municipalidad mantenga un sistema de información actualizado y trazable de los incidentes que ocurren en su territorio.',
    ),
    heading('Ley 19.628 — Protección de Datos Personales', HeadingLevel.HEADING_2),
    paragraph(
      'Esta ley protege los datos personales de las personas (nombre, RUT, dirección, salud, ubicación). En términos simples: cualquier ficha FIBER o registro que contenga datos sensibles debe contar con el consentimiento del titular, estar resguardado con acceso restringido y dejar registro de quién lo consulta o lo modifica. Por eso este sistema mantiene una bitácora de auditoría de cada acción.',
    ),
    heading('Ley 21.519 — Marco de Ciberseguridad', HeadingLevel.HEADING_2),
    paragraph(
      'Esta ley crea la Agencia Nacional de Ciberseguridad (ANCI) y obliga a los servicios esenciales —entre ellos la gestión de emergencias comunales— a reportar incidentes de ciberseguridad. En términos simples: el sistema que administra las emergencias también debe protegerse a sí mismo de ataques o fallas.',
    ),
    heading('ISO/IEC 27001 — Gestión de Seguridad de la Información', HeadingLevel.HEADING_2),
    paragraph(
      'Estándar internacional que recomienda buenas prácticas para proteger la información: identificar los riesgos, aplicar controles de acceso, cifrar datos sensibles, capacitar al personal y responder a incidentes. Para el Comando de Emergencia es la guía de referencia para proteger los datos de las personas que atendemos.',
    ),
    heading('Otros marcos relevantes', HeadingLevel.HEADING_2),
    bullet('DFL N°536 — Sistema Nacional de Protección Civil (origen de ONEMI).'),
    bullet('Ley 18.243 — Cuerpo de Bomberos.'),
    bullet('Política Nacional de Seguridad Escolar (MINEDUC + SENAPRED).'),
    bullet('NIST CSF y OWASP Top 10 — buenas prácticas técnicas de ciberseguridad.'),
  ];

  // Section 6: Recomendaciones
  const recsSection = [
    heading('6. Recomendaciones', HeadingLevel.HEADING_1),
    paragraph(
      'A partir del análisis de la información disponible, se sugieren las siguientes acciones:',
    ),
    ...buildRecomendaciones(data).map(bullet),
  ];

  // Build the full document with cover + body + footer.
  return new Document({
    creator: 'COEP Viña · Centro de Operaciones de Emergencia Provincial',
    title: 'Informe de Emergencias — Viña del Mar',
    description:
      'COEP Viña · Centro de Operaciones de Emergencia Provincial · VeltrixIntegra Ecosistema Digital 360',
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22,
            color: '1F2937',
          },
        },
      },
    },
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text:
                      'COEP Viña · Centro de Operaciones de Emergencia Provincial · VeltrixIntegra Ecosistema Digital 360 · Confidencial · Página ',
                    size: 18,
                    color: '6B7280',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: '6B7280',
                  }),
                ],
              }),
            ],
          }),
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                children: [
                  new TextRun({
                    text: 'Informe de Emergencias — Viña del Mar',
                    size: 18,
                    color: '6B7280',
                  }),
                  new TextRun({ text: '\t', size: 18 }),
                  new TextRun({
                    text: formatLongDate(data.generatedAt),
                    size: 18,
                    color: '6B7280',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...coverPage(data),
          new Paragraph({
            spacing: { before: 240 },
            children: [
              new TextRun({
                text: 'Tabla de contenidos',
                bold: true,
                size: 26,
                color: BRAND_COLOR,
              }),
            ],
          }),
          bullet('1. Resumen Ejecutivo'),
          bullet('2. Alertas Activas'),
          bullet('3. Incidentes Registrados'),
          bullet('4. Personas en Riesgo (Fichas FIBER)'),
          bullet('5. Cumplimiento Legal y Ciberseguridad'),
          bullet('6. Recomendaciones'),
          new Paragraph({
            children: [new TextRun({ text: '', size: 22 })],
            pageBreakBefore: true,
          }),
          ...resumenParas,
          ...alertsSection,
          ...incidentsSection,
          ...fichasSection,
          ...complianceSection,
          ...recsSection,
        ],
      },
    ],
  });
}

export async function POST() {
  try {
    const data = await loadExportData();
    const doc = buildDocument(data);
    const buf = await Packer.toBuffer(doc);

    const stamp = data.generatedAt.toISOString().slice(0, 10);
    const filename = `informe-emergencias-vina-del-mar-${stamp}.docx`;

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[api/export/word] error:', err);
    return new Response(
      JSON.stringify({ error: 'No se pudo generar el archivo Word' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
