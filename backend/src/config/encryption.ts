export interface EncryptionKey {
  id: string;
  key: Buffer;
  createdAt: Date;
}

const keys: Map<string, EncryptionKey> = new Map();
let currentKeyId: string = 'key-1';

function loadKeysFromEnv(): void {
  const rawKey1 = process.env.ENCRYPTION_KEY_1;
  const rawKey2 = process.env.ENCRYPTION_KEY_2;

  if (rawKey1) {
    const keyBuffer = Buffer.from(rawKey1, 'hex');
    if (keyBuffer.length !== 32) {
      throw new Error(`ENCRYPTION_KEY_1 must be 32 bytes (64 hex chars), got ${keyBuffer.length * 2} hex chars`);
    }
    keys.set('key-1', { id: 'key-1', key: keyBuffer, createdAt: new Date('2025-01-01') });
    currentKeyId = 'key-1';
  } else {
    const fallback = process.env.ENCRYPTION_KEY;
    if (!fallback) {
      throw new Error('No encryption key configured. Set ENCRYPTION_KEY or ENCRYPTION_KEY_1 in environment.');
    }
    const keyBuffer = Buffer.from(fallback, 'hex');
    if (keyBuffer.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
    }
    keys.set('key-1', { id: 'key-1', key: keyBuffer, createdAt: new Date('2025-01-01') });
    currentKeyId = 'key-1';
  }

  if (rawKey2) {
    const keyBuffer = Buffer.from(rawKey2, 'hex');
    if (keyBuffer.length !== 32) {
      throw new Error('ENCRYPTION_KEY_2 must be 32 bytes (64 hex chars)');
    }
    keys.set('key-2', { id: 'key-2', key: keyBuffer, createdAt: new Date('2025-06-01') });
  }
}

try {
  loadKeysFromEnv();
} catch (err) {
  if (process.env.NODE_ENV !== 'test') {
    console.error('Encryption key loading failed:', (err as Error).message);
    process.exit(1);
  }
}

export function getCurrentKeyId(): string {
  return currentKeyId;
}

export function getKey(keyId: string): EncryptionKey {
  const key = keys.get(keyId);
  if (!key) {
    throw new Error(`Encryption key ${keyId} not found`);
  }
  return key;
}

export function setCurrentKey(keyId: string): void {
  if (!keys.has(keyId)) {
    throw new Error(`Cannot rotate to unknown key: ${keyId}`);
  }
  currentKeyId = keyId;
}

export function addKey(keyId: string, hexKey: string): void {
  const keyBuffer = Buffer.from(hexKey, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex chars)');
  }
  keys.set(keyId, { id: keyId, key: keyBuffer, createdAt: new Date() });
}

export function getAllKeyIds(): string[] {
  return Array.from(keys.keys());
}
