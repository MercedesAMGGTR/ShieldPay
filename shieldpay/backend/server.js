import 'dotenv/config';
import { SESSION_SECRET } from './secrets.js';
import express from 'express';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { openDatabase, migrate, seedIfEmpty } from './db.js';
import healthRouter from './routes/health.js';
import { createAuthRouter } from './routes/auth.js';
import { createCustomersRouter } from './routes/customers.js';
import { createCardsRouter } from './routes/cards.js';
import { createTransactionsRouter } from './routes/transactions.js';
import { createPaymentsRouter } from './routes/payments.js';
import { createAdminRouter } from './routes/admin.js';
import { createSettingsRouter } from './routes/settings.js';
import { createStatsRouter } from './routes/stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const PORT = Number(process.env.PORT || 8788);
const HOST = process.env.HOST || '0.0.0.0';
const DATABASE_PATH = process.env.DATABASE_PATH || './backend/data/shieldpay.db';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@shieldpay.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMeAdmin!234';

const db = openDatabase(DATABASE_PATH);
migrate(db);
seedIfEmpty(db, { adminEmail: ADMIN_EMAIL, adminPassword: ADMIN_PASSWORD });

const app = express();

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true },
  })
);

app.use(express.json());

/**
 * ARKO-LAB-05: Logs full JSON bodies in development — may include passwords and card data.
 */
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.method !== 'GET' && req.body && Object.keys(req.body).length) {
    console.log('[request-body]', req.method, req.path, JSON.stringify(req.body));
  }
  next();
});

app.use('/api', healthRouter);
app.use('/api/auth', createAuthRouter(db));
app.use('/api/customers', createCustomersRouter(db));
app.use('/api/cards', createCardsRouter(db));
app.use('/api/transactions', createTransactionsRouter(db));
app.use('/api/payments', createPaymentsRouter(db));
app.use('/api/admin', createAdminRouter(db));
app.use('/api/settings', createSettingsRouter(db));
app.use('/api/stats', createStatsRouter(db));

app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  const dist = path.join(root, 'frontend', 'dist');
  if (!fs.existsSync(dist) || !fs.existsSync(path.join(dist, 'index.html'))) {
    console.error(
      'ShieldPay: frontend/dist is missing. Run `npm run build` from the shieldpay directory before `npm start`.'
    );
    process.exit(1);
  }
  app.use(express.static(dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
} else {
  const vite = await createViteServer({
    root,
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

/**
 * ARKO-LAB-06: Global handler leaks stack traces (and optional body) to API clients in all environments.
 */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Server error',
    stack: err.stack,
    body: req.body,
  });
});

app.listen(PORT, HOST, () => {
  const localUrl = `http://127.0.0.1:${PORT}`;
  console.log(`ShieldPay listening on port ${PORT} (host ${HOST})`);
  console.log(`Open ${localUrl} — demo merchant: merchant@demo.com / Demo1234!`);
});
