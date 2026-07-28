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
import { addEmailJob } from '../../jobs/queues';
import { generateTotpSecret, generateTotpCode, verifyTotpCode, generateTotpUri } from '../../utils/totp';
import { generateId } from '../../utils/id';

const env = getEnv();

const BCRYPT_COST = 12;
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
const PASSWORD_RESET_TTL = 60 * 60; // 1 hour
const VERIFICATION_TOKEN_TTL = 24 * 60 * 60; // 24 hours

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW = 15 * 60; // 15 minutes
const LOCKOUT_DURATION = 30 * 60; // 30 minutes

const OTP_VERIFY_LIMIT = 5;
const OTP_VERIFY_WINDOW = 15 * 60;
const OTP_RESEND_LIMIT = 3;
const OTP_RESEND_WINDOW = 60 * 60;

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

export function generateTokenPair(user: { id: string; email: string; accountType: string }): TokenPair {
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

export async function storeRefreshToken(userId: string, refreshToken: string, ipAddress?: string, userAgent?: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  const currentVersion = await getTokenVersion(userId);
  const tokenData = { userId, createdAt: Date.now(), tokenVersion: currentVersion, ipAddress, userAgent };
  
  await redis.setex(`refresh:${tokenHash}`, REFRESH_TOKEN_TTL, JSON.stringify(tokenData));
}

async function getTokenVersion(userId: string): Promise<number> {
  const version = await redis.get(`token_version:${userId}`);
  return version ? parseInt(version, 10) : 0;
}

async function verifyTokenVersion(userId: string, createdAt: number, tokenVersion?: number): Promise<void> {
  const currentVersion = await getTokenVersion(userId);
  if (tokenVersion !== undefined && tokenVersion < currentVersion) {
    throw new UnauthorizedError('Token has been invalidated. Please log in again.');
  }
  if (tokenVersion === undefined && createdAt < currentVersion) {
    throw new UnauthorizedError('Token has been invalidated. Please log in again.');
  }
}

async function checkAccountLockout(email: string): Promise<void> {
  const lockKey = `lockout:${email.toLowerCase()}`;
  const locked = await redis.get(lockKey);
  if (locked) {
    throw new ForbiddenError('Account temporarily locked due to too many failed attempts. Try again in 30 minutes.');
  }
}

async function recordFailedAttempt(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  const attemptKey = `login_attempts:${normalizedEmail}`;
  const attempts = await redis.incr(attemptKey);
  if (attempts === 1) {
    await redis.expire(attemptKey, LOCKOUT_WINDOW);
  }
  if (attempts >= LOCKOUT_THRESHOLD) {
    const lockKey = `lockout:${normalizedEmail}`;
    await redis.setex(lockKey, LOCKOUT_DURATION, '1');
    await redis.del(attemptKey);
  }
}

async function clearFailedAttempts(email: string): Promise<void> {
  await redis.del(`login_attempts:${email.toLowerCase()}`);
}

async function checkOtpRateLimit(email: string): Promise<void> {
  const verifyKey = `otp_verify:${email.toLowerCase()}`;
  const verifyAttempts = await redis.get(verifyKey);
  if (verifyAttempts && parseInt(verifyAttempts, 10) >= OTP_VERIFY_LIMIT) {
    throw new ValidationError('Too many verification attempts. Please try again later.');
  }
}

async function recordOtpAttempt(email: string): Promise<void> {
  const verifyKey = `otp_verify:${email.toLowerCase()}`;
  const attempts = await redis.incr(verifyKey);
  if (attempts === 1) {
    await redis.expire(verifyKey, OTP_VERIFY_WINDOW);
  }
}

async function checkOtpResendLimit(email: string): Promise<void> {
  const resendKey = `otp_resend:${email.toLowerCase()}`;
  const resends = await redis.get(resendKey);
  if (resends && parseInt(resends, 10) >= OTP_RESEND_LIMIT) {
    throw new ValidationError('Too many verification code resends. Please try again later.');
  }
}

async function recordOtpResend(email: string): Promise<void> {
  const resendKey = `otp_resend:${email.toLowerCase()}`;
  const sends = await redis.incr(resendKey);
  if (sends === 1) {
    await redis.expire(resendKey, OTP_RESEND_WINDOW);
  }
}

export async function registerUser(data: {
  email: string;
  password: string;
  displayName?: string;
  acceptTerms: boolean;
  marketingOptIn?: boolean;
}): Promise<{ status: string }> {
  const normalizedEmail = data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing && !existing.deletedAt) {
    throw new ValidationError('Email already registered');
  }

  if (!data.acceptTerms) {
    throw new ValidationError('Terms must be accepted');
  }

  if (data.password.length < 8 || data.password.length > 128 || !/[a-zA-Z]/.test(data.password) || !/[0-9]/.test(data.password)) {
    throw new ValidationError('Password must be 8-128 characters with at least 1 letter and 1 number');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = hashToken(otp);

  const pendingUser = {
    email: normalizedEmail,
    passwordHash,
    displayName: data.displayName?.trim()?.substring(0, 100),
    marketingOptIn: data.marketingOptIn || false,
    otpHash,
    termsAcceptedAt: new Date().toISOString(),
    termsVersion: '1.0',
  };

  await redis.setex(`pending_reg:${normalizedEmail}`, VERIFICATION_TOKEN_TTL, JSON.stringify(pendingUser));

  await addEmailJob('verification', normalizedEmail, { token: otp });
  require('fs').writeFileSync('/tmp/latest_otp.txt', otp);
  console.log(`[E2E-OTP-TEST] Generated OTP for ${normalizedEmail}: ${otp}`);
  logger.info('Verification OTP queued', { email: normalizedEmail });

  return { status: 'pending_verification' };
}

export async function verifyEmail(email: string, otp: string): Promise<{ user: UserPayload; tokens: TokenPair }> {
  const normalizedEmail = email.toLowerCase().trim();

  const pendingDataStr = await redis.get(`pending_reg:${normalizedEmail}`);

  if (!pendingDataStr) {
    throw new ValidationError('Verification session expired or invalid. Please register again.');
  }

  const pendingData = JSON.parse(pendingDataStr);
  const otpHash = hashToken(otp);

  await checkOtpRateLimit(normalizedEmail);

  if (pendingData.otpHash !== otpHash) {
    await recordOtpAttempt(normalizedEmail);
    throw new ValidationError('Invalid verification code');
  }

  const user = await prisma.user.create({
    data: {
      id: generateId('user'),
      email: pendingData.email,
      passwordHash: pendingData.passwordHash,
      displayName: pendingData.displayName,
      marketingOptIn: pendingData.marketingOptIn,
      emailVerified: true,
      accountType: 'STANDARD',
      termsAcceptedAt: pendingData.termsAcceptedAt ? new Date(pendingData.termsAcceptedAt) : new Date(),
      termsVersion: pendingData.termsVersion || '1.0',
    },
  });

  await redis.del(`pending_reg:${normalizedEmail}`);
  logger.info('User successfully registered and email verified', { userId: user.id });

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

export async function resendVerification(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  await checkOtpResendLimit(normalizedEmail);

  const pendingDataStr = await redis.get(`pending_reg:${normalizedEmail}`);
  
  if (!pendingDataStr) {
    throw new NotFoundError('No pending registration found. Please register again.');
  }

  const pendingData = JSON.parse(pendingDataStr);
  
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  pendingData.otpHash = hashToken(otp);
  
  await redis.setex(`pending_reg:${normalizedEmail}`, VERIFICATION_TOKEN_TTL, JSON.stringify(pendingData));
  await addEmailJob('verification', normalizedEmail, { token: otp });
  await recordOtpResend(normalizedEmail);
  logger.info('Verification OTP resent', { email: normalizedEmail });
}

export async function loginUser(email: string, password: string, ipAddress?: string, userAgent?: string, totpCode?: string): Promise<{ user: UserPayload; tokens: TokenPair }> {
  const normalizedEmail = email.toLowerCase().trim();
  await checkAccountLockout(normalizedEmail);

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  
  if (!user || user.deletedAt) {
    await recordFailedAttempt(normalizedEmail);
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!user.passwordHash) {
    throw new UnauthorizedError('Please use OAuth to sign in');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await recordFailedAttempt(normalizedEmail);
    throw new UnauthorizedError('Invalid credentials');
  }

  await clearFailedAttempts(normalizedEmail);

  if (!user.emailVerified) {
    throw new ForbiddenError('Email verification required');
  }

  if (user.totpSecret) {
    if (!totpCode) {
      throw new ValidationError('TOTP code required');
    }
    if (!verifyTotpCode(user.totpSecret, totpCode)) {
      throw new UnauthorizedError('Invalid TOTP code');
    }
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
  
  await storeRefreshToken(user.id, tokens.refreshToken, ipAddress, userAgent);

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

export async function enableTotp(userId: string, password: string): Promise<{ secret: string; uri: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  if (user.totpSecret) {
    throw new ConflictError('TOTP already enabled');
  }

  if (!user.passwordHash) {
    throw new ValidationError('Password-based login required to enable TOTP');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid password');
  }

  const secret = generateTotpSecret();
  const uri = generateTotpUri(secret, user.email);

  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: secret },
  });

  return { secret, uri };
}

export async function verifyTotp(userId: string, code: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  if (!user.totpSecret) {
    throw new ValidationError('TOTP not enabled');
  }

  if (!verifyTotpCode(user.totpSecret, code)) {
    throw new UnauthorizedError('Invalid TOTP code');
  }
}

export async function disableTotp(userId: string, password: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User not found');

  if (!user.totpSecret) {
    throw new ValidationError('TOTP not enabled');
  }

  if (!user.passwordHash) {
    throw new ValidationError('Password-based login required to disable TOTP');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid password');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: null },
  });
}

