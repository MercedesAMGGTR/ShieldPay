import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client.js';

function formatMoney(cents) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function Transactions() {
  const [rows, setRows] = useState([]);
  const [warn, setWarn] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/transactions');
        setRows(data.transactions || []);
        if (data._sensitiveNote) setWarn(data._sensitiveNote);
      } catch (e) {
        setErr(e.response?.data?.error || 'Failed to load');
      }
    })();
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Transactions</h1>
        {warn && <p className="muted">{warn}</p>}
      </header>
      {err && <div className="alert alert-error">{err}</div>}
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Time</th>
              <th>Customer</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link to={`/transactions/${t.id}`}>{t.id}</Link>
                </td>
                <td className="muted">{t.created_at}</td>
                <td>{t.customer_name || '—'}</td>
                <td>{t.description}</td>
                <td>{formatMoney(t.amount_cents)}</td>
                <td>
                  <span className={`pill pill-${t.status}`}>{t.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted">No transactions.</p>}
      </div>
    </div>
  );
}
