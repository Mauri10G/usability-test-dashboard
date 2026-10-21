import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { opcionesBaseDeDatos, rutaBaseDeDatos } from './database.config';
import {
  ObservacionEntity,
  PruebaEntity,
  TareaEntity,
} from '../evaluaciones/entities/prueba.entity';
import { HistoriaUsuarioEntity } from '../scrum/entities/historia-usuario.entity';
import { RetrospectivaEntity } from '../scrum/entities/retrospectiva.entity';

// Correcciones de datos de la deuda tecnica del Sprint 3
// (docs/deuda-tecnica.md). Se puede correr varias veces: si ya no hay nada
// que corregir, no cambia nada.
// Uso, con el backend detenido: npm run db:corregir

// Formato acordado para las personas: "Nombre Apellido", igual que en las
// hojas del Excel de planificacion.
const NOMBRES: Record<string, string> = {
  'Guevara Mauricio': 'Mauricio Guevara',
  'López Erick': 'Erick López',
  'Chicaiza Eduardo': 'Eduardo Chicaiza',
  'Carvajal Juan': 'Juan Carvajal',
};

// Pruebas de ensayo que quedaron en la base. Se identifican por id para no
// borrar por accidente una prueba real que se llame parecido.
const PRUEBAS_DE_ENSAYO = ['18be8ef8-3188-4ef1-b95e-c21838743a79'];

async function corregir() {
  const dataSource = new DataSource(opcionesBaseDeDatos('npm run db:corregir'));
  await dataSource.initialize();
  const cambios: string[] = [];

  await dataSource.transaction(async (m) => {
    for (const [antes, despues] of Object.entries(NOMBRES)) {
      const evaluador = await m.update(PruebaEntity, { evaluador: antes }, { evaluador: despues });
      if (evaluador.affected)
        cambios.push(`${evaluador.affected} prueba(s): evaluador "${antes}" -> "${despues}"`);
      const responsable = await m.update(
        HistoriaUsuarioEntity,
        { responsable: antes },
        { responsable: despues },
      );
      if (responsable.affected)
        cambios.push(`${responsable.affected} historia(s): responsable "${antes}" -> "${despues}"`);
      const facilitador = await m.update(
        RetrospectivaEntity,
        { facilitador: antes },
        { facilitador: despues },
      );
      if (facilitador.affected)
        cambios.push(`${facilitador.affected} retrospectiva(s): facilitador "${antes}" -> "${despues}"`);
    }

    for (const id of PRUEBAS_DE_ENSAYO) {
      const prueba = await m.findOneBy(PruebaEntity, { id });
      if (!prueba) continue;
      await m.delete(TareaEntity, { prueba: { id } });
      await m.delete(ObservacionEntity, { prueba: { id } });
      await m.delete(PruebaEntity, { id });
      cambios.push(`prueba de ensayo eliminada: "${prueba.nombreEvaluacion.trim()}" (${id})`);
    }
  });

  await dataSource.destroy();
  console.log(
    cambios.length
      ? `Correcciones aplicadas en ${rutaBaseDeDatos}:\n- ${cambios.join('\n- ')}`
      : `No había nada que corregir en ${rutaBaseDeDatos}.`,
  );
}

corregir().catch((err) => {
  console.error(err);
  process.exit(1);
});
