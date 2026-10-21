import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { crearPrueba, ErrorApi, Prueba, Severidad } from '../api';
import { ETIQUETA_SEVERIDAD, SIGNIFICADO_SEVERIDAD } from '../formato';

// Los campos numéricos se guardan como texto mientras se editan, para que
// empiecen vacíos en lugar de en 0 (hallazgo H5-2).
interface TareaEdicion {
  clave: number;
  descripcion: string;
  tiempo: string;
  errores: string;
  // Sin valor por defecto: el evaluador tiene que decidir (hallazgo H5-1).
  resultado: '' | 'exito' | 'fracaso';
}

interface ObservacionEdicion {
  clave: number;
  texto: string;
  severidad: '' | Severidad;
}

// Error de un campo: el id del control al que enlaza el resumen, la
// etiqueta que se muestra en el resumen y el mensaje.
interface ErrorCampo {
  id: string;
  etiqueta: string;
  mensaje: string;
}

const PANTALLAS_SUGERIDAS = [
  'Dashboard',
  'Formulario',
  'Análisis IA',
  'Backlog',
  'Tablero',
  'Retrospectiva',
];

let siguienteClave = 1;
const tareaVacia = (): TareaEdicion => ({
  clave: siguienteClave++,
  descripcion: '',
  tiempo: '',
  errores: '',
  resultado: '',
});
const observacionVacia = (): ObservacionEdicion => ({
  clave: siguienteClave++,
  texto: '',
  severidad: '',
});

const idTarea = (t: TareaEdicion, campo: string) => `tarea-${t.clave}-${campo}`;
const idObs = (o: ObservacionEdicion, campo: string) => `obs-${o.clave}-${campo}`;

