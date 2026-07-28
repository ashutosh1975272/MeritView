import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, requireEmailVerified, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createRateLimiter } from '../../middleware/rateLimit';
import { saveDraft, submitBrief, getBrief } from '../../services/briefs';
import { createSession, sendMessage, getSession } from '../../services/brief-prep';
import { logger } from '../../utils/logger';
import { redis } from '../../config/redis';
import { prisma } from '../../db/prisma';
import { NotFoundError, ForbiddenError } from '../../utils/errors';

const router: Router = Router();

const briefDraftSchema = z.object({
  body: z.object({
    sections: z.object({
      factualBackground: z.string().max(5000).optional(),
      myPosition: z.string().max(5000).optional(),
      supportingArguments: z.string().max(5000).optional(),
      acknowledgmentOfOpposing: z.string().max(5000).optional(),
      desiredResolution: z.string().max(5000).optional(),
    }).partial(),
    supportingDocumentIds: z.array(z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)).optional(),
  }),
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
    partyId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

const briefSubmitSchema = z.object({
  body: z.object({
    sections: z.object({
      factualBackground: z.string().min(1).max(5000),
      myPosition: z.string().min(1).max(5000),
      supportingArguments: z.string().min(1).max(5000),
      acknowledgmentOfOpposing: z.string().min(1).max(5000),
      desiredResolution: z.string().min(1).max(5000),
    }),
    supportingDocumentIds: z.array(z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)).optional(),
  }),
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
    partyId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

const briefParamsSchema = z.object({
  params: z.object({
    disputeId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
    partyId: z.string().regex(/^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i),
  }),
});

const submitRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: 'ratelimit:brief:submit',
});

const briefSessionRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 30,
  keyPrefix: 'ratelimit:briefprep',
});

const ID_PATTERN = /^([a-z]+_[a-f0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const createSessionSchema = z.object({
  body: z.object({
    llmProvider: z.string().optional(),
    modelPreference: z.string().optional(),
  }).optional(),
  params: z.object({
    disputeId: z.string().regex(ID_PATTERN),
    partyId: z.string().regex(ID_PATTERN),
  }),
});

const sendMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(5000),
  }),
  params: z.object({
    disputeId: z.string().regex(ID_PATTERN),
    partyId: z.string().regex(ID_PATTERN),
    sessionId: z.string().regex(ID_PATTERN),
  }),
});

const getSessionSchema = z.object({
  params: z.object({
    disputeId: z.string().regex(ID_PATTERN),
    partyId: z.string().regex(ID_PATTERN),
    sessionId: z.string().regex(ID_PATTERN),
  }),
});

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;

router.put(
  '/disputes/:disputeId/parties/:partyId/brief/draft',
  authMiddleware(),
  requireEmailVerified,
  validate(briefDraftSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId, partyId } = req.params;
      const { sections, supportingDocumentIds } = req.body;

      const idempotencyKey = (req.query.key as string) || req.headers['idempotency-key'] as string;
      if (idempotencyKey) {
        const redisKey = `idempotency:brief-draft:${idempotencyKey}`;
        const existing = await redis.get(redisKey);
        if (existing) {
          logger.info('Idempotent brief draft request', { disputeId, partyId, idempotencyKey });
          return res.json(JSON.parse(existing));
        }

        const result = await saveDraft(disputeId, partyId, req.user!.id, sections, supportingDocumentIds);
        await redis.psetex(redisKey, IDEMPOTENCY_TTL, JSON.stringify(result));

        logger.info('Brief draft saved (idempotent)', { userId: req.user!.id, disputeId, partyId, wordCount: result.wordCount });
        return res.json(result);
      }

      const result = await saveDraft(disputeId, partyId, req.user!.id, sections, supportingDocumentIds);

      logger.info('Brief draft saved', { userId: req.user!.id, disputeId, partyId, wordCount: result.wordCount });

      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/disputes/:disputeId/parties/:partyId/brief/submit',
  authMiddleware(),
  requireEmailVerified,
  submitRateLimiter,
  validate(briefSubmitSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId, partyId } = req.params;
      const { sections, supportingDocumentIds } = req.body;

      const result = await submitBrief(disputeId, partyId, req.user!.id, sections, supportingDocumentIds);

      logger.info('Brief submitted', { userId: req.user!.id, disputeId, partyId, briefId: result.brief.id });

      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/disputes/:disputeId/parties/:partyId/brief',
  authMiddleware(),
  requireEmailVerified,
  validate(briefParamsSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId, partyId } = req.params;

      const brief = await getBrief(disputeId, partyId, req.user!.id);

      res.json(brief);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/disputes/:disputeId/parties/:partyId/brief/session',
  authMiddleware(),
  requireEmailVerified,
  briefSessionRateLimiter,
  validate(createSessionSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId, partyId } = req.params;
      const { llmProvider, modelPreference } = req.body || {};
      const session = await createSession(partyId, disputeId, req.user!.id, llmProvider, modelPreference);
      logger.info('Brief prep session created', { sessionId: session.session.id, userId: req.user!.id });
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/disputes/:disputeId/parties/:partyId/brief/session/:sessionId/message',
  authMiddleware(),
  requireEmailVerified,
  briefSessionRateLimiter,
  validate(sendMessageSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { content } = req.body;
      const result = await sendMessage(sessionId, req.user!.id, content);
      logger.info('Brief prep message sent', { sessionId, userId: req.user!.id });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/disputes/:disputeId/parties/:partyId/brief/session/:sessionId',
  authMiddleware(),
  requireEmailVerified,
  validate(getSessionSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const session = await getSession(sessionId, req.user!.id);
      res.json(session);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/brief-sessions/:sessionId',
  authMiddleware(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const session = await prisma.briefPrepSession.findUnique({
        where: { id: sessionId },
        include: { party: true },
      });

      if (!session) {
        throw new NotFoundError('Session not found');
      }

      if (session.party.userId !== req.user!.id) {
        throw new ForbiddenError('You are not a member of this party');
      }

      res.json(session);
    } catch (error) {
      next(error);
    }
  }
);

export { router as briefRouter };
