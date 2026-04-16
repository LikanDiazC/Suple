/**
 * AES-256-GCM encryption for marketing tokens at rest.
 *
 * The encryption key is derived from the `ENCRYPTION_SECRET` env var.
 * Each encrypted value stores: iv (12 bytes) + authTag (16 bytes) + ciphertext,
 * all base64-encoded into a single string for DB storage.
 *
 * Usage:
 *   const encrypted = encrypt(plainAccessToken);
 *   const plain     = decrypt(encrypted);
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT = 'enterprise-mktg-v1'; // static salt — key uniqueness comes from the secret

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error(
      'ENCRYPTION_SECRET env var is required for token encryption. ' +
        'Generate one with: openssl rand -hex 32',
    );
  }
  return scryptSync(secret, SALT, KEY_LENGTH);
}

/**
 * Encrypt a plaintext string → base64 blob (iv + authTag + ciphertext).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack: iv (12) + authTag (16) + ciphertext (variable)
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString('base64');
}

/**
 * Decrypt a base64 blob → original plaintext string.
 */
export function decrypt(packed64: string): string {
  const key = getKey();
  const packed = Buffer.from(packed64, 'base64');

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
