# Backlog — Historias de usuario

**Proyecto:** Usability Test Dashboard 2.0 (Módulos 1, 2, 4 y 5 – sin IA)
**Product Owner / Scrum Master:** Erick López Yantalema
**Equipo:** Mauricio Guevara, Juan Carvajal, Eduardo Chicaiza, Erick López

Mismo formato que la hoja **Backlog** del Excel de planificación
(`1_PJT_NOM_PJT_USABILIDAD_MATRIZ_PLANIFICACION_V1_0.xlsx`):

- **Business Value (BV):** valor para el usuario, de 1 a 10.
- **Story Point (SP):** esfuerzo relativo, escala Fibonacci (1, 2, 3, 5, 8, 13).
- **Cociente de Decisión = BV / SP.** Se prioriza de mayor a menor cociente; si hay empate, primero el de mayor BV.
- **Orden** es el número original de la historia; **#** es su posición después de priorizar.

## 1. Backlog priorizado (del Excel)

| # | Orden | HU | Nombre del Requisito | Business Value | Story Point | Cociente de Decisión |
|---|---|---|---|---|---|---|
| 1 | 2 | HU-02 | Visualizar problemas más frecuentes en el dashboard para identificar oportunidades de mejora | 8 | 3 | 2.67 |
| 2 | 7 | HU-09 | Formulario más claro y con validación para evitar errores al registrar resultados | 8 | 3 | 2.67 |
| 3 | 6 | HU-08 | Registrar retrospectivas del equipo para mejorar el siguiente sprint | 5 | 2 | 2.50 |
| 4 | 4 | HU-06 | Registrar historias de usuario en un Product Backlog para planificar por sprints | 7 | 3 | 2.33 |
| 5 | 8 | HU-10 | Navegar por el dashboard sin confusión para aprender el sistema rápidamente | 7 | 3 | 2.33 |
| 6 | 1 | HU-01 | Registrar una prueba de usabilidad con tareas, tiempos y observaciones | 9 | 5 | 1.80 |
| 7 | 3 | HU-03 | Comparar el antes y el después del aplicativo para verificar la mejora | 8 | 5 | 1.60 |
| 8 | 5 | HU-07 | Visualizar tareas en un tablero para saber qué hacer y en qué estado están | 7 | 5 | 1.40 |
| | | | **Total** | **59** | **29** | |

HU-04 y HU-05 no aparecen en el Excel. Hay que confirmar con el PO si corresponden al módulo de IA, que quedó para el segundo parcial.

## 2. Historias propuestas a partir del diagnóstico heurístico

Salen de los hallazgos de mayor prioridad del [diagnóstico](./diagnostico-heuristico.md).
**Están pendientes de validación por el Product Owner** antes de copiarlas al Excel.

| # | Orden | HU | Nombre del Requisito | Business Value | Story Point | Cociente de Decisión | Hallazgos |
|---|---|---|---|---|---|---|---|
| – | 11 | HU-11 | Recibir mensajes de error claros y en español, y saber qué hacer cuando el sistema no responde | 6 | 2 | 3.00 | H1-1, H4-1, H9-1, H9-2 |
| – | 12 | HU-12 | Conservar las pruebas registradas aunque se reinicie el servidor | 8 | 3 | 2.67 | H1-2 |
| – | 13 | HU-13 | Ver, editar y eliminar una prueba registrada para corregir errores de digitación | 7 | 3 | 2.33 | H3-1, H6-1 |
| – | 14 | HU-14 | Filtrar el dashboard por pantalla evaluada, evaluador y fecha | 6 | 5 | 1.20 | H7-1 |

HU-12 ya quedó implementada en el Sprint 2 (base de datos SQLite).

## 3. Backlog completo si se aceptan las propuestas

