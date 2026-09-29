import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Formulario from './pages/Formulario';
import Backlog from './pages/Backlog';
import Tablero from './pages/Tablero';
import Retrospectiva from './pages/Retrospectiva';

export default function App() {
  return (
    <div className="app-shell">
      <header className="navbar">
        <h1>Usability Test Dashboard</h1>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Dashboard
          </NavLink>
          <NavLink
            to="/registrar"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Registrar prueba
          </NavLink>
          <span className="nav-separator" aria-hidden="true" />
          <NavLink
            to="/backlog"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Backlog
          </NavLink>
          <NavLink
            to="/tablero"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Tablero
          </NavLink>
          <NavLink
            to="/retrospectiva"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            Retrospectiva
          </NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/registrar" element={<Formulario />} />
        <Route path="/backlog" element={<Backlog />} />
        <Route path="/tablero" element={<Tablero />} />
        <Route path="/retrospectiva" element={<Retrospectiva />} />
      </Routes>
    </div>
  );
}
