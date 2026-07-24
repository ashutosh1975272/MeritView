import crypto from 'crypto';
import { logger } from '../utils/logger';
import { prisma } from '../db/prisma';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export interface EncryptedContent {
  encryptedContent: string;
  contentEncryptionKeyId: string;
}

export interface EncryptionKeyRecord {
  id: string;
  keyId: string;
  keyBytes: Buffer;
  isActive: boolean;
  rotatedAt: Date | null;
  createdAt: Date;
}

type KeysSource = () => EncryptionKeyRecord[];

let keysSource: KeysSource;
let activeKeyCache: { keyId: string; keyBytes: Buffer } | null = null;

export function configureKeys(source: KeysSource): void {
  keysSource = source;
  activeKeyCache = null;
}

function getActiveKeys(): EncryptionKeyRecord[] {
  if (!keysSource) {
    const key1 = process.env.ENCRYPTION_KEY_1;
    if (!key1) {
      throw new Error('No active encryption key configured');
    }

    const keyBytes = Buffer.from(key1, 'base64');
    const keyId = crypto.createHash('sha256').update(keyBytes).digest('hex').slice(0, 16);

    return [
      {
        id: 'key_1',
        keyId,
        keyBytes,
        isActive: true,
        rotatedAt: null,
        createdAt: new Date(),
      },
    ];
  }

  return keysSource();
}

export function getActiveKeyId(): string {
  const keys = getActiveKeys();
  const active = keys.find(k => k.isActive);
  if (!active) {
    throw new Error('No active encryption key configured');
  }
  return active.keyId;
}

export function getKeyBytes(keyId: string): Buffer {
  const keys = getActiveKeys();
  const key = keys.find(k => k.keyId === keyId);
  if (!key) {
    throw new Error(`Encryption key not found: ${keyId}`);
  }
  return key.keyBytes;
}

export function encrypt(content: string): EncryptedContent;
export function encrypt(content: string, keyId?: string): EncryptedContent;
export function encrypt(content: string, keyId?: string): EncryptedContent {
  const contentKeyId = keyId || getActiveKeyId();
  const keyBytes = getKeyBytes(contentKeyId);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBytes, iv);

  const encrypted = Buffer.concat([
    cipher.update(content, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();
  const encryptedContent = Buffer.concat([iv, authTag, encrypted]).toString('base64');

  return {
    encryptedContent,
    contentEncryptionKeyId: contentKeyId,
  };
}

export function decrypt(encryptedContent: string, keyId: string): string {
  const keyBytes = getKeyBytes(keyId);

  const buffer = Buffer.from(encryptedContent, 'base64');
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBytes, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

export function generateContentEncryptionKey(): string {
  const keyBytes = crypto.randomBytes(KEY_LENGTH);
  const id = `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  return JSON.stringify({
    id,
    key: keyBytes.toString('base64'),
    isActive: false,
    createdAt: new Date().toISOString(),
  });
}

export function rotateEncryptionKey(): { oldKeyId: string; newKeyId: string; newKeyJson: string } {
  const keys = getActiveKeys();
  const activeKey = keys.find(k => k.isActive);

  if (!activeKey) {
    throw new Error('No active key to rotate from');
  }

  const oldKeyId = activeKey.keyId;
  const newKeyBytes = crypto.randomBytes(KEY_LENGTH);
  const newKeyId = `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

  const newKeyJson = JSON.stringify({
    id: newKeyId,
    key: newKeyBytes.toString('base64'),
    isActive: true,
    createdAt: new Date().toISOString(),
  });

  logger.info('Encryption key rotated', {
    oldKeyId,
    newKeyId,
  });

  return { oldKeyId, newKeyId, newKeyJson };
}

async function auditLogKeyRotation(oldKeyId: string, newKeyId: string): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        eventType: 'encryption_key_rotation',
        entityType: 'encryption_key',
        entityId: newKeyId,
        metadata: {
          oldKeyId,
          newKeyId,
          rotatedAt: new Date().toISOString(),
        } as any,
        ipAddress: 'system',
        userAgent: 'system',
      },
    });
  } catch (error) {
    logger.warn('Failed to log key rotation audit', { error: String(error) });
  }
}
