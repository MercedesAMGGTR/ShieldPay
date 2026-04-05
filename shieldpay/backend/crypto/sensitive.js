import { createFieldCrypto } from './field-crypto.js';
import { getFieldEncryptionKeyBytes } from './kms-local.js';

const { encrypt: encryptField, decrypt: decryptField } = createFieldCrypto(getFieldEncryptionKeyBytes);

export { encryptField, decryptField };

export function decryptCardRow(row) {
  if (!row) return row;
  return {
    ...row,
    pan_plain: decryptField(row.pan_plain),
    cvv_plain: decryptField(row.cvv_plain),
  };
}

export function encryptCardPanCvvForDb(pan, cvv) {
  return {
    pan_plain: encryptField(String(pan)),
    cvv_plain: encryptField(String(cvv)),
  };
}

export function decryptTransactionRow(row) {
  if (!row) return row;
  return {
    ...row,
    card_pan_full: decryptField(row.card_pan_full),
    card_cvv: decryptField(row.card_cvv),
  };
}

export function encryptTransactionCardForDb(pan, cvv) {
  return {
    card_pan_full: pan == null || pan === '' ? null : encryptField(String(pan)),
    card_cvv: cvv == null || cvv === '' ? null : encryptField(String(cvv)),
  };
}

export function decryptWebhookRow(row) {
  if (!row) return row;
  return { ...row, secret: decryptField(row.secret) };
}

export function encryptWebhookSecretForDb(secret) {
  return encryptField(String(secret));
}

export function mapDecryptCards(rows) {
  return rows.map((r) => decryptCardRow(r));
}

export function mapDecryptTransactions(rows) {
  return rows.map((r) => decryptTransactionRow(r));
}
