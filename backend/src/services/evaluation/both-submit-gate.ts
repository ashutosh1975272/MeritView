import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { ValidationError, NotFoundError } from '../../utils/errors';

export async function checkBothBriefsSubmitted(disputeId: string): Promise<{
  ready: boolean;
  initiatorSubmitted: boolean;
  respondentSubmitted: boolean;
  totalParties: number;
}> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      parties: {
        include: { briefs: true },
      },
    },
  });

  if (!dispute || dispute.deletedAt) {
    throw new NotFoundError('Dispute not found');
  }

  const initiatorParty = dispute.parties.find(p => p.role === 'INITIATOR');
  const respondentParty = dispute.parties.find(p => p.role === 'RESPONDENT');

  const initiatorSubmitted = initiatorParty?.briefs?.some(
    b => b.status === 'SUBMITTED'
  ) || false;

  const respondentSubmitted = respondentParty?.briefs?.some(
    b => b.status === 'SUBMITTED'
  ) || false;

  const ready = initiatorSubmitted && respondentSubmitted;

  return {
    ready,
    initiatorSubmitted,
    respondentSubmitted,
    totalParties: dispute.parties.length,
  };
}

export async function ensureBothBriefsSubmitted(
  disputeId: string,
  partyId: string
): Promise<void> {
  const gateStatus = await checkBothBriefsSubmitted(disputeId);

  if (!gateStatus.ready) {
    if (!gateStatus.initiatorSubmitted) {
      throw new ValidationError('Initiator brief has not been submitted yet');
    }
    if (!gateStatus.respondentSubmitted) {
      await prisma.dispute.update({
        where: { id: disputeId },
        data: { state: 'AWAITING_COUNTERPARTY_BRIEF', stateChangedAt: new Date() },
      });
      throw new ValidationError('Waiting for respondent brief to be submitted');
    }
  }

  logger.info('Both briefs submitted, evaluation gate passed', { disputeId });
}
