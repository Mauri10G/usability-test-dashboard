import { useEffect, useRef, useState } from 'react';
import {
  ErrorApi,
  estadoIa,
  EstadoIa,
  EvaluacionCaptura as Evaluacion,
  evaluarCaptura,
} from '../api';
import { mensajeError, momento } from '../formato';
import MatrizPrototipo from './MatrizPrototipo';

const TIPOS = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_MB = 8;

const SIN_CLAVE =
  'Esta función necesita la API de Gemini y el backend no tiene una clave ' +
  'configurada. Agrega GEMINI_API_KEY=tu_clave en backend/.env y reinicia ' +
  'el backend.';

// Evaluación heurística de una captura de pantalla con Gemini: aplica las
// 10 heurísticas de Nielsen, igual que docs/diagnostico-heuristico.md.
export default function EvaluacionCaptura() {
  const [estado, setEstado] = useState<EstadoIa | null>(null);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [evaluando, setEvaluando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reporte, setReporte] = useState<Evaluacion | null>(null);
  const [copiado, setCopiado] = useState(false);
  // La captura que produjo el reporte (puede cambiar el archivo elegido
  // después), para el prototipo corregido.
  const [evaluada, setEvaluada] = useState<{ archivo: File; url: string } | null>(null);
  const reporteRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    estadoIa()
      .then(setEstado)
      .catch((err) => setErrorEstado(mensajeError(err, 'No se pudo consultar el backend')));
  }, []);

  // Libera la URL de la vista previa al cambiar de imagen.
  useEffect(() => () => {
    if (vista) URL.revokeObjectURL(vista);
  }, [vista]);

  useEffect(() => () => {
    if (evaluada) URL.revokeObjectURL(evaluada.url);
  }, [evaluada]);

  // Contador visible mientras Gemini responde.
  useEffect(() => {
    if (!evaluando) return;
    setSegundos(0);
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [evaluando]);

  // Permite pegar una captura con Ctrl+V además de elegir un archivo.
  useEffect(() => {
    function pegar(e: ClipboardEvent) {
      const item = [...(e.clipboardData?.files ?? [])].find((f) =>
        f.type.startsWith('image/'),
      );
      if (item) elegir(new File([item], item.name || 'captura-pegada.png', { type: item.type }));
    }
    window.addEventListener('paste', pegar);
    return () => window.removeEventListener('paste', pegar);
  }, []);

  function elegir(f: File | null) {
    setError(null);
    setErrorArchivo(null);
    setCopiado(false);
    if (!f) {
      setArchivo(null);
      setVista(null);
      return;
    }
    if (!TIPOS.includes(f.type)) {
      setErrorArchivo('El archivo debe ser una imagen PNG, JPG o WebP.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setErrorArchivo(`La imagen pesa más de ${MAX_MB} MB. Recórtala o guárdala como JPG.`);
      return;
    }
    setArchivo(f);
    setVista(URL.createObjectURL(f));
  }

  async function evaluar(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo) {
      setErrorArchivo('Elige o pega una captura antes de evaluar.');
      inputRef.current?.focus();
      return;
    }
    setEvaluando(true);
    setError(null);
    setReporte(null);
    try {
      const r = await evaluarCaptura(archivo);
      setEvaluada({ archivo, url: URL.createObjectURL(archivo) });
      setReporte(r);
      requestAnimationFrame(() => reporteRef.current?.focus());
    } catch (err) {
      if (err instanceof ErrorApi && err.status === 503) {
        setEstado((prev) => prev && { ...prev, gemini: { ...prev.gemini, configurado: false } });
        setError(SIN_CLAVE);
      } else {
        setError(mensajeError(err, 'No se pudo evaluar la captura'));
      }
    } finally {
      setEvaluando(false);
    }
  }

  // Mismo formato que las tablas de docs/diagnostico-heuristico.md.
  function copiarMarkdown() {
    if (!reporte) return;
    const filas = reporte.grupos.flatMap((g) =>
      g.hallazgos.map(
        (h, i) =>
          `| ${g.heuristica}-${i + 1} | ${g.nombre} | ${h.problema.replace(/\|/g, '/')} (${h.ubicacion}) | ${h.recomendacion.replace(/\|/g, '/')} | ${h.severidad} |`,
      ),
    );
    const md = [
      `## Evaluación heurística de \`${reporte.archivo}\``,
      '',
      `${reporte.pantalla}. ${reporte.resumen}`,
      '',
      '| ID | Heurística | Hallazgo | Recomendación | Sev. |',
      '|---|---|---|---|---|',
      ...filas,
      '',
      `Generado con Gemini (${reporte.modelo}) el ${momento(reporte.generadoEn)}.`,
    ].join('\n');
    navigator.clipboard
      .writeText(md)
      .then(() => setCopiado(true))
      .catch(() => setError('El navegador no permitió copiar al portapapeles.'));
  }

  const sinClave = estado !== null && !estado.gemini.configurado;

  return (
    <div className="page">
      <h2>Evaluación heurística de una captura</h2>
      <p className="subtitle">
        Sube una captura de cualquier dashboard o interfaz. Gemini aplica las 10
        heurísticas de Nielsen y devuelve cada hallazgo con su severidad (0 a 4)
        y una recomendación.
      </p>

      {errorEstado && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 20 }}>
          {errorEstado}
        </div>
      )}

      {sinClave && (
        <div className="error-summary" role="alert">
          <h3>
            <span aria-hidden="true">⚠ </span>Falta la clave de API de Gemini
          </h3>
          <p style={{ margin: 0 }}>{SIN_CLAVE}</p>
        </div>
      )}

      <form className="card" onSubmit={evaluar} noValidate>
        <label htmlFor="captura">
          Captura de pantalla <span className="obligatorio" aria-hidden="true">*</span>
        </label>
        <input
          ref={inputRef}
          id="captura"
          type="file"
          accept={TIPOS.join(',')}
          className={`input-archivo ${errorArchivo ? 'invalid' : ''}`}
          aria-describedby={`captura-ayuda${errorArchivo ? ' captura-error' : ''}`}
          aria-invalid={errorArchivo ? true : undefined}
          disabled={evaluando || sinClave}
          onChange={(e) => elegir(e.target.files?.[0] ?? null)}
        />
        <p id="captura-ayuda" className="help-text">
          PNG, JPG o WebP de hasta {MAX_MB} MB. También puedes pegarla con Ctrl+V.
          La imagen se envía a la API de Gemini de Google para analizarla.
        </p>
        {errorArchivo && (
          <p id="captura-error" className="error-text" role="alert">
            {errorArchivo}
          </p>
        )}

        {vista && (
          <figure className="vista-previa">
            <img src={vista} alt={`Vista previa de ${archivo?.name ?? 'la captura'}`} />
            <figcaption className="muted">
              {archivo?.name} · {Math.round((archivo?.size ?? 0) / 1024)} KB
            </figcaption>
          </figure>
        )}

        <div className="button-row">
          <button
            type="submit"
            className="submit-btn"
            disabled={evaluando || sinClave}
          >
            {evaluando ? 'Evaluando…' : 'Evaluar captura'}
          </button>
          {evaluando && (
            <p className="cargando-texto" role="status" style={{ marginTop: 24 }}>
              <span className="spinner" aria-hidden="true" />
              Gemini está revisando la captura con las 10 heurísticas…{' '}
              <span aria-hidden="true">{segundos} s</span>
            </p>
          )}
        </div>
        {evaluando && segundos >= 20 && (
          <p className="help-text">
            Está tardando más de lo normal; el servicio de Gemini puede estar
            saturado. Se intentará con otro modelo antes de rendirse.
          </p>
        )}

        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}
      </form>

      {reporte && (
        <section
          className="card reporte-captura"
          aria-labelledby="t-reporte"
          tabIndex={-1}
          ref={reporteRef}
        >
          <div className="resumen-cabecera">
            <h3 id="t-reporte" className="card-title">
              Reporte heurístico
            </h3>
            <span className="badge badge-gemini">Gemini · {reporte.modelo}</span>
          </div>
          <p className="lead">{reporte.pantalla}</p>
          <p>{reporte.resumen}</p>

          <div className="conteo-severidad" aria-label="Hallazgos por severidad">
            {(
              [
                ['4', 'catastróficos'],
                ['3', 'mayores'],
                ['2', 'menores'],
                ['1', 'cosméticos'],
              ] as const
            ).map(([n, etiqueta]) => (
              <span
                key={n}
                className={`chip-sev ${reporte.porSeveridad[n] ? `sev-n-${n}` : 'chip-vacio'}`}
              >
                <strong>{reporte.porSeveridad[n]}</strong> {etiqueta} ({n})
              </span>
            ))}
          </div>
          <p className="muted">
            {reporte.totalHallazgos} hallazgos en {reporte.grupos.length}{' '}
            heurísticas · {reporte.archivo} · {reporte.segundos} s ·{' '}
            {momento(reporte.generadoEn)}{' '}
            <button type="button" className="link-btn" onClick={copiarMarkdown}>
              Copiar como tabla Markdown
            </button>
            {copiado && <span role="status"> Copiado.</span>}
          </p>

          {reporte.totalHallazgos === 0 && (
            <p>Gemini no encontró problemas visibles en esta captura.</p>
          )}

          {reporte.grupos.map((g) => (
            <section
              key={g.heuristica}
              className="grupo-heuristica"
              aria-labelledby={`h-${g.heuristica}`}
            >
              <h4 id={`h-${g.heuristica}`}>
                <span className="codigo-h">{g.heuristica}</span> {g.nombre}
                <span className="muted">
                  {' '}
                  · {g.hallazgos.length}{' '}
                  {g.hallazgos.length === 1 ? 'hallazgo' : 'hallazgos'}
                </span>
              </h4>
              {g.hallazgos.map((h, i) => (
                <article
                  key={i}
                  className={`hallazgo sev-borde-${h.severidad}`}
                  aria-label={`${h.titulo}, severidad ${h.severidad}`}
                >
                  <div className="hallazgo-cabecera">
                    <span className={`chip-sev sev-n-${h.severidad}`}>
                      {h.severidad} · {h.etiquetaSeveridad}
                    </span>
                    <strong>{h.titulo}</strong>
                  </div>
                  <dl>
                    <dt>Problema</dt>
                    <dd>{h.problema}</dd>
                    <dt>Dónde</dt>
                    <dd>{h.ubicacion}</dd>
                    <dt>Recomendación</dt>
                    <dd>{h.recomendacion}</dd>
                  </dl>
                </article>
              ))}
            </section>
          ))}

          {reporte.heuristicasSinHallazgos.length > 0 && (
            <p className="muted">
              Sin hallazgos en:{' '}
              {reporte.heuristicasSinHallazgos
                .map((h) => `${h.heuristica} ${h.nombre}`)
                .join(' · ')}
              .
            </p>
          )}
          <p className="muted">
            Es una evaluación automática a partir de una imagen: revisa cada
            hallazgo antes de pasarlo a la matriz del diagnóstico.
          </p>
        </section>
      )}

      {reporte && evaluada && (
        <MatrizPrototipo
          key={reporte.id}
          reporte={reporte}
          imagen={evaluada.archivo}
          vistaOriginal={evaluada.url}
        />
      )}
    </div>
  );
}
