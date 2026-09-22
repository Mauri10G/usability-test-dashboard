import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('metrics')
  obtenerMetricas() {
    return this.service.obtenerMetricas();
  }
}
