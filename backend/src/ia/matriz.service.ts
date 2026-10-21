import { Injectable, Logger } from '@nestjs/common';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { CapturaService, EvaluacionCaptura } from './captura.service';
import { SIGNIFICADO_SEVERIDAD_NIELSEN } from './prompts';

// Matriz de evaluacion heuristica en Word (GET /ia/matriz/:id): la misma
// tabla que se ve en /evaluacion-captura, en A4 horizontal.

const FUENTE = 'Arial';
// A4 horizontal menos 2 cm de margen por lado, en twips (1 cm = 567).
const ANCHO_UTIL = 16838 - 2 * 1134;
// #, Heuristica, Severidad, Problema, Donde, Recomendacion
const COLUMNAS = [500, 2400, 1500, 4000, 2300, ANCHO_UTIL - 10700];

const ETIQUETAS: [string, string][] = [
  ['4', 'Catastróficos'],
  ['3', 'Mayores'],
  ['2', 'Menores'],
  ['1', 'Cosméticos'],
];

// Mismos colores que los chips de severidad de la pantalla.
const COLOR_SEVERIDAD: Record<number, { fondo: string; texto: string }> = {
  4: { fondo: '7F1D1D', texto: 'FFFFFF' },
  3: { fondo: 'FEE2E2', texto: '991B1B' },
  2: { fondo: 'FEF3C7', texto: '92400E' },
  1: { fondo: 'E5E7EB', texto: '374151' },
};

const BORDE = { style: BorderStyle.SINGLE, size: 4, color: 'BFC5CF' };
const BORDES = { top: BORDE, bottom: BORDE, left: BORDE, right: BORDE };

function texto(t: string, o: { negrita?: boolean; color?: string; tam?: number } = {}) {
  return new TextRun({
    text: t,
    font: FUENTE,
    bold: o.negrita,
    color: o.color,
    size: o.tam ?? 18,
  });
}

function celda(
  contenido: string | TextRun[],
  ancho: number,
  o: { fondo?: string; color?: string; negrita?: boolean; centro?: boolean } = {},
) {
  return new TableCell({
    width: { size: ancho, type: WidthType.DXA },
    borders: BORDES,
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    shading: o.fondo
      ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fondo }
      : undefined,
    children: [
      new Paragraph({
        alignment: o.centro ? AlignmentType.CENTER : AlignmentType.LEFT,
        children:
          typeof contenido === 'string'
            ? [texto(contenido, { negrita: o.negrita, color: o.color })]
            : contenido,
      }),
    ],
  });
}

@Injectable()
export class MatrizService {
  private readonly log = new Logger('IA');

  constructor(private readonly captura: CapturaService) {}

