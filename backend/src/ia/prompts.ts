import { CATEGORIA_OTROS, CategoriaUx, MIN_ALTAS_RECURRENTE, MIN_PRUEBAS_RECURRENTE, REGLAS } from './reglas';

// Prompts y esquemas de respuesta que se envian a Gemini. Los esquemas usan
// el subconjunto de OpenAPI que acepta generationConfig.responseSchema.

const CATEGORIAS = [...REGLAS, CATEGORIA_OTROS];

// ---- POST /ia/analizar ----

export interface RespuestaAnalisisGemini {
  // Solo lectura cualitativa: las cifras del resumen las calcula el servidor
  // a partir de la clasificacion, para que no contradigan las tablas.
  resumen: { patrones: string[]; prioridad: string };
  clasificacion: {
    id: string;
    categoria: CategoriaUx;
    confianza: 'alta' | 'media' | 'baja';
    justificacion: string;
  }[];
  historias: {
    categoria: CategoriaUx;
    nombre: string;
    quiero: string;
    para: string;
    criterios: string[];
  }[];
}

export function instruccionesAnalisis(): string {
  const categorias = CATEGORIAS.map(
    (c) => `- ${c.categoria}: ${c.nombre}. ${c.descripcion}`,
  ).join('\n');
  return `Eres un analista de experiencia de usuario (UX) que revisa los hallazgos de pruebas de usabilidad de un sistema web. Responde siempre en español neutro y solo con el JSON pedido.

Recibirás una lista de observaciones escritas por evaluadores. Cada una tiene id, texto, severidad (alta = impide completar la tarea, media = la retrasa, baja = molestia menor), la pantalla evaluada y el id de la prueba.

Tareas:
1. clasificacion: asigna CADA observación (usa su id exacto) a una sola categoría de esta lista, la que mejor describe el problema de fondo, no la pantalla donde ocurrió:
${categorias}
   Usa "otros" solo si de verdad no encaja en ninguna. Indica tu confianza (alta, media o baja) y una justificación de una frase.
2. resumen: el sistema ya calcula las cifras (cuántas observaciones, qué categoría tiene más impacto, qué pantallas tienen más problemas graves), así que NO las menciones ni digas qué categoría es la principal. En "patrones" escribe 2 o 3 frases cortas sobre los problemas de fondo que se repiten entre observaciones y pantallas (por ejemplo, falta de explicaciones o de confirmaciones). En "prioridad" escribe una frase con qué conviene corregir primero y por qué, pensando en la severidad. Usa solo lo que dicen las observaciones.
3. historias: una categoría es recurrente si, según TU clasificación, aparece en ${MIN_PRUEBAS_RECURRENTE} o más pruebas distintas (pruebaId) o tiene ${MIN_ALTAS_RECURRENTE} o más observaciones de severidad alta. Para cada categoría recurrente distinta de "otros", redacta una historia de usuario: "nombre" (máximo 90 caracteres, empieza con un verbo en infinitivo, describe el objetivo del usuario), "quiero" y "para" (para completar la frase "Como evaluador de usabilidad, quiero …, para …", en minúscula y sin punto final) y de 2 a 4 "criterios" de aceptación verificables y concretos, relacionados con las observaciones. Si no hay categorías recurrentes, devuelve una lista vacía.`;
}

export function esquemaAnalisisGemini(): Record<string, unknown> {
  const enumCategorias = CATEGORIAS.map((c) => c.categoria);
  return {
    type: 'OBJECT',
    properties: {
      resumen: {
        type: 'OBJECT',
        properties: {
          patrones: { type: 'ARRAY', items: { type: 'STRING' } },
          prioridad: { type: 'STRING' },
        },
        required: ['patrones', 'prioridad'],
      },
      clasificacion: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING' },
            categoria: { type: 'STRING', enum: enumCategorias },
            confianza: { type: 'STRING', enum: ['alta', 'media', 'baja'] },
            justificacion: { type: 'STRING' },
          },
          required: ['id', 'categoria', 'confianza', 'justificacion'],
        },
      },
      historias: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            categoria: { type: 'STRING', enum: enumCategorias },
            nombre: { type: 'STRING' },
            quiero: { type: 'STRING' },
            para: { type: 'STRING' },
            criterios: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['categoria', 'nombre', 'quiero', 'para', 'criterios'],
        },
      },
    },
    required: ['resumen', 'clasificacion', 'historias'],
  };
}

// ---- POST /ia/evaluar-captura ----

export const HEURISTICAS = [
  { codigo: 'H1', nombre: 'Visibilidad del estado del sistema' },
  { codigo: 'H2', nombre: 'Relación entre el sistema y el mundo real' },
  { codigo: 'H3', nombre: 'Control y libertad del usuario' },
  { codigo: 'H4', nombre: 'Consistencia y estándares' },
  { codigo: 'H5', nombre: 'Prevención de errores' },
  { codigo: 'H6', nombre: 'Reconocer antes que recordar' },
  { codigo: 'H7', nombre: 'Flexibilidad y eficiencia de uso' },
  { codigo: 'H8', nombre: 'Diseño estético y minimalista' },
  { codigo: 'H9', nombre: 'Ayudar a reconocer, diagnosticar y recuperarse de errores' },
  { codigo: 'H10', nombre: 'Ayuda y documentación' },
] as const;

