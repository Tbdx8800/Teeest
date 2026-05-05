import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">🛒 POS Tech Store</div>
      <ul className="nav-links">
        <li><Link to="/pos">Ventas</Link></li>
        <li><Link to="/inventory">Inventario</Link></li>
        <li><Link to="/customers">Clientes</Link></li>
        {user.role === 'admin' && <li><Link to="/reports">Reportes</Link></li>}
        {user.role === 'admin' && <li><Link to="/users">Usuarios</Link></li>}
      </ul>
      <div className="nav-user">
        <span>{user.username} ({user.role})</span>
        <button onClick={handleLogout}>Salir</button>
      </div>
    </nav>
  );
}

export default Navbar;