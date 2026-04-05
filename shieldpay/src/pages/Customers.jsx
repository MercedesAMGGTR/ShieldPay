import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client.js';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    try {
      const { data } = await client.get('/customers', { params: { search: search || undefined } });
      setCustomers(data.customers || []);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load customers');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Customers</h1>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <input
            className="input"
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-secondary" type="submit">
            Search
          </button>
        </form>
      </header>
      {err && <div className="alert alert-error">{err}</div>}
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/customers/${c.id}`}>{c.name}</Link>
                </td>
                <td>{c.email || '—'}</td>
                <td>{c.phone || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && <p className="muted">No customers match.</p>}
      </div>
    </div>
  );
}
