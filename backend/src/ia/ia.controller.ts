import {
  ArgumentsHost,
  BadRequestException,
  Body,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  PayloadTooLargeException,
  Post,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { IaService } from './ia.service';
import { GeminiService } from './gemini.service';
import {
  ArchivoSubido,
  CapturaService,
  MAX_BYTES_IMAGEN,
} from './captura.service';
import { AnalizarDto } from './dto/analizar.dto';
import { MatrizService } from './matriz.service';
import { PrototipoService } from './prototipo.service';

// multer responde "File too large" en ingles; se reemplaza por un mensaje
// que dice el limite.
@Catch(PayloadTooLargeException)
class ArchivoGrandeFilter implements ExceptionFilter {
  catch(_: PayloadTooLargeException, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(413)
      .json({
        statusCode: 413,
        message: `La imagen pesa más de ${MAX_BYTES_IMAGEN / 1024 / 1024} MB. Recórtala o guárdala como JPG.`,
      });
  }
}

@Controller('ia')
export class IaController {
  constructor(
    private readonly service: IaService,
    private readonly captura: CapturaService,
    private readonly gemini: GeminiService,
    private readonly matriz: MatrizService,
    private readonly prototipo: PrototipoService,
  ) {}

  // Para que el frontend sepa de entrada si Gemini esta disponible. Nunca
  // devuelve la clave.
  @Get('estado')
  estado() {
    return {
      gemini: {
        configurado: this.gemini.configurado,
        modelos: this.gemini.modelos,
        modelosCaptura: this.gemini.modelosCaptura,
        modelosImagen: this.gemini.modelosImagen,
      },
    };
  }

  // Es POST porque recibe filtros en el cuerpo y llama a un servicio
  // externo; no guarda nada en la base de datos.
  @Post('analizar')
  @HttpCode(200)
  analizar(@Body() dto: AnalizarDto) {
    return this.service.analizar(dto ?? {});
  }

  // Recibe multipart/form-data con la imagen en el campo "imagen".
  @Post('evaluar-captura')
  @HttpCode(200)
  @UseFilters(ArchivoGrandeFilter)
  @UseInterceptors(
    FileInterceptor('imagen', { limits: { fileSize: MAX_BYTES_IMAGEN, files: 1 } }),
  )
  evaluarCaptura(@UploadedFile() imagen?: ArchivoSubido) {
    return this.captura.evaluar(imagen);
  }

  // Matriz de la evaluacion de captura en Word. El id es el que devuelve
  // POST /ia/evaluar-captura; el reporte queda guardado en la base.
  @Get('matriz/:id')
  @Header('Cache-Control', 'no-store')
  async matrizWord(
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException('El id de la evaluación no es válido.'),
      }),
    )
    id: string,
  ) {
    const { archivo, contenido } = await this.matriz.generarWord(id);
    return new StreamableFile(contenido, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      disposition: `attachment; filename="${archivo}"`,
      length: contenido.length,
    });
  }

  // multipart/form-data: la captura original en "imagen" y los hallazgos
  // de la evaluacion como lista JSON en "hallazgos".
  @Post('generar-prototipo')
  @HttpCode(200)
  @UseFilters(ArchivoGrandeFilter)
  @UseInterceptors(
    FileInterceptor('imagen', { limits: { fileSize: MAX_BYTES_IMAGEN, files: 1 } }),
  )
  generarPrototipo(
    @UploadedFile() imagen?: ArchivoSubido,
    @Body('hallazgos') hallazgos?: string,
  ) {
    return this.prototipo.generar(imagen, hallazgos);
  }
}
