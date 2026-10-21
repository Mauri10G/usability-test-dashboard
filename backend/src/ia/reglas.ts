import { Severidad } from '../evaluaciones/entities/prueba.entity';

// Reglas del modulo 3 (IA para analisis UX). No hay un modelo entrenado:
// cada observacion se clasifica buscando palabras clave en su texto, y la
// severidad registrada por el evaluador da el peso del hallazgo. Asi cada
// resultado se puede explicar mostrando que palabras lo dispararon.

export type CategoriaUx =
  | 'navegacion'
  | 'formularios'
  | 'accesibilidad'
  | 'rendimiento'
  | 'retroalimentacion'
  | 'contenido'
  | 'visualizacion'
  | 'otros';

export interface ReglaCategoria {
  categoria: CategoriaUx;
  nombre: string;
  descripcion: string;
  // Raices sin tildes y en minusculas. Se buscan al inicio de una palabra,
  // asi "naveg" encuentra "navegar", "navegacion" y "navegue".
  // Las fuertes suman 1 punto; las debiles, palabras que aparecen en muchos
  // contextos como "boton" o "pantalla", suman medio punto.
  palabrasClave: string[];
  palabrasDebiles: string[];
  // Datos para armar la historia de usuario sugerida.
  historia: {
    nombre: string;
    quiero: string;
    para: string;
    storyPoints: number;
    criterios: string[];
  };
}

