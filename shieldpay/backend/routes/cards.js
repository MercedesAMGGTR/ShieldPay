import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import {
  decryptCardRow,
  encryptCardPanCvvForDb,
  mapDecryptCards,
} from '../crypto/sensitive.js';

const r = Router();

export function createCardsRouter(db) {
  r.use(authRequired);

  r.get('/', (req, res, next) => {
    try {
      let rows;
      if (req.user.role === 'admin') {
        rows = db
          .prepare(
            `SELECT k.*, c.name AS customer_name FROM cards k JOIN customers c ON c.id = k.customer_id ORDER BY k.created_at DESC`
          )
          .all();
      } else {
        rows = db
          .prepare(
            `SELECT k.*, c.name AS customer_name FROM cards k JOIN customers c ON c.id = k.customer_id
           WHERE k.merchant_id = ? ORDER BY k.created_at DESC`
          )
          .all(req.user.sub);
      }
      res.json({
        cards: mapDecryptCards(rows),
        _sensitiveNote: 'PAN/CVV decrypted for authorized API use only; stored AES-256-GCM at rest.',
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
            `SELECT k.*, c.name AS customer_name FROM cards k JOIN customers c ON c.id = k.customer_id WHERE k.id = ?`
          )
          .get(id);
      } else {
        row = db
          .prepare(
            `SELECT k.*, c.name AS customer_name FROM cards k JOIN customers c ON c.id = k.customer_id
           WHERE k.id = ? AND k.merchant_id = ?`
          )
          .get(id, req.user.sub);
      }
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json({ card: decryptCardRow(row) });
    } catch (e) {
      next(e);
    }
  });

  r.post('/', (req, res, next) => {
    try {
      if (req.user.role === 'admin') {
        return res.status(403).json({ error: 'Admins cannot add cards in this demo' });
      }
      const {
        customer_id,
        brand,
        pan,
        cvv,
        expiry_month,
        expiry_year,
        label,
      } = req.body || {};
      if (!customer_id || !brand || !pan || !cvv || !expiry_month || !expiry_year) {
        return res.status(400).json({ error: 'customer_id, brand, pan, cvv, expiry_month, expiry_year required' });
      }
      const cust = db
        .prepare('SELECT * FROM customers WHERE id = ? AND merchant_id = ?')
        .get(Number(customer_id), req.user.sub);
      if (!cust) return res.status(400).json({ error: 'Invalid customer' });
      const last4 = String(pan).slice(-4);
      const enc = encryptCardPanCvvForDb(pan, cvv);
      const result = db
        .prepare(
          `INSERT INTO cards (customer_id, merchant_id, brand, pan_plain, cvv_plain, expiry_month, expiry_year, last4, label)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          cust.id,
          req.user.sub,
          brand,
          enc.pan_plain,
          enc.cvv_plain,
          Number(expiry_month),
          Number(expiry_year),
          last4,
          label || null
        );
      const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json({ card: decryptCardRow(card) });
    } catch (e) {
      next(e);
    }
  });

  r.put('/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const { label, expiry_month, expiry_year } = req.body || {};
      let existing;
      if (req.user.role === 'admin') {
        existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
      } else {
        existing = db.prepare('SELECT * FROM cards WHERE id = ? AND merchant_id = ?').get(id, req.user.sub);
      }
      if (!existing) return res.status(404).json({ error: 'Not found' });
      let updated;
      if (req.user.role === 'admin') {
        updated = db
          .prepare(
            `UPDATE cards SET label = COALESCE(?, label), expiry_month = COALESCE(?, expiry_month), expiry_year = COALESCE(?, expiry_year) WHERE id = ?`
          )
          .run(label ?? existing.label, expiry_month ?? existing.expiry_month, expiry_year ?? existing.expiry_year, id);
      } else {
        updated = db
          .prepare(
            `UPDATE cards SET label = COALESCE(?, label), expiry_month = COALESCE(?, expiry_month), expiry_year = COALESCE(?, expiry_year) WHERE id = ? AND merchant_id = ?`
          )
          .run(
            label ?? existing.label,
            expiry_month ?? existing.expiry_month,
            expiry_year ?? existing.expiry_year,
            id,
            req.user.sub
          );
      }
      if (updated.changes === 0) return res.status(404).json({ error: 'Not found' });
      const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
      res.json({ card: decryptCardRow(card) });
    } catch (e) {
      next(e);
    }
  });

  r.delete('/:id', (req, res, next) => {
    try {
      const id = Number(req.params.id);
      let existing;
      if (req.user.role === 'admin') {
        existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
      } else {
        existing = db.prepare('SELECT * FROM cards WHERE id = ? AND merchant_id = ?').get(id, req.user.sub);
      }
      if (!existing) return res.status(404).json({ error: 'Not found' });
      let del;
      if (req.user.role === 'admin') {
        del = db.prepare('DELETE FROM cards WHERE id = ?').run(id);
      } else {
        del = db.prepare('DELETE FROM cards WHERE id = ? AND merchant_id = ?').run(id, req.user.sub);
      }
      if (del.changes === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  return r;
}
