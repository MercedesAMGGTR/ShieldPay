import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    business_name: '',
  });
  const [err, setErr] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    try {
      await register(form);
      nav('/', { replace: true });
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Registration failed');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Register</h1>
        <form className="stack" onSubmit={onSubmit}>
          <label className="label">
            Business name
            <input
              className="input"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
            />
          </label>
          <label className="label">
            Your name
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="label">
            Email
            <input
              className="input"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="label">
            Password
            <input
              className="input"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          {err && <div className="alert alert-error">{err}</div>}
          <button className="btn btn-primary btn-block" type="submit">
            Create account
          </button>
        </form>
        <Link className="link" to="/login">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