| # | HU | BV | SP | Cociente | Sprint | Estado |
|---|---|---|---|---|---|---|
| 1 | HU-11 | 6 | 2 | 3.00 | – | Propuesta |
| 2 | HU-02 | 8 | 3 | 2.67 | 2 | En progreso |
| 3 | HU-09 | 8 | 3 | 2.67 | 1–2 | En progreso |
| 4 | HU-12 | 8 | 3 | 2.67 | 2 | Hecho (pendiente de revisión) |
| 5 | HU-08 | 5 | 2 | 2.50 | 2 | Hecho (pendiente de revisión) |
| 6 | HU-06 | 7 | 3 | 2.33 | 1–2 | Hecho (pendiente de revisión) |
| 7 | HU-10 | 7 | 3 | 2.33 | 1–2 | En progreso |
| 8 | HU-13 | 7 | 3 | 2.33 | – | Propuesta |
| 9 | HU-01 | 9 | 5 | 1.80 | 1–2 | En progreso |
| 10 | HU-03 | 8 | 5 | 1.60 | – | Por hacer (módulo 4) |
| 11 | HU-07 | 7 | 5 | 1.40 | 1–2 | Hecho (pendiente de revisión) |
| 12 | HU-14 | 6 | 5 | 1.20 | – | Propuesta |

El sprint sale de las hojas *Sprint.1* y *Sprint.2* del Excel. El estado lo debe confirmar el equipo en la revisión del sprint.

## 4. Cartillas de las historias

Formato: *Como … quiero … para …* y criterios de aceptación verificables.

### HU-01 · Registrar una prueba de usabilidad
Como **evaluador**, quiero **registrar una prueba con sus tareas, tiempos, éxito o fracaso, errores y observaciones**, para **tener la evidencia de la sesión en un solo lugar**.
- Se exige nombre, pantalla evaluada, evaluador y al menos una tarea.
- Cada tarea tiene tiempo > 0 s y errores enteros ≥ 0.
- La prueba queda guardada y aparece en el dashboard sin reiniciar nada.

### HU-02 · Problemas más frecuentes en el dashboard
Como **evaluador**, quiero **ver las métricas y los problemas más frecuentes de todas las pruebas**, para **identificar qué mejorar primero**.
- Muestra total de pruebas, tasa de éxito, tiempo promedio y observaciones por severidad.
- Las tareas con más errores se agrupan por descripción y excluyen las que tienen 0 errores.
- Las últimas pruebas muestran su fecha.

### HU-03 · Comparar antes y después
Como **equipo de diseño**, quiero **comparar las métricas de una pantalla antes y después del rediseño**, para **demostrar si la mejora funcionó**.
- Se eligen dos grupos de pruebas de la misma pantalla y se ven sus métricas lado a lado.
- Se indica la diferencia en tasa de éxito, tiempo y errores.

### HU-06 · Product Backlog
Como **Product Owner**, quiero **registrar historias con Business Value y Story Points**, para **priorizarlas por Cociente de Decisión y planificar los sprints**.
- Crear, editar y eliminar historias (con confirmación antes de eliminar).
- La lista se ordena sola por cociente.
- Una historia puede asignarse a un sprint o quedar sin asignar.

### HU-07 · Tablero del sprint
Como **miembro del equipo**, quiero **ver las historias en columnas Por hacer, En progreso y Hecho**, para **saber qué falta y quién lo tiene**.
- Las tarjetas se mueven arrastrándolas o con botones (funciona también con teclado).
- Se puede filtrar por sprint.
- Se ve el avance en story points terminados.

### HU-08 · Retrospectivas
Como **Scrum Master**, quiero **registrar qué salió bien, qué mejorar y las acciones de cada sprint**, para **dar seguimiento a los compromisos del equipo**.
- La retrospectiva tiene sprint, facilitador y al menos un punto.
- Se listan las retrospectivas anteriores, la más reciente primero.

### HU-09 · Formulario claro y con validación
Como **evaluador**, quiero **que el formulario me avise de los errores en el momento y en el campo exacto**, para **no registrar datos incorrectos**.
- Si algo falla, aparece un resumen arriba y el foco va al primer campo con error.
- La casilla de éxito no viene marcada por defecto.
- Los textos de error cumplen contraste 4.5:1.

### HU-10 · Navegación sin confusión
Como **usuario nuevo**, quiero **entender dónde estoy y qué puedo hacer en cada pantalla**, para **aprender el sistema rápido**.
- La navegación marca la pantalla actual.
- Cada pantalla tiene un título y una explicación corta, sin códigos internos.
- Los mensajes cuando el servidor no responde dicen qué hacer.
