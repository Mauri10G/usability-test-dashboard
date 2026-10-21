const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export type Severidad = 'baja' | 'media' | 'alta';

export interface TareaForm {
  descripcion: string;
  tiempoSegundos: number;
  exito: boolean;
  errores: number;
}

export interface ObservacionForm {
  texto: string;
  severidad: Severidad;
}

export interface Prueba {
  id: string;
  nombreEvaluacion: string;
  pantallaEvaluada: string;
  evaluador: string;
  fecha: string;
  tareas: (TareaForm & { id: string })[];
  observaciones: (ObservacionForm & { id: string })[];
}

export interface FiltroMetricas {
  pantalla?: string;
  evaluador?: string;
  desde?: string;
  hasta?: string;
}

export interface CreatePruebaPayload {
  nombreEvaluacion: string;
  pantallaEvaluada: string;
  evaluador: string;
  tareas: TareaForm[];
  observaciones: ObservacionForm[];
}

export interface Metrics {
  generadoEn: string;
  opcionesFiltro: { pantallas: string[]; evaluadores: string[] };
  totalPruebas: number;
  totalTareas: number;
  tasaExito: number;
  tiempoPromedioSegundos: number;
  totalObservaciones: number;
  porSeveridad: { baja: number; media: number; alta: number };
  tareasConMasErrores: {
    descripcion: string;
    errores: number;
    pruebas: number;
  }[];
  ultimasPruebas: {
    id: string;
    nombreEvaluacion: string;
    pantallaEvaluada: string;
    evaluador: string;
    fecha: string;
    totalTareas: number;
    totalObservaciones: number;
  }[];
}

// Error de la API con la lista de mensajes por separado, para poder
// mostrarlos como lista en lugar de unirlos con "|" (hallazgo H9-2).
export class ErrorApi extends Error {
  constructor(
    public readonly mensajes: string[],
    public readonly status: number,
  ) {
    super(mensajes.join(' '));
  }
}

const SIN_CONEXION =
  'No se pudo conectar con el servidor. Revisa que el backend esté ' +
  'encendido (npm run start:dev en la carpeta backend) y vuelve a intentarlo.';

