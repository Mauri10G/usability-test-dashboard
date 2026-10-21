import { useEffect } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Formulario from './pages/Formulario';
import PruebaDetalle from './pages/PruebaDetalle';
import AnalisisIA from './pages/AnalisisIA';
import EvaluacionCaptura from './pages/EvaluacionCaptura';
import Backlog from './pages/Backlog';
import Tablero from './pages/Tablero';
import Retrospectiva from './pages/Retrospectiva';

const claseEnlace = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'active' : '';

const TITULOS: Record<string, string> = {
  '/': 'Dashboard de resultados',
  '/registrar': 'Registrar prueba',
  '/analisis-ia': 'Análisis con IA',
  '/evaluacion-captura': 'Evaluación heurística de una captura',
  '/backlog': 'Product Backlog',
  '/tablero': 'Tablero del sprint',
  '/retrospectiva': 'Retrospectiva',
};

export default function App() {
  const { pathname } = useLocation();

  // Cada pantalla tiene su propio título de pestaña, así el usuario y el
  // lector de pantalla saben dónde están (HU-10).
  useEffect(() => {
    const titulo = TITULOS[pathname] ?? 'Detalle de la prueba';
    document.title = `${titulo} · Usability Test Dashboard`;
  }, [pathname]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <header className="navbar">
        <h1>Usability Test Dashboard</h1>
        <nav aria-label="Principal">
          <NavLink to="/" end className={claseEnlace}>
            Dashboard
          </NavLink>
          <NavLink to="/registrar" className={claseEnlace}>
            Registrar prueba
          </NavLink>
          <NavLink to="/analisis-ia" className={claseEnlace}>
            Análisis IA
          </NavLink>
          <NavLink to="/evaluacion-captura" className={claseEnlace}>
            Evaluar captura
          </NavLink>
          <span className="nav-separator" aria-hidden="true" />
          <NavLink to="/backlog" className={claseEnlace}>
            Backlog
          </NavLink>
          <NavLink to="/tablero" className={claseEnlace}>
            Tablero
          </NavLink>
          <NavLink to="/retrospectiva" className={claseEnlace}>
            Retrospectiva
          </NavLink>
        </nav>
      </header>
      <main id="contenido" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/registrar" element={<Formulario />} />
          <Route path="/pruebas/:id" element={<PruebaDetalle />} />
          <Route path="/analisis-ia" element={<AnalisisIA />} />
          <Route path="/evaluacion-captura" element={<EvaluacionCaptura />} />
          <Route path="/backlog" element={<Backlog />} />
          <Route path="/tablero" element={<Tablero />} />
          <Route path="/retrospectiva" element={<Retrospectiva />} />
        </Routes>
      </main>
    </div>
  );
}
