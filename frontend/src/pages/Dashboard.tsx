import { useEffect, useState } from 'react';
import { obtenerMetricas, Metrics } from '../api';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      const data = await obtenerMetricas();
      setMetrics(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar el dashboard',
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  if (cargando) {
    return (
      <div className="page">
        <h2>Dashboard de resultados</h2>
        <p className="subtitle">Cargando metricas...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="page">
        <h2>Dashboard de resultados</h2>
        <div className="alert alert-error">{error}</div>
        <button className="add-btn" onClick={cargar} style={{ marginTop: 12 }}>
          Reintentar
        </button>
      </div>
    );
  }

  const totalSeveridad =
    metrics.porSeveridad.baja +
    metrics.porSeveridad.media +
    metrics.porSeveridad.alta;

  const pct = (n: number) =>
    totalSeveridad === 0 ? 0 : Math.round((n / totalSeveridad) * 100);

  return (
    <div className="page">
      <h2>Dashboard de resultados</h2>
      <p className="subtitle">
        HU-02 · Metricas y hallazgos frecuentes de las pruebas registradas.
      </p>

      <div className="metrics-grid">
        <div className="metric-tile">
          <div className="value">{metrics.totalPruebas}</div>
          <div className="label">Pruebas registradas</div>
        </div>
        <div className="metric-tile">
          <div className="value">{metrics.tasaExito}%</div>
          <div className="label">Tasa de exito</div>
        </div>
        <div className="metric-tile">
          <div className="value">{metrics.tiempoPromedioSegundos}s</div>
          <div className="label">Tiempo promedio por tarea</div>
        </div>
        <div className="metric-tile">
          <div className="value">{metrics.totalObservaciones}</div>
          <div className="label">Observaciones registradas</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, color: '#1f3864' }}>
          Observaciones por severidad
        </h3>
        <div className="severity-bar-row">
          <span className="sev-label">Alta</span>
          <div className="severity-bar-track">
            <div
              className="severity-bar-fill sev-alta"
              style={{ width: `${pct(metrics.porSeveridad.alta)}%` }}
            />
          </div>
          <span>{metrics.porSeveridad.alta}</span>
        </div>
        <div className="severity-bar-row">
          <span className="sev-label">Media</span>
          <div className="severity-bar-track">
            <div
              className="severity-bar-fill sev-media"
              style={{ width: `${pct(metrics.porSeveridad.media)}%` }}
            />
          </div>
          <span>{metrics.porSeveridad.media}</span>
        </div>
        <div className="severity-bar-row">
          <span className="sev-label">Baja</span>
          <div className="severity-bar-track">
            <div
              className="severity-bar-fill sev-baja"
              style={{ width: `${pct(metrics.porSeveridad.baja)}%` }}
            />
          </div>
          <span>{metrics.porSeveridad.baja}</span>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, color: '#1f3864' }}>
          Tareas con mas errores
        </h3>
        {metrics.tareasConMasErrores.length === 0 ? (
          <p className="subtitle" style={{ margin: 0 }}>
            Todavia no hay tareas registradas.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tarea</th>
                <th>Errores</th>
              </tr>
            </thead>
            <tbody>
              {metrics.tareasConMasErrores.map((t, i) => (
                <tr key={i}>
                  <td>{t.descripcion}</td>
                  <td>{t.errores}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, color: '#1f3864' }}>
          Ultimas pruebas registradas
        </h3>
        {metrics.ultimasPruebas.length === 0 ? (
          <p className="subtitle" style={{ margin: 0 }}>
            Todavia no se ha registrado ninguna prueba. Ve a "Registrar
            prueba" para crear la primera.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Evaluacion</th>
                <th>Pantalla</th>
                <th>Evaluador</th>
                <th>Tareas</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {metrics.ultimasPruebas.map((p) => (
                <tr key={p.id}>
                  <td>{p.nombreEvaluacion}</td>
                  <td>{p.pantallaEvaluada}</td>
                  <td>{p.evaluador}</td>
                  <td>{p.totalTareas}</td>
                  <td>{p.totalObservaciones}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
