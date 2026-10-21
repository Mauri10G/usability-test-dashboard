import { Injectable, Logger } from '@nestjs/common';
import { EvaluacionesService } from '../evaluaciones/evaluaciones.service';
import { Severidad } from '../evaluaciones/entities/prueba.entity';
import { HistoriasService } from '../scrum/historias.service';
import { AnalizarDto } from './dto/analizar.dto';
import { GeminiNoConfiguradoError, GeminiService } from './gemini.service';
import {
  esquemaAnalisisGemini,
  instruccionesAnalisis,
  RespuestaAnalisisGemini,
} from './prompts';
import {
  CATEGORIA_OTROS,
  CategoriaUx,
  coincidencias,
  MIN_ALTAS_RECURRENTE,
  MIN_PRUEBAS_RECURRENTE,
  normalizar,
  PESO_SEVERIDAD,
  PUNTOS_DEBIL,
  PUNTOS_FUERTE,
  REGLAS,
} from './reglas';

export interface ObservacionClasificada {
  id: string;
  texto: string;
  severidad: Severidad;
  pruebaId: string;
  nombreEvaluacion: string;
  pantallaEvaluada: string;
  categoria: CategoriaUx;
  nombreCategoria: string;
  palabrasDetectadas: string[];
  puntaje: number;
  // Reglas: alta = dos o mas puntos; media = una palabra fuerte; baja =
  // solo palabras debiles o ninguna. Gemini: la que declara el modelo.
  confianza: 'alta' | 'media' | 'baja';
  // Explicacion de Gemini; null cuando clasificaron las reglas.
  justificacion: string | null;
  origen: 'gemini' | 'reglas';
}

export interface ResumenCategoria {
  categoria: CategoriaUx;
  nombre: string;
  descripcion: string;
  observaciones: number;
  porcentaje: number;
  pruebas: number;
  pantallas: string[];
  porSeveridad: Record<Severidad, number>;
  // Suma de los pesos de severidad (alta 3, media 2, baja 1).
  impacto: number;
  recurrente: boolean;
  motivoRecurrente: string | null;
  palabrasFrecuentes: string[];
}

export interface HistoriaSugerida {
  codigoSugerido: string;
  categoria: CategoriaUx;
  nombre: string;
  descripcion: string;
  businessValue: number;
  storyPoints: number;
  criteriosAceptacion: string[];
  motivo: string;
  evidencia: { texto: string; severidad: Severidad; pantallaEvaluada: string }[];
}

export interface AnalisisUx {
  generadoEn: string;
  metodo: {
    tipo: 'gemini' | 'reglas';
    // Modelo de Gemini que respondio, segundos que tardo y, si se usaron
    // las reglas, por que no se uso Gemini.
    modelo: string | null;
    segundos: number | null;
    respaldo: string | null;
    descripcion: string;
    reglas: {
      categoria: CategoriaUx;
      nombre: string;
      palabrasClave: string[];
      palabrasDebiles: string[];
    }[];
    umbrales: { minPruebasRecurrente: number; minAltasRecurrente: number };
  };
  filtro: { pantallaEvaluada: string | null; pruebas: number | null };
  totalPruebas: number;
  totalObservaciones: number;
  resumen: { texto: string; puntos: string[] };
  categorias: ResumenCategoria[];
  observaciones: ObservacionClasificada[];
  sugerencias: HistoriaSugerida[];
}

// Texto de una historia sugerida; Gemini lo redacta y las reglas lo toman
// de la plantilla de cada categoria en reglas.ts.
interface TextoHistoria {
  nombre: string;
  quiero: string;
  para: string;
  criterios: string[];
}

const DESCRIPCION_REGLAS =
  'Cada observación se clasifica en la categoría UX cuyas palabras ' +
  `clave aparecen más en su texto (fuertes ${PUNTOS_FUERTE} punto, ` +
  `débiles ${PUNTOS_DEBIL}). `;

const DESCRIPCION_GEMINI =
  'Gemini lee cada observación y la asigna a una de las categorías UX, con ' +
  'una justificación; también redacta el resumen y el texto de las historias. ' +
  'Los números (impacto, recurrencia, Business Value y códigos) los calcula ' +
  'el servidor con las mismas fórmulas que el modo de reglas. ';

const DESCRIPCION_COMUN =
  'El impacto de una categoría es la suma de las severidades de sus ' +
  'observaciones (alta 3, media 2, baja 1). ' +
  `Es recurrente si aparece en ${MIN_PRUEBAS_RECURRENTE} o más pruebas ` +
  `distintas, o si tiene ${MIN_ALTAS_RECURRENTE} o más observaciones ` +
  'de severidad alta; en ese caso se sugiere una historia de usuario.';

