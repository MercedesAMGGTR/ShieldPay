import { test } from 'node:test';
import assert from 'node:assert';
import { createFieldCrypto, ENCRYPTED_PREFIX } from './field-crypto.js';

const key = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const { encrypt, decrypt } = createFieldCrypto(() => key);

test('AES-256-GCM roundtrip', () => {
  const plain = '4242424242424242';
  const c = encrypt(plain);
  assert.ok(c.startsWith(ENCRYPTED_PREFIX));
  assert.notStrictEqual(c, plain);
  assert.strictEqual(decrypt(c), plain);
});

test('null and empty pass through encrypt', () => {
  assert.strictEqual(encrypt(null), null);
  assert.strictEqual(encrypt(''), '');
});

test('null and empty pass through decrypt', () => {
  assert.strictEqual(decrypt(null), null);
  assert.strictEqual(decrypt(''), '');
});

test('legacy plaintext (no prefix) returned as-is', () => {
  assert.strictEqual(decrypt('legacy-pan'), 'legacy-pan');
});

test('wrong key or tampered ciphertext throws', () => {
  const c = encrypt('secret-value');
  const otherKey = createFieldCrypto(() => Buffer.alloc(32, 1));
  assert.throws(() => otherKey.decrypt(c));
  assert.throws(() => decrypt(c.slice(0, -8) + 'deadbeef'));
});
