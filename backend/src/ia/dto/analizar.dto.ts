import { IsArray, IsOptional, IsString } from 'class-validator';

// Todos los filtros son opcionales: sin cuerpo se analizan todas las
// observaciones registradas.
export class AnalizarDto {
  @IsOptional()
  @IsString({ message: 'La pantalla evaluada debe ser un texto' })
  pantallaEvaluada?: string;

  @IsOptional()
  @IsArray({ message: 'pruebaIds debe ser una lista de identificadores' })
  @IsString({ each: true, message: 'Cada id de prueba debe ser un texto' })
  pruebaIds?: string[];
}
