import { Componente, TipoComponente } from './estructura';

// Traduce la recomendacion de cada hallazgo a cambios concretos del dibujo
// y decide a que componentes se aplica.

export type Ajuste =
  | 'plano2d'
  | 'tonoSuave'
  | 'leyendaGrande'
  | 'etiquetasDirectas'
  | 'redondear'
  | 'agrupar'
  | 'zoom'
  | 'alinear'
  | 'contraste'
  | 'espaciado'
  | 'jerarquia'
  | 'botonGrande'
  | 'agregarBoton'
  | 'enlacesClaros'
  | 'ayuda'
  | 'filtros'
  | 'secciones'
  | 'indicacion'
  | 'estilo'
  | 'estadoCarga';

// Que se dibujo, para la lista "Aplicado: ..." del costado.
export const DESCRIPCION_AJUSTE: Record<Ajuste, string> = {
  plano2d: 'gráfico redibujado plano, en 2D, sin perspectiva',
  tonoSuave: 'fondo en un tono suave en lugar del color saturado',
  leyendaGrande: 'leyenda y rótulos de los ejes más grandes y legibles',
  etiquetasDirectas: 'series rotuladas junto a sus datos donde hay espacio',
  redondear: 'números redondeados, sin decimales',
  agrupar: 'datos agrupados en menos puntos (por período)',
  zoom: 'control para elegir el rango de fechas',
  alinear: 'elementos alineados en una rejilla, con márgenes uniformes',
  contraste: 'texto oscuro sobre fondo claro, con más contraste',
  espaciado: 'más espacio entre elementos',
  jerarquia: 'título más grande para marcar la jerarquía',
  botonGrande: 'botón o enlace más grande, fácil de pulsar',
  agregarBoton: 'botón nuevo agregado en ese lugar',
  enlacesClaros: 'acciones como enlaces subrayados con ícono, iguales en todas las filas',
  ayuda: 'ícono de ayuda junto al título',
  filtros: 'filtros activos visibles como etiquetas',
  secciones: 'opciones agrupadas en secciones con título',
  indicacion: 'campos con texto de ejemplo y una indicación del formato',
  estilo: 'mismo estilo, tipografía y escala de grises en todos los componentes',
  estadoCarga: 'indicador de carga visible mientras se actualizan los datos',
};

const REGLAS: [Ajuste, RegExp][] = [
  ['plano2d', /\b[23] ?d\b|tridimension|bidimension|perspectiva|profundidad|volumen|graficos? planos?/],
  ['tonoSuave', /saturad|desatur|paleta|tonos? (mas )?suave|colou?r(es)? (mas )?(suave|neutr|sobri)|(llamativ|brillant|intens|chillon)|fondo azul|reduc\w* (el |la )?(uso del )?colou?r/],
  ['leyendaGrande', /leyenda|tamano de (la )?(fuente|letra)|(fuente|letra|texto)s? (mas )?grande|aumentar (el tamano|la fuente)|ilegib|ampliar (el )?texto/],
  ['etiquetasDirectas', /directamente sobre|etiquetas? (de datos )?(directas|sobre)|rotul/],
  ['redondear', /redonde|decimal|cifras significativas|numeros enteros|precision (numerica|excesiva|decimal)/],
  ['agrupar', /agrup|period|menos (datos|puntos)|simplific|saturacion de informacion|demasiad|sobrecarg|resumi|filtrar los datos/],
  ['zoom', /zoom|scroll|desplaz|rango de fechas/],
  ['alinear', /aline|rejilla|grilla|margen|margenes|uniform/],
  ['contraste', /contraste/],
  ['espaciado', /espacio en blanco|densidad|separac|espaciad|aire/],
  ['jerarquia', /jerarqu|titulo/],
  ['botonGrande', /(boton|enlace|area)\w* (de clic )?(mas )?(grande|ampli)|area de clic|tamano del (boton|enlace)|tactil/],
  ['agregarBoton', /(anadir|agregar|incluir|incorporar|crear|ofrecer) (un |una )?(nuevo |nueva )?(boton|opcion|accion)/],
  ['enlacesClaros', /enlace|hipervinculo|subrayad|icono (mas claro )?de accion/],
  ['ayuda', /ayuda|tooltip|documentacion|instruccion/],
  ['filtros', /filtro/],
  ['estilo', /estandariz|unific\w* (el )?estilo|mismo estilo|consistencia visual|tipograf|familia de (fuente|letra)/],
  ['indicacion', /placeholder|texto de (ejemplo|ayuda)|marcador de posicion|recordatorio|indicacion del formato|formato (de|esperado)|campos? vacios?/],
  ['estadoCarga', /estado de carga|cargando|spinner|indicador de (carga|progreso)|barra de progreso|mientras (se )?(actualiza|carga)/],
];

