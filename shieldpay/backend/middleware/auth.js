import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../secrets.js';

export function getJwtSecret() {
  return JWT_SECRET;
}

export function authRequired(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  const token = h.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/** Use after authRequired. JWT must include role === 'admin' (set at login). */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function optionalAuth(req, res, next) {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(h.slice(7), JWT_SECRET);
    } catch {
      req.user = null;
    }
  }
  next();
}
