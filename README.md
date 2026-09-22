# Usability Test Dashboard 2.0 — Codigo base Sprint 1 / Sprint 2

Modulos incluidos en este codigo: **1. Evaluaciones de usabilidad** y
**2. Dashboard de resultados**. El modulo de IA queda pendiente para el
segundo parcial, como se acordo con el docente.

## Que trae

- `backend/` — API en NestJS con dos modulos:
  - `evaluaciones`: registra una prueba de usabilidad completa, con sus
    tareas, tiempos, exito o fracaso, errores y observaciones. HU-01.
  - `dashboard`: calcula metricas a partir de las pruebas registradas:
    tasa de exito, observaciones por severidad, tareas con mas errores,
    tiempo promedio. HU-02.
  - Los datos se guardan en memoria por ahora. En un sprint siguiente se
    conecta una base de datos real, la estructura ya esta lista para eso.
- `frontend/` — App en React con dos pantallas:
  - `/` Dashboard de resultados, consume `GET /dashboard/metrics`.
  - `/registrar` Formulario de evaluacion con validacion en el cliente,
    consume `POST /evaluaciones`. HU-09.

## Como correrlo en tu computador

### 1. Backend

```
cd backend
npm install
npm run start:dev
```

Queda escuchando en `http://localhost:3000`.

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

