import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AnalisisUx,
  analizarObservaciones,
  CategoriaUx,
  crearHistoria,
  ErrorApi,
  HistoriaSugerida,
  obtenerMetricas,
  Severidad,
} from '../api';
import { ETIQUETA_SEVERIDAD, mensajeError, momento } from '../formato';

const SEVERIDADES: Severidad[] = ['alta', 'media', 'baja'];

const ETIQUETA_CONFIANZA = { alta: 'Alta', media: 'Media', baja: 'Baja' };

type EstadoSugerencia =
  | { tipo: 'guardando' }
  | { tipo: 'agregada'; codigo: string }
  | { tipo: 'error'; mensaje: string };

// Modulo 3: IA para análisis UX. Muestra el resumen automático, la
// clasificación por categoría y las historias sugeridas que devuelve
// POST /ia/analizar, e indica si las generó Gemini o las reglas de respaldo.
export default function AnalisisIA() {
  const [pantallas, setPantallas] = useState<string[]>([]);
  const [pantalla, setPantalla] = useState('');
  const [analisis, setAnalisis] = useState<AnalisisUx | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<'' | CategoriaUx>('');
  const [sugerencias, setSugerencias] = useState<
    Record<string, EstadoSugerencia>
  >({});

  async function analizar(p = pantalla) {
    setCargando(true);
    setError(null);
    try {
      setAnalisis(
        await analizarObservaciones(p ? { pantallaEvaluada: p } : {}),
      );
      setSugerencias({});
      setFiltroCategoria('');
    } catch (err) {
      setError(mensajeError(err, 'No se pudo generar el análisis'));
    } finally {
      setCargando(false);
    }
  }

  // En desarrollo React monta dos veces los efectos (StrictMode); sin esta
  // bandera cada visita gastaría dos llamadas a Gemini.
  const iniciado = useRef(false);
  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    obtenerMetricas()
      .then((m) => setPantallas(m.opcionesFiltro.pantallas))
      .catch(() => setPantallas([]));
    analizar('');
  }, []);

  async function agregarAlBacklog(s: HistoriaSugerida) {
    setSugerencias((prev) => ({ ...prev, [s.categoria]: { tipo: 'guardando' } }));
    try {
      const creada = await crearHistoria({
        codigo: s.codigoSugerido,
        nombre: s.nombre,
        descripcion:
          `${s.descripcion}\n\nCriterios de aceptación:\n` +
          s.criteriosAceptacion.map((c) => `- ${c}`).join('\n') +
          `\n\nSugerida por el análisis con IA: ${s.motivo}`,
        businessValue: s.businessValue,
        storyPoints: s.storyPoints,
        sprint: null,
        estado: 'por_hacer',
        responsable: '',
      });
      setSugerencias((prev) => ({
        ...prev,
        [s.categoria]: { tipo: 'agregada', codigo: creada.codigo },
      }));
    } catch (err) {
      const mensaje =
        err instanceof ErrorApi && err.status === 409
          ? `El código ${s.codigoSugerido} ya está en uso. Vuelve a analizar para obtener un código libre.`
          : mensajeError(err, 'No se pudo agregar la historia');
      setSugerencias((prev) => ({
        ...prev,
        [s.categoria]: { tipo: 'error', mensaje },
      }));
    }
  }

  const observacionesVisibles =
    analisis?.observaciones.filter(
      (o) => !filtroCategoria || o.categoria === filtroCategoria,
    ) ?? [];

  return (
    <div className="page page-wide">
      <h2>Análisis UX con IA</h2>
      <p className="subtitle">
        Resume las observaciones registradas, las clasifica por categoría UX y
        sugiere historias de usuario cuando un problema se repite.
      </p>

      <form
        className="ia-controles"
        onSubmit={(e) => {
          e.preventDefault();
          analizar();
        }}
      >
        <div>
          <label htmlFor="ia-pantalla">Pantalla evaluada</label>
          <select
            id="ia-pantalla"
            value={pantalla}
            onChange={(e) => setPantalla(e.target.value)}
          >
            <option value="">Todas las pantallas</option>
            {pantallas.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="submit-btn" disabled={cargando}>
          {cargando ? 'Analizando…' : 'Analizar observaciones'}
        </button>
        {cargando && (
          <p className="cargando-texto" role="status">
            <span className="spinner" aria-hidden="true" />
            Consultando a Gemini; puede tardar hasta 45 segundos. Si no
            responde, se usan las reglas de palabras clave.
          </p>
        )}
      </form>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {!analisis ? (
        !error && (
          <p className="subtitle" role="status">
            Analizando observaciones…
          </p>
        )
      ) : (
        <>
          <section
            className="card ia-resumen"
            aria-labelledby="t-resumen"
            aria-live="polite"
            aria-busy={cargando}
          >
            <div className="resumen-cabecera">
              <h3 id="t-resumen" className="card-title">
                Resumen automático
              </h3>
              {analisis.metodo.tipo === 'gemini' ? (
                <span className="badge badge-gemini">
                  Gemini · {analisis.metodo.modelo}
                </span>
              ) : (
                <span className="badge badge-reglas">Reglas de palabras clave</span>
              )}
            </div>
            <p className="lead">{analisis.resumen.texto}</p>
            {analisis.resumen.puntos.length > 0 && (
              <ul>
                {analisis.resumen.puntos.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            {analisis.totalObservaciones === 0 && (
              <p>
                <Link to="/registrar">Registrar una prueba</Link>
              </p>
            )}
            <span className="metodo-chip">
              Generado {momento(analisis.generadoEn)} ·{' '}
              {analisis.metodo.tipo === 'gemini'
                ? `Con la API de Gemini (${analisis.metodo.modelo}) en ${analisis.metodo.segundos} s.`
                : `Con reglas de palabras clave y severidad${
                    analisis.metodo.respaldo
                      ? ` porque no se usó Gemini: ${analisis.metodo.respaldo}.`
                      : '.'
                  }`}{' '}
              Ver <a href="#como-funciona">cómo funciona</a>.
            </span>
          </section>

          {analisis.categorias.length > 0 && (
            <section className="card" aria-labelledby="t-categorias">
              <h3 id="t-categorias" className="card-title">
                Clasificación por categoría UX
              </h3>
              <p className="muted" style={{ marginTop: 0 }}>
                Ordenadas por impacto: suma de severidades (alta 3, media 2,
                baja 1).
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Categoría</th>
                      <th scope="col" className="num">
                        Obs.
                      </th>
                      <th scope="col" className="num">
                        Pruebas
                      </th>
                      <th scope="col">Severidad</th>
                      <th scope="col" className="num">
                        Impacto
                      </th>
                      <th scope="col">Palabras frecuentes</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analisis.categorias.map((c) => (
                      <tr key={c.categoria}>
                        <td>
                          <span className="cat-nombre">{c.nombre}</span>
                          <div className="muted">{c.descripcion}</div>
                        </td>
                        <td className="num">
                          {c.observaciones}
                          <div className="muted">{c.porcentaje} %</div>
                        </td>
                        <td className="num">{c.pruebas}</td>
                        <td>
                          <div className="cat-barra" aria-hidden="true">
                            {SEVERIDADES.map((s) => (
                              <span
                                key={s}
                                className={`sev-${s}`}
                                style={{
                                  width: `${(c.porSeveridad[s] / c.observaciones) * 100}%`,
                                }}
                              />
                            ))}
                          </div>
                          <div className="muted nowrap">
                            {SEVERIDADES.map(
                              (s) => `${c.porSeveridad[s]} ${ETIQUETA_SEVERIDAD[s].toLowerCase()}`,
                            ).join(' · ')}
                          </div>
                        </td>
                        <td className="num">
                          <strong>{c.impacto}</strong>
                        </td>
                        <td>
                          <div className="palabras">
                            {c.palabrasFrecuentes.length === 0
                              ? '—'
                              : c.palabrasFrecuentes.map((p) => (
                                  <span className="palabra" key={p}>
                                    {p}
                                  </span>
                                ))}
                          </div>
                        </td>
                        <td>
                          {c.recurrente ? (
                            <span
                              className="badge badge-recurrente"
                              title={c.motivoRecurrente ?? undefined}
                            >
                              Recurrente
                            </span>
                          ) : (
                            <span className="muted">—</span>
                          )}
                          {c.motivoRecurrente && (
                            <div className="muted">{c.motivoRecurrente}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {analisis.totalObservaciones > 0 && (
            <section className="card" aria-labelledby="t-sugerencias">
              <h3 id="t-sugerencias" className="card-title">
                Historias de usuario sugeridas para el backlog
              </h3>
              {analisis.sugerencias.length === 0 ? (
                <p className="subtitle" style={{ margin: 0 }}>
                  No hay problemas recurrentes: ninguna categoría aparece en{' '}
                  {analisis.metodo.umbrales.minPruebasRecurrente} o más pruebas
                  ni tiene {analisis.metodo.umbrales.minAltasRecurrente} o más
                  observaciones de severidad alta.
                </p>
              ) : (
                analisis.sugerencias.map((s) => {
                  const estado = sugerencias[s.categoria];
                  return (
                    <article
                      className="sugerencia"
                      key={s.categoria}
                      aria-labelledby={`sug-${s.categoria}`}
                    >
                      <div className="sugerencia-cabecera">
                        <span className="badge badge-categoria">
                          {s.codigoSugerido}
                        </span>
                        <h4 id={`sug-${s.categoria}`}>{s.nombre}</h4>
                      </div>
                      <p className="descripcion">{s.descripcion}</p>
                      <div className="sugerencia-datos">
                        <span>
                          <strong>Business Value:</strong> {s.businessValue}
                        </span>
                        <span>
                          <strong>Story Points:</strong> {s.storyPoints}
                        </span>
                        <span>
                          <strong>Cociente de Decisión:</strong>{' '}
                          {(s.businessValue / s.storyPoints).toFixed(2)}
                        </span>
                      </div>
                      <h5>Criterios de aceptación</h5>
                      <ul>
                        {s.criteriosAceptacion.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                      <h5>Evidencia</h5>
                      <ul>
                        {s.evidencia.map((e) => (
                          <li key={e.texto}>
                            <span className={`badge badge-${e.severidad}`}>
                              {ETIQUETA_SEVERIDAD[e.severidad]}
                            </span>{' '}
                            {e.texto}{' '}
                            <span className="muted">({e.pantallaEvaluada})</span>
                          </li>
                        ))}
                      </ul>
                      <p className="motivo">
                        <strong>Por qué se sugiere:</strong> {s.motivo}
                      </p>
                      <div className="button-row" aria-live="polite">
                        {estado?.tipo === 'agregada' ? (
                          <p className="alert alert-success" style={{ marginTop: 12 }}>
                            {estado.codigo} agregada al backlog.{' '}
                            <Link to="/backlog">Ver el backlog</Link>
                          </p>
                        ) : (
                          <button
                            type="button"
                            className="submit-btn"
                            onClick={() => agregarAlBacklog(s)}
                            disabled={estado?.tipo === 'guardando'}
                          >
                            {estado?.tipo === 'guardando'
                              ? 'Agregando…'
                              : `Agregar ${s.codigoSugerido} al backlog`}
                          </button>
                        )}
                        {estado?.tipo === 'error' && (
                          <p className="error-text" role="alert">
                            {estado.mensaje}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          )}

          {analisis.observaciones.length > 0 && (
            <section className="card" aria-labelledby="t-observaciones">
              <div className="toolbar">
                <h3 id="t-observaciones" className="card-title" style={{ margin: 0 }}>
                  Observaciones clasificadas
                </h3>
                <div>
                  <label htmlFor="ia-categoria">Categoría</label>
                  <select
                    id="ia-categoria"
                    value={filtroCategoria}
                    onChange={(e) =>
                      setFiltroCategoria(e.target.value as '' | CategoriaUx)
                    }
                  >
                    <option value="">Todas ({analisis.observaciones.length})</option>
                    {analisis.categorias.map((c) => (
                      <option key={c.categoria} value={c.categoria}>
                        {c.nombre} ({c.observaciones})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Observación</th>
                      <th scope="col">Pantalla</th>
                      <th scope="col">Severidad</th>
                      <th scope="col">Categoría</th>
                      <th scope="col">Por qué</th>
                      <th scope="col">Confianza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {observacionesVisibles.map((o) => (
                      <tr key={o.id}>
                        <td>
                          {o.texto}
                          <div className="muted">{o.nombreEvaluacion}</div>
                        </td>
                        <td>{o.pantallaEvaluada}</td>
                        <td>
                          <span className={`badge badge-${o.severidad}`}>
                            {ETIQUETA_SEVERIDAD[o.severidad]}
                          </span>
                        </td>
                        <td className="nowrap">{o.nombreCategoria}</td>
                        <td>
                          {o.justificacion ? (
                            <span className="justificacion">{o.justificacion}</span>
                          ) : (
                            <div className="palabras">
                              {o.palabrasDetectadas.length === 0
                                ? '—'
                                : o.palabrasDetectadas.map((p) => (
                                    <span className="palabra" key={p}>
                                      {p}
                                    </span>
                                  ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-confianza-${o.confianza}`}>
                            {ETIQUETA_CONFIANZA[o.confianza]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="card" id="como-funciona" tabIndex={-1}>
            <details className="reglas-detalle">
              <summary>¿Cómo clasifica el sistema?</summary>
              <p>{analisis.metodo.descripcion}</p>
              <p>
                El servidor intenta primero la API de Gemini. Si no hay clave
                configurada, si Gemini tarda demasiado o devuelve un error, usa
                estas reglas de palabras clave, así el análisis nunca se queda
                sin resultado.
              </p>
              <p className="muted">
                Las palabras se comparan sin tildes ni mayúsculas y cuentan si
                empiezan una palabra del texto: <span className="palabra">naveg</span>{' '}
                encuentra “navegar” y “navegación”. Confianza alta: 2 puntos o
                más; media: al menos una palabra fuerte; baja: solo palabras
                débiles.
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Categoría</th>
                      <th scope="col">Palabras fuertes (1 punto)</th>
                      <th scope="col">Palabras débiles (0,5)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analisis.metodo.reglas.map((r) => (
                      <tr key={r.categoria}>
                        <td className="nowrap">
                          <strong>{r.nombre}</strong>
                        </td>
                        <td>{r.palabrasClave.join(', ')}</td>
                        <td>{r.palabrasDebiles.join(', ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        </>
      )}
    </div>
  );
}
