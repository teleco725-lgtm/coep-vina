// ============================================================================
// POST /api/export/pptx
// ----------------------------------------------------------------------------
// Genera un archivo .pptx (presentación didáctica, 16:9) con un resumen
// visual del estado de emergencias. La librería `pptxgenjs` corre del lado
// del servidor y no afecta el bundle del cliente.
// ============================================================================
import pptxgen from 'pptxgenjs';
import {
  loadExportData,
  ExportData,
  formatLongDate,
  sourceLabel,
  severityLabel,
  incidentTypeLabel,
  incidentStateLabel,
  riskLevelLabel,
  formatDate,
  buildRecomendaciones,
} from '../_lib';

export const dynamic = 'force-dynamic';

// Viña del Mar palette
const COLOR_PRIMARY = '3A78B8'; // azul petróleo
const COLOR_ACCENT = 'D4A943'; // arena dorada
const COLOR_DARK = '1F2937';
const COLOR_MUTED = '6B7280';
const COLOR_LIGHT = 'F3F4F6';
const COLOR_BG = 'FFFFFF';

const SLIDE_W = 13.333; // inches (16:9)
const SLIDE_H = 7.5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function addBrandHeader(slide: pptxgen.Slide, pptx: pptxgen, subtitle: string) {
  // Top brand bar
  slide.addShape('rect', {
    x: 0, y: 0, w: SLIDE_W, h: 0.35,
    fill: { color: COLOR_PRIMARY },
    line: { color: COLOR_PRIMARY, width: 0 },
  });
  slide.addShape('rect', {
    x: 0, y: 0.35, w: SLIDE_W, h: 0.08,
    fill: { color: COLOR_ACCENT },
    line: { color: COLOR_ACCENT, width: 0 },
  });
  // Title bar text (small, right-aligned)
  slide.addText('COEP Viña · Centro de Operaciones de Emergencia Provincial · VeltrixIntegra Ecosistema Digital 360', {
    x: 0.4, y: 0.45, w: SLIDE_W - 0.8, h: 0.3,
    align: 'right', fontSize: 9, color: COLOR_MUTED,
    fontFace: 'Arial',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.4, y: 0.05, w: SLIDE_W - 0.8, h: 0.28,
      align: 'left', fontSize: 10, color: 'FFFFFF',
      bold: true, fontFace: 'Arial',
    });
  }
}

function addFooter(slide: pptxgen.Slide, pageNum: number, totalPages: number) {
  slide.addText(
    `COEP Viña · Centro de Operaciones de Emergencia Provincial · VeltrixIntegra Ecosistema Digital 360 · ${pageNum} / ${totalPages}`,
    {
      x: 0.4, y: SLIDE_H - 0.4, w: SLIDE_W - 0.8, h: 0.3,
      align: 'center', fontSize: 8, color: COLOR_MUTED, fontFace: 'Arial',
    },
  );
}

function bigNumberCard(
  slide: pptxgen.Slide,
  x: number, y: number, w: number, h: number,
  value: string | number, label: string, sublabel: string,
  accentColor = COLOR_PRIMARY,
) {
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: COLOR_LIGHT },
    line: { color: accentColor, width: 1 },
  });
  slide.addText(String(value), {
    x, y: y + 0.25, w, h: 1.4,
    align: 'center', valign: 'middle',
    fontSize: 44, bold: true, color: accentColor, fontFace: 'Arial',
  });
  slide.addText(label, {
    x, y: y + 1.65, w, h: 0.35,
    align: 'center', fontSize: 14, bold: true, color: COLOR_DARK, fontFace: 'Arial',
  });
  slide.addText(sublabel, {
    x, y: y + 2.0, w, h: 0.4,
    align: 'center', fontSize: 9, color: COLOR_MUTED, fontFace: 'Arial',
  });
}

