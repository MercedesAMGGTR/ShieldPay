import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';

const r = Router();

export function createStatsRouter(db) {
  r.use(authRequired);

  r.get('/dashboard', (req, res) => {
    const merchantClause =
      req.user.role === 'admin' ? '1=1' : `merchant_id = ${Number(req.user.sub)}`;

    const totals = db
      .prepare(
        `SELECT
           COUNT(*) AS transaction_count,
           COALESCE(SUM(CASE WHEN status = 'captured' THEN amount_cents ELSE 0 END), 0) AS volume_cents,
           COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount_cents ELSE 0 END), 0) AS refunded_cents
         FROM transactions WHERE ${merchantClause}`
      )
      .get();

    const customerCount =
      req.user.role === 'admin'
        ? db.prepare(`SELECT COUNT(*) AS c FROM customers`).get()
        : db.prepare(`SELECT COUNT(*) AS c FROM customers WHERE merchant_id = ?`).get(req.user.sub);

    const c = customerCount.c;

    const last7 = db
      .prepare(
        `SELECT date(created_at) AS day,
                SUM(CASE WHEN status = 'captured' THEN amount_cents ELSE 0 END) AS volume_cents,
                COUNT(*) AS tx_count
         FROM transactions
         WHERE ${merchantClause}
           AND created_at >= datetime('now', '-7 days')
         GROUP BY date(created_at)
         ORDER BY day ASC`
      )
      .all();

    res.json({
      transaction_count: totals.transaction_count,
      volume_cents: totals.volume_cents,
      refunded_cents: totals.refunded_cents,
      customer_count: c,
      last7_days: last7,
    });
  });

  return r;
}
