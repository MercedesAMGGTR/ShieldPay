import { Router } from 'express';

const r = Router();

r.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'shieldpay',
    time: new Date().toISOString(),
  });
});

export default r;
