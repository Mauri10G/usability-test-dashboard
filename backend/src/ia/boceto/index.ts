import sharp from 'sharp';
import { asignar, CorreccionAplicada, CorreccionPedida, sinAcentos } from './ajustes';
import { dibujarComponente, insignia, Marca, Rect } from './dibujo';
import {
  Componente,
  Estructura,
  estructuraPorPixeles,
  fondoMedido,
  FormaGrafico,
  muestrear,
  TipoComponente,
  tonoDeCaja,
} from './estructura';
import { anchoTexto, encajar, partir, textoSvg } from './texto';

// Boceto automatico del prototipo corregido (sin IA de imagen): se
// REDIBUJA la pantalla como wireframe en escala de grises, componente por
// componente, con la correccion de cada hallazgo ya aplicada en su lugar.
// La estructura (que hay y donde) la lee Gemini de la captura; si Gemini
// no responde, sale de los bloques que se ven en los pixeles.

export { CorreccionPedida } from './ajustes';
export { Estructura, instruccionesEstructura, esquemaEstructura, normalizarEstructura } from './estructura';

const ANCHO_PANTALLA = 1600;
const ALTO_MAX_PANTALLA = 2600;
const ALTO_CABECERA = 72;
const ANCHO_PANEL = 600;
const SEPARACION = 12;

export interface ResultadoBoceto {
  png: Buffer;
  ancho: number;
  alto: number;
  correcciones: CorreccionAplicada[];
  estructura: { origen: Estructura['origen']; modelo?: string; componentes: number };
}

// Sin Gemini: cada recuadro de un hallazgo se vuelve un componente del
// tipo que sugiere su texto, para dibujar ahi la version corregida.
function componenteDeZona(p: CorreccionPedida, id: number): Componente {
  const t = sinAcentos(`${p.ubicacion} ${p.titulo} ${p.recomendacion}`);
  const tipo: TipoComponente = /grafic|barras|torta|pastel|linea|serie|leyenda|eje/.test(t)
    ? 'grafico'
    : /menu|navegacion|lateral/.test(t)
      ? 'menu_lateral'
      : /encabezado|cabecera|barra superior/.test(t)
        ? 'encabezado'
        : /tabla/.test(t)
          ? 'tabla'
          : /pie de pagina/.test(t)
            ? 'pie_de_pagina'
            : /boton/.test(t)
              ? 'boton'
              : 'otro';
  const forma: FormaGrafico = /torta|pastel|circular/.test(t) ? 'torta' : /linea/.test(t) ? 'lineas' : /area/.test(t) ? 'area' : 'barras';
  return {
    id,
    tipo,
    caja: p.zona!,
    titulo: '',
    textos: [],
    prioridad: true,
    grafico: tipo === 'grafico' ? { forma, es3d: false, series: [], valores: [], etiquetas: [], puntos: 40, ejeX: [] } : undefined,
  };
}

// ---- Superposiciones: ningun recuadro pisa a otro ----

function area(r: Rect) {
  return Math.max(0, r.w) * Math.max(0, r.h);
}

