import { Router, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { prisma } from '../../db/prisma';
import { getEnv } from '../../config/env';
import { logger } from '../../utils/logger';
import { sseSetup, sseSend } from '../../utils/sse';
import { UnauthorizedError, NotFoundError } from '../../utils/errors';
import {
  getOpinion,
  getOpinionStatus,
  getOpinionPdfDownload,
} from '../../services/opinions';
import { getOpinionPdfPath } from '../../services/opinions/pdf';

const router: Router = Router();
const env = getEnv();

const disputeIdParam = z.object({
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

async function sseAuthMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new UnauthorizedError('Missing authentication token');
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      email: string;
      type: string;
    };

    if (decoded.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        accountType: true,
        emailVerified: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedError('User not found');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.accountType,
      accountType: user.accountType,
      emailVerified: user.emailVerified,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Invalid token');
  }
}

router.get(
  '/v1/disputes/:disputeId/opinion',
  authMiddleware(),
  validate(disputeIdParam),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await getOpinion(req.params.disputeId, req.user!.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/v1/disputes/:disputeId/opinion/pdf',
  authMiddleware(),
  validate(disputeIdParam),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { pdf_storage_key: pdfStorageKey } = await getOpinionPdfDownload(
        req.params.disputeId,
        req.user!.id
      );

      const { filePath, filename } = await getOpinionPdfPath(req.params.disputeId);
      res.download(filePath, filename);
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: { code: 'PDF_NOT_FOUND', message: error.message } });
        return;
      }
      next(error);
    }
  }
);

router.get(
  '/v1/disputes/:disputeId/opinion/status',
  authMiddleware(),
  validate(disputeIdParam),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const status = await getOpinionStatus(req.params.disputeId, req.user!.id);
      res.json(status);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/v1/disputes/:disputeId/opinion/stream',
  sseAuthMiddleware,
  validate(disputeIdParam),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const status = await getOpinionStatus(req.params.disputeId, req.user!.id);
      const client = sseSetup(req, res);

      sseSend(client.res, 'status', status);

      req.on('close', () => {
        logger.info('SSE client disconnected', {
          disputeId: req.params.disputeId,
        });
      });
    } catch (error) {
      if (!res.headersSent) {
        next(error);
      }
    }
  }
);

export { router as opinionRouter };
