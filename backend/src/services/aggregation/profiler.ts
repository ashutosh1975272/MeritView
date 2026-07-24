import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';

export async function profileAdminListQuery(filters: {
  state?: string;
  category?: string;
  limit?: number;
}): Promise<{ durationMs: number; rowCount: number }> {
  const start = Date.now();
  const result = await prisma.dispute.findMany({
    where: {
      deletedAt: null,
      ...(filters.state && { state: filters.state as any }),
      ...(filters.category && { category: filters.category as any }),
    },
    take: filters.limit || 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      state: true,
      category: true,
      createdAt: true,
      initiator: { select: { id: true, email: true, displayName: true } },
    },
  });
  const durationMs = Date.now() - start;

  logger.info('Admin list query profile', { durationMs, rowCount: result.length, filters });

  return { durationMs, rowCount: result.length };
}
