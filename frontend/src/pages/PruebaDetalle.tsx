import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { eliminarPrueba, ErrorApi, obtenerPrueba, Prueba } from '../api';
import { ETIQUETA_SEVERIDAD, fecha, mensajeError, momento } from '../formato';

// Detalle de una prueba registrada, al que se llega con "Ver ›" desde el
// dashboard (hallazgos H3-1 y H6-1). Permite eliminar un registro
// equivocado; la edición queda pendiente (ver docs/deuda-tecnica.md).
export default function PruebaDetalle() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [prueba, setPrueba] = useState<Prueba | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noExiste, setNoExiste] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  async function cargar() {
    setError(null);
    try {
      setPrueba(await obtenerPrueba(id));
    } catch (err) {
      if (err instanceof ErrorApi && err.status === 404) setNoExiste(true);
      else setError(mensajeError(err, 'No se pudo cargar la prueba'));
    }
  }

  useEffect(() => {
    cargar();
  }, [id]);

  async function eliminar() {
    if (!prueba) return;
    if (
      !window.confirm(
        `¿Eliminar la prueba «${prueba.nombreEvaluacion}»? Sus tareas y observaciones dejarán de contar en el dashboard. Esta acción no se puede deshacer.`,
      )
    )
      return;
    setEliminando(true);
    try {
      await eliminarPrueba(prueba.id);
      navigate('/', { replace: true });
    } catch (err) {
      setError(mensajeError(err, 'No se pudo eliminar la prueba'));
      setEliminando(false);
    }
  }

  const volver = (
    <Link className="volver-link" to="/">
      ‹ Volver al dashboard
    </Link>
  );

  if (noExiste) {
    return (
      <div className="page">
        {volver}
        <h2>Prueba no encontrada</h2>
        <p className="subtitle">
          La prueba que buscas no existe o ya fue eliminada.
        </p>
      </div>
    );
  }

  if (!prueba) {
    return (
      <div className="page">
        {volver}
        <h2>Detalle de la prueba</h2>
        {error ? (
          <div className="alert alert-error" role="alert">
            {error}{' '}
            <button type="button" className="link-btn" onClick={cargar}>
              Reintentar
            </button>
          </div>
        ) : (
          <p className="subtitle" role="status">
            Cargando prueba…
          </p>
        )}
      </div>
    );
  }

  const exitosas = prueba.tareas.filter((t) => t.exito).length;

  return (
    <div className="page">
      {volver}
      <div className="page-header">
        <div>
          <h2>{prueba.nombreEvaluacion}</h2>
          <p className="subtitle">Registrada {momento(prueba.fecha)}</p>
        </div>
        <button
          type="button"
          className="danger-btn"
          onClick={eliminar}
          disabled={eliminando}
        >
          {eliminando ? 'Eliminando…' : 'Eliminar prueba'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <section className="card" aria-label="Datos generales">
        <dl className="detalle-datos">
          <div>
            <dt>Pantalla evaluada</dt>
            <dd>{prueba.pantallaEvaluada}</dd>
          </div>
          <div>
            <dt>Evaluador</dt>
            <dd>{prueba.evaluador}</dd>
          </div>
          <div>
            <dt>Fecha</dt>
            <dd>{fecha(prueba.fecha)}</dd>
          </div>
          <div>
            <dt>Tareas completadas</dt>
            <dd>
              {exitosas} de {prueba.tareas.length}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card" aria-labelledby="t-tareas">
        <h3 id="t-tareas" className="card-title">
          Tareas evaluadas
        </h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Tarea</th>
                <th scope="col" className="num">
                  Tiempo
                </th>
                <th scope="col" className="num">
                  Errores
                </th>
                <th scope="col">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {prueba.tareas.map((t, i) => (
                <tr key={t.id}>
                  <td>{i + 1}</td>
                  <td>{t.descripcion}</td>
                  <td className="num">{t.tiempoSegundos} s</td>
                  <td className="num">{t.errores}</td>
                  <td>
                    <span className={`badge ${t.exito ? 'badge-baja' : 'badge-alta'}`}>
                      {t.exito ? 'Completó' : 'No completó'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" aria-labelledby="t-obs">
        <h3 id="t-obs" className="card-title">
          Observaciones
        </h3>
        {prueba.observaciones.length === 0 ? (
          <p className="subtitle" style={{ margin: 0 }}>
            Esta prueba no tiene observaciones.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">Observación</th>
                <th scope="col">Severidad</th>
              </tr>
            </thead>
            <tbody>
              {prueba.observaciones.map((o) => (
                <tr key={o.id}>
                  <td>{o.texto}</td>
                  <td>
                    <span className={`badge badge-${o.severidad}`}>
                      {ETIQUETA_SEVERIDAD[o.severidad]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
