import { useEffect, useState } from 'react';
import {
  cambiarEstadoHistoria,
  ETIQUETA_ESTADO,
  EstadoHistoria,
  HistoriaUsuario,
  listarHistorias,
} from '../api';

const COLUMNAS: EstadoHistoria[] = ['por_hacer', 'en_progreso', 'hecho'];

// Valor del filtro de sprint: 'todos', 'sin' (sin sprint) o el numero.
type FiltroSprint = string;

export default function Tablero() {
  const [historias, setHistorias] = useState<HistoriaUsuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroSprint>('todos');
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null);
  const [columnaDestino, setColumnaDestino] = useState<EstadoHistoria | null>(
    null,
  );

  async function cargar() {
    setCargando(true);
    setError(null);
    try {
      setHistorias(await listarHistorias());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar el tablero',
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function mover(historia: HistoriaUsuario, estado: EstadoHistoria) {
    if (historia.estado === estado) return;
    const anterior = historias;
    // Se actualiza la vista de inmediato y se revierte si el servidor falla.
    setHistorias(
      historias.map((h) => (h.id === historia.id ? { ...h, estado } : h)),
    );
    setAviso(null);
    try {
      await cambiarEstadoHistoria(historia.id, estado);
      setAviso(`${historia.codigo} movida a "${ETIQUETA_ESTADO[estado]}".`);
    } catch (err) {
      setHistorias(anterior);
      setError(
        err instanceof Error ? err.message : 'No se pudo mover la historia',
      );
    }
  }

  const sprints = Array.from(
    new Set(
      historias.map((h) => h.sprint).filter((s): s is number => s !== null),
    ),
  ).sort((a, b) => a - b);

  const visibles = historias.filter((h) => {
    if (filtro === 'todos') return true;
    if (filtro === 'sin') return h.sprint === null;
    return h.sprint === Number(filtro);
  });

  const puntos = (estado: EstadoHistoria) =>
    visibles
      .filter((h) => h.estado === estado)
      .reduce((acc, h) => acc + h.storyPoints, 0);

  const totalPuntos = visibles.reduce((acc, h) => acc + h.storyPoints, 0);
  const avance =
    totalPuntos === 0 ? 0 : Math.round((puntos('hecho') / totalPuntos) * 100);

  return (
    <div className="page page-wide">
      <h2>Tablero del sprint</h2>
      <p className="subtitle">
        HU-07 · Arrastra las tarjetas entre columnas o usa los botones para
        cambiar su estado.
      </p>

      {cargando ? (
        <p className="subtitle">Cargando tablero...</p>
      ) : (
        <>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              {error}{' '}
              <button className="link-btn" onClick={cargar}>
                Reintentar
              </button>
            </div>
          )}

          <div className="toolbar">
            <div>
              <label htmlFor="filtro-sprint">Sprint</label>
              <select
                id="filtro-sprint"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              >
                <option value="todos">Todos</option>
                {sprints.map((s) => (
                  <option key={s} value={s}>
                    Sprint {s}
                  </option>
                ))}
                <option value="sin">Sin sprint (backlog)</option>
              </select>
            </div>
            <div className="progress-summary" aria-live="polite">
              <strong>{avance}%</strong> completado · {puntos('hecho')} de{' '}
              {totalPuntos} story points
              <div className="severity-bar-track" style={{ marginTop: 6 }}>
                <div
                  className="severity-bar-fill sev-baja"
                  style={{ width: `${avance}%` }}
                />
              </div>
            </div>
          </div>

          {aviso && (
            <p className="sr-only" role="status">
              {aviso}
            </p>
          )}

          <div className="kanban">
            {COLUMNAS.map((estado) => {
              const tarjetas = visibles.filter((h) => h.estado === estado);
              return (
                <section
                  key={estado}
                  className={`kanban-col ${
                    columnaDestino === estado ? 'kanban-col-over' : ''
                  }`}
                  aria-label={ETIQUETA_ESTADO[estado]}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setColumnaDestino(estado);
                  }}
                  onDragLeave={(e) => {
                    // Ignora el dragleave que se dispara al pasar sobre una tarjeta hija.
                    if (!e.currentTarget.contains(e.relatedTarget as Node))
                      setColumnaDestino(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setColumnaDestino(null);
                    const historia = historias.find(
                      (h) => h.id === arrastrandoId,
                    );
                    if (historia) mover(historia, estado);
                    setArrastrandoId(null);
                  }}
                >
                  <header className={`kanban-col-header estado-${estado}`}>
                    <span>{ETIQUETA_ESTADO[estado]}</span>
                    <span className="kanban-count">
                      {tarjetas.length} · {puntos(estado)} SP
                    </span>
                  </header>

                  {tarjetas.length === 0 && (
                    <p className="kanban-empty">Sin historias</p>
                  )}

                  {tarjetas.map((h) => {
                    const idx = COLUMNAS.indexOf(h.estado);
                    return (
                      <article
                        key={h.id}
                        className={`kanban-card ${
                          arrastrandoId === h.id ? 'dragging' : ''
                        }`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          setArrastrandoId(h.id);
                        }}
                        onDragEnd={() => setArrastrandoId(null)}
                      >
                        <div className="kanban-card-top">
                          <strong>{h.codigo}</strong>
                          <span className="sp-chip" title="Story Points">
                            {h.storyPoints} SP
                          </span>
                        </div>
                        <p className="kanban-card-title">{h.nombre}</p>
                        <div className="kanban-card-meta">
                          <span>{h.responsable || 'Sin responsable'}</span>
                          {filtro === 'todos' && (
                            <span>
                              {h.sprint ? `Sprint ${h.sprint}` : 'Backlog'}
                            </span>
                          )}
                        </div>
                        <div className="kanban-card-actions">
                          {idx > 0 && (
                            <button
                              className="move-btn"
                              onClick={() => mover(h, COLUMNAS[idx - 1])}
                              aria-label={`Mover ${h.codigo} a ${ETIQUETA_ESTADO[COLUMNAS[idx - 1]]}`}
                            >
                              ← {ETIQUETA_ESTADO[COLUMNAS[idx - 1]]}
                            </button>
                          )}
                          {idx < COLUMNAS.length - 1 && (
                            <button
                              className="move-btn"
                              onClick={() => mover(h, COLUMNAS[idx + 1])}
                              aria-label={`Mover ${h.codigo} a ${ETIQUETA_ESTADO[COLUMNAS[idx + 1]]}`}
                            >
                              {ETIQUETA_ESTADO[COLUMNAS[idx + 1]]} →
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </section>
              );
            })}
          </div>

          {historias.length === 0 && !error && (
            <p className="subtitle" style={{ marginTop: 16 }}>
              Todavía no hay historias. Créalas en la pantalla "Backlog".
            </p>
          )}
        </>
      )}
    </div>
  );
}
