#!/usr/bin/env python3
"""
Generador del Contrato COEP Viña - Formato profesional
- Icono en el encabezado de cada hoja
- Logo como marca de agua
- Formato VeltrixIntegra | Ecosistema Digital 360
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

OUTPUT = "/home/z/my-project/download/Contrato_Prestacion_Servicios_COEP_Vina.pdf"
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

def onPage(canvas_obj, doc):
    canvas_obj.saveState()

    if os.path.exists(LOGO):
        try:
            wm_w = PAGE_W * 0.60
            wm_h = wm_w / 4
            canvas_obj.saveState()
            canvas_obj.setFillAlpha(0.06)
            canvas_obj.drawImage(LOGO, (PAGE_W - wm_w) / 2, (PAGE_H - wm_h) / 2, wm_w, wm_h, mask='auto', preserveAspectRatio=True)
            canvas_obj.restoreState()
        except: pass

    canvas_obj.setFillColor(AZUL)
    canvas_obj.rect(0, PAGE_H - 2.0 * cm, PAGE_W, 0.08 * cm, fill=1, stroke=0)

    icon_size = 1.2 * cm
    icon_y = PAGE_H - 1.8 * cm
    if os.path.exists(ICONO):
        try:
            canvas_obj.drawImage(ICONO, ML, icon_y - 0.1 * cm, icon_size, icon_size, mask='auto', preserveAspectRatio=True)
        except: pass

    canvas_obj.setFillColor(AZUL)
    canvas_obj.setFont('Helvetica-Bold', 10)
    canvas_obj.drawString(ML + icon_size + 0.4 * cm, icon_y + 0.3 * cm, "VeltrixIntegra | Ecosistema Digital 360")
    canvas_obj.setFillColor(HexColor('#555555'))
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.drawString(ML + icon_size + 0.4 * cm, icon_y - 0.1 * cm, "COEP Viña | Contrato de Prestación de Servicios Tecnológicos")

    canvas_obj.setStrokeColor(ARENA)
    canvas_obj.setLineWidth(1.5)
    canvas_obj.line(ML, PAGE_H - 2.1 * cm, PAGE_W - MR, PAGE_H - 2.1 * cm)

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

def onPortada(canvas_obj, doc):
    canvas_obj.saveState()

    canvas_obj.setFillColor(AZUL)
    canvas_obj.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    if os.path.exists(LOGO):
        try:
            wm_w = PAGE_W * 0.50
            wm_h = wm_w / 4
            canvas_obj.saveState()
            canvas_obj.setFillAlpha(0.12)
            canvas_obj.drawImage(LOGO, (PAGE_W - wm_w) / 2, PAGE_H * 0.25, wm_w, wm_h, mask='auto', preserveAspectRatio=True)
            canvas_obj.restoreState()
        except: pass

    if os.path.exists(ICONO):
        try:
            ico_size = 4 * cm
            canvas_obj.drawImage(ICONO, PAGE_W/2 - ico_size/2, PAGE_H * 0.74, ico_size, ico_size, mask='auto', preserveAspectRatio=True)
        except: pass

    canvas_obj.setFillColor(ARENA)
    canvas_obj.rect(PAGE_W * 0.2, PAGE_H * 0.69, PAGE_W * 0.6, 0.12 * cm, fill=1, stroke=0)

    canvas_obj.setFillColor(BLANCO)
    canvas_obj.setFont('Helvetica-Bold', 22)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.63, "Contrato de Prestación")
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.58, "de Servicios Tecnológicos")

    canvas_obj.setFillColor(ARENA)
    canvas_obj.setFont('Helvetica', 12)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.52, "COEP Viña · Centro de Operaciones de Emergencia Provincial")
    canvas_obj.setFont('Helvetica', 11)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.48, "VeltrixIntegra Ecosistema Digital 360°")

    canvas_obj.setFillColor(HexColor('#0d2a44'))
    canvas_obj.roundRect(PAGE_W * 0.12, PAGE_H * 0.30, PAGE_W * 0.76, 2.2 * cm, 10, fill=1, stroke=0)
    canvas_obj.setFillColor(BLANCO)
    canvas_obj.setFont('Helvetica-Bold', 12)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.38, "Fecha: 24 de octubre de 2026")
    canvas_obj.setFillColor(ARENA_C)
    canvas_obj.setFont('Helvetica-Oblique', 10)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.34, "Viña del Mar, Región de Valparaíso, Chile")

    canvas_obj.setFillColor(BLANCO)
    canvas_obj.setFont('Helvetica-Bold', 10)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.20, "Claudio Urbina Vargas")
    canvas_obj.setFont('Helvetica', 9)
    canvas_obj.setFillColor(ARENA_C)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.17, "Las Acacias 450 poniente paradero 12, Villa Alemana")
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.14, "+56 9 9619 4440 | claudio.urbina@vtr.net")

    canvas_obj.setFillColor(ARENA)
    canvas_obj.setFont('Helvetica-Bold', 16)
    canvas_obj.drawCentredString(PAGE_W / 2, PAGE_H * 0.08, "2026")

    canvas_obj.restoreState()

styles = getSampleStyleSheet()

h1 = ParagraphStyle('H1', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=15, textColor=AZUL, spaceBefore=18, spaceAfter=10, leading=19)
h2 = ParagraphStyle('H2', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=11, textColor=AZUL_M, spaceBefore=12, spaceAfter=5, leading=14)
body = ParagraphStyle('Body', parent=styles['Normal'], fontName='Helvetica', fontSize=10.5, textColor=GRIS_O, leading=16, alignment=TA_JUSTIFY, spaceAfter=8)
body_center = ParagraphStyle('BodyCenter', parent=body, alignment=TA_CENTER)

story = []

story.append(Paragraph("Contratantes", h1))
story.append(Paragraph(
    "Con fecha <b>24 de octubre de 2026</b>, en la comuna de <b>Viña del Mar, Chile</b>, "
    "se celebra el presente contrato de prestación de servicios entre <b>EL PROVEEDOR</b>, "
    "correspondiente a VeltrixIntegra Ecosistema Digital 360°, y <b>EL CLIENTE</b>, "
    "representado por el Centro de Operaciones de Emergencia Provincial (COEP Viña). "
    "Ambas partes acuerdan de manera libre y voluntaria los términos y condiciones "
    "estipulados en las siguientes cláusulas.", body))

story.append(Spacer(1, 0.5 * cm))
story.append(Paragraph("Cláusulas", h1))

story.append(Paragraph("PRIMERA: Objeto del Contrato", h2))
story.append(Paragraph(
    "El proveedor se compromete a realizar la implementación, estabilización y "
    "optimización de la plataforma web corporativa <b>COEP Viña</b>. Esto incluye "
    "el desarrollo del pipeline de datos con mapa dinámico y la integración "
    "obligatoria del algoritmo de filtrado estricto por comuna y fecha actual "
    "para evitar la sobrealerta por falsos positivos.", body))

story.append(Paragraph("SEGUNDA: Valor del Desarrollo", h2))
story.append(Paragraph(
    "El precio de mercado neto acordado por el desarrollo completo e implementación "
    "del sistema es de <b>$1.500.000 CLP</b>. Aplicando la rebaja pactada del "
    "<b>15% de descuento</b>, el valor final de venta del desarrollo queda fijado "
    "en un monto único de <b>$1.275.000 CLP</b>, pagadero en un esquema de "
    "<b>50% al inicio</b> y <b>50% contra entrega</b> conforme.", body))

story.append(Paragraph("TERCERA: Plan de Mantención Mensual", h2))
story.append(Paragraph(
    "El costo base regular del servicio técnico y soporte de servidores es de "
    "<b>$100.000 CLP mensuales</b>. En conformidad con los acuerdos comerciales, "
    "se aplicará una rebaja del <b>6% de descuento</b> durante los primeros dos "
    "meses, cobrándose <b>$94.000 CLP</b> para el Mes 1 y Mes 2 respectivamente. "
    "A contar del Mes 3, el valor retornará al precio normal de lista de "
    "<b>$100.000 CLP mensuales</b>.", body))

story.append(Paragraph("CUARTA: Vigencia", h2))
story.append(Paragraph(
    "La mantención contractual tendrá una vigencia mínima renovable de forma "
    "mensual. El cobro de los servicios de soporte técnico se efectuará de "
    "forma anticipada dentro de los primeros <b>5 días hábiles</b> de cada "
    "mes correlativo.", body))

story.append(Spacer(1, 1.5 * cm))
story.append(Paragraph("Firmas", h1))
story.append(Spacer(1, 0.8 * cm))

firma_data = [
    [Paragraph("POR EL PROVEEDOR", ParagraphStyle('F1', parent=body, fontName='Helvetica-Bold', fontSize=10, textColor=AZUL, alignment=TA_CENTER)),
     Paragraph("POR EL CLIENTE", ParagraphStyle('F2', parent=body, fontName='Helvetica-Bold', fontSize=10, textColor=AZUL, alignment=TA_CENTER))],
    [Paragraph("<br/><br/>___________________________<br/><b>VeltrixIntegra Ecosistema Digital 360°</b><br/>Claudio Urbina Vargas<br/>Fundador<br/>+56 9 9619 4440",
        ParagraphStyle('FB1', parent=body, fontSize=9, alignment=TA_CENTER, leading=14)),
     Paragraph("<br/><br/>___________________________<br/><b>COEP Viña</b><br/>Centro de Operaciones de Emergencia Provincial<br/>Municipalidad de Viña del Mar",
        ParagraphStyle('FB2', parent=body, fontSize=9, alignment=TA_CENTER, leading=14))],
]

t_firma = Table(firma_data, colWidths=[CW/2 - 0.5*cm, CW/2 - 0.5*cm])
t_firma.setStyle(TableStyle([
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('TOPPADDING', (0,0), (-1,-1), 20),
    ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ('LEFTPADDING', (0,0), (-1,-1), 20),
    ('RIGHTPADDING', (0,0), (-1,-1), 20),
    ('LINEABOVE', (0,0), (-1,0), 1, AZUL),
    ('LINEBELOW', (0,0), (-1,0), 0.5, GRIS_C),
    ('BACKGROUND', (0,0), (-1,0), HexColor('#f8f8f8')),
]))
story.append(t_firma)

doc = SimpleDocTemplate(OUTPUT, pagesize=A4, leftMargin=ML, rightMargin=MR, topMargin=MT, bottomMargin=MB,
    title="Contrato de Prestación de Servicios Tecnológicos - COEP Viña",
    author="Claudio Urbina Vargas - VeltrixIntegra",
    subject="Contrato COEP Viña - VeltrixIntegra Ecosistema Digital 360",
    creator="VeltrixIntegra Ecosistema Digital 360")

doc.build(story, onFirstPage=onPortada, onLaterPages=onPage)

print(f"PDF generado: {OUTPUT}")
print(f"Tamano: {os.path.getsize(OUTPUT) / 1024:.1f} KB")
