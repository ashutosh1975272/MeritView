import { BriefState, Party, Dispute } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';
import { encrypt, decrypt, getActiveKeyId } from '../../utils/crypto';
import { ValidationError, ForbiddenError, NotFoundError, ConflictError } from '../../utils/errors';

const WORD_COUNT_MIN = 500;
const WORD_COUNT_SUGGESTED_MAX = 2000;
const WORD_COUNT_HARD_CAP = 5000;

interface BriefSections {
  factual_background?: string;
  my_position?: string;
  supporting_arguments?: string;
  acknowledgment_of_opposing?: string;
  desired_resolution?: string;
}

interface SaveDraftInput {
  sections: BriefSections;
  supportingDocumentIds?: string[];
}

interface SubmitBriefInput {
  sections: BriefSections;
  supportingDocumentIds?: string[];
}

export function calculateWordCount(sections: BriefSections): number {
  const allText = Object.values(sections).filter(Boolean).join(' ');
  return allText.split(/\s+/).filter(Boolean).length;
}

export function validateWordCount(wordCount: number): { valid: boolean; wordCount: number } {
  if (wordCount > WORD_COUNT_HARD_CAP) {
    throw new ValidationError(`Word count exceeds hard cap of ${WORD_COUNT_HARD_CAP} words`);
  }
  return { valid: true, wordCount };
}

export function validateSectionsComplete(sections: BriefSections): void {
  const requiredSections: (keyof BriefSections)[] = [
    'factual_background',
    'my_position',
    'supporting_arguments',
    'acknowledgment_of_opposing',
    'desired_resolution',
  ];

  for (const section of requiredSections) {
    const value = sections[section];
    if (!value || value.trim().length === 0) {
      throw new ValidationError(`Section ${section} is required`);
    }
  }
}

export function basicContentModeration(content: string): { passed: boolean; reason?: string } {
  const lower = content.toLowerCase();

  const illegalPatterns = [
    /\b(?:murder|assault|robbery|fraud|hack(?:er|ing|ed|s)?|terroris[mt])\b/i,
    /\b(kill|harm|hurt|threaten)\b.{0,50}\b(you|him|her|them|people|someone)\b/i,
    /\b(stolen|illegal|drug|weapon|explosive)\b/i,
  ];

  for (const pattern of illegalPatterns) {
    if (pattern.test(lower)) {
      return { passed: false, reason: 'Content contains disallowed material' };
    }
  }

  const harassmentPatterns = [
    /\b(?:harass(?:ment|ing|es|ed)?|bully(?:ing|ies)?|bullied|stalk(?:ing|er|ed|s)?)\b/i,
    /\b(?:discriminat(?:ion|ory)|slur|bigot(?:ry|ed)?)\b/i,
  ];

  for (const pattern of harassmentPatterns) {
    if (pattern.test(lower)) {
      return { passed: false, reason: 'Content contains harassment or discriminatory material' };
    }
  }

  const sexualContentPatterns = [
    /\b(?:porn(?:ography|ographic)?|explicit\s+sexual|sexually\s+explicit)\b/i,
    /\b(?:obscene|lewd|pornographic|sexual\s+act)\b/i,
  ];

  for (const pattern of sexualContentPatterns) {
    if (pattern.test(lower)) {
      return { passed: false, reason: 'Content contains sexual content that is not permitted' };
    }
  }

  const piiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/,
    /\b\d{16}\b/,
    /\b[A-Z]{2}\d{6,7}\b/,
  ];

  for (const pattern of piiPatterns) {
    if (pattern.test(content)) {
      return { passed: false, reason: 'Content appears to contain PII that should not be included' };
    }
  }

  return { passed: true };
}

export async function saveDraft(userId: string, partyId: string, disputeId: string, input: SaveDraftInput): Promise<any> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { dispute: true },
  });

  if (!party || party.disputeId !== disputeId) {
    throw new NotFoundError('Party not found');
  }

  const isMember = party.userId === userId;
  const isCounterparty = party.invitationEmail === null;

  if (!isMember) {
    throw new ForbiddenError('You are not authorized to edit this brief');
  }

  const dispute = party.dispute;
  if (dispute.state !== 'DRAFT' && dispute.state !== 'BRIEF_SUBMITTED') {
    throw new ConflictError('Brief can only be edited in draft or brief_submitted state');
  }

  const wordCount = calculateWordCount(input.sections);
  validateWordCount(wordCount);

  const allSections: BriefSections = {
    factual_background: input.sections.factual_background || '',
    my_position: input.sections.my_position || '',
    supporting_arguments: input.sections.supporting_arguments || '',
    acknowledgment_of_opposing: input.sections.acknowledgment_of_opposing || '',
    desired_resolution: input.sections.desired_resolution || '',
  };

  const keyId = getActiveKeyId();
  const encryptedContent = encrypt(JSON.stringify(allSections), keyId);

  const brief = await prisma.brief.upsert({
    where: { partyId },
    create: {
      partyId,
      disputeId,
      encryptedContent: Buffer.from(encryptedContent.encryptedContent, 'base64'),
      contentEncryptionKeyId: encryptedContent.contentEncryptionKeyId,
      wordCount,
      supportingDocumentIds: input.supportingDocumentIds || [],
      status: 'DRAFT',
    },
    update: {
      encryptedContent: Buffer.from(encryptedContent.encryptedContent, 'base64'),
      contentEncryptionKeyId: encryptedContent.contentEncryptionKeyId,
      wordCount,
      supportingDocumentIds: input.supportingDocumentIds || [],
    },
  });

  await prisma.party.update({
    where: { id: partyId },
    data: { briefStatus: 'IN_PROGRESS' },
  });

  logger.info('Brief draft saved', { partyId, disputeId, userId });

  return {
    ...brief,
    sections: allSections,
  };
}

