import { Injectable, Logger } from '@nestjs/common';

// Cliente minimo de la API de Gemini (generativelanguage.googleapis.com)
// con fetch, sin SDK. Pide siempre respuestas JSON con un esquema, para no
// tener que interpretar texto libre.

const URL_API = 'https://generativelanguage.googleapis.com/v1beta/models';

// Orden por defecto: los modelos "lite" van primero porque son los que
// respondieron en pocos segundos en las pruebas del Sprint 3, cuando los
// "flash" devolvian HTTP 503 por alta demanda. Si uno falla, tarda
// demasiado o esta saturado, se pasa al siguiente. Se cambia con
// GEMINI_MODELOS en backend/.env.
const MODELOS_POR_DEFECTO = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];

// Para evaluar capturas importa mas la calidad que la velocidad: con los
// modelos "lite" salia 1 hallazgo donde gemini-3-flash-preview encontraba 6.
// Se cambia con GEMINI_MODELOS_CAPTURA.
const MODELOS_CAPTURA_POR_DEFECTO = [
  'gemini-3-flash-preview',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite-preview',
  'gemini-flash-lite-latest',
];

// Modelos con salida de imagen ("Nano Banana") para el prototipo corregido.
// Con una clave del plan gratuito responden HTTP 429 (sin cuota); entonces
// el prototipo cae al boceto automatico. Se cambia con GEMINI_MODELOS_IMAGEN.
const MODELOS_IMAGEN_POR_DEFECTO = [
  'gemini-3.1-flash-image',
  'gemini-2.5-flash-image',
];

function listaDeEntorno(variable: string, porDefecto: string[]): string[] {
  const lista = process.env[variable]
    ?.split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return lista?.length ? lista : porDefecto;
}

export type ParteGemini =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export interface OpcionesGemini {
  partes: ParteGemini[];
  instrucciones: string;
  // Esquema OpenAPI reducido que acepta Gemini en responseSchema.
  esquema: Record<string, unknown>;
  // Tiempo total para todos los intentos y tope por intento.
  presupuestoMs: number;
  intentoMs: number;
  modelos?: string[];
}

export interface ImagenGemini {
  mime: string;
  base64: string;
}

export interface RespuestaGemini<T> {
  datos: T;
  modelo: string;
  ms: number;
  intentos: string[];
}

export class GeminiNoConfiguradoError extends Error {
  constructor() {
    super('GEMINI_API_KEY no está configurada en backend/.env');
  }
}

export class GeminiError extends Error {
  constructor(
    mensaje: string,
    public readonly intentos: string[],
  ) {
    super(mensaje);
  }
}

@Injectable()
export class GeminiService {
  private readonly log = new Logger('Gemini');

  get configurado(): boolean {
    return Boolean(process.env.GEMINI_API_KEY?.trim());
  }

  get modelos(): string[] {
    return listaDeEntorno('GEMINI_MODELOS', MODELOS_POR_DEFECTO);
  }

  get modelosCaptura(): string[] {
    return listaDeEntorno('GEMINI_MODELOS_CAPTURA', MODELOS_CAPTURA_POR_DEFECTO);
  }

  get modelosImagen(): string[] {
    return listaDeEntorno('GEMINI_MODELOS_IMAGEN', MODELOS_IMAGEN_POR_DEFECTO);
  }

  async generarJson<T>(opciones: OpcionesGemini): Promise<RespuestaGemini<T>> {
    return this.probarModelos(
      opciones.modelos ?? this.modelos,
      opciones.presupuestoMs,
      opciones.intentoMs,
      (modelo, clave, timeoutMs) => this.llamar<T>(modelo, clave, opciones, timeoutMs),
    );
  }

