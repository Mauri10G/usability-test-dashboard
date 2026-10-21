import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { GeminiError, GeminiService } from './gemini.service';
import { HEURISTICAS, pedidoPrototipo } from './prompts';
import { ArchivoSubido, TIPOS_IMAGEN, zonaValida } from './captura.service';
import {
  CorreccionPedida,
  dibujarBoceto,
  Estructura,
  esquemaEstructura,
  instruccionesEstructura,
  normalizarEstructura,
} from './boceto';

// POST /ia/generar-prototipo: version corregida de la captura aplicando
// las recomendaciones de la evaluacion heuristica. Primero intenta con un
// modelo de imagen de Gemini; si falla, no responde a tiempo o no hay
// clave, cae al boceto automatico (carpeta boceto/), igual que el analisis
// de texto cae a las reglas. El boceto redibuja la pantalla como wireframe
// con las correcciones aplicadas; para saber que hay en la pantalla le
// pide la estructura a Gemini (modelo de texto con vision, que si tiene
// cuota) en paralelo con el intento de imagen.

// El pedido marca 15 a 20 s para el modelo de imagen.
const PRESUPUESTO_MS = 20_000;
const INTENTO_MS = 18_000;
// Lectura de la estructura: corre en paralelo con el intento de imagen.
const PRESUPUESTO_ESTRUCTURA_MS = 40_000;
const INTENTO_ESTRUCTURA_MS = 25_000;
const MAX_HALLAZGOS = 30;

export interface PrototipoCorregido {
  modo: 'gemini' | 'boceto';
  etiqueta: 'Generado por IA' | 'Boceto automático';
  modelo?: string;
  // Por que se uso el boceto (solo en modo boceto).
  respaldo?: string;
  // De donde salio la estructura que se redibujo (solo en modo boceto).
  estructura?: { origen: 'gemini' | 'captura'; modelo?: string; motivo?: string };
  segundos: number;
  mime: string;
  imagen: string; // base64
  ancho: number;
  alto: number;
  correcciones: {
    n: number;
    heuristica: string;
    severidad: number;
    titulo: string;
    recomendacion: string;
    // recuadro: donde lo marco Gemini; deducida: sin recuadro, por la
    // descripcion del lugar; general: se aplica a toda la pantalla.
    ubicacion: 'recuadro' | 'deducida' | 'general';
    aplicado?: string;
  }[];
}

@Injectable()
export class PrototipoService {
  private readonly log = new Logger('IA');

  constructor(private readonly gemini: GeminiService) {}

  async generar(
    archivo: ArchivoSubido | undefined,
    hallazgosJson: string | undefined,
  ): Promise<PrototipoCorregido> {
    if (!archivo) {
      throw new BadRequestException(
        'Adjunta la captura original en el campo "imagen" (PNG, JPG o WebP).',
      );
    }
    if (!TIPOS_IMAGEN.includes(archivo.mimetype)) {
      throw new BadRequestException(
        `El archivo "${archivo.originalname}" no es una imagen PNG, JPG o WebP.`,
      );
    }
    const correcciones = this.leerHallazgos(hallazgosJson);
    const inicio = Date.now();
    const imagenGemini = {
      inline_data: { mime_type: archivo.mimetype, data: archivo.buffer.toString('base64') },
    };

    // La estructura se pide de entrada; si la imagen de Gemini sale bien,
    // simplemente no se usa.
    const estructura: Promise<{ e: Estructura | null; motivo?: string }> = this.gemini.configurado
      ? this.gemini
          .generarJson<unknown>({
            instrucciones: instruccionesEstructura(),
            esquema: esquemaEstructura(),
            partes: [imagenGemini, { text: 'Describe la estructura de esta captura.' }],
            modelos: this.gemini.modelosCaptura,
            presupuestoMs: PRESUPUESTO_ESTRUCTURA_MS,
            intentoMs: INTENTO_ESTRUCTURA_MS,
          })
          .then((r) => ({ e: normalizarEstructura(r.datos, r.modelo) }))
          .catch((err) => ({
            e: null,
            motivo: err instanceof GeminiError ? motivoCorto(err.intentos) : (err as Error).message,
          }))
      : Promise.resolve({ e: null, motivo: 'GEMINI_API_KEY no está configurada' });

    let respaldo: string;
    if (!this.gemini.configurado) {
      respaldo = 'GEMINI_API_KEY no está configurada';
    } else {
      try {
        const r = await this.gemini.generarImagen({
          partes: [
            imagenGemini,
            {
              text: pedidoPrototipo(
                correcciones.map((c) => ({
                  heuristica: c.heuristica,
                  titulo: c.titulo,
                  ubicacion: c.ubicacion,
                  recomendacion: c.recomendacion,
                })),
              ),
            },
          ],
          presupuestoMs: PRESUPUESTO_MS,
          intentoMs: INTENTO_MS,
        });
        // Se comprueba que lo devuelto sea una imagen que se pueda abrir.
        const meta = await sharp(Buffer.from(r.datos.base64, 'base64')).metadata();
        const segundos = Math.round(r.ms / 100) / 10;
        this.log.log(
          `POST /ia/generar-prototipo -> modo GEMINI (${r.modelo}, ${segundos} s, ` +
            `${correcciones.length} correcciones, ${archivo.originalname})`,
        );
        return {
          modo: 'gemini',
          etiqueta: 'Generado por IA',
          modelo: r.modelo,
          segundos,
          mime: r.datos.mime,
          imagen: r.datos.base64,
          ancho: meta.width ?? 0,
          alto: meta.height ?? 0,
          correcciones: correcciones.map((c) => ({
            n: c.n,
            heuristica: c.heuristica,
            severidad: c.severidad,
            titulo: c.titulo,
            recomendacion: c.recomendacion,
            ubicacion: c.zona ? ('recuadro' as const) : ('deducida' as const),
          })),
        };
      } catch (err) {
        respaldo =
          err instanceof GeminiError
            ? motivoSinImagen(err.intentos)
            : `la imagen que devolvió Gemini no se pudo abrir (${(err as Error).message})`;
      }
    }

    const { e, motivo } = await estructura;
    const boceto = await dibujarBoceto(archivo.buffer, e, correcciones, archivo.originalname);
    const segundos = Math.round((Date.now() - inicio) / 100) / 10;
    const sinRecuadro = boceto.correcciones
      .filter((k) => k.ubicacionUsada !== 'recuadro')
      .map((k) => `#${k.n}`);
    const origen =
      boceto.estructura.origen === 'gemini'
        ? `GEMINI ${boceto.estructura.modelo}`
        : `CAPTURA, porque Gemini no la leyó: ${motivo}`;
    this.log.log(
      `POST /ia/generar-prototipo -> modo BOCETO (respaldo: ${respaldo}; estructura: ${origen}, ` +
        `${boceto.estructura.componentes} componentes; ${segundos} s, ${correcciones.length} correcciones` +
        `${sinRecuadro.length ? `, sin recuadro: ${sinRecuadro.join(' ')}` : ''}, ${archivo.originalname})`,
    );
    return {
      modo: 'boceto',
      etiqueta: 'Boceto automático',
      respaldo,
      estructura: {
        origen: boceto.estructura.origen,
        modelo: boceto.estructura.modelo,
        motivo: boceto.estructura.origen === 'captura' ? motivo : undefined,
      },
      segundos,
      mime: 'image/png',
      imagen: boceto.png.toString('base64'),
      ancho: boceto.ancho,
      alto: boceto.alto,
      correcciones: boceto.correcciones.map((k) => ({
        n: k.n,
        heuristica: k.heuristica,
        severidad: k.severidad,
        titulo: k.titulo,
        recomendacion: k.recomendacion,
        ubicacion: k.ubicacionUsada,
        aplicado: k.aplicado,
      })),
    };
  }

