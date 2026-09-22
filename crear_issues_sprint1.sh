#!/bin/bash
# Crea los Issues del Sprint 1 en GitHub usando gh CLI.
# Requisitos: repo ya creado y clonado, `gh auth login` ya hecho,
# y correr este script parado dentro de la carpeta del repo.

set -e

# --- Labels base (se crean si no existen; si ya existen, gh avisa y sigue) ---
gh label create "sprint-1" --color "0E8A16" --description "Tareas del Sprint 1" 2>/dev/null || true
gh label create "diagnostico" --color "D93F0B" 2>/dev/null || true
gh label create "backlog" --color "5319E7" 2>/dev/null || true
gh label create "ux" --color "FBCA04" 2>/dev/null || true
gh label create "backend" --color "1D76DB" 2>/dev/null || true

# --- Historia 1: HU-01 / Diagnóstico del sistema propio ---

gh issue create \
  --title "HU-01: Aplicar matriz de heurísticas de Nielsen al sistema propio" \
  --body "**Historia de usuario:** HU-01 — Registrar una prueba de usabilidad con tareas, tiempos y observaciones.

**Tarea:** Aplicar las 10 heurísticas de Nielsen sobre el Usability Test Dashboard propio (no LATAM), siguiendo el mismo método usado en el APE1.

**Entregable:** Matriz con estado de cumplimiento por heurística, evidencia (capturas) y severidad estimada.

**Tiempo estimado:** 3h
**Sprint:** 1 (22 sep – 1 oct 2026)" \
  --assignee "juanjose1234456787654" \
  --label "sprint-1,diagnostico"

gh issue create \
  --title "HU-01: Revisar accesibilidad (POUR) sobre las pantallas actuales" \
  --body "**Historia de usuario:** HU-01

**Tarea:** Revisar los 4 principios POUR (perceptible, operable, comprensible, robusto) sobre las pantallas actuales del sistema.

**Entregable:** Tabla de criterios POUR con estado y evidencia, igual formato que el APE1.

**Tiempo estimado:** 2h
**Sprint:** 1 (22 sep – 1 oct 2026)" \
  --assignee "juanjose1234456787654" \
  --label "sprint-1,diagnostico"

gh issue create \
  --title "HU-01: Consolidar hallazgos en matriz de severidad y prioridad" \
  --body "**Historia de usuario:** HU-01

**Tarea:** Consolidar los hallazgos de heurísticas + POUR en una matriz integrada con severidad, frecuencia y prioridad (Prioridad = Severidad x Frecuencia).

**Entregable:** Matriz integrada final, lista de mejoras priorizada.

**Tiempo estimado:** 2h
**Sprint:** 1 (22 sep – 1 oct 2026)" \
  --assignee "juanjose1234456787654" \
  --label "sprint-1,diagnostico"

gh issue create \
  --title "HU-06: Elaborar y priorizar el Product Backlog" \
  --body "**Historia de usuario:** HU-06 — Registrar historias de usuario en un Product Backlog para planificar por sprints.

**Tarea:** A partir de los hallazgos del diagnóstico, elaborar y priorizar el Product Backlog (Business Value, Story Points, Cociente de Decisión).

**Entregable:** Hoja Backlog del Excel de planificación, llena y priorizada.

**Tiempo estimado:** 2h
**Sprint:** 1 (22 sep – 1 oct 2026)
**Depende de:** los 3 issues de diagnóstico (arriba)" \
  --assignee "ErickAloy871" \
  --label "sprint-1,backlog"

gh issue create \
  --title "HU-06/HU-07: Configurar tablero SCRUM y registrar Sprint 1" \
  --body "**Historia de usuario:** HU-06 / HU-07

**Tarea:** Crear el GitHub Project (tablero Kanban) con columnas Pendiente / En progreso / En revisión / Terminado, y vincular todos los Issues del Sprint 1.

**Entregable:** Tablero funcionando con las tareas del Sprint 1 ya cargadas.

**Tiempo estimado:** 1h
**Sprint:** 1 (22 sep – 1 oct 2026)" \
  --assignee "ErickAloy871" \
  --label "sprint-1,backlog"

# --- Historia 2: HU-09 / HU-10 / Rediseño inicial (UX) ---

gh issue create \
  --title "HU-09/HU-10: Definir user flow de las pantallas a rediseñar" \
  --body "**Historia de usuario:** HU-09 / HU-10

**Tarea:** Definir el user flow del Dashboard de resultados y del Formulario de evaluación con validación.

**Entregable:** Diagrama de flujo de las pantallas a rediseñar.

**Tiempo estimado:** 2h
**Sprint:** 1 (22 sep – 1 oct 2026)" \
  --assignee "Junior-eng-software" \
  --label "sprint-1,ux"

gh issue create \
  --title "HU-10: Wireframes de baja fidelidad — Dashboard de resultados" \
  --body "**Historia de usuario:** HU-10 — Navegar por el dashboard sin confusión.

**Tarea:** Wireframe de baja fidelidad del Dashboard de resultados (métricas, hallazgos frecuentes, severidad).

**Entregable:** Wireframe en Figma o Penpot.

**Tiempo estimado:** 3h
**Sprint:** 1 (22 sep – 1 oct 2026)" \
  --assignee "Junior-eng-software" \
  --label "sprint-1,ux"

gh issue create \
  --title "HU-09: Wireframes de baja fidelidad — Formulario de evaluación" \
  --body "**Historia de usuario:** HU-09 — Formulario más claro y con validación.

**Tarea:** Wireframe de baja fidelidad del formulario de evaluación con validación en tiempo real.

**Entregable:** Wireframe en Figma o Penpot.

**Tiempo estimado:** 3h
**Sprint:** 1 (22 sep – 1 oct 2026)" \
  --assignee "Junior-eng-software" \
  --label "sprint-1,ux"

gh issue create \
  --title "Backend: Revisar arquitectura actual propuesta para el sistema" \
  --body "**Tarea:** Revisar y documentar la arquitectura propuesta para el backend (NestJS) del sistema, antes de programar.

**Entregable:** Diagrama/documento breve de arquitectura.

**Tiempo estimado:** 2h
**Sprint:** 1 (22 sep – 1 oct 2026)" \
  --assignee "Mauri10G" \
  --label "sprint-1,backend"

gh issue create \
  --title "Backend: Dejar lista la arquitectura técnica para los siguientes sprints" \
  --body "**Tarea:** Definir estructura de módulos NestJS y modelo de datos inicial (Prueba, Tarea, Observación, Hallazgo), sin programar aún — base para el Sprint 2.

**Entregable:** Documento de arquitectura técnica listo para implementar en el Sprint 2.

**Tiempo estimado:** 3h
**Sprint:** 1 (22 sep – 1 oct 2026)" \
  --assignee "Mauri10G" \
  --label "sprint-1,backend"

echo "Listo: 10 issues creados."
