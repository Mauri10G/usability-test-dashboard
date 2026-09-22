import { Injectable } from '@nestjs/common';
import { EvaluacionesService } from '../evaluaciones/evaluaciones.service';

@Injectable()
export class DashboardService {
  constructor(private readonly evaluaciones: EvaluacionesService) {}

  obtenerMetricas() {
    const pruebas = this.evaluaciones.listar();

    const todasLasTareas = pruebas.flatMap((p) => p.tareas);
    const todasLasObservaciones = pruebas.flatMap((p) => p.observaciones);

    const totalTareas = todasLasTareas.length;
    const tareasExitosas = todasLasTareas.filter((t) => t.exito).length;
    const tasaExito =
      totalTareas === 0 ? 0 : Math.round((tareasExitosas / totalTareas) * 100);

    const porSeveridad = {
      baja: todasLasObservaciones.filter((o) => o.severidad === 'baja').length,
      media: todasLasObservaciones.filter((o) => o.severidad === 'media').length,
      alta: todasLasObservaciones.filter((o) => o.severidad === 'alta').length,
    };

    const tareasConMasErrores = [...todasLasTareas]
      .sort((a, b) => b.errores - a.errores)
      .slice(0, 5)
      .map((t) => ({ descripcion: t.descripcion, errores: t.errores }));

    const tiempoPromedioSegundos =
      totalTareas === 0
        ? 0
        : Math.round(
            todasLasTareas.reduce((acc, t) => acc + t.tiempoSegundos, 0) /
              totalTareas,
          );

    return {
      totalPruebas: pruebas.length,
      totalTareas,
      tasaExito,
      tiempoPromedioSegundos,
      totalObservaciones: todasLasObservaciones.length,
      porSeveridad,
      tareasConMasErrores,
      ultimasPruebas: pruebas.slice(0, 5).map((p) => ({
        id: p.id,
        nombreEvaluacion: p.nombreEvaluacion,
        pantallaEvaluada: p.pantallaEvaluada,
        evaluador: p.evaluador,
        fecha: p.fecha,
        totalTareas: p.tareas.length,
        totalObservaciones: p.observaciones.length,
      })),
    };
  }
}
