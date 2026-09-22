import { Module } from '@nestjs/common';
import { EvaluacionesModule } from './evaluaciones/evaluaciones.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [EvaluacionesModule, DashboardModule],
})
export class AppModule {}
