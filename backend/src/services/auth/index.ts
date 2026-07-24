import { getEnv } from '../../config/env';
import { redis } from '../../config/redis';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { 
  UnauthorizedError, 
  ForbiddenError, 
  ValidationError, 
  NotFoundError,
  ConflictError
} from '../../utils/errors';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

const env = getEnv();

const BCRYPT_COST = 12;
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
const PASSWORD_RESET_TTL = 60 * 60; // 1 hour
const VERIFICATION_TOKEN_TTL = 24 * 60 * 60; // 24 hours

export interface UserPayload {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateTokenPair(user: { id: string; email: string; accountType: string }): TokenPair {
  const payload = { userId: user.id, email: user.email, role: user.accountType, type: 'access' as const };
  
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { 
    expiresIn: env.JWT_ACCESS_EXPIRY,
    issuer: 'meritview',
    audience: 'meritview-api',
  } as jwt.SignOptions);
  
  const refreshToken = generateToken();
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}

async function storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  const tokenData = { userId, createdAt: Date.now() };
  
  await redis.setex(`refresh:${tokenHash}`, REFRESH_TOKEN_TTL, JSON.stringify(tokenData));
}

export async function registerUser(data: {
  email: string;
  password: string;
  displayName?: string;
  acceptTerms: boolean;
  marketingOptIn?: boolean;
}): Promise<{ user: UserPayload; tokens: TokenPair }> {
  const normalizedEmail = data.email.toLowerCase().trim();
  
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing && !existing.deletedAt) {
    throw new ValidationError('Email already registered');
  }

  if (!data.acceptTerms) {
    throw new ValidationError('Terms must be accepted');
  }

  if (data.password.length < 8 || !/[a-zA-Z]/.test(data.password) || !/[0-9]/.test(data.password)) {
    throw new ValidationError('Password must be at least 8 characters with at least 1 letter and 1 number');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST);
  const verificationToken = generateToken();
  const verificationTokenHash = hashToken(verificationToken);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      displayName: data.displayName?.trim()?.substring(0, 100),
      marketingOptIn: data.marketingOptIn || false,
      emailVerified: false,
      accountType: 'STANDARD',
    },
  });

  await redis.setex(`verify:${verificationTokenHash}`, VERIFICATION_TOKEN_TTL, user.id);

  // TODO: Send verification email
  logger.info('Verification email queued', { userId: user.id });

  const tokens = generateTokenPair({ 
    id: user.id, 
    email: user.email, 
    accountType: user.accountType 
  });
  
  await storeRefreshToken(user.id, tokens.refreshToken);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.accountType,
      emailVerified: user.emailVerified,
    },
    tokens,
  };
}

export async function verifyEmail(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  const userId = await redis.get(`verify:${tokenHash}`);
  
  if (!userId) {
    throw new ValidationError('Invalid or expired verification token');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });

  await redis.del(`verify:${tokenHash}`);
  
  logger.info('Email verified', { userId });
}

export async function loginUser(email: string, password: string): Promise<{ user: UserPayload; tokens: TokenPair }> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  
  if (!user || user.deletedAt) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!user.passwordHash) {
    throw new UnauthorizedError('Please use OAuth to sign in');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!user.emailVerified) {
    throw new ForbiddenError('Email verification required');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = generateTokenPair({ 
    id: user.id, 
    email: user.email, 
    accountType: user.accountType 
  });
  
  await storeRefreshToken(user.id, tokens.refreshToken);

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.accountType,
      emailVerified: user.emailVerified,
    },
    tokens,
  };
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const tokenHash = hashToken(refreshToken);
  const stored = await redis.get(`refresh:${tokenHash}`);
  
  if (!stored) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const { userId } = JSON.parse(stored);
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    throw new UnauthorizedError('User not found');
  }

  await redis.del(`refresh:${tokenHash}`);
  
  const tokens = generateTokenPair({ 
    id: user.id, 
    email: user.email, 
    accountType: user.accountType 
  });
  
  await storeRefreshToken(user.id, tokens.refreshToken);

  return tokens;
}

export async function logoutUser(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await redis.del(`refresh:${tokenHash}`);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  
  if (!user) {
    // Don't reveal if user exists
    return;
  }

  const resetToken = generateToken();
  const resetTokenHash = hashToken(resetToken);
  
  await redis.setex(`reset:${resetTokenHash}`, PASSWORD_RESET_TTL, user.id);
  
  // TODO: Send password reset email
  logger.info('Password reset email queued', { userId: user.id });
}

export async function completePasswordReset(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);
  const userId = await redis.get(`reset:${tokenHash}`);
  
  if (!userId) {
    throw new ValidationError('Invalid or expired reset token');
  }

  if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    throw new ValidationError('Password must be at least 8 characters with at least 1 letter and 1 number');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await redis.del(`reset:${tokenHash}`);
  
  // Invalidate all refresh tokens for this user
  const keys = await redis.keys('refresh:*');
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      const { userId: storedUserId } = JSON.parse(data);
      if (storedUserId === userId) {
        await redis.del(key);
      }
    }
  }

  logger.info('Password reset completed', { userId });
}

export async function getMe(userId: string): Promise<UserPayload> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, accountType: true, emailVerified: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    throw new NotFoundError('User not found');
  }

  return {
    id: user.id,
    email: user.email,
    role: user.accountType,
    emailVerified: user.emailVerified,
  };
}

export async function updateMe(userId: string, data: {
  displayName?: string;
  marketingOptIn?: boolean;
  preferredLlmProvider?: string;
}): Promise<UserPayload> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.displayName !== undefined && { displayName: data.displayName.substring(0, 100) }),
      ...(data.marketingOptIn !== undefined && { marketingOptIn: data.marketingOptIn }),
      ...(data.preferredLlmProvider !== undefined && { preferredLlmProvider: data.preferredLlmProvider }),
    },
    select: { id: true, email: true, accountType: true, emailVerified: true },
  });

  return {
    id: user.id,
    email: user.email,
    role: user.accountType,
    emailVerified: user.emailVerified,
  };
}

export async function deleteAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { 
      disputes: { 
        where: { 
          state: { notIn: ['COMPLETED', 'WITHDRAWN', 'DECLINED'] } 
        } 
      } 
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (user.disputes.length > 0) {
    throw new ValidationError('Cannot delete account with active disputes');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { 
      deletedAt: new Date(), 
      email: `deleted_${userId}@meritview.app` 
    },
  });

  // Invalidate all refresh tokens
  const keys = await redis.keys('refresh:*');
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      const { userId: storedUserId } = JSON.parse(data);
      if (storedUserId === userId) {
        await redis.del(key);
      }
    }
  }

  logger.info('Account deleted', { userId });
}

export async function verifyAccessToken(token: string): Promise<UserPayload> {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'meritview',
      audience: 'meritview-api',
    }) as { userId: string; email: string; role: string; type: string };
    
    if (decoded.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }
    
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedError('User not found');
    }
    
    return {
      id: user.id,
      email: user.email,
      role: user.accountType,
      emailVerified: user.emailVerified,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw error;
  }
}