function cruce(a: Rect, b: Rect): Rect | null {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  return x1 > x0 + 0.5 && y1 > y0 + 0.5 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

// Alto y ancho minimos para que el contenido entre legible. Si la caja de
// Gemini es mas chica, crece desde su centro (sin salir de la pantalla).
const MINIMOS: Partial<Record<TipoComponente, [number, number]>> = {
  grafico: [260, 200],
  tabla: [260, 160],
  tarjeta_kpi: [150, 130],
  menu_lateral: [180, 200],
  encabezado: [240, 64],
  menu_superior: [240, 64],
  pie_de_pagina: [200, 64],
  texto: [160, 64],
  lista: [160, 90],
  formulario: [160, 76],
  buscador: [160, 76],
  boton: [140, 60],
  imagen: [80, 60],
  otro: [80, 60],
};

type ConBoton = Componente & { botonNuevo?: string };

// Ajustes por componente, para calcular su tamano minimo.
const marcasAjustes = new Map<number, Set<string>>();
// Correccion de filtros -> unico componente donde se dibujan.
const filtrosEn = new Map<number, number>();

function minimoDe(c: ConBoton, marcas: number): [number, number] {
  const [w, h] = MINIMOS[c.tipo] ?? [80, 60];
  if (c.tipo === 'boton') {
    // Cada boton con su rotulo completo, mas las insignias.
    const rotulos = [c.textos[0] || c.titulo || 'Acción', ...(c.botonNuevo ? [c.botonNuevo] : [])];
    // Con indicador de carga: "…ando…" es mas largo y lleva el icono.
    const extra = marcasAjustes.get(c.id)?.has('estadoCarga') ? 70 : 0;
    const ancho = Math.max(...rotulos.map((t) => anchoTexto(t, 20, true))) + 40 + extra;
    return [Math.max(w, rotulos.length * ancho + (rotulos.length - 1) * 10 + marcas * 40 + 12), h];
  }
  if (marcasAjustes.get(c.id)?.has('indicacion')) return [Math.max(w, 320), Math.max(h, 12 + 28 + 26 + 44 + 28)];
  if (marcasAjustes.get(c.id)?.has('filtros')) {
    // Fila de filtros (44) ademas del contenido normal.
    const [mw, mh] = c.botonNuevo ? [w, Math.max(h, 76)] : [w, h];
    return [Math.max(mw, 440), mh + 50 + (c.tipo === 'otro' || c.tipo === 'texto' ? 40 : 0)];
  }
  if (c.botonNuevo) return [Math.max(w, anchoTexto(c.botonNuevo, 18, true) + 36 + marcas * 40 + 140), Math.max(h, 76)];
  if (c.tipo === 'pie_de_pagina' || c.tipo === 'texto') {
    // El texto completo: primero se ensancha (hasta 600 px); si aun no
    // entra en una linea, el bloque crece en alto para partirlo.
    const texto = (c.textos.length ? c.textos : [c.titulo]).join(' · ');
    const largo = anchoTexto(texto, 20) + 40 + marcas * 40;
    const ancho = Math.max(w, Math.min(largo, 600));
    const lineas = Math.ceil(largo / Math.max(1, ancho - 40));
    // Separacion + margenes + lineas a 20 px + fila del titulo.
    const alto = 12 + 28 + lineas * 25 + (c.tipo === 'texto' && c.titulo ? 40 : 0);
    return [ancho, Math.max(h, alto)];
  }
  return [w, h];
}

function conMinimo(r: Rect, [minW, minH]: [number, number], pantalla: Rect): Rect {
  const out = { ...r };
  if (out.w < minW) {
    out.x -= (minW - out.w) / 2;
    out.w = minW;
  }
  if (out.h < minH) {
    out.y -= (minH - out.h) / 2;
    out.h = minH;
  }
  out.w = Math.min(out.w, pantalla.w);
  out.h = Math.min(out.h, pantalla.h);
  out.x = Math.min(Math.max(out.x, pantalla.x), pantalla.x + pantalla.w - out.w);
  out.y = Math.min(Math.max(out.y, pantalla.y), pantalla.y + pantalla.h - out.h);
  return out;
}

interface Colocado {
  c: Componente;
  r: Rect;
  min: [number, number];
}

// Mueve o recorta `m` para que deje de pisar a `f`: prueba correrlo
// (mismo tamano) o recortarlo hacia la izquierda, derecha, arriba o abajo
// de `f`, sin salir de la pantalla ni bajar de su minimo. Elige la opcion
// que conserva mas area y, a igual area, la que menos lo mueve.
function recortar(m: Colocado, f: Colocado, pantalla: Rect): Rect | null {
  const r = m.r;
  const opciones: Rect[] = [
    { ...r, w: f.r.x - r.x },
    { ...r, x: f.r.x + f.r.w, w: r.x + r.w - (f.r.x + f.r.w) },
    { ...r, h: f.r.y - r.y },
    { ...r, y: f.r.y + f.r.h, h: r.y + r.h - (f.r.y + f.r.h) },
    { ...r, x: f.r.x + f.r.w },
    { ...r, x: f.r.x - r.w },
    { ...r, y: f.r.y + f.r.h },
    { ...r, y: f.r.y - r.h },
  ].filter(
    (o) =>
      o.w >= m.min[0] - 0.5 &&
      o.h >= m.min[1] - 0.5 &&
      o.x >= pantalla.x - 0.5 &&
      o.y >= pantalla.y - 0.5 &&
      o.x + o.w <= pantalla.x + pantalla.w + 0.5 &&
      o.y + o.h <= pantalla.y + pantalla.h + 0.5,
  );
  if (!opciones.length) return null;
  const movida = (o: Rect) => Math.abs(o.x - r.x) + Math.abs(o.y - r.y);
  return opciones.sort((a, b) => area(b) - area(a) || movida(a) - movida(b))[0];
}

// Ningun recuadro pisa a otro ni queda mas chico que su minimo: se recorta
// primero el de menor prioridad (o el mas grande); si eso lo deja
// demasiado chico, se recorta el otro; si tampoco se puede, se descarta el
// mas chico.
function resolverSuperposiciones(items: Colocado[], pantalla: Rect) {
  let lista = [...items];
  for (let vuelta = 0; vuelta < 80; vuelta++) {
    let cambio = false;
    for (let i = 0; i < lista.length && !cambio; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const a = lista[i];
        const b = lista[j];
        const k = cruce(a.r, b.r);
        if (!k) continue;
        cambio = true;
        const [fijo, movil] =
          a.c.prioridad !== b.c.prioridad
            ? a.c.prioridad
              ? [a, b]
              : [b, a]
            : area(a.r) <= area(b.r)
              ? [a, b]
              : [b, a];
        if (area(k) >= area(movil.r) * 0.85) {
          lista = lista.filter((x) => x !== movil);
          break;
        }
        // Se recorta el que pierde menos (en proporcion a su tamano).
        const r1 = recortar(movil, fijo, pantalla);
        const r2 = recortar(fijo, movil, pantalla);
        // A igual perdida, el que menos se mueve.
        const costo = (antes: Rect, despues: Rect | null) =>
          despues
            ? (1 - area(despues) / Math.max(1, area(antes))) * 10000 +
              Math.abs(despues.x - antes.x) +
              Math.abs(despues.y - antes.y)
            : Infinity;
        if (r1 || r2) {
          if (costo(movil.r, r1) <= costo(fijo.r, r2)) movil.r = r1!;
          else fijo.r = r2!;
          break;
        }
        const menor = area(a.r) < area(b.r) ? a : b;
        lista = lista.filter((x) => x !== menor);
        break;
      }
    }
    if (!cambio) break;
  }
  return lista;
}

