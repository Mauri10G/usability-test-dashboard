import { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiltroMetricas, Metrics, obtenerMetricas, Severidad } from '../api';
import {
  ETIQUETA_SEVERIDAD,
  fecha,
  mensajeError,
  momento,
  SIGNIFICADO_SEVERIDAD,
} from '../formato';

const SEVERIDADES: Severidad[] = ['alta', 'media', 'baja'];

const filtroVacio: FiltroMetricas = {
  pantalla: '',
  evaluador: '',
  desde: '',
  hasta: '',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [filtro, setFiltro] = useState<FiltroMetricas>(filtroVacio);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar(f: FiltroMetricas = filtro) {
    setCargando(true);
    setError(null);
    try {
      setMetrics(await obtenerMetricas(f));
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cargar el dashboard'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar(filtroVacio);
  }, []);

  function cambiarFiltro(campo: keyof FiltroMetricas, valor: string) {
    const nuevo = { ...filtro, [campo]: valor };
    // Un rango invertido no se envía: el campo "Hasta" se marca inválido.
    if (nuevo.desde && nuevo.hasta && nuevo.desde > nuevo.hasta) {
      setFiltro(nuevo);
      return;
    }
    setFiltro(nuevo);
    cargar(nuevo);
  }

  function limpiarFiltros() {
    setFiltro(filtroVacio);
    cargar(filtroVacio);
  }

  const hayFiltro = Object.values(filtro).some(Boolean);
  const rangoInvalido = Boolean(
    filtro.desde && filtro.hasta && filtro.desde > filtro.hasta,
  );

  const totalSeveridad = metrics
    ? metrics.porSeveridad.baja +
      metrics.porSeveridad.media +
      metrics.porSeveridad.alta
    : 0;
  const pct = (n: number) =>
    totalSeveridad === 0 ? 0 : Math.round((n / totalSeveridad) * 100);
  const maxErrores = metrics?.tareasConMasErrores[0]?.errores ?? 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Dashboard de resultados</h2>
          <p className="subtitle">
            Métricas y problemas más frecuentes de las pruebas registradas.
          </p>
        </div>
        <div className="page-header-actions">
          {metrics && (
            <span aria-live="polite">
              Actualizado {momento(metrics.generadoEn)}
            </span>
          )}
          <button
            type="button"
            className="secondary-btn"
            onClick={() => cargar()}
            disabled={cargando}
          >
            <span aria-hidden="true">⟳ </span>
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      <form
        className="filtros"
        aria-label="Filtros del dashboard"
        onSubmit={(e) => e.preventDefault()}
      >
        <div>
          <label htmlFor="f-pantalla">Pantalla evaluada</label>
          <select
            id="f-pantalla"
            value={filtro.pantalla}
            onChange={(e) => cambiarFiltro('pantalla', e.target.value)}
          >
            <option value="">Todas</option>
            {metrics?.opcionesFiltro.pantallas.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-evaluador">Evaluador</label>
          <select
            id="f-evaluador"
            value={filtro.evaluador}
            onChange={(e) => cambiarFiltro('evaluador', e.target.value)}
          >
            <option value="">Todos</option>
            {metrics?.opcionesFiltro.evaluadores.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-desde">Desde</label>
          <input
            id="f-desde"
            type="date"
            value={filtro.desde}
            max={filtro.hasta || undefined}
            onChange={(e) => cambiarFiltro('desde', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="f-hasta">Hasta</label>
          <input
            id="f-hasta"
            type="date"
            value={filtro.hasta}
            min={filtro.desde || undefined}
            aria-invalid={rangoInvalido}
            aria-describedby={rangoInvalido ? 'f-hasta-error' : undefined}
            className={rangoInvalido ? 'invalid' : ''}
            onChange={(e) => cambiarFiltro('hasta', e.target.value)}
          />
        </div>
        <div>
          <button
            type="button"
            className="link-btn"
            onClick={limpiarFiltros}
            disabled={!hayFiltro}
          >
            Limpiar filtros
          </button>
        </div>
      </form>
      {rangoInvalido && (
        <p id="f-hasta-error" className="error-text filtro-activo" role="alert">
          La fecha "Hasta" no puede ser anterior a "Desde".
        </p>
      )}

      {error ? (
        <div className="alert alert-error" role="alert">
          {error}{' '}
          <button type="button" className="link-btn" onClick={() => cargar()}>
            Reintentar
          </button>
        </div>
      ) : !metrics ? (
        <p className="subtitle" role="status">
          Cargando métricas…
        </p>
      ) : (
        <>
          {hayFiltro && (
            <p className="filtro-activo" role="status">
              Mostrando {metrics.totalPruebas}{' '}
              {metrics.totalPruebas === 1 ? 'prueba' : 'pruebas'} que cumplen
              los filtros.
            </p>
          )}

          <div className="metrics-grid">
            <div className="metric-tile">
              <div className="value">{metrics.totalPruebas}</div>
              <div className="label">Pruebas registradas</div>
            </div>
            <div className="metric-tile">
              <div className="value">{metrics.tasaExito} %</div>
              <div className="label">Tasa de éxito</div>
            </div>
            <div className="metric-tile">
              <div className="value">{metrics.tiempoPromedioSegundos} s</div>
              <div className="label">Tiempo promedio por tarea</div>
            </div>
            <div className="metric-tile">
              <div className="value">{metrics.totalObservaciones}</div>
              <div className="label">Observaciones registradas</div>
            </div>
          </div>

          <div className="dash-grid">
            <section className="card" aria-labelledby="t-severidad">
              <h3 id="t-severidad" className="card-title">
                Observaciones por severidad
              </h3>
              {SEVERIDADES.map((s) => (
                <div className="severity-bar-row" key={s}>
                  <span className="sev-label">{ETIQUETA_SEVERIDAD[s]}</span>
                  <div
                    className="severity-bar-track"
                    role="img"
                    aria-label={`${ETIQUETA_SEVERIDAD[s]}: ${metrics.porSeveridad[s]} observaciones, ${pct(metrics.porSeveridad[s])} %`}
                  >
                    <div
                      className={`severity-bar-fill sev-${s}`}
                      style={{ width: `${pct(metrics.porSeveridad[s])}%` }}
                    />
                  </div>
                  <span className="sev-count" aria-hidden="true">
                    {metrics.porSeveridad[s]} ({pct(metrics.porSeveridad[s])} %)
                  </span>
                </div>
              ))}
              <details className="sev-ayuda" open>
                <summary>¿Qué significa cada severidad?</summary>
                <dl>
                  {SEVERIDADES.map((s) => (
                    <Fragment key={s}>
                      <dt>{ETIQUETA_SEVERIDAD[s]}</dt>
                      <dd>{SIGNIFICADO_SEVERIDAD[s]}</dd>
                    </Fragment>
                  ))}
                </dl>
              </details>
            </section>

            <section className="card" aria-labelledby="t-problemas">
              <h3 id="t-problemas" className="card-title">
                Problemas más frecuentes
              </h3>
              {metrics.tareasConMasErrores.length === 0 ? (
                <p className="subtitle" style={{ margin: 0 }}>
                  Ninguna tarea registrada tiene errores todavía.
                </p>
              ) : (
                <table>
                  <caption className="sr-only">
                    Tareas agrupadas entre pruebas, ordenadas por total de
                    errores
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Tarea</th>
                      <th scope="col" className="num">
                        Pruebas
                      </th>
                      <th scope="col" className="num">
                        Errores
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.tareasConMasErrores.map((t) => (
                      <tr key={t.descripcion}>
                        <td>{t.descripcion}</td>
                        <td className="num">{t.pruebas}</td>
                        <td
                          className={`num ${
                            t.errores === maxErrores ? 'cifra-destacada' : ''
                          }`}
                        >
                          {t.errores}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          <section className="card" aria-labelledby="t-ultimas">
            <h3 id="t-ultimas" className="card-title">
              Últimas pruebas registradas
            </h3>
            {metrics.ultimasPruebas.length === 0 ? (
              <p className="subtitle" style={{ margin: 0 }}>
                {hayFiltro ? (
                  'Ninguna prueba cumple los filtros elegidos.'
                ) : (
                  <>
                    Todavía no se ha registrado ninguna prueba.{' '}
                    <Link to="/registrar">Registra la primera</Link>.
                  </>
                )}
              </p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Fecha</th>
                      <th scope="col">Evaluación</th>
                      <th scope="col">Pantalla</th>
                      <th scope="col">Evaluador</th>
                      <th scope="col" className="num">
                        Tareas
                      </th>
                      <th scope="col" className="num">
                        Obs.
                      </th>
                      <th scope="col">
                        <span className="sr-only">Detalle</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.ultimasPruebas.map((p) => (
                      <tr
                        key={p.id}
                        className="fila-clicable"
                        onClick={() => navigate(`/pruebas/${p.id}`)}
                      >
                        <td className="nowrap">{fecha(p.fecha)}</td>
                        <td>
                          <strong>{p.nombreEvaluacion}</strong>
                        </td>
                        <td>{p.pantallaEvaluada}</td>
                        <td>{p.evaluador}</td>
                        <td className="num">{p.totalTareas}</td>
                        <td className="num">{p.totalObservaciones}</td>
                        <td>
                          {/* El enlace es el control accesible con teclado;
                              el clic en la fila es un atajo para el mouse. */}
                          <Link
                            className="ver-link"
                            to={`/pruebas/${p.id}`}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Ver la prueba ${p.nombreEvaluacion}`}
                          >
                            Ver ›
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
