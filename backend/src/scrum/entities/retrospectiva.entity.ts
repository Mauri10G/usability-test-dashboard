import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('retrospectivas')
export class RetrospectivaEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column('integer')
  sprint: number;

  @Column('varchar')
  facilitador: string;

  @Column('varchar')
  fecha: string;

  // Cada lista se guarda como JSON dentro de una columna de texto.
  @Column('simple-json')
  queSalioBien: string[];

  @Column('simple-json')
  queMejorar: string[];

  @Column('simple-json')
  acciones: string[];
}
