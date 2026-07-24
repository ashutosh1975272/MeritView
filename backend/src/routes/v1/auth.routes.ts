import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { registerRateLimiter, authRateLimiter } from '../../middleware/rateLimit';
import { registerUser, verifyEmail, loginUser, refreshTokens, logoutUser, requestPasswordReset, completePasswordReset } from '../../services/auth';
import { logger } from '../../utils/logger';
import { UnauthorizedError, ForbiddenError, ConflictError, NotFoundError } from '../../utils/errors';
import bcrypt from 'bcrypt';

const router = Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(128).regex(/^(?=.*[A-Za-z])(?=.*\d)/),
    displayName: z.string().max(100).optional(),
    acceptTerms: z.boolean().refine(v => v === true, 'Terms must be accepted'),
    marketingOptIn: z.boolean().optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email().max(255),
    password: z.string().min(1),
  }),
});

const verifySchema = z.object({
  body: z.object({
    token: z.string().min(1),
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
    logger.info('User registered', { userId: result.user.id, email: result.user.email });
    res.status(201).json({
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', authRateLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await loginUser(req.body.email, req.body.password);
    logger.info('User logged in', { userId: result.user.id, email: result.user.email });
    res.json({
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-email', validate(verifySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await verifyEmail(req.body.token);
    logger.info('Email verified via token');
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokens = await refreshTokens(req.body.refreshToken);
    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
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

router.post('/password-reset/request', validate(passwordResetRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await requestPasswordReset(req.body.email);
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    next(error);
  }
});

router.post('/password-reset/complete', validate(passwordResetCompleteSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await completePasswordReset(req.body.token, req.body.password);
    logger.info('Password reset completed');
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };