import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [keys, setKeys] = useState([]);
  const [hooks, setHooks] = useState([]);
  const [name, setName] = useState('');
  const [business, setBusiness] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [newHookUrl, setNewHookUrl] = useState('');
  const [flash, setFlash] = useState('');
  const [err, setErr] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetPassword2, setResetPassword2] = useState('');

  async function refresh() {
    setErr('');
    try {
      const [p, k, w] = await Promise.all([
        client.get('/settings/profile'),
        client.get('/settings/api-keys'),
        client.get('/settings/webhooks'),
      ]);
      setProfile(p.data.profile);
      setName(p.data.profile.name);
      setBusiness(p.data.profile.business_name || '');
      setKeys(k.data.keys || []);
      setHooks(w.data.webhooks || []);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to load settings');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setFlash('');
    try {
      const { data } = await client.put('/settings/profile', { name, business_name: business });
      setProfile(data.profile);
      setFlash('Profile saved');
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed');
    }
  }

  async function createKey(e) {
    e.preventDefault();
    setFlash('');
    try {
      const { data } = await client.post('/settings/api-keys', { name: newKeyName });
      setFlash(`New key (copy now): ${data.key}`);
      setNewKeyName('');
      refresh();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed');
    }
  }

  async function delKey(id) {
    await client.delete(`/settings/api-keys/${id}`);
    refresh();
  }

  async function createHook(e) {
    e.preventDefault();
    try {
      const { data } = await client.post('/settings/webhooks', { url: newHookUrl });
      setFlash(`Webhook created, secret: ${data.secret}`);
      setNewHookUrl('');
      refresh();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed');
    }
  }

  async function exportCsv() {
    try {
      const res = await client.get('/settings/export/transactions.csv', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shieldpay-transactions.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.response?.data?.error || 'Export failed');
    }
  }

  async function requestPasswordReset() {
    setFlash('');
    setErr('');
    try {
      const { data } = await client.post('/auth/password-reset', { email: profile.email });
      setFlash(data.message || 'Request submitted.');
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed');
    }
  }

  async function confirmPasswordReset(e) {
    e.preventDefault();
    setFlash('');
    setErr('');
    if (resetPassword !== resetPassword2) {
      setErr('Passwords do not match');
      return;
    }
    try {
      const { data } = await client.post('/auth/password-reset/confirm', {
        token: resetToken.trim(),
        newPassword: resetPassword,
      });
      setFlash(data.message || 'Password updated.');
      setResetToken('');
      setResetPassword('');
      setResetPassword2('');
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed');
    }
  }

  if (!profile) {
    return (
      <div className="page">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Settings</h1>
        <p className="muted">Profile, API keys, export, webhooks</p>
      </header>
      {err && <div className="alert alert-error">{err}</div>}
      {flash && <div className="alert alert-success pre-wrap">{flash}</div>}

      <section className="panel stack">
        <h2>Profile</h2>
        <form className="stack form-max" onSubmit={saveProfile}>
          <label className="label">
            Name
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="label">
            Business name
            <input className="input" value={business} onChange={(e) => setBusiness(e.target.value)} />
          </label>
          <button className="btn btn-primary" type="submit">
            Save profile
          </button>
        </form>
      </section>

      <section className="panel stack">
        <h2>API keys</h2>
        <ul className="list-plain">
          {keys.map((k) => (
            <li key={k.id} className="kv-row">
              <span>
                <strong>{k.name}</strong> <span className="muted">{k.key_prefix}…</span>
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => delKey(k.id)}>
                Revoke
              </button>
            </li>
          ))}
        </ul>
        <form className="inline-form" onSubmit={createKey}>
          <input
            className="input"
            placeholder="Key label"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
          />
          <button className="btn btn-secondary" type="submit">
            Create key
          </button>
        </form>
      </section>

      <section className="panel stack">
        <h2>Webhooks</h2>
        <ul className="list-plain">
          {hooks.map((h) => (
            <li key={h.id} className="stack tight">
              <code>{h.url}</code>
              <span className="muted">
                secret: {h.secret} · active: {h.active ? 'yes' : 'no'}
              </span>
            </li>
          ))}
        </ul>
        <form className="inline-form" onSubmit={createHook}>
          <input
            className="input"
            placeholder="https://example.com/hook"
            value={newHookUrl}
            onChange={(e) => setNewHookUrl(e.target.value)}
          />
          <button className="btn btn-secondary" type="submit">
            Add webhook
          </button>
        </form>
      </section>

      <section className="panel stack">
        <h2>Export</h2>
        <p className="muted small">Downloads CSV including sensitive columns (lab data).</p>
        <button type="button" className="btn btn-secondary" onClick={exportCsv}>
          Download transactions CSV
        </button>
      </section>

      <section className="panel stack">
        <h2>Password reset</h2>
        <p className="muted small">
          Request a reset link (simulated). No login token is returned. With{' '}
          <code>SHIELDPAY_LOG_RESET_TOKENS=1</code> in <code>.env</code>, the server logs a one-time token;
          paste it below to set a new password.
        </p>
        <button type="button" className="btn btn-secondary" onClick={requestPasswordReset}>
          Request reset for my email
        </button>
        <form className="stack form-max" onSubmit={confirmPasswordReset}>
          <label className="label">
            Reset token (from email in production, or server log in demo)
            <input
              className="input"
              autoComplete="off"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
            />
          </label>
          <label className="label">
            New password (min 10 characters)
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
            />
          </label>
          <label className="label">
            Confirm new password
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={resetPassword2}
              onChange={(e) => setResetPassword2(e.target.value)}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Complete reset
          </button>
        </form>
      </section>
    </div>
  );
}
