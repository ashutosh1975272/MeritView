import crypto from 'crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  encrypt,
  decrypt,
  generateContentEncryptionKey,
  rotateEncryptionKey,
  getActiveKeyId,
  configureKeys,
  type EncryptionKeyRecord,
} from '../../utils/crypto';

describe('Crypto Utils', () => {
  let testKeyId: string;
  let testKeyBytes: Buffer;

  beforeEach(() => {
    testKeyBytes = Buffer.from(crypto.randomBytes(32));
    testKeyId = `test_key_${Date.now()}`;

    configureKeys(() => [
      {
        id: 'test_key_1',
        keyId: testKeyId,
        keyBytes: Buffer.from(testKeyBytes),
        isActive: true,
        rotatedAt: null,
        createdAt: new Date(),
      } as EncryptionKeyRecord,
    ]);
  });

  describe('encrypt / decrypt', () => {
    it('encrypts and decrypts content correctly', () => {
      const original = 'test content for encryption';
      const encrypted = encrypt(original);

      expect(encrypted.encryptedContent).toBeDefined();
      expect(encrypted.contentEncryptionKeyId).toBe(testKeyId);
      expect(encrypted.encryptedContent).not.toContain(original);

      const decrypted = decrypt(encrypted.encryptedContent, encrypted.contentEncryptionKeyId);
      expect(decrypted).toBe(original);
    });

    it('produces different ciphertext for same input', () => {
      const original = 'same content';

      const encrypted1 = encrypt(original);
      const encrypted2 = encrypt(original);

      expect(encrypted1.encryptedContent).not.toBe(encrypted2.encryptedContent);
    });

    it('decryption fails with wrong key', () => {
      const original = 'secret data';
      const encrypted = encrypt(original);

      expect(() => {
        decrypt(encrypted.encryptedContent, 'wrong-key-id');
      }).toThrow();
    });

    it('handles JSON serialization', () => {
      const data = { foo: 'bar', num: 42, nested: { a: true } };
      const encrypted = encrypt(JSON.stringify(data));
      const decrypted = JSON.parse(decrypt(encrypted.encryptedContent, encrypted.contentEncryptionKeyId));

      expect(decrypted).toEqual(data);
    });
  });

  describe('generateContentEncryptionKey', () => {
    it('returns valid base64-encoded key JSON', () => {
      const keyJson = generateContentEncryptionKey();
      const parsed = JSON.parse(keyJson);

      expect(parsed.key).toBeDefined();
      expect(Buffer.from(parsed.key, 'base64').length).toBe(32);
      expect(parsed.isActive).toBe(false);
    });
  });

  describe('getActiveKeyId', () => {
    it('returns the configured active key ID', () => {
      const keyId = getActiveKeyId();
      expect(keyId).toBe(testKeyId);
    });
  });
});
