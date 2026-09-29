import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Prueba, PruebaEntity } from './entities/prueba.entity';
import { CreatePruebaDto } from './dto/create-prueba.dto';

@Injectable()
export class EvaluacionesService {
  constructor(
    @InjectRepository(PruebaEntity)
    private readonly repo: Repository<PruebaEntity>,
  ) {}

  async crear(dto: CreatePruebaDto): Promise<Prueba> {
    const nueva = this.repo.create({
      id: randomUUID(),
      nombreEvaluacion: dto.nombreEvaluacion,
      pantallaEvaluada: dto.pantallaEvaluada,
      evaluador: dto.evaluador,
      fecha: new Date().toISOString(),
      tareas: dto.tareas.map((t, orden) => ({ id: randomUUID(), ...t, orden })),
      observaciones: dto.observaciones.map((o, orden) => ({
        id: randomUUID(),
        ...o,
        orden,
      })),
    });
    await this.repo.save(nueva);
    return this.aPrueba(nueva);
  }

  // Las mas recientes primero, igual que en la version en memoria.
  async listar(): Promise<Prueba[]> {
    const pruebas = await this.repo.find({
      relations: { tareas: true, observaciones: true },
      order: {
        fecha: 'DESC',
        tareas: { orden: 'ASC' },
        observaciones: { orden: 'ASC' },
      },
    });
    return pruebas.map((p) => this.aPrueba(p));
  }

  async obtenerUna(id: string): Promise<Prueba | undefined> {
    const prueba = await this.repo.findOne({
      where: { id },
      relations: { tareas: true, observaciones: true },
      order: { tareas: { orden: 'ASC' }, observaciones: { orden: 'ASC' } },
    });
    return prueba ? this.aPrueba(prueba) : undefined;
  }

  // Devuelve exactamente la misma estructura que exponia la API antes de
  // tener base de datos (sin columnas internas como `orden`).
  private aPrueba(p: PruebaEntity): Prueba {
    return {
      id: p.id,
      nombreEvaluacion: p.nombreEvaluacion,
      pantallaEvaluada: p.pantallaEvaluada,
      evaluador: p.evaluador,
      fecha: p.fecha,
      tareas: p.tareas.map((t) => ({
        id: t.id,
        descripcion: t.descripcion,
        tiempoSegundos: t.tiempoSegundos,
        exito: t.exito,
        errores: t.errores,
      })),
      observaciones: p.observaciones.map((o) => ({
        id: o.id,
        texto: o.texto,
        severidad: o.severidad,
      })),
    };
  }
}
