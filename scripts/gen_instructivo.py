#!/usr/bin/env python3
"""
Instructivo COEP Viña - Formato profesional
- Icono en el encabezado de cada hoja
- Logo como marca de agua
- Formato VeltrixIntegra | Ecosistema Digital 360
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black, Color
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Image, KeepTogether
)
from reportlab.pdfgen import canvas
from reportlab.lib import colors

# ---------------------------------------------------------------------------
# Configuracion
# ---------------------------------------------------------------------------
OUTPUT = "/home/z/my-project/download/Instructivo_COEP_Vina_VeltrixIntegra.pdf"
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

# Archivos de imagenes
ICONO = "/tmp/icono.png"
LOGO = "/tmp/logo_veltrix.jpg"

# Paleta institucional
AZUL = HexColor('#1a3a5c')
AZUL_M = HexColor('#2a5a8c')
ARENA = HexColor('#d4a943')
ARENA_C = HexColor('#f5e6c8')
GRIS_O = HexColor('#2d2d2d')
GRIS_C = HexColor('#e8e8e8')
BLANCO = white

PAGE_W, PAGE_H = A4
ML = 2.2 * cm
MR = 2.2 * cm
MT = 3.0 * cm
MB = 2.5 * cm
CW = PAGE_W - ML - MR

# ---------------------------------------------------------------------------
# Marca de agua + encabezado con icono + footer
# ---------------------------------------------------------------------------
def onPage(canvas_obj, doc):
    canvas_obj.saveState()

    # === MARCA DE AGUA: logo centrado y muy tenue ===
    if os.path.exists(LOGO):
        try:
            # El logo es 1024x256 (4:1). Lo escalamos a ~60% del ancho de pagina
            wm_w = PAGE_W * 0.60
            wm_h = wm_w / 4  # proporcion 4:1
            canvas_obj.saveState()
            canvas_obj.setFillAlpha(0.06)
            canvas_obj.drawImage(LOGO,
                (PAGE_W - wm_w) / 2,
                (PAGE_H - wm_h) / 2,
                wm_w, wm_h,
                mask='auto', preserveAspectRatio=True)
            canvas_obj.restoreState()
        except:
            pass

    # === ENCABEZADO: icono a la izquierda + texto a la derecha ===
    # Barra superior delgada
    canvas_obj.setFillColor(AZUL)
    canvas_obj.rect(0, PAGE_H - 2.0 * cm, PAGE_W, 0.08 * cm, fill=1, stroke=0)

    # Icono (escalado a ~1.2 cm de alto)
    icon_size = 1.2 * cm
    icon_y = PAGE_H - 1.8 * cm
    if os.path.exists(ICONO):
        try:
            canvas_obj.drawImage(ICONO, ML, icon_y - 0.1 * cm,
                icon_size, icon_size,
                mask='auto', preserveAspectRatio=True)
        except:
            pass

    # Texto del encabezado (a la derecha del icono)
    canvas_obj.setFillColor(AZUL)
    canvas_obj.setFont('Helvetica-Bold', 10)
    canvas_obj.drawString(ML + icon_size + 0.4 * cm, icon_y + 0.3 * cm,
        "VeltrixIntegra | Ecosistema Digital 360")
    canvas_obj.setFillColor(HexColor('#555555'))
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.drawString(ML + icon_size + 0.4 * cm, icon_y - 0.1 * cm,
        "COEP Viña | Instructivo de Uso del Panel de Emergencias")

    # Linea inferior del encabezado
    canvas_obj.setStrokeColor(ARENA)
    canvas_obj.setLineWidth(1.5)
    canvas_obj.line(ML, PAGE_H - 2.1 * cm, PAGE_W - MR, PAGE_H - 2.1 * cm)

    # === FOOTER ===
    canvas_obj.setStrokeColor(GRIS_C)
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(ML, 1.6 * cm, PAGE_W - MR, 1.6 * cm)

    canvas_obj.setFillColor(GRIS_O)
    canvas_obj.setFont('Helvetica', 7.5)
    footer = "Claudio Urbina Vargas - Fundador VeltrixIntegra - +56 9 9619 4440 - claudio.urbina@vtr.net"
    canvas_obj.drawCentredString(PAGE_W / 2, 1.0 * cm, footer)
    canvas_obj.setFillColor(AZUL)
    canvas_obj.setFont('Helvetica-Bold', 8)
    canvas_obj.drawRightString(PAGE_W - MR, 0.6 * cm, f"Pagina {doc.page}")

    canvas_obj.restoreState()

# ---------------------------------------------------------------------------
# Portada (pagina 1 - sin encabezado/footer estandar, diseno propio)
# ---------------------------------------------------------------------------
def onPortada(canvas_obj, doc):
    canvas_obj.saveState()

    # Fondo azul
    canvas_obj.setFillColor(AZUL)
    canvas_obj.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # Marca de agua en portada (mas visible)
    if os.path.exists(LOGO):
        try:
            wm_w = PAGE_W * 0.50
            wm_h = wm_w / 4
            canvas_obj.saveState()
            canvas_obj.setFillAlpha(0.12)
            canvas_obj.drawImage(LOGO,
                (PAGE_W - wm_w) / 2,
                PAGE_H * 0.25,
                wm_w, wm_h,
                mask='auto', preserveAspectRatio=True)
            canvas_obj.restoreState()
        except:
            pass

    # Icono centrado arriba
    if os.path.exists(ICONO):
        try:
            ico_size = 4 * cm
            canvas_obj.drawImage(ICONO,
                PAGE_W/2 - ico_size/2,
                PAGE_H * 0.74,
                ico_size, ico_size,
                mask='auto', preserveAspectRatio=True)
        except:
            pass

    # Banda dorada decorativa
    canvas_obj.setFillColor(ARENA)
    canvas_obj.rect(PAGE_W * 0.2, PAGE_H * 0.69, PAGE_W * 0.6, 0.12 * cm, fill=1, stroke=0)

    # Titulo
    canvas_obj.setFillColor(BLANCO)
    canvas_obj.setFont('Helvetica-Bold', 28)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.63, "COEP Viña")

    canvas_obj.setFont('Helvetica-Bold', 15)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.58,
        "Centro de Operaciones de Emergencia Provincial")

    canvas_obj.setFillColor(ARENA)
    canvas_obj.setFont('Helvetica', 12)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.53,
        "Ecosistema Digital 360 | VeltrixIntegra")

    canvas_obj.setFillColor(BLANCO)
    canvas_obj.setFont('Helvetica', 10)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.49,
        "Comuna de Viña del Mar | Region de Valparaíso")

    # Caja del documento
    canvas_obj.setFillColor(HexColor('#0d2a44'))
    canvas_obj.roundRect(PAGE_W * 0.12, PAGE_H * 0.32, PAGE_W * 0.76, 2.2 * cm, 10, fill=1, stroke=0)
    canvas_obj.setFillColor(BLANCO)
    canvas_obj.setFont('Helvetica-Bold', 13)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.38,
        "Instructivo de Uso del Panel de Emergencias")
    canvas_obj.setFillColor(ARENA_C)
    canvas_obj.setFont('Helvetica-Oblique', 10)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.34,
        "Guia practica para operadores y comunidad")

    # Datos del autor
    canvas_obj.setFillColor(BLANCO)
    canvas_obj.setFont('Helvetica-Bold', 10)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.20, "Claudio Urbina Vargas")
    canvas_obj.setFont('Helvetica', 9)
    canvas_obj.setFillColor(ARENA_C)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.17,
        "Las Acacias 450 poniente paradero 12, Villa Alemana")
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.14,
        "+56 9 9619 4440 | claudio.urbina@vtr.net")

    # Año
    canvas_obj.setFillColor(ARENA)
    canvas_obj.setFont('Helvetica-Bold', 16)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.08, "2026")

    canvas_obj.restoreState()

# ---------------------------------------------------------------------------
# Estilos
# ---------------------------------------------------------------------------
styles = getSampleStyleSheet()

h1 = ParagraphStyle('H1', parent=styles['Heading1'],
    fontName='Helvetica-Bold', fontSize=17, textColor=AZUL,
    spaceBefore=18, spaceAfter=10, leading=21)

h2 = ParagraphStyle('H2', parent=styles['Heading2'],
    fontName='Helvetica-Bold', fontSize=12.5, textColor=AZUL_M,
    spaceBefore=12, spaceAfter=5, leading=15)

h3 = ParagraphStyle('H3', parent=styles['Heading3'],
    fontName='Helvetica-Bold', fontSize=10.5, textColor=GRIS_O,
    spaceBefore=8, spaceAfter=3, leading=13)

body = ParagraphStyle('Body', parent=styles['Normal'],
    fontName='Helvetica', fontSize=10.5, textColor=GRIS_O,
    leading=16, alignment=TA_JUSTIFY, spaceAfter=7)

bullet = ParagraphStyle('Bullet', parent=body,
    leftIndent=18, bulletIndent=6, spaceAfter=3)

note = ParagraphStyle('Note', parent=body,
    fontSize=9, textColor=HexColor('#777777'), leftIndent=12, spaceAfter=5)

th = ParagraphStyle('TH', parent=styles['Normal'],
    fontName='Helvetica-Bold', fontSize=9.5, textColor=white, alignment=TA_CENTER)

td = ParagraphStyle('TD', parent=styles['Normal'],
    fontName='Helvetica', fontSize=9.5, textColor=GRIS_O, leading=13)

# ---------------------------------------------------------------------------
# Contenido
# ---------------------------------------------------------------------------
story = []

# --- Indice ---
story.append(Spacer(1, 0.5 * cm))
story.append(Paragraph("Indice", h1))
story.append(Spacer(1, 0.4 * cm))

idx_data = [
    ["1.", "Para que sirve este panel?"],
    ["2.", "Las fuentes de informacion: de donde salen los datos?"],
    ["3.", "Como leer el mapa de emergencias?"],
    ["4.", "El feed en vivo: alertas que llegan ahora mismo"],
    ["5.", "La campana de notificaciones"],
    ["6.", "Como distinguir alertas verdaderas de rumores"],
    ["7.", "El pipeline de depuracion: como se limpian los datos falsos"],
    ["8.", "Las fichas FIBER: registro de personas en riesgo"],
    ["9.", "Exportar datos: como descargar informes"],
    ["10.", "Cumplimiento legal: que leyes se respetan"],
    ["11.", "Preguntas frecuentes"],
]

t_idx = Table(idx_data, colWidths=[1.2*cm, CW - 1.2*cm])
t_idx.setStyle(TableStyle([
    ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
    ('FONTSIZE', (0,0), (-1,-1), 11),
    ('TEXTCOLOR', (0,0), (0,-1), AZUL),
    ('TEXTCOLOR', (1,0), (1,-1), GRIS_O),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ('TOPPADDING', (0,0), (-1,-1), 3),
    ('LINEBELOW', (0,0), (-1,-1), 0.4, GRIS_C),
]))
story.append(t_idx)
story.append(PageBreak())

# === 1 ===
story.append(Paragraph("1. Para que sirve este panel?", h1))
story.append(Paragraph(
    "El COEP Viña es una herramienta de pantalla que reune en un solo lugar toda la "
    "informacion sobre emergencias que ocurren en la comuna de Viña del Mar. "
    "Sirve para que las personas que trabajan en emergencias (bomberos, carabineros, "
    "municipalidad) puedan ver de un vistazo que esta pasando ahora mismo, donde, "
    "y que tan grave es.", body))
story.append(Paragraph(
    "Piense en esto como un televisor que muestra varios canales a la vez: las alertas "
    "de SENAPRED, los avisos de Bomberos, los cortes de luz de Chilquinta, y los "
    "radioavisos del SHOA. Todo junto, ordenado por hora y por importancia.", body))

story.append(Paragraph("Que se puede hacer con el panel?", h2))
for item in [
    "<b>Ver alertas en tiempo real:</b> Las notificaciones llegan apenas las emiten las fuentes oficiales.",
    "<b>Ubicar emergencias en el mapa:</b> Cada alerta aparece como un punto en el mapa de Viña del Mar.",
    "<b>Registrar personas vulnerables:</b> Con las fichas FIBER se anota quien necesita ayuda especial.",
    "<b>Descargar informes:</b> Se pueden exportar los datos a Excel, Word, PDF o PowerPoint.",
    "<b>Revisar el cumplimiento legal:</b> El panel muestra que leyes se cumplen (SENAPRED, Ley 19.628).",
]:
    story.append(Paragraph(f"  -  {item}", bullet))

story.append(PageBreak())

# === 2 ===
story.append(Paragraph("2. Las fuentes de informacion: de donde salen los datos?", h1))
story.append(Paragraph(
    "El panel no inventa nada. Toda la informacion viene de fuentes oficiales que "
    "tienen canales verificados. Si una fuente no tiene canal oficial, no aparece en "
    "el panel. <b>Si no esta aca, es porque no es una fuente confiable.</b>", body))

story.append(Spacer(1, 0.2 * cm))

fuentes = [
    [Paragraph("Fuente", th), Paragraph("Que hace", th), Paragraph("Donde se verifica", th)],
    [Paragraph("SENAPRED", td), Paragraph("Alertas oficiales del gobierno (Alerta Temprana, Amarilla, Roja)", td), Paragraph("senapred.cl/alertas/", td)],
    [Paragraph("CONAF", td), Paragraph("Incendios forestales y prevencion. Sus alertas van por SENAPRED", td), Paragraph("senapred.cl/alertas/", td)],
    [Paragraph("SHOA", td), Paragraph("Radioavisos NURNAV Area B y boletines de tsunami", td), Paragraph("shoa.cl/php/radioavisos.php", td)],
    [Paragraph("Bomberos CBV2", td), Paragraph("Llamados de emergencia, claves de despacho", td), Paragraph("WhatsApp / Zello Scanner", td)],
    [Paragraph("Carabineros", td), Paragraph("Comunicados de seguridad publica", td), Paragraph("Radio 152.2625 MHz", td)],
    [Paragraph("Chilquinta", td), Paragraph("Cortes de luz e interrupciones electricas", td), Paragraph("chilquinta.cl/interrupciones", td)],
]
t_f = Table(fuentes, colWidths=[3.2*cm, 7.8*cm, 5.5*cm])
t_f.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), AZUL),
    ('GRID', (0,0), (-1,-1), 0.4, GRIS_C),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('LEFTPADDING', (0,0), (-1,-1), 7),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#f8f8f8')]),
]))
story.append(t_f)

story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph(
    "<b>Fuentes eliminadas por no ser confiables:</b> Guardia Marina (sin canal "
    "de difusion accesible) y Red de Radio (puede contener rumores no confirmados).", note))

story.append(PageBreak())

# === 3 ===
story.append(Paragraph("3. Como leer el mapa de emergencias?", h1))
story.append(Paragraph(
    "El mapa muestra la comuna de Viña del Mar vista desde arriba, con puntos de "
    "colores que indican donde esta pasando algo. Cada color significa un tipo "
    "distinto de emergencia.", body))

story.append(Paragraph("Que significan los colores?", h2))

colores = [
    [Paragraph("Color", th), Paragraph("Tipo de emergencia", th)],
    [Paragraph("<b>Rojo-naranja</b>", td), Paragraph("Incendio forestal", td)],
    [Paragraph("<b>Naranja</b>", td), Paragraph("Incendio urbano (casas, edificios)", td)],
    [Paragraph("<b>Morado</b>", td), Paragraph("Sismo (terremoto)", td)],
    [Paragraph("<b>Azul</b>", td), Paragraph("Inundacion (agua, lluvias)", td)],
    [Paragraph("<b>Amarillo</b>", td), Paragraph("Deslizamiento (tierra, derrumbe)", td)],
    [Paragraph("<b>Verde</b>", td), Paragraph("Quimico (fuga, derrame)", td)],
    [Paragraph("<b>Gris</b>", td), Paragraph("Accidente o delito", td)],
]
t_c = Table(colores, colWidths=[4*cm, CW - 4*cm])
t_c.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), AZUL),
    ('GRID', (0,0), (-1,-1), 0.4, GRIS_C),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('LEFTPADDING', (0,0), (-1,-1), 7),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#f8f8f8')]),
]))
story.append(t_c)

story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph("Como interactuar con el mapa", h2))
story.append(Paragraph(
    "Si hace clic en un punto, se abre una ventana con el titulo de la emergencia, "
    "el tipo, la comuna, y cuanta gente esta afectada. Puede hacer zoom con los "
    "botones <b>+</b> y <b>-</b> arriba a la izquierda del mapa.", body))
story.append(Paragraph(
    "Arriba del mapa hay dos casillas: <b>Incidentes</b> y <b>Alertas en vivo</b>. "
    "Si desmarca una, esos puntos desaparecen. Sirve para ver solo lo que le interesa.", body))

story.append(PageBreak())

# === 4 ===
story.append(Paragraph("4. El feed en vivo: alertas que llegan ahora mismo", h1))
story.append(Paragraph(
    "A la derecha del mapa esta el feed en vivo. Es como un muro de Facebook pero "
    "con alertas reales. Cada vez que una fuente oficial emite algo, aparece aca "
    "al instante. Lo mas nuevo sale arriba.", body))

story.append(Paragraph("Como esta organizado cada aviso", h2))
for item in [
    "<b>Icono de color:</b> indica que tan grave es (verde = info, amarillo = vigilancia, naranja = alerta, rojo = critica).",
    "<b>Nombre de la fuente:</b> un sello que dice de donde viene (SENAPRED, CBV2, SHOA, etc.).",
    "<b>Sello de verificacion:</b> <b>Verificada</b> (verde) si viene de fuente oficial.",
    "<b>Titulo:</b> lo que paso, en pocas palabras.",
    "<b>Descripcion:</b> el detalle de la emergencia.",
    "<b>Hora:</b> hace cuanto tiempo que se emitio (ej: 'hace 3 segundos').",
]:
    story.append(Paragraph(f"  -  {item}", bullet))

story.append(Paragraph("Los botones de filtro", h2))
story.append(Paragraph(
    "Debajo del titulo <b>En Vivo</b> hay botones para filtrar por fuente: "
    "<b>Todas</b>, <b>SENAPRED</b>, <b>CONAF</b>, <b>SHOA</b>, <b>CBV2</b>, "
    "<b>Carabineros</b>, <b>Chilquinta</b>. Si toca uno, solo se ven las alertas "
    "de esa fuente.", body))
story.append(Paragraph(
    "Tambien hay un interruptor que dice <b>Solo verificadas (verdaderas)</b>. "
    "Cuando esta prendido (por defecto), solo se ven alertas de fuentes oficiales.", body))

story.append(PageBreak())

# === 5 ===
story.append(Paragraph("5. La campana de notificaciones", h1))
story.append(Paragraph(
    "Arriba a la derecha, al lado del reloj, hay un icono de campana. Es donde se "
    "guardan las notificaciones que van llegando. Si hay un numero rojo encima, "
    "significa que hay alertas nuevas sin leer.", body))

story.append(Paragraph("Como funciona", h2))
for item in [
    "<b>Numero rojo:</b> muestra cuantas alertas nuevas hay.",
    "<b>Al tocar la campana:</b> se abre una lista con las ultimas 30 alertas.",
    "<b>Marcar como leidas:</b> hay un boton que dice 'Marcar todas leidas'.",
    "<b>Solo alertas verificadas:</b> la campana solo muestra alertas de fuentes oficiales.",
]:
    story.append(Paragraph(f"  -  {item}", bullet))

story.append(Paragraph(
    "Las notificaciones tambien llegan al celular aunque la pagina este cerrada. "
    "Esto se hace con un 'Service Worker' que funciona en segundo plano. Solo las "
    "alertas criticas disparan la notificacion del sistema.", body))

story.append(PageBreak())

# === 6 ===
story.append(Paragraph("6. Como distinguir alertas verdaderas de rumores", h1))
story.append(Paragraph(
    "El panel hace un trabajo importante: separar lo que es real de lo que no. "
    "Algunas alertas vienen de fuentes oficiales (son verdaderas) y otras son "
    "reportes de personas que pueden estar equivocadas (son rumores).", body))

story.append(Paragraph("Cuales son verdaderas?", h2))
story.append(Paragraph(
    "Las alertas de <b>SENAPRED</b>, <b>CONAF</b>, <b>SHOA</b>, <b>Bomberos CBV2</b>, "
    "<b>Carabineros</b> y <b>Chilquinta</b> son todas verdaderas. Cada una tiene un "
    "canal verificable donde se puede confirmar la informacion.", body))

story.append(Paragraph("El sello de verificacion", h2))

verif = [
    [Paragraph("Sello", th), Paragraph("Que significa", th)],
    [Paragraph("<b>Verificada</b> (verde)", td),
     Paragraph("Viene de una fuente oficial con canal confirmado. Se puede confiar en la informacion.", td)],
    [Paragraph("<b>Rumor</b> (naranjo)", td),
     Paragraph("Reporte no confirmado. Mostrar con cuidado, puede ser falso.", td)],
]
t_v = Table(verif, colWidths=[5*cm, CW - 5*cm])
t_v.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), AZUL),
    ('GRID', (0,0), (-1,-1), 0.4, GRIS_C),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('LEFTPADDING', (0,0), (-1,-1), 7),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#f8f8f8')]),
]))
story.append(t_v)

story.append(PageBreak())

# === 7 ===
story.append(Paragraph("7. El pipeline de depuracion: como se limpian los datos falsos", h1))
story.append(Paragraph(
    "El panel tiene un sistema automatico que revisa cada alerta antes de "
    "mostrarla. Se llama 'pipeline de depuracion'. Piense en esto como un filtro "
    "de agua: el agua entra con impurezas y sale limpia. Aca, las alertas entran "
    "con posibles errores y salen solo las que sirven.", body))

story.append(Paragraph("Los 3 filtros que se aplican", h2))

filtros = [
    [Paragraph("Filtro", th), Paragraph("Que revisa", th), Paragraph("Que descarta", th)],
    [Paragraph("<b>1. Territorial</b>", td), Paragraph("Si la alerta es de Viña del Mar", td),
     Paragraph("Alertas de otras comunas (Valparaíso, Concon, Quilpue)", td)],
    [Paragraph("<b>2. Temporal</b>", td), Paragraph("Si la alerta es de hoy y dentro del tiempo", td),
     Paragraph("Alertas de dias anteriores o que pasaron el tiempo maximo (4h emergencias, 12h boletines)", td)],
    [Paragraph("<b>3. Estado</b>", td), Paragraph("Si la alerta es de una emergencia viva", td),
     Paragraph("Alertas que dicen 'terminado', 'controlado', 'cierre', 'balance', 'informativo'", td)],
]
t_fi = Table(filtros, colWidths=[3*cm, 5.5*cm, 8*cm])
t_fi.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), AZUL),
    ('GRID', (0,0), (-1,-1), 0.4, GRIS_C),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ('LEFTPADDING', (0,0), (-1,-1), 7),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#f8f8f8')]),
]))
story.append(t_fi)

story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph(
    "El panel 'Pipeline de Depuracion' muestra este proceso en vivo. Cada alerta "
    "aparece con un sello verde que dice <b>Vigente</b> o un sello rojo que dice "
    "<b>Descartado</b>, junto con el motivo del descarte.", body))

story.append(PageBreak())

# === 8 ===
story.append(Paragraph("8. Las fichas FIBER: registro de personas en riesgo", h1))
story.append(Paragraph(
    "FIBER significa 'Ficha Individual de Bienestar y Riesgo'. Es un registro donde "
    "se anota a las personas que necesitan ayuda especial durante una emergencia: "
    "adultos mayores que viven solos, personas en silla de ruedas, alguien que "
    "necesita oxigeno, etc.", body))

story.append(Paragraph("Como se lee la tabla", h2))
for item in [
    "<b>Codigo:</b> un identificador unico (ej: FIBER-2026-00001).",
    "<b>Nombre:</b> el nombre completo de la persona.",
    "<b>Comuna:</b> siempre Viña del Mar (el panel solo maneja esta comuna).",
    "<b>Edad:</b> el rango etario (0-17, 18-29, 30-59, 60+).",
    "<b>Riesgo:</b> el nivel con un color (critico = rojo, alto = naranjo, medio = amarillo, bajo = verde).",
    "<b>Estado:</b> registrada, evaluada, derivada o cerrada.",
    "<b>Necesidades:</b> iconos que muestran si necesita evacuacion, medicamentos, o ayuda para moverse.",
]:
    story.append(Paragraph(f"  -  {item}", bullet))

story.append(Paragraph("Como crear una ficha nueva", h2))
story.append(Paragraph(
    "Toque el boton <b>Nueva Ficha</b>. Se abre una ventana donde se llenan los "
    "datos: nombre, direccion, telefono, nivel de riesgo, y si necesita "
    "medicamentos, evacuacion, o ayuda para moverse. Al guardar, la ficha queda "
    "registrada y aparece en la tabla.", body))

story.append(PageBreak())

# === 9 ===
story.append(Paragraph("9. Exportar datos: como descargar informes", h1))
story.append(Paragraph(
    "Al lado del boton 'Nueva Catastrofe' hay un boton que dice <b>Exportar</b>. "
    "Al tocarlo se abre un menu con 4 opciones:", body))

exp = [
    [Paragraph("Formato", th), Paragraph("Para que sirve", th)],
    [Paragraph("<b>Excel (.xlsx)</b>", td), Paragraph("Para trabajar con los datos en planillas. Incluye alertas, incidentes, fichas y resumen.", td)],
    [Paragraph("<b>Word (.docx)</b>", td), Paragraph("Para llevar un informe escrito a una reunion o enviarlo por correo.", td)],
    [Paragraph("<b>PDF (.pdf)</b>", td), Paragraph("Para imprimir o compartir sin que se pueda modificar.", td)],
    [Paragraph("<b>PowerPoint (.pptx)</b>", td), Paragraph("Para presentar en pantalla, con graficos y resumenes visuales.", td)],
]
t_e = Table(exp, colWidths=[4*cm, CW - 4*cm])
t_e.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), AZUL),
    ('GRID', (0,0), (-1,-1), 0.4, GRIS_C),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('LEFTPADDING', (0,0), (-1,-1), 7),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#f8f8f8')]),
]))
story.append(t_e)

story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph(
    "Al tocar una opcion, el sistema genera el archivo y lo descarga "
    "automaticamente. Mientras se genera, aparece un mensaje que dice "
    "'Generando documento...'.", body))

story.append(PageBreak())

# === 10 ===
story.append(Paragraph("10. Cumplimiento legal: que leyes se respetan", h1))
story.append(Paragraph(
    "El panel no solo muestra emergencias. Tambien cuida que la informacion "
    "se maneje bien. Hay leyes que obligan a tratar los datos personales con "
    "cuidado, y otras que definen como se manejan las catástrofes.", body))

story.append(Paragraph("Las leyes que se cumplen", h2))

leyes = [
    [Paragraph("Ley", th), Paragraph("De que trata", th)],
    [Paragraph("<b>SENAPRED (Ley 21.151)</b>", td), Paragraph("Crea el Servicio Nacional de Prevencion y Respuesta ante Desastres.", td)],
    [Paragraph("<b>Ley 19.628</b>", td), Paragraph("Proteccion de datos personales. Los datos de las fichas FIBER se tratan con cuidado.", td)],
    [Paragraph("<b>Ley 21.519</b>", td), Paragraph("Marco de Ciberseguridad de Chile. Medidas de seguridad para que los datos no sean robados.", td)],
    [Paragraph("<b>Ley 18.243</b>", td), Paragraph("Cuerpo de Bomberos. Define como funcionan los bomberos voluntarios en Chile.", td)],
    [Paragraph("<b>ISO 27001</b>", td), Paragraph("Norma internacional de seguridad de la informacion.", td)],
]
t_l = Table(leyes, colWidths=[4.5*cm, CW - 4.5*cm])
t_l.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), AZUL),
    ('GRID', (0,0), (-1,-1), 0.4, GRIS_C),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('LEFTPADDING', (0,0), (-1,-1), 7),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#f8f8f8')]),
]))
story.append(t_l)

story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph(
    "Para ver mas detalle, en el panel hay una seccion llamada <b>Cumplimiento "
    "Legal y Ciberseguridad</b> que explica cada ley en lenguaje sencillo.", body))

story.append(PageBreak())

# === 11 ===
story.append(Paragraph("11. Preguntas frecuentes", h1))

faqs = [
    ("Por que a veces no aparecen alertas?",
     "Si no hay alertas, es porque las fuentes oficiales no han emitido nada "
     "recientemente. El panel no inventa alertas. Si SENAPRED, Bomberos, SHOA, "
     "Carabineros y Chilquinta no han emitido nada en las ultimas horas, el feed "
     "estara vacio. Eso es una buena señal: no hay emergencias activas."),
    ("Por que aparecen 0 incendios?",
     "Porque no hay incendios registrados hoy en Viña del Mar. El panel solo "
     "muestra emergencias reales con fecha de hoy. Si no hay incendios, el "
     "contador dice 0."),
    ("Por que las mareas no aparecen como alertas?",
     "Porque las mareas son datos normales que se repiten todos los dias. No son "
     "emergencias. El SHOA las publica como tablas de consulta, no como alertas. "
     "El panel solo muestra radioavisos NURNAV Area B Valparaíso."),
    ("Que hago si la pagina se queda cargando?",
     "El sistema puede tardar unos segundos en arrancar. Si despues de 30 segundos "
     "sigue cargando, cierre la pagina y vuelva a abrirla. Si persiste, espere "
     "un par de minutos."),
    ("Puedo usar el panel en mi celular?",
     "Si. El panel se ajusta al tamano de la pantalla. En el celular se ve en una "
     "sola columna. Tambien se puede instalar como aplicacion tocando 'Agregar a "
     "pantalla de inicio' en el navegador."),
    ("Mis datos personales estan seguros?",
     "Si. El panel cumple con la Ley 19.628 de Proteccion de Datos. Las fichas "
     "FIBER solo las pueden ver las personas autorizadas. Toda accion se registra "
     "en una bitacora de auditoria."),
]

for p, r in faqs:
    story.append(Paragraph(f"<b>{p}</b>", h3))
    story.append(Paragraph(r, body))
    story.append(Spacer(1, 0.2 * cm))

# Cierre
story.append(Spacer(1, 0.8 * cm))
story.append(Paragraph("<b>VeltrixIntegra | Ecosistema Digital 360</b>", h2))
story.append(Paragraph(
    "Las Acacias 450 poniente paradero 12, Villa Alemana | "
    "+56 9 9619 4440 | claudio.urbina@vtr.net | "
    "Claudio Urbina Vargas, Fundador", note))

# ---------------------------------------------------------------------------
# Generar PDF
# ---------------------------------------------------------------------------
doc = SimpleDocTemplate(OUTPUT, pagesize=A4,
    leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
    title="Instructivo COEP Viña | VeltrixIntegra",
    author="Claudio Urbina Vargas - VeltrixIntegra",
    subject="Guia de uso del panel de emergencias COEP Viña",
    creator="VeltrixIntegra Ecosistema Digital 360")

doc.build(story, onFirstPage=onPortada, onLaterPages=onPage)

print(f"PDF generado: {OUTPUT}")
print(f"Tamano: {os.path.getsize(OUTPUT) / 1024:.1f} KB")
