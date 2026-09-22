import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { EvaluacionesModule } from '../evaluaciones/evaluaciones.module';

@Module({
  imports: [EvaluacionesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
