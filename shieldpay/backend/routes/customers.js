import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';

const r = Router();

export function createCustomersRouter(db) {
  r.use(authRequired);

  r.get('/', (req, res, next) => {
    try {
      const search = (req.query.search || '').toString().trim();
      const like = search ? `%${search}%` : null;
      let rows;
      if (req.user.role === 'admin') {
        if (like) {
          rows = db
            .prepare(
              `SELECT c.* FROM customers c
               WHERE c.name LIKE ? OR c.email LIKE ?
               ORDER BY c.created_at DESC`
            )
            .all(like, like);
        } else {
          rows = db.prepare(`SELECT c.* FROM customers c ORDER BY c.created_at DESC`).all();
        }
      } else {
        const mid = Number(req.user.sub);
        if (like) {
          rows = db
            .prepare(
              `SELECT c.* FROM customers c
               WHERE c.merchant_id = ? AND (c.name LIKE ? OR c.email LIKE ?)
               ORDER BY c.created_at DESC`
            )
            .all(mid, like, like);
        } else {
          rows = db
            .prepare(`SELECT c.* FROM customers c WHERE c.merchant_id = ? ORDER BY c.created_at DESC`)
            .all(mid);
        }
      }
      res.json({ customers: rows });
    } catch (e) {
      next(e);
    }
  });

  r.get('/:id', (req, res) => {
    const id = Number(req.params.id);
    let row;
    if (req.user.role === 'admin') {
      row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    } else {
      row = db
        .prepare('SELECT * FROM customers WHERE id = ? AND merchant_id = ?')
        .get(id, req.user.sub);
    }
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({ customer: row });
  });

  r.post('/', (req, res, next) => {
    try {
      if (req.user.role === 'admin') {
        return res.status(403).json({ error: 'Admins create merchants via other tools in this demo' });
      }
      const { name, email, phone, notes } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name required' });
      const result = db
        .prepare(
          `INSERT INTO customers (merchant_id, name, email, phone, notes) VALUES (?, ?, ?, ?, ?)`
        )
        .run(req.user.sub, name, email || null, phone || null, notes || null);
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json({ customer });
    } catch (e) {
      next(e);
    }
  });

  r.put('/:id', (req, res) => {
    const id = Number(req.params.id);
    const { name, email, phone, notes } = req.body || {};
    let existing;
    if (req.user.role === 'admin') {
      existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    } else {
      existing = db
        .prepare('SELECT * FROM customers WHERE id = ? AND merchant_id = ?')
        .get(id, req.user.sub);
    }
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const vals = [name ?? existing.name, email ?? existing.email, phone ?? existing.phone, notes ?? existing.notes];
    let updated;
    if (req.user.role === 'admin') {
      updated = db
        .prepare(
          `UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone), notes = COALESCE(?, notes) WHERE id = ?`
        )
        .run(...vals, id);
    } else {
      updated = db
        .prepare(
          `UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone), notes = COALESCE(?, notes) WHERE id = ? AND merchant_id = ?`
        )
        .run(...vals, id, req.user.sub);
    }
    if (updated.changes === 0) return res.status(404).json({ error: 'Not found' });
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.json({ customer });
  });

  r.delete('/:id', (req, res) => {
    const id = Number(req.params.id);
    let existing;
    if (req.user.role === 'admin') {
      existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    } else {
      existing = db
        .prepare('SELECT * FROM customers WHERE id = ? AND merchant_id = ?')
        .get(id, req.user.sub);
    }
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'admin') {
      db.prepare('DELETE FROM cards WHERE customer_id = ?').run(id);
      db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    } else {
      db.prepare('DELETE FROM cards WHERE customer_id = ? AND merchant_id = ?').run(id, req.user.sub);
      db.prepare('DELETE FROM customers WHERE id = ? AND merchant_id = ?').run(id, req.user.sub);
    }
    res.json({ ok: true });
  });

  return r;
}
