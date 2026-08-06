import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';
import { createSession, sendMessage, getSession } from '../../services/brief-prep/index.js';
import { verifyDisputeAccess } from '../../services/disputes/index.js';
import { prisma } from '../../db/prisma.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../../utils/errors.js';
import { z } from 'zod';

const router = Router();

const createSessionSchema = z.object({
  llmProvider: z.string().optional(),
  modelPreference: z.string().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
});

router.post(
  '/disputes/:disputeId/parties/:partyId/brief-prep/session',
  authMiddleware(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId, partyId } = req.params;
      const userId = req.user!.id;

      await verifyDisputeAccess(disputeId, userId);

      const party = await prisma.party.findFirst({
        where: { id: partyId, disputeId },
      });

      if (!party || party.userId !== userId) {
        throw new ForbiddenError('You are not a member of this party');
      }

      const input = createSessionSchema.parse(req.body ?? {});

      const result = await createSession(
        partyId,
        disputeId,
        userId,
        input.llmProvider,
        input.modelPreference
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/disputes/:disputeId/parties/:partyId/brief-prep/session/:sessionId/message',
  authMiddleware(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId, partyId, sessionId } = req.params;
      const userId = req.user!.id;

      await verifyDisputeAccess(disputeId, userId);

      const party = await prisma.party.findFirst({
        where: { id: partyId, disputeId },
      });

      if (!party || party.userId !== userId) {
        throw new ForbiddenError('You are not a member of this party');
      }

      const input = sendMessageSchema.parse(req.body);
      const result = await sendMessage(sessionId, userId, input.content);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/disputes/:disputeId/parties/:partyId/brief-prep/session/:sessionId',
  authMiddleware(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId, partyId, sessionId } = req.params;
      const userId = req.user!.id;

      await verifyDisputeAccess(disputeId, userId);

      const party = await prisma.party.findFirst({
        where: { id: partyId, disputeId },
      });

      if (!party || party.userId !== userId) {
        throw new ForbiddenError('You are not a member of this party');
      }

      const session = await getSession(sessionId, userId);
      res.json(session);
    } catch (error) {
      next(error);
    }
  }
);

export { router as briefPrepRouter };
