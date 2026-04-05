import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import {
  decryptCardRow,
  encryptTransactionCardForDb,
  decryptTransactionRow,
} from '../crypto/sensitive.js';

const r = Router();

/** Fake processor — accepts test PANs only for demo. */
function validateTestPan(pan) {
  const p = String(pan).replace(/\s/g, '');
  const allowed = new Set(['4242424242424242', '5555555555554444', '4000000000009995']);
  return allowed.has(p) ? p : null;
}

export function createPaymentsRouter(db) {
  r.use(authRequired);

  r.post('/process', (req, res, next) => {
    try {
      if (req.user.role === 'admin') {
        return res.status(403).json({ error: 'Admins cannot process payments in this demo' });
      }
      const { customer_id, amount_dollars, description, pan, cvv } = req.body || {};
      if (amount_dollars == null || !description) {
        return res.status(400).json({ error: 'amount_dollars and description required' });
      }
      const cents = Math.round(Number(amount_dollars) * 100);
      if (!Number.isFinite(cents) || cents <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }
      let cardLast4 = null;
      let cardPanFull = null;
      let cardCvv = null;
      let custId = customer_id ? Number(customer_id) : null;

      if (pan) {
        const clean = validateTestPan(pan);
        if (!clean) {
          return res.status(400).json({ error: 'Use test card numbers only (e.g. 4242424242424242)' });
        }
        cardPanFull = clean;
        cardCvv = cvv ? String(cvv) : null;
        cardLast4 = clean.slice(-4);
      } else if (customer_id) {
        const cardRow = db
          .prepare(
            `SELECT * FROM cards WHERE customer_id = ? AND merchant_id = ? ORDER BY id DESC LIMIT 1`
          )
          .get(Number(customer_id), req.user.sub);
        if (!cardRow) return res.status(400).json({ error: 'No saved card for customer' });
        const card = decryptCardRow(cardRow);
        cardPanFull = card.pan_plain;
        cardCvv = card.cvv_plain;
        cardLast4 = cardRow.last4;
      } else {
        return res.status(400).json({ error: 'Provide customer_id (saved card) or pan for one-off test charge' });
      }

      if (custId) {
        const c = db
          .prepare('SELECT id FROM customers WHERE id = ? AND merchant_id = ?')
          .get(custId, req.user.sub);
        if (!c) return res.status(400).json({ error: 'Invalid customer' });
      }

      const status = cardPanFull === '4000000000009995' ? 'declined' : 'captured';

      const encTx = encryptTransactionCardForDb(cardPanFull, cardCvv);
      const ins = db
        .prepare(
          `INSERT INTO transactions (merchant_id, customer_id, amount_cents, status, description, card_pan_full, card_cvv, card_last4)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          req.user.sub,
          custId,
          cents,
          status,
          description,
          encTx.card_pan_full,
          encTx.card_cvv,
          cardLast4
        );

      const rawTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(ins.lastInsertRowid);
      res.status(201).json({ transaction: decryptTransactionRow(rawTx), fakeMoney: true });
    } catch (e) {
      next(e);
    }
  });

  return r;
}
