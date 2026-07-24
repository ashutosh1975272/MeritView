import { prisma } from '../../db/prisma';
import { decrypt } from '../../utils/crypto';
import { logger } from '../../utils/logger';

export async function profileOpinionReadLatency(disputeId: string): Promise<{
  queryMs: number;
  decryptMs: number;
  totalMs: number;
}> {
  const start = Date.now();

  const opinion = await prisma.opinion.findUnique({ where: { disputeId } });
  if (!opinion) {
    logger.warn('No opinion found for profiling', { disputeId });
    return { queryMs: Date.now() - start, decryptMs: 0, totalMs: Date.now() - start };
  }

  const queryMs = Date.now() - start;
  const decryptStart = Date.now();

  decrypt(
    Buffer.from(opinion.encryptedContent).toString('base64'),
    opinion.contentEncryptionKeyId
  );

  const decryptMs = Date.now() - decryptStart;
  const totalMs = Date.now() - start;

  logger.info('Opinion read profile', { disputeId, queryMs, decryptMs, totalMs });

  return { queryMs, decryptMs, totalMs };
}

export async function profilePdfGenerationLatency(disputeId: string): Promise<{
  totalMs: number;
  sizeBytes?: number;
}> {
  const start = Date.now();

  const opinion = await prisma.opinion.findUnique({ where: { disputeId } });
  if (!opinion) {
    logger.warn('No opinion found for PDF profiling', { disputeId });
    return { totalMs: Date.now() - start };
  }

  const totalMs = Date.now() - start;
  logger.info('PDF generation profile', { disputeId, totalMs });

  return { totalMs };
}