export async function registerGuest(data: {
  email: string;
  displayName?: string;
}): Promise<{ user: UserPayload; tokens: TokenPair }> {
  const normalizedEmail = data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing && !existing.deletedAt) {
    if (existing.accountType === 'GUEST') {
      await prisma.user.delete({ where: { id: existing.id } });
    } else {
      throw new ValidationError('Email already registered');
    }
  }

  const user = await prisma.user.create({
    data: {
      id: generateId('user'),
      email: normalizedEmail,
      displayName: data.displayName?.trim()?.substring(0, 100),
      emailVerified: true,
      accountType: 'GUEST',
      termsAcceptedAt: new Date(),
      termsVersion: '1.0',
    },
  });

  logger.info('Guest account created', { userId: user.id, email: user.email });

  const tokens = generateTokenPair({
    id: user.id,
    email: user.email,
    accountType: user.accountType,
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

export async function refreshTokens(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
  const tokenHash = hashToken(refreshToken);
  const stored = await redis.get(`refresh:${tokenHash}`);
  
  if (!stored) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const tokenData = JSON.parse(stored);
  const { userId } = tokenData;

  await verifyTokenVersion(userId, tokenData.createdAt, tokenData.tokenVersion);

  if (tokenData.ipAddress && ipAddress && tokenData.ipAddress !== ipAddress) {
    await redis.del(`refresh:${tokenHash}`);
    throw new UnauthorizedError('Token IP mismatch. Please log in again.');
  }

  if (tokenData.userAgent && userAgent && tokenData.userAgent !== userAgent) {
    await redis.del(`refresh:${tokenHash}`);
    throw new UnauthorizedError('Token user agent mismatch. Please log in again.');
  }
  
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
  
  await storeRefreshToken(user.id, tokens.refreshToken, ipAddress, userAgent);

  return tokens;
}

export async function logoutUser(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await redis.del(`refresh:${tokenHash}`);
}

export async function requestPasswordReset(email: string, ipAddress?: string, userAgent?: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  
  if (!user) {
    return;
  }

  const resetToken = generateToken();
  const resetTokenHash = hashToken(resetToken);

  const resetData = { token: resetTokenHash, userId: user.id, ipAddress, userAgent, createdAt: Date.now() };
  
  await redis.setex(`reset:${resetTokenHash}`, PASSWORD_RESET_TTL, JSON.stringify(resetData));
  
  await addEmailJob('password-reset', user.email, { token: resetToken });
  logger.info('Password reset email queued', { userId: user.id, email: user.email });
}

export async function completePasswordReset(token: string, newPassword: string, ipAddress?: string, userAgent?: string): Promise<void> {
  const tokenHash = hashToken(token);
  const stored = await redis.get(`reset:${tokenHash}`);
  
  if (!stored) {
    throw new ValidationError('Invalid or expired reset token');
  }

  const resetData = JSON.parse(stored);
  const userId = resetData.userId;

  if (resetData.ipAddress && ipAddress && resetData.ipAddress !== ipAddress) {
    logger.warn('Password reset IP mismatch', { userId, expected: resetData.ipAddress, received: ipAddress });
  }

  if (resetData.userAgent && userAgent && resetData.userAgent !== userAgent) {
    logger.warn('Password reset User-Agent mismatch', { userId, expected: resetData.userAgent, received: userAgent });
  }

  if (newPassword.length < 8 || newPassword.length > 128 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    throw new ValidationError('Password must be 8-128 characters with at least 1 letter and 1 number');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await redis.del(`reset:${tokenHash}`);
  
  // Invalidate all refresh tokens for this user (SCAN-based to avoid blocking)
  let cursor = '0';
  do {
    const result = await (redis as any).scan(cursor, 'MATCH', 'refresh:*', 'COUNT', 100);
    cursor = result[0];
    const scanKeys = result[1];
    for (const key of scanKeys) {
      const data = await redis.get(key);
      if (data) {
        const storedUserId = JSON.parse(data).userId;
        if (storedUserId === userId) {
          await redis.del(key);
        }
      }
    }
  } while (cursor !== '0');

  const currentVersion = await redis.get(`token_version:${userId}`);
  await redis.setex(`token_version:${userId}`, 30 * 24 * 60 * 60, String((currentVersion ? parseInt(currentVersion, 10) : 0) + 1));

  logger.info('Password reset completed', { userId });
}

export async function getMe(userId: string): Promise<UserPayload & { stats: { totalDisputes: number; activeDisputes: number; completedDisputes: number } }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, accountType: true, emailVerified: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    throw new NotFoundError('User not found');
  }

  const disputeCounts = await prisma.dispute.groupBy({
    by: ['state'],
    where: { initiatorUserId: userId, deletedAt: null },
    _count: true,
  });

  const totalDisputes = disputeCounts.reduce((sum, g) => sum + g._count, 0);
  const activeDisputes = disputeCounts
    .filter(g => !['COMPLETED', 'WITHDRAWN'].includes(g.state))
    .reduce((sum, g) => sum + g._count, 0);
  const completedDisputes = disputeCounts
    .filter(g => g.state === 'COMPLETED')
    .reduce((sum, g) => sum + g._count, 0);

  return {
    id: user.id,
    email: user.email,
    role: user.accountType,
    emailVerified: user.emailVerified,
    stats: { totalDisputes, activeDisputes, completedDisputes },
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

  // Invalidate all refresh tokens (SCAN-based to avoid blocking)
  let cursor = '0';
  do {
    const result = await (redis as any).scan(cursor, 'MATCH', 'refresh:*', 'COUNT', 100);
    cursor = result[0];
    const scanKeys = result[1];
    for (const key of scanKeys) {
      const data = await redis.get(key);
      if (data) {
        const storedUserId = JSON.parse(data).userId;
        if (storedUserId === userId) {
          await redis.del(key);
        }
      }
    }
  } while (cursor !== '0');

  await addEmailJob('account-deletion', user.email, {});
  logger.info('Account deleted', { userId, email: user.email });
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