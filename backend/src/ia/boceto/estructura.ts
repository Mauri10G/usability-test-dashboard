import sharp from 'sharp';

// Estructura de la pantalla para redibujarla como wireframe: una lista de
// componentes de primer nivel (menu, graficos, tablas, pie de pagina...)
// con su recuadro. Sale de Gemini (que "lee" la captura) o, si Gemini no
// responde, de los pixeles de la captura (bloques que se distinguen del
// fondo).

export const TIPOS_COMPONENTE = [
  'encabezado',
  'menu_lateral',
  'menu_superior',
  'grafico',
  'tabla',
  'tarjeta_kpi',
  'texto',
  'lista',
  'formulario',
  'buscador',
  'boton',
  'imagen',
  'pie_de_pagina',
  'otro',
] as const;
export type TipoComponente = (typeof TIPOS_COMPONENTE)[number];

export const FORMAS_GRAFICO = ['barras', 'lineas', 'area', 'torta', 'dispersion'] as const;
export type FormaGrafico = (typeof FORMAS_GRAFICO)[number];

export interface GraficoLeido {
  forma: FormaGrafico;
  es3d: boolean;
  series: string[];
  valores: number[];
  // Numeros tal como se ven (por ejemplo "85.49 %"), para redondearlos.
  etiquetas: string[];
  puntos: number;
  ejeX: string[];
}

export interface Componente {
  id: number;
  tipo: TipoComponente;
  // [ymin, xmin, ymax, xmax] de 0 a 1000.
  caja: [number, number, number, number];
  titulo: string;
  textos: string[];
  grafico?: GraficoLeido;
  columnas?: string[];
  filas?: number;
  // Tono del fondo en la captura (0 negro .. 255 blanco) y saturacion
  // (0 gris .. 1 color puro); los calcula el servidor.
  luminancia?: number;
  saturacion?: number;
  // Componentes creados a partir del recuadro de un hallazgo (modo sin
  // Gemini): tienen prioridad al resolver superposiciones.
  prioridad?: boolean;
}

export interface Estructura {
  origen: 'gemini' | 'captura';
  modelo?: string;
  fondoPagina: 'claro' | 'oscuro';
  componentes: Componente[];
}

// ---- Pedido a Gemini ----

export function instruccionesEstructura(): string {
  return `Eres un diseñador de interfaces que convierte capturas de pantalla en wireframes. Responde solo con el JSON pedido.

Describe la ESTRUCTURA de la captura para poder redibujarla como wireframe:
- "componentes": las regiones de primer nivel de la pantalla, de 3 a 25: encabezado, menú lateral, menú superior, cada gráfico, cada tabla, cada tarjeta de indicador (KPI), bloques de texto, listas, formularios, buscador, botones sueltos, imágenes y pie de página.
- "caja": [ymin, xmin, ymax, xmax] normalizado de 0 a 1000. Las cajas NO deben superponerse ni contenerse entre sí: un menú es UNA caja con sus opciones en "textos"; un gráfico es UNA caja que incluye su título y su leyenda.
- "titulo": el título visible del componente (vacío si no tiene).
- "textos": los textos visibles en orden de lectura, sin inventar (opciones del menú, etiquetas, contenido del pie de página). Máximo 18.
- "grafico" (solo si tipo = grafico): "forma" (barras, lineas, area, torta o dispersion), "es3d" (si se dibuja con efecto 3D o perspectiva), "series" (nombres de la leyenda, tal como se leen), "valores" (de 6 a 12 valores aproximados y representativos de la primera serie, de izquierda a derecha; en una torta, el valor de cada porción), "etiquetas" (los números visibles tal como aparecen, por ejemplo "85.49 %" o "95,473.95"), "puntos" (cuántos datos aproximados hay en el eje X) y "ejeX" (hasta 6 rótulos del eje X tal como se leen).
- "columnas" y "filas" (solo si tipo = tabla).
- "fondoPagina": "claro" u "oscuro".`;
}