// ---------------------------------------------------------------------------
// Slide builders
// ---------------------------------------------------------------------------
function slide1Title(pptx: pptxgen, data: ExportData): pptxgen.Slide {
  const slide = pptx.addSlide();
  slide.background = { color: COLOR_BG };
  // Big brand band
  slide.addShape('rect', {
    x: 0, y: 0, w: SLIDE_W, h: SLIDE_H * 0.55,
    fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY, width: 0 },
  });
  slide.addShape('rect', {
    x: 0, y: SLIDE_H * 0.55, w: SLIDE_W, h: 0.1,
    fill: { color: COLOR_ACCENT }, line: { color: COLOR_ACCENT, width: 0 },
  });

  slide.addText('COEP Viña · Centro de Operaciones de Emergencia Provincial', {
    x: 0.5, y: 1.7, w: SLIDE_W - 1, h: 1.1,
    align: 'center', fontSize: 40, bold: true, color: 'FFFFFF',
    fontFace: 'Arial',
  });
  slide.addText('Viña del Mar · VeltrixIntegra Ecosistema Digital 360', {
    x: 0.5, y: 2.85, w: SLIDE_W - 1, h: 0.6,
    align: 'center', fontSize: 18, color: COLOR_ACCENT,
    fontFace: 'Arial',
  });
  slide.addText(formatLongDate(data.generatedAt), {
    x: 0.5, y: 3.55, w: SLIDE_W - 1, h: 0.4,
    align: 'center', fontSize: 14, color: 'FFFFFF',
    fontFace: 'Arial',
  });
  slide.addText('Informe de Emergencias · Documento confidencial', {
    x: 0.5, y: SLIDE_H - 0.85, w: SLIDE_W - 1, h: 0.35,
    align: 'center', fontSize: 11, italics: true, color: COLOR_MUTED,
    fontFace: 'Arial',
  });
  return slide;
}

function slide2SituacionActual(pptx: pptxgen, data: ExportData): pptxgen.Slide {
  const slide = pptx.addSlide();
  slide.background = { color: COLOR_BG };
  addBrandHeader(slide, pptx, 'Situación Actual');
  slide.addText('Situación actual de la comuna', {
    x: 0.5, y: 0.85, w: SLIDE_W - 1, h: 0.5,
    align: 'center', fontSize: 26, bold: true, color: COLOR_DARK, fontFace: 'Arial',
  });
  slide.addText('Resumen rápido de los indicadores clave al cierre del informe.', {
    x: 0.5, y: 1.35, w: SLIDE_W - 1, h: 0.35,
    align: 'center', fontSize: 13, color: COLOR_MUTED, fontFace: 'Arial',
  });

  const activeIncidents = data.incidents.filter((i) => i.state === 'activa').length;
  const fichasCriticas =
    (data.stats.fichas.byRiskLevel.critico ?? 0) +
    (data.stats.fichas.byRiskLevel.alto ?? 0);

  const cards = [
    {
      v: data.stats.alerts.total,
      l: 'Alertas activas',
      s: 'Fuentes oficiales integradas',
      c: COLOR_PRIMARY,
    },
    {
      v: activeIncidents,
      l: 'Incidentes en curso',
      s: 'Georreferenciados en el mapa',
      c: 'DC2626',
    },
    {
      v: fichasCriticas,
      l: 'Personas en riesgo',
      s: 'Fichas FIBER con riesgo crítico o alto',
      c: COLOR_ACCENT,
    },
  ];

  const cardW = 3.6;
  const cardH = 2.5;
  const gap = 0.4;
  const totalW = cardW * 3 + gap * 2;
  const startX = (SLIDE_W - totalW) / 2;
  cards.forEach((c, i) => {
    bigNumberCard(
      slide,
      startX + (cardW + gap) * i,
      2.0,
      cardW,
      cardH,
      c.v,
      c.l,
      c.s,
      c.c,
    );
  });

  slide.addText(
    `Fuentes conectadas: ${data.sources.length} · Total de fichas FIBER: ${data.fichas.length}`,
    {
      x: 0.5, y: 5.0, w: SLIDE_W - 1, h: 0.4,
      align: 'center', fontSize: 12, color: COLOR_MUTED, fontFace: 'Arial',
    },
  );
  return slide;
}

