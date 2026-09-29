import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { DataSourceOptions } from 'typeorm';
import {
  ObservacionEntity,
  PruebaEntity,
  TareaEntity,
} from '../evaluaciones/entities/prueba.entity';
import { HistoriaUsuarioEntity } from '../scrum/entities/historia-usuario.entity';
import { RetrospectivaEntity } from '../scrum/entities/retrospectiva.entity';

// Base de datos SQLite en un archivo local. Se usa el driver sql.js
// (SQLite compilado a WebAssembly) para que `npm install` funcione en
// cualquier computador sin compilar modulos nativos.
// Se puede cambiar la ruta con la variable de entorno DB_PATH.
export const rutaBaseDeDatos =
  process.env.DB_PATH ?? join(process.cwd(), 'data', 'usability.sqlite');

export function opcionesBaseDeDatos(): DataSourceOptions {
  mkdirSync(dirname(rutaBaseDeDatos), { recursive: true });
  return {
    type: 'sqljs',
    location: rutaBaseDeDatos,
    autoSave: true,
    entities: [
      PruebaEntity,
      TareaEntity,
      ObservacionEntity,
      HistoriaUsuarioEntity,
      RetrospectivaEntity,
    ],
    // Crea y actualiza las tablas a partir de las entidades.
    // Suficiente para el alcance del proyecto; en produccion se usarian migraciones.
    synchronize: true,
  };
}
