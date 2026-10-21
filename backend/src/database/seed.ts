import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { opcionesBaseDeDatos, rutaBaseDeDatos } from './database.config';
import {
  EstadoHistoria,
  HistoriaUsuarioEntity,
} from '../scrum/entities/historia-usuario.entity';

// Carga en la base de datos el Product Backlog de la hoja "Backlog" del
// Excel de planificacion (1_PJT_NOM_PJT_USABILIDAD_MATRIZ_PLANIFICACION),
// las historias del modulo de IA (HU-04, HU-05) y las propuestas del
// diagnostico heuristico (HU-11 a HU-14, docs/product-backlog.md).
// Solo inserta las historias cuyo codigo todavia no existe, asi que se
// puede correr varias veces sin duplicar nada.
// Uso: npm run seed

interface HistoriaSemilla {
  codigo: string;
  nombre: string;
  descripcion?: string;
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
  // Modulo 3 (IA para analisis UX), construido en el Sprint 3.
  {
    codigo: 'HU-04',
    nombre:
      'Obtener un resumen y la clasificación automática de las observaciones por categoría UX',
    descripcion:
      'Como evaluador de usabilidad, quiero que el sistema resuma y clasifique ' +
      'las observaciones registradas por categoría UX, para encontrar los ' +
      'problemas principales sin revisarlas una por una.',
    businessValue: 8,
    storyPoints: 5,
    sprint: 3,
    estado: 'en_progreso',
    responsable: 'Mauricio Guevara',
  },
  {
    codigo: 'HU-05',
    nombre:
      'Recibir historias de usuario sugeridas cuando un problema de usabilidad se repite',
    descripcion:
      'Como Product Owner, quiero que el sistema proponga una historia de ' +
      'usuario cuando un problema aparece en varias pruebas, para llevarlo ' +
      'al backlog sin redactarla desde cero.',
    businessValue: 7,
    storyPoints: 3,
    sprint: 3,
    estado: 'en_progreso',
    responsable: 'Mauricio Guevara',
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
  // Propuestas a partir del diagnostico heuristico (docs/product-backlog.md).
  {
    codigo: 'HU-11',
    nombre:
      'Recibir mensajes de error claros y en español, y saber qué hacer cuando el sistema no responde',
    businessValue: 6,
    storyPoints: 2,
    sprint: 3,
    estado: 'en_progreso',
    responsable: '',
  },
  {
    codigo: 'HU-12',
    nombre: 'Conservar las pruebas registradas aunque se reinicie el servidor',
    businessValue: 8,
    storyPoints: 3,
    sprint: 2,
    estado: 'hecho',
    responsable: 'Mauricio Guevara',
  },
  {
    codigo: 'HU-13',
    nombre:
      'Ver, editar y eliminar una prueba registrada para corregir errores de digitación',
    businessValue: 7,
    storyPoints: 3,
    sprint: 3,
    estado: 'en_progreso',
    responsable: '',
  },
  {
    codigo: 'HU-14',
    nombre: 'Filtrar el dashboard por pantalla evaluada, evaluador y fecha',
    businessValue: 6,
    storyPoints: 5,
    sprint: 3,
    estado: 'en_progreso',
    responsable: '',
  },
];

async function sembrar() {
  const dataSource = new DataSource(opcionesBaseDeDatos('npm run seed'));
  await dataSource.initialize();
  const repo = dataSource.getRepository(HistoriaUsuarioEntity);

  let insertadas = 0;
  for (const h of backlog) {
    if (await repo.existsBy({ codigo: h.codigo })) continue;
    await repo.save(
      repo.create({
        id: randomUUID(),
        fechaCreacion: new Date().toISOString(),
        ...h,
        descripcion: h.descripcion ?? '',
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