function slide3AlertasPorFuente(pptx: pptxgen, data: ExportData): pptxgen.Slide {
  const slide = pptx.addSlide();
  slide.background = { color: COLOR_BG };
  addBrandHeader(slide, pptx, 'Alertas por Fuente');
  slide.addText('Alertas por fuente oficial', {
    x: 0.5, y: 0.85, w: SLIDE_W - 1, h: 0.5,
    align: 'center', fontSize: 26, bold: true, color: COLOR_DARK, fontFace: 'Arial',
  });
  slide.addText(
    'Distribución de alertas por organismo emisor. Una fuente con más alertas no siempre significa más riesgo: cada una reporta lo que corresponde a su ámbito.',
    {
      x: 0.5, y: 1.35, w: SLIDE_W - 1, h: 0.55,
      align: 'center', fontSize: 12, color: COLOR_MUTED, fontFace: 'Arial',
    },
  );

  const bySource = Object.entries(data.stats.alerts.bySource).sort(
    (a, b) => b[1] - a[1],
  );
  if (bySource.length === 0) {
    slide.addText('Sin datos de alertas.', {
      x: 0.5, y: 3.0, w: SLIDE_W - 1, h: 0.5,
      align: 'center', fontSize: 14, color: COLOR_MUTED, fontFace: 'Arial',
    });
    return slide;
  }
  const max = Math.max(...bySource.map(([, v]) => v as number), 1);
  const barAreaX = 3.0;
  const barAreaW = SLIDE_W - barAreaX - 0.5;
  let y = 2.2;
  const rowH = 0.55;
  for (const [code, value] of bySource) {
    const pct = (value as number) / max;
    slide.addText(sourceLabel(code), {
      x: 0.5, y, w: 2.4, h: rowH,
      align: 'right', valign: 'middle',
      fontSize: 12, bold: true, color: COLOR_DARK, fontFace: 'Arial',
    });
    slide.addShape('rect', {
      x: barAreaX, y: y + 0.08, w: barAreaW, h: rowH - 0.18,
      fill: { color: COLOR_LIGHT }, line: { color: COLOR_LIGHT, width: 0 },
    });
    slide.addShape('rect', {
      x: barAreaX, y: y + 0.08, w: barAreaW * pct, h: rowH - 0.18,
      fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY, width: 0 },
    });
    slide.addText(String(value), {
      x: barAreaX + barAreaW * pct + 0.1, y, w: 1.0, h: rowH,
      align: 'left', valign: 'middle', fontSize: 12, bold: true, color: COLOR_DARK,
      fontFace: 'Arial',
    });
    y += rowH + 0.15;
  }
  return slide;
}

