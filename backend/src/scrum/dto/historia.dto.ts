import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {
  ESTADOS_HISTORIA,
  EstadoHistoria,
  STORY_POINTS_VALIDOS,
} from '../entities/historia-usuario.entity';

const MENSAJE_ESTADO = 'El estado debe ser por_hacer, en_progreso o hecho';
const MENSAJE_SP = `Los story points deben ser uno de: ${STORY_POINTS_VALIDOS.join(', ')}`;
const MENSAJE_BV = 'El business value debe ser un numero entero entre 1 y 10';
const MENSAJE_SPRINT = 'El sprint debe ser un numero entero mayor a 0';

export class CreateHistoriaDto {
  @IsString()
  @Matches(/^HU-\d{2,3}$/, {
    message: 'El codigo debe tener el formato HU-01',
  })
  codigo: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre de la historia es obligatorio' })
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsInt({ message: MENSAJE_BV })
  @Min(1, { message: MENSAJE_BV })
  @Max(10, { message: MENSAJE_BV })
  businessValue: number;

  @IsIn(STORY_POINTS_VALIDOS, { message: MENSAJE_SP })
  storyPoints: number;

  @IsOptional()
  @IsInt({ message: MENSAJE_SPRINT })
  @Min(1, { message: MENSAJE_SPRINT })
  sprint?: number | null;

  @IsOptional()
  @IsIn(ESTADOS_HISTORIA, { message: MENSAJE_ESTADO })
  estado?: EstadoHistoria;

  @IsOptional()
  @IsString()
  responsable?: string;
}

export class UpdateHistoriaDto {
  @IsOptional()
  @IsString()
  @Matches(/^HU-\d{2,3}$/, {
    message: 'El codigo debe tener el formato HU-01',
  })
  codigo?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la historia es obligatorio' })
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsInt({ message: MENSAJE_BV })
  @Min(1, { message: MENSAJE_BV })
  @Max(10, { message: MENSAJE_BV })
  businessValue?: number;

  @IsOptional()
  @IsIn(STORY_POINTS_VALIDOS, { message: MENSAJE_SP })
  storyPoints?: number;

  // null quita la historia del sprint y la regresa al Product Backlog.
  @IsOptional()
  @IsInt({ message: MENSAJE_SPRINT })
  @Min(1, { message: MENSAJE_SPRINT })
  sprint?: number | null;

  @IsOptional()
  @IsIn(ESTADOS_HISTORIA, { message: MENSAJE_ESTADO })
  estado?: EstadoHistoria;

  @IsOptional()
  @IsString()
  responsable?: string;
}

export class CambiarEstadoDto {
  @IsIn(ESTADOS_HISTORIA, { message: MENSAJE_ESTADO })
  estado: EstadoHistoria;
}
