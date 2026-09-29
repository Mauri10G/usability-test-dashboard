import { useEffect, useState } from 'react';
import {
  actualizarHistoria,
  crearHistoria,
  eliminarHistoria,
  ETIQUETA_ESTADO,
  EstadoHistoria,
  HistoriaPayload,
  HistoriaUsuario,
  listarHistorias,
  STORY_POINTS_VALIDOS,
} from '../api';

interface Errores {
  [key: string]: string;
}

interface FormHistoria {
  codigo: string;
  nombre: string;
  descripcion: string;
  businessValue: string;
  storyPoints: string;
  sprint: string;
  estado: EstadoHistoria;
  responsable: string;
}

function siguienteCodigo(historias: HistoriaUsuario[]): string {
  const numeros = historias
    .map((h) => Number(h.codigo.replace('HU-', '')))
    .filter((n) => !Number.isNaN(n));
  const siguiente = (numeros.length ? Math.max(...numeros) : 0) + 1;
  return `HU-${String(siguiente).padStart(2, '0')}`;
}

const formVacio = (codigo: string): FormHistoria => ({
  codigo,
  nombre: '',
  descripcion: '',
  businessValue: '',
  storyPoints: '3',
  sprint: '',
  estado: 'por_hacer',
  responsable: '',
});