function slide4MapaIncidentes(pptx: pptxgen, data: ExportData): pptxgen.Slide {
  const slide = pptx.addSlide();
  slide.background = { color: COLOR_BG };
  addBrandHeader(slide, pptx, 'Mapa de Incidentes');
  slide.addText('Incidentes activos en la comuna', {
    x: 0.5, y: 0.85, w: SLIDE_W - 1, h: 0.5,
    align: 'center', fontSize: 26, bold: true, color: COLOR_DARK, fontFace: 'Arial',
  });
  slide.addText(
    'Listado de los incidentes en curso con su ubicación y severidad. Para el detalle georreferenciado, consulte el mapa del dashboard.',
    {
      x: 0.5, y: 1.35, w: SLIDE_W - 1, h: 0.55,
      align: 'center', fontSize: 12, color: COLOR_MUTED, fontFace: 'Arial',
    },
  );

  const active = data.incidents.filter((i) => i.state === 'activa').slice(0, 8);
  if (active.length === 0) {
    slide.addText('No hay incidentes activos en este momento.', {
      x: 0.5, y: 3.0, w: SLIDE_W - 1, h: 0.5,
      align: 'center', fontSize: 14, color: COLOR_MUTED, fontFace: 'Arial',
    });
    return slide;
  }
  const rows: pptxgen.TableRow[] = [
    [
      { text: 'Tipo', options: { bold: true, color: 'FFFFFF', fill: { color: COLOR_PRIMARY } } },
      { text: 'Severidad', options: { bold: true, color: 'FFFFFF', fill: { color: COLOR_PRIMARY } } },
      { text: 'Ubicación', options: { bold: true, color: 'FFFFFF', fill: { color: COLOR_PRIMARY } } },
      { text: 'Afectados', options: { bold: true, color: 'FFFFFF', fill: { color: COLOR_PRIMARY } } },
      { text: 'Evacuados', options: { bold: true, color: 'FFFFFF', fill: { color: COLOR_PRIMARY } } },
    ],
    ...active.map((i) => [
      { text: incidentTypeLabel(i.type) },
      { text: severityLabel(i.severity) },
      { text: `${i.commune}${i.address ? ` · ${i.address}` : ''}` },
      { text: String(i.affected ?? 0) },
      { text: String(i.evacuated ?? 0) },
    ]),
  ];
  slide.addTable(rows, {
    x: 0.5, y: 2.1, w: SLIDE_W - 1,
    fontSize: 11, color: COLOR_DARK, fontFace: 'Arial',
    border: { type: 'solid', color: 'D1D5DB', pt: 1 },
    rowH: 0.4, align: 'left', valign: 'middle',
    colW: [3.0, 1.6, 4.5, 1.6, 1.6],
  });
  return slide;
}

function slide5PersonasRiesgo(pptx: pptxgen, data: ExportData): pptxgen.Slide {
  const slide = pptx.addSlide();
  slide.background = { color: COLOR_BG };
  addBrandHeader(slide, pptx, 'Personas en Riesgo');
  slide.addText('Personas en riesgo — fichas FIBER', {
    x: 0.5, y: 0.85, w: SLIDE_W - 1, h: 0.5,
    align: 'center', fontSize: 26, bold: true, color: COLOR_DARK, fontFace: 'Arial',
  });
  slide.addText(
    'Distribución de las fichas FIBER por nivel de riesgo. Cada nivel describe la prioridad de atención.',
    {
      x: 0.5, y: 1.35, w: SLIDE_W - 1, h: 0.45,
      align: 'center', fontSize: 12, color: COLOR_MUTED, fontFace: 'Arial',
    },
  );

  const levels: Array<{ key: string; label: string; desc: string; color: string }> = [
    { key: 'critico', label: 'Crítico', desc: 'Atención inmediata. Persona con vulnerabilidad grave.', color: 'DC2626' },
    { key: 'alto', label: 'Alto', desc: 'Requiere atención prioritaria y seguimiento cercano.', color: 'EA580C' },
    { key: 'medio', label: 'Medio', desc: 'Persona con alguna vulnerabilidad. Vigilar.', color: 'F59E0B' },
    { key: 'bajo', label: 'Bajo', desc: 'Sin vulnerabilidad especial. Mantener registro.', color: COLOR_PRIMARY },
  ];
  const total = data.fichas.length || 1;
  let y = 2.1;
  const rowH = 0.55;
  for (const lvl of levels) {
    const count = data.stats.fichas.byRiskLevel[lvl.key] ?? 0;
    const pct = count / total;
    slide.addText(lvl.label, {
      x: 0.6, y, w: 1.5, h: rowH,
      align: 'left', valign: 'middle', fontSize: 14, bold: true, color: lvl.color,
      fontFace: 'Arial',
    });
    slide.addShape('rect', {
      x: 2.1, y: y + 0.12, w: SLIDE_W - 4.5, h: rowH - 0.24,
      fill: { color: COLOR_LIGHT }, line: { color: COLOR_LIGHT, width: 0 },
    });
    slide.addShape('rect', {
      x: 2.1, y: y + 0.12, w: (SLIDE_W - 4.5) * pct, h: rowH - 0.24,
      fill: { color: lvl.color }, line: { color: lvl.color, width: 0 },
    });
    slide.addText(`${count} fichas · ${(pct * 100).toFixed(0)}%`, {
      x: SLIDE_W - 2.3, y, w: 1.8, h: rowH,
      align: 'right', valign: 'middle', fontSize: 11, bold: true, color: COLOR_DARK,
      fontFace: 'Arial',
    });
    y += rowH;
  }
  slide.addText(
    'Nota: el nivel de riesgo combina edad, condiciones de salud, movilidad, entorno del hogar y antecedentes de emergencias en la zona.',
    {
      x: 0.5, y: y + 0.25, w: SLIDE_W - 1, h: 0.6,
      align: 'center', fontSize: 11, italics: true, color: COLOR_MUTED, fontFace: 'Arial',
    },
  );
  return slide;
}

