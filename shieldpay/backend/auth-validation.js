export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

/** Pragmatic email check — rejects obvious garbage; not a full RFC 5322 parser. */
export function isValidEmail(email) {
  const s = normalizeEmail(email);
  if (!s || s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export function validateNewPassword(password) {
  if (typeof password !== 'string' || password.length < 10) {
    return 'Password must be at least 10 characters';
  }
  return null;
}
