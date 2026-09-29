import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const MENSAJE_SPRINT = 'El sprint debe ser un numero entero mayor a 0';
const MENSAJE_ITEM = 'Cada punto de la retrospectiva debe tener texto';

export class CreateRetrospectivaDto {
  @IsInt({ message: MENSAJE_SPRINT })
  @Min(1, { message: MENSAJE_SPRINT })
  sprint: number;

  @IsString()
  @IsNotEmpty({ message: 'Indica quien facilito la retrospectiva' })
  facilitador: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: MENSAJE_ITEM })
  queSalioBien: string[];

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: MENSAJE_ITEM })
  queMejorar: string[];

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: MENSAJE_ITEM })
  acciones: string[];
}

export class UpdateRetrospectivaDto {
  @IsOptional()
  @IsInt({ message: MENSAJE_SPRINT })
  @Min(1, { message: MENSAJE_SPRINT })
  sprint?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Indica quien facilito la retrospectiva' })
  facilitador?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: MENSAJE_ITEM })
  queSalioBien?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: MENSAJE_ITEM })
  queMejorar?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true, message: MENSAJE_ITEM })
  acciones?: string[];
}
