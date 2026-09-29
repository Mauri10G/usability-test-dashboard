# Diagnóstico heurístico — Usability Test Dashboard 2.0

**Sprint:** 1 (22 sep – 1 oct 2026) · **Historia:** HU-01 / Diagnóstico del sistema propio
**Método:** inspección heurística con las 10 heurísticas de Nielsen, sobre la versión del commit `dee5f22` (pantallas `/` Dashboard y `/registrar` Formulario, backend NestJS con datos en memoria).
**Alcance:** módulos 1 (Evaluaciones) y 2 (Dashboard). El módulo 5 (SCRUM) se construyó después de este diagnóstico.

> Este documento es la base para la matriz de heurísticas del Excel. Antes de entregarlo
> hay que agregar las capturas de evidencia de cada hallazgo (columna *Evidencia*) y validar
> las severidades en equipo.

## Escala de severidad (Nielsen)

| Valor | Significado |
|---|---|
| 0 | No es un problema de usabilidad |
| 1 | Cosmético: se corrige solo si sobra tiempo |
| 2 | Menor: prioridad baja |
| 3 | Mayor: importante corregirlo, prioridad alta |
| 4 | Catastrófico: hay que corregirlo antes de liberar |

## Resumen

| Heurística | Hallazgos | Severidad máxima |
|---|---|---|
| H1 Visibilidad del estado del sistema | 3 | 3 |
| H2 Relación entre el sistema y el mundo real | 3 | 2 |
| H3 Control y libertad del usuario | 2 | 3 |
| H4 Consistencia y estándares | 3 | 2 |
| H5 Prevención de errores | 3 | 3 |
| H6 Reconocer antes que recordar | 2 | 2 |
| H7 Flexibilidad y eficiencia de uso | 2 | 2 |
| H8 Diseño estético y minimalista | 2 | 3 |
| H9 Ayudar a reconocer, diagnosticar y recuperarse de errores | 2 | 3 |
| H10 Ayuda y documentación | 1 | 2 |
| **Total** | **23** | |

Distribución: **6 mayores (3)**, **12 menores (2)**, **5 cosméticos (1)**, ninguno catastrófico.

## Hallazgos

Pantalla: **D** = Dashboard (`/`), **F** = Formulario (`/registrar`), **G** = general.

### H1 · Visibilidad del estado del sistema

| ID | Pantalla | Hallazgo | Evidencia | Sev. |
|---|---|---|---|---|
| H1-1 | F | Si la validación falla en un campo de arriba (por ejemplo *Nombre de la evaluación*) mientras el usuario está al final del formulario junto al botón, **no pasa nada visible**: no hay resumen de errores ni se mueve el foco o el scroll al primer campo inválido. El usuario cree que el botón no funciona. | `Formulario.tsx`, `manejarSubmit` retorna sin feedback cuando `validar()` es falso | 3 |
| H1-2 | G | Los datos se guardaban en memoria: al reiniciar el backend desaparecían todas las pruebas sin ningún aviso. | `evaluaciones.service.ts` (versión Sprint 1). **Resuelto en Sprint 2** con SQLite | 3 |
| H1-3 | D | El dashboard no indica cuándo se calcularon las métricas ni tiene un botón para actualizar; hay que recargar la página entera para ver una prueba recién registrada. | `Dashboard.tsx` solo carga en `useEffect` | 2 |

### H2 · Relación entre el sistema y el mundo real

| ID | Pantalla | Hallazgo | Evidencia | Sev. |
|---|---|---|---|---|
| H2-1 | D | *Tareas con más errores* lista filas sueltas en lugar de agrupar la misma tarea entre pruebas, e incluye tareas con 0 errores. No responde a la pregunta del evaluador (HU-02: *problemas más frecuentes*). | `dashboard.service.ts`: `sort(...).slice(0, 5)` sin agrupar ni filtrar | 2 |
| H2-2 | G | Faltan tildes en toda la interfaz: *Metricas, exito, Ultimas, evaluacion, observacion, Numero, Descripcion, mas*. Da impresión de sistema descuidado. | Textos de `Dashboard.tsx` y `Formulario.tsx` | 1 |
| H2-3 | D, F | Los subtítulos muestran códigos internos del equipo (*HU-01 ·*, *HU-02 ·*) que no significan nada para un evaluador. | Subtítulos de ambas pantallas | 1 |

