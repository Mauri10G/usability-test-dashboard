import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { EvaluacionCapturaEntity } from './entities/evaluacion-captura.entity';
import { GeminiError, GeminiNoConfiguradoError, GeminiService } from './gemini.service';
import {
  CodigoHeuristica,
  esquemaCaptura,
  HEURISTICAS,
  instruccionesCaptura,
  RespuestaCapturaGemini,
  SIGNIFICADO_SEVERIDAD_NIELSEN,
} from './prompts';

export const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_BYTES_IMAGEN = 8 * 1024 * 1024;

// Lo que entrega multer para un archivo subido (sin depender de @types/multer).
export interface ArchivoSubido {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface HallazgoCaptura {
  heuristica: CodigoHeuristica;
  severidad: number;
  etiquetaSeveridad: string;
  titulo: string;
  problema: string;
  ubicacion: string;
  recomendacion: string;
  // Recuadro [ymin, xmin, ymax, xmax] de 0 a 1000 que marca Gemini; no se
  // muestra en el reporte, lo usa el boceto del prototipo corregido.
  zona?: Zona;
}

export type Zona = [number, number, number, number];

// Acepta solo recuadros con sentido; si no, el hallazgo queda sin zona.
export function zonaValida(z: unknown): Zona | undefined {
  if (!Array.isArray(z) || z.length !== 4) return undefined;
  const n = z.map((v) => Math.round(Number(v)));
  if (n.some((v) => !Number.isFinite(v) || v < 0 || v > 1000)) return undefined;
  if (n[2] - n[0] < 5 || n[3] - n[1] < 5) return undefined;
  return n as Zona;
}

export interface EvaluacionCaptura {
  // Con este id se descarga la matriz en Word (GET /ia/matriz/:id).
  id: string;
  generadoEn: string;
  modelo: string;
  segundos: number;
  archivo: string;
  pantalla: string;
  resumen: string;
  totalHallazgos: number;
  porSeveridad: Record<'1' | '2' | '3' | '4', number>;
  // Agrupado por heuristica: primero la de mayor severidad maxima; dentro de
  // cada grupo, de mayor a menor severidad.
  grupos: {
    heuristica: CodigoHeuristica;
    nombre: string;
    severidadMaxima: number;
    hallazgos: HallazgoCaptura[];
  }[];
  heuristicasSinHallazgos: { heuristica: CodigoHeuristica; nombre: string }[];
}

export const MENSAJE_SIN_CLAVE =
  'La evaluación de capturas necesita la API de Gemini y no hay una clave ' +
  'configurada. Agrega GEMINI_API_KEY=tu_clave en backend/.env y reinicia ' +
  'el backend.';

@Injectable()
export class CapturaService {
  private readonly log = new Logger('IA');

  constructor(
    private readonly gemini: GeminiService,
    @InjectRepository(EvaluacionCapturaEntity)
    private readonly repo: Repository<EvaluacionCapturaEntity>,
  ) {}

  async buscar(id: string): Promise<EvaluacionCaptura> {
    const fila = await this.repo.findOneBy({ id });
    if (!fila) {
      throw new NotFoundException(
        'No existe esa evaluación de captura. Vuelve a evaluar la imagen para generar la matriz.',
      );
    }
    return fila.reporte as unknown as EvaluacionCaptura;
  }

