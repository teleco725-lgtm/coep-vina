// ============================================================================
// POST /api/export/pdf
// ----------------------------------------------------------------------------
// Genera un archivo .pdf con el mismo INFORME que la ruta Word. La librería
// `pdfkit` corre del lado del servidor y no afecta el bundle del cliente.
// ============================================================================
import PDFDocument from 'pdfkit';
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

const BRAND = '#3A78B8';
const ACCENT = '#D4A943';
const DARK = '#1F2937';
const MUTED = '#6B7280';
const LIGHT = '#F3F4F6';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function wrapText(doc: PDFKit.PDFDocument, text: string, fontSize: number, x: number, y: number, maxWidth: number, lineHeight = fontSize * 1.35): number {
  // Returns the new y position after writing the wrapped text.
  doc.fontSize(fontSize);
  const words = text.split(/\s+/);
  let line = '';
  let curY = y;
  for (const w of words) {
    const tentative = line ? `${line} ${w}` : w;
    if (doc.widthOfString(tentative) > maxWidth && line) {
      doc.text(line, x, curY, { width: maxWidth, lineBreak: false });
      curY += lineHeight;
      line = w;
    } else {
      line = tentative;
    }
  }
  if (line) {
    doc.text(line, x, curY, { width: maxWidth, lineBreak: false });
    curY += lineHeight;
  }
  return curY;
}

function newPageIfNeed(doc: PDFKit.PDFDocument, y: number, needed: number, margin: number, pageHeight: number): number {
  if (y + needed > pageHeight - margin - 30) {
    doc.addPage();
    return margin;
  }
  return y;
}

function drawHeading(doc: PDFKit.PDFDocument, text: string, level: 1 | 2, y: number, margin: number, pageWidth: number, pageHeight: number): number {
  const fontSize = level === 1 ? 18 : 14;
  const color = level === 1 ? BRAND : '#475569';
  y = newPageIfNeed(doc, y, fontSize + 12, margin, pageHeight);
  y += 8;
  doc.fillColor(color).fontSize(fontSize).font('Helvetica-Bold');
  doc.text(text, margin, y, { width: pageWidth - margin * 2 });
  y += fontSize * 1.4 + 6;
  if (level === 1) {
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor(ACCENT).lineWidth(1.5).stroke();
    y += 8;
  }
  return y;
}

function drawParagraph(doc: PDFKit.PDFDocument, text: string, y: number, margin: number, pageWidth: number, pageHeight: number): number {
  y = newPageIfNeed(doc, y, 60, margin, pageHeight);
  doc.fillColor(DARK).fontSize(11).font('Helvetica');
  y = wrapText(doc, text, 11, margin, y, pageWidth - margin * 2, 16);
  return y + 6;
}

function drawBullet(doc: PDFKit.PDFDocument, text: string, y: number, margin: number, pageWidth: number, pageHeight: number): number {
  y = newPageIfNeed(doc, y, 30, margin, pageHeight);
  doc.fillColor(DARK).fontSize(11).font('Helvetica');
  const indent = margin + 16;
  const bulletWidth = pageWidth - indent - margin;
  // Draw the bullet glyph
  doc.fillColor(BRAND).font('Helvetica-Bold');
  doc.text('•', margin, y, { lineBreak: false });
  doc.fillColor(DARK).font('Helvetica');
  const newY = wrapText(doc, text, 11, indent, y, bulletWidth, 16);
  return Math.max(newY, y + 16) + 4;
}

