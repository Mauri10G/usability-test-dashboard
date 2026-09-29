import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluacionesController } from './evaluaciones.controller';
import { EvaluacionesService } from './evaluaciones.service';
import { PruebaEntity } from './entities/prueba.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PruebaEntity])],
  controllers: [EvaluacionesController],
  providers: [EvaluacionesService],
  exports: [EvaluacionesService],
})
export class EvaluacionesModule {}
