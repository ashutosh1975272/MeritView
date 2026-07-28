import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { prisma } from '../../db/prisma';
import { getEnv } from '../../config/env';
import { logger } from '../../utils/logger';
import { UnauthorizedError, ValidationError } from '../../utils/errors';
import { generateId } from '../../utils/id';
import { generateTokenPair, storeRefreshToken, UserPayload, TokenPair } from './index';

const env = getEnv();

interface AppleJWK {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

interface AppleJWKS {
  keys: AppleJWK[];
}

interface AppleIdentityPayload {
  sub: string;
  email: string;
  email_verified?: boolean | string;
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  nonce?: string;
  nonce_supported?: boolean;
}

async function fetchApplePublicKeys(): Promise<AppleJWK[]> {
  const res = await fetch('https://appleid.apple.com/auth/keys');
  if (!res.ok) {
    throw new UnauthorizedError('Failed to fetch Apple public keys');
  }
  const data: AppleJWKS = await res.json();
  return data.keys;
}

function jwkToPublicKey(jwk: AppleJWK): crypto.KeyObject {
  const n = Buffer.from(jwk.n, 'base64url');
  const e = Buffer.from(jwk.e, 'base64url');
  const key = crypto.createPublicKey({
    key: { kty: jwk.kty, n: n.toString('base64url'), e: e.toString('base64url') },
    format: 'jwk',
  });
  return key;
}

function extractKid(identityToken: string): string {
  const header = JSON.parse(Buffer.from(identityToken.split('.')[0], 'base64url').toString('utf-8'));
  if (!header.kid) {
    throw new ValidationError('Apple identity token missing kid header');
  }
  return header.kid;
}

export async function appleOAuth(
  identityToken: string,
  userData?: { name?: { firstName?: string; lastName?: string } },
): Promise<{ user: UserPayload; tokens: TokenPair }> {
  if (!env.APPLE_CLIENT_ID) {
    throw new ValidationError('Apple OAuth is not configured');
  }

  const keys = await fetchApplePublicKeys();
  const kid = extractKid(identityToken);

  const jwk = keys.find(k => k.kid === kid);
  if (!jwk) {
    throw new UnauthorizedError('Unable to find matching Apple public key');
  }

  const publicKey = jwkToPublicKey(jwk);

  let payload: AppleIdentityPayload;
  try {
    payload = jwt.verify(identityToken, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: env.APPLE_CLIENT_ID,
    }) as AppleIdentityPayload;
  } catch (err) {
    logger.error('Apple identity token verification failed', err instanceof Error ? err : undefined);
    throw new UnauthorizedError('Invalid Apple identity token');
  }

  const appleUserId = payload.sub;
  const email = payload.email?.toLowerCase().trim();
  const oauthSubject = `apple_${appleUserId}`;

  let user = await prisma.user.findFirst({
    where: { oauthProvider: 'apple', oauthSubject },
  });

  if (!user) {
    if (email) {
      const existingByEmail = await prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { oauthProvider: 'apple', oauthSubject },
        });
        logger.info('Apple OAuth linked to existing user', { userId: user.id, email });
      }
    }

    if (!user) {
      if (!email) {
        throw new ValidationError('Apple did not provide an email. Unable to create account.');
      }
      const displayName = userData?.name
        ? [userData.name.firstName, userData.name.lastName].filter(Boolean).join(' ').substring(0, 100) || undefined
        : undefined;

      user = await prisma.user.create({
        data: {
          id: generateId('user'),
          email,
          displayName,
          emailVerified: true,
          accountType: 'STANDARD',
          oauthProvider: 'apple',
          oauthSubject,
          termsAcceptedAt: new Date(),
          termsVersion: '1.0',
        },
      });
      logger.info('User created via Apple OAuth', { userId: user.id, email });
    }
  }

  const tokens = generateTokenPair({ id: user.id, email: user.email, accountType: user.accountType });
  await storeRefreshToken(user.id, tokens.refreshToken);

  return {
    user: { id: user.id, email: user.email, role: user.accountType, emailVerified: user.emailVerified },
    tokens,
  };
}