function drawTable(
  doc: PDFKit.PDFDocument,
  header: string[],
  rows: string[][],
  y: number,
  margin: number,
  pageWidth: number,
  pageHeight: number,
): number {
  const cols = header.length;
  const tableWidth = pageWidth - margin * 2;
  // Proportional column widths
  const colWidths: number[] = [];
  // Heuristic: assign a fixed width to numeric columns and divide the rest
  const fullTextLens = header.map((h, i) =>
    Math.max(
      h.length,
      ...rows.map((r) => (r[i] ?? '').toString().length),
    ),
  );
  const totalLen = fullTextLens.reduce((s, l) => s + l, 0) || 1;
  for (let i = 0; i < cols; i++) {
    colWidths.push(Math.max(60, (fullTextLens[i] / totalLen) * tableWidth));
  }
  // Normalize to fit
  const total = colWidths.reduce((s, w) => s + w, 0);
  const scale = tableWidth / total;
  for (let i = 0; i < cols; i++) colWidths[i] *= scale;

  const rowHeight = 22;
  y = newPageIfNeed(doc, y, rowHeight * (rows.length + 1) + 10, margin, pageHeight);
  let curY = y;

  // Header row
  doc.rect(margin, curY, tableWidth, rowHeight).fill(BRAND);
  doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
  let cx = margin;
  for (let i = 0; i < cols; i++) {
    doc.text(header[i], cx + 4, curY + 6, {
      width: colWidths[i] - 8,
      lineBreak: false,
    });
    cx += colWidths[i];
  }
  curY += rowHeight;

  // Body rows
  doc.font('Helvetica').fontSize(8.5);
  for (let ri = 0; ri < rows.length; ri++) {
    curY = newPageIfNeed(doc, curY, rowHeight + 4, margin, pageHeight);
    const bg = ri % 2 === 0 ? '#FFFFFF' : LIGHT;
    doc.rect(margin, curY, tableWidth, rowHeight).fill(bg);
    doc.fillColor(DARK);
    cx = margin;
    for (let i = 0; i < cols; i++) {
      const cell = rows[ri][i] ?? '';
      // Truncate the cell text if too long, with ellipsis
      let txt = cell;
      const maxW = colWidths[i] - 8;
      if (doc.widthOfString(txt) > maxW) {
        while (txt.length > 1 && doc.widthOfString(txt + '…') > maxW) {
          txt = txt.slice(0, -1);
        }
        txt = txt + '…';
      }
      doc.text(txt, cx + 4, curY + 6, { width: maxW, lineBreak: false });
      cx += colWidths[i];
    }
    curY += rowHeight;
  }
  // Outline border
  doc.lineWidth(0.5).strokeColor('#D1D5DB');
  doc.rect(margin, y, tableWidth, curY - y).stroke();
  return curY + 8;
}

function drawCoverPage(doc: PDFKit.PDFDocument, data: ExportData, pageWidth: number, pageHeight: number) {
  // Top brand bar
  doc.rect(0, 0, pageWidth, 6).fill(BRAND);
  doc.rect(0, 6, pageWidth, 3).fill(ACCENT);

  // Title
  doc.fillColor(BRAND).fontSize(34).font('Helvetica-Bold');
  doc.text('Informe de Emergencias', 0, pageHeight * 0.28, {
    width: pageWidth,
    align: 'center',
  });
  doc.fillColor(DARK).fontSize(22).font('Helvetica-Bold');
  doc.text('Comuna de Viña del Mar', 0, pageHeight * 0.28 + 48, {
    width: pageWidth,
    align: 'center',
  });

  // Brand block
  doc.fillColor(ACCENT).fontSize(15).font('Helvetica-Bold');
  doc.text('COEP Viña · Centro de Operaciones de Emergencia Provincial', 0, pageHeight * 0.28 + 100, {
    width: pageWidth,
    align: 'center',
  });
  doc.fillColor(MUTED).fontSize(12).font('Helvetica');
  doc.text('VeltrixIntegra · Ecosistema Digital 360', 0, pageHeight * 0.28 + 122, {
    width: pageWidth,
    align: 'center',
  });

  // Date
  doc.fillColor(MUTED).fontSize(12).font('Helvetica');
  doc.text(formatLongDate(data.generatedAt), 0, pageHeight * 0.6, {
    width: pageWidth,
    align: 'center',
  });

  // Confidentiality notice
  doc.fillColor(MUTED).fontSize(10).font('Helvetica-Oblique');
  doc.text(
    'Documento confidencial — Ley 19.628 (Protección de Datos de Carácter Personal)',
    0,
    pageHeight * 0.85,
    { width: pageWidth, align: 'center' },
  );
}

function drawFooter(doc: PDFKit.PDFDocument, pageNum: number, totalPages: number, pageWidth: number, pageHeight: number) {
  doc.rect(0, pageHeight - 28, pageWidth, 1).fill('#E5E7EB');
  doc.fillColor(MUTED).fontSize(8).font('Helvetica');
  doc.text(
    'COEP Viña · Centro de Operaciones de Emergencia Provincial · VeltrixIntegra Ecosistema Digital 360 · Confidencial',
    40,
    pageHeight - 22,
    { width: pageWidth / 2 - 40, align: 'left' },
  );
  doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth / 2, pageHeight - 22, {
    width: pageWidth / 2 - 40,
    align: 'right',
  });
}

