import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import client from '../api/client.js';

export default function CardDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [card, setCard] = useState(null);
  const [label, setLabel] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await client.get(`/cards/${id}`);
        if (!cancelled) {
          setCard(data.card);
          setLabel(data.card.label || '');
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
    try {
      const { data } = await client.put(`/cards/${id}`, { label });
      setCard(data.card);
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Update failed');
    }
  }

  async function remove() {
    if (!window.confirm('Remove this card?')) return;
    try {
      await client.delete(`/cards/${id}`);
      nav('/cards');
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Delete failed');
    }
  }

  if (!card && !err) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (err && !card) {
    return (
      <div className="page">
        <div className="alert alert-error">{err}</div>
        <Link to="/cards">Back</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <Link className="link back-link" to="/cards">
            ← Cards
          </Link>
          <h1>Card #{card.id}</h1>
          <p className="muted">
            {card.brand} · <code>{card.pan_plain}</code>
          </p>
        </div>
        <button type="button" className="btn btn-danger" onClick={remove}>
          Delete
        </button>
      </header>
      {err && <div className="alert alert-error">{err}</div>}
      <div className="panel stack">
        <div>
          <div className="muted">CVV (lab display)</div>
          <code>{card.cvv_plain}</code>
        </div>
        <form className="stack form-max" onSubmit={save}>
          <label className="label">
            Label
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <button className="btn btn-primary" type="submit">
            Save label
          </button>
        </form>
      </div>
    </div>
  );
}