export default function Backlog() {
  const [historias, setHistorias] = useState<HistoriaUsuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormHistoria>(formVacio('HU-01'));
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<
    { tipo: 'ok' | 'error'; mensaje: string } | null
  >(null);

  async function cargar() {
    setCargando(true);
    setErrorCarga(null);
    try {
      setHistorias(await listarHistorias());
    } catch (err) {
      setErrorCarga(
        err instanceof Error ? err.message : 'No se pudo cargar el backlog',
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirNueva() {
    setEditandoId(null);
    setForm(formVacio(siguienteCodigo(historias)));
    setErrores({});
    setResultado(null);
    setFormAbierto(true);
  }

  function abrirEdicion(h: HistoriaUsuario) {
    setEditandoId(h.id);
    setForm({
      codigo: h.codigo,
      nombre: h.nombre,
      descripcion: h.descripcion,
      businessValue: String(h.businessValue),
      storyPoints: String(h.storyPoints),
      sprint: h.sprint === null ? '' : String(h.sprint),
      estado: h.estado,
      responsable: h.responsable,
    });
    setErrores({});
    setResultado(null);
    setFormAbierto(true);
  }

  function cerrarForm() {
    setFormAbierto(false);
    setEditandoId(null);
    setErrores({});
  }

  function cambiar<K extends keyof FormHistoria>(
    campo: K,
    valor: FormHistoria[K],
  ) {
    setForm({ ...form, [campo]: valor });
  }

  function validar(): boolean {
    const nuevos: Errores = {};
    if (!/^HU-\d{2,3}$/.test(form.codigo.trim()))
      nuevos.codigo = 'Usa el formato HU-01';
    if (!form.nombre.trim()) nuevos.nombre = 'Escribe el nombre de la historia';
    const bv = Number(form.businessValue);
    if (!Number.isInteger(bv) || bv < 1 || bv > 10)
      nuevos.businessValue = 'Debe ser un número entero entre 1 y 10';
    if (form.sprint !== '') {
      const sp = Number(form.sprint);
      if (!Number.isInteger(sp) || sp < 1)
        nuevos.sprint = 'Debe ser un número entero mayor a 0, o vacío';
    }
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResultado(null);
    if (!validar()) return;

    const payload: HistoriaPayload = {
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      businessValue: Number(form.businessValue),
      storyPoints: Number(form.storyPoints),
      sprint: form.sprint === '' ? null : Number(form.sprint),
      estado: form.estado,
      responsable: form.responsable.trim(),
    };

    setEnviando(true);
    try {
      if (editandoId) {
        await actualizarHistoria(editandoId, payload);
      } else {
        await crearHistoria(payload);
      }
      setResultado({
        tipo: 'ok',
        mensaje: editandoId
          ? `Historia ${payload.codigo} actualizada.`
          : `Historia ${payload.codigo} agregada al backlog.`,
      });
      cerrarForm();
      await cargar();
    } catch (err) {
      setResultado({
        tipo: 'error',
        mensaje:
          err instanceof Error ? err.message : 'No se pudo guardar la historia',
      });
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(h: HistoriaUsuario) {
    if (!window.confirm(`¿Eliminar la historia ${h.codigo} del backlog?`)) return;
    setResultado(null);
    try {
      await eliminarHistoria(h.id);
      setResultado({ tipo: 'ok', mensaje: `Historia ${h.codigo} eliminada.` });
      await cargar();
    } catch (err) {
      setResultado({
        tipo: 'error',
        mensaje:
          err instanceof Error ? err.message : 'No se pudo eliminar la historia',
      });
    }
  }

  const totalPuntos = historias.reduce((acc, h) => acc + h.storyPoints, 0);
  const enSprint = historias.filter((h) => h.sprint !== null).length;
  const hechas = historias.filter((h) => h.estado === 'hecho').length;

  return (
    <div className="page">
      <h2>Product Backlog</h2>
      <p className="subtitle">
        HU-06 · Historias de usuario priorizadas por Cociente de Decisión
        (Business Value ÷ Story Points).
      </p>

      {cargando ? (
        <p className="subtitle">Cargando backlog...</p>
      ) : errorCarga ? (
        <>
          <div className="alert alert-error">{errorCarga}</div>
          <button className="add-btn" onClick={cargar}>
            Reintentar
          </button>
        </>
      ) : (
        <>
          <div className="metrics-grid">
            <div className="metric-tile">
              <div className="value">{historias.length}</div>
              <div className="label">Historias en el backlog</div>
            </div>
            <div className="metric-tile">
              <div className="value">{totalPuntos}</div>
              <div className="label">Story points totales</div>
            </div>
            <div className="metric-tile">
              <div className="value">{enSprint}</div>
              <div className="label">Asignadas a un sprint</div>
            </div>
            <div className="metric-tile">
              <div className="value">{hechas}</div>
              <div className="label">Terminadas</div>
            </div>
          </div>

          {resultado && (
            <div
              className={`alert ${
                resultado.tipo === 'ok' ? 'alert-success' : 'alert-error'
              }`}
              style={{ marginTop: 0, marginBottom: 20 }}
            >
              {resultado.mensaje}
            </div>
          )}

          {formAbierto ? (
            <form className="card" onSubmit={manejarSubmit} noValidate>
              <h3 className="card-title">
                {editandoId ? `Editar ${form.codigo}` : 'Nueva historia de usuario'}
              </h3>

              <div className="form-row">
                <div>
                  <label htmlFor="hu-codigo">Código</label>
                  <input
                    id="hu-codigo"
                    type="text"
                    className={errores.codigo ? 'invalid' : ''}
                    value={form.codigo}
                    onChange={(e) => cambiar('codigo', e.target.value)}
                    placeholder="HU-11"
                  />
                  {errores.codigo && (
                    <p className="error-text">{errores.codigo}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="hu-responsable">Responsable</label>
                  <input
                    id="hu-responsable"
                    type="text"
                    value={form.responsable}
                    onChange={(e) => cambiar('responsable', e.target.value)}
                    placeholder="Ej: Juan Carvajal"
                  />
                </div>
              </div>

              <label htmlFor="hu-nombre">Nombre del requisito</label>
              <input
                id="hu-nombre"
                type="text"
                className={errores.nombre ? 'invalid' : ''}
                value={form.nombre}
                onChange={(e) => cambiar('nombre', e.target.value)}
                placeholder="Ej: Exportar los hallazgos del dashboard a PDF"
              />
              {errores.nombre && <p className="error-text">{errores.nombre}</p>}

              <label htmlFor="hu-descripcion">
                Descripción (opcional): como… quiero… para…
              </label>
              <textarea
                id="hu-descripcion"
                rows={3}
                value={form.descripcion}
                onChange={(e) => cambiar('descripcion', e.target.value)}
                placeholder="Como evaluador quiero... para..."
              />

              <div className="form-row">
                <div>
                  <label htmlFor="hu-bv">Business Value (1 a 10)</label>
                  <input
                    id="hu-bv"
                    type="number"
                    min={1}
                    max={10}
                    className={errores.businessValue ? 'invalid' : ''}
                    value={form.businessValue}
                    onChange={(e) => cambiar('businessValue', e.target.value)}
                  />
                  {errores.businessValue && (
                    <p className="error-text">{errores.businessValue}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="hu-sp">Story Points</label>
                  <select
                    id="hu-sp"
                    value={form.storyPoints}
                    onChange={(e) => cambiar('storyPoints', e.target.value)}
                  >
                    {STORY_POINTS_VALIDOS.map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label htmlFor="hu-sprint">Sprint (vacío = sin asignar)</label>
                  <input
                    id="hu-sprint"
                    type="number"
                    min={1}
                    className={errores.sprint ? 'invalid' : ''}
                    value={form.sprint}
                    onChange={(e) => cambiar('sprint', e.target.value)}
                  />
                  {errores.sprint && (
                    <p className="error-text">{errores.sprint}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="hu-estado">Estado</label>
                  <select
                    id="hu-estado"
                    value={form.estado}
                    onChange={(e) =>
                      cambiar('estado', e.target.value as EstadoHistoria)
                    }
                  >
                    {Object.entries(ETIQUETA_ESTADO).map(([valor, etiqueta]) => (
                      <option key={valor} value={valor}>
                        {etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="button-row">
                <button type="submit" className="submit-btn" disabled={enviando}>
                  {enviando
                    ? 'Guardando...'
                    : editandoId
                      ? 'Guardar cambios'
                      : 'Agregar al backlog'}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={cerrarForm}
                  disabled={enviando}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              className="add-btn"
              onClick={abrirNueva}
              style={{ marginTop: 0, marginBottom: 20 }}
            >
              + Nueva historia
            </button>
          )}

          <div className="card">
            <h3 className="card-title">Historias priorizadas</h3>
            {historias.length === 0 ? (
              <p className="subtitle" style={{ margin: 0 }}>
                El backlog está vacío. Agrega la primera historia con "+ Nueva
                historia", o carga el backlog del Excel con{' '}
                <code>npm run seed</code> en el backend.
              </p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>HU</th>
                      <th>Nombre del requisito</th>
                      <th title="Business Value">BV</th>
                      <th title="Story Points">SP</th>
                      <th>Cociente</th>
                      <th>Sprint</th>
                      <th>Estado</th>
                      <th>
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {historias.map((h, i) => (
                      <tr key={h.id}>
                        <td>{i + 1}</td>
                        <td className="nowrap">
                          <strong>{h.codigo}</strong>
                        </td>
                        <td>
                          {h.nombre}
                          {h.responsable && (
                            <div className="muted">{h.responsable}</div>
                          )}
                        </td>
                        <td>{h.businessValue}</td>
                        <td>{h.storyPoints}</td>
                        <td>{h.cocienteDecision.toFixed(2)}</td>
                        <td>{h.sprint ?? '—'}</td>
                        <td>
                          <span className={`badge badge-${h.estado}`}>
                            {ETIQUETA_ESTADO[h.estado]}
                          </span>
                        </td>
                        <td className="nowrap">
                          <button
                            className="link-btn"
                            onClick={() => abrirEdicion(h)}
                            aria-label={`Editar ${h.codigo}`}
                          >
                            Editar
                          </button>
                          <button
                            className="link-btn link-btn-danger"
                            onClick={() => eliminar(h)}
                            aria-label={`Eliminar ${h.codigo}`}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