@Injectable()
export class IaService {
  private readonly log = new Logger('IA');

  constructor(
    private readonly evaluaciones: EvaluacionesService,
    private readonly historias: HistoriasService,
    private readonly gemini: GeminiService,
  ) {}

  async analizar(dto: AnalizarDto = {}): Promise<AnalisisUx> {
    const pantallaFiltro = dto.pantallaEvaluada?.trim() || null;
    const pruebas = (await this.evaluaciones.listar()).filter(
      (p) =>
        (!pantallaFiltro ||
          p.pantallaEvaluada.trim().toLowerCase() ===
            pantallaFiltro.toLowerCase()) &&
        (!dto.pruebaIds?.length || dto.pruebaIds.includes(p.id)),
    );

    let observaciones = pruebas.flatMap((p) =>
      p.observaciones.map((o) =>
        this.clasificar(o.id, o.texto, o.severidad, {
          pruebaId: p.id,
          nombreEvaluacion: p.nombreEvaluacion,
          pantallaEvaluada: p.pantallaEvaluada,
        }),
      ),
    );

    // Primero Gemini; si no hay clave, no hay observaciones o la llamada
    // falla, quedan las reglas, para que el analisis nunca se quede vacio.
    let gemini: {
      respuesta: RespuestaAnalisisGemini;
      modelo: string;
      ms: number;
    } | null = null;
    let respaldo: string | null = null;
    if (observaciones.length === 0) {
      respaldo = 'no hay observaciones que enviar a Gemini';
    } else {
      try {
        const r = await this.gemini.generarJson<RespuestaAnalisisGemini>({
          instrucciones: instruccionesAnalisis(),
          partes: [{ text: this.entradaGemini(observaciones, pantallaFiltro) }],
          esquema: esquemaAnalisisGemini(),
          presupuestoMs: 45_000,
          intentoMs: 15_000,
        });
        gemini = { respuesta: r.datos, modelo: r.modelo, ms: r.ms };
      } catch (err) {
        respaldo =
          err instanceof GeminiNoConfiguradoError
            ? 'GEMINI_API_KEY no está configurada'
            : (err as Error).message;
      }
    }

    let textos = new Map<CategoriaUx, TextoHistoria>();
    if (gemini) {
      observaciones = this.aplicarClasificacionGemini(
        observaciones,
        gemini.respuesta,
      );
      textos = new Map(
        (gemini.respuesta.historias ?? [])
          .filter((h) => h.nombre?.trim() && h.quiero?.trim() && h.para?.trim())
          .map((h) => [
            h.categoria,
            {
              nombre: h.nombre.trim(),
              quiero: h.quiero.trim().replace(/[.]$/, ''),
              para: h.para.trim().replace(/[.]$/, ''),
              criterios: (h.criterios ?? [])
                .map((c) => c?.trim())
                .filter(Boolean)
                .map((c) => mayuscula(c.endsWith('.') ? c : `${c}.`)),
            },
          ]),
      );
    }

    const categorias = this.agrupar(observaciones);
    const sugerencias = await this.sugerirHistorias(
      categorias,
      observaciones,
      textos,
    );
    const resumenGemini = gemini?.respuesta.resumen;

    const segundos = gemini ? Math.round(gemini.ms / 100) / 10 : null;
    this.log.log(
      gemini
        ? `POST /ia/analizar -> modo GEMINI (${gemini.modelo}, ${segundos} s, ` +
            `${observaciones.length} observaciones, ${sugerencias.length} historias)`
        : `POST /ia/analizar -> modo REGLAS (respaldo: ${respaldo})`,
    );

    return {
      generadoEn: new Date().toISOString(),
      metodo: {
        tipo: gemini ? 'gemini' : 'reglas',
        modelo: gemini?.modelo ?? null,
        segundos,
        respaldo,
        descripcion:
          (gemini ? DESCRIPCION_GEMINI : DESCRIPCION_REGLAS) + DESCRIPCION_COMUN,
        reglas: REGLAS.map((r) => ({
          categoria: r.categoria,
          nombre: r.nombre,
          palabrasClave: r.palabrasClave,
          palabrasDebiles: r.palabrasDebiles,
        })),
        umbrales: {
          minPruebasRecurrente: MIN_PRUEBAS_RECURRENTE,
          minAltasRecurrente: MIN_ALTAS_RECURRENTE,
        },
      },
      filtro: {
        pantallaEvaluada: pantallaFiltro,
        pruebas: dto.pruebaIds?.length ?? null,
      },
      totalPruebas: pruebas.length,
      totalObservaciones: observaciones.length,
      resumen: this.conLecturaGemini(
        this.resumir(
          pruebas.length,
          observaciones,
          categorias,
          sugerencias,
          pantallaFiltro,
        ),
        resumenGemini,
      ),
      categorias,
      observaciones,
      sugerencias,
    };
  }

