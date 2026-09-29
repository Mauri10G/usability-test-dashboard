const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface TareaForm {
  descripcion: string;
  tiempoSegundos: number;
  exito: boolean;
  errores: number;
}

export interface ObservacionForm {
  texto: string;
  severidad: 'baja' | 'media' | 'alta';
}

export interface CreatePruebaPayload {
  nombreEvaluacion: string;
  pantallaEvaluada: string;
  evaluador: string;
  tareas: TareaForm[];
  observaciones: ObservacionForm[];
}

export interface Metrics {
  totalPruebas: number;
  totalTareas: number;
  tasaExito: number;
  tiempoPromedioSegundos: number;
  totalObservaciones: number;
  porSeveridad: { baja: number; media: number; alta: number };
  tareasConMasErrores: { descripcion: string; errores: number }[];
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

async function manejarRespuesta(res: Response) {
  if (!res.ok) {
    const cuerpo = await res.json().catch(() => null);
    const mensaje = Array.isArray(cuerpo?.message)
      ? cuerpo.message.join(' | ')
      : cuerpo?.message ?? 'Ocurrio un error al conectar con el servidor';
    throw new Error(mensaje);
  }
  return res.json();
}

export async function crearPrueba(payload: CreatePruebaPayload) {
  const res = await fetch(`${API_URL}/evaluaciones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return manejarRespuesta(res);
}

export async function obtenerMetricas(): Promise<Metrics> {
  const res = await fetch(`${API_URL}/dashboard/metrics`);
  return manejarRespuesta(res);
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
  const res = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  // DELETE responde 204 sin cuerpo.
  if (res.status === 204) return null;
  return manejarRespuesta(res);
}

export async function listarHistorias(): Promise<HistoriaUsuario[]> {
  return manejarRespuesta(await fetch(`${API_URL}/scrum/historias`));
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
  return manejarRespuesta(await fetch(`${API_URL}/scrum/retrospectivas`));
}

export function crearRetrospectiva(
  payload: RetrospectivaPayload,
): Promise<Retrospectiva> {
  return enviarJson('/scrum/retrospectivas', 'POST', payload);
}

export async function eliminarRetrospectiva(id: string): Promise<void> {
  await enviarJson(`/scrum/retrospectivas/${id}`, 'DELETE');
}