export type CodigoHeuristica = (typeof HEURISTICAS)[number]['codigo'];

export const SIGNIFICADO_SEVERIDAD_NIELSEN = [
  'No es un problema de usabilidad',
  'Cosmético: se corrige solo si sobra tiempo',
  'Menor: prioridad baja',
  'Mayor: importante corregirlo, prioridad alta',
  'Catastrófico: hay que corregirlo antes de liberar',
];

export interface RespuestaCapturaGemini {
  esInterfaz: boolean;
  pantalla: string;
  resumen: string;
  hallazgos: {
    heuristica: CodigoHeuristica;
    severidad: number;
    titulo: string;
    problema: string;
    ubicacion: string;
    recomendacion: string;
    zona?: number[];
  }[];
}

export function instruccionesCaptura(): string {
  const heuristicas = HEURISTICAS.map((h) => `${h.codigo} ${h.nombre}`).join('\n');
  const escala = SIGNIFICADO_SEVERIDAD_NIELSEN.map((s, i) => `${i} = ${s}`).join('\n');
  return `Eres un experto en usabilidad que hace evaluaciones heurísticas con las 10 heurísticas de Jakob Nielsen. Responde siempre en español neutro y solo con el JSON pedido.

Recibirás una captura de pantalla de una interfaz (por ejemplo un dashboard, un formulario o una página web). Inspecciónala como en una evaluación heurística formal:

Heurísticas:
${heuristicas}

Escala de severidad de Nielsen:
${escala}

Instrucciones:
- "esInterfaz": false si la imagen no es una interfaz de software (por ejemplo una foto o un documento escaneado); en ese caso deja "hallazgos" vacío.
- "pantalla": qué tipo de pantalla es y su propósito aparente, en una frase.
- "hallazgos": cada problema que se VEA en la imagen. Por cada uno: la heurística que incumple (un solo código, la más directa), la severidad de 1 a 4, un título corto, "problema" (qué se ve y por qué afecta al usuario), "ubicacion" (dónde está en la pantalla, para encontrarlo en la captura) y "recomendacion" (una acción concreta y aplicable para corregirlo).
- Básate solo en lo que es visible. No supongas comportamientos que la imagen no muestra; si algo depende de la interacción (por ejemplo qué pasa al hacer clic), dilo en el problema como algo a verificar y baja la severidad.
- Incluye problemas de contraste, jerarquía visual, etiquetas, terminología, consistencia, densidad de información y estados vacíos o de error cuando se vean.
- No repitas el mismo problema en varias heurísticas. Entre 3 y 12 hallazgos es lo normal; no inventes problemas para llenar.
- "zona": el recuadro del elemento afectado en la captura, como [ymin, xmin, ymax, xmax] normalizado de 0 a 1000. Si el problema es de toda la pantalla, usa [0, 0, 1000, 1000].
- "resumen": 2 o 3 frases con la valoración general y lo más urgente de corregir.`;
}

export function esquemaCaptura(): Record<string, unknown> {
  return {
    type: 'OBJECT',
    properties: {
      esInterfaz: { type: 'BOOLEAN' },
      pantalla: { type: 'STRING' },
      resumen: { type: 'STRING' },
      hallazgos: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            heuristica: { type: 'STRING', enum: HEURISTICAS.map((h) => h.codigo) },
            severidad: { type: 'INTEGER', minimum: 0, maximum: 4 },
            titulo: { type: 'STRING' },
            problema: { type: 'STRING' },
            ubicacion: { type: 'STRING' },
            recomendacion: { type: 'STRING' },
            // [ymin, xmin, ymax, xmax] de 0 a 1000, como los recuadros de
            // Gemini. Solo lo usa el boceto del prototipo corregido.
            zona: {
              type: 'ARRAY',
              items: { type: 'INTEGER' },
              minItems: 4,
              maxItems: 4,
            },
          },
          required: ['heuristica', 'severidad', 'titulo', 'problema', 'ubicacion', 'recomendacion'],
        },
      },
    },
    required: ['esInterfaz', 'pantalla', 'resumen', 'hallazgos'],
  };
}

// Pedido para el modelo de imagen de POST /ia/generar-prototipo: editar la
// misma captura aplicando las recomendaciones, sin inventar otra pantalla.
export function pedidoPrototipo(
  correcciones: { heuristica: string; titulo: string; ubicacion: string; recomendacion: string }[],
): string {
  const lista = correcciones
    .map((c, i) => `${i + 1}. [${c.heuristica}] ${c.titulo}. Dónde: ${c.ubicacion}. Corrección: ${c.recomendacion}`)
    .join('\n');
  return `Esta imagen es la captura de una interfaz de software. Genera una versión corregida de ESTA MISMA pantalla, como si fuera el siguiente diseño de alta fidelidad, aplicando estas correcciones de una evaluación heurística de Nielsen:

${lista}

Reglas:
- Mantén la misma estructura, tamaño, paleta de colores, datos y textos de la captura; cambia solo lo necesario para aplicar cada corrección.
- Los textos nuevos van en español y deben ser legibles.
- No agregues marcas de agua, anotaciones, flechas ni números de corrección: debe verse como la pantalla real ya corregida.`;
}
