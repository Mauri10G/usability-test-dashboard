import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { opcionesBaseDeDatos, rutaBaseDeDatos } from './database.config';
import {
  EstadoHistoria,
  HistoriaUsuarioEntity,
} from '../scrum/entities/historia-usuario.entity';

// Carga en la base de datos el Product Backlog de la hoja "Backlog" del
// Excel de planificacion (1_PJT_NOM_PJT_USABILIDAD_MATRIZ_PLANIFICACION).
// Solo inserta las historias cuyo codigo todavia no existe, asi que se
// puede correr varias veces sin duplicar nada.
// Uso: npm run seed

interface HistoriaSemilla {
  codigo: string;
  nombre: string;
  businessValue: number;
  storyPoints: number;
  sprint: number | null;
  estado: EstadoHistoria;
  responsable: string;
}

const backlog: HistoriaSemilla[] = [
  {
    codigo: 'HU-01',
    nombre:
      'Registrar una prueba de usabilidad con tareas, tiempos y observaciones',
    businessValue: 9,
    storyPoints: 5,
    sprint: 1,
    estado: 'en_progreso',
    responsable: 'Mauricio Guevara',
  },
  {
    codigo: 'HU-02',
    nombre:
      'Visualizar problemas más frecuentes en el dashboard para identificar oportunidades de mejora',
    businessValue: 8,
    storyPoints: 3,
    sprint: 2,
    estado: 'en_progreso',
    responsable: 'Mauricio Guevara',
  },
  {
    codigo: 'HU-03',
    nombre:
      'Comparar el antes y el después del aplicativo para verificar la mejora',
    businessValue: 8,
    storyPoints: 5,
    sprint: null,
    estado: 'por_hacer',
    responsable: '',
  },
  {
    codigo: 'HU-06',
    nombre:
      'Registrar historias de usuario en un Product Backlog para planificar por sprints',
    businessValue: 7,
    storyPoints: 3,
    sprint: 1,
    estado: 'por_hacer',
    responsable: 'Erick López',
  },
  {
    codigo: 'HU-07',
    nombre:
      'Visualizar tareas en un tablero para saber qué hacer y en qué estado están',
    businessValue: 7,
    storyPoints: 5,
    sprint: 1,
    estado: 'por_hacer',
    responsable: 'Erick López',
  },
  {
    codigo: 'HU-08',
    nombre:
      'Registrar retrospectivas del equipo para mejorar el siguiente sprint',
    businessValue: 5,
    storyPoints: 2,
    sprint: null,
    estado: 'por_hacer',
    responsable: '',
  },
  {
    codigo: 'HU-09',
    nombre:
      'Formulario más claro y con validación para evitar errores al registrar resultados',
    businessValue: 8,
    storyPoints: 3,
    sprint: 1,
    estado: 'por_hacer',
    responsable: 'Eduardo Chicaiza',
  },
  {
    codigo: 'HU-10',
    nombre:
      'Navegar por el dashboard sin confusión para aprender el sistema rápidamente',
    businessValue: 7,
    storyPoints: 3,
    sprint: 1,
    estado: 'por_hacer',
    responsable: 'Eduardo Chicaiza',
  },
];

async function sembrar() {
  const dataSource = new DataSource(opcionesBaseDeDatos());
  await dataSource.initialize();
  const repo = dataSource.getRepository(HistoriaUsuarioEntity);

  let insertadas = 0;
  for (const h of backlog) {
    if (await repo.existsBy({ codigo: h.codigo })) continue;
    await repo.save(
      repo.create({
        id: randomUUID(),
        descripcion: '',
        fechaCreacion: new Date().toISOString(),
        ...h,
      }),
    );
    insertadas++;
  }

  await dataSource.destroy();
  console.log(
    `Backlog cargado en ${rutaBaseDeDatos}: ${insertadas} historias nuevas, ` +
      `${backlog.length - insertadas} ya existian.`,
  );
}

sembrar().catch((err) => {
  console.error(err);
  process.exit(1);
});