export function esquemaEstructura(): Record<string, unknown> {
  const lista = { type: 'ARRAY', items: { type: 'STRING' } };
  return {
    type: 'OBJECT',
    properties: {
      fondoPagina: { type: 'STRING', enum: ['claro', 'oscuro'] },
      componentes: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            tipo: { type: 'STRING', enum: [...TIPOS_COMPONENTE] },
            caja: { type: 'ARRAY', items: { type: 'INTEGER' }, minItems: 4, maxItems: 4 },
            titulo: { type: 'STRING' },
            textos: lista,
            grafico: {
              type: 'OBJECT',
              nullable: true,
              properties: {
                forma: { type: 'STRING', enum: [...FORMAS_GRAFICO] },
                es3d: { type: 'BOOLEAN' },
                series: lista,
                valores: { type: 'ARRAY', items: { type: 'NUMBER' } },
                etiquetas: lista,
                puntos: { type: 'INTEGER' },
                ejeX: lista,
              },
              required: ['forma', 'es3d', 'series', 'valores'],
            },
            columnas: lista,
            filas: { type: 'INTEGER' },
          },
          required: ['tipo', 'caja', 'titulo', 'textos'],
        },
      },
    },
    required: ['fondoPagina', 'componentes'],
  };
}

const texto = (v: unknown, max = 120) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const textos = (v: unknown, max: number) =>
  (Array.isArray(v) ? v : []).map((t) => texto(t)).filter(Boolean).slice(0, max);

export function cajaValida(c: unknown): [number, number, number, number] | undefined {
  if (!Array.isArray(c) || c.length !== 4) return undefined;
  const [y0, x0, y1, x1] = c.map((v) => Math.min(1000, Math.max(0, Math.round(Number(v)))));
  if (![y0, x0, y1, x1].every(Number.isFinite)) return undefined;
  if (y1 - y0 < 15 || x1 - x0 < 15) return undefined;
  return [y0, x0, y1, x1];
}

// Limpia lo que devuelve Gemini: tipos y cajas validos, listas cortas.
export function normalizarEstructura(datos: any, modelo: string): Estructura {
  const componentes: Componente[] = [];
  for (const c of Array.isArray(datos?.componentes) ? datos.componentes : []) {
    const caja = cajaValida(c?.caja);
    if (!caja) continue;
    const tipo: TipoComponente = TIPOS_COMPONENTE.includes(c.tipo) ? c.tipo : 'otro';
    const comp: Componente = {
      id: componentes.length,
      tipo,
      caja,
      titulo: texto(c.titulo),
      textos: textos(c.textos, 18),
    };
    if (tipo === 'grafico') {
      const g = c.grafico ?? {};
      comp.grafico = {
        forma: FORMAS_GRAFICO.includes(g.forma) ? g.forma : 'barras',
        es3d: Boolean(g.es3d),
        series: textos(g.series, 4),
        valores: (Array.isArray(g.valores) ? g.valores : [])
          .map(Number)
          .filter((v: number) => Number.isFinite(v))
          .slice(0, 16),
        etiquetas: textos(g.etiquetas, 8),
        puntos: Math.min(400, Math.max(0, Math.round(Number(g.puntos) || 0))),
        ejeX: textos(g.ejeX, 6),
      };
    }
    if (tipo === 'tabla') {
      comp.columnas = textos(c.columnas, 8);
      comp.filas = Math.min(30, Math.max(1, Math.round(Number(c.filas) || 4)));
    }
    componentes.push(comp);
    if (componentes.length >= 30) break;
  }
  return {
    origen: 'gemini',
    modelo,
    fondoPagina: datos?.fondoPagina === 'oscuro' ? 'oscuro' : 'claro',
    componentes,
  };
}

// ---- Tono de cada componente en la captura ----

export interface MuestraColor {
  ancho: number;
  alto: number;
  rgb: Buffer;
}

export async function muestrear(imagen: Buffer): Promise<MuestraColor> {
  const { data, info } = await sharp(imagen)
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize({ width: 320, withoutEnlargement: false })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { ancho: info.width, alto: info.height, rgb: data };
}