  async evaluar(archivo: ArchivoSubido | undefined): Promise<EvaluacionCaptura> {
    if (!this.gemini.configurado) {
      this.log.warn('POST /ia/evaluar-captura -> rechazada: sin GEMINI_API_KEY');
      throw new ServiceUnavailableException({
        statusCode: 503,
        codigo: 'GEMINI_NO_CONFIGURADO',
        message: MENSAJE_SIN_CLAVE,
      });
    }
    if (!archivo) {
      throw new BadRequestException(
        'Adjunta una imagen en el campo "imagen" (PNG, JPG o WebP).',
      );
    }
    if (!TIPOS_IMAGEN.includes(archivo.mimetype)) {
      throw new BadRequestException(
        `El archivo "${archivo.originalname}" no es una imagen PNG, JPG o WebP.`,
      );
    }

    let r;
    try {
      r = await this.gemini.generarJson<RespuestaCapturaGemini>({
        instrucciones: instruccionesCaptura(),
        partes: [
          {
            inline_data: {
              mime_type: archivo.mimetype,
              data: archivo.buffer.toString('base64'),
            },
          },
          { text: 'Evalúa esta captura con las 10 heurísticas de Nielsen.' },
        ],
        esquema: esquemaCaptura(),
        modelos: this.gemini.modelosCaptura,
        presupuestoMs: 100_000,
        intentoMs: 40_000,
      });
    } catch (err) {
      if (err instanceof GeminiNoConfiguradoError) {
        throw new ServiceUnavailableException({
          statusCode: 503,
          codigo: 'GEMINI_NO_CONFIGURADO',
          message: MENSAJE_SIN_CLAVE,
        });
      }
      const detalle = err instanceof GeminiError ? err.intentos.join(' · ') : String(err);
      this.log.error(`POST /ia/evaluar-captura -> falló Gemini (${detalle})`);
      throw new BadGatewayException(
        'Gemini no pudo evaluar la captura en este momento (el servicio está ' +
          'saturado o no respondió a tiempo). Vuelve a intentarlo en unos segundos.',
      );
    }

    const datos = r.datos;
    if (datos.esInterfaz === false) {
      this.log.log(`POST /ia/evaluar-captura -> modo GEMINI (${r.modelo}): no es una interfaz`);
      throw new UnprocessableEntityException(
        'La imagen no parece la captura de una interfaz. Sube una captura de ' +
          'pantalla de un dashboard, formulario o página web.',
      );
    }

    const nombres = new Map(HEURISTICAS.map((h) => [h.codigo, h.nombre]));
    const hallazgos: HallazgoCaptura[] = (datos.hallazgos ?? [])
      .filter((h) => nombres.has(h.heuristica))
      .map((h) => ({ ...h, severidad: Math.round(Number(h.severidad)) }))
      // 0 = "no es un problema": no se reporta.
      .filter((h) => h.severidad >= 1 && h.severidad <= 4)
      .map((h) => ({
        heuristica: h.heuristica,
        severidad: h.severidad,
        etiquetaSeveridad: SIGNIFICADO_SEVERIDAD_NIELSEN[h.severidad].split(':')[0],
        titulo: h.titulo?.trim() ?? '',
        problema: h.problema?.trim() ?? '',
        ubicacion: h.ubicacion?.trim() ?? '',
        recomendacion: h.recomendacion?.trim() ?? '',
        zona: zonaValida(h.zona),
      }));

    const grupos = HEURISTICAS.map((h) => {
      const delGrupo = hallazgos
        .filter((x) => x.heuristica === h.codigo)
        .sort((a, b) => b.severidad - a.severidad);
      return {
        heuristica: h.codigo,
        nombre: h.nombre,
        severidadMaxima: Math.max(0, ...delGrupo.map((x) => x.severidad)),
        hallazgos: delGrupo,
      };
    });

    const porSeveridad = { '1': 0, '2': 0, '3': 0, '4': 0 };
    hallazgos.forEach((h) => porSeveridad[String(h.severidad) as '1']++);

    const segundos = Math.round(r.ms / 100) / 10;
    this.log.log(
      `POST /ia/evaluar-captura -> modo GEMINI (${r.modelo}, ${segundos} s, ` +
        `${hallazgos.length} hallazgos, ${archivo.originalname})`,
    );

    const evaluacion: EvaluacionCaptura = {
      id: randomUUID(),
      generadoEn: new Date().toISOString(),
      modelo: r.modelo,
      segundos,
      archivo: archivo.originalname,
      pantalla: datos.pantalla?.trim() ?? '',
      resumen: datos.resumen?.trim() ?? '',
      totalHallazgos: hallazgos.length,
      porSeveridad,
      grupos: grupos
        .filter((g) => g.hallazgos.length > 0)
        .sort(
          (a, b) =>
            b.severidadMaxima - a.severidadMaxima ||
            b.hallazgos.length - a.hallazgos.length ||
            Number(a.heuristica.slice(1)) - Number(b.heuristica.slice(1)),
        ),
      heuristicasSinHallazgos: grupos
        .filter((g) => g.hallazgos.length === 0)
        .map((g) => ({ heuristica: g.heuristica, nombre: g.nombre })),
    };
    await this.repo.save({
      id: evaluacion.id,
      archivo: evaluacion.archivo,
      modelo: evaluacion.modelo,
      generadoEn: evaluacion.generadoEn,
      reporte: evaluacion as unknown as Record<string, unknown>,
    });
    return evaluacion;
  }
}
