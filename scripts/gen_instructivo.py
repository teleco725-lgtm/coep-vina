#!/usr/bin/env python3
"""
Instructivo COEP Viña - Formato profesional corregido
- Portada en pagina separada (sin superposicion)
- Icono en encabezado + logo marca de agua sutil
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib import colors

OUTPUT = "/home/z/my-project/download/Instructivo_COEP_Vina_VeltrixIntegra.pdf"
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

ICONO = "/home/z/my-project/upload/icono.png"
LOGO = "/home/z/my-project/upload/logo.jpg"

AZUL = HexColor('#1a3a5c')
AZUL_M = HexColor('#2a5a8c')
ARENA = HexColor('#d4a943')
ARENA_C = HexColor('#f5e6c8')
GRIS_O = HexColor('#2d2d2d')
GRIS_C = HexColor('#e8e8e8')
BLANCO = white

PAGE_W, PAGE_H = A4
ML = 2.5 * cm
MR = 2.5 * cm
MT = 3.0 * cm
MB = 2.5 * cm
CW = PAGE_W - ML - MR

def dibujar_marca_agua(canvas_obj):
    """Dibuja el logo como marca de agua muy sutil."""
    if os.path.exists(LOGO):
        try:
            wm_w = PAGE_W * 0.55
            wm_h = wm_w / 4
            canvas_obj.saveState()
            canvas_obj.setFillAlpha(0.04)
            canvas_obj.drawImage(LOGO, (PAGE_W - wm_w) / 2, (PAGE_H - wm_h) / 2, wm_w, wm_h, mask='auto', preserveAspectRatio=True)
            canvas_obj.restoreState()
        except: pass

def dibujar_encabezado(canvas_obj, doc):
    """Dibuja el encabezado con icono + texto + footer en cada pagina de contenido."""
    canvas_obj.saveState()

    # Marca de agua
    dibujar_marca_agua(canvas_obj)

    # Barra superior
    canvas_obj.setFillColor(AZUL)
    canvas_obj.rect(0, PAGE_H - 2.0 * cm, PAGE_W, 0.08 * cm, fill=1, stroke=0)

    # Icono
    icon_size = 1.1 * cm
    icon_y = PAGE_H - 1.75 * cm
    if os.path.exists(ICONO):
        try:
            canvas_obj.drawImage(ICONO, ML, icon_y - 0.05 * cm, icon_size, icon_size, mask='auto', preserveAspectRatio=True)
        except: pass

    # Texto del encabezado
    canvas_obj.setFillColor(AZUL)
    canvas_obj.setFont('Helvetica-Bold', 9)
    canvas_obj.drawString(ML + icon_size + 0.3 * cm, icon_y + 0.25 * cm, "VeltrixIntegra | Ecosistema Digital 360")
    canvas_obj.setFillColor(HexColor('#555555'))
    canvas_obj.setFont('Helvetica', 7.5)
    canvas_obj.drawString(ML + icon_size + 0.3 * cm, icon_y - 0.05 * cm, "COEP Viña | Instructivo de Uso")

    # Linea dorada
    canvas_obj.setStrokeColor(ARENA)
    canvas_obj.setLineWidth(1.2)
    canvas_obj.line(ML, PAGE_H - 2.05 * cm, PAGE_W - MR, PAGE_H - 2.05 * cm)

    # Footer
    canvas_obj.setStrokeColor(GRIS_C)
    canvas_obj.setLineWidth(0.5)
    canvas_obj.line(ML, 1.5 * cm, PAGE_W - MR, 1.5 * cm)
    canvas_obj.setFillColor(GRIS_O)
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.drawCentredString(PAGE_W / 2, 0.9 * cm,
        "Claudio Urbina Vargas - Fundador VeltrixIntegra - +56 9 9619 4440 - claudio.urbina@vtr.net")
    canvas_obj.setFillColor(AZUL)
    canvas_obj.setFont('Helvetica-Bold', 7.5)
    canvas_obj.drawRightString(PAGE_W - MR, 0.5 * cm, f"Pagina {doc.page}")

    canvas_obj.restoreState()

def dibujar_portada(canvas_obj, doc):
    """Dibuja SOLO la portada en la pagina 1, sin contenido del story."""
    canvas_obj.saveState()

    # Fondo azul
    canvas_obj.setFillColor(AZUL)
    canvas_obj.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # Logo como marca de agua en portada (mas visible)
    if os.path.exists(LOGO):
        try:
            wm_w = PAGE_W * 0.45
            wm_h = wm_w / 4
            canvas_obj.saveState()
            canvas_obj.setFillAlpha(0.10)
            canvas_obj.drawImage(LOGO, (PAGE_W - wm_w) / 2, PAGE_H * 0.22, wm_w, wm_h, mask='auto', preserveAspectRatio=True)
            canvas_obj.restoreState()
        except: pass

    # Icono centrado
    if os.path.exists(ICONO):
        try:
            ico_size = 3.5 * cm
            canvas_obj.drawImage(ICONO, PAGE_W/2 - ico_size/2, PAGE_H * 0.75, ico_size, ico_size, mask='auto', preserveAspectRatio=True)
        except: pass

    # Banda dorada
    canvas_obj.setFillColor(ARENA)
    canvas_obj.rect(PAGE_W * 0.22, PAGE_H * 0.70, PAGE_W * 0.56, 0.1 * cm, fill=1, stroke=0)

    # Titulo
    canvas_obj.setFillColor(BLANCO)
    canvas_obj.setFont('Helvetica-Bold', 26)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.64, "COEP Viña")
    canvas_obj.setFont('Helvetica-Bold', 14)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.59, "Centro de Operaciones de Emergencia Provincial")

    # Subtitulo
    canvas_obj.setFillColor(ARENA)
    canvas_obj.setFont('Helvetica', 11)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.54, "Ecosistema Digital 360 | VeltrixIntegra")

    # Comuna
    canvas_obj.setFillColor(BLANCO)
    canvas_obj.setFont('Helvetica', 10)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.50, "Comuna de Viña del Mar | Region de Valparaíso")

    # Caja del documento
    canvas_obj.setFillColor(HexColor('#0d2a44'))
    canvas_obj.roundRect(PAGE_W * 0.15, PAGE_H * 0.35, PAGE_W * 0.70, 2.0 * cm, 8, fill=1, stroke=0)
    canvas_obj.setFillColor(BLANCO)
    canvas_obj.setFont('Helvetica-Bold', 13)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.41, "Instructivo de Uso del Panel de Emergencias")
    canvas_obj.setFillColor(ARENA_C)
    canvas_obj.setFont('Helvetica-Oblique', 9)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.37, "Guia practica para operadores y comunidad")

    # Datos del autor
    canvas_obj.setFillColor(BLANCO)
    canvas_obj.setFont('Helvetica-Bold', 10)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.24, "Claudio Urbina Vargas")
    canvas_obj.setFont('Helvetica', 8.5)
    canvas_obj.setFillColor(ARENA_C)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.21, "Las Acacias 450 poniente paradero 12, Villa Alemana")
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.18, "+56 9 9619 4440 | claudio.urbina@vtr.net")

    # Año
    canvas_obj.setFillColor(ARENA)
    canvas_obj.setFont('Helvetica-Bold', 15)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.10, "2026")

    # Footer de portada
    canvas_obj.setFillColor(HexColor('#0d2a44'))
    canvas_obj.rect(0, 0, PAGE_W, 1.0 * cm, fill=1, stroke=0)
    canvas_obj.setFillColor(ARENA_C)
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.drawCentredString(PAGE_W / 2, 0.35 * cm, "VeltrixIntegra | Ecosistema Digital 360 - COEP Viña 2026")

    canvas_obj.restoreState()

# ---------------------------------------------------------------------------
# Estilos
# ---------------------------------------------------------------------------
styles = getSampleStyleSheet()
h1 = ParagraphStyle('H1', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=16, textColor=AZUL, spaceBefore=15, spaceAfter=8, leading=20)
h2 = ParagraphStyle('H2', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=12, textColor=AZUL_M, spaceBefore=10, spaceAfter=4, leading=14)
h3 = ParagraphStyle('H3', parent=styles['Heading3'], fontName='Helvetica-Bold', fontSize=10.5, textColor=GRIS_O, spaceBefore=8, spaceAfter=3, leading=13)
body = ParagraphStyle('Body', parent=styles['Normal'], fontName='Helvetica', fontSize=10, textColor=GRIS_O, leading=15, alignment=TA_JUSTIFY, spaceAfter=6)
bullet = ParagraphStyle('Bullet', parent=body, leftIndent=18, bulletIndent=6, spaceAfter=3)
note = ParagraphStyle('Note', parent=body, fontSize=9, textColor=HexColor('#777777'), leftIndent=12, spaceAfter=4)
th = ParagraphStyle('TH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=white, alignment=TA_CENTER)
td = ParagraphStyle('TD', parent=styles['Normal'], fontName='Helvetica', fontSize=9, textColor=GRIS_O, leading=12)

def tabla_estilo():
    return TableStyle([
        ('BACKGROUND', (0,0), (-1,0), AZUL),
        ('GRID', (0,0), (-1,-1), 0.4, GRIS_C),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [white, HexColor('#f8f8f8')]),
    ])

# ---------------------------------------------------------------------------
# Contenido — la portada es pagina 1, el contenido empieza en pagina 2
# ---------------------------------------------------------------------------
story = []

# IMPORTANTE: agregamos un PageBreak para que el contenido NO se superponga
# con la portada. La portada se dibuja con onFirstPage, y el story empieza
# en la pagina 2.
story.append(PageBreak())

# Indice
story.append(Paragraph("Indice", h1))
idx_data = [[f"{i+1}.", t] for i, t in enumerate([
    "Para que sirve este panel?",
    "Las fuentes de informacion: de donde salen los datos?",
    "Como leer el mapa de emergencias?",
    "El feed en vivo: alertas que llegan ahora mismo",
    "La campana de notificaciones",
    "Como distinguir alertas verdaderas de rumores",
    "El pipeline de depuracion: como se limpian los datos falsos",
    "Las fichas FIBER: registro de personas en riesgo",
    "Exportar datos: como descargar informes",
    "Cumplimiento legal: que leyes se respetan",
    "Preguntas frecuentes",
])]
t_idx = Table(idx_data, colWidths=[1*cm, CW - 1*cm])
t_idx.setStyle(TableStyle([
    ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
    ('FONTSIZE', (0,0), (-1,-1), 10),
    ('TEXTCOLOR', (0,0), (0,-1), AZUL),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ('TOPPADDING', (0,0), (-1,-1), 3),
    ('LINEBELOW', (0,0), (-1,-1), 0.3, GRIS_C),
]))
story.append(t_idx)
story.append(PageBreak())

# 1
story.append(Paragraph("1. Para que sirve este panel?", h1))
story.append(Paragraph("El COEP Viña es una herramienta de pantalla que reune en un solo lugar toda la informacion sobre emergencias que ocurren en la comuna de Viña del Mar. Sirve para que las personas que trabajan en emergencias puedan ver de un vistazo que esta pasando ahora mismo, donde, y que tan grave es.", body))
story.append(Paragraph("Piense en esto como un televisor que muestra varios canales a la vez: las alertas de SENAPRED, los avisos de Bomberos, los cortes de luz de Chilquinta, y los radioavisos del SHOA. Todo junto, ordenado por hora y por importancia.", body))
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

# 2
story.append(Paragraph("2. Las fuentes de informacion: de donde salen los datos?", h1))
story.append(Paragraph("El panel no inventa nada. Toda la informacion viene de fuentes oficiales que tienen canales verificados. <b>Si no esta aca, es porque no es una fuente confiable.</b>", body))
story.append(Spacer(1, 0.2 * cm))
fuentes = [
    [Paragraph("Fuente", th), Paragraph("Que hace", th), Paragraph("Donde se verifica", th)],
    [Paragraph("SENAPRED", td), Paragraph("Alertas oficiales del gobierno", td), Paragraph("senapred.cl/alertas/", td)],
    [Paragraph("SHOA", td), Paragraph("Radioavisos NURNAV Area B Valparaíso", td), Paragraph("shoa.cl/php/radioavisos.php", td)],
    [Paragraph("Bomberos CBV2", td), Paragraph("Llamados de emergencia, claves de despacho", td), Paragraph("WhatsApp / Zello Scanner", td)],
    [Paragraph("Carabineros", td), Paragraph("Comunicados de seguridad publica", td), Paragraph("Radio 152.2625 MHz", td)],
    [Paragraph("Chilquinta", td), Paragraph("Cortes de luz e interrupciones electricas", td), Paragraph("chilquinta.cl/interrupciones", td)],
    [Paragraph("Municipalidad", td), Paragraph("Direccion de Seguridad Publica de Viña del Mar", td), Paragraph("munivina.cl/seguridad-ciudadana", td)],
]
story.append(Table(fuentes, colWidths=[3*cm, 8*cm, 5.5*cm], style=tabla_estilo()))
story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph("<b>Fuentes eliminadas por no ser confiables:</b> Guardia Marina (sin canal accesible) y Red de Radio (puede contener rumores).", note))
story.append(PageBreak())

# 3
story.append(Paragraph("3. Como leer el mapa de emergencias?", h1))
story.append(Paragraph("El mapa muestra la comuna de Viña del Mar vista desde arriba, con puntos de colores que indican donde esta pasando algo. Cada color significa un tipo distinto de emergencia.", body))
story.append(Paragraph("Que significan los colores?", h2))
colores = [
    [Paragraph("Color", th), Paragraph("Tipo de emergencia", th)],
    [Paragraph("<b>Rojo-naranja</b>", td), Paragraph("Incendio forestal", td)],
    [Paragraph("<b>Naranja</b>", td), Paragraph("Incendio urbano", td)],
    [Paragraph("<b>Morado</b>", td), Paragraph("Sismo", td)],
    [Paragraph("<b>Azul</b>", td), Paragraph("Inundacion", td)],
    [Paragraph("<b>Amarillo</b>", td), Paragraph("Deslizamiento", td)],
    [Paragraph("<b>Verde</b>", td), Paragraph("Quimico", td)],
    [Paragraph("<b>Gris</b>", td), Paragraph("Accidente o delito", td)],
]
story.append(Table(colores, colWidths=[4*cm, CW - 4*cm], style=tabla_estilo()))
story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph("Como interactuar con el mapa", h2))
story.append(Paragraph("Si hace clic en un punto, se abre una ventana con el titulo, tipo, comuna y afectados. Puede hacer zoom con <b>+</b> y <b>-</b>. Arriba del mapa hay casillas para mostrar/ocultar incidentes y alertas en vivo.", body))
story.append(PageBreak())

# 4
story.append(Paragraph("4. El feed en vivo: alertas que llegan ahora mismo", h1))
story.append(Paragraph("A la derecha del mapa esta el feed en vivo. Es como un muro de Facebook pero con alertas reales. Lo mas nuevo sale arriba.", body))
story.append(Paragraph("Como esta organizado cada aviso", h2))
for item in [
    "<b>Icono de color:</b> indica la gravedad (verde = info, amarillo = vigilancia, naranja = alerta, rojo = critica).",
    "<b>Nombre de la fuente:</b> sello con la fuente (SENAPRED, CBV2, SHOA, etc.).",
    "<b>Sello de verificacion:</b> <b>Verificada</b> (verde) si viene de fuente oficial.",
    "<b>Titulo:</b> lo que paso, en pocas palabras.",
    "<b>Descripcion:</b> el detalle de la emergencia.",
    "<b>Hora:</b> hace cuanto se emitio (ej: 'hace 3 segundos').",
]:
    story.append(Paragraph(f"  -  {item}", bullet))
story.append(Paragraph("Los botones de filtro", h2))
story.append(Paragraph("Debajo de <b>En Vivo</b> hay botones para filtrar por fuente: Todas, SENAPRED, SHOA, CBV2, Carabineros, Chilquinta, Municipalidad. Tambien hay un interruptor <b>Solo verificadas (verdaderas)</b> que por defecto esta prendido.", body))
story.append(PageBreak())

# 5
story.append(Paragraph("5. La campana de notificaciones", h1))
story.append(Paragraph("Arriba a la derecha hay un icono de campana. Si hay un numero rojo, hay alertas nuevas sin leer.", body))
story.append(Paragraph("Como funciona", h2))
for item in [
    "<b>Numero rojo:</b> cuantas alertas nuevas hay.",
    "<b>Al tocar la campana:</b> se abre una lista con las ultimas 30 alertas.",
    "<b>Marcar como leidas:</b> boton que hace desaparecer el numero rojo.",
    "<b>Solo verificadas:</b> la campana no muestra rumores, solo alertas oficiales.",
]:
    story.append(Paragraph(f"  -  {item}", bullet))
story.append(Paragraph("Las notificaciones tambien llegan al celular aunque la pagina este cerrada, via Service Worker. Solo las alertas criticas disparan la notificacion del sistema.", body))
story.append(PageBreak())

# 6
story.append(Paragraph("6. Como distinguir alertas verdaderas de rumores", h1))
story.append(Paragraph("El panel separa lo real de lo que no. Algunas alertas vienen de fuentes oficiales (verdaderas) y otras son reportes no confirmados (rumores).", body))
story.append(Paragraph("Cuales son verdaderas?", h2))
story.append(Paragraph("Las 6 fuentes oficiales (SENAPRED, SHOA, Bomberos CBV2, Carabineros, Chilquinta, Municipalidad) son todas verdaderas. Cada una tiene un canal verificable.", body))
story.append(Paragraph("El sello de verificacion", h2))
verif = [
    [Paragraph("Sello", th), Paragraph("Que significa", th)],
    [Paragraph("<b>Verificada</b> (verde)", td), Paragraph("Viene de fuente oficial. Se puede confiar.", td)],
    [Paragraph("<b>Rumor</b> (naranjo)", td), Paragraph("No confirmado. Mostrar con cuidado.", td)],
]
story.append(Table(verif, colWidths=[5*cm, CW - 5*cm], style=tabla_estilo()))
story.append(PageBreak())

# 7
story.append(Paragraph("7. El pipeline de depuracion: como se limpian los datos falsos", h1))
story.append(Paragraph("El panel tiene un sistema automatico que revisa cada alerta antes de mostrarla. Piense en esto como un filtro de agua: las alertas entran con posibles errores y salen solo las que sirven.", body))
story.append(Paragraph("Los 3 filtros de tolerancia cero", h2))
filtros = [
    [Paragraph("Filtro", th), Paragraph("Que revisa", th), Paragraph("Que descarta", th)],
    [Paragraph("<b>1. Territorial</b>", td), Paragraph("Si es de Viña del Mar", td), Paragraph("Alertas de otras comunas", td)],
    [Paragraph("<b>2. Temporal</b>", td), Paragraph("Si es de hoy y dentro del TTL", td), Paragraph("Alertas de dias anteriores o que pasaron el tiempo max (4h/12h)", td)],
    [Paragraph("<b>3. Estado</b>", td), Paragraph("Si es una emergencia viva", td), Paragraph("Alertas que dicen 'terminado', 'controlado', 'cierre', 'normalizado', etc.", td)],
]
story.append(Table(filtros, colWidths=[3*cm, 5.5*cm, 8*cm], style=tabla_estilo()))
story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph("El panel 'Pipeline de Depuracion' muestra este proceso en vivo. Cada alerta aparece con <b>Vigente</b> (verde) o <b>Descartado</b> (rojo) con el motivo.", body))
story.append(PageBreak())

# 8
story.append(Paragraph("8. Las fichas FIBER: registro de personas en riesgo", h1))
story.append(Paragraph("FIBER = 'Ficha Individual de Bienestar y Riesgo'. Registra personas que necesitan ayuda especial durante emergencias: adultos mayores solos, personas en silla de ruedas, etc.", body))
story.append(Paragraph("Como se lee la tabla", h2))
for item in [
    "<b>Codigo:</b> identificador unico (ej: FIBER-2026-00001).",
    "<b>Nombre, Comuna, Edad, Riesgo, Estado y Necesidades.</b>",
]:
    story.append(Paragraph(f"  -  {item}", bullet))
story.append(Paragraph("Como crear una ficha nueva", h2))
story.append(Paragraph("Toque <b>Nueva Ficha</b>. Llene los datos: nombre, direccion, telefono, nivel de riesgo, necesidades. Al guardar, la ficha aparece en la tabla.", body))
story.append(PageBreak())

# 9
story.append(Paragraph("9. Exportar datos: como descargar informes", h1))
story.append(Paragraph("El boton <b>Exportar</b> abre un menu con 4 opciones:", body))
exp = [
    [Paragraph("Formato", th), Paragraph("Para que sirve", th)],
    [Paragraph("<b>Excel (.xlsx)</b>", td), Paragraph("Trabajar con los datos en planillas.", td)],
    [Paragraph("<b>Word (.docx)</b>", td), Paragraph("Informe escrito para reuniones o correo.", td)],
    [Paragraph("<b>PDF (.pdf)</b>", td), Paragraph("Imprimir o compartir sin modificar.", td)],
    [Paragraph("<b>PowerPoint (.pptx)</b>", td), Paragraph("Presentar en pantalla con graficos.", td)],
]
story.append(Table(exp, colWidths=[4*cm, CW - 4*cm], style=tabla_estilo()))
story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph("Tambien hay un item <b>Instructivo de Uso (PDF)</b> que abre este documento en una nueva pestana.", body))
story.append(PageBreak())

# 10
story.append(Paragraph("10. Cumplimiento legal: que leyes se respetan", h1))
story.append(Paragraph("El panel cuida que la informacion se maneje bien. Hay leyes que obligan a tratar los datos personales con cuidado.", body))
story.append(Paragraph("Las leyes que se cumplen", h2))
leyes = [
    [Paragraph("Ley", th), Paragraph("De que trata", th)],
    [Paragraph("<b>SENAPRED (Ley 21.151)</b>", td), Paragraph("Servicio Nacional de Prevencion y Respuesta ante Desastres.", td)],
    [Paragraph("<b>Ley 19.628</b>", td), Paragraph("Proteccion de datos personales.", td)],
    [Paragraph("<b>Ley 21.519</b>", td), Paragraph("Marco de Ciberseguridad de Chile.", td)],
    [Paragraph("<b>ISO 27001</b>", td), Paragraph("Norma internacional de seguridad de la informacion.", td)],
]
story.append(Table(leyes, colWidths=[4.5*cm, CW - 4.5*cm], style=tabla_estilo()))
story.append(Spacer(1, 0.2 * cm))
story.append(Paragraph("Para ver mas detalle, en el panel hay una seccion <b>Cumplimiento Legal y Ciberseguridad</b>.", body))
story.append(PageBreak())

# 11
story.append(Paragraph("11. Preguntas frecuentes", h1))
faqs = [
    ("Por que a veces no aparecen alertas?", "Si no hay alertas, las fuentes oficiales no han emitido nada. El panel no inventa alertas. Si no hay nada, es buena señal: no hay emergencias activas."),
    ("Por que aparecen 0 incendios?", "Porque no hay incendios hoy en Viña del Mar. El panel solo muestra emergencias reales de hoy."),
    ("Por que las mareas no aparecen como alertas?", "Las mareas son datos normales que se repiten todos los dias. No son emergencias. El SHOA las publica como tablas, no como alertas."),
    ("Que hago si la pagina se queda cargando?", "Espere 30 segundos. Si sigue, cierre y vuelva a abrir. Si persiste, espere unos minutos."),
    ("Puedo usar el panel en mi celular?", "Si. Se ajusta al tamano de la pantalla. Se puede instalar como aplicacion."),
    ("Mis datos personales estan seguros?", "Si. Cumple con la Ley 19.628. Las fichas FIBER solo las ven personas autorizadas. Toda accion se registra en auditoria."),
]
for p, r in faqs:
    story.append(Paragraph(f"<b>{p}</b>", h3))
    story.append(Paragraph(r, body))
    story.append(Spacer(1, 0.15 * cm))

# Cierre
story.append(Spacer(1, 0.5 * cm))
story.append(Paragraph("<b>VeltrixIntegra | Ecosistema Digital 360</b>", h2))
story.append(Paragraph("Las Acacias 450 poniente paradero 12, Villa Alemana | +56 9 9619 4440 | claudio.urbina@vtr.net | Claudio Urbina Vargas, Fundador", note))

# ---------------------------------------------------------------------------
# Generar PDF — portada en pagina 1, contenido desde pagina 2
# ---------------------------------------------------------------------------
doc = SimpleDocTemplate(OUTPUT, pagesize=A4, leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
    title="Instructivo COEP Viña | VeltrixIntegra",
    author="Claudio Urbina Vargas - VeltrixIntegra",
    subject="Guia de uso del panel de emergencias COEP Viña",
    creator="VeltrixIntegra Ecosistema Digital 360")

# La portada se dibuja en onFirstPage. El PageBreak al inicio del story
# hace que el contenido empiece en pagina 2, sin superponerse.
doc.build(story, onFirstPage=dibujar_portada, onLaterPages=dibujar_encabezado)

print(f"PDF generado: {OUTPUT}")
print(f"Tamano: {os.path.getsize(OUTPUT) / 1024:.1f} KB")
