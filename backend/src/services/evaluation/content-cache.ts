import crypto from 'crypto';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';

const CACHE_TTL_SECONDS = 3600;
const CACHE_PREFIX = 'eval:content:';

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function buildCacheKey(disputeId: string, contentHash: string): string {
  return `${CACHE_PREFIX}${disputeId}:${contentHash}`;
}

export async function getCachedEvaluation(contentHash: string): Promise<any | null> {
  try {
    const cacheKey = `${CACHE_PREFIX}hash:${contentHash}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info('Evaluation cache hit', { contentHash: contentHash.slice(0, 12) });
      return JSON.parse(cached);
    }
    return null;
  } catch (error: any) {
    logger.warn('Evaluation cache read error', { error: error.message });
    return null;
  }
}

export async function setCachedEvaluation(
  contentHash: string,
  data: any
): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIX}hash:${contentHash}`;
    await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(data));
    logger.info('Evaluation cache set', { contentHash: contentHash.slice(0, 12) });
  } catch (error: any) {
    logger.warn('Evaluation cache write error', { error: error.message });
  }
}
