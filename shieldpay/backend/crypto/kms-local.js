import { FIELD_ENCRYPTION_KEY_HEX } from '../secrets.js';

/**
 * Local development "KMS": 32-byte data encryption key from env.
 *
 * Envelope pattern for production (PCI/GDPR scale):
 * 1. Generate a random DEK per encrypt operation or per tenant.
 * 2. Encrypt DEK with AWS KMS / Azure Key Vault / Vault Transit (CMK).
 * 3. Store ciphertext + wrapped DEK + key id/version alongside row or in a key table.
 * 4. Rotate CMK per vendor schedule; re-wrap or re-encrypt DEKs as needed.
 */
export function getFieldEncryptionKeyBytes() {
  return Buffer.from(FIELD_ENCRYPTION_KEY_HEX, 'hex');
}
