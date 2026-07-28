import * as crypto from 'crypto';
import { getEnv } from '../config/env.js';
import { BadRequestError } from './errors.js';
import { logger } from './logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(keyId?: string): Buffer {
  const envKey = getEnv().ENCRYPTION_KEY;
  if (keyId) {
    const derivedKey = crypto.createHmac('sha256', envKey).update(keyId).digest();
    return derivedKey;
  }
  return Buffer.from(envKey, 'hex');
}

export function encrypt(plaintext: string, keyId?: string): { encryptedContent: Buffer; contentEncryptionKeyId: string } {
  const effectiveKeyId = keyId || 'default';
  const key = getEncryptionKey(effectiveKeyId);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  const result = Buffer.concat([iv, authTag, encrypted]);

  return {
    encryptedContent: result,
    contentEncryptionKeyId: effectiveKeyId,
  };
}

export function decrypt(encryptedContent: Buffer, keyId: string): string {
  try {
    const key = getEncryptionKey(keyId);

    if (encryptedContent.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new BadRequestError('Invalid encrypted content');
    }

    const iv = encryptedContent.subarray(0, IV_LENGTH);
    const authTag = encryptedContent.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = encryptedContent.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    logger.error('Decryption failed', error instanceof Error ? error : undefined);
    throw new BadRequestError('Failed to decrypt content');
  }
}

export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
