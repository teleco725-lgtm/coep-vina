// ============================================================================
// GET /api/export/excel
// ----------------------------------------------------------------------------
// Genera un archivo .xlsx con múltiples hojas a partir de los datos del
// dashboard (alertas, incidentes, fichas FIBER, resumen y cumplimiento legal).
// Las librerías de generación (xlsx) corren del lado del servidor y no
// afectan el bundle del cliente.
// ============================================================================
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import {
  loadExportData,
  LABELS,
  sourceLabel,
  severityLabel,
  incidentTypeLabel,
  incidentStateLabel,
  riskLevelLabel,
  fichaStatusLabel,
  categoryLabel,
  formatDate,
  COMPLIANCE_PAYLOAD,
} from '../_lib';

export const dynamic = 'force-dynamic';

// XLSX column-width helper: calcula el ancho de cada columna en función del
// contenido, con un mínimo y un máximo razonables.
function autoWidth(rows: Record<string, unknown>[][]): number[] {
  if (rows.length === 0) return [];
  const widths = rows[0].map((cell) => {
    const txt = cell == null ? '' : String((cell as { v?: unknown }).v ?? cell);
    return Math.max(10, Math.min(50, txt.length + 2));
  });
  for (const r of rows) {
    for (let i = 0; i < r.length; i++) {
      const cell = r[i];
      const txt = cell == null ? '' : String((cell as { v?: unknown }).v ?? cell);
      widths[i] = Math.max(widths[i] ?? 10, Math.min(50, txt.length + 2));
    }
  }
  return widths;
}

function applyHeaderStyle(
  ws: XLSX.WorkSheet,
  headerCount: number,
): void {
  // Apply bold style on the first row.
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let c = range.s.c; c <= range.e.c && c < headerCount + range.s.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[addr];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { patternType: 'solid', fgColor: { rgb: '3A78B8' } },
        alignment: { horizontal: 'left', vertical: 'center' },
      };
    }
  }
}

function buildSheet(
  aoa: (string | number)[][],
  opts: { freeze?: boolean } = {},
): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Freeze the first row so the header stays visible when scrolling.
  if (opts.freeze) {
    ws['!freeze'] = { firstRow: true };
    ws['!views'] = [{ state: 'frozen', ySplit: 1 }];
  }
  // Auto width
  const widths = autoWidth(aoa.map((r) => r as unknown as Record<string, unknown>[]));
  ws['!cols'] = widths.map((w) => ({ wch: w }));
  // Apply bold header style
  applyHeaderStyle(ws, aoa[0]?.length ?? 0);
  return ws;
}

