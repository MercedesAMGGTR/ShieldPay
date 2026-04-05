import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('merchant@demo.com');
  const [password, setPassword] = useState('Demo1234!');
  const [err, setErr] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    try {
      await login(email, password);
      nav(loc.state?.from?.pathname || '/', { replace: true });
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>ShieldPay</h1>
        <p className="muted">Multi-merchant payment dashboard (fake money, test cards only)</p>
        <form className="stack" onSubmit={onSubmit}>
          <label className="label">
            Email
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="label">
            Password
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {err && <div className="alert alert-error">{err}</div>}
          <button className="btn btn-primary btn-block" type="submit">
            Sign in
          </button>
        </form>
        <p className="muted small">
          Demo: <code>merchant@demo.com</code> / <code>Demo1234!</code>
        </p>
        <Link className="link" to="/register">
          Create merchant account
        </Link>
      </div>
    </div>
  );
}
