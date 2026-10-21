# Deuda técnica — revisión al inicio del Sprint 3

**Fecha de revisión:** 20 oct 2026 · **Rama:** `develop` (después de `fcbf391`)
**Alcance:** lo que quedó pendiente de los Sprints 1 y 2 en el diagnóstico heurístico y en el código
de los módulos 1 (Evaluaciones), 2 (Dashboard) y 5 (SCRUM).

## 1. Capturas de evidencia del diagnóstico heurístico (pendiente)

El [diagnóstico](./diagnostico-heuristico.md) pide agregar una captura por hallazgo en la columna
*Evidencia* antes de pasarlo a la matriz del Excel. **Ninguno de los 23 hallazgos tiene captura
todavía**: la columna solo cita el archivo o la función del código.

Las capturas del **antes** tienen que salir de la versión que se evaluó (commit `dee5f22`), porque el
Sprint 3 ya corrigió la mayoría de los problemas en las pantallas actuales. Para levantar esa versión
sin tocar `develop`:

```
git worktree add ../utd-antes dee5f22
cd ../utd-antes/backend && npm install && npm run start:dev
cd ../utd-antes/frontend && npm install && npm run dev
```

(El backend de `dee5f22` guarda en memoria, así que no toca `backend/data/usability.sqlite`. Detén el
backend de `develop` antes, porque los dos usan el puerto 3000.)

| Hallazgo | Qué capturar en `dee5f22` | Responsable sugerido |
|---|---|---|
| H1-1 | Formulario con *Nombre* vacío, scroll abajo, clic en *Registrar*: no pasa nada visible | Juan Carvajal |
| H1-2 | Ya resuelto en Sprint 2; basta una nota, no hace falta captura | – |
| H1-3 | Dashboard sin hora de actualización ni botón *Actualizar* | Juan Carvajal |
| H2-1 | *Tareas con más errores* con filas repetidas y tareas con 0 errores | Juan Carvajal |
| H2-2 | Textos sin tildes (*Metricas*, *Ultimas*, *Numero*) | Juan Carvajal |
| H2-3 | Subtítulos con *HU-01 ·* y *HU-02 ·* | Juan Carvajal |
| H3-1 | Tabla de últimas pruebas sin forma de abrir, editar o eliminar | Juan Carvajal |
| H3-2 | Botón *Quitar* sin confirmación; formulario sin *Limpiar* | Juan Carvajal |
| H4-1 | Mensaje `tareas.0.errores must be an integer number` (enviar `errores: 1.5`) | Juan Carvajal |
| H4-2 | *Reintentar* con el estilo punteado de *+ Agregar* (backend apagado) | Juan Carvajal |
| H4-3 | Clic en la etiqueta *Descripcion de la tarea* no enfoca el campo | Juan Carvajal |
| H5-1 | Casilla *El usuario completó la tarea* marcada por defecto | Juan Carvajal |
| H5-2 | Campos numéricos que empiezan en `0` | Juan Carvajal |
| H5-3 | *Número de errores* acepta `-1` y `1.5` sin aviso | Juan Carvajal |
| H6-1 | Últimas pruebas sin columna de fecha | Juan Carvajal |
| H6-2 | Dos tareas sin numerar | Juan Carvajal |
| H7-1 | Dashboard sin filtros | Juan Carvajal |
| H7-2 | Mensaje de éxito sin enlace al dashboard | Juan Carvajal |
| H8-1 | Texto de error `#ef4444` (captura + medición en un verificador de contraste) | Juan Carvajal |
| H8-2 | Borde de campos `#d1d5db` y subtítulo `#6b7280` (captura + medición) | Juan Carvajal |
| H9-1 | *Failed to fetch* con el backend apagado | Juan Carvajal |
| H9-2 | Varios errores del servidor unidos con `\|` | Juan Carvajal |
| H10-1 | Select de severidad sin explicación | Juan Carvajal |

Sugerencia: guardarlas como `docs/evidencia/diagnostico/H1-1.png`, etc., y enlazarlas desde la columna
*Evidencia* del diagnóstico.

Las capturas del **después** (Sprint 3) ya están en [`evidencia/sprint-3/`](./evidencia/sprint-3/):
`dashboard.png`, `formulario-validacion.png`, `formulario-movil.png`, `analisis-ia-reglas.png`,
`analisis-ia-gemini.png`, `evaluacion-captura-gemini.png` (reporte de Gemini sobre una captura real del
Dashboard) y `evaluacion-captura-sin-clave.png`.

