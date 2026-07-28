import * as crypto from 'crypto';

export type IdPrefix = 'user' | 'disp' | 'party' | 'brief' | 'opin' | 'pay' | 'doc' | 'inv' | 'eval' | 'bps' | 'aud';

export function generateId(prefix: IdPrefix): string {
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${random}`;
}

export const PREFIXED_ID_PATTERN = /^[a-z]+_[a-f0-9]{8}$/;

export const ANY_ID_PATTERN = /^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
