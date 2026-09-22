import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Formulario from './pages/Formulario';

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
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/registrar" element={<Formulario />} />
      </Routes>
    </div>
  );
}
