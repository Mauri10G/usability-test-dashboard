import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { HistoriasService } from './historias.service';
import { RetrospectivasService } from './retrospectivas.service';
import {
  CambiarEstadoDto,
  CreateHistoriaDto,
  UpdateHistoriaDto,
} from './dto/historia.dto';
import {
  CreateRetrospectivaDto,
  UpdateRetrospectivaDto,
} from './dto/retrospectiva.dto';
import {
  ESTADOS_HISTORIA,
  EstadoHistoria,
} from './entities/historia-usuario.entity';

@Controller('scrum/historias')
export class HistoriasController {
  constructor(private readonly service: HistoriasService) {}

  // ?sprint=2 filtra por sprint, ?sprint=backlog trae las que no tienen
  // sprint asignado, ?estado=en_progreso filtra por estado.
  @Get()
  listar(@Query('sprint') sprint?: string, @Query('estado') estado?: string) {
    if (estado && !ESTADOS_HISTORIA.includes(estado as EstadoHistoria)) {
      throw new BadRequestException(
        'El estado debe ser por_hacer, en_progreso o hecho',
      );
    }
    let filtroSprint: number | null | undefined;
    if (sprint === 'backlog') {
      filtroSprint = null;
    } else if (sprint !== undefined && sprint !== '') {
      filtroSprint = Number(sprint);
      if (!Number.isInteger(filtroSprint) || filtroSprint < 1) {
        throw new BadRequestException(
          'El sprint debe ser un numero entero mayor a 0 o "backlog"',
        );
      }
    }
    return this.service.listar({
      sprint: filtroSprint,
      estado: estado as EstadoHistoria | undefined,
    });
  }

  @Get(':id')
  obtenerUna(@Param('id') id: string) {
    return this.service.obtenerUna(id);
  }

  @Post()
  crear(@Body() dto: CreateHistoriaDto) {
    return this.service.crear(dto);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: UpdateHistoriaDto) {
    return this.service.actualizar(id, dto);
  }

  // Usado por el tablero Kanban al mover una tarjeta de columna.
  @Patch(':id/estado')
  cambiarEstado(@Param('id') id: string, @Body() dto: CambiarEstadoDto) {
    return this.service.cambiarEstado(id, dto.estado);
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id') id: string) {
    return this.service.eliminar(id);
  }
}

@Controller('scrum/retrospectivas')
export class RetrospectivasController {
  constructor(private readonly service: RetrospectivasService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  obtenerUna(@Param('id') id: string) {
    return this.service.obtenerUna(id);
  }

  @Post()
  crear(@Body() dto: CreateRetrospectivaDto) {
    return this.service.crear(dto);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: UpdateRetrospectivaDto) {
    return this.service.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id') id: string) {
    return this.service.eliminar(id);
  }
}