function slide6Mareas(pptx: pptxgen, data: ExportData): pptxgen.Slide {
  const slide = pptx.addSlide();
  slide.background = { color: COLOR_BG };
  addBrandHeader(slide, pptx, 'Mareas (SHOA)');
  slide.addText('Estado de mareas — SHOA', {
    x: 0.5, y: 0.85, w: SLIDE_W - 1, h: 0.5,
    align: 'center', fontSize: 26, bold: true, color: COLOR_DARK, fontFace: 'Arial',
  });
  slide.addText(
    'El Servicio Hidrográfico y Oceanográfico de la Armada entrega el estado del mar. Esta información es clave para actividades costeras, pesca artesanal y prevención de inundaciones en caletas.',
    {
      x: 0.5, y: 1.35, w: SLIDE_W - 1, h: 0.7,
      align: 'center', fontSize: 12, color: COLOR_MUTED, fontFace: 'Arial',
    },
  );

  // Find the most recent SHOA marea alert
  const marea = data.alerts.find(
    (a) => a.source.code === 'shoa' && a.category === 'marea',
  );
  const level = marea?.subcategory ?? null;
  const levels: Array<{ key: string; label: string; desc: string; color: string }> = [
    { key: 'baja', label: 'Marea Baja (Bajamar)', desc: 'Mar en su nivel más bajo. Buen momento para revisar el litoral.', color: '2563EB' },
    { key: 'media', label: 'Marea Media', desc: 'Nivel intermedio. Actividad costera con vigilancia normal.', color: '0EA5A0' },
    { key: 'alta', label: 'Marea Alta (Pleamar)', desc: 'Mar en su nivel máximo. Vigilar caletas y desembocaduras.', color: 'EA580C' },
  ];
  const cardW = 3.6;
  const gap = 0.4;
  const totalW = cardW * 3 + gap * 2;
  const startX = (SLIDE_W - totalW) / 2;
  const cardY = 2.4;
  levels.forEach((lvl, i) => {
    const isActive = lvl.key === level;
    slide.addShape('rect', {
      x: startX + (cardW + gap) * i, y: cardY, w: cardW, h: 2.6,
      fill: { color: isActive ? lvl.color : COLOR_LIGHT },
      line: { color: lvl.color, width: isActive ? 2 : 1 },
    });
    slide.addText(lvl.label, {
      x: startX + (cardW + gap) * i, y: cardY + 0.25, w: cardW, h: 0.6,
      align: 'center', fontSize: 16, bold: true,
      color: isActive ? 'FFFFFF' : COLOR_DARK, fontFace: 'Arial',
    });
    slide.addText(isActive ? 'Estado actual' : '', {
      x: startX + (cardW + gap) * i, y: cardY + 0.9, w: cardW, h: 0.3,
      align: 'center', fontSize: 10, italics: true,
      color: isActive ? COLOR_ACCENT : COLOR_MUTED, fontFace: 'Arial',
    });
    slide.addText(lvl.desc, {
      x: startX + (cardW + gap) * i + 0.2, y: cardY + 1.25, w: cardW - 0.4, h: 1.2,
      align: 'center', valign: 'top', fontSize: 11,
      color: isActive ? 'FFFFFF' : COLOR_MUTED, fontFace: 'Arial',
    });
  });
  if (marea) {
    slide.addText(
      `Última lectura de SHOA: ${formatDate(marea.issuedAt)} · ${marea.title}`,
      {
        x: 0.5, y: 5.4, w: SLIDE_W - 1, h: 0.4,
        align: 'center', fontSize: 11, color: COLOR_MUTED, fontFace: 'Arial',
      },
    );
  } else {
    slide.addText(
      'Aún no se reciben lecturas de SHOA en esta sesión. Cuando el mini-service de alertas emita el próximo boletín de mareas, se mostrará aquí.',
      {
        x: 0.5, y: 5.4, w: SLIDE_W - 1, h: 0.6,
        align: 'center', fontSize: 11, italics: true, color: COLOR_MUTED, fontFace: 'Arial',
      },
    );
  }
  return slide;
}

