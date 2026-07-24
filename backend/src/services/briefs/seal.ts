import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { NotFoundError } from '../../utils/errors';
import crypto from 'crypto';

export async function sealBriefOnBothSubmitted(disputeId: string): Promise<void> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      parties: {
        include: { briefs: true },
      },
    },
  });

  if (!dispute || dispute.deletedAt) return;

  const allBriefs = dispute.parties.flatMap(p => p.briefs);
  const submittedBriefs = allBriefs.filter(b => b.status === 'SUBMITTED');

  const initiatorHasBrief = dispute.parties.some(
    p => p.role === 'INITIATOR' && p.briefs.some(b => b.status === 'SUBMITTED')
  );
  const respondentHasBrief = dispute.parties.some(
    p => p.role === 'RESPONDENT' && p.briefs.some(b => b.status === 'SUBMITTED')
  );

  if (!initiatorHasBrief || !respondentHasBrief) return;

  for (const brief of submittedBriefs) {
    const sealHash = crypto
      .createHash('sha256')
      .update(brief.encryptedContent.toString('base64'))
      .digest('hex');

    await prisma.brief.update({
      where: { id: brief.id },
      data: {
        status: 'SEALED',
        sealHash,
        sealedAt: new Date(),
      },
    });
  }

  logger.info('Briefs sealed after both parties submitted', {
    disputeId,
    sealedCount: submittedBriefs.length,
  });
}