### H3 · Control y libertad del usuario

| ID | Pantalla | Hallazgo | Evidencia | Sev. |
|---|---|---|---|---|
| H3-1 | G | Una prueba registrada **no se puede ver en detalle, editar ni eliminar** desde la interfaz. Un error de digitación queda para siempre en las métricas. | Solo existen `POST`, `GET` y `GET /:id`; ninguna pantalla usa `GET /:id` | 3 |
| H3-2 | F | *Quitar* elimina una tarea u observación de inmediato, sin confirmación ni deshacer, y no hay botón para limpiar o cancelar el formulario. | `remove-btn` en `Formulario.tsx` | 2 |

### H4 · Consistencia y estándares

| ID | Pantalla | Hallazgo | Evidencia | Sev. |
|---|---|---|---|---|
| H4-1 | G | Los mensajes de validación del backend mezclan español con inglés y rutas técnicas: `tareas.0.errores must be an integer number`. Se muestran tal cual al usuario. | Respuesta real de `POST /evaluaciones` con `errores: 1.5` | 2 |
| H4-2 | D | El botón *Reintentar* usa el estilo punteado de *+ Agregar*, que en el formulario significa "añadir un elemento". | `className="add-btn"` en `Dashboard.tsx` | 1 |
| H4-3 | F | Las tareas y observaciones tienen etiquetas visibles, pero sin `htmlFor`/`id`: al hacer clic en la etiqueta no se enfoca el campo, a diferencia de los campos de arriba que sí funcionan así. | `<label>Descripcion de la tarea</label>` sin `htmlFor` | 2 |

### H5 · Prevención de errores

| ID | Pantalla | Hallazgo | Evidencia | Sev. |
|---|---|---|---|---|
| H5-1 | F | La casilla *El usuario completó la tarea con éxito* viene **marcada por defecto**. Si el evaluador olvida desmarcarla, la tasa de éxito del dashboard sale inflada sin que nadie lo note. | `tareaVacia()` → `exito: true` | 3 |
| H5-2 | F | Los campos numéricos arrancan en `0` y hay que borrar el cero antes de escribir; el tiempo en `0` es justamente un valor inválido. | `tiempoSegundos: 0`, `errores: 0` | 2 |
| H5-3 | F | *Número de errores* no se valida en el cliente: acepta negativos y decimales, y el error solo aparece al enviar, como mensaje del servidor (ver H4-1). | `validar()` no revisa `errores` | 2 |

### H6 · Reconocer antes que recordar

| ID | Pantalla | Hallazgo | Evidencia | Sev. |
|---|---|---|---|---|
| H6-1 | D | *Últimas pruebas registradas* no muestra la fecha, aunque el backend la envía. No se distingue una prueba de hoy de una de hace una semana. | `fecha` existe en `ultimasPruebas` pero no se pinta | 2 |
| H6-2 | F | Cuando hay varias tareas, las cajas no están numeradas (*Tarea 1*, *Tarea 2*...). El usuario tiene que recordar cuál es cuál al revisar. | `tarea-box` sin título | 1 |

### H7 · Flexibilidad y eficiencia de uso

| ID | Pantalla | Hallazgo | Evidencia | Sev. |
|---|---|---|---|---|
| H7-1 | D | No hay filtros por pantalla evaluada, evaluador ni fecha. Con muchas pruebas el dashboard deja de ser útil. | `GET /dashboard/metrics` no recibe parámetros | 2 |
| H7-2 | F | Tras registrar, el mensaje dice *"Ya se ve en el Dashboard"* pero no ofrece un enlace para ir, ni una opción para registrar otra prueba de la misma pantalla sin volver a escribir los datos. | Mensaje de éxito en `Formulario.tsx` | 1 |

