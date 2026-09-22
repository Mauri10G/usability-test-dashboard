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

export class CreateTareaDto {
  @IsString()
  @IsNotEmpty({ message: 'La descripcion de la tarea es obligatoria' })
  descripcion: string;

  @IsNumber()
  @IsPositive({ message: 'El tiempo debe ser mayor a 0 segundos' })
  tiempoSegundos: number;

  @IsBoolean()
  exito: boolean;

  @IsInt()
  @Min(0, { message: 'Los errores no pueden ser negativos' })
  errores: number;
}

export class CreateObservacionDto {
  @IsString()
  @IsNotEmpty({ message: 'La observacion no puede estar vacia' })
  texto: string;

  @IsIn(['baja', 'media', 'alta'], {
    message: 'La severidad debe ser baja, media o alta',
  })
  severidad: 'baja' | 'media' | 'alta';
}

export class CreatePruebaDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la evaluacion es obligatorio' })
  nombreEvaluacion: string;

  @IsString()
  @IsNotEmpty({ message: 'Indica que pantalla se evaluo' })
  pantallaEvaluada: string;

  @IsString()
  @IsNotEmpty({ message: 'El evaluador es obligatorio' })
  evaluador: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Agrega al menos una tarea evaluada' })
  @ValidateNested({ each: true })
  @Type(() => CreateTareaDto)
  tareas: CreateTareaDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateObservacionDto)
  observaciones: CreateObservacionDto[];
}
