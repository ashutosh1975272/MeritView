import { prisma } from '../../db/prisma';
import crypto from 'crypto';
import { encrypt, decrypt } from '../../utils/crypto';
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { addEmailJob } from '../../jobs/queues';
import { DisputeState } from '@prisma/client';
import { createAuditEvent } from '../../utils/audit';
import { generateId } from '../../utils/id';

const MAX_WORD_COUNT = 5000;
const SUGGESTED_MIN_WORD_COUNT = 500;
const SUGGESTED_MAX_WORD_COUNT = 2000;

interface BriefSections {
  factualBackground?: string;
  myPosition?: string;
  supportingArguments?: string;
  acknowledgmentOfOpposing?: string;
  desiredResolution?: string;
}

const DISALLOWED_PATTERNS: RegExp[] = [
  /\b(kill|murder|assassinate)\b/i,
  /\b(bomb|explosive|weapon)\b/i,
  /\b(trafficking|drugs?|illicit)\b/i,
  /\b(hack|unauthorized access|exploit)\b/i,
  /\b(harass|harassing|harassment)\b/i,
  /\b(threat|threaten|threatening)\b/i,
  /\b(sexual\s+content|porn|explicit\s+sexual)\b/i,
  /\b(ssn|social security|credit card number|passport number)\b/i,
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b\d{16}\b/,
];

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

export function calculateWordCount(content: string): number {
  if (!content || content.trim().length === 0) return 0;
  const cleaned = content.trim().replace(/\s+/g, ' ');
  const words = cleaned.split(' ').filter(w => w.length > 0);
  return words.length;
}

export function contentModerationCheck(content: string): ModerationResult {
  for (const pattern of DISALLOWED_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      return {
        allowed: false,
        reason: `Content contains prohibited language: "${match[0].trim()}"`,
      };
    }
  }

  return { allowed: true };
}

function getTotalWordCount(sections: BriefSections): number {
  return Object.values(sections).reduce((sum, text) => sum + calculateWordCount(text || ''), 0);
}

function serializeSectionsForEncryption(sections: BriefSections): string {
  return JSON.stringify(sections);
}

function deserializeSectionsFromEncryption(content: string): BriefSections {
  return JSON.parse(content);
}

export async function saveDraft(
  disputeId: string,
  partyId: string,
  userId: string,
  sections: BriefSections,
  supportingDocumentIds?: string[],
): Promise<{ id: string; status: string; wordCount: number }> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId, deletedAt: null },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.state !== 'DRAFT' && dispute.state !== 'AWAITING_COUNTERPARTY' && dispute.state !== 'AWAITING_BRIEFS' && dispute.state !== 'AWAITING_COUNTERPARTY_BRIEF') {
    throw new ConflictError('Dispute is not in a state that allows brief editing');
  }

  const party = await prisma.party.findUnique({
    where: { id: partyId },
  });

  if (!party || party.disputeId !== disputeId) {
    throw new NotFoundError('Party not found in this dispute');
  }

  if (party.userId !== userId) {
    throw new ForbiddenError('You are not a member of this party');
  }

  const existingBrief = await prisma.brief.findUnique({
    where: { partyId },
  });

  if (existingBrief && existingBrief.status === 'SEALED') {
    throw new ForbiddenError('Brief is sealed and cannot be edited');
  }

  const wordCount = getTotalWordCount(sections);
  if (wordCount > MAX_WORD_COUNT) {
    throw new ValidationError(`Total word count exceeds maximum of ${MAX_WORD_COUNT}`);
  }

  const serialized = serializeSectionsForEncryption(sections);
  const { encryptedContent, contentEncryptionKeyId } = encrypt(serialized);

  const brief = await prisma.brief.upsert({
    where: { partyId },
    create: {
      id: generateId('brief'),
      partyId,
      disputeId,
      encryptedContent,
      contentEncryptionKeyId,
      wordCount,
      supportingDocumentIds: supportingDocumentIds || [],
      status: 'DRAFT',
    },
    update: {
      encryptedContent,
      contentEncryptionKeyId,
      wordCount,
      supportingDocumentIds: supportingDocumentIds || [],
      updatedAt: new Date(),
    },
  });

  await prisma.party.update({
    where: { id: partyId },
    data: { briefStatus: 'IN_PROGRESS' },
  });

  return {
    id: brief.id,
    status: brief.status,
    wordCount: brief.wordCount,
  };
}

