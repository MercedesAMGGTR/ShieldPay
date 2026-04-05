import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import client from '../api/client.js';

export default function CustomerDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [edit, setEdit] = useState({ name: '', email: '', phone: '', notes: '' });
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await client.get(`/customers/${id}`);
        if (!cancelled) {
          setCustomer(data.customer);
          setEdit({
            name: data.customer.name,
            email: data.customer.email || '',
            phone: data.customer.phone || '',
            notes: data.customer.notes || '',
          });
        }
      } catch (e) {
        if (!cancelled) setErr(e.response?.data?.error || 'Not found');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function save(e) {
    e.preventDefault();
    setErr('');
    try {
      const { data } = await client.put(`/customers/${id}`, edit);
      setCustomer(data.customer);
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Update failed');
    }
  }

  async function remove() {
    if (!window.confirm('Delete this customer and their cards?')) return;
    try {
      await client.delete(`/customers/${id}`);
      nav('/customers');
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Delete failed');
    }
  }

  if (!customer && !err) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (err && !customer) {
    return (
      <div className="page">
        <div className="alert alert-error">{err}</div>
        <Link className="link" to="/customers">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <Link className="link back-link" to="/customers">
            ← Customers
          </Link>
          <h1>{customer.name}</h1>
          <p className="muted">Customer #{customer.id}</p>
        </div>
        <button type="button" className="btn btn-danger" onClick={remove}>
          Delete
        </button>
      </header>
      {err && <div className="alert alert-error">{err}</div>}
      <div className="panel">
        <h2>Edit</h2>
        <form className="stack form-max" onSubmit={save}>
          <label className="label">
            Name
            <input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          </label>
          <label className="label">
            Email
            <input
              className="input"
              value={edit.email}
              onChange={(e) => setEdit({ ...edit, email: e.target.value })}
            />
          </label>
          <label className="label">
            Phone
            <input
              className="input"
              value={edit.phone}
              onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
            />
          </label>
          <label className="label">
            Notes
            <textarea
              className="input"
              rows={3}
              value={edit.notes}
              onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