function slide7Cumplimiento(pptx: pptxgen, _data: ExportData): pptxgen.Slide {
  const slide = pptx.addSlide();
  slide.background = { color: COLOR_BG };
  addBrandHeader(slide, pptx, 'Cumplimiento Legal');
  slide.addText('Cumplimiento legal, en lenguaje simple', {
    x: 0.5, y: 0.85, w: SLIDE_W - 1, h: 0.5,
    align: 'center', fontSize: 26, bold: true, color: COLOR_DARK, fontFace: 'Arial',
  });
  slide.addText(
    'Las leyes y marcos que rigen al COEP Viña · Centro de Operaciones de Emergencia Provincial, explicados en una línea.',
    {
      x: 0.5, y: 1.35, w: SLIDE_W - 1, h: 0.4,
      align: 'center', fontSize: 12, color: COLOR_MUTED, fontFace: 'Arial',
    },
  );
  const items: Array<{ name: string; plain: string; color: string }> = [
    {
      name: 'SENAPRED — Ley 21.151',
      plain: 'El organismo rector. Coordina a Bomberos, Carabineros, Salud, SHOA y CONAF; cada comuna debe llevar registro trazable de sus emergencias.',
      color: COLOR_PRIMARY,
    },
    {
      name: 'Ley 19.628 — Protección de Datos',
      plain: 'Los datos de las personas (RUT, salud, dirección) son sensibles: se exige consentimiento, acceso restringido y bitácora de auditoría.',
      color: COLOR_ACCENT,
    },
    {
      name: 'Ley 21.519 — Ciberseguridad',
      plain: 'El sistema de emergencias es un servicio esencial y debe reportar incidentes de ciberseguridad a la ANCI.',
      color: 'DC2626',
    },
  ];
  let y = 2.1;
  const rowH = 1.2;
  for (const it of items) {
    slide.addShape('rect', {
      x: 0.5, y, w: SLIDE_W - 1, h: rowH - 0.2,
      fill: { color: COLOR_LIGHT }, line: { color: it.color, width: 1 },
    });
    slide.addShape('rect', {
      x: 0.5, y, w: 0.1, h: rowH - 0.2,
      fill: { color: it.color }, line: { color: it.color, width: 0 },
    });
    slide.addText(it.name, {
      x: 0.8, y: y + 0.1, w: SLIDE_W - 1.5, h: 0.35,
      align: 'left', fontSize: 14, bold: true, color: COLOR_DARK, fontFace: 'Arial',
    });
    slide.addText(it.plain, {
      x: 0.8, y: y + 0.5, w: SLIDE_W - 1.5, h: 0.55,
      align: 'left', fontSize: 11, color: COLOR_DARK, fontFace: 'Arial',
    });
    y += rowH;
  }
  return slide;
}

