import crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { prisma } from '../../db/prisma';
import { BadRequestError, NotFoundError, ConflictError, ForbiddenError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { addEmailJob } from '../../jobs/queues';
import { generateId } from '../../utils/id';
import { validateTransition } from '../disputes/state-machine';

const INVITATION_EXPIRY_DAYS = 7;

async function ensureInvitationRecord(partyId: string) {
  return prisma.invitation.upsert({
    where: { partyId },
    create: { partyId },
    update: {},
  });
}

async function createInvitationEvent(partyId: string, eventType: string, metadata?: Record<string, unknown>) {
  const invitation = await ensureInvitationRecord(partyId);
  return prisma.invitationEvent.create({
    data: {
      invitationId: invitation.id,
      eventType,
      metadata: metadata as any ?? {},
    },
  });
}

function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createInvitation(
  disputeId: string,
  email: string,
  userId: string
) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId, deletedAt: null },
    include: {
      parties: {
        where: { role: 'RESPONDENT' },
      },
      initiator: { select: { displayName: true } },
    },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.initiatorUserId !== userId) {
    throw new ForbiddenError('Only the dispute initiator can send invitations');
  }

  if (dispute.state !== 'DRAFT') {
    throw new ConflictError('Can only invite counterparty while dispute is in DRAFT state');
  }

  if (dispute.parties.length > 0) {
    throw new ConflictError('Counterparty has already been invited');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser && existingUser.id === userId) {
    throw new BadRequestError('Cannot invite yourself as counterparty');
  }

  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  const party = await prisma.party.create({
    data: {
      id: generateId('party'),
      disputeId,
      role: 'RESPONDENT',
      userId: existingUser?.id || null,
      invitationEmail: email,
      invitationToken: token,
      invitationStatus: 'PENDING',
      invitationSentAt: new Date(),
      invitationExpiresAt: expiresAt,
      briefStatus: 'NOT_STARTED',
    },
  });

  await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      state: 'AWAITING_COUNTERPARTY',
      stateChangedAt: new Date(),
    },
  });

  await addEmailJob('invitation-sent', email, {
    disputeId,
    disputeTitle: dispute.title,
    inviterName: dispute.initiator.displayName || 'Someone',
    token,
    expiresAt: expiresAt.toISOString(),
  });

  await createInvitationEvent(party.id, 'SENT', { disputeId, email });

  logger.info('Invitation created', { disputeId, email, token: token.substring(0, 8) + '...', userId });

  return {
    partyId: party.id,
    email,
    status: 'PENDING',
    expiresAt,
  };
}

export async function acceptInvitation(
  token: string,
  displayName?: string,
  createAccount?: { email: string; password: string; displayName?: string },
  acceptTerms?: boolean,
) {
  const party = await prisma.party.findUnique({
    where: { invitationToken: token },
    include: {
      dispute: true,
    },
  });

  if (!party) {
    throw new NotFoundError('Invitation not found');
  }

  if (party.invitationStatus !== 'PENDING') {
    throw new ConflictError(`Invitation has already been ${party.invitationStatus.toLowerCase()}`);
  }

  if (party.invitationExpiresAt && party.invitationExpiresAt < new Date()) {
    await prisma.party.update({
      where: { id: party.id },
      data: { invitationStatus: 'EXPIRED' },
    });
    throw new BadRequestError('Invitation has expired');
  }

  let user = await prisma.user.findUnique({
    where: { email: party.invitationEmail! },
  });

  if (!user) {
    if (createAccount) {
      if (!acceptTerms) {
        throw new ValidationError('Terms must be accepted');
      }

      const normalizedEmail = createAccount.email.toLowerCase().trim();
      if (normalizedEmail !== party.invitationEmail!.toLowerCase().trim()) {
        throw new ValidationError('Email does not match the invited email');
      }

      if (createAccount.password.length < 8 || createAccount.password.length > 128 || !/[a-zA-Z]/.test(createAccount.password) || !/[0-9]/.test(createAccount.password)) {
        throw new ValidationError('Password must be 8-128 characters with at least 1 letter and 1 number');
      }

      const passwordHash = await bcrypt.hash(createAccount.password, 12);

      user = await prisma.user.create({
        data: {
          id: generateId('user'),
          email: normalizedEmail,
          passwordHash,
          displayName: (createAccount.displayName || displayName)?.trim()?.substring(0, 100),
          emailVerified: true,
          accountType: 'STANDARD',
          termsAcceptedAt: new Date(),
          termsVersion: '1.0',
        },
      });
      logger.info('User account created on invitation accept', { userId: user.id, email: user.email });
    } else {
      if (!displayName) {
        throw new BadRequestError('No account found for the invited email. Please register first, provide a displayName to create a guest account, or use createAccount.');
      }
      user = await prisma.user.create({
        data: {
          email: party.invitationEmail!,
          displayName: displayName.trim().substring(0, 100),
          emailVerified: true,
          accountType: 'GUEST',
          termsAcceptedAt: new Date(),
          termsVersion: '1.0',
        },
      });
      logger.info('Guest account auto-created on invitation accept', { userId: user.id, email: user.email });
    }
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.party.update({
      where: { id: party.id },
      data: {
        userId: user.id,
        invitationStatus: 'ACCEPTED',
        invitationAcceptedAt: now,
      },
    }),
    prisma.dispute.update({
      where: { id: party.disputeId },
      data: {
        state: 'AWAITING_BRIEFS',
        stateChangedAt: now,
      },
    }),
  ]);

  await createInvitationEvent(party.id, 'ACCEPTED', { disputeId: party.disputeId, userId: user.id });

  await addEmailJob('invitation-accepted', party.invitationEmail!, {
    disputeId: party.disputeId,
    disputeTitle: party.dispute.title,
  });

  logger.info('Invitation accepted', { disputeId: party.disputeId, token: token.substring(0, 8) + '...', userId: user.id });

  return {
    disputeId: party.disputeId,
    userId: user.id,
    message: 'Invitation accepted',
  };
}

