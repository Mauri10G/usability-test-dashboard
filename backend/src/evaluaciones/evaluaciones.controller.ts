import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { EvaluacionesService } from './evaluaciones.service';
import { CreatePruebaDto } from './dto/create-prueba.dto';

@Controller('evaluaciones')
export class EvaluacionesController {
  constructor(private readonly service: EvaluacionesService) {}

  @Post()
  crear(@Body() dto: CreatePruebaDto) {
    return this.service.crear(dto);
  }

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  async obtenerUna(@Param('id') id: string) {
    const prueba = await this.service.obtenerUna(id);
    if (!prueba) {
      throw new NotFoundException(`No existe una prueba con id ${id}`);
    }
    return prueba;
  }

  // Permite corregir un registro equivocado desde el detalle de la prueba
  // (hallazgo H3-1). Las tareas y observaciones se borran en cascada.
  @Delete(':id')
  @HttpCode(204)
  async eliminar(@Param('id') id: string) {
    const eliminada = await this.service.eliminar(id);
    if (!eliminada) {
      throw new NotFoundException(`No existe una prueba con id ${id}`);
    }
  }
}
