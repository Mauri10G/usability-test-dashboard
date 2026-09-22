import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prueba } from './entities/prueba.entity';
import { CreatePruebaDto } from './dto/create-prueba.dto';

@Injectable()
export class EvaluacionesService {
  // Almacenamiento en memoria para el Sprint 1 / Sprint 2.
  // En un sprint posterior esto se reemplaza por una base de datos real.
  private pruebas: Prueba[] = [];

  crear(dto: CreatePruebaDto): Prueba {
    const nueva: Prueba = {
      id: randomUUID(),
      nombreEvaluacion: dto.nombreEvaluacion,
      pantallaEvaluada: dto.pantallaEvaluada,
      evaluador: dto.evaluador,
      fecha: new Date().toISOString(),
      tareas: dto.tareas.map((t) => ({ id: randomUUID(), ...t })),
      observaciones: dto.observaciones.map((o) => ({
        id: randomUUID(),
        ...o,
      })),
    };
    this.pruebas.unshift(nueva);
    return nueva;
  }

  listar(): Prueba[] {
    return this.pruebas;
  }

  obtenerUna(id: string): Prueba | undefined {
    return this.pruebas.find((p) => p.id === id);
  }
}
