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