export async function declineInvitation(token: string) {
  const party = await prisma.party.findUnique({
    where: { invitationToken: token },
    include: {
      dispute: true,
    },
  });

  if (!party) {
    throw new NotFoundError('Invitation not found');
  }

  if (party.invitationStatus !== 'PENDING') {
    throw new ConflictError(`Invitation has already been ${party.invitationStatus.toLowerCase()}`);
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.party.update({
      where: { id: party.id },
      data: {
        invitationStatus: 'DECLINED',
      },
    }),
    prisma.dispute.update({
      where: { id: party.disputeId },
      data: {
        state: 'DECLINED',
        stateChangedAt: now,
      },
    }),
  ]);

  await createInvitationEvent(party.id, 'DECLINED', { disputeId: party.disputeId });

  await addEmailJob('invitation-declined', party.invitationEmail!, {
    disputeId: party.disputeId,
    disputeTitle: party.dispute.title,
  });

  logger.info('Invitation declined', { disputeId: party.disputeId, token: token.substring(0, 8) + '...' });

  return {
    disputeId: party.disputeId,
    message: 'Invitation declined',
  };
}

export async function getInvitationByToken(token: string) {
  const party = await prisma.party.findUnique({
    where: { invitationToken: token },
    include: { dispute: { select: { title: true } } },
  });

  if (!party) {
    throw new NotFoundError('Invitation not found');
  }

  const isExpired = party.invitationExpiresAt &&
    party.invitationExpiresAt < new Date() &&
    party.invitationStatus === 'PENDING';

  createInvitationEvent(party.id, 'OPENED').catch((err: any) => {
    logger.error('Failed to record OPENED event', err);
  });

  return {
    id: party.id,
    disputeId: party.disputeId,
    disputeTitle: party.dispute.title,
    status: isExpired ? 'EXPIRED' : party.invitationStatus,
    email: party.invitationEmail,
    sentAt: party.invitationSentAt,
    expiresAt: party.invitationExpiresAt,
    acceptedAt: party.invitationAcceptedAt,
  };
}

export async function resendInvitation(
  disputeId: string,
  userId: string
) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId, deletedAt: null },
    include: {
      parties: {
        where: { role: 'RESPONDENT' },
      },
      initiator: { select: { displayName: true } },
    },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.initiatorUserId !== userId) {
    throw new ForbiddenError('Only the dispute initiator can resend invitations');
  }

  const party = dispute.parties[0];
  if (!party) {
    throw new NotFoundError('No invitation found for this dispute');
  }

  if (party.invitationStatus === 'ACCEPTED' || party.invitationStatus === 'DECLINED') {
    throw new ConflictError(`Cannot resend invitation that has been ${party.invitationStatus.toLowerCase()}`);
  }

  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  await prisma.party.update({
    where: { id: party.id },
    data: {
      invitationToken: token,
      invitationStatus: 'PENDING',
      invitationSentAt: new Date(),
      invitationExpiresAt: expiresAt,
      invitationAcceptedAt: null,
    },
  });

  await prisma.dispute.update({
    where: { id: disputeId },
    data: { state: 'AWAITING_COUNTERPARTY', stateChangedAt: new Date() },
  });

  await addEmailJob('invitation-sent', party.invitationEmail!, {
    disputeId,
    disputeTitle: dispute.title,
    inviterName: dispute.initiator.displayName || 'Someone',
    token,
    expiresAt: expiresAt.toISOString(),
  });

  await createInvitationEvent(party.id, 'RESENT', { disputeId, email: party.invitationEmail });

  logger.info('Invitation resent', { disputeId, email: party.invitationEmail, userId });

  return {
    partyId: party.id,
    email: party.invitationEmail,
    status: 'PENDING',
    expiresAt,
  };
}

export async function getInvitationStatus(disputeId: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId, deletedAt: null },
    include: {
      parties: {
        where: { role: 'RESPONDENT' },
        select: {
          id: true,
          invitationEmail: true,
          invitationStatus: true,
          invitationSentAt: true,
          invitationExpiresAt: true,
          invitationAcceptedAt: true,
        },
      },
    },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  const respondentParty = dispute.parties[0];

  if (!respondentParty) {
    return {
      status: 'NOT_SENT',
      disputeId,
    };
  }

  const isExpired = respondentParty.invitationExpiresAt &&
    respondentParty.invitationExpiresAt < new Date() &&
    respondentParty.invitationStatus === 'PENDING';

  if (isExpired) {
    await prisma.party.update({
      where: { id: respondentParty.id },
      data: { invitationStatus: 'EXPIRED' },
    });
  }

  return {
    status: isExpired ? 'EXPIRED' : respondentParty.invitationStatus,
    email: respondentParty.invitationEmail,
    sentAt: respondentParty.invitationSentAt,
    expiresAt: respondentParty.invitationExpiresAt,
    acceptedAt: respondentParty.invitationAcceptedAt,
    disputeId,
  };
}
