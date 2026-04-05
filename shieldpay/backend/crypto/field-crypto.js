import crypto from 'crypto';

const VERSION = 'v1';
export const ENCRYPTED_PREFIX = `enc:${VERSION}:`;
const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * AES-256-GCM field-level encryption.
 * Format: enc:v1:<base64url(iv || authTag || ciphertext)>
 *
 * Key rotation: introduce enc:v2 with a new DEK; decrypt() can branch on version.
 * Production: use envelope encryption (KMS-wrapped DEKs) — see kms-local.js.
 */
export function createFieldCrypto(getKeyBytes) {
  function key() {
    const k = getKeyBytes();
    if (!Buffer.isBuffer(k) || k.length !== 32) {
      throw new Error('Field encryption requires a 32-byte AES-256 key');
    }
    return k;
  }

  function encrypt(plaintext) {
    if (plaintext == null || plaintext === '') return plaintext;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, key(), iv, { authTagLength: AUTH_TAG_LENGTH });
    const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = Buffer.concat([iv, tag, enc]);
    return ENCRYPTED_PREFIX + payload.toString('base64url');
  }

  function decrypt(stored) {
    if (stored == null || stored === '') return stored;
    const s = String(stored);
    if (!s.startsWith(ENCRYPTED_PREFIX)) {
      return s;
    }
    const raw = Buffer.from(s.slice(ENCRYPTED_PREFIX.length), 'base64url');
    if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      throw new Error('Invalid encrypted payload length');
    }
    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const data = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGO, key(), iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  return { encrypt, decrypt };
}