### H8 · Diseño estético y minimalista (incluye contraste)

| ID | Pantalla | Hallazgo | Evidencia | Sev. |
|---|---|---|---|---|
| H8-1 | F | El texto de error (`#ef4444` sobre blanco, 12 px) tiene contraste **3.76:1**; WCAG AA pide 4.5:1. Justo el texto que el usuario más necesita leer es el menos legible. | Medido con la fórmula de luminancia relativa de WCAG 2.1 | 3 |
| H8-2 | G | El borde de los campos (`#d1d5db` sobre blanco) tiene contraste **1.47:1**; WCAG 1.4.11 pide 3:1 para componentes de interfaz. Los subtítulos (`#6b7280` sobre `#f4f6fb`) quedan en **4.47:1**, apenas debajo de 4.5:1. | Mismo cálculo | 2 |

### H9 · Ayudar a reconocer, diagnosticar y recuperarse de errores

| ID | Pantalla | Hallazgo | Evidencia | Sev. |
|---|---|---|---|---|
| H9-1 | D, F | Si el backend está apagado, el usuario ve el mensaje técnico del navegador **"Failed to fetch"**, en inglés y sin decir qué hacer. | `manejarRespuesta` no captura el `TypeError` de `fetch` | 3 |
| H9-2 | F | Los errores del servidor se muestran todos juntos, separados por `\|`, al final del formulario y sin señalar el campo afectado. | `cuerpo.message.join(' \| ')` en `api.ts` | 2 |

### H10 · Ayuda y documentación

| ID | Pantalla | Hallazgo | Evidencia | Sev. |
|---|---|---|---|---|
| H10-1 | F | No se explica qué significa severidad *baja*, *media* o *alta*. Dos evaluadores pueden clasificar el mismo problema distinto y el gráfico por severidad pierde sentido. | Select de severidad sin ayuda | 2 |

## Prioridad de corrección

Prioridad sugerida = Severidad × Frecuencia (1 = pasa rara vez, 3 = pasa en casi todo uso). Top 8:

| # | ID | Hallazgo resumido | Sev. | Frec. | Prioridad | Historia |
|---|---|---|---|---|---|---|
| 1 | H5-1 | Casilla de éxito marcada por defecto | 3 | 3 | 9 | HU-09 |
| 2 | H1-1 | Sin feedback cuando la validación falla fuera de la vista | 3 | 3 | 9 | HU-09 |
| 3 | H8-1 | Texto de error con bajo contraste | 3 | 3 | 9 | HU-09 |
| 4 | H3-1 | No se puede ver, editar ni eliminar una prueba | 3 | 2 | 6 | HU-13 |
| 5 | H9-1 | "Failed to fetch" cuando el backend no responde | 3 | 2 | 6 | HU-11 |
| 6 | H2-1 | "Tareas con más errores" sin agrupar | 2 | 3 | 6 | HU-02 |
| 7 | H4-1 | Mensajes del servidor en inglés | 2 | 2 | 4 | HU-11 |
| 8 | H6-1 | Últimas pruebas sin fecha | 2 | 2 | 4 | HU-02 |

H1-2 (datos en memoria) ya quedó resuelto en el Sprint 2 al conectar SQLite.

## Qué se hizo con estos hallazgos

- Los hallazgos de mayor prioridad se convirtieron en historias nuevas (HU-11 a HU-14) en el [Product Backlog](./product-backlog.md).
- Los [wireframes de alta fidelidad](./wireframes/alta-fidelidad.md) del Dashboard y del Formulario ya incorporan las correcciones de H1-1, H2-1, H2-2, H3-1, H5-1, H5-2, H6-1, H8-1 y H10-1.
- Las pantallas nuevas del módulo SCRUM (Backlog, Tablero, Retrospectiva) se hicieron evitando estos mismos problemas: etiquetas asociadas a sus campos, textos con tildes, mensajes de validación en español, confirmación antes de eliminar y botón *Cancelar* en el formulario de edición.