  async generarWord(id: string): Promise<{ archivo: string; contenido: Buffer }> {
    const r = await this.captura.buscar(id);
    const doc = new Document({
      creator: 'Usability Test Dashboard 2.0',
      title: `Matriz de evaluación heurística - ${r.archivo}`,
      styles: { default: { document: { run: { font: FUENTE, size: 20 } } } },
      sections: [
        {
          properties: {
            page: {
              size: { orientation: PageOrientation.LANDSCAPE },
              margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
            },
          },
          children: [
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 120 },
              children: [texto('Matriz de evaluación heurística', { negrita: true, tam: 32, color: '1F3864' })],
            }),
            new Paragraph({
              spacing: { after: 60 },
              children: [texto('Captura: ', { negrita: true, tam: 20 }), texto(r.archivo, { tam: 20 })],
            }),
            new Paragraph({
              spacing: { after: 60 },
              children: [texto('Pantalla: ', { negrita: true, tam: 20 }), texto(r.pantalla, { tam: 20 })],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                texto('Evaluación: ', { negrita: true, tam: 20 }),
                texto(
                  // "9:50 a. m." ya termina en punto.
                  `10 heurísticas de Nielsen con Gemini (${r.modelo}), ${fecha(r.generadoEn)}`.replace(/\.?$/, '.'),
                  { tam: 20 },
                ),
              ],
            }),
            new Paragraph({ spacing: { after: 200 }, children: [texto(r.resumen, { tam: 20 })] }),
            this.tablaResumen(r),
            new Paragraph({ spacing: { after: 200 }, children: [] }),
            this.tablaHallazgos(r),
            new Paragraph({
              spacing: { before: 200, after: 60 },
              children: [texto('Escala de severidad de Nielsen', { negrita: true, tam: 18 })],
            }),
            ...SIGNIFICADO_SEVERIDAD_NIELSEN.slice(1).map(
              (s, i) => new Paragraph({ children: [texto(`${i + 1} = ${s}`, { tam: 16 })] }),
            ),
            new Paragraph({
              spacing: { before: 160 },
              children: [
                texto(
                  'Evaluación automática a partir de una imagen: revisar cada hallazgo antes de usarlo en el diagnóstico.',
                  { tam: 16, color: '4B5563' },
                ),
              ],
            }),
          ],
        },
      ],
    });

    const contenido = await Packer.toBuffer(doc);
    const base = r.archivo.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 60) || 'captura';
    this.log.log(`GET /ia/matriz/${id} -> Word (${r.totalHallazgos} hallazgos, ${r.archivo})`);
    return { archivo: `matriz-heuristica-${base}.docx`, contenido };
  }

  private tablaResumen(r: EvaluacionCaptura) {
    const ancho = Math.floor(ANCHO_UTIL / 5);
    const cabecera = new TableRow({
      tableHeader: true,
      children: [
        ...ETIQUETAS.map(([n, e]) =>
          celda(`${e} (${n})`, ancho, { fondo: '1F3864', color: 'FFFFFF', negrita: true, centro: true }),
        ),
        celda('Total', ancho, { fondo: '1F3864', color: 'FFFFFF', negrita: true, centro: true }),
      ],
    });
    const valores = new TableRow({
      children: [
        ...ETIQUETAS.map(([n]) => {
          const c = r.porSeveridad[n as '1'];
          const color = COLOR_SEVERIDAD[Number(n)];
          return celda(String(c), ancho, {
            fondo: c ? color.fondo : undefined,
            color: c ? color.texto : undefined,
            negrita: true,
            centro: true,
          });
        }),
        celda(String(r.totalHallazgos), ancho, { negrita: true, centro: true }),
      ],
    });
    return new Table({
      width: { size: ancho * 5, type: WidthType.DXA },
      columnWidths: Array(5).fill(ancho),
      rows: [cabecera, valores],
    });
  }

  private tablaHallazgos(r: EvaluacionCaptura) {
    const titulos = ['#', 'Heurística', 'Severidad', 'Problema', 'Dónde', 'Recomendación'];
    const cabecera = new TableRow({
      tableHeader: true,
      children: titulos.map((t, i) =>
        celda(t, COLUMNAS[i], { fondo: '1F3864', color: 'FFFFFF', negrita: true }),
      ),
    });
    let n = 0;
    const filas = r.grupos.flatMap((g) =>
      g.hallazgos.map((h) => {
        n++;
        const color = COLOR_SEVERIDAD[h.severidad];
        return new TableRow({
          cantSplit: true,
          children: [
            celda(String(n), COLUMNAS[0], { centro: true }),
            celda([texto(`${g.heuristica} `, { negrita: true }), texto(g.nombre)], COLUMNAS[1]),
            celda(`${h.severidad} · ${h.etiquetaSeveridad}`, COLUMNAS[2], {
              fondo: color.fondo,
              color: color.texto,
              negrita: true,
            }),
            celda([texto(`${h.titulo}. `, { negrita: true }), texto(h.problema)], COLUMNAS[3]),
            celda(h.ubicacion, COLUMNAS[4]),
            celda(h.recomendacion, COLUMNAS[5]),
          ],
        });
      }),
    );
    if (!filas.length) {
      filas.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: COLUMNAS.length,
              borders: BORDES,
              children: [new Paragraph({ children: [texto('Sin hallazgos visibles en la captura.')] })],
            }),
          ],
        }),
      );
    }
    return new Table({
      width: { size: ANCHO_UTIL, type: WidthType.DXA },
      columnWidths: COLUMNAS,
      rows: [cabecera, ...filas],
    });
  }
}

function fecha(iso: string) {
  return new Date(iso).toLocaleString('es-EC', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}
