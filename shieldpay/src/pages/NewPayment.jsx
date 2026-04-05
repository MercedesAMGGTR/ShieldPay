import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client.js';

export default function NewPayment() {
  const nav = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    customer_id: '',
    amount_dollars: '12.99',
    description: 'Order',
    pan: '',
    cvv: '',
    mode: 'saved',
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/customers');
        setCustomers(data.customers || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const body = {
        amount_dollars: Number(form.amount_dollars),
        description: form.description,
      };
      if (form.mode === 'saved') {
        body.customer_id = Number(form.customer_id);
      } else {
        body.pan = form.pan.replace(/\s/g, '');
        body.cvv = form.cvv;
      }
      const { data } = await client.post('/payments/process', body);
      setMsg(`Created transaction #${data.transaction.id} (${data.transaction.status})`);
      if (data.transaction?.id) {
        setTimeout(() => nav(`/transactions/${data.transaction.id}`), 800);
      }
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Payment failed');
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>New payment</h1>
        <p className="muted">Fake processor — use test PANs only (e.g. 4242424242424242)</p>
      </header>
      <div className="panel form-max">
        <form className="stack" onSubmit={submit}>
          <div className="toggle-row">
            <label className="radio-pill">
              <input
                type="radio"
                name="mode"
                checked={form.mode === 'saved'}
                onChange={() => setForm({ ...form, mode: 'saved' })}
              />
              Saved card
            </label>
            <label className="radio-pill">
              <input
                type="radio"
                name="mode"
                checked={form.mode === 'oneoff'}
                onChange={() => setForm({ ...form, mode: 'oneoff' })}
              />
              One-off test PAN
            </label>
          </div>
          {form.mode === 'saved' ? (
            <label className="label">
              Customer
              <select
                className="input"
                required
                value={form.customer_id}
                onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
              >
                <option value="">Select…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label className="label">
                Test PAN
                <input
                  className="input"
                  value={form.pan}
                  onChange={(e) => setForm({ ...form, pan: e.target.value })}
                  placeholder="4242424242424242"
                />
              </label>
              <label className="label">
                CVV
                <input
                  className="input"
                  value={form.cvv}
                  onChange={(e) => setForm({ ...form, cvv: e.target.value })}
                />
              </label>
            </>
          )}
          <label className="label">
            Amount (USD)
            <input
              className="input"
              type="number"
              step="0.01"
              required
              value={form.amount_dollars}
              onChange={(e) => setForm({ ...form, amount_dollars: e.target.value })}
            />
          </label>
          <label className="label">
            Description
            <input
              className="input"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          {err && <div className="alert alert-error">{err}</div>}
          {msg && <div className="alert alert-success">{msg}</div>}
          <button className="btn btn-primary" type="submit">
            Process (demo)
          </button>
        </form>
        <p className="muted small">
          <Link to="/transactions">View transactions</Link>
        </p>
      </div>
    </div>
  );
}
