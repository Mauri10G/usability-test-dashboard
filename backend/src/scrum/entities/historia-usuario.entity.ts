import { Column, Entity, PrimaryColumn } from 'typeorm';

export const ESTADOS_HISTORIA = ['por_hacer', 'en_progreso', 'hecho'] as const;
export type EstadoHistoria = (typeof ESTADOS_HISTORIA)[number];

// Escala Fibonacci usada para los Story Points del backlog.
export const STORY_POINTS_VALIDOS = [1, 2, 3, 5, 8, 13, 21];

@Entity('historias_usuario')
export class HistoriaUsuarioEntity {
  @PrimaryColumn('varchar')
  id: string;

  // Codigo visible, por ejemplo HU-01.
  @Column('varchar', { unique: true })
  codigo: string;

  // "Nombre del Requisito" en la hoja Backlog del Excel de planificacion.
  @Column('varchar')
  nombre: string;

  @Column('text', { default: '' })
  descripcion: string;

  @Column('integer')
  businessValue: number;

  @Column('integer')
  storyPoints: number;

  // Sprint al que se asigno la historia. null = sigue en el Product Backlog.
  @Column('integer', { nullable: true })
  sprint: number | null;

  @Column('varchar', { default: 'por_hacer' })
  estado: EstadoHistoria;

  @Column('varchar', { default: '' })
  responsable: string;

  @Column('varchar')
  fechaCreacion: string;
}
