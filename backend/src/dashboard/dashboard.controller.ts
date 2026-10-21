import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  // Filtros opcionales: ?pantalla=Formulario&evaluador=Juan&desde=2026-09-01&hasta=2026-09-30
  @Get('metrics')
  obtenerMetricas(
    @Query('pantalla') pantalla?: string,
    @Query('evaluador') evaluador?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    for (const [nombre, valor] of [
      ['desde', desde],
      ['hasta', hasta],
    ]) {
      if (valor && !FECHA.test(valor)) {
        throw new BadRequestException(
          `La fecha "${nombre}" debe tener el formato AAAA-MM-DD`,
        );
      }
    }
    if (desde && hasta && desde > hasta) {
      throw new BadRequestException(
        'La fecha "desde" no puede ser posterior a la fecha "hasta"',
      );
    }
    return this.service.obtenerMetricas({ pantalla, evaluador, desde, hasta });
  }
}