export async function submitBrief(userId: string, partyId: string, disputeId: string, input: SubmitBriefInput): Promise<any> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { dispute: true },
  });

  if (!party || party.disputeId !== disputeId) {
    throw new NotFoundError('Party not found');
  }

  if (party.userId !== userId) {
    throw new ForbiddenError('You are not authorized to submit this brief');
  }

  const dispute = party.dispute;
  if (dispute.state !== 'DRAFT') {
    throw new ConflictError('Brief can only be submitted for disputes in draft state');
  }

  validateSectionsComplete(input.sections);

  const wordCount = calculateWordCount(input.sections);
  validateWordCount(wordCount);

  const combinedText = Object.values(input.sections).filter(Boolean).join(' ');
  const moderationResult = basicContentModeration(combinedText);
  if (!moderationResult.passed) {
    throw new ValidationError(moderationResult.reason || 'Content moderation failed');
  }

  const allSections: BriefSections = {
    factual_background: input.sections.factual_background || '',
    my_position: input.sections.my_position || '',
    supporting_arguments: input.sections.supporting_arguments || '',
    acknowledgment_of_opposing: input.sections.acknowledgment_of_opposing || '',
    desired_resolution: input.sections.desired_resolution || '',
  };

  const keyId = getActiveKeyId();
  const encryptedContent = encrypt(JSON.stringify(allSections), keyId);
  const sealHash = `${keyId}:${Buffer.from(encryptedContent.encryptedContent, 'base64').toString('hex').slice(0, 64)}`;

  const result = await prisma.$transaction(async (tx) => {
    const brief = await tx.brief.upsert({
      where: { partyId },
      create: {
        partyId,
        disputeId,
        encryptedContent: Buffer.from(encryptedContent.encryptedContent, 'base64'),
        contentEncryptionKeyId: encryptedContent.contentEncryptionKeyId,
        wordCount,
        supportingDocumentIds: input.supportingDocumentIds || [],
        status: 'SUBMITTED',
        submittedAt: new Date(),
        sealHash,
      },
      update: {
        encryptedContent: Buffer.from(encryptedContent.encryptedContent, 'base64'),
        contentEncryptionKeyId: encryptedContent.contentEncryptionKeyId,
        wordCount,
        supportingDocumentIds: input.supportingDocumentIds || [],
        status: 'SUBMITTED',
        submittedAt: new Date(),
        sealHash,
      },
    });

    await tx.party.update({
      where: { id: partyId },
      data: { briefStatus: 'SUBMITTED' },
    });

    await tx.dispute.update({
      where: { id: disputeId },
      data: { state: 'BRIEF_SUBMITTED', stateChangedAt: new Date() },
    });

    return brief;
  });

  logger.info('Brief submitted', { partyId, disputeId, userId });

  const disputeWithUser = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      initiator: { select: { id: true, email: true, displayName: true } },
    },
  });

  if (disputeWithUser?.initiator?.email) {
    const { sendBriefSubmittedEmail } = await import('../email');
    await sendBriefSubmittedEmail(disputeWithUser.initiator.email, dispute.title, disputeId);
  }

  return {
    ...result,
    sections: allSections,
  };
}

export async function getBrief(userId: string, partyId: string, disputeId: string): Promise<any> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: { dispute: true },
  });

  if (!party || party.disputeId !== disputeId) {
    throw new NotFoundError('Brief not found');
  }

  const isMember = party.userId === userId;
  if (!isMember) {
    throw new ForbiddenError('You are not authorized to view this brief');
  }

  const brief = await prisma.brief.findUnique({
    where: { partyId },
  });

  if (!brief) {
    throw new NotFoundError('Brief not found');
  }

  const decryptedContent = decrypt(
    brief.encryptedContent.toString('base64'),
    brief.contentEncryptionKeyId
  );

  const sections = JSON.parse(decryptedContent) as BriefSections;

  return {
    ...brief,
    sections,
  };
}
