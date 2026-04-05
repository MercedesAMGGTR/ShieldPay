import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">●</span>
          <span>ShieldPay</span>
        </div>
        <nav className="nav">
          <NavLink end className="nav-link" to="/">
            Dashboard
          </NavLink>
          <NavLink className="nav-link" to="/customers">
            Customers
          </NavLink>
          <NavLink className="nav-link" to="/cards">
            Cards
          </NavLink>
          <NavLink className="nav-link" to="/transactions">
            Transactions
          </NavLink>
          <NavLink className="nav-link" to="/payments/new">
            New payment
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink className="nav-link nav-admin" to="/admin">
              Admin
            </NavLink>
          )}
          <NavLink className="nav-link" to="/settings">
            Settings
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-name">{user?.name}</div>
            <div className="user-meta">{user?.email}</div>
          </div>
          <button type="button" className="btn btn-ghost btn-block" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
