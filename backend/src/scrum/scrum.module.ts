import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  HistoriasController,
  RetrospectivasController,
} from './scrum.controller';
import { HistoriasService } from './historias.service';
import { RetrospectivasService } from './retrospectivas.service';
import { HistoriaUsuarioEntity } from './entities/historia-usuario.entity';
import { RetrospectivaEntity } from './entities/retrospectiva.entity';

// Modulo 5: gestion SCRUM dentro del propio sistema (HU-06, HU-07, HU-08).
@Module({
  imports: [
    TypeOrmModule.forFeature([HistoriaUsuarioEntity, RetrospectivaEntity]),
  ],
  controllers: [HistoriasController, RetrospectivasController],
  providers: [HistoriasService, RetrospectivasService],
})
export class ScrumModule {}
