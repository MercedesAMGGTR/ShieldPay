import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client.js';

function formatMoney(cents) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [tx, setTx] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, t] = await Promise.all([
          client.get('/stats/dashboard'),
          client.get('/transactions'),
        ]);
        if (!cancelled) {
          setStats(s.data);
          setTx((t.data.transactions || []).slice(0, 8));
        }
      } catch (e) {
        if (!cancelled) setErr(e.response?.data?.error || 'Failed to load dashboard');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxVol =
    stats?.last7_days?.length > 0
      ? Math.max(...stats.last7_days.map((d) => d.volume_cents || 0), 1)
      : 1;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p className="muted">Overview of volume and recent activity</p>
      </header>

      {err && <div className="alert alert-error">{err}</div>}

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Captured volume</div>
            <div className="stat-value accent">{formatMoney(stats.volume_cents)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Transactions</div>
            <div className="stat-value">{stats.transaction_count}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Customers</div>
            <div className="stat-value">{stats.customer_count}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Refunded</div>
            <div className="stat-value">{formatMoney(stats.refunded_cents)}</div>
          </div>
        </div>
      )}

      <section className="panel">
        <h2>Last 7 days</h2>
        <div className="bar-chart">
          {(stats?.last7_days || []).map((row) => (
            <div key={row.day} className="bar-wrap" title={`${row.day}: ${formatMoney(row.volume_cents)}`}>
              <div
                className="bar"
                style={{ height: `${Math.max(8, (row.volume_cents / maxVol) * 100)}%` }}
              />
              <span className="bar-label">{row.day?.slice(5)}</span>
            </div>
          ))}
          {(!stats?.last7_days || stats.last7_days.length === 0) && (
            <p className="muted">No data for the last week yet.</p>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Recent transactions</h2>
          <Link className="link" to="/transactions">
            View all
          </Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>When</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tx.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link to={`/transactions/${t.id}`}>{t.id}</Link>
                </td>
                <td className="muted">{t.created_at}</td>
                <td>{t.description}</td>
                <td>{formatMoney(t.amount_cents)}</td>
                <td>
                  <span className={`pill pill-${t.status}`}>{t.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tx.length === 0 && <p className="muted">No transactions yet.</p>}
      </section>
    </div>
  );
}
