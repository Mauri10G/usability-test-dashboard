import { Column, Entity, PrimaryColumn } from 'typeorm';

// Reporte de una evaluacion heuristica de captura (POST /ia/evaluar-captura).
// Se guarda para poder descargar despues la matriz en Word con
// GET /ia/matriz/:id. La imagen no se guarda, solo el reporte.
@Entity('evaluaciones_captura')
export class EvaluacionCapturaEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column('varchar')
  archivo: string;

  @Column('varchar')
  modelo: string;

  @Column('varchar')
  generadoEn: string;

  // El reporte completo (EvaluacionCaptura) como JSON.
  @Column('simple-json')
  reporte: Record<string, unknown>;
}