  // Las cifras del resumen salen del servidor; Gemini agrega su lectura de
  // los patrones y la prioridad, sin numeros que puedan contradecirlas.
  private conLecturaGemini(
    base: { texto: string; puntos: string[] },
    lectura: RespuestaAnalisisGemini['resumen'] | undefined,
  ): { texto: string; puntos: string[] } {
    if (!lectura) return base;
    const patrones = (lectura.patrones ?? []).map((p) => p?.trim()).filter(Boolean);
    const prioridad = lectura.prioridad?.trim();
    return {
      texto: base.texto,
      puntos: [
        ...base.puntos,
        ...patrones,
        ...(prioridad ? [`Qué corregir primero: ${prioridad}`] : []),
      ],
    };
  }

  // Lo que se envia a Gemini: solo el texto de las observaciones y los datos
  // necesarios para agrupar. No incluye nombres de evaluadores.
  private entradaGemini(
    observaciones: ObservacionClasificada[],
    pantalla: string | null,
  ): string {
    return JSON.stringify(
      {
        filtro: pantalla ? { pantallaEvaluada: pantalla } : 'todas las pantallas',
        observaciones: observaciones.map((o) => ({
          id: o.id,
          texto: o.texto,
          severidad: o.severidad,
          pantalla: o.pantallaEvaluada,
          pruebaId: o.pruebaId,
        })),
      },
      null,
      1,
    );
  }

  // Reemplaza la clasificacion de las reglas por la de Gemini. Si Gemini
  // omite una observacion o devuelve un id desconocido, esa observacion se
  // queda con la clasificacion de las reglas.
  private aplicarClasificacionGemini(
    observaciones: ObservacionClasificada[],
    respuesta: RespuestaAnalisisGemini,
  ): ObservacionClasificada[] {
    const nombres = new Map<CategoriaUx, string>([
      ...REGLAS.map((r) => [r.categoria, r.nombre] as [CategoriaUx, string]),
      [CATEGORIA_OTROS.categoria, CATEGORIA_OTROS.nombre],
    ]);
    const porId = new Map(
      (respuesta.clasificacion ?? [])
        .filter((c) => nombres.has(c.categoria))
        .map((c) => [c.id, c]),
    );
    return observaciones.map((o) => {
      const c = porId.get(o.id);
      if (!c) return o;
      return {
        ...o,
        categoria: c.categoria,
        nombreCategoria: nombres.get(c.categoria)!,
        palabrasDetectadas: [],
        puntaje: 0,
        confianza: ['alta', 'media', 'baja'].includes(c.confianza)
          ? c.confianza
          : 'media',
        justificacion: c.justificacion?.trim() || null,
        origen: 'gemini',
      };
    });
  }

  private clasificar(
    id: string,
    texto: string,
    severidad: Severidad,
    prueba: Pick<
      ObservacionClasificada,
      'pruebaId' | 'nombreEvaluacion' | 'pantallaEvaluada'
    >,
  ): ObservacionClasificada {
    const normalizado = normalizar(texto);
    let mejor: {
      regla: (typeof REGLAS)[number];
      fuertes: string[];
      debiles: string[];
      puntaje: number;
    } | null = null;

    // Gana el mayor puntaje; a igual puntaje, la que tiene mas palabras
    // fuertes; si sigue el empate, la que va primero en REGLAS.
    for (const regla of REGLAS) {
      const c = coincidencias(normalizado, regla);
      if (c.puntaje === 0) continue;
      if (
        !mejor ||
        c.puntaje > mejor.puntaje ||
        (c.puntaje === mejor.puntaje && c.fuertes.length > mejor.fuertes.length)
      ) {
        mejor = { regla, ...c };
      }
    }

    if (!mejor) {
      return {
        id,
        texto,
        severidad,
        ...prueba,
        categoria: CATEGORIA_OTROS.categoria,
        nombreCategoria: CATEGORIA_OTROS.nombre,
        palabrasDetectadas: [],
        puntaje: 0,
        confianza: 'baja',
        justificacion: null,
        origen: 'reglas',
      };
    }

    return {
      id,
      texto,
      severidad,
      ...prueba,
      categoria: mejor.regla.categoria,
      nombreCategoria: mejor.regla.nombre,
      palabrasDetectadas: [...mejor.fuertes, ...mejor.debiles],
      puntaje: mejor.puntaje,
      confianza:
        mejor.puntaje >= 2 ? 'alta' : mejor.fuertes.length > 0 ? 'media' : 'baja',
      justificacion: null,
      origen: 'reglas',
    };
  }

