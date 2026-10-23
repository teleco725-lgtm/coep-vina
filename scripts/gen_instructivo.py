#!/usr/bin/env python3
"""
Generador del Instructivo COEP Viña en PDF
Formato: VeltrixIntegra | Ecosistema Digital 360
Autor: Claudio Urbina Vargas
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Image, KeepTogether
)
from reportlab.pdfgen import canvas
from reportlab.lib import colors

# ---------------------------------------------------------------------------
# Configuracion del documento
# ---------------------------------------------------------------------------
OUTPUT = "/home/z/my-project/download/Instructivo_COEP_Vina_VeltrixIntegra.pdf"
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

# Paleta institucional Viña del Mar (azul petroleo + arena dorada)
AZUL_PETROLEO = HexColor('#1a3a5c')
AZUL_MEDIO = HexColor('#2a5a8c')
ARENA = HexColor('#d4a943')
ARENA_CLARA = HexColor('#f5e6c8')
GRIS_OSCURO = HexColor('#2d2d2d')
GRIS_CLARO = HexColor('#e8e8e8')

PAGE_W, PAGE_H = A4
MARGIN_L = 2.2 * cm
MARGIN_R = 2.2 * cm
MARGIN_T = 2.5 * cm
MARGIN_B = 2.5 * cm
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R

# ---------------------------------------------------------------------------
# Footer y header en cada pagina
# ---------------------------------------------------------------------------
def header_footer(canvas_obj, doc):
    canvas_obj.saveState()

    # Header: linea azul petroleo + texto VeltrixIntegra
    canvas_obj.setFillColor(AZUL_PETROLEO)
    canvas_obj.rect(0, PAGE_H - 1.2 * cm, PAGE_W, 1.2 * cm, fill=1, stroke=0)
    canvas_obj.setFillColor(white)
    canvas_obj.setFont('Helvetica-Bold', 8)
    canvas_obj.drawString(MARGIN_L, PAGE_H - 0.8 * cm, "VeltrixIntegra | Ecosistema Digital 360")
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.drawRightString(PAGE_W - MARGIN_R, PAGE_H - 0.8 * cm, "COEP Viña | Instructivo de Uso")

    # Footer: contacto VeltrixIntegra
    canvas_obj.setFillColor(GRIS_CLARO)
    canvas_obj.rect(0, 0, PAGE_W, 1.4 * cm, fill=1, stroke=0)
    canvas_obj.setFillColor(GRIS_OSCURO)
    canvas_obj.setFont('Helvetica', 7.5)
    footer_text = "Claudio Urbina Vargas - Fundador VeltrixIntegra - +56 9 9619 4440 - claudio.urbina@vtr.net"
    canvas_obj.drawCentredString(PAGE_W / 2, 0.7 * cm, footer_text)
    canvas_obj.setFont('Helvetica-Bold', 7.5)
    canvas_obj.setFillColor(AZUL_PETROLEO)
    canvas_obj.drawRightString(PAGE_W - MARGIN_R, 0.4 * cm, f"Pagina {doc.page}")

    canvas_obj.restoreState()

# ---------------------------------------------------------------------------
# Portada personalizada
# ---------------------------------------------------------------------------
def portada(canvas_obj, doc):
    canvas_obj.saveState()

    # Fondo azul petroleo
    canvas_obj.setFillColor(AZUL_PETROLEO)
    canvas_obj.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # Banda dorada
    canvas_obj.setFillColor(ARENA)
    canvas_obj.rect(0, PAGE_H * 0.62, PAGE_W, 0.15 * cm, fill=1, stroke=0)

    # Logo (si existe)
    logo_path = "/tmp/veltrix_logo.png"
    if os.path.exists(logo_path):
        try:
            canvas_obj.drawImage(logo_path, PAGE_W/2 - 3*cm, PAGE_H * 0.72, 6*cm, 6*cm,
                               mask='auto', preserveAspectRatio=True)
        except:
            pass

    # Titulo principal
    canvas_obj.setFillColor(white)
    canvas_obj.setFont('Helvetica-Bold', 26)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.55, "COEP Viña")
    canvas_obj.setFont('Helvetica-Bold', 16)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.50, "Centro de Operaciones de Emergencia Provincial")

    # Subtitulo
    canvas_obj.setFillColor(ARENA)
    canvas_obj.setFont('Helvetica', 13)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.45, "Ecosistema Digital 360 | VeltrixIntegra")

    # Comuna
    canvas_obj.setFillColor(white)
    canvas_obj.setFont('Helvetica', 11)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.41, "Comuna de Viña del Mar | Region de Valparaíso")

    # Caja del titulo del documento
    canvas_obj.setFillColor(HexColor('#0d2a44'))
    canvas_obj.roundRect(PAGE_W * 0.15, PAGE_H * 0.28, PAGE_W * 0.70, 1.8*cm, 8, fill=1, stroke=0)
    canvas_obj.setFillColor(white)
    canvas_obj.setFont('Helvetica-Bold', 14)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.34, "Instructivo de Uso del Panel de Emergencias")
    canvas_obj.setFont('Helvetica', 10)
    canvas_obj.setFillColor(ARENA_CLARA)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.30, "Guía practica para operadores y comunidad")

    # Datos del autor
    canvas_obj.setFillColor(white)
    canvas_obj.setFont('Helvetica', 10)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.18, "Claudio Urbina Vargas")
    canvas_obj.setFont('Helvetica', 9)
    canvas_obj.setFillColor(ARENA_CLARA)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.15, "Las Acacias 450 poniente paradero 12, Villa Alemana")
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.12, "+56 9 9619 4440 | claudio.urbina@vtr.net")

    # Año
    canvas_obj.setFillColor(ARENA)
    canvas_obj.setFont('Helvetica-Bold', 18)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.06, "2026")

    canvas_obj.restoreState()

# ---------------------------------------------------------------------------
# Estilos de texto
# ---------------------------------------------------------------------------
styles = getSampleStyleSheet()

style_h1 = ParagraphStyle('H1', parent=styles['Heading1'],
    fontName='Helvetica-Bold', fontSize=18, textColor=AZUL_PETROLEO,
    spaceBefore=20, spaceAfter=10, leading=22)

style_h2 = ParagraphStyle('H2', parent=styles['Heading2'],
    fontName='Helvetica-Bold', fontSize=13, textColor=AZUL_MEDIO,
    spaceBefore=14, spaceAfter=6, leading=16)

style_h3 = ParagraphStyle('H3', parent=styles['Heading3'],
    fontName='Helvetica-Bold', fontSize=11, textColor=GRIS_OSCURO,
    spaceBefore=10, spaceAfter=4, leading=14)

style_body = ParagraphStyle('Body', parent=styles['Normal'],
    fontName='Helvetica', fontSize=10.5, textColor=GRIS_OSCURO,
    leading=16, alignment=TA_JUSTIFY, spaceAfter=8)

style_bullet = ParagraphStyle('Bullet', parent=style_body,
    leftIndent=20, bulletIndent=8, spaceAfter=4)

style_note = ParagraphStyle('Note', parent=style_body,
    fontSize=9.5, textColor=HexColor('#666666'), leftIndent=15, spaceAfter=6)

style_table_header = ParagraphStyle('TableHeader', parent=styles['Normal'],
    fontName='Helvetica-Bold', fontSize=9.5, textColor=white, alignment=TA_CENTER)

style_table_cell = ParagraphStyle('TableCell', parent=styles['Normal'],
    fontName='Helvetica', fontSize=9.5, textColor=GRIS_OSCURO, leading=13)

# ---------------------------------------------------------------------------
# Contenido del instructivo
# ---------------------------------------------------------------------------
story = []

# --- Indice ---
story.append(Spacer(1, 1 * cm))
story.append(Paragraph("Indice", style_h1))
story.append(Spacer(1, 0.5 * cm))

indice_data = [
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

tabla_indice = Table(indice_data, colWidths=[1.2*cm, CONTENT_W - 1.2*cm])
tabla_indice.setStyle(TableStyle([
    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
    ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 0), (-1, -1), 11),
    ('TEXTCOLOR', (0, 0), (0, -1), AZUL_PETROLEO),
    ('TEXTCOLOR', (1, 0), (1, -1), GRIS_OSCURO),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('LINEBELOW', (0, 0), (-1, -1), 0.5, GRIS_CLARO),
]))
story.append(tabla_indice)
story.append(PageBreak())

# --- 1. Para que sirve ---
story.append(Paragraph("1. Para que sirve este panel?", style_h1))

story.append(Paragraph(
    "El COEP Viña es una herramienta de pantalla que reune en un solo lugar toda la "
    "informacion sobre emergencias que ocurren en la comuna de Viña del Mar. "
    "Sirve para que las personas que trabajan en emergencias (bomberos, carabineros, "
    "municipalidad) puedan ver de un vistazo que esta pasando ahora mismo, donde, "
    "y que tan grave es.", style_body))

story.append(Paragraph(
    "Piense en esto como un televisor que muestra varios canales a la vez: las alertas "
    "de SENAPRED, los avisos de Bomberos, los cortes de luz de Chilquinta, y los "
    "radioavisos del SHOA. Todo junto, ordenado por hora y por importancia.", style_body))

story.append(Paragraph("Que se puede hacer con el panel?", style_h2))

items_que_se_puede = [
    "<b>Ver alertas en tiempo real:</b> Las notificaciones llegan apenas las emiten las fuentes oficiales, sin esperar.",
    "<b>Ubicar emergencias en el mapa:</b> Cada alerta aparece como un punto en el mapa de Viña del Mar, con color segun el tipo.",
    "<b>Registrar personas vulnerables:</b> Con las fichas FIBER se anota quien necesita ayuda especial (adultos mayores, personas con movilidad reducida).",
    "<b>Descargar informes:</b> Se pueden exportar los datos a Excel, Word, PDF o PowerPoint para llevarlos a reuniones o enviarlos.",
    "<b>Revisar el cumplimiento legal:</b> El panel muestra que leyes se cumplen (SENAPRED, Ley 19.628 de datos, etc.).",
]
for item in items_que_se_puede:
    story.append(Paragraph(f"  -  {item}", style_bullet))

story.append(Spacer(1, 0.5 * cm))

# --- 2. Las fuentes ---
story.append(Paragraph("2. Las fuentes de informacion: de donde salen los datos?", style_h1))

story.append(Paragraph(
    "El panel no inventa nada. Toda la informacion viene de fuentes oficiales que "
    "tienen canales verificados. Si una fuente no tiene canal oficial, no aparece en "
    "el panel. Esto es importante: <b>si no esta aca, es porque no es una fuente "
    "confiable</b>.", style_body))

story.append(Spacer(1, 0.3 * cm))

# Tabla de fuentes
fuentes_data = [
    [Paragraph("Fuente", style_table_header),
     Paragraph("Que hace", style_table_header),
     Paragraph("Donde se verifica", style_table_header)],
    [Paragraph("SENAPRED", style_table_cell),
     Paragraph("Alertas oficiales del gobierno (Alerta Temprana, Amarilla, Roja)", style_table_cell),
     Paragraph("senapred.cl/alertas/", style_table_cell)],
    [Paragraph("CONAF / COGRIG", style_table_cell),
     Paragraph("Incendios forestales y prevencion. Sus alertas van por SENAPRED", style_table_cell),
     Paragraph("senapred.cl/alertas/", style_table_cell)],
    [Paragraph("SHOA (Armada)", style_table_cell),
     Paragraph("Radioavisos NURNAV Area B Valparaíso y boletines de tsunami", style_table_cell),
     Paragraph("shoa.cl/php/radioavisos.php", style_table_cell)],
    [Paragraph("Bomberos Viña (CBV2)", style_table_cell),
     Paragraph("Llamados de emergencia, claves de despacho, estado de emergencias", style_table_cell),
     Paragraph("WhatsApp / Zello Scanner", style_table_cell)],
    [Paragraph("Carabineros", style_table_cell),
     Paragraph("Comunicados de seguridad publica y hechos delictuales", style_table_cell),
     Paragraph("Radio 152.2625 MHz", style_table_cell)],
    [Paragraph("Chilquinta", style_table_cell),
     Paragraph("Cortes de luz e interrupciones electricas en la comuna", style_table_cell),
     Paragraph("chilquinta.cl/interrupciones", style_table_cell)],
]

tabla_fuentes = Table(fuentes_data, colWidths=[3.5*cm, 7.5*cm, 5.5*cm])
tabla_fuentes.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), AZUL_PETROLEO),
    ('GRID', (0, 0), (-1, -1), 0.5, GRIS_CLARO),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
]))
story.append(tabla_fuentes)

story.append(Spacer(1, 0.3 * cm))
story.append(Paragraph(
    "<b>Que fuentes se eliminaron por no ser confiables:</b> La Guardia Marina "
    "(sin canal de difusion accesible) y la Red de Radio (radioperiodismo, "
    "puede contener rumores no confirmados).", style_note))

story.append(PageBreak())

# --- 3. Como leer el mapa ---
story.append(Paragraph("3. Como leer el mapa de emergencias?", style_h1))

story.append(Paragraph(
    "El mapa es la parte mas llamativa del panel. Muestra la comuna de Viña del Mar "
    "visto desde arriba, con puntos de colores que indican donde esta pasando algo. "
    "Cada color significa un tipo distinto de emergencia.", style_body))

story.append(Paragraph("Que significan los colores?", style_h2))

colores_data = [
    [Paragraph("Color", style_table_header), Paragraph("Tipo de emergencia", style_table_header)],
    [Paragraph("<b>Rojo-naranja</b>", style_table_cell), Paragraph("Incendio forestal", style_table_cell)],
    [Paragraph("<b>Naranja</b>", style_table_cell), Paragraph("Incendio urbano (casas, edificios)", style_table_cell)],
    [Paragraph("<b>Morado</b>", style_table_cell), Paragraph("Sismo (terremoto)", style_table_cell)],
    [Paragraph("<b>Azul</b>", style_table_cell), Paragraph("Inundacion (agua, lluvias)", style_table_cell)],
    [Paragraph("<b>Amarillo</b>", style_table_cell), Paragraph("Deslizamiento (tierra, derrumbe)", style_table_cell)],
    [Paragraph("<b>Verde</b>", style_table_cell), Paragraph("Quimico (fuga, derrame)", style_table_cell)],
    [Paragraph("<b>Gris</b>", style_table_cell), Paragraph("Accidente o delito", style_table_cell)],
]

tabla_colores = Table(colores_data, colWidths=[4*cm, CONTENT_W - 4*cm])
tabla_colores.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), AZUL_PETROLEO),
    ('GRID', (0, 0), (-1, -1), 0.5, GRIS_CLARO),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
]))
story.append(tabla_colores)

story.append(Spacer(1, 0.3 * cm))

story.append(Paragraph("Como interactuar con el mapa", style_h2))

story.append(Paragraph(
    "El mapa se puede tocar. Si hace clic en un punto, se abre una ventana "
    "pequeña que muestra el titulo de la emergencia, el tipo, la comuna, y "
    "cuanta gente esta afectada. Tambien puede hacer zoom con los botones "
    "<b>+</b> y <b>-</b> que aparecen arriba a la izquierda del mapa.", style_body))

story.append(Paragraph(
    "Arriba del mapa hay dos casillas de verificacion: una dice <b>Incidentes</b> "
    "y la otra <b>Alertas en vivo</b>. Si desmarca una, esos puntos desaparecen. "
    "Sirve para ver solo lo que le interesa.", style_body))

story.append(PageBreak())

# --- 4. Feed en vivo ---
story.append(Paragraph("4. El feed en vivo: alertas que llegan ahora mismo", style_h1))

story.append(Paragraph(
    "A la derecha del mapa esta el feed en vivo. Es como un muro de Facebook pero "
    "con alertas reales. Cada vez que una fuente oficial emite algo, aparece aca "
    "al instante. Lo mas nuevo sale arriba.", style_body))

story.append(Paragraph("Como esta organizado cada aviso", style_h2))

story.append(Paragraph(
    "Cada alerta del feed muestra:", style_body))

items_feed = [
    "<b>Icono de color:</b> un cuadrito pintado que indica que tan grave es (verde = info, amarillo = vigilancia, naranja = alerta, rojo = critica).",
    "<b>Nombre de la fuente:</b> un sello pequeño que dice de donde viene (SENAPRED, CBV2, SHOA, etc.).",
    "<b>Sello de verificacion:</b> dice <b>Verificada</b> (verde) si viene de fuente oficial, o <b>Rumor</b> (naranjo) si no esta confirmado.",
    "<b>Titulo:</b> lo que paso, en pocas palabras.",
    "<b>Descripcion:</b> el detalle de la emergencia.",
    "<b>Hora:</b> hace cuanto tiempo que se emitio (ej: 'hace 3 segundos').",
]
for item in items_feed:
    story.append(Paragraph(f"  -  {item}", style_bullet))

story.append(Paragraph("Los botones de filtro", style_h2))

story.append(Paragraph(
    "Debajo del titulo <b>En Vivo</b> hay botones para filtrar por fuente: "
    "<b>Todas</b>, <b>SENAPRED</b>, <b>CONAF</b>, <b>SHOA</b>, <b>CBV2</b>, "
    "<b>Carabineros</b>, <b>Chilquinta</b>. Si toca uno, solo se ven las alertas "
    "de esa fuente. Para volver a ver todas, toque <b>Todas</b>.", style_body))

story.append(Paragraph(
    "Tambien hay un interruptor que dice <b>Solo verificadas (verdaderas)</b>. "
    "Cuando esta prendido (por defecto), solo se ven alertas que vienen de "
    "fuentes oficiales. Si lo apaga, aparecen tambien los rumores, marcados "
    "con un sello naranjo que dice <b>Rumor</b>.", style_body))

story.append(PageBreak())

# --- 5. Campana ---
story.append(Paragraph("5. La campana de notificaciones", style_h1))

story.append(Paragraph(
    "Arriba a la derecha, al lado del reloj, hay un icono de campana. Es donde se "
    "guardan las notificaciones que van llegando. Si hay un numero rojo encima "
    "de la campana, significa que hay alertas nuevas sin leer.", style_body))

story.append(Paragraph("Como funciona", style_h2))

items_campana = [
    "<b>Numero rojo:</b> muestra cuantas alertas nuevas hay. Si dice 3, hay tres sin revisar.",
    "<b>Al tocar la campana:</b> se abre una lista con las ultimas 30 alertas, de la mas nueva a la mas vieja.",
    "<b>Marcar como leidas:</b> hay un boton que dice 'Marcar todas leidas'. Al tocarlo, el numero rojo desaparece.",
    "<b>Solo alertas verificadas:</b> la campana solo muestra alertas que vienen de fuentes oficiales. Los rumores no molestan aca.",
]
for item in items_campana:
    story.append(Paragraph(f"  -  {item}", style_bullet))

story.append(Paragraph(
    "Las notificaciones tambien llegan al celular aunque la pagina este "
    "cerrada. Esto se hace con un 'Service Worker' que funciona en segundo "
    "plano. Solo las alertas criticas (las mas graves) disparan la "
    "notificacion del sistema.", style_body))

story.append(PageBreak())

# --- 6. Distinguir verdaderas de falsas ---
story.append(Paragraph("6. Como distinguir alertas verdaderas de rumores", style_h1))

story.append(Paragraph(
    "El panel hace un trabajo importante: separar lo que es real de lo que no. "
    "No todas las alertas que llegan son iguales. Algunas vienen de fuentes "
    "oficiales con canal verificado (son verdaderas) y otras son reportes de "
    "personas que pueden estar equivocadas (son rumores).", style_body))

story.append(Paragraph("Cuales son verdaderas?", style_h2))

story.append(Paragraph(
    "Las alertas de <b>SENAPRED</b>, <b>CONAF</b>, <b>SHOA</b>, <b>Bomberos "
    "CBV2</b>, <b>Carabineros</b> y <b>Chilquinta</b> son todas verdaderas. "
    "Estas son las 6 fuentes oficiales del panel. Cada una tiene un canal "
    "verificable (pagina web, radio, o grupo de WhatsApp) donde se puede "
    "confirmar la informacion.", style_body))

story.append(Paragraph("Cuales son rumores?", style_h2))

story.append(Paragraph(
    "Antes habia una fuente llamada 'Red de Radio' que podia contener rumores "
    "no confirmados. Esa fuente se elimino del panel por no ser confiable. "
    "Ahora todas las alertas que aparecen son verificadas. Si alguna vez se "
    "vuelve a agregar una fuente no oficial, se marcara con un sello "
    "naranjo que dice <b>Rumor</b>.", style_body))

story.append(Paragraph("El sello de verificacion", style_h2))

verif_data = [
    [Paragraph("Sello", style_table_header), Paragraph("Que significa", style_table_header)],
    [Paragraph("<b>Verificada</b> (verde)", style_table_cell),
     Paragraph("Viene de una fuente oficial con canal confirmado. Se puede confiar en la informacion.", style_table_cell)],
    [Paragraph("<b>Rumor</b> (naranjo)", style_table_cell),
     Paragraph("Reporte no confirmado por una fuente oficial. Mostrar con cuidado, puede ser falso.", style_table_cell)],
]

tabla_verif = Table(verif_data, colWidths=[5*cm, CONTENT_W - 5*cm])
tabla_verif.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), AZUL_PETROLEO),
    ('GRID', (0, 0), (-1, -1), 0.5, GRIS_CLARO),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
]))
story.append(tabla_verif)

story.append(PageBreak())

# --- 7. Pipeline de depuracion ---
story.append(Paragraph("7. El pipeline de depuracion: como se limpian los datos falsos", style_h1))

story.append(Paragraph(
    "El panel tiene un sistema automatico que revisa cada alerta antes de "
    "mostrarla. Se llama 'pipeline de depuracion'. Piense en esto como un "
    "filtro de agua: el agua entra con impurezas y sale limpia. Aca, las "
    "alertas entran con posibles errores y salen solo las que sirven.", style_body))

story.append(Paragraph("Los 3 filtros que se aplican", style_h2))

story.append(Paragraph(
    "Cada alerta pasa por 3 revisiones antes de aparecer en el mapa o en el feed:", style_body))

filtros_data = [
    [Paragraph("Filtro", style_table_header),
     Paragraph("Que revisa", style_table_header),
     Paragraph("Que descarta", style_table_header)],
    [Paragraph("<b>1. Territorial</b>", style_table_cell),
     Paragraph("Si la alerta es de Viña del Mar", style_table_cell),
     Paragraph("Alertas de otras comunas (Valparaíso, Concon, Quilpue, etc.)", style_table_cell)],
    [Paragraph("<b>2. Temporal</b>", style_table_cell),
     Paragraph("Si la alerta es de hoy y dentro del tiempo permitido", style_table_cell),
     Paragraph("Alertas de dias anteriores, o que pasaron el tiempo maximo (4h para emergencias, 12h para boletines)", style_table_cell)],
    [Paragraph("<b>3. Estado</b>", style_table_cell),
     Paragraph("Si la alerta es de una emergencia viva", style_table_cell),
     Paragraph("Alertas que dicen 'terminado', 'controlado', 'cierre', 'balance', 'informativo' (ya no son emergencias activas)", style_table_cell)],
]

tabla_filtros = Table(filtros_data, colWidths=[3*cm, 5.5*cm, 8*cm])
tabla_filtros.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), AZUL_PETROLEO),
    ('GRID', (0, 0), (-1, -1), 0.5, GRIS_CLARO),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
]))
story.append(tabla_filtros)

story.append(Spacer(1, 0.3 * cm))

story.append(Paragraph(
    "El panel 'Pipeline de Depuracion' (que esta debajo del mapa) muestra "
    "este proceso en vivo. Cada alerta aparece con un sello verde que dice "
    "<b>Vigente</b> (paso los 3 filtros) o un sello rojo que dice "
    "<b>Descartado</b> (no paso alguno), junto con el motivo del descarte.", style_body))

story.append(PageBreak())

# --- 8. Fichas FIBER ---
story.append(Paragraph("8. Las fichas FIBER: registro de personas en riesgo", style_h1))

story.append(Paragraph(
    "FIBER significa 'Ficha Individual de Bienestar y Riesgo'. Es un "
    "registro donde se anota a las personas que necesitan ayuda especial "
    "durante una emergencia: adultos mayores que viven solos, personas en "
    "silla de ruedas, alguien que necesita oxigeno, etc.", style_body))

story.append(Paragraph("Como se lee la tabla", style_h2))

story.append(Paragraph(
    "La tabla de fichas muestra estas columnas:", style_body))

items_fichas = [
    "<b>Codigo:</b> un identificador unico (ej: FIBER-2026-00001).",
    "<b>Nombre:</b> el nombre completo de la persona.",
    "<b>Comuna:</b> siempre Viña del Mar (el panel solo maneja esta comuna).",
    "<b>Edad:</b> el rango etario (0-17, 18-29, 30-59, 60+).",
    "<b>Riesgo:</b> el nivel de riesgo con un color (critico = rojo, alto = naranjo, medio = amarillo, bajo = verde).",
    "<b>Estado:</b> registrada, evaluada, derivada o cerrada.",
    "<b>Necesidades:</b> iconos que muestran si necesita evacuacion, medicamentos, o ayuda para moverse.",
]
for item in items_fichas:
    story.append(Paragraph(f"  -  {item}", style_bullet))

story.append(Paragraph("Como crear una ficha nueva", style_h2))

story.append(Paragraph(
    "Toque el boton <b>Nueva Ficha</b> (arriba a la derecha de la tabla). "
    "Se abre una ventana donde se llenan los datos: nombre, direccion, "
    "telefono, nivel de riesgo, y si necesita medicamentos, evacuacion, o "
    "ayuda para moverse. Al guardar, la ficha queda registrada y aparece "
    "en la tabla.", style_body))

story.append(PageBreak())

# --- 9. Exportar ---
story.append(Paragraph("9. Exportar datos: como descargar informes", style_h1))

story.append(Paragraph(
    "Arriba a la derecha, al lado del boton 'Nueva Catastrofe', hay un "
    "boton que dice <b>Exportar</b>. Al tocarlo se abre un menu con 4 "
    "opciones:", style_body))

exportar_data = [
    [Paragraph("Formato", style_table_header), Paragraph("Para que sirve", style_table_header)],
    [Paragraph("<b>Excel (.xlsx)</b>", style_table_cell),
     Paragraph("Para trabajar con los datos en planillas. Incluye hojas de alertas, incidentes, fichas y resumen.", style_table_cell)],
    [Paragraph("<b>Word (.docx)</b>", style_table_cell),
     Paragraph("Para llevar un informe escrito a una reunion o enviarlo por correo.", style_table_cell)],
    [Paragraph("<b>PDF (.pdf)</b>", style_table_cell),
     Paragraph("Para imprimir o compartir sin que se pueda modificar.", style_table_cell)],
    [Paragraph("<b>PowerPoint (.pptx)</b>", style_table_cell),
     Paragraph("Para presentar en pantalla, con graficos y resumenes visuales.", style_table_cell)],
]

tabla_exportar = Table(exportar_data, colWidths=[4*cm, CONTENT_W - 4*cm])
tabla_exportar.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), AZUL_PETROLEO),
    ('GRID', (0, 0), (-1, -1), 0.5, GRIS_CLARO),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
]))
story.append(tabla_exportar)

story.append(Spacer(1, 0.3 * cm))

story.append(Paragraph(
    "Al tocar una opcion, el sistema genera el archivo y lo descarga "
    "automaticamente. Mientras se genera, aparece un mensaje que dice "
    "'Generando documento...'. Segun el formato, puede tardar unos segundos.", style_body))

story.append(PageBreak())

# --- 10. Cumplimiento legal ---
story.append(Paragraph("10. Cumplimiento legal: que leyes se respetan", style_h1))

story.append(Paragraph(
    "El panel no solo muestra emergencias. Tambien cuida que la informacion "
    "se maneje bien. Hay leyes que obligan a tratar los datos personales con "
    "cuidado, y otras que definen como se manejan las catástrofes. El panel "
    "las cumple todas.", style_body))

story.append(Paragraph("Las leyes que se cumplen", style_h2))

leyes_data = [
    [Paragraph("Ley", style_table_header), Paragraph("De que trata", style_table_header)],
    [Paragraph("<b>SENAPRED (Ley 21.151)</b>", style_table_cell),
     Paragraph("Crea el Servicio Nacional de Prevencion y Respuesta ante Desastres. Define como se manejan las emergencias en Chile.", style_table_cell)],
    [Paragraph("<b>Ley 19.628</b>", style_table_cell),
     Paragraph("Proteccion de datos personales. Los datos de las fichas FIBER (nombre, telefono, direccion) se tratan con cuidado y no se comparten sin permiso.", style_table_cell)],
    [Paragraph("<b>Ley 21.519</b>", style_table_cell),
     Paragraph("Marco de Ciberseguridad de Chile. El panel tiene medidas de seguridad para que los datos no sean robados.", style_table_cell)],
    [Paragraph("<b>Ley 18.243</b>", style_table_cell),
     Paragraph("Cuerpo de Bomberos. Define como funcionan los bomberos voluntarios en Chile.", style_table_cell)],
    [Paragraph("<b>ISO 27001</b>", style_table_cell),
     Paragraph("Norma internacional de seguridad de la informacion. El panel sigue sus principios.", style_table_cell)],
]

tabla_leyes = Table(leyes_data, colWidths=[4.5*cm, CONTENT_W - 4.5*cm])
tabla_leyes.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), AZUL_PETROLEO),
    ('GRID', (0, 0), (-1, -1), 0.5, GRIS_CLARO),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8f8f8')]),
]))
story.append(tabla_leyes)

story.append(Spacer(1, 0.3 * cm))

story.append(Paragraph(
    "Para ver mas detalle, en el panel hay una seccion llamada <b>Cumplimiento "
    "Legal y Ciberseguridad</b> que explica cada ley en lenguaje sencillo.", style_body))

story.append(PageBreak())

# --- 11. Preguntas frecuentes ---
story.append(Paragraph("11. Preguntas frecuentes", style_h1))

faqs = [
    ("Por que a veces no aparecen alertas?",
     "Si no hay alertas, es porque las fuentes oficiales no han emitido nada "
     "recientemente. El panel no inventa alertas. Si SENAPRED, Bomberos, "
     "SHOA, Carabineros y Chilquinta no han emitido nada en las ultimas horas, "
     "el feed estara vacio. Eso es una buena señal: significa que no hay emergencias activas."),

    ("Por que aparecen 0 incendios?",
     "Porque no hay incendios registrados hoy en Viña del Mar. El panel solo "
     "muestra emergencias reales con fecha de hoy. Si no hay incendios, el "
     "contador dice 0. No se muestra un incendio que ya se apago ni uno de "
     "otro dia."),

    ("Por que las mareas no aparecen como alertas?",
     "Porque las mareas (pleamar y bajamar) son datos normales que se repiten "
     "todos los dias. No son emergencias. El SHOA las publica como tablas de "
     "consulta, no como alertas. El panel solo muestra alertas reales del "
     "SHOA, como los radioavisos NURNAV Area B Valparaíso."),

    ("Que hago si la pagina se queda cargando?",
     "El sistema puede tardar unos segundos en arrancar, especialmente la "
     "primera vez. Si despues de 30 segundos sigue cargando, cierre la "
     "pagina y vuelva a abrirla. Si el problema persiste, espere un par de "
     "minutos (el servidor puede estar reiniciandose)."),

    ("Puedo usar el panel en mi celular?",
     "Si. El panel se ajusta al tamano de la pantalla. En el celular se ve "
     "en una sola columna (todo apilado). Tambien se puede instalar como "
     "aplicacion tocando 'Agregar a pantalla de inicio' en el navegador."),

    ("Mis datos personales estan seguros?",
     "Si. El panel cumple con la Ley 19.628 de Proteccion de Datos. Las "
     "fichas FIBER solo las pueden ver las personas autorizadas. Toda "
     "accion (crear, editar, ver) se registra en una bitacora de "
     "auditoria para que se sepa quien hizo que y cuando."),
]

for pregunta, respuesta in faqs:
    story.append(Paragraph(f"<b>{pregunta}</b>", style_h3))
    story.append(Paragraph(respuesta, style_body))
    story.append(Spacer(1, 0.3 * cm))

# --- Cierre ---
story.append(Spacer(1, 1 * cm))
story.append(Paragraph(
    "<b>VeltrixIntegra | Ecosistema Digital 360</b>", style_h2))
story.append(Paragraph(
    "Las Acacias 450 poniente paradero 12, Villa Alemana | "
    "+56 9 9619 4440 | claudio.urbina@vtr.net | "
    "Claudio Urbina Vargas, Fundador", style_note))

# ---------------------------------------------------------------------------
# Generar el PDF
# ---------------------------------------------------------------------------
doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=MARGIN_L,
    rightMargin=MARGIN_R,
    topMargin=MARGIN_T,
    bottomMargin=MARGIN_B,
    title="Instructivo COEP Viña | VeltrixIntegra",
    author="Claudio Urbina Vargas - VeltrixIntegra",
    subject="Guia de uso del panel de emergencias COEP Viña",
    creator="VeltrixIntegra Ecosistema Digital 360",
)

def primera_pagina(canvas_obj, doc):
    portada(canvas_obj, doc)

doc.build(story, onFirstPage=primera_pagina, onLaterPages=header_footer)

print(f"PDF generado: {OUTPUT}")
print(f"Tamano: {os.path.getsize(OUTPUT) / 1024:.1f} KB")
