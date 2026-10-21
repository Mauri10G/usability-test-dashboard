import { Ajuste } from './ajustes';
import { Componente, FormaGrafico } from './estructura';
import { anchoTexto, encajar, escapar, FUENTE, partir, r, TAM_MIN, textoSvg } from './texto';

// Dibuja cada componente como wireframe en escala de grises, ya corregido
// segun sus ajustes. Todo el contenido queda dentro de su rectangulo.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Marca {
  n: number;
  severidad: number;
}

// Grises de las series: se distinguen tambien por trazo y textura.
const GRISES = ['#3a3a3a', '#7d7d7d', '#b0b0b0', '#5c5c5c'];
const TRAZOS = ['', '12 6', '4 5', '16 5 4 5'];
const BORDE = '#8a8a8a';
const TEXTO = '#1a1a1a';
const SECUNDARIO = '#4a4a4a';

export const GRIS_SEVERIDAD: Record<number, string> = {
  4: '#111111',
  3: '#2e2e2e',
  2: '#4d4d4d',
  1: '#6b6b6b',
};

export function insignia(cx: number, cy: number, n: number, severidad: number, radio = 17) {
  return (
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${radio}" fill="${GRIS_SEVERIDAD[severidad] ?? '#2e2e2e'}" stroke="#ffffff" stroke-width="3"/>` +
    `<text x="${r(cx)}" y="${r(cy + radio * 0.38)}" text-anchor="middle" font-family="${FUENTE}" font-size="${Math.round(radio * 1.1)}" font-weight="bold" fill="#ffffff">${n}</text>`
  );
}

interface Tono {
  fondo: string;
  texto: string;
  oscuro: boolean;
}

function tonoDe(c: Componente, a: Set<Ajuste>): Tono {
  if (a.has('tonoSuave') || a.has('contraste')) return { fondo: '#ececec', texto: '#111111', oscuro: false };
  const lum = c.luminancia ?? 255;
  if (lum < 105) return { fondo: '#3b3b3b', texto: '#ffffff', oscuro: true };
  if (lum < 175) return { fondo: '#707070', texto: '#ffffff', oscuro: true };
  return { fondo: '#ffffff', texto: TEXTO, oscuro: false };
}

