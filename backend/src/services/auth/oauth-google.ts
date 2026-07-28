import { prisma } from '../../db/prisma';
import { getEnv } from '../../config/env';
import { logger } from '../../utils/logger';
import { UnauthorizedError, ValidationError } from '../../utils/errors';
import { generateId } from '../../utils/id';
import { generateTokenPair, storeRefreshToken, UserPayload, TokenPair } from './index';

const env = getEnv();

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  refresh_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export async function googleOAuth(code: string, redirectUri: string): Promise<{ user: UserPayload; tokens: TokenPair }> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new ValidationError('Google OAuth is not configured');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    logger.error('Google token exchange failed', undefined, { status: tokenRes.status, body: errBody });
    throw new UnauthorizedError('Failed to authenticate with Google');
  }

  const tokenData: GoogleTokenResponse = await tokenRes.json();

  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userInfoRes.ok) {
    throw new UnauthorizedError('Failed to fetch Google user info');
  }

  const googleUser: GoogleUserInfo = await userInfoRes.json();

  if (!googleUser.verified_email) {
    throw new ValidationError('Google account email is not verified');
  }

  const oauthSubject = `google_${googleUser.id}`;

  let user = await prisma.user.findFirst({
    where: { oauthProvider: 'google', oauthSubject },
  });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: googleUser.email.toLowerCase() },
    });

    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { oauthProvider: 'google', oauthSubject },
      });
      logger.info('Google OAuth linked to existing user', { userId: user.id, email: googleUser.email });
    } else {
      user = await prisma.user.create({
        data: {
          id: generateId('user'),
          email: googleUser.email.toLowerCase(),
          displayName: googleUser.name?.substring(0, 100) || googleUser.given_name,
          emailVerified: true,
          accountType: 'STANDARD',
          oauthProvider: 'google',
          oauthSubject,
          termsAcceptedAt: new Date(),
          termsVersion: '1.0',
        },
      });
      logger.info('User created via Google OAuth', { userId: user.id, email: googleUser.email });
    }
  }

  const tokens = generateTokenPair({ id: user.id, email: user.email, accountType: user.accountType });
  await storeRefreshToken(user.id, tokens.refreshToken);

  return {
    user: { id: user.id, email: user.email, role: user.accountType, emailVerified: user.emailVerified },
    tokens,
  };
}
