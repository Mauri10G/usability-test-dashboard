import { useEffect, useState } from 'react';
import {
  crearRetrospectiva,
  eliminarRetrospectiva,
  listarRetrospectivas,
  Retrospectiva as RetrospectivaData,
} from '../api';

type Lista = 'queSalioBien' | 'queMejorar' | 'acciones';

const SECCIONES: { clave: Lista; titulo: string; ayuda: string }[] = [
  {
    clave: 'queSalioBien',
    titulo: '¿Qué salió bien?',
    ayuda: 'Prácticas o resultados que el equipo quiere mantener.',
  },
  {
    clave: 'queMejorar',
    titulo: '¿Qué se puede mejorar?',
    ayuda: 'Problemas u obstáculos que aparecieron en el sprint.',
  },
  {
    clave: 'acciones',
    titulo: 'Acciones para el siguiente sprint',
    ayuda: 'Compromisos concretos, con responsable si es posible.',
  },
];

interface Errores {
  [key: string]: string;
}

const listasVacias = (): Record<Lista, string[]> => ({
  queSalioBien: [''],
  queMejorar: [''],
  acciones: [''],
});

export default function Retrospectiva() {
  const [retros, setRetros] = useState<RetrospectivaData[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [sprint, setSprint] = useState('');
  const [facilitador, setFacilitador] = useState('');
  const [listas, setListas] = useState(listasVacias());
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<
    { tipo: 'ok' | 'error'; mensaje: string } | null
  >(null);

  async function cargar() {
    setCargando(true);
    setErrorCarga(null);
    try {
      const data = await listarRetrospectivas();
      setRetros(data);
      if (data.length) setSprint(String(data[0].sprint + 1));
    } catch (err) {
      setErrorCarga(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las retrospectivas',
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function cambiarItem(lista: Lista, i: number, valor: string) {
    const copia = [...listas[lista]];
    copia[i] = valor;
    setListas({ ...listas, [lista]: copia });
  }

  function validar(): boolean {
    const nuevos: Errores = {};
    const n = Number(sprint);
    if (!Number.isInteger(n) || n < 1)
      nuevos.sprint = 'Indica el número de sprint (1, 2, 3...)';
    if (!facilitador.trim())
      nuevos.facilitador = 'Indica quién facilitó la retrospectiva';
    const totalPuntos = SECCIONES.reduce(
      (acc, s) => acc + listas[s.clave].filter((t) => t.trim()).length,
      0,
    );
    if (totalPuntos === 0)
      nuevos.listas = 'Escribe al menos un punto en alguna de las secciones';
    setErrores(nuevos);
    return Object.keys(nuevos).length === 0;
  }

  async function manejarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResultado(null);
    if (!validar()) return;

    // Los campos vacios se descartan en lugar de bloquear el envio.
    const limpiar = (items: string[]) =>
      items.map((t) => t.trim()).filter(Boolean);

    setEnviando(true);
    try {
      await crearRetrospectiva({
        sprint: Number(sprint),
        facilitador: facilitador.trim(),
        queSalioBien: limpiar(listas.queSalioBien),
        queMejorar: limpiar(listas.queMejorar),
        acciones: limpiar(listas.acciones),
      });
      setResultado({
        tipo: 'ok',
        mensaje: `Retrospectiva del sprint ${sprint} guardada.`,
      });
      setFacilitador('');
      setListas(listasVacias());
      setErrores({});
      await cargar();
    } catch (err) {
      setResultado({
        tipo: 'error',
        mensaje:
          err instanceof Error
            ? err.message
            : 'No se pudo guardar la retrospectiva',
      });
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(r: RetrospectivaData) {
    if (!window.confirm(`¿Eliminar la retrospectiva del sprint ${r.sprint}?`))
      return;
    try {
      await eliminarRetrospectiva(r.id);
      await cargar();
    } catch (err) {
      setResultado({
        tipo: 'error',
        mensaje:
          err instanceof Error
            ? err.message
            : 'No se pudo eliminar la retrospectiva',
      });
    }
  }

  return (
    <div className="page">
      <h2>Retrospectiva del sprint</h2>
      <p className="subtitle">
        HU-08 · Registra lo que salió bien, lo que se puede mejorar y las
        acciones para el siguiente sprint.
      </p>

      <form className="card" onSubmit={manejarSubmit} noValidate>
        <h3 className="card-title">Nueva retrospectiva</h3>
        <div className="form-row">
          <div>
            <label htmlFor="retro-sprint">Sprint</label>
            <input
              id="retro-sprint"
              type="number"
              min={1}
              className={errores.sprint ? 'invalid' : ''}
              value={sprint}
              onChange={(e) => setSprint(e.target.value)}
              placeholder="Ej: 2"
            />
            {errores.sprint && <p className="error-text">{errores.sprint}</p>}
          </div>
          <div>
            <label htmlFor="retro-facilitador">Facilitador</label>
            <input
              id="retro-facilitador"
              type="text"
              className={errores.facilitador ? 'invalid' : ''}
              value={facilitador}
              onChange={(e) => setFacilitador(e.target.value)}
              placeholder="Ej: Erick López (Scrum Master)"
            />
            {errores.facilitador && (
              <p className="error-text">{errores.facilitador}</p>
            )}
          </div>
        </div>

        {SECCIONES.map((s) => (
          <fieldset className={`retro-box retro-${s.clave}`} key={s.clave}>
            <legend>{s.titulo}</legend>
            <p className="muted" style={{ marginTop: 0 }}>
              {s.ayuda}
            </p>
            {listas[s.clave].map((item, i) => (
              <div className="retro-item" key={i}>
                <input
                  type="text"
                  aria-label={`${s.titulo} punto ${i + 1}`}
                  value={item}
                  onChange={(e) => cambiarItem(s.clave, i, e.target.value)}
                />
                {listas[s.clave].length > 1 && (
                  <button
                    type="button"
                    className="link-btn link-btn-danger"
                    aria-label={`Quitar punto ${i + 1} de ${s.titulo}`}
                    onClick={() =>
                      setListas({
                        ...listas,
                        [s.clave]: listas[s.clave].filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    Quitar
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="add-btn"
              style={{ marginTop: 8 }}
              onClick={() =>
                setListas({ ...listas, [s.clave]: [...listas[s.clave], ''] })
              }
            >
              + Agregar punto
            </button>
          </fieldset>
        ))}
        {errores.listas && <p className="error-text">{errores.listas}</p>}

        <div>
          <button type="submit" className="submit-btn" disabled={enviando}>
            {enviando ? 'Guardando...' : 'Guardar retrospectiva'}
          </button>
        </div>

        {resultado && (
          <div
            className={`alert ${
              resultado.tipo === 'ok' ? 'alert-success' : 'alert-error'
            }`}
            role="status"
          >
            {resultado.mensaje}
          </div>
        )}
      </form>

      <h3 className="section-title">Retrospectivas anteriores</h3>
      {cargando ? (
        <p className="subtitle">Cargando retrospectivas...</p>
      ) : errorCarga ? (
        <>
          <div className="alert alert-error">{errorCarga}</div>
          <button className="add-btn" onClick={cargar}>
            Reintentar
          </button>
        </>
      ) : retros.length === 0 ? (
        <p className="subtitle">Todavía no se ha registrado ninguna.</p>
      ) : (
        retros.map((r) => (
          <div className="card" key={r.id}>
            <div className="retro-header">
              <h3 className="card-title" style={{ margin: 0 }}>
                Sprint {r.sprint}
              </h3>
              <span className="muted">
                {new Date(r.fecha).toLocaleDateString('es-EC')} · Facilitó{' '}
                {r.facilitador}
              </span>
              <button
                className="link-btn link-btn-danger"
                onClick={() => eliminar(r)}
                aria-label={`Eliminar retrospectiva del sprint ${r.sprint}`}
              >
                Eliminar
              </button>
            </div>
            <div className="retro-grid">
              {SECCIONES.map((s) => (
                <div className={`retro-col retro-${s.clave}`} key={s.clave}>
                  <h4>{s.titulo}</h4>
                  {r[s.clave].length === 0 ? (
                    <p className="muted">—</p>
                  ) : (
                    <ul>
                      {r[s.clave].map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
