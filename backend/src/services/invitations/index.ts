import crypto from 'crypto';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { getEnv } from '../../config/env';

const env = getEnv();
const INVITATION_EXPIRY_DAYS = 7;
const INVITATION_TOKEN_BYTES = 32;

export interface InvitationResult {
  invitationToken: string;
  invitationLink: string;
  expiresAt: Date;
}

export async function createInvitation(
  disputeId: string,
  initiatorUserId: string,
  respondentEmail: string
): Promise<InvitationResult> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { parties: true },
  });

  if (!dispute || dispute.deletedAt) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.initiatorUserId !== initiatorUserId) {
    throw new ValidationError('Only the dispute initiator can send invitations');
  }

  const existingParty = dispute.parties.find(
    p => p.role === 'RESPONDENT' && p.invitationStatus !== 'DECLINED'
  );
  if (existingParty) {
    throw new ValidationError('An invitation has already been sent to this dispute');
  }

  const invitationToken = crypto.randomBytes(INVITATION_TOKEN_BYTES).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  const invitationLink = `${env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invitationToken}`;

  const party = await prisma.party.upsert({
    where: {
      disputeId_role: { disputeId, role: 'RESPONDENT' },
    },
    create: {
      disputeId,
      role: 'RESPONDENT',
      invitationEmail: respondentEmail,
      invitationToken,
      invitationStatus: 'PENDING',
      invitationSentAt: new Date(),
      invitationExpiresAt: expiresAt,
      briefStatus: 'NOT_STARTED',
    },
    update: {
      invitationEmail: respondentEmail,
      invitationToken,
      invitationStatus: 'PENDING',
      invitationSentAt: new Date(),
      invitationExpiresAt: expiresAt,
    },
  });

  await prisma.dispute.update({
    where: { id: disputeId },
    data: { state: 'AWAITING_COUNTERPARTY', stateChangedAt: new Date() },
  });

  const { sendEmail } = await import('../email');
  await sendEmail({
    to: respondentEmail,
    subject: `You've been invited to respond to a dispute on MeritView`,
    html: `
      <h2>Dispute Invitation</h2>
      <p>You have been invited by ${dispute.initiatorUserId} to participate in a dispute resolution on MeritView.</p>
      <p><strong>Dispute:</strong> ${dispute.title}</p>
      <p><a href="${invitationLink}">Click here to respond</a></p>
      <p>This invitation expires on ${expiresAt.toLocaleDateString()}.</p>
    `,
  });

  logger.info('Invitation created', {
    disputeId,
    respondentEmail,
    expiresAt,
  });

  return { invitationToken, invitationLink, expiresAt };
}

export async function getInvitationByToken(token: string): Promise<any> {
  const party = await prisma.party.findUnique({
    where: { invitationToken: token },
    include: {
      dispute: {
        include: {
          initiator: { select: { id: true, email: true, displayName: true } },
          briefs: { where: { party: { role: 'INITIATOR' } } },
        },
      },
    },
  });

  if (!party) {
    throw new NotFoundError('Invitation not found');
  }

  if (party.invitationExpiresAt && new Date() > party.invitationExpiresAt) {
    await prisma.party.update({
      where: { id: party.id },
      data: { invitationStatus: 'EXPIRED' },
    });
    throw new ValidationError('Invitation has expired');
  }

  if (party.invitationStatus !== 'PENDING') {
    throw new ValidationError(`Invitation is already ${party.invitationStatus.toLowerCase()}`);
  }

  return {
    disputeId: party.disputeId,
    disputeTitle: party.dispute.title,
    disputeCategory: party.dispute.category,
    initiatorEmail: party.dispute.initiator.email,
    initiatorName: party.dispute.initiator.displayName,
    role: party.role,
    invitationStatus: party.invitationStatus,
    expiresAt: party.invitationExpiresAt,
  };
}

export async function acceptInvitation(
  token: string,
  userId: string
): Promise<any> {
  const party = await prisma.party.findUnique({
    where: { invitationToken: token },
  });

  if (!party) {
    throw new NotFoundError('Invitation not found');
  }

  if (party.invitationExpiresAt && new Date() > party.invitationExpiresAt) {
    await prisma.party.update({
      where: { id: party.id },
      data: { invitationStatus: 'EXPIRED' },
    });
    throw new ValidationError('Invitation has expired');
  }

  if (party.invitationStatus !== 'PENDING') {
    throw new ValidationError(`Invitation is already ${party.invitationStatus.toLowerCase()}`);
  }

  const updatedParty = await prisma.party.update({
    where: { id: party.id },
    data: {
      userId,
      invitationStatus: 'ACCEPTED',
      invitationAcceptedAt: new Date(),
      briefStatus: 'NOT_STARTED',
    },
  });

  await prisma.dispute.update({
    where: { id: party.disputeId },
    data: { state: 'AWAITING_BRIEFS', stateChangedAt: new Date() },
  });

  logger.info('Invitation accepted', {
    disputeId: party.disputeId,
    userId,
    partyId: party.id,
  });

  return updatedParty;
}

export async function declineInvitation(token: string): Promise<void> {
  const party = await prisma.party.findUnique({
    where: { invitationToken: token },
  });

  if (!party) {
    throw new NotFoundError('Invitation not found');
  }

  if (party.invitationStatus !== 'PENDING') {
    throw new ValidationError(`Invitation is already ${party.invitationStatus.toLowerCase()}`);
  }

  await prisma.party.update({
    where: { id: party.id },
    data: { invitationStatus: 'DECLINED' },
  });

  logger.info('Invitation declined', { disputeId: party.disputeId, partyId: party.id });
}

export async function checkExpiredInvitations(): Promise<number> {
  const expiredParties = await prisma.party.findMany({
    where: {
      invitationStatus: 'PENDING',
      invitationExpiresAt: { lte: new Date() },
    },
  });

  for (const party of expiredParties) {
    await prisma.party.update({
      where: { id: party.id },
      data: { invitationStatus: 'EXPIRED' },
    });
  }

  return expiredParties.length;
}