function slide8Recomendaciones(pptx: pptxgen, data: ExportData): pptxgen.Slide {
  const slide = pptx.addSlide();
  slide.background = { color: COLOR_BG };
  addBrandHeader(slide, pptx, 'Recomendaciones');
  slide.addText('Recomendaciones', {
    x: 0.5, y: 0.85, w: SLIDE_W - 1, h: 0.5,
    align: 'center', fontSize: 26, bold: true, color: COLOR_DARK, fontFace: 'Arial',
  });
  slide.addText(
    'Acciones concretas a partir de la situación actual. Pensadas para coordinación entre la municipalidad y los servicios de primera línea.',
    {
      x: 0.5, y: 1.35, w: SLIDE_W - 1, h: 0.55,
      align: 'center', fontSize: 12, color: COLOR_MUTED, fontFace: 'Arial',
    },
  );
  const recs = buildRecomendaciones(data);
  let y = 2.2;
  const rowH = 0.85;
  recs.forEach((r, i) => {
    slide.addShape('ellipse', {
      x: 0.5, y: y + 0.05, w: 0.45, h: 0.45,
      fill: { color: COLOR_PRIMARY }, line: { color: COLOR_PRIMARY, width: 0 },
    });
    slide.addText(String(i + 1), {
      x: 0.5, y: y + 0.05, w: 0.45, h: 0.45,
      align: 'center', valign: 'middle',
      fontSize: 14, bold: true, color: 'FFFFFF', fontFace: 'Arial',
    });
    slide.addText(r, {
      x: 1.15, y, w: SLIDE_W - 1.65, h: rowH - 0.1,
      align: 'left', valign: 'middle',
      fontSize: 12, color: COLOR_DARK, fontFace: 'Arial',
    });
    y += rowH;
  });
  return slide;
}

function slide9Contactos(pptx: pptxgen, _data: ExportData): pptxgen.Slide {
  const slide = pptx.addSlide();
  slide.background = { color: COLOR_BG };
  addBrandHeader(slide, pptx, 'Contactos y Canales Oficiales');
  slide.addText('Contactos y canales oficiales', {
    x: 0.5, y: 0.85, w: SLIDE_W - 1, h: 0.5,
    align: 'center', fontSize: 26, bold: true, color: COLOR_DARK, fontFace: 'Arial',
  });
  slide.addText(
    'Cada fuente integrada al COEP Viña · Centro de Operaciones de Emergencia Provincial tiene un rol específico. Estos son los canales que se monitorean en tiempo real.',
    {
      x: 0.5, y: 1.35, w: SLIDE_W - 1, h: 0.55,
      align: 'center', fontSize: 12, color: COLOR_MUTED, fontFace: 'Arial',
    },
  );
  const items: Array<{ name: string; desc: string }> = [
    { name: 'SENAPRED', desc: 'Coordina la respuesta nacional. Emite alertas oficiales de emergencia.' },
    { name: 'CONAF', desc: 'Corporación Nacional Forestal. Reporta incendios forestales y condición de vegetación.' },
    { name: 'SHOA', desc: 'Servicio Hidrográfico y Oceanográfico de la Armada. Entrega mareas y meteorología marítima.' },
    { name: 'CBV2', desc: 'Cuerpo de Bomberos de Viña del Mar 2da Compañía. Reporta incendios urbanos, rescates y accidentes.' },
    { name: 'Carabineros', desc: 'Carabineros de Chile. Reporta delitos, accidentes de tránsito y eventos de seguridad.' },
    { name: 'Radio', desc: 'Comunicaciones de emergencia y radioperiodismo local.' },
  ];
  const rows: pptxgen.TableRow[] = [
    [
      { text: 'Canal', options: { bold: true, color: 'FFFFFF', fill: { color: COLOR_PRIMARY } } },
      { text: 'Qué reporta', options: { bold: true, color: 'FFFFFF', fill: { color: COLOR_PRIMARY } } },
    ],
    ...items.map((i) => [
      { text: i.name, options: { bold: true } },
      { text: i.desc },
    ]),
  ];
  slide.addTable(rows, {
    x: 0.5, y: 2.1, w: SLIDE_W - 1,
    fontSize: 12, color: COLOR_DARK, fontFace: 'Arial',
    border: { type: 'solid', color: 'D1D5DB', pt: 1 },
    rowH: 0.5, align: 'left', valign: 'middle',
    colW: [2.5, SLIDE_W - 1 - 2.5],
  });
  return slide;
}

