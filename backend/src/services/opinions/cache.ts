import { prisma } from '../../db/prisma';
import { redis } from '../../config/redis';
import { decrypt } from '../../utils/crypto';
import { logger } from '../../utils/logger';

const OPINION_CACHE_TTL_SECONDS = 300;
const OPINION_CACHE_PREFIX = 'opinion:';

export async function getCachedOpinion(disputeId: string, userId: string): Promise<any | null> {
  const cacheKey = `${OPINION_CACHE_PREFIX}${disputeId}:${userId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info('Opinion cache hit', { disputeId });
      return JSON.parse(cached);
    }
  } catch (error: any) {
    logger.warn('Opinion cache read error', { error: error.message });
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { opinions: true, parties: true },
  });

  if (!dispute?.opinions) return null;

  const opinion = dispute.opinions;
  const decryptedContent = decrypt(
    Buffer.from(opinion.encryptedContent).toString('base64'),
    opinion.contentEncryptionKeyId
  );
  const content = JSON.parse(decryptedContent);

  const result = { id: opinion.id, disputeId: opinion.disputeId, ...content };

  try {
    await redis.setex(cacheKey, OPINION_CACHE_TTL_SECONDS, JSON.stringify(result));
  } catch (error: any) {
    logger.warn('Opinion cache write error', { error: error.message });
  }

  return result;
}

export async function invalidateOpinionCache(disputeId: string, userIds: string[]): Promise<void> {
  const keys = userIds.map(uid => `${OPINION_CACHE_PREFIX}${disputeId}:${uid}`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
