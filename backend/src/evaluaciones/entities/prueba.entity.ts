export type Severidad = 'baja' | 'media' | 'alta';

export interface Tarea {
  id: string;
  descripcion: string;
  tiempoSegundos: number;
  exito: boolean;
  errores: number;
}

export interface Observacion {
  id: string;
  texto: string;
  severidad: Severidad;
}

export interface Prueba {
  id: string;
  nombreEvaluacion: string;
  pantallaEvaluada: string;
  evaluador: string;
  fecha: string;
  tareas: Tarea[];
  observaciones: Observacion[];
}
