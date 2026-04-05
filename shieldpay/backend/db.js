import bcrypt from 'bcrypt';
import path from 'path';
/** SQLite via `node:sqlite` (no native addon) — avoids build failures common with better-sqlite3 on newer Node. */
import { createSqliteDatabase } from './sqlite-db.js';
import {
  encryptCardPanCvvForDb,
  encryptTransactionCardForDb,
  encryptWebhookSecretForDb,
} from './crypto/sensitive.js';

/** Card PAN/CVV and related transaction fields are encrypted at rest (AES-256-GCM). Test PANs only. */
export function openDatabase(databasePath) {
  const resolved = path.isAbsolute(databasePath)
    ? databasePath
    : path.resolve(process.cwd(), databasePath);
  const db = createSqliteDatabase(resolved);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'merchant')),
      name TEXT NOT NULL,
      business_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      merchant_id INTEGER NOT NULL REFERENCES users(id),
      brand TEXT NOT NULL,
      pan_plain TEXT NOT NULL,
      cvv_plain TEXT NOT NULL,
      expiry_month INTEGER NOT NULL,
      expiry_year INTEGER NOT NULL,
      last4 TEXT NOT NULL,
      label TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL REFERENCES users(id),
      customer_id INTEGER,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL,
      description TEXT,
      card_pan_full TEXT,
      card_cvv TEXT,
      card_last4 TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL REFERENCES users(id),
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      merchant_id INTEGER NOT NULL REFERENCES users(id),
      url TEXT NOT NULL,
      secret TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
  `);
}

export function seedIfEmpty(db, { adminEmail, adminPassword }) {
  const row = db.prepare('SELECT COUNT(*) AS c FROM users').get();
  if (row.c > 0) return;

  const adminHash = bcrypt.hashSync(adminPassword, 10);
  const merchantHash = bcrypt.hashSync('Demo1234!', 10);

  const ins = db.prepare(`
    INSERT INTO users (email, password_hash, role, name, business_name)
    VALUES (?, ?, ?, ?, ?)
  `);

  ins.run(adminEmail, adminHash, 'admin', 'Platform Admin', null);
  ins.run('merchant@demo.com', merchantHash, 'merchant', 'Demo Merchant', 'Demo Coffee Co.');

  const merchant = db
    .prepare(`SELECT id FROM users WHERE email = 'merchant@demo.com'`)
    .get();

  const mid = merchant.id;

  const cust1 = db
    .prepare(
      `INSERT INTO customers (merchant_id, name, email, phone, notes)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(mid, 'Alex Rivera', 'alex@example.test', '555-0100', 'VIP');

  const cust2 = db
    .prepare(
      `INSERT INTO customers (merchant_id, name, email, phone, notes)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(mid, 'Jordan Lee', 'jordan@example.test', '555-0101', null);

  const cid1 = cust1.lastInsertRowid;
  const cid2 = cust2.lastInsertRowid;

  // Test PANs only (Stripe-style test cards) — stored encrypted at rest
  const card1 = encryptCardPanCvvForDb('4242424242424242', '123');
  db.prepare(
    `INSERT INTO cards (customer_id, merchant_id, brand, pan_plain, cvv_plain, expiry_month, expiry_year, last4, label)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(cid1, mid, 'visa', card1.pan_plain, card1.cvv_plain, 12, 2030, '4242', 'Work card');

  const card2 = encryptCardPanCvvForDb('5555555555554444', '456');
  db.prepare(
    `INSERT INTO cards (customer_id, merchant_id, brand, pan_plain, cvv_plain, expiry_month, expiry_year, last4, label)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(cid2, mid, 'mastercard', card2.pan_plain, card2.cvv_plain, 6, 2029, '4444', 'Personal');

  const txStmt = db.prepare(`
    INSERT INTO transactions (merchant_id, customer_id, amount_cents, status, description, card_pan_full, card_cvv, card_last4, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);

  const t1 = encryptTransactionCardForDb('4242424242424242', '123');
  txStmt.run(mid, cid1, 1299, 'captured', 'Latte', t1.card_pan_full, t1.card_cvv, '4242', '-6 days');
  const t2 = encryptTransactionCardForDb('5555555555554444', '456');
  txStmt.run(mid, cid2, 4500, 'captured', 'Beans bulk', t2.card_pan_full, t2.card_cvv, '4444', '-5 days');
  const t3 = encryptTransactionCardForDb('4242424242424242', '123');
  txStmt.run(mid, cid1, 899, 'refunded', 'Pastry', t3.card_pan_full, t3.card_cvv, '4242', '-4 days');
  const t4 = encryptTransactionCardForDb('5555555555554444', '456');
  txStmt.run(mid, cid2, 2200, 'captured', 'Gift card', t4.card_pan_full, t4.card_cvv, '4444', '-3 days');
  const t5 = encryptTransactionCardForDb('4242424242424242', '123');
  txStmt.run(mid, cid1, 750, 'captured', 'Drip', t5.card_pan_full, t5.card_cvv, '4242', '-2 days');
  const t6 = encryptTransactionCardForDb('5555555555554444', '456');
  txStmt.run(mid, cid2, 3100, 'pending', 'Catering deposit', t6.card_pan_full, t6.card_cvv, '4444', '-1 days');
  const t7 = encryptTransactionCardForDb('4242424242424242', '123');
  txStmt.run(mid, cid1, 1600, 'captured', 'Mocha', t7.card_pan_full, t7.card_cvv, '4242', '0 days');

  db.prepare(
    `INSERT INTO api_keys (merchant_id, key_prefix, key_hash, name)
     VALUES (?, ?, ?, ?)`
  ).run(mid, 'sp_live_demo', bcrypt.hashSync('sp_live_demo_xxxxxxxx', 8), 'Default key');

  db.prepare(
    `INSERT INTO webhooks (merchant_id, url, secret, active)
     VALUES (?, ?, ?, 1)`
  ).run(mid, 'https://example.test/hooks/shieldpay', encryptWebhookSecretForDb('whsec_demo_only'));
}
