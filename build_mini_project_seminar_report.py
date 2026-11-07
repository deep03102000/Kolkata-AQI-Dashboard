from __future__ import annotations

import datetime as dt
import os
import re
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(r'D:\Applications\kolkata-aqi-dashboard')
SOURCE = ROOT / 'docs' / 'mini_project_seminar_report.md'
OUTPUT = ROOT / 'Kolkata_AQI_Mini_Project_Seminar_Report.docx'

W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
CP_NS = 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties'
DC_NS = 'http://purl.org/dc/elements/1.1/'
DCTERMS_NS = 'http://purl.org/dc/terms/'
DCTYPE_NS = 'http://purl.org/dc/dcmitype/'
XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance'
PKG_NS = 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties'


def xml_doc(text: str) -> str:
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + text


def ppr(align: str | None = None, spacing_before: int | None = None, spacing_after: int | None = None, line: int | None = None, indent_left: int | None = None, indent_hanging: int | None = None) -> str:
    parts = ['<w:pPr>']
    if align:
        parts.append(f'<w:jc w:val="{align}"/>')
    if spacing_before is not None or spacing_after is not None or line is not None:
        attrs = []
        if spacing_before is not None:
            attrs.append(f'w:before="{spacing_before}"')
        if spacing_after is not None:
            attrs.append(f'w:after="{spacing_after}"')
        if line is not None:
            attrs.append(f'w:line="{line}"')
            attrs.append('w:lineRule="auto"')
        parts.append('<w:spacing ' + ' '.join(attrs) + '/>')
    if indent_left is not None or indent_hanging is not None:
        attrs = []
        if indent_left is not None:
            attrs.append(f'w:left="{indent_left}"')
        if indent_hanging is not None:
            attrs.append(f'w:hanging="{indent_hanging}"')
        parts.append('<w:ind ' + ' '.join(attrs) + '/>')
    parts.append('</w:pPr>')
    return ''.join(parts)


def run(text: str, size: int = 22, bold: bool = False, italic: bool = False, color: str | None = None) -> str:
    parts = [
        '<w:r>',
        '<w:rPr>',
        '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>',
        f'<w:sz w:val="{size}"/>',
        f'<w:szCs w:val="{size}"/>',
    ]
    if bold:
        parts.append('<w:b/>')
    if italic:
        parts.append('<w:i/>')
    if color:
        parts.append(f'<w:color w:val="{color}"/>')
    parts.extend(['</w:rPr>', f'<w:t xml:space="preserve">{escape(text)}</w:t>', '</w:r>'])
    return ''.join(parts)


def paragraph(text: str = '', *, align: str | None = None, size: int = 22, bold: bool = False, italic: bool = False, spacing_before: int | None = None, spacing_after: int | None = 120, line: int | None = 276, indent_left: int | None = None, indent_hanging: int | None = None, color: str | None = None) -> str:
    if text == '[[PAGE_BREAK]]':
        return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
    return f'<w:p>{ppr(align=align, spacing_before=spacing_before, spacing_after=spacing_after, line=line, indent_left=indent_left, indent_hanging=indent_hanging)}{run(text, size=size, bold=bold, italic=italic, color=color)}</w:p>'


def heading(text: str, level: int = 2) -> str:
    if level == 1:
        return paragraph(text, align='center', size=28, bold=True, spacing_before=240, spacing_after=180, line=300)
    if level == 2:
        return paragraph(text, align='left', size=32, bold=True, spacing_before=240, spacing_after=120, line=280)
    return paragraph(text, align='left', size=26, bold=True, spacing_before=180, spacing_after=90, line=260)


def normal(text: str, *, align: str | None = None, indent_left: int | None = None, hanging: int | None = None) -> str:
    return paragraph(text, align=align, size=22, spacing_after=120, line=276, indent_left=indent_left, indent_hanging=hanging)


def build_document_xml(items: list[dict[str, str]]) -> str:
    body_parts: list[str] = []
    first_section_seen = False
    cover_mode = True
    buffer: list[str] = []

    def flush_buffer(centered: bool = False) -> None:
        nonlocal buffer
        if not buffer:
            return
        text = ' '.join(s.strip() for s in buffer if s.strip())
        if text:
            body_parts.append(normal(text, align='center' if centered else None))
        buffer = []

    for item in items:
        kind = item['kind']
        text = item['text']
        if kind == 'title':
            body_parts.append(heading(text, level=1))
            continue
        if kind == 'cover':
            if text.strip():
                body_parts.append(normal(text.strip(), align='center'))
            continue
        if kind == 'section':
            flush_buffer(centered=False)
            body_parts.append(paragraph('[[PAGE_BREAK]]'))
            body_parts.append(heading(text, level=2))
            first_section_seen = True
            cover_mode = False
            continue
        if kind == 'subsection':
            flush_buffer(centered=False)
            body_parts.append(heading(text, level=3))
            continue
        if kind == 'bullet':
            flush_buffer(centered=False)
            body_parts.append(normal(text, indent_left=720, hanging=360))
            continue
        if kind == 'blank':
            flush_buffer(centered=cover_mode)
            continue
        # paragraph text
        if cover_mode:
            buffer.append(text)
        else:
            buffer.append(text)

    flush_buffer(centered=False)

    sect_pr = (
        '<w:sectPr>'
        '<w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>'
        '</w:sectPr>'
    )

    document = (
        f'<w:document xmlns:w="{W_NS}">' 
        '<w:body>'
        + ''.join(body_parts)
        + sect_pr
        + '</w:body></w:document>'
    )
    return xml_doc(document)