  private agrupar(observaciones: ObservacionClasificada[]): ResumenCategoria[] {
    const total = observaciones.length;
    const definiciones = [...REGLAS, CATEGORIA_OTROS];

    return definiciones
      .map((def) => {
        const delGrupo = observaciones.filter((o) => o.categoria === def.categoria);
        const porSeveridad = { alta: 0, media: 0, baja: 0 };
        delGrupo.forEach((o) => porSeveridad[o.severidad]++);
        const pruebas = new Set(delGrupo.map((o) => o.pruebaId)).size;

        // "Otros" nunca se marca como recurrente: no se sabe que problema es.
        let motivoRecurrente: string | null = null;
        if (def.categoria !== 'otros') {
          if (pruebas >= MIN_PRUEBAS_RECURRENTE) {
            motivoRecurrente = `Aparece en ${pruebas} pruebas distintas.`;
          } else if (porSeveridad.alta >= MIN_ALTAS_RECURRENTE) {
            motivoRecurrente = `Tiene ${porSeveridad.alta} observaciones de severidad alta.`;
          }
        }

        const conteoPalabras = new Map<string, number>();
        delGrupo
          .flatMap((o) => o.palabrasDetectadas)
          .forEach((p) => conteoPalabras.set(p, (conteoPalabras.get(p) ?? 0) + 1));

        return {
          categoria: def.categoria,
          nombre: def.nombre,
          descripcion: def.descripcion,
          observaciones: delGrupo.length,
          porcentaje: total === 0 ? 0 : Math.round((delGrupo.length / total) * 100),
          pruebas,
          pantallas: [...new Set(delGrupo.map((o) => o.pantallaEvaluada))],
          porSeveridad,
          impacto: delGrupo.reduce((acc, o) => acc + PESO_SEVERIDAD[o.severidad], 0),
          recurrente: motivoRecurrente !== null,
          motivoRecurrente,
          palabrasFrecuentes: [...conteoPalabras.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([p]) => p),
        };
      })
      .filter((c) => c.observaciones > 0)
      .sort(
        (a, b) =>
          b.impacto - a.impacto ||
          b.observaciones - a.observaciones ||
          a.nombre.localeCompare(b.nombre),
      );
  }

  private async sugerirHistorias(
    categorias: ResumenCategoria[],
    observaciones: ObservacionClasificada[],
    textos = new Map<CategoriaUx, TextoHistoria>(),
  ): Promise<HistoriaSugerida[]> {
    const recurrentes = categorias.filter((c) => c.recurrente);
    if (recurrentes.length === 0) return [];

    // Los codigos sugeridos continuan despues del mayor que ya existe en el
    // backlog, igual que el boton "+ Nueva historia".
    const backlog = await this.historias.listar();
    let siguiente =
      Math.max(
        0,
        ...backlog
          .map((h) => Number(h.codigo.replace('HU-', '')))
          .filter((n) => Number.isInteger(n)),
      ) + 1;

    return recurrentes.map((cat) => {
      const regla = REGLAS.find((r) => r.categoria === cat.categoria)!;
      const texto: TextoHistoria = textos.get(cat.categoria) ?? regla.historia;
      const criterios = texto.criterios.length
        ? texto.criterios
        : regla.historia.criterios;
      const evidencia = observaciones
        .filter((o) => o.categoria === cat.categoria)
        .sort((a, b) => PESO_SEVERIDAD[b.severidad] - PESO_SEVERIDAD[a.severidad])
        .slice(0, 5)
        .map((o) => ({
          texto: o.texto,
          severidad: o.severidad,
          pantallaEvaluada: o.pantallaEvaluada,
        }));

      // Business Value: el doble de la severidad promedio (1 a 3) mas el
      // numero de pruebas afectadas (hasta 4). Queda entre 3 y 10.
      const severidadPromedio = cat.impacto / cat.observaciones;
      const businessValue = Math.min(
        10,
        Math.max(1, Math.round(severidadPromedio * 2 + Math.min(cat.pruebas, 4))),
      );

      const pantallas = cat.pantallas.join(', ');
      const codigo = `HU-${String(siguiente++).padStart(2, '0')}`;
      return {
        codigoSugerido: codigo,
        categoria: cat.categoria,
        nombre: `${texto.nombre} (${pantallas})`,
        descripcion: `Como evaluador de usabilidad, quiero ${texto.quiero}, para ${texto.para}.`,
        businessValue,
        storyPoints: regla.historia.storyPoints,
        criteriosAceptacion: criterios,
        motivo:
          `${cat.motivoRecurrente} ` +
          `${plural(cat.observaciones, 'observación', 'observaciones')} de ` +
          `${cat.nombre.toLowerCase()} (${plural(cat.porSeveridad.alta, 'alta', 'altas')}, ` +
          `${plural(cat.porSeveridad.media, 'media', 'medias')}, ` +
          `${plural(cat.porSeveridad.baja, 'baja', 'bajas')}) en: ${pantallas}. ` +
          `Business Value = 2 × severidad promedio ` +
          `(${severidadPromedio.toFixed(1)}) + pruebas afectadas ` +
          `(${Math.min(cat.pruebas, 4)}) = ${businessValue}.`,
        evidencia,
      };
    });
  }

