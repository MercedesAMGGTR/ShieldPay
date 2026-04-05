import 'dotenv/config';

const MIN_SECRET_LENGTH = 32;

function requireSecret(name) {
  const v = process.env[name]?.trim();
  if (!v || v.length < MIN_SECRET_LENGTH) {
    console.error(
      `[ShieldPay] ${name} is required and must be at least ${MIN_SECRET_LENGTH} characters ` +
        `(use a random value, e.g. openssl rand -hex 32). Set it in .env or the environment.`
    );
    process.exit(1);
  }
  return v;
}

export const JWT_SECRET = requireSecret('JWT_SECRET');
export const SESSION_SECRET = requireSecret('SESSION_SECRET');

/** 64 hex chars = 32 bytes for AES-256 field encryption (local DEK; use KMS envelope in production). */
function requireHexKey32(name) {
  const v = process.env[name]?.trim()?.toLowerCase();
  if (!v || v.length !== 64 || !/^[0-9a-f]{64}$/.test(v)) {
    console.error(
      `[ShieldPay] ${name} must be exactly 64 hex characters (32 bytes), e.g. openssl rand -hex 32`
    );
    process.exit(1);
  }
  return v;
}

export const FIELD_ENCRYPTION_KEY_HEX = requireHexKey32('FIELD_ENCRYPTION_KEY');
