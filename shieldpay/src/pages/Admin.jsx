import React, { useEffect, useState } from 'react';
import client from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Admin() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [err, setErr] = useState('');

  async function load() {
    try {
      const { data } = await client.get('/admin/overview');
      setOverview(data);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load admin data');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function deleteMerchant(id) {
    if (!window.confirm('Delete merchant and related data?')) return;
    try {
      await client.delete(`/admin/users/${id}`);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Delete failed');
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="page">
        <div className="alert alert-error">Admin area is for admin accounts only.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Admin</h1>
        <p className="muted">Platform overview (lab: JWT-only gate on API — see ARKO-LAB-03)</p>
      </header>
      {err && <div className="alert alert-error">{err}</div>}
      {overview && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Users</div>
            <div className="stat-value">{overview.users?.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">All tx count</div>
            <div className="stat-value">{overview.transactions_total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">All volume (cents)</div>
            <div className="stat-value accent">{overview.volume_cents_all}</div>
          </div>
        </div>
      )}
      <section className="panel">
        <h2>Users</h2>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Role</th>
              <th>Name</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(overview?.users || []).map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.name}</td>
                <td>
                  {u.role === 'merchant' && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteMerchant(u.id)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
