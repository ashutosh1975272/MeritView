import { prisma } from '../../db/prisma';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export async function registerAsMediator(
  userId: string,
  data: {
    businessName: string;
    description?: string;
    specialties: string[];
    serviceRegions: string[];
    contactEmail: string;
    website?: string;
  }
) {
  const existing = await prisma.mediator.findUnique({ where: { userId } });
  if (existing) {
    throw new ConflictError('User is already registered as a mediator');
  }

  const mediator = await prisma.mediator.create({
    data: {
      userId,
      businessName: data.businessName,
      description: data.description,
      specialties: data.specialties,
      serviceRegions: data.serviceRegions,
      contactEmail: data.contactEmail,
      website: data.website,
    },
  });

  logger.info('Mediator registered', { userId, mediatorId: mediator.id });
  return mediator;
}

export async function getMediator(mediatorId: string) {
  const mediator = await prisma.mediator.findUnique({
    where: { id: mediatorId },
    include: { user: { select: { displayName: true, email: true } } },
  });

  if (!mediator) {
    throw new NotFoundError('Mediator not found');
  }

  return mediator;
}

export async function getMyMediatorProfile(userId: string) {
  const mediator = await prisma.mediator.findUnique({
    where: { userId },
    include: { partnerships: true },
  });

  if (!mediator) {
    throw new NotFoundError('You are not registered as a mediator');
  }

  return mediator;
}

export async function updateMediator(
  userId: string,
  data: {
    businessName?: string;
    description?: string;
    specialties?: string[];
    serviceRegions?: string[];
    contactEmail?: string;
    website?: string;
  }
) {
  const mediator = await prisma.mediator.findUnique({ where: { userId } });
  if (!mediator) {
    throw new NotFoundError('Mediator profile not found');
  }

  const updated = await prisma.mediator.update({
    where: { userId },
    data,
  });

  logger.info('Mediator profile updated', { userId });
  return updated;
}

export async function searchMediators(query: {
  specialties?: string[];
  region?: string;
  minRating?: number;
  limit?: number;
  offset?: number;
}) {
  const where: any = { status: 'APPROVED' };

  if (query.specialties?.length) {
    where.specialties = { hasSome: query.specialties };
  }
  if (query.region) {
    where.serviceRegions = { has: query.region };
  }
  if (query.minRating) {
    where.ratingAvg = { gte: query.minRating };
  }

  const [mediators, total] = await Promise.all([
    prisma.mediator.findMany({
      where,
      take: query.limit || 20,
      skip: query.offset || 0,
      orderBy: { ratingAvg: 'desc' },
      include: { user: { select: { displayName: true } } },
    }),
    prisma.mediator.count({ where }),
  ]);

  return { mediators, total };
}

export async function createPartnership(
  disputeId: string,
  mediatorId: string,
  userId: string
) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId, deletedAt: null },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }
  if (dispute.initiatorUserId !== userId) {
    throw new ForbiddenError('Only the dispute initiator can refer mediators');
  }

  const mediator = await prisma.mediator.findUnique({ where: { id: mediatorId } });
  if (!mediator || mediator.status !== 'APPROVED') {
    throw new NotFoundError('Mediator not found or not available');
  }

  const existing = await prisma.mediatorPartnership.findUnique({
    where: { mediatorId_disputeId: { mediatorId, disputeId } },
  });
  if (existing) {
    throw new ConflictError('Partnership already exists for this mediator and dispute');
  }

  const partnership = await prisma.mediatorPartnership.create({
    data: {
      mediatorId,
      disputeId,
      referralUserId: userId,
      commissionPct: 10.0,
    },
  });

  logger.info('Mediator partnership created', { disputeId, mediatorId, userId });

  return partnership;
}

export async function getPartnershipsForDispute(disputeId: string, userId: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId, deletedAt: null },
    select: { initiatorUserId: true },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }
  if (dispute.initiatorUserId !== userId) {
    throw new ForbiddenError('Access denied');
  }

  const partnerships = await prisma.mediatorPartnership.findMany({
    where: { disputeId },
    include: {
      mediator: {
        include: { user: { select: { displayName: true, email: true } } },
      },
    },
  });

  return partnerships;
}
