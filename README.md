# Usability Test Dashboard 2.0 — Codigo base Sprint 1 / Sprint 2

Modulos incluidos en este codigo: **1. Evaluaciones de usabilidad**,
**2. Dashboard de resultados** y **5. SCRUM**. El modulo de IA queda
pendiente para el segundo parcial, como se acordo con el docente.

## Que trae

- `backend/` — API en NestJS con tres modulos:
  - `evaluaciones`: registra una prueba de usabilidad completa, con sus
    tareas, tiempos, exito o fracaso, errores y observaciones. HU-01.
  - `dashboard`: calcula metricas a partir de las pruebas registradas:
    tasa de exito, observaciones por severidad, tareas con mas errores,
    tiempo promedio. HU-02.
  - `scrum`: Product Backlog (HU-06), tablero Kanban (HU-07) y
    retrospectivas (HU-08). CRUD completo, ver endpoints abajo.
  - Los datos se guardan en una base de datos **SQLite** con TypeORM, en
    `backend/data/usability.sqlite`. El archivo se crea solo la primera vez
    que arranca el backend. Se puede cambiar la ruta con la variable
    `DB_PATH`.
- `frontend/` — App en React con cinco pantallas:
  - `/` Dashboard de resultados, consume `GET /dashboard/metrics`.
  - `/registrar` Formulario de evaluacion con validacion en el cliente,
    consume `POST /evaluaciones`. HU-09.
  - `/backlog` Product Backlog priorizado por Cociente de Decision.
  - `/tablero` Tablero Kanban: Por hacer, En progreso, Hecho.
  - `/retrospectiva` Registro e historial de retrospectivas.
- `docs/` — Entregables de diseno y planificacion:
  - [Diagnostico heuristico](docs/diagnostico-heuristico.md) (Nielsen, con severidad).
  - [Product Backlog](docs/product-backlog.md) (mismo formato que el Excel).
  - [Wireframes](docs/wireframes/README.md) de baja y alta fidelidad.

## Como correrlo en tu computador

### 1. Backend

```
cd backend
npm install
npm run start:dev
```

Queda escuchando en `http://localhost:3000`.

Opcional: para cargar en la base de datos el backlog del Excel de
planificacion (HU-01 a HU-10), **con el backend detenido**, dentro de
`backend/`:

```
npm run seed
```

Se puede correr varias veces, no duplica historias. Si el backend esta
encendido, el seed se niega a correr: con sql.js cada proceso tiene su
propia copia de la base en memoria y el ultimo en guardar borraria los
cambios del otro. Por la misma razon no se pueden levantar dos backends
sobre el mismo archivo.

Cada registro, cambio o eliminacion que llega por la API se escribe al
archivo en el momento (opcion `autoSave` de TypeORM).

La base de datos usa `sql.js` (SQLite compilado a WebAssembly), asi que
`npm install` no necesita compilar nada ni aprobar scripts de instalacion.
Para empezar con la base vacia, se detiene el backend y se borra la
carpeta `backend/data/`.

### 2. Frontend

En otra terminal:

```
cd frontend
npm install
npm run dev
```

Queda escuchando en `http://localhost:5173`. Abre esa direccion en el
navegador.

Si el backend corre en otro puerto o en otra maquina, crea un archivo
`.env` dentro de `frontend/` con:

```
VITE_API_URL=http://localhost:3000
```

<<<<<<< HEAD
=======
## Endpoints

| Metodo | Ruta | Que hace |
|---|---|---|
| POST | `/evaluaciones` | Registra una prueba |
| GET | `/evaluaciones` | Lista las pruebas, la mas reciente primero |
| GET | `/evaluaciones/:id` | Una prueba |
| GET | `/dashboard/metrics` | Metricas del dashboard |
| GET | `/scrum/historias` | Backlog priorizado. Filtros: `?sprint=2`, `?sprint=backlog`, `?estado=en_progreso` |
| GET | `/scrum/historias/:id` | Una historia |
| POST | `/scrum/historias` | Crea una historia |
| PATCH | `/scrum/historias/:id` | Edita una historia (`sprint: null` la regresa al backlog) |
| PATCH | `/scrum/historias/:id/estado` | Cambia el estado: `por_hacer`, `en_progreso`, `hecho` |
| DELETE | `/scrum/historias/:id` | Elimina una historia |
| GET | `/scrum/retrospectivas` | Lista las retrospectivas, la del sprint mas reciente primero |
| GET | `/scrum/retrospectivas/:id` | Una retrospectiva |
| POST | `/scrum/retrospectivas` | Crea una retrospectiva |
| PATCH | `/scrum/retrospectivas/:id` | Edita una retrospectiva |
| DELETE | `/scrum/retrospectivas/:id` | Elimina una retrospectiva |

## Como subir esto al repositorio del equipo

Desde la raiz de este proyecto:

```
git checkout -b feature/modulo-evaluaciones-dashboard develop
git add backend frontend README.md
git commit -m "feat(evaluaciones,dashboard): implementacion base de los modulos 1 y 2"
git push -u origin feature/modulo-evaluaciones-dashboard
```

Luego se abre el Pull Request hacia `develop` desde GitHub, con
`Closes #<numero del issue correspondiente>` en la descripcion.

## Pendiente

- Aplicar los mockups de alta fidelidad del Dashboard y del Formulario
  (`docs/wireframes/alta-fidelidad.md`), que corrigen los hallazgos del
  diagnostico heuristico.
- Sumar el modulo 4 (rediseño y evidencia de mejora, HU-03).
- Validar con el PO las historias propuestas HU-11 a HU-14.
>>>>>>> feature/modulo-evaluaciones-dashboard
