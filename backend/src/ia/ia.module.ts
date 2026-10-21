import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluacionesModule } from '../evaluaciones/evaluaciones.module';
import { ScrumModule } from '../scrum/scrum.module';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';
import { GeminiService } from './gemini.service';
import { CapturaService } from './captura.service';
import { MatrizService } from './matriz.service';
import { PrototipoService } from './prototipo.service';
import { EvaluacionCapturaEntity } from './entities/evaluacion-captura.entity';

// Modulo 3: IA para analisis UX (HU-04, HU-05). Usa la API de Gemini cuando
// hay GEMINI_API_KEY en backend/.env; si no, o si Gemini falla, el analisis
// de observaciones cae a las reglas de palabras clave de reglas.ts. El
// prototipo corregido cae a un boceto dibujado con sharp (boceto.ts).
@Module({
  imports: [
    EvaluacionesModule,
    ScrumModule,
    TypeOrmModule.forFeature([EvaluacionCapturaEntity]),
  ],
  controllers: [IaController],
  providers: [IaService, GeminiService, CapturaService, MatrizService, PrototipoService],
})
export class IaModule {}
