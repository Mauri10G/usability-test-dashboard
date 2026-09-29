import {
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
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
//
// La ruta se calcula desde este archivo y no desde la carpeta donde se
// lanzo el proceso: tanto `src/database` como `dist/database` apuntan a
// `backend/data/usability.sqlite`, se arranque el backend desde donde sea.
// Se puede cambiar con la variable de entorno DB_PATH.
export const rutaBaseDeDatos =
  process.env.DB_PATH ??
  join(__dirname, '..', '..', 'data', 'usability.sqlite');

const rutaBloqueo = `${rutaBaseDeDatos}.lock`;

interface Bloqueo {
  pid: number;
  proceso: string;
}

function procesoVivo(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

function leerBloqueo(): Bloqueo | null {
  try {
    return JSON.parse(readFileSync(rutaBloqueo, 'utf-8'));
  } catch {
    return null;
  }
}

function esperar(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// sql.js carga toda la base en memoria y, despues de cada INSERT, UPDATE o
// DELETE, reescribe el archivo completo con su copia. Si dos procesos abren
// el mismo archivo a la vez (por ejemplo `npm run seed` con el backend
// encendido, o dos backends), cada uno guarda su propia copia y el ultimo
// en escribir borra los cambios del otro. Este bloqueo impide que pase.
function bloquearBaseDeDatos(proceso: string) {
  const propio = JSON.stringify({ pid: process.pid, proceso });
  // Espera un poco por si el dueno anterior se esta cerrando (por ejemplo
  // cuando ts-node-dev reinicia el backend al guardar un archivo).
  for (let intento = 0; ; intento++) {
    try {
      writeFileSync(rutaBloqueo, propio, { flag: 'wx' });
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      const dueno = leerBloqueo();
      if (!dueno || dueno.pid === process.pid || !procesoVivo(dueno.pid)) {
        // Bloqueo huerfano: el proceso anterior termino sin liberarlo.
        writeFileSync(rutaBloqueo, propio);
        break;
      }
      if (intento >= 15) {
        throw new Error(
          `La base de datos ${rutaBaseDeDatos} ya esta abierta por ` +
            `"${dueno.proceso}" (PID ${dueno.pid}). Detenlo antes de ` +
            `continuar: si los dos procesos escriben, se pierden datos.`,
        );
      }
      esperar(200);
    }
  }

  const liberar = () => {
    if (leerBloqueo()?.pid === process.pid) {
      try {
        unlinkSync(rutaBloqueo);
      } catch {
        // Ya no existe, no hay nada que liberar.
      }
    }
  };
  process.on('exit', liberar);
  for (const senal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(senal, () => {
      liberar();
      process.exit(0);
    });
  }
}

export function opcionesBaseDeDatos(proceso: string): DataSourceOptions {
  mkdirSync(dirname(rutaBaseDeDatos), { recursive: true });
  bloquearBaseDeDatos(proceso);
  return {
    type: 'sqljs',
    location: rutaBaseDeDatos,
    // Despues de cada operacion que modifica datos, TypeORM exporta la base
    // y la escribe en `location` (SqljsQueryRunner.flush -> driver.autoSave).
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
