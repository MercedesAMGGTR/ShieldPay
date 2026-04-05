import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import client from '../api/client.js';

function formatMoney(cents) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function TransactionDetail() {
  const { id } = useParams();
  const [t, setT] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await client.get(`/transactions/${id}`);
        if (!cancelled) setT(data.transaction);
      } catch (e) {
        if (!cancelled) setErr(e.response?.data?.error || 'Not found');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!t && !err) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (err && !t) {
    return (
      <div className="page">
        <div className="alert alert-error">{err}</div>
        <Link to="/transactions">Back</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <Link className="link back-link" to="/transactions">
          ← Transactions
        </Link>
        <h1>Transaction #{t.id}</h1>
        <p className="muted">{t.created_at}</p>
      </header>
      <div className="panel stack">
        <div className="kv">
          <span className="muted">Status</span>
          <span className={`pill pill-${t.status}`}>{t.status}</span>
        </div>
        <div className="kv">
          <span className="muted">Amount</span>
          <strong>{formatMoney(t.amount_cents)}</strong>
        </div>
        <div className="kv">
          <span className="muted">Customer</span>
          <span>{t.customer_name || '—'}</span>
        </div>
        <div className="kv">
          <span className="muted">Description</span>
          <span>{t.description}</span>
        </div>
        <div className="kv">
          <span className="muted">Card last4</span>
          <span>{t.card_last4 || '—'}</span>
        </div>
        <div className="kv">
          <span className="muted">PAN (lab)</span>
          <code>{t.card_pan_full || '—'}</code>
        </div>
        <div className="kv">
          <span className="muted">CVV (lab)</span>
          <code>{t.card_cvv || '—'}</code>
        </div>
      </div>
    </div>
  );
}