export async function submitBrief(
  disputeId: string,
  partyId: string,
  userId: string,
  sections: BriefSections,
  supportingDocumentIds?: string[],
): Promise<{ brief: { id: string; submitted_at: string; word_count: number; status: string }; dispute_state: string; next_action: string }> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId, deletedAt: null },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.state !== 'DRAFT' && dispute.state !== 'AWAITING_COUNTERPARTY' && dispute.state !== 'AWAITING_BRIEFS' && dispute.state !== 'AWAITING_COUNTERPARTY_BRIEF') {
    throw new ConflictError('Dispute is not in a state that allows brief submission');
  }

  const party = await prisma.party.findUnique({
    where: { id: partyId },
  });

  if (!party || party.disputeId !== disputeId) {
    throw new NotFoundError('Party not found in this dispute');
  }

  if (party.userId !== userId) {
    throw new ForbiddenError('You are not a member of this party');
  }

  const requiredSections: (keyof BriefSections)[] = [
    'factualBackground',
    'myPosition',
    'supportingArguments',
    'acknowledgmentOfOpposing',
    'desiredResolution',
  ];

  for (const section of requiredSections) {
    if (!sections[section] || sections[section]!.trim().length === 0) {
      throw new ValidationError(`Section "${section}" is required and must not be empty`);
    }
  }

  const wordCount = getTotalWordCount(sections);
  if (wordCount > MAX_WORD_COUNT) {
    throw new ValidationError(`Total word count exceeds maximum of ${MAX_WORD_COUNT}`);
  }

  if (wordCount < SUGGESTED_MIN_WORD_COUNT) {
    logger.warn('Brief word count below suggested minimum', { wordCount, disputeId, partyId });
  }

  const moderationResult = contentModerationCheck(
    Object.values(sections).filter(Boolean).join(' ')
  );

  await createAuditEvent({
    actorId: userId,
    actorType: 'USER',
    eventType: 'CONTENT_MODERATION_CHECK',
    resourceType: 'BRIEF',
    resourceId: partyId,
    metadata: {
      disputeId,
      allowed: moderationResult.allowed,
      reason: moderationResult.reason,
      wordCount,
    },
  });

  if (!moderationResult.allowed) {
    throw new ValidationError(moderationResult.reason || 'Content moderation check failed');
  }

  const existingBrief = await prisma.brief.findUnique({
    where: { partyId },
  });

  if (existingBrief && existingBrief.status === 'SEALED') {
    throw new ForbiddenError('Brief is sealed and cannot be edited');
  }

  const serialized = serializeSectionsForEncryption(sections);
  const { encryptedContent, contentEncryptionKeyId } = encrypt(serialized);

  const sealHash = cryptoCreateHash(encryptedContent);

  const now = new Date();

  const brief = await prisma.brief.upsert({
    where: { partyId },
    create: {
      partyId,
      disputeId,
      encryptedContent,
      contentEncryptionKeyId,
      wordCount,
      supportingDocumentIds: supportingDocumentIds || [],
      status: 'SEALED',
      submittedAt: now,
      sealedAt: now,
      sealHash,
    },
    update: {
      encryptedContent,
      contentEncryptionKeyId,
      wordCount,
      supportingDocumentIds: supportingDocumentIds || [],
      status: 'SEALED',
      submittedAt: now,
      sealedAt: now,
      sealHash,
    },
  });

  await prisma.party.update({
    where: { id: partyId },
    data: { briefStatus: 'SUBMITTED' },
  });

  const allParties = await prisma.party.findMany({
    where: { disputeId },
  });

  const unsubmittedParties = allParties.filter(p => p.briefStatus !== 'SUBMITTED');

  let newState: DisputeState;
  if (unsubmittedParties.length === 0) {
    newState = allParties.length > 1 ? 'AWAITING_BRIEFS' : 'PAYMENT_PENDING';
  } else {
    const respondentNotSubmitted = unsubmittedParties.some(p => p.role === 'RESPONDENT');
    newState = respondentNotSubmitted ? 'AWAITING_COUNTERPARTY_BRIEF' : 'AWAITING_BRIEFS';
  }

  await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      state: newState,
      stateChangedAt: now,
    },
  });

  await createAuditEvent({
    actorId: userId,
    actorType: 'USER',
    eventType: 'BRIEF_SUBMITTED',
    resourceType: 'BRIEF',
    resourceId: brief.id,
    metadata: {
      disputeId,
      partyId,
      wordCount,
      sealHash,
    },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user) {
    await addEmailJob('brief-submitted', user.email, { disputeId });
  }

  const nextAction = newState === 'AWAITING_BRIEFS' || newState === 'AWAITING_COUNTERPARTY_BRIEF'
    ? 'awaiting_counterparty_brief'
    : newState === 'PAYMENT_PENDING'
    ? 'proceed_to_payment'
    : 'awaiting_analysis';

  return {
    brief: {
      id: brief.id,
      submitted_at: brief.submittedAt?.toISOString() || now.toISOString(),
      word_count: brief.wordCount,
      status: brief.status,
    },
    dispute_state: newState,
    next_action: nextAction,
  };
}

function cryptoCreateHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function getBrief(
  disputeId: string,
  partyId: string,
  userId: string,
): Promise<{
  id: string;
  status: string;
  sections: BriefSections;
  wordCount: number;
  supportingDocumentIds: string[];
  sealHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  sealedAt: Date | null;
}> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId, deletedAt: null },
  });

  if (!dispute) {
    throw new NotFoundError('Dispute not found');
  }

  const party = await prisma.party.findUnique({
    where: { id: partyId },
  });

  if (!party || party.disputeId !== disputeId) {
    throw new NotFoundError('Party not found in this dispute');
  }

  if (party.userId !== userId) {
    throw new ForbiddenError('You are not a member of this party');
  }

  const brief = await prisma.brief.findUnique({
    where: { partyId },
  });

  if (!brief) {
    throw new NotFoundError('Brief not found');
  }

  const allParties = await prisma.party.findMany({
    where: { disputeId },
  });

  const allSubmitted = allParties.every(p => p.briefStatus === 'SUBMITTED');

  if (allParties.length > 1 && !allSubmitted && brief.status !== 'DRAFT') {
    throw new NotFoundError('Brief not found');
  }

  const serialized = decrypt(brief.encryptedContent, brief.contentEncryptionKeyId);
  const sections = deserializeSectionsFromEncryption(serialized);

  return {
    id: brief.id,
    status: brief.status,
    sections,
    wordCount: brief.wordCount,
    supportingDocumentIds: brief.supportingDocumentIds,
    sealHash: brief.sealHash,
    createdAt: brief.createdAt,
    updatedAt: brief.updatedAt,
    submittedAt: brief.submittedAt,
    sealedAt: brief.sealedAt,
  };
}
