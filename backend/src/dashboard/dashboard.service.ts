import { Injectable } from '@nestjs/common';
import { EvaluacionesService } from '../evaluaciones/evaluaciones.service';

export interface FiltroMetricas {
  pantalla?: string;
  evaluador?: string;
  // Fechas AAAA-MM-DD, ambas inclusive.
  desde?: string;
  hasta?: string;
}

// Agrupa la misma tarea escrita con distintas mayusculas, espacios o tildes.
function claveTarea(descripcion: string) {
  return descripcion
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

@Injectable()
export class DashboardService {
  constructor(private readonly evaluaciones: EvaluacionesService) {}

  async obtenerMetricas(filtro: FiltroMetricas = {}) {
    const todas = await this.evaluaciones.listar();

    // Las fechas se guardan en ISO (UTC); se compara por dia local del
    // servidor para que "hasta 28/09" incluya todo ese dia.
    const diaLocal = (iso: string) => {
      const d = new Date(iso);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${mm}-${dd}`;
    };

    const pruebas = todas.filter(
      (p) =>
        (!filtro.pantalla || p.pantallaEvaluada === filtro.pantalla) &&
        (!filtro.evaluador || p.evaluador === filtro.evaluador) &&
        (!filtro.desde || diaLocal(p.fecha) >= filtro.desde) &&
        (!filtro.hasta || diaLocal(p.fecha) <= filtro.hasta),
    );

    const todasLasTareas = pruebas.flatMap((p) =>
      p.tareas.map((t) => ({ ...t, pruebaId: p.id })),
    );
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

    // Problemas mas frecuentes: la misma tarea se agrupa entre pruebas y se
    // suman sus errores. Las tareas sin errores no son un problema y no se
    // listan (hallazgo H2-1 del diagnostico heuristico).
    const grupos = new Map<
      string,
      { descripcion: string; errores: number; pruebas: Set<string> }
    >();
    for (const t of todasLasTareas) {
      if (t.errores <= 0) continue;
      const clave = claveTarea(t.descripcion);
      const grupo = grupos.get(clave) ?? {
        descripcion: t.descripcion.trim(),
        errores: 0,
        pruebas: new Set<string>(),
      };
      grupo.errores += t.errores;
      grupo.pruebas.add(t.pruebaId);
      grupos.set(clave, grupo);
    }
    const tareasConMasErrores = [...grupos.values()]
      .map((g) => ({
        descripcion: g.descripcion,
        errores: g.errores,
        pruebas: g.pruebas.size,
      }))
      .sort((a, b) => b.errores - a.errores || b.pruebas - a.pruebas)
      .slice(0, 5);

    const tiempoPromedioSegundos =
      totalTareas === 0
        ? 0
        : Math.round(
            todasLasTareas.reduce((acc, t) => acc + t.tiempoSegundos, 0) /
              totalTareas,
          );

    const unicos = (valores: string[]) =>
      [...new Set(valores)].sort((a, b) => a.localeCompare(b, 'es'));

    return {
      generadoEn: new Date().toISOString(),
      // Opciones de los filtros: salen de todas las pruebas, no solo de las
      // filtradas, para que el usuario siempre pueda cambiar de filtro.
      opcionesFiltro: {
        pantallas: unicos(todas.map((p) => p.pantallaEvaluada)),
        evaluadores: unicos(todas.map((p) => p.evaluador)),
      },
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
