import {
  Body,
  Controller,
  Get,
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
  obtenerUna(@Param('id') id: string) {
    const prueba = this.service.obtenerUna(id);
    if (!prueba) {
      throw new NotFoundException(`No existe una prueba con id ${id}`);
    }
    return prueba;
  }
}
