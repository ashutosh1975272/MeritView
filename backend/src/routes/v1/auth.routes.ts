import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { registerRateLimiter, authRateLimiter } from '../../middleware/rateLimit';
import { registerUser, verifyEmail, loginUser, refreshTokens, logoutUser, requestPasswordReset, completePasswordReset, resendVerification, registerGuest, enableTotp, verifyTotp, disableTotp } from '../../services/auth';
import { logger } from '../../utils/logger';
import { UnauthorizedError, ForbiddenError, ConflictError, NotFoundError } from '../../utils/errors';
import { googleOAuth } from '../../services/auth/oauth-google';
import { appleOAuth } from '../../services/auth/oauth-apple';
import bcrypt from 'bcrypt';

const router: Router = Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(128).regex(/^(?=.*[A-Za-z])(?=.*\d)/),
    displayName: z.string().max(100).optional(),
    display_name: z.string().max(100).optional(),
    acceptTerms: z.boolean().refine(v => v === true, 'Terms must be accepted').optional(),
    accept_terms: z.boolean().refine(v => v === true, 'Terms must be accepted').optional(),
    marketingOptIn: z.boolean().optional(),
    marketing_opt_in: z.boolean().optional(),
  }).transform((data) => ({
    email: data.email,
    password: data.password,
    displayName: data.displayName ?? data.display_name ?? undefined,
    acceptTerms: data.acceptTerms ?? data.accept_terms ?? false,
    marketingOptIn: data.marketingOptIn ?? data.marketing_opt_in ?? undefined,
  })),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z.string().min(1),
    totp_code: z.string().length(6).optional(),
  }),
});

const totpEnableSchema = z.object({
  body: z.object({
    password: z.string().min(1),
  }),
});

const totpVerifySchema = z.object({
  body: z.object({
    code: z.string().length(6),
  }),
});

const totpDisableSchema = z.object({
  body: z.object({
    password: z.string().min(1),
  }),
});

const verifySchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

const passwordResetRequestSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
  }),
});

const passwordResetCompleteSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    password: z.string().min(8).max(128).regex(/^(?=.*[A-Za-z])(?=.*\d)/),
  }),
});

router.post('/register', registerRateLimiter, validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await registerUser(req.body);
    logger.info('User registration pending OTP', { email: req.body.email });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/login', authRateLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] as string | undefined;
    const result = await loginUser(req.body.email, req.body.password, ipAddress, userAgent, req.body.totp_code);
    logger.info('User logged in', { userId: result.user.id, email: result.user.email });
    res.json({
      user: result.user,
      access_token: result.tokens.accessToken,
      refresh_token: result.tokens.refreshToken,
      expires_in: result.tokens.expiresIn,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/totp/enable', authMiddleware(), validate(totpEnableSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const result = await enableTotp(req.user!.id, req.body.password);
    logger.info('TOTP setup initiated', { userId: req.user!.id });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/totp/verify', authMiddleware(), validate(totpVerifySchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await verifyTotp(req.user!.id, req.body.code);
    logger.info('TOTP enabled', { userId: req.user!.id });
    res.json({ message: 'TOTP enabled successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/totp/disable', authMiddleware(), validate(totpDisableSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await disableTotp(req.user!.id, req.body.password);
    logger.info('TOTP disabled', { userId: req.user!.id });
    res.json({ message: 'TOTP disabled successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-email', validate(verifySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await verifyEmail(req.body.email, req.body.otp);
    logger.info('Email verified via OTP', { email: req.body.email });
    res.json({
      message: 'Email verified successfully',
      user: result.user,
      access_token: result.tokens.accessToken,
      refresh_token: result.tokens.refreshToken,
      expires_in: result.tokens.expiresIn,
    });
  } catch (error) {
    next(error);
  }
});

const resendSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

router.post('/verify-email/resend', validate(resendSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await resendVerification(req.body.email);
    res.json({ message: 'Verification email resent' });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokens = await refreshTokens(req.body.refreshToken);
    res.json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authMiddleware(), validate(refreshSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await logoutUser(req.body.refreshToken);
    logger.info('User logged out', { userId: req.user?.id });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

const guestRegisterSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    displayName: z.string().max(100).optional(),
  }),
});

router.post('/register-guest', registerRateLimiter, validate(guestRegisterSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await registerGuest(req.body);
    logger.info('Guest registered', { userId: result.user.id, email: req.body.email });
    res.status(201).json({
      message: 'Guest account created',
      user: result.user,
      access_token: result.tokens.accessToken,
      refresh_token: result.tokens.refreshToken,
      expires_in: result.tokens.expiresIn,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/password-reset/request', validate(passwordResetRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] as string | undefined;
    await requestPasswordReset(req.body.email, ipAddress, userAgent);
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
});

router.post('/password-reset/complete', validate(passwordResetCompleteSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] as string | undefined;
    await completePasswordReset(req.body.token, req.body.password, ipAddress, userAgent);
    logger.info('Password reset completed');
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
});

const googleOAuthSchema = z.object({
  body: z.object({
    code: z.string(),
    redirect_uri: z.string().url(),
  }),
});

router.post('/oauth/google', validate(googleOAuthSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await googleOAuth(req.body.code, req.body.redirect_uri);
    logger.info('User authenticated via Google OAuth', { userId: result.user.id });
    res.json({
      user: result.user,
      access_token: result.tokens.accessToken,
      refresh_token: result.tokens.refreshToken,
      expires_in: result.tokens.expiresIn,
    });
  } catch (error) {
    next(error);
  }
});

const appleOAuthSchema = z.object({
  body: z.object({
    identity_token: z.string(),
    user: z.object({
      name: z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      }).optional(),
    }).optional(),
  }),
});

router.post('/oauth/apple', validate(appleOAuthSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await appleOAuth(req.body.identity_token, req.body.user);
    logger.info('User authenticated via Apple OAuth', { userId: result.user.id });
    res.json({
      user: result.user,
      access_token: result.tokens.accessToken,
      refresh_token: result.tokens.refreshToken,
      expires_in: result.tokens.expiresIn,
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };