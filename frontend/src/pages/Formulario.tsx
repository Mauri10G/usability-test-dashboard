import { useState } from 'react';
import { crearPrueba, TareaForm, ObservacionForm } from '../api';

interface Errores {
  [key: string]: string;
}

const tareaVacia = (): TareaForm => ({
  descripcion: '',
  tiempoSegundos: 0,
  exito: true,
  errores: 0,
});

const observacionVacia = (): ObservacionForm => ({
  texto: '',
  severidad: 'media',
});

export default function Formulario() {
  const [nombreEvaluacion, setNombreEvaluacion] = useState('');
  const [pantallaEvaluada, setPantallaEvaluada] = useState('');
  const [evaluador, setEvaluador] = useState('');
  const [tareas, setTareas] = useState<TareaForm[]>([tareaVacia()]);
  const [observaciones, setObservaciones] = useState<ObservacionForm[]>([
    observacionVacia(),
  ]);
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<
    { tipo: 'ok' | 'error'; mensaje: string } | null
  >(null);

  function validar(): boolean {
    const nuevosErrores: Errores = {};

    if (!nombreEvaluacion.trim())
      nuevosErrores.nombreEvaluacion = 'Escribe un nombre para la evaluacion';
    if (!pantallaEvaluada.trim())
      nuevosErrores.pantallaEvaluada = 'Indica que pantalla se evaluo';
    if (!evaluador.trim())
      nuevosErrores.evaluador = 'Indica quien realizo la evaluacion';

    tareas.forEach((t, i) => {
      if (!t.descripcion.trim())
        nuevosErrores[`tarea-desc-${i}`] = 'Describe la tarea evaluada';
      if (!t.tiempoSegundos || t.tiempoSegundos <= 0)
        nuevosErrores[`tarea-tiempo-${i}`] = 'El tiempo debe ser mayor a 0';
    });

    observaciones.forEach((o, i) => {
      if (!o.texto.trim())
        nuevosErrores[`obs-texto-${i}`] = 'Escribe la observacion';
    });

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResultado(null);
    if (!validar()) return;

    setEnviando(true);
    try {
      await crearPrueba({
        nombreEvaluacion,
        pantallaEvaluada,
        evaluador,
        tareas,
        observaciones,
      });
      setResultado({
        tipo: 'ok',
        mensaje: 'Prueba registrada correctamente. Ya se ve en el Dashboard.',
      });
      setNombreEvaluacion('');
      setPantallaEvaluada('');
      setEvaluador('');
      setTareas([tareaVacia()]);
      setObservaciones([observacionVacia()]);
      setErrores({});
    } catch (err) {
      setResultado({
        tipo: 'error',
        mensaje:
          err instanceof Error
            ? err.message
            : 'No se pudo registrar la prueba',
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="page">
      <h2>Registrar prueba de usabilidad</h2>
      <p className="subtitle">
        HU-01 · Registra una prueba con sus tareas, tiempos, exito o fracaso,
        errores y observaciones.
      </p>

      <form className="card" onSubmit={manejarSubmit} noValidate>
        <label htmlFor="nombreEvaluacion">Nombre de la evaluacion</label>
        <input
          id="nombreEvaluacion"
          type="text"
          className={errores.nombreEvaluacion ? 'invalid' : ''}
          value={nombreEvaluacion}
          onChange={(e) => setNombreEvaluacion(e.target.value)}
          placeholder="Ej: Prueba del formulario de registro"
        />
        {errores.nombreEvaluacion && (
          <p className="error-text">{errores.nombreEvaluacion}</p>
        )}

        <label htmlFor="pantallaEvaluada">Pantalla evaluada</label>
        <input
          id="pantallaEvaluada"
          type="text"
          className={errores.pantallaEvaluada ? 'invalid' : ''}
          value={pantallaEvaluada}
          onChange={(e) => setPantallaEvaluada(e.target.value)}
          placeholder="Ej: Dashboard de resultados"
        />
        {errores.pantallaEvaluada && (
          <p className="error-text">{errores.pantallaEvaluada}</p>
        )}

        <label htmlFor="evaluador">Evaluador</label>
        <input
          id="evaluador"
          type="text"
          className={errores.evaluador ? 'invalid' : ''}
          value={evaluador}
          onChange={(e) => setEvaluador(e.target.value)}
          placeholder="Tu nombre"
        />
        {errores.evaluador && <p className="error-text">{errores.evaluador}</p>}

        <h3 style={{ marginTop: 24, color: '#1f3864' }}>Tareas evaluadas</h3>
        {tareas.map((tarea, i) => (
          <div className="tarea-box" key={i}>
            {tareas.length > 1 && (
              <button
                type="button"
                className="remove-btn"
                onClick={() =>
                  setTareas(tareas.filter((_, idx) => idx !== i))
                }
              >
                Quitar
              </button>
            )}
            <label>Descripcion de la tarea</label>
            <input
              type="text"
              className={errores[`tarea-desc-${i}`] ? 'invalid' : ''}
              value={tarea.descripcion}
              onChange={(e) => {
                const copia = [...tareas];
                copia[i] = { ...copia[i], descripcion: e.target.value };
                setTareas(copia);
              }}
              placeholder="Ej: Encontrar el boton de guardar"
            />
            {errores[`tarea-desc-${i}`] && (
              <p className="error-text">{errores[`tarea-desc-${i}`]}</p>
            )}

            <label>Tiempo empleado en segundos</label>
            <input
              type="number"
              min={0}
              className={errores[`tarea-tiempo-${i}`] ? 'invalid' : ''}
              value={tarea.tiempoSegundos}
              onChange={(e) => {
                const copia = [...tareas];
                copia[i] = {
                  ...copia[i],
                  tiempoSegundos: Number(e.target.value),
                };
                setTareas(copia);
              }}
            />
            {errores[`tarea-tiempo-${i}`] && (
              <p className="error-text">{errores[`tarea-tiempo-${i}`]}</p>
            )}

            <label>Numero de errores cometidos</label>
            <input
              type="number"
              min={0}
              value={tarea.errores}
              onChange={(e) => {
                const copia = [...tareas];
                copia[i] = { ...copia[i], errores: Number(e.target.value) };
                setTareas(copia);
              }}
            />

            <div className="checkbox-row">
              <input
                id={`exito-${i}`}
                type="checkbox"
                checked={tarea.exito}
                onChange={(e) => {
                  const copia = [...tareas];
                  copia[i] = { ...copia[i], exito: e.target.checked };
                  setTareas(copia);
                }}
              />
              <label htmlFor={`exito-${i}`} style={{ margin: 0 }}>
                El usuario completo la tarea con exito
              </label>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="add-btn"
          onClick={() => setTareas([...tareas, tareaVacia()])}
        >
          + Agregar otra tarea
        </button>

        <h3 style={{ marginTop: 24, color: '#1f3864' }}>Observaciones</h3>
        {observaciones.map((obs, i) => (
          <div className="observacion-box" key={i}>
            {observaciones.length > 1 && (
              <button
                type="button"
                className="remove-btn"
                onClick={() =>
                  setObservaciones(observaciones.filter((_, idx) => idx !== i))
                }
              >
                Quitar
              </button>
            )}
            <label>Observacion</label>
            <input
              type="text"
              className={errores[`obs-texto-${i}`] ? 'invalid' : ''}
              value={obs.texto}
              onChange={(e) => {
                const copia = [...observaciones];
                copia[i] = { ...copia[i], texto: e.target.value };
                setObservaciones(copia);
              }}
              placeholder="Ej: El boton de guardar no tiene suficiente contraste"
            />
            {errores[`obs-texto-${i}`] && (
              <p className="error-text">{errores[`obs-texto-${i}`]}</p>
            )}

            <label>Severidad</label>
            <select
              value={obs.severidad}
              onChange={(e) => {
                const copia = [...observaciones];
                copia[i] = {
                  ...copia[i],
                  severidad: e.target.value as 'baja' | 'media' | 'alta',
                };
                setObservaciones(copia);
              }}
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        ))}
        <button
          type="button"
          className="add-btn"
          onClick={() =>
            setObservaciones([...observaciones, observacionVacia()])
          }
        >
          + Agregar otra observacion
        </button>

        <div>
          <button type="submit" className="submit-btn" disabled={enviando}>
            {enviando ? 'Guardando...' : 'Registrar prueba'}
          </button>
        </div>

        {resultado && (
          <div
            className={`alert ${
              resultado.tipo === 'ok' ? 'alert-success' : 'alert-error'
            }`}
          >
            {resultado.mensaje}
          </div>
        )}
      </form>
    </div>
  );
}
