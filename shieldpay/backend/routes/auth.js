import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authRequired, getJwtSecret, requireAdmin } from '../middleware/auth.js';
import { normalizeEmail, isValidEmail, validateNewPassword } from '../auth-validation.js';

const r = Router();

function signUser(user) {
  const JWT_SECRET = getJwtSecret();
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      business_name: user.business_name,
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function hashResetToken(plainToken) {
  return crypto.createHash('sha256').update(plainToken, 'utf8').digest('hex');
}

export function createAuthRouter(db) {
  r.post('/register', (req, res, next) => {
    try {
      const { email, password, name, business_name } = req.body || {};
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'email, password, and name required' });
      }
      const em = normalizeEmail(email);
      if (!isValidEmail(em)) {
        return res.status(400).json({ error: 'Invalid email address' });
      }
      const pwErr = validateNewPassword(password);
      if (pwErr) return res.status(400).json({ error: pwErr });
      const hash = bcrypt.hashSync(password, 10);
      const result = db
        .prepare(
          `INSERT INTO users (email, password_hash, role, name, business_name)
           VALUES (?, ?, 'merchant', ?, ?)`
        )
        .run(em, hash, name, business_name || null);
      const user = db
        .prepare(`SELECT id, email, role, name, business_name FROM users WHERE id = ?`)
        .get(result.lastInsertRowid);
      const token = signUser(user);
      res.status(201).json({ user, token });
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      next(e);
    }
  });

  r.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    const em = normalizeEmail(email);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(em);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const safe = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      business_name: user.business_name,
    };
    const token = signUser(safe);
    res.json({ user: safe, token });
  });

  r.get('/me', authRequired, (req, res) => {
    const user = db
      .prepare(`SELECT id, email, role, name, business_name FROM users WHERE id = ?`)
      .get(req.user.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  });

  /**
   * Request password reset: never returns a session JWT. Issues a one-time opaque token stored hashed.
   * Response is identical whether the email exists (mitigates account enumeration).
   */
  r.post('/password-reset', (req, res) => {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'email required' });
    }
    const em = normalizeEmail(email);
    if (!isValidEmail(em)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(em);
    if (user) {
      db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);
      const plainToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashResetToken(plainToken);
      db
        .prepare(
          `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
           VALUES (?, ?, datetime('now', '+1 hour'))`
        )
        .run(user.id, tokenHash);

      if (process.env.SHIELDPAY_LOG_RESET_TOKENS === '1') {
        console.info(
          '[shieldpay] Demo only: password reset token (use POST /api/auth/password-reset/confirm):',
          plainToken
        );
      }
    }

    return res.json({
      ok: true,
      message:
        'If an account exists for that email, password reset instructions have been sent. ' +
        'In production this would be delivered by email; in local demo set SHIELDPAY_LOG_RESET_TOKENS=1 to log a token to the server console.',
    });
  });

  /**
   * Complete reset with one-time token + new password. Does not return a JWT (user signs in afterward).
   */
  r.post('/password-reset/confirm', (req, res) => {
    const { token, newPassword } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token required' });
    }
    const pwErr = validateNewPassword(newPassword);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const tokenHash = hashResetToken(token.trim());
    const row = db
      .prepare(
        `SELECT t.id AS tid, t.user_id FROM password_reset_tokens t
         WHERE t.token_hash = ? AND t.expires_at > datetime('now')`
      )
      .get(tokenHash);

    if (!row) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, row.user_id);
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(row.user_id);

    return res.json({
      ok: true,
      message: 'Password has been reset. Sign in with your new password.',
    });
  });

  /**
   * Impersonation that returned another user's JWT in the response body is disabled (token handoff risk).
   */
  r.post('/impersonate', authRequired, requireAdmin, (req, res) => {
    return res.status(410).json({
      error: 'Impersonation is disabled. This API does not issue session tokens for other users.',
    });
  });

  return r;
}
