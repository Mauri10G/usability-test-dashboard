import { readFileSync } from 'fs';
import { join } from 'path';

// Carga backend/.env en process.env sin depender de paquetes extra. Las
// variables que ya existen en el entorno tienen prioridad sobre el archivo.
// La ruta se calcula desde este archivo, asi funciona igual desde src/ y
// desde dist/. Si el archivo no existe no pasa nada: el modulo de IA usa
// sus reglas de respaldo.
export function cargarEnv(ruta = join(__dirname, '..', '.env')) {
  let contenido: string;
  try {
    contenido = readFileSync(ruta, 'utf-8');
  } catch {
    return;
  }
  for (const linea of contenido.split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const igual = limpia.indexOf('=');
    if (igual === -1) continue;
    const clave = limpia.slice(0, igual).trim();
    let valor = limpia.slice(igual + 1).trim();
    if (/^(["']).*\1$/.test(valor)) valor = valor.slice(1, -1);
    if (process.env[clave] === undefined) process.env[clave] = valor;
  }
}

cargarEnv();
