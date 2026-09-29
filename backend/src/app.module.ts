import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluacionesModule } from './evaluaciones/evaluaciones.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ScrumModule } from './scrum/scrum.module';
import { opcionesBaseDeDatos } from './database/database.config';

@Module({
  imports: [
    TypeOrmModule.forRoot(opcionesBaseDeDatos('backend')),
    EvaluacionesModule,
    DashboardModule,
    ScrumModule,
  ],
})
export class AppModule {}