function slide10Gracias(pptx: pptxgen, _data: ExportData): pptxgen.Slide {
  const slide = pptx.addSlide();
  slide.background = { color: COLOR_PRIMARY };
  slide.addShape('rect', {
    x: 0, y: SLIDE_H / 2 - 1.5, w: SLIDE_W, h: 0.1,
    fill: { color: COLOR_ACCENT }, line: { color: COLOR_ACCENT, width: 0 },
  });
  slide.addText('Gracias', {
    x: 0.5, y: SLIDE_H / 2 - 1.2, w: SLIDE_W - 1, h: 1.2,
    align: 'center', fontSize: 60, bold: true, color: 'FFFFFF', fontFace: 'Arial',
  });
  slide.addText('COEP Viña · Centro de Operaciones de Emergencia Provincial · VeltrixIntegra Ecosistema Digital 360', {
    x: 0.5, y: SLIDE_H / 2 + 0.5, w: SLIDE_W - 1, h: 0.5,
    align: 'center', fontSize: 18, color: COLOR_ACCENT, fontFace: 'Arial',
  });
  slide.addText('Viña del Mar · Región de Valparaíso · Chile', {
    x: 0.5, y: SLIDE_H / 2 + 1.0, w: SLIDE_W - 1, h: 0.4,
    align: 'center', fontSize: 12, color: 'FFFFFF', fontFace: 'Arial',
  });
  return slide;
}

// ---------------------------------------------------------------------------
// Build the full presentation
// ---------------------------------------------------------------------------
function buildPresentation(data: ExportData): pptxgen {
  const pptx = new pptxgen();
  pptx.defineLayout({ name: '16x9', width: SLIDE_W, height: SLIDE_H });
  pptx.layout = '16x9';
  pptx.author = 'COEP Viña · Centro de Operaciones de Emergencia Provincial';
  pptx.company = 'VeltrixIntegra Ecosistema Digital 360';
  pptx.title = 'COEP Viña · Centro de Operaciones de Emergencia Provincial — Viña del Mar';
  pptx.subject = 'Informe de Emergencias';

  const slides: pptxgen.Slide[] = [];
  slides.push(slide1Title(pptx, data));
  slides.push(slide2SituacionActual(pptx, data));
  slides.push(slide3AlertasPorFuente(pptx, data));
  slides.push(slide4MapaIncidentes(pptx, data));
  slides.push(slide5PersonasRiesgo(pptx, data));
  slides.push(slide6Mareas(pptx, data));
  slides.push(slide7Cumplimiento(pptx, data));
  slides.push(slide8Recomendaciones(pptx, data));
  slides.push(slide9Contactos(pptx, data));
  slides.push(slide10Gracias(pptx, data));

  // Footer (skip cover & closing)
  const total = slides.length;
  for (let i = 1; i < total - 1; i++) {
    addFooter(slides[i], i + 1, total);
  }

  return pptx;
}

export async function POST() {
  try {
    const data = await loadExportData();
    const pptx = buildPresentation(data);
    const buf = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
    const stamp = data.generatedAt.toISOString().slice(0, 10);
    const filename = `informe-emergencias-vina-del-mar-${stamp}.pptx`;
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[api/export/pptx] error:', err);
    return new Response(
      JSON.stringify({ error: 'No se pudo generar el archivo PowerPoint' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
