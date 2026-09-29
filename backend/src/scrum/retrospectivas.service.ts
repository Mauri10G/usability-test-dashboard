import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { RetrospectivaEntity } from './entities/retrospectiva.entity';
import {
  CreateRetrospectivaDto,
  UpdateRetrospectivaDto,
} from './dto/retrospectiva.dto';

@Injectable()
export class RetrospectivasService {
  constructor(
    @InjectRepository(RetrospectivaEntity)
    private readonly repo: Repository<RetrospectivaEntity>,
  ) {}

  // La del sprint mas reciente primero.
  listar(): Promise<RetrospectivaEntity[]> {
    return this.repo.find({ order: { sprint: 'DESC', fecha: 'DESC' } });
  }

  async obtenerUna(id: string): Promise<RetrospectivaEntity> {
    const retro = await this.repo.findOneBy({ id });
    if (!retro) {
      throw new NotFoundException(`No existe una retrospectiva con id ${id}`);
    }
    return retro;
  }

  async crear(dto: CreateRetrospectivaDto): Promise<RetrospectivaEntity> {
    const nueva = this.repo.create({
      id: randomUUID(),
      fecha: new Date().toISOString(),
      ...dto,
    });
    return this.repo.save(nueva);
  }

  async actualizar(
    id: string,
    dto: UpdateRetrospectivaDto,
  ): Promise<RetrospectivaEntity> {
    const retro = await this.obtenerUna(id);
    Object.assign(retro, dto);
    return this.repo.save(retro);
  }

  async eliminar(id: string): Promise<void> {
    const retro = await this.obtenerUna(id);
    await this.repo.remove(retro);
  }
}
