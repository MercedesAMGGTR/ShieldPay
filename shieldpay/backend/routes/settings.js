import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { authRequired } from '../middleware/auth.js';
import { decryptWebhookRow, encryptWebhookSecretForDb, mapDecryptTransactions } from '../crypto/sensitive.js';

const r = Router();

export function createSettingsRouter(db) {
  r.use(authRequired);

  r.get('/profile', (req, res) => {
    const user = db
      .prepare(`SELECT id, email, role, name, business_name, created_at FROM users WHERE id = ?`)
      .get(req.user.sub);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ profile: user });
  });

  r.put('/profile', (req, res, next) => {
    try {
      const { name, business_name } = req.body || {};
      db.prepare(`UPDATE users SET name = COALESCE(?, name), business_name = COALESCE(?, business_name) WHERE id = ?`).run(
        name,
        business_name,
        req.user.sub
      );
      const profile = db
        .prepare(`SELECT id, email, role, name, business_name, created_at FROM users WHERE id = ?`)
        .get(req.user.sub);
      res.json({ profile });
    } catch (e) {
      next(e);
    }
  });

  r.get('/api-keys', (req, res) => {
    if (req.user.role === 'admin') {
      return res.json({ keys: [] });
    }
    const keys = db
      .prepare(`SELECT id, key_prefix, name, created_at FROM api_keys WHERE merchant_id = ? ORDER BY id DESC`)
      .all(req.user.sub);
    res.json({ keys });
  });

  r.post('/api-keys', (req, res, next) => {
    try {
      if (req.user.role === 'admin') {
        return res.status(403).json({ error: 'Admins have no API keys in this demo' });
      }
      const { name } = req.body || {};
      const raw = `sp_live_${crypto.randomBytes(12).toString('hex')}`;
      const prefix = raw.slice(0, 16);
      const hash = bcrypt.hashSync(raw, 8);
      const ins = db
        .prepare(`INSERT INTO api_keys (merchant_id, key_prefix, key_hash, name) VALUES (?, ?, ?, ?)`)
        .run(req.user.sub, prefix, hash, name || 'API key');
      res.status(201).json({
        id: ins.lastInsertRowid,
        key: raw,
        message: 'Store this key once; it will not be shown again (demo behavior).',
      });
    } catch (e) {
      next(e);
    }
  });

  r.delete('/api-keys/:id', (req, res) => {
    if (req.user.role === 'admin') {
      return res.status(403).json({ error: 'N/A' });
    }
    const id = Number(req.params.id);
    const del = db
      .prepare(`DELETE FROM api_keys WHERE id = ? AND merchant_id = ?`)
      .run(id, req.user.sub);
    if (del.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });

  r.get('/webhooks', (req, res, next) => {
    try {
      if (req.user.role === 'admin') {
        return res.json({ webhooks: [] });
      }
      const raw = db
        .prepare(`SELECT id, url, secret, active, created_at FROM webhooks WHERE merchant_id = ?`)
        .all(req.user.sub);
      const webhooks = raw.map((w) => decryptWebhookRow(w));
      res.json({ webhooks });
    } catch (e) {
      next(e);
    }
  });

  r.post('/webhooks', (req, res, next) => {
    try {
      if (req.user.role === 'admin') {
        return res.status(403).json({ error: 'Admins use overview in this demo' });
      }
      const { url } = req.body || {};
      if (!url) return res.status(400).json({ error: 'url required' });
      const secret = `whsec_${crypto.randomBytes(8).toString('hex')}`;
      const ins = db
        .prepare(`INSERT INTO webhooks (merchant_id, url, secret, active) VALUES (?, ?, ?, 1)`)
        .run(req.user.sub, url, encryptWebhookSecretForDb(secret));
      res.status(201).json({ id: ins.lastInsertRowid, url, secret });
    } catch (e) {
      next(e);
    }
  });

  /** CSV export — card columns decrypted from at-rest ciphertext for authorized export only. */
  r.get('/export/transactions.csv', (req, res, next) => {
    try {
      let rows;
      if (req.user.role === 'admin') {
        rows = db
          .prepare(
            `SELECT id, merchant_id, customer_id, amount_cents, status, description, card_pan_full, card_cvv, card_last4, created_at
           FROM transactions ORDER BY id DESC LIMIT 500`
          )
          .all();
      } else {
        rows = db
          .prepare(
            `SELECT id, merchant_id, customer_id, amount_cents, status, description, card_pan_full, card_cvv, card_last4, created_at
           FROM transactions WHERE merchant_id = ? ORDER BY id DESC LIMIT 500`
          )
          .all(req.user.sub);
      }
      const header = [
        'id',
        'merchant_id',
        'customer_id',
        'amount_cents',
        'status',
        'description',
        'card_pan_full',
        'card_cvv',
        'card_last4',
        'created_at',
      ];
      const lines = [header.join(',')];
      const revealed = mapDecryptTransactions(rows);
      for (const row of revealed) {
        lines.push(
          header
            .map((k) => {
              const v = row[k];
              if (v == null) return '';
              const s = String(v);
              if (s.includes(',') || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
              return s;
            })
            .join(',')
        );
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="shieldpay-transactions.csv"');
      res.send(lines.join('\n'));
    } catch (e) {
      next(e);
    }
  });

  return r;
}
