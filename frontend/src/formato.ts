import { Severidad } from './api';

// 28/09/2026
export function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// "hoy, 10:42" o "28/09/2026, 10:42"
export function momento(iso: string): string {
  const d = new Date(iso);
  const hora = d.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const esHoy = d.toDateString() === new Date().toDateString();
  return `${esHoy ? 'hoy' : fecha(iso)}, ${hora}`;
}

export const ETIQUETA_SEVERIDAD: Record<Severidad, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

// Misma definición en el dashboard, el formulario y el análisis con IA,
// para que todos los evaluadores clasifiquen igual (hallazgo H10-1).
export const SIGNIFICADO_SEVERIDAD: Record<Severidad, string> = {
  alta: 'impide completar la tarea',
  media: 'la retrasa o causa errores',
  baja: 'molestia menor, la tarea se completa sin problema',
};

export function mensajeError(err: unknown, porDefecto: string): string {
  return err instanceof Error && err.message ? err.message : porDefecto;
}
