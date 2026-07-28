import * as crypto from 'crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 0x1f];
  }

  return output;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, '').toUpperCase();
  const bits: number[] = [];

  for (const char of cleaned) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    bits.push(idx);
  }

  const buffer: number[] = [];
  let value = 0;
  let bitCount = 0;

  for (const b of bits) {
    value = (value << 5) | b;
    bitCount += 5;
    if (bitCount >= 8) {
      buffer.push((value >> (bitCount - 8)) & 0xff);
      bitCount -= 8;
    }
  }

  return Buffer.from(buffer);
}

export function generateTotpSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

export function generateTotpCode(secret: string): string {
  const counter = BigInt(Math.floor(Date.now() / 30000));
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);

  const decodedSecret = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', decodedSecret).update(counterBuffer).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const expected = generateTotpCode(secret);
  if (expected === code) return true;

  const counter = BigInt(Math.floor((Date.now() - 30000) / 30000));
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);

  const decodedSecret = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', decodedSecret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const prevCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (prevCode % 1000000).toString().padStart(6, '0') === code;
}

export function generateTotpUri(
  secret: string,
  email: string,
  issuer: string = 'MeritView'
): string {
  return `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}
