import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { getMe, updateMe, deleteAccount } from '../../services/auth';
import { logger } from '../../utils/logger';
import { NotFoundError, ValidationError } from '../../utils/errors';

const router = Router();

const updateMeSchema = z.object({
  body: z.object({
    displayName: z.string().max(100).optional(),
    marketingOptIn: z.boolean().optional(),
    preferredLlmProvider: z.string().optional(),
  }),
});

router.get('/me', authMiddleware(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await getMe(req.user!.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.patch('/me', authMiddleware(), validate(updateMeSchema), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await updateMe(req.user!.id, req.body);
    logger.info('User profile updated', { userId: req.user!.id });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.delete('/me', authMiddleware(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await deleteAccount(req.user!.id);
    logger.info('Account deleted', { userId: req.user!.id });
    res.status(202).json({ message: 'Account deletion initiated' });
  } catch (error) {
    next(error);
  }
});

export { router as userRouter };