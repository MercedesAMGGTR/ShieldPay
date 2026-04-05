import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client.js';

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [warn, setWarn] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/cards');
        setCards(data.cards || []);
        if (data._sensitiveNote) setWarn(data._sensitiveNote);
      } catch (e) {
        setErr(e.response?.data?.error || 'Failed to load cards');
      }
    })();
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Saved cards</h1>
        <p className="muted">Test data only — PAN/CVV encrypted at rest (AES-256-GCM), decrypted for this view</p>
      </header>
      {warn && <div className="alert alert-warn">{warn}</div>}
      {err && <div className="alert alert-error">{err}</div>}
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Brand</th>
              <th>PAN</th>
              <th>CVV</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((k) => (
              <tr key={k.id}>
                <td>
                  <Link to={`/cards/${k.id}`}>{k.customer_name}</Link>
                </td>
                <td>{k.brand}</td>
                <td>
                  <code>{k.pan_plain}</code>
                </td>
                <td>
                  <code>{k.cvv_plain}</code>
                </td>
                <td>
                  {k.expiry_month}/{k.expiry_year}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cards.length === 0 && <p className="muted">No cards on file.</p>}
      </div>
    </div>
  );
}