export async function GET() {
  try {
    const data = await loadExportData();

    const wb = XLSX.utils.book_new();
    wb.Props = {
      Title: 'Informe de Emergencias — Viña del Mar',
      Subject: 'Comando de Emergencia Regional · VeltrixIntegra Ecosistema Digital 360',
      Author: 'Comando de Emergencia Regional',
      Company: 'VeltrixIntegra Ecosistema Digital 360',
      CreatedDate: data.generatedAt,
    };

    // ----- Sheet 1: Alertas -----
    const alertRows: (string | number)[][] = [
      [
        'Fecha',
        'Fuente',
        'Categoría',
        'Severidad',
        'Estado',
        'Título',
        'Descripción',
        'Comuna',
        'Ubicación',
      ],
    ];
    for (const a of data.alerts) {
      alertRows.push([
        formatDate(a.issuedAt),
        sourceLabel(a.source.code),
        categoryLabel(a.category),
        severityLabel(a.severity),
        LABELS.alertState[a.state] ?? a.state,
        a.title,
        a.description ?? '',
        a.commune ?? 'Viña del Mar',
        a.location ?? '',
      ]);
    }
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet(alertRows, { freeze: true }),
      'Alertas',
    );

    // ----- Sheet 2: Incidentes -----
    const incidentRows: (string | number)[][] = [
      [
        'Tipo',
        'Naturaleza',
        'Severidad',
        'Estado',
        'Título',
        'Comuna',
        'Dirección',
        'Afectados',
        'Evacuados',
        'Recursos',
        'Fecha',
      ],
    ];
    for (const i of data.incidents) {
      incidentRows.push([
        incidentTypeLabel(i.type),
        i.nature === 'natural' ? 'Natural' : 'Antrópico',
        severityLabel(i.severity),
        incidentStateLabel(i.state),
        i.title,
        i.commune,
        i.address ?? '',
        i.affected ?? 0,
        i.evacuated ?? 0,
        i.resources ?? '',
        formatDate(i.createdAt),
      ]);
    }
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet(incidentRows, { freeze: true }),
      'Incidentes',
    );

    // ----- Sheet 3: Fichas FIBER -----
    const fichaRows: (string | number)[][] = [
      [
        'Código',
        'Nombre',
        'RUT',
        'Comuna',
        'Dirección',
        'Rango edad',
        'Nivel de riesgo',
        'Estado',
        'Necesidades',
        'Asignado a',
      ],
    ];
    for (const f of data.fichas) {
      const needs: string[] = [];
      if (f.needsEvacuation) needs.push('Evacuación');
      if (f.needsMedication) needs.push('Medicación');
      if (f.needsMobility) needs.push('Movilidad');
      if (f.hasPets) needs.push('Mascotas');
      fichaRows.push([
        f.code,
        f.fullName,
        f.rut ?? '—',
        f.commune,
        f.address ?? '',
        f.ageRange ?? '',
        riskLevelLabel(f.riskLevel),
        fichaStatusLabel(f.status),
        needs.join(', '),
        f.assignedTo ?? '',
      ]);
    }
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet(fichaRows, { freeze: true }),
      'Fichas FIBER',
    );

    // ----- Sheet 4: Resumen -----
    const summaryRows: (string | number)[][] = [
      ['Indicador', 'Valor'],
      ['Total de alertas', data.stats.alerts.total],
      ['Total de incidentes', data.stats.incidents.total],
      ['Incidentes activos', data.stats.incidents.active],
      ['Total de fichas FIBER', data.stats.fichas.total],
      [
        'Fichas críticas',
        (data.stats.fichas.byRiskLevel.critico ?? 0) +
          (data.stats.fichas.byRiskLevel.alto ?? 0),
      ],
      ['', ''],
      ['Alertas por fuente', ''],
      ...Object.entries(data.stats.alerts.bySource).map(([k, v]) => [
        sourceLabel(k),
        v as number,
      ]),
      ['', ''],
      ['Alertas por severidad', ''],
      ...Object.entries(data.stats.alerts.bySeverity).map(([k, v]) => [
        severityLabel(k),
        v as number,
      ]),
      ['', ''],
      ['Fichas por nivel de riesgo', ''],
      ...Object.entries(data.stats.fichas.byRiskLevel).map(([k, v]) => [
        riskLevelLabel(k),
        v as number,
      ]),
      ['', ''],
      ['Generado el', formatDate(data.generatedAt)],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet(summaryRows, { freeze: true }),
      'Resumen',
    );

    // ----- Sheet 5: Cumplimiento Legal -----
    const complianceRows: (string | number)[][] = [
      ['Categoría', 'Nombre', 'Descripción', 'Enlace'],
    ];
    for (const item of COMPLIANCE_PAYLOAD.frameworks) {
      complianceRows.push([
        'Marco operativo',
        item.name,
        item.description,
        item.url,
      ]);
    }
    for (const item of COMPLIANCE_PAYLOAD.dataProtection) {
      complianceRows.push([
        'Protección de datos',
        item.name,
        item.description,
        item.url,
      ]);
    }
    for (const item of COMPLIANCE_PAYLOAD.cybersecurity) {
      complianceRows.push([
        'Ciberseguridad',
        item.name,
        item.description,
        item.url,
      ]);
    }
    for (const item of COMPLIANCE_PAYLOAD.disasterLaws) {
      complianceRows.push([
        'Leyes de catástrofe',
        item.name,
        item.description,
        item.url,
      ]);
    }
    XLSX.utils.book_append_sheet(
      wb,
      buildSheet(complianceRows, { freeze: true }),
      'Cumplimiento Legal',
    );

    // ----- Write to buffer -----
    const buf = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
      cellStyles: true,
    });

    const stamp = data.generatedAt
      .toISOString()
      .slice(0, 10);
    const filename = `informe-emergencias-vina-del-mar-${stamp}.xlsx`;

    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[api/export/excel] error:', err);
    return new Response(
      JSON.stringify({ error: 'No se pudo generar el archivo Excel' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