export default function Formulario() {
  const [nombreEvaluacion, setNombreEvaluacion] = useState('');
  const [pantallaEvaluada, setPantallaEvaluada] = useState('');
  const [evaluador, setEvaluador] = useState('');
  const [tareas, setTareas] = useState<TareaEdicion[]>(() => [tareaVacia()]);
  const [observaciones, setObservaciones] = useState<ObservacionEdicion[]>(
    () => [observacionVacia()],
  );
  const [errores, setErrores] = useState<ErrorCampo[]>([]);
  // Después del primer intento de envío se revalida en cada cambio, así el
  // mensaje desaparece en cuanto el usuario corrige el campo.
  const [intentado, setIntentado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<string[]>([]);
  const [registrada, setRegistrada] = useState<Prueba | null>(null);

  const resumenRef = useRef<HTMLDivElement>(null);
  const exitoRef = useRef<HTMLDivElement>(null);

  function calcularErrores(): ErrorCampo[] {
    const lista: ErrorCampo[] = [];
    if (!nombreEvaluacion.trim())
      lista.push({
        id: 'nombreEvaluacion',
        etiqueta: 'Nombre de la evaluación',
        mensaje: 'Escribe un nombre para la evaluación',
      });
    if (!pantallaEvaluada.trim())
      lista.push({
        id: 'pantallaEvaluada',
        etiqueta: 'Pantalla evaluada',
        mensaje: 'Indica qué pantalla se evaluó',
      });
    if (!evaluador.trim())
      lista.push({
        id: 'evaluador',
        etiqueta: 'Evaluador',
        mensaje: 'Indica quién realizó la evaluación',
      });

    tareas.forEach((t, i) => {
      const n = `Tarea ${i + 1}`;
      if (!t.descripcion.trim())
        lista.push({
          id: idTarea(t, 'desc'),
          etiqueta: `${n}: descripción`,
          mensaje: 'Describe la tarea que se pidió al usuario',
        });
      const tiempo = Number(t.tiempo);
      if (t.tiempo.trim() === '' || !Number.isFinite(tiempo) || tiempo <= 0)
        lista.push({
          id: idTarea(t, 'tiempo'),
          etiqueta: `${n}: tiempo empleado`,
          mensaje: 'El tiempo debe ser un número mayor a 0',
        });
      const err = Number(t.errores);
      if (t.errores.trim() !== '' && (!Number.isInteger(err) || err < 0))
        lista.push({
          id: idTarea(t, 'errores'),
          etiqueta: `${n}: errores`,
          mensaje: 'Los errores deben ser un número entero, 0 o mayor',
        });
      if (!t.resultado)
        lista.push({
          id: idTarea(t, 'exito'),
          etiqueta: `${n}: resultado`,
          mensaje: 'Indica si el usuario completó la tarea',
        });
    });

    observaciones.forEach((o, i) => {
      const n = `Observación ${i + 1}`;
      if (!o.texto.trim())
        lista.push({
          id: idObs(o, 'texto'),
          etiqueta: `${n}: texto`,
          mensaje: 'Escribe la observación',
        });
      if (!o.severidad)
        lista.push({
          id: idObs(o, 'sev'),
          etiqueta: `${n}: severidad`,
          mensaje: 'Elige la severidad',
        });
    });
    return lista;
  }

  useEffect(() => {
    if (intentado) setErrores(calcularErrores());
  }, [nombreEvaluacion, pantallaEvaluada, evaluador, tareas, observaciones]);

  const errorDe = (id: string) => errores.find((e) => e.id === id)?.mensaje;

  // Atributos comunes de un campo: estado inválido y textos asociados.
  function a11y(id: string, ayudaId?: string) {
    const error = errorDe(id);
    const describedBy = [ayudaId, error ? `${id}-error` : undefined]
      .filter(Boolean)
      .join(' ');
    return {
      id,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy || undefined,
      className: error ? 'invalid' : '',
    };
  }

  function mensaje(id: string) {
    const error = errorDe(id);
    return error ? (
      <p id={`${id}-error`} className="error-text">
        {error}
      </p>
    ) : null;
  }

  function enfocar(id: string) {
    const campo = document.getElementById(id);
    campo?.focus();
    campo?.scrollIntoView({ block: 'center' });
  }

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErroresServidor([]);
    setRegistrada(null);
    setIntentado(true);
    const lista = calcularErrores();
    setErrores(lista);
    if (lista.length) {
      // El resumen se pinta en este mismo render; se enfoca en el siguiente
      // ciclo para que el lector de pantalla lo anuncie (hallazgo H1-1).
      requestAnimationFrame(() => {
        resumenRef.current?.focus();
        resumenRef.current?.scrollIntoView({ block: 'start' });
      });
      return;
    }

    setEnviando(true);
    try {
      const prueba: Prueba = await crearPrueba({
        nombreEvaluacion: nombreEvaluacion.trim(),
        pantallaEvaluada: pantallaEvaluada.trim(),
        evaluador: evaluador.trim(),
        tareas: tareas.map((t) => ({
          descripcion: t.descripcion.trim(),
          tiempoSegundos: Number(t.tiempo),
          exito: t.resultado === 'exito',
          errores: t.errores.trim() === '' ? 0 : Number(t.errores),
        })),
        observaciones: observaciones.map((o) => ({
          texto: o.texto.trim(),
          severidad: o.severidad as Severidad,
        })),
      });
      reiniciar();
      setRegistrada(prueba);
      requestAnimationFrame(() => exitoRef.current?.focus());
    } catch (err) {
      setErroresServidor(
        err instanceof ErrorApi
          ? err.mensajes
          : ['No se pudo registrar la prueba. Vuelve a intentarlo.'],
      );
      requestAnimationFrame(() => resumenRef.current?.focus());
    } finally {
      setEnviando(false);
    }
  }

  function reiniciar(pantalla = '', persona = '') {
    setNombreEvaluacion('');
    setPantallaEvaluada(pantalla);
    setEvaluador(persona);
    setTareas([tareaVacia()]);
    setObservaciones([observacionVacia()]);
    setErrores([]);
    setErroresServidor([]);
    setIntentado(false);
  }

  const hayDatos =
    Boolean(nombreEvaluacion || pantallaEvaluada || evaluador) ||
    tareas.some((t) => t.descripcion || t.tiempo || t.errores || t.resultado) ||
    observaciones.some((o) => o.texto || o.severidad);

  function limpiar() {
    if (hayDatos && !window.confirm('¿Borrar todos los datos del formulario?'))
      return;
    reiniciar();
    setRegistrada(null);
    document.getElementById('nombreEvaluacion')?.focus();
  }

  function cambiarTarea(i: number, cambios: Partial<TareaEdicion>) {
    setTareas(tareas.map((t, idx) => (idx === i ? { ...t, ...cambios } : t)));
  }

  function cambiarObs(i: number, cambios: Partial<ObservacionEdicion>) {
    setObservaciones(
      observaciones.map((o, idx) => (idx === i ? { ...o, ...cambios } : o)),
    );
  }

  function quitarTarea(i: number) {
    const t = tareas[i];
    const conDatos = t.descripcion || t.tiempo || t.errores || t.resultado;
    if (conDatos && !window.confirm(`¿Quitar la tarea ${i + 1}?`)) return;
    setTareas(tareas.filter((_, idx) => idx !== i));
  }

  function quitarObs(i: number) {
    const o = observaciones[i];
    if (
      (o.texto || o.severidad) &&
      !window.confirm(`¿Quitar la observación ${i + 1}?`)
    )
      return;
    setObservaciones(observaciones.filter((_, idx) => idx !== i));
  }

  function agregarTarea() {
    const nueva = tareaVacia();
    setTareas([...tareas, nueva]);
    requestAnimationFrame(() => document.getElementById(idTarea(nueva, 'desc'))?.focus());
  }

  function agregarObs() {
    const nueva = observacionVacia();
    setObservaciones([...observaciones, nueva]);
    requestAnimationFrame(() => document.getElementById(idObs(nueva, 'texto'))?.focus());
  }

  return (
    <div className="page">
      <h2>Registrar prueba de usabilidad</h2>
      <p className="subtitle">
        Registra las tareas, tiempos, resultados y observaciones de una sesión.
        Los campos con <span className="obligatorio">*</span> son obligatorios.
      </p>

      {(errores.length > 0 && intentado) || erroresServidor.length > 0 ? (
        <div
          className="error-summary"
          ref={resumenRef}
          tabIndex={-1}
          aria-labelledby="resumen-errores-titulo"
        >
          {erroresServidor.length > 0 ? (
            <>
              <h3 id="resumen-errores-titulo">
                <span aria-hidden="true">⚠ </span>El servidor no aceptó la prueba
              </h3>
              <ul>
                {erroresServidor.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h3 id="resumen-errores-titulo">
                <span aria-hidden="true">⚠ </span>
                Revisa {errores.length}{' '}
                {errores.length === 1 ? 'campo' : 'campos'} antes de guardar
              </h3>
              <ul>
                {errores.map((e) => (
                  <li key={e.id}>
                    <a
                      href={`#${e.id}`}
                      onClick={(ev) => {
                        ev.preventDefault();
                        enfocar(e.id);
                      }}
                    >
                      {e.etiqueta}
                    </a>
                    : {e.mensaje.charAt(0).toLowerCase() + e.mensaje.slice(1)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}

      {registrada && (
        <div
          className="alert alert-success"
          role="status"
          ref={exitoRef}
          tabIndex={-1}
          style={{ marginTop: 0, marginBottom: 20 }}
        >
          <strong>Prueba «{registrada.nombreEvaluacion}» registrada.</strong>{' '}
          <Link to="/">Ver en el Dashboard</Link> ·{' '}
          <Link to={`/pruebas/${registrada.id}`}>Ver el detalle</Link> ·{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              reiniciar(registrada.pantallaEvaluada, registrada.evaluador);
              setRegistrada(null);
              requestAnimationFrame(() =>
                document.getElementById('nombreEvaluacion')?.focus(),
              );
            }}
          >
            Registrar otra prueba de «{registrada.pantallaEvaluada}»
          </button>
        </div>
      )}

      <form className="card" onSubmit={manejarSubmit} noValidate>
        <h3 className="form-section-title">1. Datos generales</h3>

        <label htmlFor="nombreEvaluacion">
          Nombre de la evaluación <span className="obligatorio" aria-hidden="true">*</span>
        </label>
        <input
          type="text"
          aria-required="true"
          autoComplete="off"
          {...a11y('nombreEvaluacion')}
          value={nombreEvaluacion}
          onChange={(e) => setNombreEvaluacion(e.target.value)}
          placeholder="Ej: Prueba del formulario de registro"
        />
        {mensaje('nombreEvaluacion')}

        <label htmlFor="pantallaEvaluada">
          Pantalla evaluada <span className="obligatorio" aria-hidden="true">*</span>
        </label>
        <input
          type="text"
          aria-required="true"
          list="pantallas-sugeridas"
          autoComplete="off"
          {...a11y('pantallaEvaluada', 'pantallaEvaluada-ayuda')}
          value={pantallaEvaluada}
          onChange={(e) => setPantallaEvaluada(e.target.value)}
          placeholder="Ej: Formulario"
        />
        <datalist id="pantallas-sugeridas">
          {PANTALLAS_SUGERIDAS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <p id="pantallaEvaluada-ayuda" className="help-text">
          Usa siempre el mismo nombre para la misma pantalla: así el dashboard y
          el análisis con IA agrupan bien los resultados.
        </p>
        {mensaje('pantallaEvaluada')}

        <label htmlFor="evaluador">
          Evaluador <span className="obligatorio" aria-hidden="true">*</span>
        </label>
        <input
          type="text"
          aria-required="true"
          autoComplete="name"
          {...a11y('evaluador')}
          value={evaluador}
          onChange={(e) => setEvaluador(e.target.value)}
          placeholder="Nombre y apellido"
        />
        {mensaje('evaluador')}

        <h3 className="form-section-title">2. Tareas evaluadas</h3>
        <p className="help-text" style={{ marginTop: 0 }}>
          Una tarea es algo concreto que se pidió al participante, por ejemplo
          “Encontrar el botón de guardar”.
        </p>
        {tareas.map((t, i) => (
          <fieldset className="tarea-box" key={t.clave}>
            <legend className="item-title">
              Tarea {i + 1}
            </legend>
            {tareas.length > 1 && (
              <button
                type="button"
                className="remove-btn"
                onClick={() => quitarTarea(i)}
                aria-label={`Quitar la tarea ${i + 1}`}
              >
                Quitar
              </button>
            )}

            <label htmlFor={idTarea(t, 'desc')}>
              Descripción <span className="obligatorio" aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              aria-required="true"
              {...a11y(idTarea(t, 'desc'))}
              value={t.descripcion}
              onChange={(e) => cambiarTarea(i, { descripcion: e.target.value })}
              placeholder="Ej: Encontrar el botón de guardar"
            />
            {mensaje(idTarea(t, 'desc'))}

            <div className="campos-tarea">
              <div>
                <label htmlFor={idTarea(t, 'tiempo')}>
                  Tiempo (segundos) <span className="obligatorio" aria-hidden="true">*</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  aria-required="true"
                  {...a11y(idTarea(t, 'tiempo'))}
                  value={t.tiempo}
                  onChange={(e) => cambiarTarea(i, { tiempo: e.target.value })}
                  placeholder="Ej: 30"
                />
                {mensaje(idTarea(t, 'tiempo'))}
              </div>
              <div>
                <label htmlFor={idTarea(t, 'errores')}>Errores</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  {...a11y(idTarea(t, 'errores'), `${idTarea(t, 'errores')}-ayuda`)}
                  value={t.errores}
                  onChange={(e) => cambiarTarea(i, { errores: e.target.value })}
                  placeholder="Ej: 0"
                />
                <p id={`${idTarea(t, 'errores')}-ayuda`} className="help-text">
                  Vacío cuenta como 0.
                </p>
                {mensaje(idTarea(t, 'errores'))}
              </div>
              <fieldset
                className={`radio-group ${errorDe(idTarea(t, 'exito')) ? 'invalid' : ''}`}
                aria-describedby={
                  errorDe(idTarea(t, 'exito')) ? `${idTarea(t, 'exito')}-error` : undefined
                }
              >
                <legend>
                  Resultado <span className="obligatorio" aria-hidden="true">*</span>
                  <span className="sr-only"> (obligatorio)</span>
                </legend>
                <div className="radio-options">
                  <label>
                    <input
                      type="radio"
                      id={idTarea(t, 'exito')}
                      name={idTarea(t, 'resultado')}
                      checked={t.resultado === 'exito'}
                      aria-invalid={errorDe(idTarea(t, 'exito')) ? true : undefined}
                      onChange={() => cambiarTarea(i, { resultado: 'exito' })}
                    />
                    Completó
                  </label>
                  <label>
                    <input
                      type="radio"
                      name={idTarea(t, 'resultado')}
                      checked={t.resultado === 'fracaso'}
                      aria-invalid={errorDe(idTarea(t, 'exito')) ? true : undefined}
                      onChange={() => cambiarTarea(i, { resultado: 'fracaso' })}
                    />
                    No completó
                  </label>
                </div>
                {mensaje(idTarea(t, 'exito'))}
              </fieldset>
            </div>
          </fieldset>
        ))}
        <button type="button" className="add-btn" onClick={agregarTarea}>
          + Agregar tarea
        </button>

        <h3 className="form-section-title">3. Observaciones</h3>
        <p className="help-text" style={{ marginTop: 0 }}>
          Describe con tus palabras lo que observaste. El análisis con IA usa
          este texto para clasificar los problemas.
        </p>
        {observaciones.map((o, i) => (
          <fieldset className="observacion-box" key={o.clave}>
            <legend className="item-title">
              Observación {i + 1}
            </legend>
            {observaciones.length > 1 && (
              <button
                type="button"
                className="remove-btn"
                onClick={() => quitarObs(i)}
                aria-label={`Quitar la observación ${i + 1}`}
              >
                Quitar
              </button>
            )}
            <div className="campos-observacion">
              <div>
                <label htmlFor={idObs(o, 'texto')}>
                  Texto <span className="obligatorio" aria-hidden="true">*</span>
                </label>
                <textarea
                  rows={2}
                  aria-required="true"
                  {...a11y(idObs(o, 'texto'))}
                  value={o.texto}
                  onChange={(e) => cambiarObs(i, { texto: e.target.value })}
                  placeholder="Ej: El botón de guardar no se distingue del fondo"
                />
                {mensaje(idObs(o, 'texto'))}
              </div>
              <div>
                <label htmlFor={idObs(o, 'sev')}>
                  Severidad <span className="obligatorio" aria-hidden="true">*</span>
                </label>
                <select
                  aria-required="true"
                  {...a11y(idObs(o, 'sev'), `${idObs(o, 'sev')}-ayuda`)}
                  value={o.severidad}
                  onChange={(e) =>
                    cambiarObs(i, { severidad: e.target.value as Severidad })
                  }
                >
                  <option value="">Elige…</option>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
                <p
                  id={`${idObs(o, 'sev')}-ayuda`}
                  className="ayuda-severidad"
                  aria-live="polite"
                >
                  <span aria-hidden="true">ⓘ </span>
                  {o.severidad
                    ? `${ETIQUETA_SEVERIDAD[o.severidad]} = ${SIGNIFICADO_SEVERIDAD[o.severidad]}`
                    : 'Alta: impide la tarea · Media: la retrasa · Baja: molestia menor'}
                </p>
                {mensaje(idObs(o, 'sev'))}
              </div>
            </div>
          </fieldset>
        ))}
        <button type="button" className="add-btn" onClick={agregarObs}>
          + Agregar observación
        </button>

        <div className="button-row">
          <button type="submit" className="submit-btn" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Registrar prueba'}
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={limpiar}
            disabled={enviando}
          >
            Limpiar
          </button>
        </div>
      </form>
    </div>
  );
}
