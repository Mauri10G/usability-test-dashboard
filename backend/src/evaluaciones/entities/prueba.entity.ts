import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';

export type Severidad = 'baja' | 'media' | 'alta';

// Forma de los datos que expone la API. No cambia respecto a la version
// en memoria: el frontend y el dashboard siguen recibiendo lo mismo.

export interface Tarea {
  id: string;
  descripcion: string;
  tiempoSegundos: number;
  exito: boolean;
  errores: number;
}

export interface Observacion {
  id: string;
  texto: string;
  severidad: Severidad;
}

export interface Prueba {
  id: string;
  nombreEvaluacion: string;
  pantallaEvaluada: string;
  evaluador: string;
  fecha: string;
  tareas: Tarea[];
  observaciones: Observacion[];
}

// Tablas en la base de datos.

@Entity('pruebas')
export class PruebaEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column('varchar')
  nombreEvaluacion: string;

  @Column('varchar')
  pantallaEvaluada: string;

  @Column('varchar')
  evaluador: string;

  // Fecha en formato ISO, igual que antes.
  @Column('varchar')
  fecha: string;

  @OneToMany(() => TareaEntity, (t) => t.prueba, { cascade: true })
  tareas: TareaEntity[];

  @OneToMany(() => ObservacionEntity, (o) => o.prueba, { cascade: true })
  observaciones: ObservacionEntity[];
}

@Entity('tareas')
export class TareaEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column('varchar')
  descripcion: string;

  @Column('real')
  tiempoSegundos: number;

  @Column('boolean')
  exito: boolean;

  @Column('integer')
  errores: number;

  // Posicion de la tarea dentro de la prueba, para devolverlas en el
  // mismo orden en que se registraron.
  @Column('integer')
  orden: number;

  @ManyToOne(() => PruebaEntity, (p) => p.tareas, { onDelete: 'CASCADE' })
  prueba: PruebaEntity;
}

@Entity('observaciones')
export class ObservacionEntity {
  @PrimaryColumn('varchar')
  id: string;

  @Column('varchar')
  texto: string;

  @Column('varchar')
  severidad: Severidad;

  @Column('integer')
  orden: number;

  @ManyToOne(() => PruebaEntity, (p) => p.observaciones, {
    onDelete: 'CASCADE',
  })
  prueba: PruebaEntity;
}