La pantalla nueva `/evaluacion-captura` puede ayudar con las capturas del **antes**: al subir cada
captura de `dee5f22` devuelve hallazgos con el mismo formato del diagnóstico y se pueden copiar como
tabla Markdown. Hay que revisarlos uno por uno; no reemplazan la evaluación del equipo.

## 2. Ajustes corregidos en el Sprint 3

| Dónde | Problema | Corrección |
|---|---|---|
| `README.md` | Tenía marcadores de conflicto de merge (`<<<<<<< HEAD`, `=======`, `>>>>>>>`) commiteados en `develop`. | Se resolvió el conflicto y se actualizó el contenido. |
| `evaluaciones` | No había forma de eliminar una prueba equivocada (H3-1). | `DELETE /evaluaciones/:id` y pantalla de detalle `/pruebas/:id`. El borrado elimina tareas y observaciones en una transacción; con `repo.remove` + `cascade` TypeORM las dejaba huérfanas. |
| `evaluaciones` DTO + `main.ts` | Mensajes de validación en inglés con rutas técnicas, p. ej. `tareas.0.errores must be an integer number` (H4-1). | Todos los mensajes en español y con tildes; los errores de listas anidadas se leen *Tarea 2: …* / *Observación 1: …*; un campo no permitido se informa en español. |
| `dashboard.service.ts` | *Tareas con más errores* no agrupaba la misma tarea e incluía tareas con 0 errores (H2-1). | Agrupa por descripción (sin distinguir mayúsculas, espacios ni tildes), suma errores, cuenta pruebas y excluye las de 0 errores. |
| `dashboard` | Sin filtros (H7-1, HU-14) ni hora de cálculo (H1-3). | `GET /dashboard/metrics?pantalla=&evaluador=&desde=&hasta=`, opciones de filtro y `generadoEn` en la respuesta. |
| `api.ts` | *Failed to fetch* con el backend apagado (H9-1); errores unidos con `\|` (H9-2). | Mensaje en español que dice qué hacer; los errores llegan como lista (`ErrorApi.mensajes`). |
| `styles.css` | Contrastes bajo WCAG AA (H8-1, H8-2). | Tokens del mockup: error `#b91c1c` (6.5:1), borde de campo `#868e9c` (3.3:1), texto secundario `#4b5563`; foco visible de 3 px en todos los controles. |
| Backlog, Retrospectiva | *Reintentar* con el estilo de *+ Agregar* (H4-2). | Botón secundario. |
| `index.html` | Sin favicon: cada carga generaba un 404 en la consola. | Favicon SVG en línea. |
| Mensajes del módulo SCRUM | Sin tildes (*numero*, *codigo*, *quien facilito*). | Corregidos. |

## 3. Corregido al conectar Gemini (20 oct 2026)

| Tema | Qué se hizo |
|---|---|
| Códigos de las historias sugeridas por la IA | HU-04, HU-05 y HU-11 a HU-14 se agregaron a `seed.ts` y se cargaron en la base con `npm run seed`. Las sugerencias ahora empiezan en HU-15. |
| `seed.ts` desactualizado | Incluye las 14 historias. HU-04 y HU-05 quedaron en el Sprint 3 *en progreso* (responsable Mauricio Guevara); HU-11, HU-13 y HU-14 en el Sprint 3 *en progreso* sin responsable; HU-12 en el Sprint 2 *hecho*. El equipo debe confirmar estados y responsables en la revisión del sprint. |
| Nombres de personas | Formato único "Nombre Apellido", como en el Excel. Se corrigieron 5 pruebas con evaluador *Guevara Mauricio* → *Mauricio Guevara* y la retrospectiva del Sprint 2 con facilitador *López Erick* → *Erick López*. |
| Prueba de ensayo en la base real | Se eliminó la prueba `test` (pantalla `test1`) con su tarea y su observación. |
| Cómo repetirlo en otra copia | Cada integrante tiene su propia `backend/data/usability.sqlite` (no se sube al repositorio). Con el backend detenido: `npm run seed` y `npm run db:corregir` (`src/database/correcciones.ts`). Los dos se pueden correr varias veces sin duplicar ni borrar de más. |

## 4. Pendiente para los siguientes sprints