def parse_markdown(path: Path) -> list[dict[str, str]]:
    lines = path.read_text(encoding='utf-8').splitlines()
    items: list[dict[str, str]] = []
    first_heading_seen = False
    cover_mode = True
    paragraph_buffer: list[str] = []

    def flush_paragraph() -> None:
        nonlocal paragraph_buffer
        if not paragraph_buffer:
            return
        text = ' '.join(part.strip() for part in paragraph_buffer if part.strip())
        if text:
            items.append({'kind': 'cover' if cover_mode else 'paragraph', 'text': text})
        paragraph_buffer = []

    for raw in lines:
        line = raw.rstrip()
        if line.startswith('# '):
            flush_paragraph()
            items.append({'kind': 'title', 'text': line[2:].strip()})
            continue
        if line.startswith('## '):
            flush_paragraph()
            cover_mode = False
            items.append({'kind': 'section', 'text': line[3:].strip()})
            first_heading_seen = True
            continue
        if line.startswith('### '):
            flush_paragraph()
            cover_mode = False
            items.append({'kind': 'subsection', 'text': line[4:].strip()})
            continue
        if not line.strip():
            flush_paragraph()
            items.append({'kind': 'blank', 'text': ''})
            continue
        if line.startswith('- '):
            flush_paragraph()
            items.append({'kind': 'bullet', 'text': line[2:].strip()})
            continue
        paragraph_buffer.append(line)

    flush_paragraph()
    return items


def content_types_xml() -> str:
    return xml_doc(
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
        '</Types>'
    )


def rels_xml() -> str:
    return xml_doc(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
        '</Relationships>'
    )


def document_rels_xml() -> str:
    return xml_doc('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>')


def styles_xml() -> str:
    return xml_doc(
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">'
        '<w:name w:val="Normal"/>'
        '<w:qFormat/>'
        '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>'
        '</w:style>'
        '</w:styles>'
    )


def core_props_xml() -> str:
    now = dt.datetime.utcnow().replace(microsecond=0).isoformat() + 'Z'
    return xml_doc(
        f'<cp:coreProperties xmlns:cp="{CP_NS}" xmlns:dc="{DC_NS}" xmlns:dcterms="{DCTERMS_NS}" xmlns:dcmitype="{DCTYPE_NS}" xmlns:xsi="{XSI_NS}">'
        '<dc:title>Kolkata AQI Dashboard Mini Project Seminar Report</dc:title>'
        '<dc:subject>Mini Project Seminar Report</dc:subject>'
        '<dc:creator>Codex</dc:creator>'
        '<cp:keywords>Kolkata AQI Dashboard, React, Leaflet, WAQI, Voronoi, Spatial Analysis</cp:keywords>'
        '<dc:description>Mini project seminar report for the Kolkata AQI Dashboard.</dc:description>'
        '<cp:lastModifiedBy>Codex</cp:lastModifiedBy>'
        f'<dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>'
        f'<dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>'
        '</cp:coreProperties>'
    )


def app_xml() -> str:
    return xml_doc(
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
        '<Application>Microsoft Office Word</Application>'
        '<DocSecurity>0</DocSecurity>'
        '<ScaleCrop>false</ScaleCrop>'
        '<HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Document</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs>'
        '<TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>Kolkata AQI Dashboard Mini Project Seminar Report</vt:lpstr></vt:vector></TitlesOfParts>'
        '<Company></Company>'
        '<LinksUpToDate>false</LinksUpToDate>'
        '<SharedDoc>false</SharedDoc>'
        '<HyperlinksChanged>false</HyperlinksChanged>'
        '<AppVersion>16.0000</AppVersion>'
        '</Properties>'
    )


def build_docx(source: Path, output: Path) -> None:
    items = parse_markdown(source)
    document_xml = build_document_xml(items)

    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('[Content_Types].xml', content_types_xml())
        zf.writestr('_rels/.rels', rels_xml())
        zf.writestr('word/document.xml', document_xml)
        zf.writestr('word/_rels/document.xml.rels', document_rels_xml())
        zf.writestr('word/styles.xml', styles_xml())
        zf.writestr('docProps/core.xml', core_props_xml())
        zf.writestr('docProps/app.xml', app_xml())


if __name__ == '__main__':
    build_docx(SOURCE, OUTPUT)
    print(f'Wrote {OUTPUT}')