// Rotulo del boton que se agrega ("Añadir un boton de exportacion" ->
// "Exportar").
function rotuloBoton(recomendacion: string): string {
  const t = sinAcentos(recomendacion);
  if (/export/.test(t)) return 'Exportar';
  if (/descarg/.test(t)) return 'Descargar';
  if (/filtr/.test(t)) return 'Filtrar';
  if (/ayuda/.test(t)) return 'Ayuda';
  if (/compart/.test(t)) return 'Compartir';
  if (/busc/.test(t)) return 'Buscar';
  if (/imprim/.test(t)) return 'Imprimir';
  return 'Nueva acción';
}

export async function dibujarBoceto(
  imagen: Buffer,
  estructuraGemini: Estructura | null,
  pedidas: CorreccionPedida[],
  archivo: string,
): Promise<ResultadoBoceto> {
  const muestra = await muestrear(imagen);
  const meta = await sharp(imagen).rotate().metadata();
  const proporcion = (meta.height ?? muestra.alto) / (meta.width ?? muestra.ancho);

  let estructura = estructuraGemini;
  if (!estructura || estructura.componentes.length === 0) {
    estructura = estructuraPorPixeles(muestra);
    const base = estructura.componentes.length;
    pedidas
      .filter((p) => p.zona)
      .forEach((p, i) => estructura!.componentes.push(componenteDeZona(p, base + i)));
  }
  for (const c of estructura.componentes) Object.assign(c, tonoDeCaja(muestra, c.caja));
  // El fondo de la pagina se mide en la captura; no se confia en lo que
  // diga el modelo.
  estructura.fondoPagina = fondoMedido(muestra) < 110 ? 'oscuro' : 'claro';

  // Tamano de la pantalla redibujada.
  let W = ANCHO_PANTALLA;
  let H = Math.round(W * proporcion);
  if (H > ALTO_MAX_PANTALLA) {
    H = ALTO_MAX_PANTALLA;
    W = Math.max(1100, Math.round(H / proporcion));
  }
  const y0 = ALTO_CABECERA;

  // 1) Que correccion va en que componente (por las cajas de Gemini).
  filtrosEn.clear();
  const correcciones = asignar(estructura.componentes, pedidas);
  const porId = new Map(estructura.componentes.map((c) => [c.id, c as ConBoton]));
  for (const k of correcciones) {
    if (!k.ajustes.includes('agregarBoton')) continue;
    // El boton nuevo va en un solo lugar: un boton existente si lo hay.
    const rotulo = rotuloBoton(k.recomendacion);
    const destino =
      k.componentes.map((id) => porId.get(id)!).find((c) => c.tipo === 'boton') ??
      porId.get(k.componentes[0]);
    if (destino) destino.botonNuevo = rotulo;
    if (k.ajustes.length === 1 && destino) k.componentes = [destino.id];
    k.aplicado = k.aplicado.replace('botón nuevo agregado en ese lugar', `botón «${rotulo}» agregado en ese lugar`);
  }
  // Los filtros se dibujan una sola vez: en el grafico o tabla mas arriba
  // (o el primero) de los que toca la correccion.
  for (const k of correcciones) {
    if (!k.ajustes.includes('filtros') || k.componentes.length < 2) continue;
    const candidatos = k.componentes.map((id) => porId.get(id)!).sort((a, b) => a.caja[0] - b.caja[0] || a.caja[1] - b.caja[1]);
    const principal =
      candidatos.find((c) => c.tipo === 'grafico' || c.tipo === 'tabla' || c.tipo === 'formulario') ?? candidatos[0];
    if (k.ajustes.length === 1) k.componentes = [principal.id];
    filtrosEn.set(k.n, principal.id);
  }
  const marcasPorId = new Map<number, number>();
  marcasAjustes.clear();
  for (const k of correcciones) {
    for (const id of k.componentes) {
      marcasPorId.set(id, (marcasPorId.get(id) ?? 0) + 1);
      const s = marcasAjustes.get(id) ?? new Set<string>();
      k.ajustes.forEach((x) => {
        if (x !== 'filtros' || (filtrosEn.get(k.n) ?? id) === id) s.add(x);
      });
      marcasAjustes.set(id, s);
    }
  }

  // 2) Recuadros con su tamano minimo y sin superposiciones.
  const pantallaRect = { x: 0, y: y0, w: W, h: H };
  const colocados = resolverSuperposiciones(
    estructura.componentes.map((c) => {
      const min = minimoDe(c as ConBoton, marcasPorId.get(c.id) ?? 0);
      return {
        c,
        min,
        r: conMinimo(
          {
            x: (c.caja[1] / 1000) * W,
            y: y0 + (c.caja[0] / 1000) * H,
            w: ((c.caja[3] - c.caja[1]) / 1000) * W,
            h: ((c.caja[2] - c.caja[0]) / 1000) * H,
          },
          min,
          pantallaRect,
        ),
      };
    }),
    pantallaRect,
  );
  const visibles = colocados.map((x) => x.c);
  // Si un componente se descarto al ordenar, su correccion pasa a general.
  const ids = new Set(visibles.map((c) => c.id));
  for (const k of correcciones) {
    k.componentes = k.componentes.filter((id) => ids.has(id));
    if (!k.componentes.length) k.ubicacionUsada = 'general';
  }

  // Ajustes e insignias por componente.
  const ajustesDe = new Map<number, Set<string>>();
  const marcasDe = new Map<number, Marca[]>();
  for (const k of correcciones) {
    for (const id of k.componentes) {
      const s = ajustesDe.get(id) ?? new Set<string>();
      k.ajustes.forEach((a) => {
        if (a !== 'filtros' || (filtrosEn.get(k.n) ?? id) === id) s.add(a);
      });
      ajustesDe.set(id, s);
      // La insignia va donde esta el recuadro (o donde se dedujo); en los
      // graficos agregados por "todos los graficos" tambien.
      const m = marcasDe.get(id) ?? [];
      m.push({ n: k.n, severidad: k.severidad });
      marcasDe.set(id, m);
    }
  }

  const fondoPagina = estructura.fondoPagina === 'oscuro' ? '#2a2a2a' : '#f3f3f3';
  let pantalla = `<rect x="0" y="${y0}" width="${W}" height="${H}" fill="${fondoPagina}"/>`;
  for (const { c, r } of colocados) {
    const media = SEPARACION / 2;
    const rect = { x: r.x + media, y: r.y + media, w: r.w - SEPARACION, h: r.h - SEPARACION };
    pantalla += dibujarComponente(c, rect, [...(ajustesDe.get(c.id) ?? [])] as never, marcasDe.get(c.id) ?? []);
  }

  // ---- Lista de correcciones al costado ----
  const px = W + 28;
  const anchoLista = ANCHO_PANEL - 56;
  let panel = '';
  let py = y0 + 28;
  panel += textoSvg(['Correcciones aplicadas'], px, py, 28, { negrita: true, color: '#111' });
  py += 50;
  for (const k of correcciones) {
    panel += insignia(px + 18, py + 16, k.n, k.severidad, 18);
    const tx = px + 50;
    const ancho = anchoLista - 50;
    const titulo = partir(`${k.heuristica} · sev. ${k.severidad} · ${k.titulo}`, ancho, 21, true);
    panel += textoSvg(titulo, tx, py, 21, { negrita: true, color: '#111' });
    py += titulo.length * 26 + 4;
    const aplicado = partir(`Aplicado: ${k.aplicado}.`, ancho, 19);
    panel += textoSvg(aplicado, tx, py, 19, { color: '#2b2b2b' });
    py += aplicado.length * 24;
    const nota =
      k.ubicacionUsada === 'deducida'
        ? 'Sin recuadro de Gemini: ubicado por sentido común.'
        : k.ubicacionUsada === 'general'
          ? 'Sin recuadro ni lugar claro: aplica a toda la pantalla.'
          : '';
    if (nota) {
      const l = partir(nota, ancho, 18);
      panel += textoSvg(l, tx, py + 2, 18, { cursiva: true, color: '#444' });
      py += l.length * 23 + 2;
    }
    py += 22;
  }
  const origen =
    estructura.origen === 'gemini'
      ? `Estructura de la pantalla leída por Gemini (${estructura.modelo}) y redibujada por código.`
      : 'Estructura detectada en los bloques de la captura (Gemini no respondió) y redibujada por código.';
  const pie = partir(`${origen} Es un boceto, no un diseño final.`, anchoLista, 18);
  panel += textoSvg(pie, px, py, 18, { color: '#444' });
  py += pie.length * 23 + 28;

  // ---- Cabecera con las correcciones generales ----
  const generales = correcciones.filter((k) => k.componentes.length === 0);
  const anchoTotal = W + ANCHO_PANEL;
  const altoTotal = Math.max(y0 + H, py);
  let cabecera = `<rect x="0" y="0" width="${anchoTotal}" height="${ALTO_CABECERA}" fill="#262626"/>`;
  const anchoGenerales = generales.length ? anchoTexto('Generales:', 20, true) + 16 + generales.length * 44 : 0;
  const titulo = encajar(
    `Boceto automático · ${archivo} · ${correcciones.length} ${correcciones.length === 1 ? 'corrección aplicada' : 'correcciones aplicadas'}`,
    anchoTotal - 56 - anchoGenerales,
    ALTO_CABECERA - 20,
    { max: 28, negrita: true, maxLineas: 1 },
  );
  cabecera += textoSvg(titulo.lineas, 28, (ALTO_CABECERA - titulo.tam * 1.25) / 2, titulo.tam, { negrita: true, color: '#fff' });
  if (generales.length) {
    let gx = anchoTotal - 28 - generales.length * 44;
    cabecera += textoSvg(['Generales:'], gx - 12, (ALTO_CABECERA - 25) / 2, 20, { negrita: true, color: '#fff', ancla: 'end' });
    for (const k of generales) {
      cabecera += insignia(gx + 20, ALTO_CABECERA / 2, k.n, k.severidad, 18);
      gx += 44;
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${anchoTotal}" height="${altoTotal}">` +
    `<rect width="${anchoTotal}" height="${altoTotal}" fill="#ffffff"/>` +
    pantalla +
    `<rect x="${W}" y="${y0}" width="${ANCHO_PANEL}" height="${altoTotal - y0}" fill="#efefef"/>` +
    `<line x1="${W}" y1="${y0}" x2="${W}" y2="${altoTotal}" stroke="#9a9a9a" stroke-width="2"/>` +
    panel +
    cabecera +
    `</svg>`;

  const png = await sharp(Buffer.from(svg)).grayscale().png({ compressionLevel: 9 }).toBuffer();
  return {
    png,
    ancho: anchoTotal,
    alto: altoTotal,
    correcciones,
    estructura: {
      origen: estructura.origen,
      modelo: estructura.modelo,
      componentes: visibles.length,
    },
  };
}
