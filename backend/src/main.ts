import 'reflect-metadata';
// Primero: carga backend/.env (GEMINI_API_KEY) antes de leer la configuracion.
import './env';
import { NestFactory } from '@nestjs/core';
import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { AppModule } from './app.module';

// Nombres en espanol de las listas anidadas, para que un error en
// tareas[1] se lea "Tarea 2: ..." y no "tareas.1.errores must be ...".
const ETIQUETA_LISTA: Record<string, string> = {
  tareas: 'Tarea',
  observaciones: 'Observación',
};

function mensajesDeValidacion(
  errores: ValidationError[],
  prefijo = '',
  lista?: string,
): string[] {
  return errores.flatMap((error) => {
    // Un elemento de una lista: su propiedad es el indice.
    const esIndice = lista !== undefined && /^\d+$/.test(error.property);
    const contexto = esIndice
      ? `${ETIQUETA_LISTA[lista] ?? lista} ${Number(error.property) + 1}: `
      : prefijo;
    const propios = Object.entries(error.constraints ?? {}).map(
      ([regla, mensaje]) =>
        regla === 'whitelistValidation'
          ? `${contexto}${contexto ? "el" : "El"} campo "${error.property}" no está permitido`
          : `${contexto}${mensaje}`,
    );
    const hijos = mensajesDeValidacion(
      error.children ?? [],
      contexto,
      esIndice ? undefined : error.property,
    );
    return [...propios, ...hijos];
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errores) =>
        new BadRequestException(mensajesDeValidacion(errores)),
    }),
  );

  const puerto = process.env.PORT ?? 3000;
  await app.listen(puerto);
  console.log(`Backend Usability Test Dashboard corriendo en puerto ${puerto}`);
}
bootstrap();
