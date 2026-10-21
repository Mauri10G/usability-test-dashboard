// Texto en SVG que entra siempre en su espacio: se mide con anchos
// aproximados de Arial, se parte en lineas y se achica hasta un minimo
// legible al proyectar. Si aun asi no entra, se cortan lineas enteras y
// la ultima termina en "…", nunca a mitad del dibujo.

export const FUENTE = 'Arial, Helvetica, sans-serif';
export const TAM_MIN = 18;
export const INTERLINEA = 1.25;

export function escapar(t: string) {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Ancho relativo (em) por caracter, aproximado a Arial.
function anchoCaracter(c: string): number {
  if (c === ' ' || c === '\u00a0') return 0.28;
  if ('il.,:;\'|!ftjrI()[]'.includes(c)) return 0.3;
  if ('mwMW@%'.includes(c)) return 0.86;
  if (/[0-9$]/.test(c)) return 0.56;
  if ('MW'.includes(c)) return 0.86;
  if (c >= 'A' && c <= 'Z') return 0.72;
  if (/[ÁÉÍÓÚÑ]/.test(c)) return 0.72;
  return 0.53;
}

export function anchoTexto(t: string, tam: number, negrita = false): number {
  let w = 0;
  for (const c of t) w += anchoCaracter(c);
  // 6 % de margen: es mejor que sobre espacio a que el texto se salga.
  return w * tam * (negrita ? 1.08 : 1) * 1.06;
}

export function partir(t: string, ancho: number, tam: number, negrita = false): string[] {
  const lineas: string[] = [];
  let actual = '';
  // Solo el espacio comun parte lineas: el espacio duro (\u00a0) mantiene
  // juntos "60 %" o "— 26 %".
  for (const palabra of t.split(/[ \t\n]+/).filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (anchoTexto(prueba, tam, negrita) <= ancho) {
      actual = prueba;
      continue;
    }
    if (actual) lineas.push(actual);
    // Palabra mas larga que la linea: se parte con guion.
    let resto = palabra;
    while (anchoTexto(resto, tam, negrita) > ancho && resto.length > 2) {
      let i = resto.length - 1;
      while (i > 1 && anchoTexto(resto.slice(0, i) + '-', tam, negrita) > ancho) i--;
      lineas.push(resto.slice(0, i) + '-');
      resto = resto.slice(i);
    }
    actual = resto;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

export interface TextoEncajado {
  tam: number;
  lineas: string[];
  alto: number;
  recortado: boolean;
}

// El tamano mas grande entre max y min con el que el texto entra completo.
export function encajar(
  t: string,
  ancho: number,
  alto: number,
  o: { max: number; min?: number; negrita?: boolean; maxLineas?: number },
): TextoEncajado {
  const min = o.min ?? TAM_MIN;
  for (let tam = o.max; tam >= min; tam--) {
    const lineas = partir(t, ancho, tam, o.negrita);
    const h = lineas.length * tam * INTERLINEA;
    if (h <= alto && lineas.length <= (o.maxLineas ?? Infinity)) {
      return { tam, lineas, alto: h, recortado: false };
    }
  }
  const lineas = partir(t, ancho, min, o.negrita);
  const caben = Math.max(1, Math.min(o.maxLineas ?? Infinity, Math.floor(alto / (min * INTERLINEA))));
  if (lineas.length <= caben) {
    return { tam: min, lineas, alto: lineas.length * min * INTERLINEA, recortado: false };
  }
  const cortadas = lineas.slice(0, caben);
  let ultima = cortadas[caben - 1];
  while (ultima.includes(' ') && anchoTexto(ultima + ' …', min, o.negrita) > ancho) {
    ultima = ultima.slice(0, ultima.lastIndexOf(' '));
  }
  cortadas[caben - 1] = ultima.replace(/[-,;:]$/, '') + ' …';
  return { tam: min, lineas: cortadas, alto: caben * min * INTERLINEA, recortado: true };
}

// Lineas con la parte de arriba en y.
export function textoSvg(
  lineas: string[],
  x: number,
  y: number,
  tam: number,
  o: { color?: string; negrita?: boolean; ancla?: 'start' | 'middle' | 'end'; cursiva?: boolean } = {},
): string {
  return lineas
    .map(
      (l, i) =>
        `<text x="${r(x)}" y="${r(y + tam * 0.88 + i * tam * INTERLINEA)}" font-family="${FUENTE}" font-size="${tam}"` +
        `${o.negrita ? ' font-weight="bold"' : ''}${o.cursiva ? ' font-style="italic"' : ''}` +
        `${o.ancla && o.ancla !== 'start' ? ` text-anchor="${o.ancla}"` : ''} fill="${o.color ?? '#1a1a1a'}">${escapar(l)}</text>`,
    )
    .join('');
}

export function r(n: number) {
  return Math.round(n * 10) / 10;
}
