# Usability Test Dashboard 2.0 — Sprint 3

Modulos incluidos en este codigo: **1. Evaluaciones de usabilidad**,
**2. Dashboard de resultados**, **3. IA para analisis UX** y **5. SCRUM**.
El modulo 4 (rediseño y evidencia de mejora, HU-03) sigue pendiente.

## Que trae

- `backend/` — API en NestJS con tres modulos:
  - `evaluaciones`: registra una prueba de usabilidad completa, con sus
    tareas, tiempos, exito o fracaso, errores y observaciones. HU-01.
  - `dashboard`: calcula metricas a partir de las pruebas registradas:
    tasa de exito, observaciones por severidad, problemas mas frecuentes
    (la misma tarea agrupada entre pruebas), tiempo promedio. Se puede
    filtrar por pantalla, evaluador y fechas. HU-02, HU-14.
  - `ia`: modulo 3. Lee las observaciones de texto libre de las pruebas y
    devuelve un resumen automatico, la clasificacion por categoria UX
    (navegacion, formularios, accesibilidad, rendimiento, retroalimentacion,
    contenido, visualizacion) y una historia de usuario sugerida por cada
    problema recurrente. HU-04, HU-05. Ver "Como funciona el analisis con IA".
  - `scrum`: Product Backlog (HU-06), tablero Kanban (HU-07) y
    retrospectivas (HU-08). CRUD completo, ver endpoints abajo.
  - Los datos se guardan en una base de datos **SQLite** con TypeORM, en
    `backend/data/usability.sqlite`. El archivo se crea solo la primera vez
    que arranca el backend. Se puede cambiar la ruta con la variable
    `DB_PATH`.
- `frontend/` — App en React con siete pantallas:
  - `/` Dashboard de resultados, consume `GET /dashboard/metrics`. Sigue
    el mockup de alta fidelidad: filtros, hora de actualizacion, leyenda
    de severidad, problemas mas frecuentes y fecha en las ultimas pruebas.
  - `/registrar` Formulario de evaluacion, consume `POST /evaluaciones`.
    HU-09. Resumen de errores enfocable con enlaces a cada campo,
    etiquetas asociadas, ayudas, resultado sin valor por defecto y
    contraste WCAG AA.
  - `/pruebas/:id` Detalle de una prueba, con opcion de eliminarla.
  - `/analisis-ia` Analisis UX con IA, consume `POST /ia/analizar`. Permite
    agregar al backlog las historias sugeridas.
  - `/backlog` Product Backlog priorizado por Cociente de Decision.
  - `/tablero` Tablero Kanban: Por hacer, En progreso, Hecho.
  - `/retrospectiva` Registro e historial de retrospectivas.
- `docs/` — Entregables de diseno y planificacion:
  - [Diagnostico heuristico](docs/diagnostico-heuristico.md) (Nielsen, con severidad).
  - [Product Backlog](docs/product-backlog.md) (mismo formato que el Excel).
  - [Wireframes](docs/wireframes/README.md) de baja y alta fidelidad.
  - [Deuda tecnica](docs/deuda-tecnica.md) revisada al inicio del Sprint 3.
  - [Evidencia del Sprint 3](docs/evidencia/sprint-3/) (capturas).

## Como correrlo en tu computador

### 1. Backend

```
cd backend
npm install
npm run start:dev
```

Queda escuchando en `http://localhost:3000`.

#### Clave de Gemini (modulo de IA)

Copia `backend/.env.example` como `backend/.env` y pon la clave de Google
AI Studio:

```
GEMINI_API_KEY=tu_clave
```

`backend/.env` esta en el `.gitignore`: la clave no se sube al repositorio.
Sin clave el sistema sigue funcionando: el analisis de observaciones usa
las reglas por palabras clave y la evaluacion de capturas avisa que
necesita la clave. Al cambiar el `.env` hay que reiniciar el backend.

#### Datos iniciales y correcciones

Opcional: para cargar en la base de datos el backlog (HU-01 a HU-14),
**con el backend detenido**, dentro de `backend/`:

```
npm run seed
```

Para aplicar las correcciones de datos del Sprint 3 (nombres de personas
en formato "Nombre Apellido" y borrado de la prueba de ensayo), tambien con
el backend detenido:

