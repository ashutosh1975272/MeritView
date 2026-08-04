import { prisma } from '../../db/prisma';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { generateId } from '../../utils/id';

export async function createFeedback(
  disputeId: string,
  userId: string,
  rating: number,
  comment?: string
) {
  if (rating < 1 || rating > 5) {
    throw new BadRequestError('Rating must be between 1 and 5');
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId, deletedAt: null },
    include: { parties: true },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  const party = dispute.parties.find(p => p.userId === userId);
  if (!party) {
    throw new ForbiddenError('You are not a party to this dispute');
  }

  if (dispute.state !== 'COMPLETED' && dispute.state !== 'WITHDRAWN') {
    throw new BadRequestError('Feedback can only be submitted after dispute is completed or withdrawn');
  }

  const existing = await prisma.feedback.findFirst({
    where: { disputeId, userId, deletedAt: null },
  });

  if (existing) {
    throw new BadRequestError('You have already submitted feedback for this dispute');
  }

  const feedback = await prisma.feedback.create({
    data: {
      id: generateId('fbk'),
      disputeId,
      userId,
      rating,
      comment: comment || null,
    },
  });

  logger.info('Feedback created', { feedbackId: feedback.id, disputeId, userId, rating });

  return feedback;
}

export async function getFeedbackForDispute(disputeId: string, requestingUserId: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId, deletedAt: null },
    include: { initiator: { select: { id: true } }, parties: { select: { userId: true } } },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  const isInitiator = dispute.initiator.id === requestingUserId;
  const isParty = dispute.parties.some(p => p.userId === requestingUserId);

  if (!isInitiator && !isParty) {
    throw new ForbiddenError('You do not have access to this dispute');
  }

  const feedbacks = await prisma.feedback.findMany({
    where: { disputeId, deletedAt: null },
    include: { user: { select: { id: true, displayName: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return feedbacks.map(fb => ({
    id: fb.id,
    rating: fb.rating,
    comment: fb.comment,
    createdAt: fb.createdAt,
    submittedBy: {
      id: fb.user.id,
      displayName: fb.user.displayName,
    },
  }));
}
