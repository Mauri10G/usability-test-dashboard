import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// Todos los mensajes van en espanol y nombran el campo, porque el
// formulario los muestra tal cual (hallazgo H4-1 del diagnostico).

export class CreateTareaDto {
  @IsString({ message: 'La descripción de la tarea debe ser un texto' })
  @IsNotEmpty({ message: 'La descripción de la tarea es obligatoria' })
  descripcion: string;

  @IsNumber({}, { message: 'El tiempo de la tarea debe ser un número' })
  @IsPositive({ message: 'El tiempo debe ser mayor a 0 segundos' })
  tiempoSegundos: number;

  @IsBoolean({ message: 'Indica si la tarea se completó o no' })
  exito: boolean;

  @IsInt({ message: 'Los errores deben ser un número entero' })
  @Min(0, { message: 'Los errores no pueden ser negativos' })
  errores: number;
}

export class CreateObservacionDto {
  @IsString({ message: 'La observación debe ser un texto' })
  @IsNotEmpty({ message: 'La observación no puede estar vacía' })
  texto: string;

  @IsIn(['baja', 'media', 'alta'], {
    message: 'La severidad debe ser baja, media o alta',
  })
  severidad: 'baja' | 'media' | 'alta';
}

export class CreatePruebaDto {
  @IsString({ message: 'El nombre de la evaluación debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre de la evaluación es obligatorio' })
  nombreEvaluacion: string;

  @IsString({ message: 'La pantalla evaluada debe ser un texto' })
  @IsNotEmpty({ message: 'Indica qué pantalla se evaluó' })
  pantallaEvaluada: string;

  @IsString({ message: 'El evaluador debe ser un texto' })
  @IsNotEmpty({ message: 'El evaluador es obligatorio' })
  evaluador: string;

  @IsArray({ message: 'Las tareas deben enviarse como una lista' })
  @ArrayMinSize(1, { message: 'Agrega al menos una tarea evaluada' })
  @ValidateNested({ each: true })
  @Type(() => CreateTareaDto)
  tareas: CreateTareaDto[];

  @IsArray({ message: 'Las observaciones deben enviarse como una lista' })
  @ValidateNested({ each: true })
  @Type(() => CreateObservacionDto)
  observaciones: CreateObservacionDto[];
}
