import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  EstadoHistoria,
  HistoriaUsuarioEntity,
} from './entities/historia-usuario.entity';
import { CreateHistoriaDto, UpdateHistoriaDto } from './dto/historia.dto';

export interface HistoriaUsuario {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  businessValue: number;
  storyPoints: number;
  // Cociente de Decision = Business Value / Story Points, igual que en el Excel.
  cocienteDecision: number;
  sprint: number | null;
  estado: EstadoHistoria;
  responsable: string;
  fechaCreacion: string;
}

export interface FiltroHistorias {
  sprint?: number | null;
  estado?: EstadoHistoria;
}

@Injectable()
export class HistoriasService {
  constructor(
    @InjectRepository(HistoriaUsuarioEntity)
    private readonly repo: Repository<HistoriaUsuarioEntity>,
  ) {}

  // Devuelve el backlog priorizado: mayor cociente primero; a igual
  // cociente, mayor business value primero.
  async listar(filtro: FiltroHistorias = {}): Promise<HistoriaUsuario[]> {
    const historias = await this.repo.find();
    return historias
      .map((h) => this.aHistoria(h))
      .filter((h) =>
        filtro.sprint === undefined ? true : h.sprint === filtro.sprint,
      )
      .filter((h) => (filtro.estado ? h.estado === filtro.estado : true))
      .sort(
        (a, b) =>
          b.cocienteDecision - a.cocienteDecision ||
          b.businessValue - a.businessValue ||
          a.codigo.localeCompare(b.codigo),
      );
  }

  async obtenerUna(id: string): Promise<HistoriaUsuario> {
    return this.aHistoria(await this.buscarEntidad(id));
  }

  async crear(dto: CreateHistoriaDto): Promise<HistoriaUsuario> {
    await this.validarCodigoLibre(dto.codigo);
    const nueva = this.repo.create({
      id: randomUUID(),
      codigo: dto.codigo,
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? '',
      businessValue: dto.businessValue,
      storyPoints: dto.storyPoints,
      sprint: dto.sprint ?? null,
      estado: dto.estado ?? 'por_hacer',
      responsable: dto.responsable ?? '',
      fechaCreacion: new Date().toISOString(),
    });
    await this.repo.save(nueva);
    return this.aHistoria(nueva);
  }

  async actualizar(
    id: string,
    dto: UpdateHistoriaDto,
  ): Promise<HistoriaUsuario> {
    const historia = await this.buscarEntidad(id);
    if (dto.codigo && dto.codigo !== historia.codigo) {
      await this.validarCodigoLibre(dto.codigo);
    }
    Object.assign(historia, dto);
    await this.repo.save(historia);
    return this.aHistoria(historia);
  }

  async cambiarEstado(
    id: string,
    estado: EstadoHistoria,
  ): Promise<HistoriaUsuario> {
    return this.actualizar(id, { estado });
  }

  async eliminar(id: string): Promise<void> {
    const historia = await this.buscarEntidad(id);
    await this.repo.remove(historia);
  }

  private async buscarEntidad(id: string): Promise<HistoriaUsuarioEntity> {
    const historia = await this.repo.findOneBy({ id });
    if (!historia) {
      throw new NotFoundException(`No existe una historia con id ${id}`);
    }
    return historia;
  }

  private async validarCodigoLibre(codigo: string) {
    if (await this.repo.existsBy({ codigo })) {
      throw new ConflictException(`Ya existe una historia con codigo ${codigo}`);
    }
  }

  private aHistoria(h: HistoriaUsuarioEntity): HistoriaUsuario {
    return {
      id: h.id,
      codigo: h.codigo,
      nombre: h.nombre,
      descripcion: h.descripcion,
      businessValue: h.businessValue,
      storyPoints: h.storyPoints,
      cocienteDecision: Math.round((h.businessValue / h.storyPoints) * 100) / 100,
      sprint: h.sprint,
      estado: h.estado,
      responsable: h.responsable,
      fechaCreacion: h.fechaCreacion,
    };
  }
}