| # | Tema | Detalle | Sugerencia |
|---|---|---|---|
| 1 | Editar una prueba (resto de HU-13) | El detalle permite ver y eliminar, pero no editar. | Reutilizar `Formulario.tsx` en modo edición + `PATCH /evaluaciones/:id`. |
| 2 | Hojas Sprint.1 y Sprint.2 del Excel | Las horas por integrante (`G7:G10`) usan rangos fijos de la plantilla (`=SUM(G13:G14)`, …) y no suman las tareas de cada persona. Sprint.2 deja *En progreso / Pendiente* tareas que el Sprint 3 terminó. | Cambiar a `=SUMIF($C$13:$C$22,F7,$G$13:$G$22)` (ya se hizo así en Sprint.3) y actualizar estados en la revisión del sprint. |
| 3 | Pruebas automáticas | El repositorio no tiene pruebas. El flujo del Sprint 3 se verificó con un script de Playwright + axe-core fuera del repo (41 verificaciones del flujo general, 18 del flujo con Gemini y 6 sin clave; 0 violaciones WCAG A/AA). | Agregar ese script como `npm run test:e2e` y pruebas unitarias de `ia.service.ts`. |
| 4 | Límites del clasificador | Reglas de palabras clave en español: no entiende negaciones ni sinónimos fuera de la lista, y en empate decide por el orden de las reglas. Las observaciones sin coincidencias quedan en *Otros* y nunca generan historias. | Ahora solo se usan como respaldo cuando Gemini no responde. Revisar *Otros* en cada sprint y ampliar `backend/src/ia/reglas.ts`. |
| 5 | Subtítulos de las pantallas SCRUM | Backlog, Tablero y Retrospectiva siguen mostrando *HU-06 ·*, *HU-07 ·*, *HU-08 ·* (H2-3). Se dejó así porque esas pantallas las usa el equipo, que sí conoce los códigos. | Decidir con el PO. |
| 6 | Migraciones | TypeORM usa `synchronize: true`. | Suficiente para el curso; en producción, migraciones. |
| 7 | Disponibilidad de Gemini | Durante las pruebas los modelos *flash* devolvían HTTP 503 por alta demanda o tardaban más de 40 s; los *lite* respondían en 4–7 s. `gemini-2.5-flash` ya no está disponible para claves nuevas y los modelos *pro* respondieron 429 (sin cuota en el plan gratuito). | Revisar `GEMINI_MODELOS` y `GEMINI_MODELOS_CAPTURA` antes de la demo con `GET /ia/estado` y una prueba rápida. |
| 8 | Hallazgos falsos en la evaluación de capturas | Sobre la captura real del Dashboard, Gemini reportó que las fechas de 2026 "están en el futuro" y que las barras de severidad no son proporcionales, y ninguna de las dos cosas es cierta. | La pantalla lo advierte. Usar el reporte como apoyo, no como evaluación final. |
| 9 | Hallazgo válido de Gemini sin corregir | El enlace *Ver ›* de *Últimas pruebas* es un área de clic pequeña (H7, severidad 2). | Hacer el enlace más grande o toda la fila enfocable. |
| 10 | Datos que salen hacia Google | El análisis envía el texto de las observaciones y la evaluación envía la imagen completa a la API de Gemini. | Avisarlo a los participantes de las pruebas y no subir capturas con datos personales. |
| 11 | Clave de API | La clave está solo en `backend/.env`, que el `.gitignore` excluye (`git check-ignore` lo confirma). Se compartió por chat al configurarla. | Rotarla en Google AI Studio al terminar el semestre o si el repositorio se hace público. |
| 12 | Prototipo corregido con IA sin cuota | Los modelos de imagen de Gemini (`gemini-3.1-flash-image`, `gemini-2.5-flash-image`) responden HTTP 429 con la clave actual del plan gratuito, así que `POST /ia/generar-prototipo` siempre cae al boceto automático. La rama de Gemini está programada pero no se pudo probar con una respuesta real. | Probar con una clave con facturación activa antes de prometer "Generado por IA" en la demo. |
| 13 | Calidad del boceto automático | El boceto redibuja la pantalla con la estructura que lee Gemini; con los modelos *lite* (cuando `gemini-3-flash-preview` está saturado) a veces lee mal un número (60.49 → 80.49) o una caja. Las correcciones se aplican con reglas sobre el texto de la recomendación: cubren 3D, color, leyendas, redondeo, densidad, menús, filtros, botones nuevos, enlaces, contraste, carga y formatos; si una recomendación no encaja en ninguna, el componente se redibuja limpio y la lista lo dice. Sin Gemini, la estructura sale de los bloques de la captura y el dibujo es genérico. | Revisar el boceto antes de usarlo y sumar reglas a `boceto/ajustes.ts` cuando aparezcan recomendaciones nuevas. |
| 14 | Evaluaciones de captura guardadas | Cada evaluación queda en la tabla `evaluaciones_captura` (solo el reporte, no la imagen) para poder descargar la matriz en Word. No hay pantalla para listarlas ni borrarlas. | Agregar un historial en `/evaluacion-captura` o un borrado automático de las antiguas. |
