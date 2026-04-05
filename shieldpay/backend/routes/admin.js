import { Router } from 'express';
import { authRequired, requireAdmin } from '../middleware/auth.js';

const r = Router();

export function createAdminRouter(db) {
  r.use(authRequired);
  r.use(requireAdmin);

  r.get('/overview', (req, res) => {
    const users = db.prepare(`SELECT id, email, role, name, business_name, created_at FROM users ORDER BY id`).all();
    const tx = db.prepare(`SELECT COUNT(*) AS c, COALESCE(SUM(amount_cents),0) AS v FROM transactions`).get();
    res.json({
      users,
      transactions_total: tx.c,
      volume_cents_all: tx.v,
    });
  });

  r.get('/merchants', (req, res) => {
    const merchants = db
      .prepare(`SELECT id, email, name, business_name, created_at FROM users WHERE role = 'merchant' ORDER BY id`)
      .all();
    res.json({ merchants });
  });

  r.delete('/users/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    if (id === req.user.sub) {
      return res.status(400).json({ error: 'Cannot delete self in demo' });
    }
    db.prepare('DELETE FROM webhooks WHERE merchant_id = ?').run(id);
    db.prepare('DELETE FROM api_keys WHERE merchant_id = ?').run(id);
    db.prepare('DELETE FROM transactions WHERE merchant_id = ?').run(id);
    db.prepare('DELETE FROM cards WHERE merchant_id = ?').run(id);
    db.prepare('DELETE FROM customers WHERE merchant_id = ?').run(id);
    const rdel = db.prepare('DELETE FROM users WHERE id = ? AND role = ?').run(id, 'merchant');
    if (rdel.changes === 0) {
      return res.status(404).json({ error: 'Merchant not found or not deletable' });
    }
    res.json({ ok: true });
  });

  return r;
}