  private resumir(
    totalPruebas: number,
    observaciones: ObservacionClasificada[],
    categorias: ResumenCategoria[],
    sugerencias: HistoriaSugerida[],
    pantalla: string | null,
  ): { texto: string; puntos: string[] } {
    const ambito = pantalla ? ` de la pantalla "${pantalla}"` : '';
    if (observaciones.length === 0) {
      return {
        texto:
          totalPruebas === 0
            ? `Todavía no hay pruebas registradas${ambito}. Registra una prueba con observaciones para generar el análisis.`
            : `Las ${totalPruebas} pruebas${ambito} no tienen observaciones de texto, así que no hay hallazgos que analizar.`,
        puntos: [],
      };
    }

    const puntos: string[] = [];
    const [principal, ...resto] = categorias.filter((c) => c.categoria !== 'otros');

    if (principal) {
      puntos.push(
        `La categoría con más impacto es ${principal.nombre}: ` +
          `${plural(principal.observaciones, 'observación', 'observaciones')} ` +
          `(${principal.porcentaje} %), ` +
          `${principal.porSeveridad.alta === 0 ? 'ninguna' : principal.porSeveridad.alta} de severidad alta.`,
      );
    }
    if (resto.length) {
      puntos.push(
        `Le ${resto.length === 1 ? 'sigue' : 'siguen'} ` +
          resto
            .slice(0, 2)
            .map((c) => `${c.nombre} (${c.observaciones})`)
            .join(' y ') +
          '.',
      );
    }

    const altasPorPantalla = new Map<string, number>();
    observaciones
      .filter((o) => o.severidad === 'alta')
      .forEach((o) =>
        altasPorPantalla.set(
          o.pantallaEvaluada,
          (altasPorPantalla.get(o.pantallaEvaluada) ?? 0) + 1,
        ),
      );
    const maxAltas = Math.max(0, ...altasPorPantalla.values());
    const peores = [...altasPorPantalla.entries()]
      .filter(([, n]) => n === maxAltas)
      .map(([p]) => `"${p}"`);
    if (maxAltas > 0 && !pantalla) {
      const conteo = plural(maxAltas, 'observación', 'observaciones');
      puntos.push(
        peores.length === 1
          ? `La pantalla con más problemas graves es ${peores[0]}, con ${conteo} de severidad alta.`
          : `Las pantallas con más problemas graves son ${enumerar(peores)}, con ${conteo} de severidad alta cada una.`,
      );
    }

    if (sugerencias.length) {
      puntos.push(
        `Se detectaron ${plural(sugerencias.length, 'problema recurrente', 'problemas recurrentes')} ` +
          `(${sugerencias.map((s) => categorias.find((c) => c.categoria === s.categoria)!.nombre).join(', ')}); ` +
          `se ${sugerencias.length === 1 ? 'propone una historia' : 'proponen historias'} de usuario para el backlog.`,
      );
    } else {
      puntos.push(
        'Ningún problema se repite todavía en varias pruebas; no se sugieren historias nuevas.',
      );
    }

    const otros = categorias.find((c) => c.categoria === 'otros');
    if (otros) {
      puntos.push(
        `${plural(otros.observaciones, 'observación no coincidió', 'observaciones no coincidieron')} ` +
          'con ninguna regla y quedaron en "Otros"; conviene revisarlas a mano.',
      );
    }

    return {
      texto:
        `Se analizaron ${plural(observaciones.length, 'observación', 'observaciones')} ` +
        `de ${plural(totalPruebas, 'prueba', 'pruebas')}${ambito}.`,
      puntos,
    };
  }
}

function plural(n: number, singular: string, varios: string) {
  return `${n} ${n === 1 ? singular : varios}`;
}

function mayuscula(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function enumerar(items: string[]) {
  return items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}