// Luminancia mas comun de la captura: el fondo de la pagina.
export function fondoMedido(m: MuestraColor): number {
  const histo = new Array(64).fill(0);
  for (let i = 0; i < m.ancho * m.alto; i++) {
    const lum = 0.299 * m.rgb[i * 3] + 0.587 * m.rgb[i * 3 + 1] + 0.114 * m.rgb[i * 3 + 2];
    histo[Math.floor(lum / 4)]++;
  }
  return histo.indexOf(Math.max(...histo)) * 4 + 2;
}

export function tonoDeCaja(m: MuestraColor, caja: [number, number, number, number]) {
  const [y0, x0, y1, x1] = caja;
  const ya = Math.floor((y0 / 1000) * m.alto);
  const yb = Math.max(ya + 1, Math.floor((y1 / 1000) * m.alto));
  const xa = Math.floor((x0 / 1000) * m.ancho);
  const xb = Math.max(xa + 1, Math.floor((x1 / 1000) * m.ancho));
  let lum = 0;
  let sat = 0;
  let n = 0;
  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      const i = (y * m.ancho + x) * 3;
      const r = m.rgb[i];
      const g = m.rgb[i + 1];
      const b = m.rgb[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      lum += 0.299 * r + 0.587 * g + 0.114 * b;
      sat += max === 0 ? 0 : (max - min) / max;
      n++;
    }
  }
  return { luminancia: n ? lum / n : 255, saturacion: n ? sat / n : 0 };
}

// ---- Estructura sin Gemini: bloques que se distinguen del fondo ----

export function estructuraPorPixeles(m: MuestraColor): Estructura {
  const { ancho: W, alto: H, rgb } = m;
  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    lum[i] = 0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2];
  }
  // Fondo: el tono mas comun de toda la imagen. La tolerancia es baja para
  // separar tarjetas blancas de un fondo gris claro.
  const histo = new Array(128).fill(0);
  for (let i = 0; i < W * H; i++) histo[Math.floor(lum[i] / 2)]++;
  const fondo = histo.indexOf(Math.max(...histo)) * 2 + 1;

  const marca = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (Math.abs(lum[i] - fondo) > 5) marca[i] = 1;
  // Se une lo cercano para que cada panel quede como un solo bloque.
  const unido = new Uint8Array(W * H);
  const r = 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!marca[y * W + x]) continue;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < W) unido[yy * W + xx] = 1;
        }
      }
    }
  }
  // Componentes conexos.
  const visto = new Uint8Array(W * H);
  const cajas: [number, number, number, number][] = [];
  const pila: number[] = [];
  for (let i = 0; i < W * H; i++) {
    if (!unido[i] || visto[i]) continue;
    let y0 = H, x0 = W, y1 = 0, x1 = 0, n = 0;
    pila.push(i);
    visto[i] = 1;
    while (pila.length) {
      const p = pila.pop()!;
      const y = Math.floor(p / W);
      const x = p % W;
      n++;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      for (const q of [p - 1, p + 1, p - W, p + W]) {
        if (q < 0 || q >= W * H || visto[q] || !unido[q]) continue;
        if ((q === p - 1 && x === 0) || (q === p + 1 && x === W - 1)) continue;
        visto[q] = 1;
        pila.push(q);
      }
    }
    if ((x1 - x0) * (y1 - y0) < W * H * 0.006 || n < 30) continue;
    cajas.push([
      Math.round((y0 / H) * 1000),
      Math.round((x0 / W) * 1000),
      Math.round(((y1 + 1) / H) * 1000),
      Math.round(((x1 + 1) / W) * 1000),
    ]);
  }
  return {
    origen: 'captura',
    fondoPagina: fondo < 110 ? 'oscuro' : 'claro',
    componentes: cajas.slice(0, 30).map((caja, id) => ({
      id,
      tipo: 'otro' as TipoComponente,
      caja,
      titulo: '',
      textos: [],
    })),
  };
}
