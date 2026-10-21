import { useEffect, useRef, useState } from 'react';
import {
  descargarMatrizWord,
  EvaluacionCaptura,
  generarPrototipo,
  PrototipoCorregido,
} from '../api';
import { mensajeError } from '../formato';

const SEVERIDADES = [
  ['4', 'catastróficos'],
  ['3', 'mayores'],
  ['2', 'menores'],
  ['1', 'cosméticos'],
] as const;

interface Props {
  reporte: EvaluacionCaptura;
  // La captura que se evaluó y su URL para mostrarla al lado del prototipo.
  imagen: File;
  vistaOriginal: string;
}

function nombreBase(archivo: string) {
  return archivo.replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 60) || 'captura';
}

// Debajo del reporte de /evaluacion-captura: la matriz de evaluación (en
// pantalla y en Word) y el prototipo corregido de la misma pantalla.
export default function MatrizPrototipo({ reporte, imagen, vistaOriginal }: Props) {
  const [iniciado, setIniciado] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [errorWord, setErrorWord] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [prototipo, setPrototipo] = useState<PrototipoCorregido | null>(null);
  const [errorPrototipo, setErrorPrototipo] = useState<string | null>(null);
  const matrizRef = useRef<HTMLElement>(null);

  // Mismo orden que el reporte y que la matriz en Word.
  const filas = reporte.grupos.flatMap((g) =>
    g.hallazgos.map((h) => ({ ...h, nombre: g.nombre })),
  );

  useEffect(() => {
    if (!generando) return;
    setSegundos(0);
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [generando]);

  async function pedirPrototipo() {
    setGenerando(true);
    setErrorPrototipo(null);
    setPrototipo(null);
    try {
      setPrototipo(await generarPrototipo(imagen, filas));
    } catch (err) {
      setErrorPrototipo(mensajeError(err, 'No se pudo generar el prototipo corregido'));
    } finally {
      setGenerando(false);
    }
  }

  function generar() {
    setIniciado(true);
    requestAnimationFrame(() => matrizRef.current?.focus());
    if (filas.length) pedirPrototipo();
  }

  async function descargarWord() {
    setDescargando(true);
    setErrorWord(null);
    try {
      const blob = await descargarMatrizWord(reporte.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `matriz-heuristica-${nombreBase(reporte.archivo)}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setErrorWord(mensajeError(err, 'No se pudo descargar la matriz en Word'));
    } finally {
      setDescargando(false);
    }
  }

  if (!iniciado) {
    return (
      <div className="card generar-matriz">
        <p style={{ margin: 0 }}>
          Arma la matriz de evaluación con estos hallazgos (para verla aquí o
          descargarla en Word) y una versión corregida de la misma pantalla.
        </p>
        <button type="button" className="submit-btn" onClick={generar}>
          Generar matriz y prototipo
        </button>
      </div>
    );
  }

  const imagenPrototipo = prototipo && `data:${prototipo.mime};base64,${prototipo.imagen}`;
  const extension = prototipo?.mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';

  return (
    <>
      <section
        className="card matriz"
        aria-labelledby="t-matriz"
        tabIndex={-1}
        ref={matrizRef}
      >
        <div className="resumen-cabecera">
          <h3 id="t-matriz" className="card-title">
            Matriz de evaluación heurística
          </h3>
          <button
            type="button"
            className="secondary-btn boton-compacto"
            onClick={descargarWord}
            disabled={descargando}
          >
            {descargando ? 'Preparando Word…' : 'Descargar matriz en Word'}
          </button>
        </div>
        <p className="muted">
          {reporte.archivo} · {reporte.pantalla}
        </p>
        {errorWord && (
          <div className="alert alert-error" role="alert">
            {errorWord}
          </div>
        )}

        <div className="table-scroll" tabIndex={0} role="region" aria-label="Hallazgos por severidad">
          <table className="tabla-resumen-sev">
            <caption className="sr-only">Hallazgos por severidad</caption>
            <thead>
              <tr>
                {SEVERIDADES.map(([n, etiqueta]) => (
                  <th key={n} scope="col" className="num">
                    {etiqueta[0].toUpperCase() + etiqueta.slice(1)} ({n})
                  </th>
                ))}
                <th scope="col" className="num">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {SEVERIDADES.map(([n]) => (
                  <td key={n} className="num">
                    <span
                      className={`chip-sev ${reporte.porSeveridad[n] ? `sev-n-${n}` : 'chip-vacio'}`}
                    >
                      {reporte.porSeveridad[n]}
                    </span>
                  </td>
                ))}
                <td className="num">
                  <strong>{reporte.totalHallazgos}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="table-scroll" tabIndex={0} role="region" aria-label="Matriz de evaluación">
          <table className="tabla-matriz">
            <caption className="sr-only">
              Matriz de evaluación: un hallazgo por fila, de mayor a menor severidad
            </caption>
            <thead>
              <tr>
                <th scope="col" className="num">
                  #
                </th>
                <th scope="col">Heurística</th>
                <th scope="col">Severidad</th>
                <th scope="col">Problema</th>
                <th scope="col">Dónde</th>
                <th scope="col">Recomendación</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((h, i) => (
                <tr key={i}>
                  <td className="num">{i + 1}</td>
                  <td>
                    <span className="codigo-h">{h.heuristica}</span> {h.nombre}
                  </td>
                  <td>
                    <span className={`chip-sev sev-n-${h.severidad}`}>
                      {h.severidad} · {h.etiquetaSeveridad}
                    </span>
                  </td>
                  <td>
                    <strong>{h.titulo}.</strong> {h.problema}
                  </td>
                  <td>{h.ubicacion}</td>
                  <td>{h.recomendacion}</td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={6}>Sin hallazgos visibles en la captura.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" aria-labelledby="t-prototipo" aria-busy={generando}>
        <div className="resumen-cabecera">
          <h3 id="t-prototipo" className="card-title">
            Prototipo corregido
          </h3>
        </div>

        {filas.length === 0 && (
          <p>No hay hallazgos que corregir, así que no se genera un prototipo.</p>
        )}

        {generando && (
          <>
            <p className="cargando-texto" role="status">
              <span className="spinner" aria-hidden="true" />
              Generando la versión corregida de la pantalla…{' '}
              <span aria-hidden="true">{segundos} s</span>
            </p>
            <p className="help-text">
              Gemini tiene hasta 20 segundos para generar la imagen; si no
              responde, se redibuja la pantalla como boceto automático, lo que
              puede tardar hasta 40 segundos más.
            </p>
          </>
        )}

        {errorPrototipo && (
          <div className="alert alert-error" role="alert">
            {errorPrototipo}{' '}
            <button type="button" className="link-btn" onClick={pedirPrototipo}>
              Reintentar
            </button>
          </div>
        )}

        {prototipo && imagenPrototipo && (
          <>
            <p className="muted" role="status">
              {prototipo.modo === 'gemini'
                ? `Generado por IA con Gemini (${prototipo.modelo}) en ${prototipo.segundos} s.`
                : `Boceto automático: la pantalla redibujada en escala de grises con las correcciones aplicadas, en ${prototipo.segundos} s, porque Gemini no generó la imagen: ${prototipo.respaldo}.`}
            </p>
            {prototipo.modo === 'boceto' && (
              <p className="muted">
                {prototipo.estructura?.origen === 'gemini'
                  ? `Gemini (${prototipo.estructura.modelo}) leyó qué hay en la pantalla y el servidor la redibujó.`
                  : `La estructura se detectó en los bloques de la captura porque Gemini no pudo leerla${prototipo.estructura?.motivo ? ` (${prototipo.estructura.motivo})` : ''}; el dibujo es más genérico.`}
                {(() => {
                  const sin = prototipo.correcciones.filter((c) => c.ubicacion !== 'recuadro');
                  return sin.length
                    ? ` ${sin.length === 1 ? 'La corrección' : 'Las correcciones'} ${sin.map((c) => `#${c.n}`).join(', ')} no ${sin.length === 1 ? 'tenía' : 'tenían'} recuadro de Gemini y se ${sin.length === 1 ? 'ubicó' : 'ubicaron'} por sentido común.`
                    : ' Todas las correcciones se dibujaron en el recuadro que marcó Gemini.';
                })()}
              </p>
            )}
            <div className="comparacion">
              <figure>
                <figcaption>
                  <strong>Captura original</strong>
                </figcaption>
                <img src={vistaOriginal} alt={`Captura original: ${reporte.archivo}`} />
              </figure>
              <figure>
                <figcaption>
                  <strong>Prototipo corregido</strong>{' '}
                  <span
                    className={`badge ${prototipo.modo === 'gemini' ? 'badge-gemini' : 'badge-reglas'}`}
                  >
                    {prototipo.etiqueta}
                  </span>
                </figcaption>
                <a href={imagenPrototipo} target="_blank" rel="noreferrer">
                  <img
                    src={imagenPrototipo}
                    alt={`${prototipo.etiqueta}: versión corregida de ${reporte.archivo} con ${prototipo.correcciones.length} correcciones, listadas debajo`}
                  />
                </a>
              </figure>
            </div>
            <div className="button-row">
              <a
                className="secondary-btn boton-compacto"
                href={imagenPrototipo}
                download={`prototipo-corregido-${nombreBase(reporte.archivo)}.${extension}`}
              >
                Descargar imagen
              </a>
              <button
                type="button"
                className="link-btn"
                onClick={pedirPrototipo}
                style={{ marginTop: 24 }}
              >
                Generar de nuevo
              </button>
            </div>
            <details className="lista-correcciones">
              <summary>Correcciones aplicadas ({prototipo.correcciones.length})</summary>
              <ol>
                {prototipo.correcciones.map((c) => (
                  <li key={c.n}>
                    <strong>
                      {c.heuristica} · sev. {c.severidad} · {c.titulo}:
                    </strong>{' '}
                    {c.recomendacion}
                    {c.aplicado && <span className="muted"> Aplicado: {c.aplicado}.</span>}
                    {prototipo.modo === 'boceto' && c.ubicacion === 'deducida' && (
                      <span className="muted"> (sin recuadro: ubicada por sentido común)</span>
                    )}
                    {prototipo.modo === 'boceto' && c.ubicacion === 'general' && (
                      <span className="muted"> (sin lugar claro: aplica a toda la pantalla)</span>
                    )}
                  </li>
                ))}
              </ol>
            </details>
          </>
        )}
      </section>
    </>
  );
}