```
npm run db:corregir
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

## Endpoints

| Metodo | Ruta | Que hace |
|---|---|---|
| POST | `/evaluaciones` | Registra una prueba |
| GET | `/evaluaciones` | Lista las pruebas, la mas reciente primero |
| GET | `/evaluaciones/:id` | Una prueba |
| DELETE | `/evaluaciones/:id` | Elimina una prueba con sus tareas y observaciones |
| GET | `/dashboard/metrics` | Metricas del dashboard. Filtros opcionales: `?pantalla=`, `?evaluador=`, `?desde=AAAA-MM-DD`, `?hasta=AAAA-MM-DD` |
| GET | `/ia/estado` | Si Gemini esta configurado y que modelos usa (nunca devuelve la clave) |
| POST | `/ia/analizar` | Analisis UX de las observaciones, con Gemini o con reglas de respaldo. Cuerpo opcional: `{ "pantallaEvaluada": "Formulario" }` o `{ "pruebaIds": ["..."] }` |
| POST | `/ia/evaluar-captura` | Evaluacion heuristica (10 heuristicas de Nielsen) de una captura con Gemini. `multipart/form-data` con la imagen en el campo `imagen` (PNG, JPG o WebP, hasta 8 MB). Devuelve un `id` y guarda el reporte (no la imagen) en la tabla `evaluaciones_captura` |
| GET | `/ia/matriz/:id` | Matriz de esa evaluacion en Word (`.docx`, A4 horizontal): resumen por severidad y una fila por hallazgo con Heuristica, Severidad, Problema, Donde y Recomendacion |
| POST | `/ia/generar-prototipo` | Version corregida de la captura. `multipart/form-data` con `imagen` y `hallazgos` (lista JSON). Responde `modo: gemini` (imagen de un modelo de Gemini) o `modo: boceto` (wireframe dibujado en el servidor) |
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

## Como funciona el analisis con IA

### `POST /ia/analizar`

Primero se intenta con la **API de Gemini**; si no hay clave, si Gemini
tarda demasiado o responde con error, se usan las **reglas por palabras
clave**. Asi la demo nunca se queda sin resultado. La consola del backend
dice que modo se uso en cada respuesta:

```
[IA] POST /ia/analizar -> modo GEMINI (gemini-3.5-flash-lite, 5.5 s, 10 observaciones, 3 historias)
[IA] POST /ia/analizar -> modo REGLAS (respaldo: GEMINI_API_KEY no esta configurada)
```

y la pantalla `/analisis-ia` lo muestra junto al resumen.

- **Con Gemini**: Gemini clasifica cada observacion en una categoria UX con
  una justificacion, describe los patrones que se repiten y redacta el
  texto de las historias sugeridas. Las cifras (impacto, recurrencia,
  Business Value y codigo de la historia) las calcula el servidor con las
  mismas formulas del modo de reglas, para que el resumen no contradiga
  las tablas.
- Se prueban varios modelos en orden (`GEMINI_MODELOS`); si uno devuelve
  HTTP 503 por alta demanda o no responde en 15 s, se pasa al siguiente.
  El tope total es 45 s antes de caer a las reglas.
- Solo se envia a Gemini el texto de las observaciones, su severidad, la
  pantalla y el id de la prueba; no se envian nombres de evaluadores.

### Reglas de respaldo

Es un clasificador por reglas, sin modelo entrenado, para que cada
resultado se pueda explicar.

1. Cada observacion se normaliza (minusculas, sin tildes) y se buscan las
   palabras clave de cada categoria en `backend/src/ia/reglas.ts`. Las
   palabras fuertes suman 1 punto y las debiles (como "boton" o "pantalla",
   que aparecen en muchos contextos) suman 0,5. Gana la categoria con mas
   puntos; si ninguna coincide, queda en "Otros".
2. El impacto de una categoria es la suma de las severidades de sus
   observaciones (alta 3, media 2, baja 1).
3. Una categoria es un problema recurrente si aparece en 2 o mas pruebas
   distintas, o si tiene 2 o mas observaciones de severidad alta. Para
   cada una se sugiere una historia de usuario con Business Value
   = 2 × severidad promedio + pruebas afectadas (maximo 10), Story Points
   segun la categoria, criterios de aceptacion y la evidencia que la
   origino.
4. El resumen se arma con plantillas a partir de esos numeros.

La pantalla `/analisis-ia` muestra las palabras que disparo cada
clasificacion (o la justificacion de Gemini) y la tabla completa de reglas.

### `POST /ia/evaluar-captura`

Envia la imagen a Gemini con un prompt que aplica las 10 heuristicas de
Nielsen con la escala de severidad 0 a 4 de
[`docs/diagnostico-heuristico.md`](docs/diagnostico-heuristico.md). Por
cada hallazgo devuelve la heuristica, la severidad, el problema visible,
donde esta en la pantalla y una recomendacion. El servidor descarta los de
severidad 0 y agrupa por heuristica, de mayor a menor severidad. Usa una
cadena de modelos propia (`GEMINI_MODELOS_CAPTURA`) que prioriza calidad:
con los modelos "lite" salian muchos menos hallazgos. Esta funcion no tiene
respaldo por reglas (hace falta un modelo que vea la imagen); sin clave
responde 503 con un mensaje claro.

La pantalla `/evaluacion-captura` permite elegir o pegar (Ctrl+V) la
imagen, muestra el progreso mientras Gemini responde y permite copiar el
reporte como tabla Markdown con el formato del diagnostico. **Revisa los
hallazgos antes de usarlos**: en las pruebas Gemini tambien reporto
problemas que no existen (por ejemplo, que fechas de 2026 "estan en el
futuro").

### Matriz y prototipo corregido

Debajo del reporte, el boton **Generar matriz y prototipo** muestra la
matriz de evaluacion en pantalla (la descarga en Word sale de
`GET /ia/matriz/:id`, generada con la libreria `docx`) y pide
`POST /ia/generar-prototipo`:

1. Primero intenta con un modelo de imagen de Gemini
   (`GEMINI_MODELOS_IMAGEN`, por defecto `gemini-3.1-flash-image` y
   `gemini-2.5-flash-image`), con 20 s como maximo en total.
2. Si falla, no responde a tiempo o no hay clave, dibuja un **boceto
   automatico** (`backend/src/ia/boceto/`): la pantalla **redibujada como
   wireframe en escala de grises con las correcciones ya aplicadas**, no un
   filtro sobre la captura.
   - `estructura.ts`: que hay en la pantalla y donde (menu, cada grafico con
     su tipo, series, numeros y ejes, tablas, tarjetas, pie de pagina). Lo
     lee un modelo de Gemini con vision (`GEMINI_MODELOS_CAPTURA`), en
     paralelo con el intento de imagen. Si Gemini no responde, se detectan
     los bloques de la captura por pixeles y el dibujo es mas generico.
   - `ajustes.ts`: traduce la recomendacion de cada hallazgo a cambios del
     dibujo y decide en que componente va (por el recuadro que marco Gemini
     al evaluar; si no hay recuadro, por la descripcion del lugar, y se avisa
     en el resumen). Ejemplos: graficos 3D -> barras o lineas planas 2D;
     color saturado -> tono suave; leyendas chicas -> leyenda grande y
     rotulos directos; precision excesiva -> numeros redondeados; demasiados
     datos -> menos puntos y control de rango; menu desordenado -> secciones
     con titulo; "agregar un boton de exportacion" -> boton "Exportar";
     enlaces poco claros -> columna "Accion" con enlaces subrayados.
   - `dibujo.ts` y `texto.ts`: dibujan cada componente con textos de 18 px
     como minimo (16 px en encabezados de tabla angostos), sin texto cortado
     ni recuadros superpuestos; los numeros de correccion van dentro de cada
     componente y la lista al costado, con el mismo numero que la matriz.

La consola muestra el modo, igual que en el analisis de texto:

```
[IA] POST /ia/generar-prototipo -> modo BOCETO (respaldo: la clave de Gemini no tiene cuota para generar imagenes ...; estructura: GEMINI gemini-3-flash-preview, 6 componentes; 13.9 s, 5 correcciones, dashboard-3d.png)
```

Con una clave del plan gratuito los modelos de imagen responden HTTP 429,
asi que en la practica sale el boceto (10 a 35 s, segun lo que tarde Gemini
en leer la estructura). Es un boceto para discutir las correcciones, no un
diseno final. Ejemplo: `docs/evidencia/sprint-3/prototipo-boceto-dashboard-3d.png`.

## Pendiente

- Editar una prueba registrada (el detalle ya permite verla y eliminarla).
- Sumar el modulo 4 (rediseño y evidencia de mejora, HU-03).
- Capturas de evidencia del diagnostico heuristico y el resto de la
  [deuda tecnica](docs/deuda-tecnica.md).