  // Pide una imagen (por ejemplo una version corregida de una captura).
  async generarImagen(
    opciones: Omit<OpcionesGemini, 'esquema' | 'instrucciones'>,
  ): Promise<RespuestaGemini<ImagenGemini>> {
    return this.probarModelos(
      opciones.modelos ?? this.modelosImagen,
      opciones.presupuestoMs,
      opciones.intentoMs,
      async (modelo, clave, timeoutMs) => {
        const cuerpo = await this.postear(
          modelo,
          clave,
          {
            contents: [{ role: 'user', parts: opciones.partes }],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
          },
          timeoutMs,
        );
        const candidato = cuerpo?.candidates?.[0];
        const parte = (candidato?.content?.parts ?? []).find(
          (p: any) => !p.thought && (p.inlineData ?? p.inline_data)?.data,
        );
        const datos = parte && (parte.inlineData ?? parte.inline_data);
        if (!datos) {
          throw new Error(
            `no devolvió una imagen (${candidato?.finishReason ?? cuerpo?.promptFeedback?.blockReason ?? 'sin candidatos'})`,
          );
        }
        return { mime: datos.mimeType ?? datos.mime_type ?? 'image/png', base64: datos.data };
      },
    );
  }

  // Prueba los modelos en orden hasta que uno responda, sin pasarse del
  // presupuesto total.
  private async probarModelos<T>(
    modelos: string[],
    presupuestoMs: number,
    intentoMs: number,
    intentar: (modelo: string, clave: string, timeoutMs: number) => Promise<T>,
  ): Promise<RespuestaGemini<T>> {
    const clave = process.env.GEMINI_API_KEY?.trim();
    if (!clave) throw new GeminiNoConfiguradoError();

    const inicio = Date.now();
    const intentos: string[] = [];
    for (const modelo of modelos) {
      const restante = presupuestoMs - (Date.now() - inicio);
      if (restante < 1500) {
        intentos.push(`${modelo}: sin tiempo restante`);
        break;
      }
      const t0 = Date.now();
      try {
        const datos = await intentar(modelo, clave, Math.min(intentoMs, restante));
        intentos.push(`${modelo}: ok`);
        return { datos, modelo, ms: Date.now() - inicio, intentos };
      } catch (err) {
        const motivo = err instanceof Error ? err.message : String(err);
        intentos.push(`${modelo}: ${motivo}`);
        this.log.warn(
          `${modelo} falló en ${((Date.now() - t0) / 1000).toFixed(1)} s: ${motivo}`,
        );
      }
    }
    throw new GeminiError(
      `Gemini no respondió (${intentos.join(' · ')})`,
      intentos,
    );
  }

  private async llamar<T>(
    modelo: string,
    clave: string,
    o: OpcionesGemini,
    timeoutMs: number,
  ): Promise<T> {
    const cuerpo = await this.postear(
      modelo,
      clave,
      {
        systemInstruction: { parts: [{ text: o.instrucciones }] },
        contents: [{ role: 'user', parts: o.partes }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: o.esquema,
        },
      },
      timeoutMs,
    );

    const candidato = cuerpo?.candidates?.[0];
    const texto = (candidato?.content?.parts ?? [])
      .filter((p: { thought?: boolean; text?: string }) => !p.thought && p.text)
      .map((p: { text: string }) => p.text)
      .join('');
    if (!texto) {
      throw new Error(
        `respuesta vacía (${candidato?.finishReason ?? cuerpo?.promptFeedback?.blockReason ?? 'sin candidatos'})`,
      );
    }
    try {
      return JSON.parse(texto) as T;
    } catch {
      throw new Error('la respuesta no es JSON válido');
    }
  }

  private async postear(
    modelo: string,
    clave: string,
    peticion: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<any> {
    let res: Response;
    try {
      res = await fetch(`${URL_API}/${modelo}:generateContent`, {
        method: 'POST',
        // La clave va en una cabecera y no en la URL, para que no aparezca
        // en logs ni en mensajes de error.
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
        body: JSON.stringify(peticion),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const nombre = (err as Error).name;
      throw new Error(
        nombre === 'TimeoutError' || nombre === 'AbortError'
          ? `sin respuesta en ${Math.round(timeoutMs / 1000)} s`
          : 'no se pudo conectar con la API',
      );
    }

    const cuerpo: any = await res.json().catch(() => null);
    if (!res.ok) {
      const detalle = cuerpo?.error?.message ?? res.statusText;
      throw new Error(`HTTP ${res.status}: ${String(detalle).slice(0, 160)}`);
    }
    return cuerpo;
  }
}