// Numero pseudoaleatorio estable (mismo dibujo en cada corrida).
function azar(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Marco comun: fondo, titulo e insignias ----

const DIAM = 40;

function marco(
  rect: Rect,
  c: Componente,
  a: Set<Ajuste>,
  marcas: Marca[],
  tono: Tono,
  o: { titulo?: string; maxTitulo?: number; boton?: string } = {},
): { svg: string; insignias: string; contenido: Rect } {
  const pad = a.has('espaciado') ? 22 : 14;
  let svg = `<rect x="${r(rect.x)}" y="${r(rect.y)}" width="${r(rect.w)}" height="${r(rect.h)}" rx="8" fill="${tono.fondo}" stroke="${BORDE}" stroke-width="1.5"/>`;
  // Insignias arriba a la derecha, en una o mas filas.
  const porFila = Math.max(1, Math.floor((rect.w - 2 * pad) / DIAM));
  const filas = Math.ceil(marcas.length / porFila);
  let insignias = '';
  marcas.forEach((m, i) => {
    const fila = Math.floor(i / porFila);
    const col = i % porFila;
    insignias += insignia(rect.x + rect.w - pad - DIAM / 2 - col * DIAM, rect.y + pad + DIAM / 2 - 2 + fila * DIAM, m.n, m.severidad);
  });
  let anchoInsignias = marcas.length ? Math.min(marcas.length, porFila) * DIAM + 8 : 0;
  if (o.boton) {
    const tam = TAM_MIN;
    const w = anchoTexto(o.boton, tam, true) + 36;
    const alto = 40;
    const x = rect.x + rect.w - pad - anchoInsignias - w;
    if (x > rect.x + pad + 80) {
      insignias +=
        `<rect x="${r(x)}" y="${r(rect.y + pad)}" width="${r(w)}" height="${alto}" rx="8" fill="#2f2f2f"/>` +
        textoSvg([o.boton], x + w / 2, rect.y + pad + (alto - tam * 1.25) / 2, tam, { negrita: true, ancla: 'middle', color: '#ffffff' });
      anchoInsignias += w + 10;
    }
  }

  const titulo = o.titulo ?? c.titulo;
  let y = rect.y + pad;
  const anchoTitulo = rect.w - 2 * pad - anchoInsignias - (a.has('ayuda') ? 38 : 0);
  if (titulo && anchoTitulo > 60) {
    const max = (o.maxTitulo ?? 24) + (a.has('jerarquia') ? 6 : 0);
    // Hasta dos lineas de titulo a tamano minimo, aunque la caja sea baja.
    const t = encajar(titulo, anchoTitulo, Math.max(rect.h * 0.3, TAM_MIN * 1.25 * 2), {
      max,
      negrita: true,
      maxLineas: 2,
    });
    svg += textoSvg(t.lineas, rect.x + pad, y, t.tam, { negrita: true, color: tono.texto });
    if (a.has('ayuda')) {
      const ax = rect.x + pad + Math.min(anchoTitulo, Math.max(...t.lineas.map((l) => anchoTexto(l, t.tam, true)))) + 22;
      svg +=
        `<circle cx="${r(ax)}" cy="${r(y + t.tam * 0.55)}" r="13" fill="none" stroke="${tono.texto}" stroke-width="2"/>` +
        `<text x="${r(ax)}" y="${r(y + t.tam * 0.55 + 6)}" text-anchor="middle" font-family="${FUENTE}" font-size="18" font-weight="bold" fill="${tono.texto}">?</text>`;
    }
    y += Math.max(t.alto, marcas.length ? filas * DIAM - 4 : 0, o.boton ? 40 : 0) + 10;
  } else if (o.boton) {
    y += 48;
  }
  const sinTitulo = !(titulo && anchoTitulo > 60) && !o.boton;
  if (a.has('filtros')) {
    let x = rect.x + pad;
    for (const etiqueta of ['Filtro activo: Todos', 'Período: último año']) {
      const w = anchoTexto(etiqueta, 18) + 44;
      if (x + w > rect.x + rect.w - pad) break;
      svg +=
        `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="32" rx="16" fill="#ffffff" stroke="${SECUNDARIO}" stroke-width="1.5"/>` +
        textoSvg([etiqueta + '  ✕'], x + 14, y + 6, 18, { color: TEXTO });
      x += w + 10;
    }
    y += 44;
  }
  return {
    svg,
    insignias,
    contenido: {
      x: rect.x + pad,
      y,
      w: rect.w - 2 * pad - (sinTitulo ? anchoInsignias : 0),
      h: Math.max(0, rect.y + rect.h - pad - y),
    },
  };
}

// ---- Numeros ----

function formatoNumero(v: number, redondear: boolean, decimales: boolean) {
  if (redondear) {
    const abs = Math.abs(v);
    if (abs >= 1e6) return `${Math.round(v / 1e6)} M`;
    if (abs >= 1e4) return `${Math.round(v / 1e3)} mil`;
    return Math.round(v).toLocaleString('es-EC');
  }
  return v.toLocaleString('en-US', {
    minimumFractionDigits: decimales ? 2 : 0,
    maximumFractionDigits: decimales ? 2 : 0,
  });
}

// "85.49 %" -> "85 %"; "95,473.95" -> "95 474".
function redondearEtiqueta(t: string) {
  return t.replace(/\d[\d,]*\.\d+|\d+,\d+(?!\d{3})/g, (m) => {
    const v = Number(m.includes('.') ? m.replace(/,/g, '') : m.replace(',', '.'));
    if (!Number.isFinite(v)) return m;
    if (Math.abs(v) < 1 && v !== 0) return '<1';
    return Math.round(v).toLocaleString('es-EC');
  });
}

// ---- Graficos ----

function serieBase(c: Componente, n: number, agrupar: boolean): number[] {
  const g = c.grafico!;
  const base = g.valores.length >= 2 ? g.valores : [4, 6, 5, 8, 7, 9, 8, 10];
  const rnd = azar(c.id * 7919 + n);
  const out: number[] = [];
  const ruido = !agrupar && n > base.length * 1.5 ? 0.14 : 0;
  for (let i = 0; i < n; i++) {
    const t = (i / Math.max(1, n - 1)) * (base.length - 1);
    const k = Math.floor(t);
    const f = t - k;
    const v = base[k] * (1 - f) + (base[Math.min(base.length - 1, k + 1)] ?? base[k]) * f;
    out.push(Math.max(0, v * (1 + (rnd() - 0.5) * 2 * ruido)));
  }
  return out;
}

function series(c: Componente, n: number, agrupar: boolean): number[][] {
  const g = c.grafico!;
  const cuantas = Math.max(1, Math.min(4, g.series.length || 1));
  const base = serieBase(c, n, agrupar);
  const factores = [1, 0.48, 0.3, 0.18];
  return Array.from({ length: cuantas }, (_, k) => {
    if (k === 0) return base;
    const rnd = azar(c.id * 31 + k * 101);
    return base.map((v) => v * factores[k] * (1 + (agrupar ? 0 : (rnd() - 0.5) * 0.4)));
  });
}

function leyenda(
  nombres: string[],
  area: Rect,
  tam: number,
  arriba: boolean,
  forma: FormaGrafico,
): { svg: string; alto: number } {
  if (!nombres.length) return { svg: '', alto: 0 };
  const caja = Math.round(tam * 1.05);
  let x = area.x;
  let fila = 0;
  const items: { x: number; fila: number; nombre: string; i: number }[] = [];
  nombres.forEach((nombre, i) => {
    let texto = nombre;
    let w = caja + 8 + anchoTexto(texto, tam);
    // Un nombre mas ancho que el area se parte por palabras en otra pasada.
    if (w > area.w) {
      texto = partir(nombre, area.w - caja - 8, tam)[0] + ' …';
      w = caja + 8 + anchoTexto(texto, tam);
    }
    if (x + w > area.x + area.w && x > area.x) {
      fila++;
      x = area.x;
    }
    items.push({ x, fila, nombre: texto, i });
    x += w + 26;
  });
  const altoFila = Math.round(tam * 1.5);
  const alto = (fila + 1) * altoFila;
  const y0 = arriba ? area.y : area.y + area.h - alto;
  let svg = '';
  for (const it of items) {
    const y = y0 + it.fila * altoFila;
    svg +=
      forma === 'lineas'
        ? `<line x1="${r(it.x)}" y1="${r(y + tam * 0.6)}" x2="${r(it.x + caja)}" y2="${r(y + tam * 0.6)}" stroke="${GRISES[it.i % 4]}" stroke-width="4" stroke-dasharray="${TRAZOS[it.i % 4]}"/>`
        : `<rect x="${r(it.x)}" y="${r(y + tam * 0.1)}" width="${caja}" height="${caja}" fill="${GRISES[it.i % 4]}" stroke="#222" stroke-width="1"/>`;
    svg += textoSvg([it.nombre], it.x + caja + 8, y, tam, { color: TEXTO });
  }
  return { svg, alto: alto + 8 };
}

// Leyenda en columna a la derecha del grafico, con nombres partidos en
// varias lineas si hace falta (para cuando arriba no hay lugar).
function leyendaColumna(nombres: string[], area: Rect, forma: FormaGrafico): { svg: string; ancho: number } | null {
  const ancho = Math.min(area.w * 0.42, 260);
  for (let tam = 22; tam >= TAM_MIN; tam--) {
    const caja = Math.round(tam * 1.05);
    const bloques = nombres.map((nm) => partir(nm, ancho - caja - 10, tam));
    const alto = bloques.reduce((s, b) => s + b.length * tam * 1.25 + 12, 0);
    if (alto > area.h) continue;
    let y = area.y + Math.max(0, (area.h - alto) / 2);
    const x = area.x + area.w - ancho;
    let svg = '';
    bloques.forEach((lineas, i) => {
      svg +=
        forma === 'lineas'
          ? `<line x1="${r(x)}" y1="${r(y + tam * 0.6)}" x2="${r(x + caja)}" y2="${r(y + tam * 0.6)}" stroke="${GRISES[i % 4]}" stroke-width="4" stroke-dasharray="${TRAZOS[i % 4]}"/>`
          : `<rect x="${r(x)}" y="${r(y + tam * 0.1)}" width="${caja}" height="${caja}" fill="${GRISES[i % 4]}" stroke="#222" stroke-width="1"/>`;
      svg += textoSvg(lineas, x + caja + 10, y, tam, { color: TEXTO });
      y += lineas.length * tam * 1.25 + 12;
    });
    return { svg, ancho: ancho + 12 };
  }
  return null;
}

function dibujarTorta(c: Componente, a: Set<Ajuste>, area: Rect): string {
  const g = c.grafico!;
  const red = a.has('redondear');
  let valores = g.valores.filter((v) => v > 0);
  if (valores.length < 2) {
    valores = g.etiquetas
      .map((e) => Number((e.match(/[\d.,]+/)?.[0] ?? '').replace(/,/g, '')))
      .filter((v) => v > 0);
  }
  if (valores.length < 2) valores = [55, 25, 15, 5];
  const total = valores.reduce((s, v) => s + v, 0);
  const pct = valores.map((v) => (v / total) * 100);
  const etiquetaPct = pct.map((p, i) => {
    const original = g.etiquetas[i] && /%/.test(g.etiquetas[i]) ? g.etiquetas[i] : `${p.toFixed(2)} %`;
    return (red ? redondearEtiqueta(original) : original).replace(/\s*%/, '\u00a0%');
  });
  const nombres = valores.map((_, i) => g.series[i] ?? `Parte ${i + 1}`);

  const enColumna = area.w > area.h * 1.15;
  const tamLeyenda = a.has('leyendaGrande') ? 22 : TAM_MIN;
  const lado = enColumna ? Math.min(area.h, area.w * 0.42) : Math.min(area.w, area.h * 0.55);
  const radio = lado / 2 - 4;
  const cx = area.x + (enColumna ? lado / 2 : area.w / 2);
  const cy = area.y + (enColumna ? area.h / 2 : lado / 2);
  let svg = '';
  let ang = -Math.PI / 2;
  pct.forEach((p, i) => {
    const delta = (p / 100) * Math.PI * 2;
    const x1 = cx + radio * Math.cos(ang);
    const y1 = cy + radio * Math.sin(ang);
    const x2 = cx + radio * Math.cos(ang + delta);
    const y2 = cy + radio * Math.sin(ang + delta);
    svg += `<path d="M${r(cx)},${r(cy)} L${r(x1)},${r(y1)} A${r(radio)},${r(radio)} 0 ${delta > Math.PI ? 1 : 0} 1 ${r(x2)},${r(y2)} Z" fill="${GRISES[i % 4]}" stroke="#ffffff" stroke-width="3"/>`;
    // Porcentaje dentro de la porcion si cabe.
    const medio = ang + delta / 2;
    const tam = 20;
    const texto = etiquetaPct[i];
    if (delta > 0.6 && radio > 60 && anchoTexto(texto, tam, true) < radio * 0.9) {
      const tx = cx + radio * 0.6 * Math.cos(medio);
      const ty = cy + radio * 0.6 * Math.sin(medio);
      const claro = i % 4 === 2;
      svg += textoSvg([texto], tx, ty - tam / 2, tam, { negrita: true, ancla: 'middle', color: claro ? '#111' : '#fff' });
    }
    ang += delta;
  });
  // Leyenda: nombre y porcentaje, uno por linea.
  const leyendaArea: Rect = enColumna
    ? { x: area.x + lado + 20, y: area.y, w: area.w - lado - 20, h: area.h }
    : { x: area.x, y: area.y + lado + 14, w: area.w, h: area.h - lado - 14 };
  const rotulo = (i: number) => `${nombres[i]}\u00a0—\u00a0${etiquetaPct[i]}`;
  const altoItem = (area: Rect, tam: number) =>
    nombres.map((_, i) => partir(rotulo(i), area.w - tam - 12, tam).length);
  let tam = tamLeyenda;
  while (tam > TAM_MIN && altoItem(leyendaArea, tam).reduce((s, n) => s + n, 0) * tam * 1.3 + nombres.length * 10 > leyendaArea.h) tam--;
  const lineasTotales = altoItem(leyendaArea, tam).reduce((s, n) => s + n, 0) * tam * 1.3 + nombres.length * 10;
  let y = leyendaArea.y + Math.max(0, (leyendaArea.h - lineasTotales) / 2);
  nombres.forEach((nm, i) => {
    const t = encajar(rotulo(i), leyendaArea.w - tam - 12, leyendaArea.y + leyendaArea.h - y, { max: tam, min: tam });
    if (t.lineas.length === 0 || y + tam > leyendaArea.y + leyendaArea.h) return;
    svg += `<rect x="${r(leyendaArea.x)}" y="${r(y + 2)}" width="${tam}" height="${tam}" fill="${GRISES[i % 4]}" stroke="#222" stroke-width="1"/>`;
    svg += textoSvg(t.lineas, leyendaArea.x + tam + 12, y, t.tam, { color: TEXTO });
    y += t.alto + 10;
  });
  return svg;
}

function dibujarGrafico(c: Componente, a: Set<Ajuste>, area: Rect): string {
  const g = c.grafico!;
  if (g.forma === 'torta') return dibujarTorta(c, a, area);
  const agrupar = a.has('agrupar');
  const red = a.has('redondear');
  const decimales = !red && g.etiquetas.some((e) => /\.\d{2}\b/.test(e));
  const n = agrupar
    ? Math.min(12, Math.max(6, g.valores.length || 8))
    : Math.min(120, Math.max(6, g.puntos || g.valores.length || 8));
  const datos = series(c, n, agrupar);
  const nombres = g.series.length ? g.series : [];
  let svg = '';
  let plot = { ...area };

  // Leyenda grande arriba (corregida) o normal abajo.
  const grande = a.has('leyendaGrande');
  const ley = leyenda(nombres, area, grande ? 22 : TAM_MIN, grande, g.forma);
  // Si la leyenda grande ocupa mas de un tercio del alto, va en columna.
  const columna = grande && ley.alto > area.h * 0.3 ? leyendaColumna(nombres, area, g.forma) : null;
  if (columna) {
    svg += columna.svg;
    plot.w -= columna.ancho;
  } else {
    svg += ley.svg;
    if (grande) plot.y += ley.alto;
    plot.h -= ley.alto;
  }
  // Control de rango (zoom) debajo del eje.
  if (a.has('zoom')) {
    plot.h -= 46;
    const y = plot.y + plot.h + 36;
    const x0 = plot.x + 70;
    const w = plot.w - 70;
    const desde = g.ejeX[0] ?? 'Inicio';
    const hasta = g.ejeX[g.ejeX.length - 1] ?? 'Fin';
    svg +=
      `<rect x="${r(x0)}" y="${r(y)}" width="${r(w)}" height="10" rx="5" fill="#d6d6d6"/>` +
      `<rect x="${r(x0 + w * 0.55)}" y="${r(y)}" width="${r(w * 0.45)}" height="10" rx="5" fill="#6b6b6b"/>` +
      `<circle cx="${r(x0 + w * 0.55)}" cy="${r(y + 5)}" r="11" fill="#fff" stroke="#333" stroke-width="2"/>` +
      `<circle cx="${r(x0 + w)}" cy="${r(y + 5)}" r="11" fill="#fff" stroke="#333" stroke-width="2"/>`;
    const rango = `Rango: ${desde} – ${hasta}`;
    if (anchoTexto(rango, TAM_MIN) < w * 0.5) svg += textoSvg([rango], x0, y - 30, TAM_MIN, { color: SECUNDARIO });
  }

  // Ejes: valores a la izquierda, fechas abajo.
  const max = Math.max(1, ...datos.flat());
  const techo = Math.pow(10, Math.floor(Math.log10(max))) * Math.ceil(max / Math.pow(10, Math.floor(Math.log10(max))));
  const ticks = [0, techo / 2, techo];
  const tamEje = grande ? 21 : TAM_MIN;
  const etiquetasY = ticks.map((t) => formatoNumero(t, red, decimales));
  const anchoY = Math.max(...etiquetasY.map((t) => anchoTexto(t, tamEje))) + 10;
  const altoX = g.ejeX.length ? tamEje * 1.6 : 4;
  // Rotulo directo de cada serie a la derecha de la linea.
  // Solo si todos los nombres entran completos y la leyenda no esta ya al
  // costado; si no, basta con la leyenda grande.
  const largoNombres = nombres.length ? Math.max(...nombres.map((nm) => anchoTexto(nm, tamEje, true))) + 14 : 0;
  const directas =
    a.has('etiquetasDirectas') &&
    !columna &&
    (g.forma === 'lineas' || g.forma === 'area') &&
    nombres.length > 0 &&
    largoNombres <= plot.w * 0.32;
  const anchoDirectas = directas ? largoNombres : 0;
  // Lugar arriba para el valor de la barra mas alta.
  const conValores = g.forma === 'barras' && (a.has('etiquetasDirectas') || red) && datos.length === 1;
  const margenArriba = conValores ? TAM_MIN * 1.6 : 6;
  const px = plot.x + anchoY;
  const py = plot.y + margenArriba;
  const pw = plot.w - anchoY - anchoDirectas;
  const ph = plot.h - altoX - margenArriba;
  if (pw < 40 || ph < 30) return svg;

  ticks.forEach((t, i) => {
    const y = py + ph - (t / techo) * ph;
    svg += `<line x1="${r(px)}" y1="${r(y)}" x2="${r(px + pw)}" y2="${r(y)}" stroke="${i === 0 ? '#555' : '#dcdcdc'}" stroke-width="${i === 0 ? 2 : 1}"/>`;
    svg += textoSvg([etiquetasY[i]], px - 8, y - tamEje * 0.55, tamEje, { ancla: 'end', color: SECUNDARIO });
  });
  svg += `<line x1="${r(px)}" y1="${r(py)}" x2="${r(px)}" y2="${r(py + ph)}" stroke="#555" stroke-width="2"/>`;

  // Rotulos del eje X que entran sin chocar.
  // Se muestran tantos como entren (5, 4, 3 o 2), repartidos de punta a punta.
  if (g.ejeX.length) {
    for (let quiero = Math.min(g.ejeX.length, 5); quiero >= 1; quiero--) {
      const elegidos =
        quiero === 1
          ? [g.ejeX[0]]
          : Array.from({ length: quiero }, (_, i) => g.ejeX[Math.round((i * (g.ejeX.length - 1)) / (quiero - 1))]);
      const paso = pw / quiero;
      if (elegidos.some((t) => anchoTexto(t, tamEje) > paso - 12)) continue;
      elegidos.forEach((t, i) => {
        svg += textoSvg([t], px + paso * (i + 0.5), py + ph + 6, tamEje, { ancla: 'middle', color: SECUNDARIO });
      });
      break;
    }
  }

  const xDe = (i: number) => px + (pw * (i + 0.5)) / n;
  const yDe = (v: number) => py + ph - (v / techo) * ph;

  if (g.forma === 'barras') {
    const grupo = pw / n;
    const anchoBarra = Math.max(1, (grupo * 0.8) / datos.length);
    datos.forEach((s, k) =>
      s.forEach((v, i) => {
        const x = px + grupo * i + grupo * 0.1 + k * anchoBarra;
        const y = yDe(v);
        svg += `<rect x="${r(x)}" y="${r(y)}" width="${r(anchoBarra)}" height="${r(py + ph - y)}" fill="${GRISES[k % 4]}"${anchoBarra > 6 ? ' stroke="#222" stroke-width="0.8"' : ''}/>`;
      }),
    );
    // Valor sobre cada barra cuando hay espacio (datos agrupados).
    if (conValores) {
      datos[0].forEach((v, i) => {
        const t = formatoNumero(v, true, false);
        if (anchoTexto(t, TAM_MIN) > grupo - 4) return;
        svg += textoSvg([t], xDe(i), yDe(v) - TAM_MIN * 1.3, TAM_MIN, { ancla: 'middle', color: TEXTO });
      });
    }
  } else if (g.forma === 'area') {
    // De la serie mayor a la menor, para que todas se vean.
    datos.forEach((s, k) => {
      const puntos = s.map((v, i) => `${r(xDe(i))},${r(yDe(v))}`).join(' ');
      svg += `<polygon points="${r(xDe(0))},${r(py + ph)} ${puntos} ${r(xDe(n - 1))},${r(py + ph)}" fill="${GRISES[k % 4]}" fill-opacity="0.85" stroke="#1a1a1a" stroke-width="1.5"/>`;
    });
  } else {
    datos.forEach((s, k) => {
      const puntos = s.map((v, i) => `${r(xDe(i))},${r(yDe(v))}`).join(' ');
      if (g.forma === 'dispersion') {
        s.forEach((v, i) => (svg += `<circle cx="${r(xDe(i))}" cy="${r(yDe(v))}" r="5" fill="${GRISES[k % 4]}"/>`));
      } else {
        svg += `<polyline points="${puntos}" fill="none" stroke="${GRISES[k % 4]}" stroke-width="${agrupar ? 4 : 3}" stroke-dasharray="${TRAZOS[k % 4]}" stroke-linejoin="round"/>`;
        if (agrupar) s.forEach((v, i) => (svg += `<circle cx="${r(xDe(i))}" cy="${r(yDe(v))}" r="5" fill="#fff" stroke="${GRISES[k % 4]}" stroke-width="3"/>`));
      }
    });
  }

  // Rotulos directos al final de cada serie, sin encimarse.
  if (directas) {
    const finales = datos
      .map((s, k) => ({ k, y: yDe(s[s.length - 1]) }))
      .sort((p, q) => p.y - q.y);
    let ultimo = -Infinity;
    for (const f of finales) {
      const y = Math.max(f.y - tamEje / 2, ultimo + tamEje * 1.2);
      if (y + tamEje > py + ph + tamEje) break;
      svg += textoSvg([nombres[f.k] ?? ''], px + pw + 10, y, tamEje, { color: TEXTO, negrita: true });
      ultimo = y;
    }
  }
  return svg;
}

// ---- Otros componentes ----

function barrasDeTexto(area: Rect, semilla: number, oscuro: boolean): string {
  const rnd = azar(semilla);
  let svg = '';
  for (let y = area.y + 4; y + 14 <= area.y + area.h; y += 30) {
    const w = area.w * (0.45 + rnd() * 0.5);
    svg += `<rect x="${r(area.x)}" y="${r(y)}" width="${r(w)}" height="14" rx="7" fill="${oscuro ? '#9a9a9a' : '#d2d2d2'}"/>`;
  }
  return svg;
}

function bloqueDeTexto(textos: string[], area: Rect, tono: Tono, o: { max?: number; centrado?: boolean } = {}) {
  if (!textos.length || area.h < TAM_MIN) return '';
  const t = encajar(textos.join(' · '), area.w, area.h, { max: o.max ?? 22 });
  const y = area.y + Math.max(0, (area.h - t.alto) / 2);
  return textoSvg(t.lineas, o.centrado ? area.x + area.w / 2 : area.x, y, t.tam, {
    color: tono.oscuro ? '#ffffff' : SECUNDARIO,
    ancla: o.centrado ? 'middle' : 'start',
  });
}

// Rotulos que suelen ser titulos de seccion en un menu.
const ES_SECCION = /^(navigation|navegaci[oó]n|featured|destacad\w*|all others|otros|other|general|principal|main|admin\w*|configuraci[oó]n|reports?|reportes|herramientas|tools|more|m[aá]s)$/i;

function dibujarMenuLateral(c: Componente, a: Set<Ajuste>, area: Rect, tono: Tono): string {
  if (a.has('secciones')) return dibujarMenuSecciones(c, a, area, tono);
  let svg = '';
  const items = c.textos.filter((t) => t !== c.titulo);
  if (!items.length) return barrasDeTexto(area, c.id, tono.oscuro);
  const tam = Math.max(TAM_MIN, Math.min(22, Math.floor((area.w - 44) / 7)));
  let alto = a.has('espaciado') || a.has('alinear') ? 50 : 44;
  while (alto > 34 && items.length * alto > area.h) alto -= 2;
  const caben = Math.max(0, Math.floor(area.h / alto));
  const visibles = items.length > caben ? items.slice(0, Math.max(0, caben - 1)) : items;
  const iconoX = area.x + 2;
  const textoX = area.x + 40;
  visibles.forEach((item, i) => {
    const y = area.y + i * alto + (alto - tam * 1.25) / 2;
    const cuadro = Math.round(tam * 0.95);
    svg += `<rect x="${r(iconoX)}" y="${r(y + 1)}" width="${cuadro}" height="${cuadro}" rx="4" fill="none" stroke="${tono.texto}" stroke-width="2"/>`;
    const t = encajar(item, area.x + area.w - textoX, tam * 1.3, { max: tam, min: TAM_MIN, maxLineas: 1 });
    svg += textoSvg(t.lineas, textoX, y, t.tam, { color: tono.texto });
    if (a.has('alinear') && i < visibles.length - 1) {
      svg += `<line x1="${r(area.x)}" y1="${r(area.y + (i + 1) * alto)}" x2="${r(area.x + area.w)}" y2="${r(area.y + (i + 1) * alto)}" stroke="${tono.oscuro ? '#5a5a5a' : '#d0d0d0'}" stroke-width="1"/>`;
    }
  });
  if (visibles.length < items.length) {
    const y = area.y + visibles.length * alto + (alto - tam * 1.25) / 2;
    svg += textoSvg([`+ ${items.length - visibles.length} opciones más`], textoX, y, TAM_MIN, { color: tono.texto, cursiva: true });
  }
  return svg;
}

// Menu agrupado: cada seccion con su titulo en mayusculas y una linea.
// Si la captura no tenia titulos de seccion, se agrupa de a cuatro.
function dibujarMenuSecciones(c: Componente, a: Set<Ajuste>, area: Rect, tono: Tono): string {
  const items = c.textos.filter((t) => t !== c.titulo);
  const grupos: { titulo: string; items: string[] }[] = [];
  if (items.some((t) => ES_SECCION.test(t))) {
    for (const t of items) {
      if (ES_SECCION.test(t)) grupos.push({ titulo: t, items: [] });
      else (grupos[grupos.length - 1] ?? grupos[grupos.push({ titulo: 'General', items: [] }) - 1]).items.push(t);
    }
  } else {
    for (let i = 0; i < items.length; i += 4) grupos.push({ titulo: `Sección ${i / 4 + 1}`, items: items.slice(i, i + 4) });
  }
  let svg = '';
  let y = area.y;
  const altoItem = 38;
  const altoTitulo = 40;
  for (const g of grupos) {
    if (y + altoTitulo + altoItem > area.y + area.h) break;
    svg += `<line x1="${r(area.x)}" y1="${r(y + 4)}" x2="${r(area.x + area.w)}" y2="${r(y + 4)}" stroke="${tono.oscuro ? '#6a6a6a' : '#bdbdbd'}" stroke-width="1.5"/>`;
    const t = encajar(g.titulo.toUpperCase(), area.w, 26, { max: TAM_MIN, min: TAM_MIN, negrita: true, maxLineas: 1 });
    svg += textoSvg(t.lineas, area.x, y + 12, TAM_MIN, { negrita: true, color: tono.oscuro ? '#dddddd' : SECUNDARIO });
    y += altoTitulo;
    for (const item of g.items) {
      if (y + altoItem > area.y + area.h) break;
      const e = encajar(item, area.w - 40, altoItem, { max: 20, maxLineas: 1 });
      svg += `<rect x="${r(area.x + 2)}" y="${r(y + 8)}" width="20" height="20" rx="4" fill="none" stroke="${tono.texto}" stroke-width="2"/>`;
      svg += textoSvg(e.lineas, area.x + 36, y + (altoItem - e.tam * 1.25) / 2, e.tam, { color: tono.texto });
      y += altoItem;
    }
    y += 6;
  }
  return svg;
}

function dibujarMenuSuperior(c: Componente, a: Set<Ajuste>, area: Rect, tono: Tono): string {
  let svg = '';
  const tam = TAM_MIN + 2;
  let x = area.x + area.w;
  const y = area.y + Math.max(0, (area.h - tam * 1.25) / 2);
  const items = c.textos.filter((t) => t !== c.titulo);
  for (const item of [...items].reverse()) {
    const w = anchoTexto(item, tam) + (a.has('espaciado') ? 36 : 24);
    if (x - w < area.x) break;
    x -= w;
    svg += textoSvg([item], x + 10, y, tam, { color: tono.texto });
  }
  return svg;
}

function dibujarTabla(c: Componente, a: Set<Ajuste>, area: Rect): string {
  const altoFilaTabla = a.has('espaciado') ? 50 : 40;
  const accion = a.has('enlacesClaros') || a.has('botonGrande');
  const columnas = [...(c.columnas?.length ? c.columnas : ['Columna 1', 'Columna 2', 'Columna 3'])];
  if (accion) columnas.push('Acción');
  const altoFila = altoFilaTabla;
  const anchoCol = area.w / columnas.length;
  // Encabezados completos: si no entran en una linea, pasan a dos (una
  // palabra larga se parte con guion), nunca se cortan.
  // Antes de partir una palabra con guion se prueba sin negrita y a 16 px.
  const opciones = [
    { tam: TAM_MIN, negrita: true },
    { tam: TAM_MIN, negrita: false },
    { tam: 16, negrita: true },
  ];
  const partidas = (o: { tam: number; negrita: boolean }) =>
    columnas.map((col) => partir(col, anchoCol - 14, o.tam, o.negrita));
  const estilo = opciones.find((o) => partidas(o).every((l) => !l.some((x) => x.endsWith('-')))) ?? opciones[0];
  const encabezados = partidas(estilo);
  const lineasCab = Math.max(...encabezados.map((l) => l.length));
  const altoCab = Math.max(altoFila, lineasCab * estilo.tam * 1.25 + 16);
  let svg = `<rect x="${r(area.x)}" y="${r(area.y)}" width="${r(area.w)}" height="${r(altoCab)}" fill="#e3e3e3"/>`;
  encabezados.forEach((lineas, i) => {
    svg += textoSvg(lineas, area.x + i * anchoCol + 7, area.y + 8, estilo.tam, { negrita: estilo.negrita, color: TEXTO });
  });
  const filas = Math.min(c.filas ?? 4, Math.floor((area.h - altoCab) / altoFila));
  const rnd = azar(c.id * 13);
  const verDetalle = anchoTexto('Ver detalle ›', TAM_MIN, true) <= anchoCol - 16 ? 'Ver detalle ›' : 'Ver ›';
  for (let f = 0; f < filas; f++) {
    const y = area.y + altoCab + altoFila * f;
    svg += `<line x1="${r(area.x)}" y1="${r(y + altoFila)}" x2="${r(area.x + area.w)}" y2="${r(y + altoFila)}" stroke="#d0d0d0"/>`;
    columnas.forEach((_, i) => {
      const x = area.x + i * anchoCol + 8;
      if (accion && i === columnas.length - 1) {
        if (a.has('botonGrande')) {
          svg +=
            `<rect x="${r(x)}" y="${r(y + 4)}" width="${r(Math.min(anchoCol - 16, 90))}" height="32" rx="6" fill="#ffffff" stroke="#2f2f2f" stroke-width="2"/>` +
            textoSvg(['Ver'], x + Math.min(anchoCol - 16, 90) / 2, y + 9, TAM_MIN, { negrita: true, ancla: 'middle', color: TEXTO });
        } else {
          svg +=
            textoSvg([verDetalle], x, y + 9, TAM_MIN, { negrita: true, color: TEXTO }) +
            `<line x1="${r(x)}" y1="${r(y + 31)}" x2="${r(x + anchoTexto(verDetalle.replace(' ›', ''), TAM_MIN, true))}" y2="${r(y + 31)}" stroke="${TEXTO}" stroke-width="2"/>`;
        }
        return;
      }
      svg += `<rect x="${r(x)}" y="${r(y + 14)}" width="${r((anchoCol - 24) * (0.4 + rnd() * 0.5))}" height="12" rx="6" fill="#cfcfcf"/>`;
    });
  }
  return svg;
}

// Numero grande y su rotulo debajo. Gemini a veces pone el numero como
// titulo y el rotulo en los textos; se acomoda en los dos casos.
function datosKpi(c: Componente) {
  const tieneNumero = (t: string) => /\d/.test(t);
  if (tieneNumero(c.titulo) && !c.textos.some(tieneNumero)) {
    return { valor: c.titulo, rotulo: c.textos[0] ?? '' };
  }
  return { valor: c.textos.find(tieneNumero) ?? '—', rotulo: tieneNumero(c.titulo) ? '' : c.titulo };
}

function dibujarKpi(c: Componente, a: Set<Ajuste>, area: Rect, tono: Tono): string {
  const datos = datosKpi(c);
  const valor = a.has('redondear') ? redondearEtiqueta(datos.valor) : datos.valor;
  const rot = datos.rotulo && c.titulo !== datos.rotulo
    ? encajar(datos.rotulo, area.w, area.h * 0.4, { max: 20, maxLineas: 2 })
    : null;
  const t = encajar(valor, area.w, area.h - (rot?.alto ?? 0) - 6, { max: 46, min: TAM_MIN, negrita: true, maxLineas: 1 });
  const total = t.alto + (rot ? rot.alto + 6 : 0);
  const y = area.y + Math.max(0, (area.h - total) / 2);
  let svg = textoSvg(t.lineas, area.x + area.w / 2, y, t.tam, { negrita: true, ancla: 'middle', color: tono.texto });
  if (rot) svg += textoSvg(rot.lineas, area.x + area.w / 2, y + t.alto + 6, rot.tam, { ancla: 'middle', color: tono.oscuro ? '#ffffff' : SECUNDARIO });
  return svg;
}

function dibujarCampos(c: Componente, a: Set<Ajuste>, area: Rect): string {
  let svg = '';
  const indicacion = a.has('indicacion');
  const textos = c.textos.length ? c.textos : [c.tipo === 'buscador' ? 'Buscar…' : 'Campo'];
  if (indicacion) return dibujarCamposConIndicacion(textos, area);
  const alto = Math.max(32, Math.min(a.has('botonGrande') ? 52 : 44, area.h));
  let y = area.y;
  for (const t of textos.slice(0, 6)) {
    if (y + alto > area.y + area.h + 1) break;
    svg += `<rect x="${r(area.x)}" y="${r(y)}" width="${r(area.w)}" height="${alto}" rx="6" fill="#ffffff" stroke="#6b6b6b" stroke-width="1.5"/>`;
    const e = encajar(t, area.w - 24, alto - 10, { max: TAM_MIN + 2, maxLineas: 1 });
    svg += textoSvg(e.lineas, area.x + 12, y + (alto - e.tam * 1.25) / 2, e.tam, { color: SECUNDARIO });
    y += alto + 12;
  }
  return svg;
}

// El boton ocupa su recuadro; si la correccion agrega otro, van uno al
// lado del otro. Las insignias quedan a la derecha, fuera de los rotulos.
// Campos en fila, cada uno con su rotulo, un texto de ejemplo dentro
// ("dd/mm/aaaa" si es una fecha) y la indicacion debajo.
function dibujarCamposConIndicacion(textos: string[], area: Rect): string {
  const campos = textos.filter((t) => !/^(todos?|todas?)$/i.test(t)).slice(0, 4);
  if (!campos.length) campos.push('Campo');
  const sep = 14;
  const ancho = (area.w - sep * (campos.length - 1)) / campos.length;
  let svg = '';
  campos.forEach((t, i) => {
    const x = area.x + i * (ancho + sep);
    const fecha = /fecha|desde|hasta|date|d[ií]a/i.test(t);
    const rot = encajar(t, ancho, 24, { max: TAM_MIN, min: TAM_MIN, negrita: true, maxLineas: 1 });
    svg += textoSvg(rot.lineas, x, area.y, TAM_MIN, { negrita: true, color: TEXTO });
    const yCampo = area.y + 26;
    const alto = Math.max(32, Math.min(44, area.h - 26 - 24));
    svg += `<rect x="${r(x)}" y="${r(yCampo)}" width="${r(ancho)}" height="${r(alto)}" rx="6" fill="#ffffff" stroke="#4d4d4d" stroke-width="1.5"/>`;
    const ejemplo = encajar(fecha ? 'dd/mm/aaaa' : 'Escribe aquí…', ancho - 20, alto - 6, { max: TAM_MIN, min: TAM_MIN, maxLineas: 1 });
    svg += textoSvg(ejemplo.lineas, x + 10, yCampo + (alto - TAM_MIN * 1.25) / 2, TAM_MIN, { color: '#6b6b6b', cursiva: true });
    const ayuda = encajar(fecha ? 'Vacío = sin límite de fecha' : 'Campo opcional', ancho, 24, { max: TAM_MIN, min: TAM_MIN, maxLineas: 1 });
    if (yCampo + alto + 4 + TAM_MIN * 1.25 <= area.y + area.h + 2) {
      svg += textoSvg(ayuda.lineas, x, yCampo + alto + 4, TAM_MIN, { color: SECUNDARIO });
    }
  });
  return svg;
}

// Icono de carga: un circulo con un arco mas oscuro.
function iconoCarga(cx: number, cy: number, radio: number, color: string) {
  return (
    `<circle cx="${r(cx)}" cy="${r(cy)}" r="${radio}" fill="none" stroke="#bdbdbd" stroke-width="3"/>` +
    `<path d="M${r(cx)},${r(cy - radio)} A${radio},${radio} 0 0 1 ${r(cx + radio)},${r(cy)}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`
  );
}

function dibujarBotones(c: Componente, rect: Rect, a: Set<Ajuste>, marcas: Marca[], nuevo?: string): string {
  const anchoInsignias = marcas.length * DIAM;
  const area = { x: rect.x, y: rect.y, w: rect.w - anchoInsignias - (marcas.length ? 6 : 0), h: rect.h };
  const cargando = a.has('estadoCarga');
  const base = c.textos[0] || c.titulo || 'Acción';
  // Con indicador de carga, el boton muestra el estado: "Actualizar" ->
  // "Actualizando…"; si no es un verbo en -ar, "Cargando…".
  const enCurso = /ar$/i.test(base) ? `${base.slice(0, -2)}ando…` : 'Cargando…';
  const botones = [{ texto: cargando ? enCurso : base, nuevo: false }];
  if (nuevo) botones.push({ texto: nuevo, nuevo: true });
  const separacion = 10;
  const ancho = (area.w - separacion * (botones.length - 1)) / botones.length;
  const alto = Math.min(area.h, a.has('botonGrande') ? 56 : 48);
  const y = area.y + (area.h - alto) / 2;
  let svg = '';
  botones.forEach((b, i) => {
    const x = area.x + i * (ancho + separacion);
    const icono = cargando && !b.nuevo ? 30 : 0;
    const t = encajar(b.texto, ancho - 20 - icono, alto - 6, { max: 22, negrita: true, maxLineas: 1 });
    svg += `<rect x="${r(x)}" y="${r(y)}" width="${r(ancho)}" height="${r(alto)}" rx="8" fill="${b.nuevo ? '#2f2f2f' : '#ffffff'}" stroke="#2f2f2f" stroke-width="2"/>`;
    if (icono) svg += iconoCarga(x + 22, y + alto / 2, 9, '#2f2f2f');
    svg += textoSvg(t.lineas, x + icono / 2 + ancho / 2, y + (alto - t.tam * 1.25) / 2, t.tam, {
      negrita: true,
      ancla: 'middle',
      color: b.nuevo ? '#ffffff' : TEXTO,
    });
  });
  marcas.forEach((m, i) => {
    svg += insignia(rect.x + rect.w - DIAM / 2 - i * DIAM, rect.y + rect.h / 2, m.n, m.severidad);
  });
  return `<g>${svg}</g>`;
}

function dibujarImagen(area: Rect): string {
  return (
    `<rect x="${r(area.x)}" y="${r(area.y)}" width="${r(area.w)}" height="${r(area.h)}" fill="#e6e6e6" stroke="#9a9a9a"/>` +
    `<line x1="${r(area.x)}" y1="${r(area.y)}" x2="${r(area.x + area.w)}" y2="${r(area.y + area.h)}" stroke="#9a9a9a" stroke-width="2"/>` +
    `<line x1="${r(area.x + area.w)}" y1="${r(area.y)}" x2="${r(area.x)}" y2="${r(area.y + area.h)}" stroke="#9a9a9a" stroke-width="2"/>`
  );
}

function dibujarLista(c: Componente, area: Rect, tono: Tono): string {
  let svg = '';
  let y = area.y;
  for (const item of c.textos) {
    const t = encajar(item, area.w - 24, area.y + area.h - y, { max: 20, maxLineas: 2 });
    if (y + t.tam * 1.25 > area.y + area.h) break;
    svg += `<circle cx="${r(area.x + 6)}" cy="${r(y + t.tam * 0.6)}" r="5" fill="${tono.texto}"/>`;
    svg += textoSvg(t.lineas, area.x + 22, y, t.tam, { color: tono.texto });
    y += t.alto + 8;
  }
  return svg;
}

// ---- Entrada ----

// Rotulo del boton nuevo segun lo que pide la recomendacion; se guarda en
// el componente al asignar (ver index.ts).
function etiquetaBoton(c: Componente): string {
  return (c as Componente & { botonNuevo?: string }).botonNuevo ?? 'Nueva acción';
}

export function dibujarComponente(c: Componente, rect: Rect, ajustes: Ajuste[], marcas: Marca[]): string {
  const a = new Set(ajustes);
  const tono = tonoDe(c, a);
  // Los graficos se dibujan siempre sobre fondo claro, para que se lean.
  // Graficos y tablas van en tarjeta blanca: el tono que se mide en la
  // captura es el de los datos (barras rojas, degradados), no el del panel.
  const tonoMarco: Tono =
    c.tipo === 'grafico' || c.tipo === 'tabla' ? { fondo: '#ffffff', texto: TEXTO, oscuro: false } : tono;
  const esBarra = c.tipo === 'encabezado' || c.tipo === 'menu_superior';
  if (c.tipo === 'boton') {
    return dibujarBotones(c, rect, a, marcas, a.has('agregarBoton') ? etiquetaBoton(c) : undefined);
  }
  const tituloKpi = c.tipo === 'tarjeta_kpi' && /\d/.test(c.titulo) ? '' : c.titulo;
  const { svg, insignias, contenido } = marco(rect, c, a, marcas, tonoMarco, {
    maxTitulo: esBarra || c.tipo === 'menu_lateral' ? 26 : 24,
    titulo: c.tipo === 'pie_de_pagina' || esBarra ? '' : tituloKpi,
    boton: a.has('agregarBoton') ? etiquetaBoton(c) : undefined,
  });
  let cuerpo = '';
  switch (c.tipo) {
    case 'grafico': {
      // Area del grafico en blanco aunque el marco tenga el tono original.
      cuerpo = dibujarGrafico(c, a, contenido);
      break;
    }
    case 'menu_lateral':
      cuerpo = dibujarMenuLateral(c, a, contenido, tono);
      break;
    case 'encabezado':
    case 'menu_superior': {
      // El titulo ya va a la izquierda; las opciones a la derecha, en la
      // misma franja.
      const franja: Rect = { x: rect.x + rect.w * 0.35, y: rect.y, w: rect.w * 0.65 - 14 - marcas.length * DIAM, h: rect.h };
      cuerpo = dibujarMenuSuperior(c, a, franja, tono);
      if (c.titulo) {
        const t = encajar(c.titulo, rect.w * 0.35 - 28, rect.h - 12, { max: a.has('jerarquia') ? 30 : 24, negrita: true, maxLineas: 2 });
        cuerpo += textoSvg(t.lineas, rect.x + 14, rect.y + (rect.h - t.alto) / 2, t.tam, { negrita: true, color: tono.texto });
      }
      break;
    }
    case 'tabla':
      cuerpo = dibujarTabla(c, a, contenido);
      break;
    case 'tarjeta_kpi':
      cuerpo = dibujarKpi(c, a, contenido, tono);
      break;
    case 'formulario':
    case 'buscador':
      cuerpo = dibujarCampos(c, a, contenido);
      break;
    case 'imagen':
      cuerpo = dibujarImagen(contenido);
      break;
    case 'lista':
      cuerpo = dibujarLista(c, contenido, tono);
      break;
    case 'pie_de_pagina': {
      // A veces Gemini pone el texto del pie como titulo.
      const textos = c.textos.length ? c.textos : c.titulo ? [c.titulo] : [];
      cuerpo = textos.length
        ? bloqueDeTexto(textos, contenido, tono, { max: 20, centrado: true })
        : barrasDeTexto(contenido, c.id, tono.oscuro);
      break;
    }
    case 'texto':
      cuerpo = c.textos.length ? bloqueDeTexto(c.textos, contenido, tono) : barrasDeTexto(contenido, c.id, tono.oscuro);
      break;
    default:
      cuerpo = a.has('indicacion')
        ? dibujarCampos(c, a, contenido)
        : c.textos.length
          ? bloqueDeTexto(c.textos, contenido, tono)
          : barrasDeTexto(contenido, c.id, tono.oscuro);
  }
  if (a.has('estadoCarga') && contenido.w > 120) {
    const y = contenido.y + contenido.h - 22;
    cuerpo +=
      `<rect x="${r(contenido.x)}" y="${r(y)}" width="${r(contenido.w)}" height="22" fill="${tono.fondo}"/>` +
      iconoCarga(contenido.x + 10, y + 11, 8, tono.oscuro ? '#ffffff' : '#2f2f2f') +
      textoSvg(['Cargando datos…'], contenido.x + 28, y + 11 - TAM_MIN * 0.62, TAM_MIN, { color: tono.oscuro ? '#ffffff' : SECUNDARIO });
  }
  return `<g>${svg}${cuerpo}${insignias}</g>`;
}

export { escapar };