// fetch lanza un TypeError en inglés ("Failed to fetch") cuando el backend
// está apagado; se reemplaza por un mensaje que dice qué hacer (H9-1).
async function pedir(ruta: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_URL}${ruta}`, init);
  } catch {
    throw new ErrorApi([SIN_CONEXION], 0);
  }
}

async function manejarRespuesta(res: Response) {
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    const mensajes: string[] = Array.isArray(cuerpo?.message)
      ? cuerpo.message
      : [cuerpo?.message ?? 'Ocurrió un error al conectar con el servidor'];
    throw new ErrorApi(mensajes, res.status);
  }
  return res.json();
}

export async function crearPrueba(payload: CreatePruebaPayload) {
  return enviarJson('/evaluaciones', 'POST', payload);
}

export async function obtenerPrueba(id: string): Promise<Prueba> {
  return manejarRespuesta(
    await pedir(`/evaluaciones/${encodeURIComponent(id)}`),
  );
}

export async function eliminarPrueba(id: string): Promise<void> {
  await enviarJson(`/evaluaciones/${encodeURIComponent(id)}`, 'DELETE');
}

export async function obtenerMetricas(
  filtro: FiltroMetricas = {},
): Promise<Metrics> {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtro)) {
    if (valor) params.set(clave, valor);
  }
  const query = params.toString();
  return manejarRespuesta(
    await pedir(`/dashboard/metrics${query ? `?${query}` : ''}`),
  );
}

// ---- Modulo 5: SCRUM ----

export type EstadoHistoria = 'por_hacer' | 'en_progreso' | 'hecho';

export const ETIQUETA_ESTADO: Record<EstadoHistoria, string> = {
  por_hacer: 'Por hacer',
  en_progreso: 'En progreso',
  hecho: 'Hecho',
};

export const STORY_POINTS_VALIDOS = [1, 2, 3, 5, 8, 13, 21];

export interface HistoriaUsuario {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  businessValue: number;
  storyPoints: number;
  cocienteDecision: number;
  sprint: number | null;
  estado: EstadoHistoria;
  responsable: string;
  fechaCreacion: string;
}

export interface HistoriaPayload {
  codigo: string;
  nombre: string;
  descripcion: string;
  businessValue: number;
  storyPoints: number;
  sprint: number | null;
  estado: EstadoHistoria;
  responsable: string;
}

export interface Retrospectiva {
  id: string;
  sprint: number;
  facilitador: string;
  fecha: string;
  queSalioBien: string[];
  queMejorar: string[];
  acciones: string[];
}

export type RetrospectivaPayload = Omit<Retrospectiva, 'id' | 'fecha'>;

async function enviarJson(ruta: string, metodo: string, cuerpo?: unknown) {
  const res = await pedir(ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  // DELETE responde 204 sin cuerpo.
  if (res.status === 204) return null;
  return manejarRespuesta(res);
}

export async function listarHistorias(): Promise<HistoriaUsuario[]> {
  return manejarRespuesta(await pedir('/scrum/historias'));
}

export function crearHistoria(
  payload: HistoriaPayload,
): Promise<HistoriaUsuario> {
  return enviarJson('/scrum/historias', 'POST', payload);
}

export function actualizarHistoria(
  id: string,
  payload: Partial<HistoriaPayload>,
): Promise<HistoriaUsuario> {
  return enviarJson(`/scrum/historias/${id}`, 'PATCH', payload);
}

export function cambiarEstadoHistoria(
  id: string,
  estado: EstadoHistoria,
): Promise<HistoriaUsuario> {
  return enviarJson(`/scrum/historias/${id}/estado`, 'PATCH', { estado });
}

export async function eliminarHistoria(id: string): Promise<void> {
  await enviarJson(`/scrum/historias/${id}`, 'DELETE');
}

export async function listarRetrospectivas(): Promise<Retrospectiva[]> {
  return manejarRespuesta(await pedir('/scrum/retrospectivas'));
}

export function crearRetrospectiva(
  payload: RetrospectivaPayload,
): Promise<Retrospectiva> {
  return enviarJson('/scrum/retrospectivas', 'POST', payload);
}

export async function eliminarRetrospectiva(id: string): Promise<void> {
  await enviarJson(`/scrum/retrospectivas/${id}`, 'DELETE');
}

// ---- Modulo 3: IA para analisis UX ----

export type CategoriaUx =
  | 'navegacion'
  | 'formularios'
  | 'accesibilidad'
  | 'rendimiento'
  | 'retroalimentacion'
  | 'contenido'
  | 'visualizacion'
  | 'otros';

export interface ObservacionClasificada {
  id: string;
  texto: string;
  severidad: Severidad;
  pruebaId: string;
  nombreEvaluacion: string;
  pantallaEvaluada: string;
  categoria: CategoriaUx;
  nombreCategoria: string;
  palabrasDetectadas: string[];
  puntaje: number;
  confianza: 'alta' | 'media' | 'baja';
  justificacion: string | null;
  origen: 'gemini' | 'reglas';
}

export interface ResumenCategoria {
  categoria: CategoriaUx;
  nombre: string;
  descripcion: string;
  observaciones: number;
  porcentaje: number;
  pruebas: number;
  pantallas: string[];
  porSeveridad: Record<Severidad, number>;
  impacto: number;
  recurrente: boolean;
  motivoRecurrente: string | null;
  palabrasFrecuentes: string[];
}

export interface HistoriaSugerida {
  codigoSugerido: string;
  categoria: CategoriaUx;
  nombre: string;
  descripcion: string;
  businessValue: number;
  storyPoints: number;
  criteriosAceptacion: string[];
  motivo: string;
  evidencia: {
    texto: string;
    severidad: Severidad;
    pantallaEvaluada: string;
  }[];
}

export interface AnalisisUx {
  generadoEn: string;
  metodo: {
    tipo: 'gemini' | 'reglas';
    modelo: string | null;
    segundos: number | null;
    respaldo: string | null;
    descripcion: string;
    reglas: {
      categoria: CategoriaUx;
      nombre: string;
      palabrasClave: string[];
      palabrasDebiles: string[];
    }[];
    umbrales: { minPruebasRecurrente: number; minAltasRecurrente: number };
  };
  filtro: { pantallaEvaluada: string | null; pruebas: number | null };
  totalPruebas: number;
  totalObservaciones: number;
  resumen: { texto: string; puntos: string[] };
  categorias: ResumenCategoria[];
  observaciones: ObservacionClasificada[];
  sugerencias: HistoriaSugerida[];
}

export function analizarObservaciones(filtro: {
  pantallaEvaluada?: string;
}): Promise<AnalisisUx> {
  return enviarJson('/ia/analizar', 'POST', filtro);
}

export interface EstadoIa {
  gemini: { configurado: boolean; modelos: string[]; modelosCaptura: string[] };
}

export async function estadoIa(): Promise<EstadoIa> {
  return manejarRespuesta(await pedir('/ia/estado'));
}

export type CodigoHeuristica =
  | 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6' | 'H7' | 'H8' | 'H9' | 'H10';

export interface HallazgoCaptura {
  heuristica: CodigoHeuristica;
  severidad: number;
  etiquetaSeveridad: string;
  titulo: string;
  problema: string;
  ubicacion: string;
  recomendacion: string;
  // Recuadro [ymin, xmin, ymax, xmax] de 0 a 1000; lo usa el boceto.
  zona?: [number, number, number, number];
}

export interface EvaluacionCaptura {
  id: string;
  generadoEn: string;
  modelo: string;
  segundos: number;
  archivo: string;
  pantalla: string;
  resumen: string;
  totalHallazgos: number;
  porSeveridad: Record<'1' | '2' | '3' | '4', number>;
  grupos: {
    heuristica: CodigoHeuristica;
    nombre: string;
    severidadMaxima: number;
    hallazgos: HallazgoCaptura[];
  }[];
  heuristicasSinHallazgos: { heuristica: CodigoHeuristica; nombre: string }[];
}

// La imagen va como multipart/form-data; el navegador pone el
// Content-Type con su separador, por eso no se fija aqui.
export async function evaluarCaptura(imagen: File): Promise<EvaluacionCaptura> {
  const datos = new FormData();
  datos.append('imagen', imagen);
  return manejarRespuesta(
    await pedir('/ia/evaluar-captura', { method: 'POST', body: datos }),
  );
}

// El .docx con la matriz de la evaluacion. Se pide con fetch (y no con un
// enlace directo) para poder mostrar el error si el backend no responde.
export async function descargarMatrizWord(idEvaluacion: string): Promise<Blob> {
  const res = await pedir(`/ia/matriz/${encodeURIComponent(idEvaluacion)}`);
  if (!res.ok) await manejarRespuesta(res);
  return res.blob();
}

export interface PrototipoCorregido {
  modo: 'gemini' | 'boceto';
  etiqueta: 'Generado por IA' | 'Boceto automático';
  modelo?: string;
  respaldo?: string;
  // De donde salio la estructura que redibuja el boceto.
  estructura?: { origen: 'gemini' | 'captura'; modelo?: string; motivo?: string };
  segundos: number;
  mime: string;
  imagen: string; // base64
  ancho: number;
  alto: number;
  correcciones: {
    n: number;
    heuristica: CodigoHeuristica;
    severidad: number;
    titulo: string;
    recomendacion: string;
    // recuadro: donde lo marcó Gemini; deducida: por la descripción del
    // lugar; general: toda la pantalla.
    ubicacion: 'recuadro' | 'deducida' | 'general';
    aplicado?: string;
  }[];
}

// Version corregida de la captura: Gemini (imagen) o boceto automatico.
export async function generarPrototipo(
  imagen: File,
  hallazgos: HallazgoCaptura[],
): Promise<PrototipoCorregido> {
  const datos = new FormData();
  datos.append('imagen', imagen);
  datos.append('hallazgos', JSON.stringify(hallazgos));
  return manejarRespuesta(
    await pedir('/ia/generar-prototipo', { method: 'POST', body: datos }),
  );
}