export const REGLAS: ReglaCategoria[] = [
  {
    categoria: 'navegacion',
    nombre: 'Navegación',
    descripcion: 'Encontrar pantallas, menús, enlaces y botones; saber dónde se está.',
    palabrasClave: [
      'naveg', 'menu', 'enlace', 'link', 'perdi', 'encontr', 'ubic',
      'buscar', 'busco', 'busca', 'volver', 'regres', 'atras', 'pestan',
      'ruta', 'scroll', 'desplaz', 'migas',
    ],
    palabrasDebiles: ['boton', 'clic', 'click', 'donde', 'pagina', 'pantalla'],
    historia: {
      nombre: 'Encontrar las opciones del sistema sin perderse entre pantallas',
      quiero: 'encontrar las opciones y saber en qué pantalla estoy sin tener que buscarlas',
      para: 'completar mis tareas sin perderme en el sistema',
      storyPoints: 3,
      criterios: [
        'La opción buscada se alcanza en máximo dos clics desde el menú principal.',
        'La navegación marca la pantalla actual.',
        'En una prueba de seguimiento ningún participante reporta haberse perdido.',
      ],
    },
  },
  {
    categoria: 'formularios',
    nombre: 'Formularios',
    descripcion: 'Campos, validaciones, ingreso de datos y mensajes de los formularios.',
    palabrasClave: [
      'campo', 'valid', 'input', 'llenar', 'obligatori',
      'select', 'desplegable', 'casilla', 'checkbox', 'placeholder',
      'radio', 'textarea',
    ],
    palabrasDebiles: [
      'formulario', 'escrib', 'ingres', 'complet', 'guardar', 'enviar',
      'registr', 'dato',
    ],
    historia: {
      nombre: 'Recibir validación clara en el campo exacto al llenar un formulario',
      quiero: 'que el formulario me indique qué datos faltan o están mal en el campo exacto',
      para: 'registrar la información correctamente al primer intento',
      storyPoints: 3,
      criterios: [
        'Cada campo con error muestra un mensaje debajo, en español y con contraste AA.',
        'Al fallar la validación el foco va al resumen de errores.',
        'La tasa de envíos con error baja en la siguiente prueba.',
      ],
    },
  },
  {
    categoria: 'contenido',
    nombre: 'Contenido y lenguaje',
    descripcion: 'Textos, terminología, ortografía, ayudas e instrucciones.',
    palabrasClave: [
      'palabra', 'termin', 'idioma', 'ingles', 'tilde', 'ortograf',
      'confus', 'entend', 'instruc', 'ayuda', 'explic', 'significa',
      'jerga', 'abrevia', 'sigla',
    ],
    palabrasDebiles: ['texto', 'codigo', 'titulo', 'nombre'],
    historia: {
      nombre: 'Entender los textos, abreviaturas e instrucciones sin pedir ayuda',
      quiero: 'que los textos, títulos e instrucciones usen palabras que entiendo',
      para: 'saber qué hace cada opción sin pedir ayuda',
      storyPoints: 2,
      criterios: [
        'Ningún texto visible usa códigos internos o términos en inglés.',
        'Los campos y opciones confusos tienen una ayuda corta en línea.',
      ],
    },
  },
  {
    categoria: 'accesibilidad',
    nombre: 'Accesibilidad',
    descripcion: 'Contraste, tamaño de letra, teclado, lectores de pantalla y etiquetas.',
    palabrasClave: [
      'contraste', 'legib', 'letra', 'fuente', 'tamano', 'pequen',
      'teclado', 'tabulador', 'foco', 'lector', 'etiqueta', 'label',
      'wcag', 'accesib', 'daltonic', 'zoom', 'distingu',
    ],
    palabrasDebiles: ['color', 'lee', 'claro', 'oscuro', 'icono', 'ver'],
    historia: {
      nombre: 'Usar todas las pantallas con buen contraste y solo con el teclado',
      quiero: 'poder leer y operar todas las pantallas con buen contraste y usando solo el teclado',
      para: 'usar el sistema sin barreras sin importar mis condiciones visuales o motrices',
      storyPoints: 3,
      criterios: [
        'Textos con contraste mínimo 4.5:1 y componentes con 3:1 (WCAG 2.1 AA).',
        'Todos los controles se alcanzan con Tab y muestran un foco visible.',
        'Cada campo tiene una etiqueta asociada que lee el lector de pantalla.',
      ],
    },
  },
  {
    categoria: 'rendimiento',
    nombre: 'Rendimiento',
    descripcion: 'Tiempos de carga, lentitud, bloqueos y respuestas tardías.',
    palabrasClave: [
      'lent', 'demor', 'tard', 'cargando', 'carga', 'esper', 'bloque',
      'congel', 'colg', 'timeout', 'rendimiento', 'spinner',
    ],
    palabrasDebiles: ['rapid', 'segundo', 'respuesta', 'tiempo'],
    historia: {
      nombre: 'Ver las pantallas cargar y responder sin demoras',
      quiero: 'que las pantallas carguen y respondan rápido',
      para: 'no perder tiempo ni pensar que el sistema dejó de funcionar',
      storyPoints: 5,
      criterios: [
        'Las pantallas principales cargan en menos de 2 segundos con datos de prueba.',
        'Toda acción que tarda más de 1 segundo muestra un indicador de carga.',
      ],
    },
  },
  {
    categoria: 'retroalimentacion',
    nombre: 'Retroalimentación y errores',
    descripcion: 'Mensajes del sistema, confirmaciones, avisos de error y estado.',
    palabrasClave: [
      'mensaje', 'aviso', 'alert', 'confirm', 'notific', 'feedback',
      'retroaliment', 'no pasa nada', 'no sabe', 'no supo', 'deshacer',
      'failed',
    ],
    palabrasDebiles: ['error', 'exito', 'fall', 'estado', 'cancel'],
    historia: {
      nombre: 'Recibir confirmación clara de cada acción y poder corregir errores',
      quiero: 'recibir mensajes claros cada vez que el sistema guarda, falla o está procesando',
      para: 'saber si mi acción funcionó y qué hacer si no',
      storyPoints: 2,
      criterios: [
        'Toda acción de guardar o eliminar muestra un mensaje de resultado.',
        'Los errores dicen en español qué pasó y cómo corregirlo.',
        'Las acciones destructivas piden confirmación.',
      ],
    },
  },
  {
    categoria: 'visualizacion',
    nombre: 'Información y visualización',
    descripcion: 'Tablas, gráficos, filtros y orden de los datos que muestra el sistema.',
    palabrasClave: [
      'tabla', 'columna', 'grafic', 'filtr', 'orden', 'historial',
      'metric', 'reporte', 'export', 'leyenda', 'porcentaje', 'resumen',
    ],
    palabrasDebiles: ['muestra', 'fecha', 'dashboard', 'lista'],
    historia: {
      nombre: 'Encontrar y filtrar fácilmente la información de tablas y gráficos',
      quiero: 'ver la información de tablas y gráficos completa, ordenada y filtrable',
      para: 'sacar conclusiones de los resultados sin revisar los datos uno por uno',
      storyPoints: 5,
      criterios: [
        'Cada tabla muestra la fecha y los datos que el usuario necesita para comparar.',
        'Los gráficos tienen leyenda y valores visibles.',
        'Las listas largas se pueden filtrar y el filtro elegido se mantiene.',
      ],
    },
  },
];

export const CATEGORIA_OTROS = {
  categoria: 'otros' as const,
  nombre: 'Otros',
  descripcion: 'Observaciones que no coinciden con ninguna palabra clave.',
};

export const PESO_SEVERIDAD: Record<Severidad, number> = {
  baja: 1,
  media: 2,
  alta: 3,
};

// Una categoria se considera problema recurrente cuando aparece en al menos
// esta cantidad de pruebas distintas, o cuando acumula este numero de
// observaciones de severidad alta.
export const MIN_PRUEBAS_RECURRENTE = 2;
export const MIN_ALTAS_RECURRENTE = 2;

export function normalizar(texto: string): string {
  return ` ${texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

export const PUNTOS_FUERTE = 1;
export const PUNTOS_DEBIL = 0.5;

// Busca las palabras clave de la regla en el texto ya normalizado. Una raiz
// cuenta si empieza una palabra del texto.
export function coincidencias(textoNormalizado: string, regla: ReglaCategoria) {
  const aparece = (clave: string) => textoNormalizado.includes(` ${clave}`);
  const fuertes = regla.palabrasClave.filter(aparece);
  const debiles = regla.palabrasDebiles.filter(aparece);
  return {
    fuertes,
    debiles,
    puntaje: fuertes.length * PUNTOS_FUERTE + debiles.length * PUNTOS_DEBIL,
  };
}