export async function POST() {
  try {
    const data = await loadExportData();

    // Two-pass render: first pass measures the page count, second pass
    // draws the footer. PDFKit doesn't support true page numbering without
    // a buffer, so we render to a buffer once, count, then re-render.
    // For simplicity we render once with a placeholder and patch it.
    const buf = await renderPdf(data);
    const stamp = data.generatedAt.toISOString().slice(0, 10);
    const filename = `informe-emergencias-vina-del-mar-${stamp}.pdf`;

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[api/export/pdf] error:', err);
    return new Response(
      JSON.stringify({ error: 'No se pudo generar el archivo PDF' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

async function renderPdf(data: ExportData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 60, bottom: 60, left: 50, right: 50 },
        info: {
          Title: 'Informe de Emergencias — Viña del Mar',
          Author: 'COEP Viña · Centro de Operaciones de Emergencia Provincial',
          Subject: 'COEP Viña · Centro de Operaciones de Emergencia Provincial · VeltrixIntegra Ecosistema Digital 360',
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 50;

      // --- Cover page ---
      drawCoverPage(doc, data, pageWidth, pageHeight);
      doc.addPage();

      // --- Body ---
      let y = margin;

      // Section 1: Resumen Ejecutivo
      y = drawHeading(doc, '1. Resumen Ejecutivo', 1, y, margin, pageWidth, pageHeight);
      for (const p of buildResumenEjecutivo(data)) {
        y = drawParagraph(doc, p, y, margin, pageWidth, pageHeight);
      }

      // Section 2: Alertas Activas
      y = drawHeading(doc, '2. Alertas Activas', 1, y, margin, pageWidth, pageHeight);
      y = drawParagraph(
        doc,
        'Las siguientes son las alertas más recientes emitidas por las fuentes oficiales integradas al COEP Viña · Centro de Operaciones de Emergencia Provincial. La severidad se interpreta como: Vigilancia (monitoreo), Alerta (acción recomendada) y Crítica (acción inmediata).',
        y,
        margin,
        pageWidth,
        pageHeight,
      );
      const alertRows = data.alerts.slice(0, 20).map((a) => [
        formatDate(a.issuedAt),
        sourceLabel(a.source.code),
        severityLabel(a.severity),
        a.title,
        a.commune ?? 'Viña del Mar',
      ]);
      y = drawTable(
        doc,
        ['Fecha', 'Fuente', 'Severidad', 'Título', 'Comuna'],
        alertRows.length > 0
          ? alertRows
          : [['Sin alertas recientes', '', '', '', '']],
        y,
        margin,
        pageWidth,
        pageHeight,
      );

      // Section 3: Incidentes Registrados
      y = drawHeading(doc, '3. Incidentes Registrados', 1, y, margin, pageWidth, pageHeight);
      y = drawParagraph(
        doc,
        'Catástrofes y emergencias georreferenciadas en la comuna. El estado indica la fase actual: Activa (en curso), Contenida (bajo control parcial), Controlada (resuelta), Cerrada (finalizada).',
        y,
        margin,
        pageWidth,
        pageHeight,
      );
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
            } ${i.commune}${i.address ? `, ${i.address}` : ''}.`;
        return [
          severityLabel(i.severity),
          incidentStateLabel(i.state),
          `${i.commune}${i.address ? ` · ${i.address}` : ''}`,
          String(i.affected ?? 0),
          String(i.evacuated ?? 0),
          desc,
        ];
      });
      y = drawTable(
        doc,
        ['Severidad', 'Estado', 'Ubicación', 'Afectad.', 'Evacuad.', 'Descripción'],
        incRows.length > 0 ? incRows : [['Sin incidentes', '', '', '', '', '']],
        y,
        margin,
        pageWidth,
        pageHeight,
      );

      // Section 4: Fichas FIBER
      y = drawHeading(doc, '4. Personas en Riesgo (Fichas FIBER)', 1, y, margin, pageWidth, pageHeight);
      y = drawParagraph(
        doc,
        'Registro de personas en situación de vulnerabilidad o riesgo. El nivel de riesgo se interpreta como: Bajo (sin vulnerabilidad especial), Medio (alguna vulnerabilidad), Alto (requiere atención prioritaria), Crítico (atención inmediata).',
        y,
        margin,
        pageWidth,
        pageHeight,
      );
      const fichaRows = data.fichas.slice(0, 30).map((f) => {
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
      y = drawTable(
        doc,
        ['Código', 'Nombre', 'RUT', 'Riesgo', 'Necesidades', 'Estado'],
        fichaRows.length > 0
          ? fichaRows
          : [['Sin fichas', '', '', '', '', '']],
        y,
        margin,
        pageWidth,
        pageHeight,
      );
      y = drawParagraph(
        doc,
        'Nota sobre privacidad: los RUT se incluyen para fines operativos del Comando de Emergencia. El tratamiento de estos datos personales se rige por la Ley 19.628 sobre Protección de Datos de Carácter Personal; el acceso está restringido al personal autorizado y cada consulta queda registrada en la bitácora de auditoría.',
        y,
        margin,
        pageWidth,
        pageHeight,
      );

      // Section 5: Cumplimiento Legal
      y = drawHeading(doc, '5. Cumplimiento Legal y Ciberseguridad', 1, y, margin, pageWidth, pageHeight);
      y = drawParagraph(
        doc,
        'El COEP Viña · Centro de Operaciones de Emergencia Provincial opera bajo el marco normativo chileno. Las leyes y estándares aplicables son los siguientes:',
        y,
        margin,
        pageWidth,
        pageHeight,
      );
      y = drawHeading(doc, 'SENAPRED — Ley 21.151', 2, y, margin, pageWidth, pageHeight);
      y = drawParagraph(
        doc,
        'El Servicio Nacional de Prevención y Respuesta ante Desastres es el organismo rector. En términos simples: SENAPRED coordina a todos los actores de emergencia (Bomberos, Carabineros, Salud, SHOA, CONAF) y exige que cada municipalidad mantenga un sistema de información actualizado y trazable de los incidentes que ocurren en su territorio.',
        y,
        margin,
        pageWidth,
        pageHeight,
      );
      y = drawHeading(doc, 'Ley 19.628 — Protección de Datos Personales', 2, y, margin, pageWidth, pageHeight);
      y = drawParagraph(
        doc,
        'Esta ley protege los datos personales de las personas (nombre, RUT, dirección, salud, ubicación). En términos simples: cualquier ficha FIBER o registro que contenga datos sensibles debe contar con el consentimiento del titular, estar resguardado con acceso restringido y dejar registro de quién lo consulta o lo modifica. Por eso este sistema mantiene una bitácora de auditoría de cada acción.',
        y,
        margin,
        pageWidth,
        pageHeight,
      );
      y = drawHeading(doc, 'Ley 21.519 — Marco de Ciberseguridad', 2, y, margin, pageWidth, pageHeight);
      y = drawParagraph(
        doc,
        'Esta ley crea la Agencia Nacional de Ciberseguridad (ANCI) y obliga a los servicios esenciales —entre ellos la gestión de emergencias comunales— a reportar incidentes de ciberseguridad. En términos simples: el sistema que administra las emergencias también debe protegerse a sí mismo de ataques o fallas.',
        y,
        margin,
        pageWidth,
        pageHeight,
      );
      y = drawHeading(doc, 'ISO/IEC 27001 — Gestión de Seguridad de la Información', 2, y, margin, pageWidth, pageHeight);
      y = drawParagraph(
        doc,
        'Estándar internacional que recomienda buenas prácticas para proteger la información: identificar los riesgos, aplicar controles de acceso, cifrar datos sensibles, capacitar al personal y responder a incidentes. Para el Comando de Emergencia es la guía de referencia para proteger los datos de las personas que atendemos.',
        y,
        margin,
        pageWidth,
        pageHeight,
      );
      y = drawHeading(doc, 'Otros marcos relevantes', 2, y, margin, pageWidth, pageHeight);
      y = drawBullet(doc, 'DFL N°536 — Sistema Nacional de Protección Civil (origen de ONEMI).', y, margin, pageWidth, pageHeight);
      y = drawBullet(doc, 'Ley 18.243 — Cuerpo de Bomberos.', y, margin, pageWidth, pageHeight);
      y = drawBullet(doc, 'Política Nacional de Seguridad Escolar (MINEDUC + SENAPRED).', y, margin, pageWidth, pageHeight);
      y = drawBullet(doc, 'NIST CSF y OWASP Top 10 — buenas prácticas técnicas de ciberseguridad.', y, margin, pageWidth, pageHeight);

      // Section 6: Recomendaciones
      y = drawHeading(doc, '6. Recomendaciones', 1, y, margin, pageWidth, pageHeight);
      y = drawParagraph(
        doc,
        'A partir del análisis de la información disponible, se sugieren las siguientes acciones:',
        y,
        margin,
        pageWidth,
        pageHeight,
      );
      for (const r of buildRecomendaciones(data)) {
        y = drawBullet(doc, r, y, margin, pageWidth, pageHeight);
      }

      // --- Footers on all pages (we know page count after .end) ---
      const range = doc.bufferedPageRange();
      const total = range.start + range.count;
      for (let i = range.start; i < total; i++) {
        doc.switchToPage(i);
        drawFooter(doc, i + 1, total, pageWidth, pageHeight);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Avoid unused import warning for COMPLIANCE_PAYLOAD (kept for parity with word)
void COMPLIANCE_PAYLOAD;