export function sinAcentos(t: string) {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Reglas mas estrictas para el titulo, que describe el problema.
const TITULO_DECIDE: [Ajuste, RegExp][] = [
  ['plano2d', /\b3 ?d\b|tridimension|perspectiva/],
  ['redondear', /precision (numerica|excesiva)|decimales/],
  ['tonoSuave', /saturad|colou?r(es)? (llamativ|brillant|intens|chillon)/],
  ['agrupar', /saturacion de (la )?informacion|sobrecarga de (datos|informacion)|exceso de datos/],
];

export function ajustesDe(recomendacion: string, titulo: string): Ajuste[] {
  // La recomendacion manda; el titulo solo desempata (p. ej. "efectos 3D").
  const reco = sinAcentos(recomendacion);
  const todo = `${reco} ${sinAcentos(titulo)}`;
  const set = new Set<Ajuste>();
  for (const [ajuste, regla] of REGLAS) if (regla.test(reco)) set.add(ajuste);
  if (!set.size) for (const [ajuste, regla] of REGLAS) if (regla.test(todo)) set.add(ajuste);
  // Algunos problemas se reconocen por el titulo aunque la recomendacion
  // no los nombre ("Uso excesivo de graficos 3D" -> plano 2D).
  const tit = sinAcentos(titulo);
  for (const [ajuste, regla] of TITULO_DECIDE) if (regla.test(tit)) set.add(ajuste);
  // "agrupar por meses" no es "zoom"; "zoom/scroll" si lo es.
  if (set.has('etiquetasDirectas')) set.add('leyendaGrande');
  return [...set];
}

export interface CorreccionPedida {
  n: number;
  heuristica: string;
  severidad: number;
  titulo: string;
  problema?: string;
  ubicacion: string;
  recomendacion: string;
  zona?: [number, number, number, number];
}

export type Ubicacion = 'recuadro' | 'deducida' | 'general';

export interface CorreccionAplicada extends CorreccionPedida {
  ajustes: Ajuste[];
  componentes: number[];
  ubicacionUsada: Ubicacion;
  aplicado: string;
}

function area(c: [number, number, number, number]) {
  return Math.max(0, c[2] - c[0]) * Math.max(0, c[3] - c[1]);
}

function interseccion(a: [number, number, number, number], b: [number, number, number, number]) {
  const y0 = Math.max(a[0], b[0]);
  const x0 = Math.max(a[1], b[1]);
  const y1 = Math.min(a[2], b[2]);
  const x1 = Math.min(a[3], b[3]);
  return y1 > y0 && x1 > x0 ? (y1 - y0) * (x1 - x0) : 0;
}

// Palabras de la ubicacion que apuntan a un tipo de componente.
const PISTAS: [RegExp, TipoComponente[]][] = [
  [/menu|navegacion|barra lateral|lateral|sidebar|icono/, ['menu_lateral', 'menu_superior']],
  [/encabezado|cabecera|barra superior|parte superior/, ['encabezado', 'menu_superior']],
  [/grafic|barras|torta|pastel|circular|linea|serie|leyenda|eje|porcentaj/, ['grafico']],
  [/tabla|fila|columna/, ['tabla']],
  [/pie de pagina|copyright|derechos/, ['pie_de_pagina']],
  [/tarjeta|kpi|indicador|metrica/, ['tarjeta_kpi']],
  [/boton|enlace/, ['boton']],
  [/busca/, ['buscador']],
  [/formulario|campo/, ['formulario']],
];

const FORMAS: [RegExp, string][] = [
  [/torta|pastel|circular|porcion|porcentaj/, 'torta'],
  [/barras|columnas/, 'barras'],
  [/\bareas?\b/, 'area'],
  [/linea/, 'lineas'],
];

// Decide a que componentes va cada correccion. Con recuadro, por
// superposicion; sin recuadro, por las palabras de la ubicacion (titulo
// del grafico citado, "menu", "torta"...). Si nada encaja, es general.
export function asignar(
  componentes: Componente[],
  pedidas: CorreccionPedida[],
): CorreccionAplicada[] {
  return pedidas.map((p) => {
    const ajustes = ajustesDe(p.recomendacion, p.titulo);
    let elegidos: number[] = [];
    let ubicacionUsada: Ubicacion = 'general';

    if (p.zona) {
      const az = area(p.zona);
      const puntaje = componentes
        .map((c) => {
          const i = interseccion(c.caja, p.zona!);
          return { id: c.id, deZona: i / az, deComp: i / Math.max(1, area(c.caja)) };
        })
        .filter((x) => x.deZona > 0);
      elegidos = puntaje.filter((x) => x.deComp >= 0.3 || x.deZona >= 0.5).map((x) => x.id);
      if (!elegidos.length && puntaje.length) {
        elegidos = [puntaje.sort((a, b) => b.deZona - a.deZona)[0].id];
      }
      if (elegidos.length) ubicacionUsada = 'recuadro';
    }

    if (!elegidos.length) {
      const donde = sinAcentos(`${p.ubicacion} ${p.titulo} ${p.problema ?? ''}`);
      // 1) Titulo del componente citado en la ubicacion.
      const porTitulo = componentes.filter(
        (c) => c.titulo.length >= 4 && donde.includes(sinAcentos(c.titulo).slice(0, 24)),
      );
      if (porTitulo.length) {
        elegidos = porTitulo.map((c) => c.id);
      } else {
        for (const [regla, tipos] of PISTAS) {
          if (!regla.test(donde)) continue;
          let candidatos = componentes.filter((c) => tipos.includes(c.tipo));
          if (tipos.includes('grafico')) {
            const formas = FORMAS.filter(([r]) => r.test(donde)).map(([, f]) => f);
            const deForma = candidatos.filter((c) => formas.includes(c.grafico?.forma ?? ''));
            if (deForma.length) candidatos = deForma;
          }
          if (candidatos.length) {
            elegidos = candidatos.map((c) => c.id);
            break;
          }
        }
      }
      if (elegidos.length) ubicacionUsada = 'deducida';
    }

    // Lo que se recomienda para "los graficos" vale para todos los graficos.
    if (ajustes.includes('plano2d') && /\blos graficos\b|todos los graficos/.test(sinAcentos(p.recomendacion))) {
      for (const c of componentes) if (c.tipo === 'grafico' && !elegidos.includes(c.id)) elegidos.push(c.id);
    }

    // "Agrupar" en un menu o lista no es agrupar datos: son secciones.
    if (ajustes.includes('agrupar') && elegidos.length && !elegidos.some((id) => componentes.find((c) => c.id === id)?.tipo === 'grafico')) {
      ajustes.splice(ajustes.indexOf('agrupar'), 1, 'secciones');
      if (ajustes.includes('zoom') && !/zoom|desplaz|rango/.test(sinAcentos(p.recomendacion))) ajustes.splice(ajustes.indexOf('zoom'), 1);
    }
    const aplicado = ajustes.length
      ? ajustes.map((a) => DESCRIPCION_AJUSTE[a]).join('; ')
      : 'componente redibujado limpio siguiendo la recomendación';
    return { ...p, ajustes, componentes: elegidos, ubicacionUsada, aplicado };
  });
}
