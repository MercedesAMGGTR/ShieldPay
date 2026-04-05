import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { decryptTransactionRow, mapDecryptTransactions } from '../crypto/sensitive.js';

const r = Router();

export function createTransactionsRouter(db) {
  r.use(authRequired);

  r.get('/', (req, res, next) => {
    try {
      let rows;
      if (req.user.role === 'admin') {
        rows = db
          .prepare(
            `SELECT t.*, c.name AS customer_name FROM transactions t
           LEFT JOIN customers c ON c.id = t.customer_id
           ORDER BY t.created_at DESC LIMIT 200`
          )
          .all();
      } else {
        rows = db
          .prepare(
            `SELECT t.*, c.name AS customer_name FROM transactions t
           LEFT JOIN customers c ON c.id = t.customer_id
           WHERE t.merchant_id = ?
           ORDER BY t.created_at DESC LIMIT 200`
          )
          .all(req.user.sub);
      }
      res.json({
        transactions: mapDecryptTransactions(rows),
        _sensitiveNote: 'Card fields decrypted for authorized use; encrypted at rest.',
      });
    } catch (e) {
      next(e);
    }
  });

  r.get('/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      let row;
      if (req.user.role === 'admin') {
        row = db
          .prepare(
            `SELECT t.*, c.name AS customer_name FROM transactions t
           LEFT JOIN customers c ON c.id = t.customer_id WHERE t.id = ?`
          )
          .get(id);
      } else {
        row = db
          .prepare(
            `SELECT t.*, c.name AS customer_name FROM transactions t
           LEFT JOIN customers c ON c.id = t.customer_id
           WHERE t.id = ? AND t.merchant_id = ?`
          )
          .get(id, req.user.sub);
      }
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json({ transaction: decryptTransactionRow(row) });
    } catch (e) {
      next(e);
    }
  });

  return r;
}