  // Los hallazgos llegan como texto JSON en el campo "hallazgos" del
  // multipart, en el mismo orden que la matriz.
  private leerHallazgos(json: string | undefined): CorreccionPedida[] {
    let lista: unknown;
    try {
      lista = JSON.parse(json ?? '');
    } catch {
      throw new BadRequestException(
        'Envía los hallazgos de la evaluación en el campo "hallazgos" como una lista JSON.',
      );
    }
    if (!Array.isArray(lista) || lista.length === 0) {
      throw new BadRequestException(
        'No hay hallazgos que corregir: evalúa la captura antes de generar el prototipo.',
      );
    }
    const codigos = new Set<string>(HEURISTICAS.map((h) => h.codigo));
    const texto = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
    const correcciones = lista
      .slice(0, MAX_HALLAZGOS)
      .filter((h: any) => h && codigos.has(h.heuristica) && texto(h.recomendacion, 1).length)
      .map((h: any, i) => ({
        n: i + 1,
        heuristica: h.heuristica as string,
        severidad: Math.min(4, Math.max(1, Math.round(Number(h.severidad)) || 1)),
        titulo: texto(h.titulo, 160),
        problema: texto(h.problema, 600),
        ubicacion: texto(h.ubicacion, 300),
        recomendacion: texto(h.recomendacion, 600),
        zona: zonaValida(h.zona),
      }));
    if (!correcciones.length) {
      throw new BadRequestException(
        'Los hallazgos enviados no tienen heurística (H1 a H10) ni recomendación.',
      );
    }
    return correcciones;
  }
}

// Explicacion corta en espanol de por que no hubo imagen, para la pantalla
// y el log (la API responde en ingles y con textos largos).
function motivoSinImagen(intentos: string[]): string {
  const modelos = intentos.map((i) => i.split(':')[0]);
  if (intentos.length && intentos.every((i) => /HTTP 429/.test(i))) {
    return (
      'la clave de Gemini no tiene cuota para generar imágenes ' +
      `(HTTP 429 en ${modelos.join(' y ')}; el plan gratuito no incluye estos modelos)`
    );
  }
  const corto = intentos.map((i) => {
    const [modelo, ...resto] = i.split(': ');
    const motivo = resto.join(': ');
    if (/HTTP 429/.test(motivo)) return `${modelo}: sin cuota (HTTP 429)`;
    if (/HTTP 503/.test(motivo)) return `${modelo}: saturado (HTTP 503)`;
    if (/HTTP 404/.test(motivo)) return `${modelo}: no disponible (HTTP 404)`;
    return `${modelo}: ${motivo.slice(0, 80)}`;
  });
  return `el modelo de imagen no respondió a tiempo (${corto.join(' · ')})`;
}

function motivoCorto(intentos: string[]): string {
  return intentos
    .map((i) => {
      const [modelo, ...resto] = i.split(': ');
      const motivo = resto.join(': ');
      if (/HTTP 429/.test(motivo)) return `${modelo}: sin cuota (HTTP 429)`;
      if (/HTTP 503/.test(motivo)) return `${modelo}: saturado (HTTP 503)`;
      return `${modelo}: ${motivo.slice(0, 80)}`;
    })
    .join(' · ');
}
