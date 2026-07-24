import { prisma } from '../../db/prisma';
import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';

const DASHBOARD_STATS_KEY = 'admin:dashboard:stats';
const CACHE_TTL_SECONDS = 60;

export interface DashboardStats {
  totalDisputes: number;
  pendingAggregations: number;
  completedToday: number;
  totalRevenue: number;
  averageCostPerDispute: number;
}

export async function getCachedDashboardStats(): Promise<DashboardStats> {
  try {
    const cached = await redis.get(DASHBOARD_STATS_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
  }

  const stats = await computeDashboardStats();
  await redis.setex(DASHBOARD_STATS_KEY, CACHE_TTL_SECONDS, JSON.stringify(stats));
  return stats;
}

export async function computeDashboardStats(): Promise<DashboardStats> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    totalDisputes,
    pendingAggregations,
    completedToday,
    paymentsResult,
    costResult,
  ] = await Promise.all([
    prisma.dispute.count({ where: { deletedAt: null } }),
    prisma.dispute.count({ where: { state: 'AWAITING_AGGREGATION', deletedAt: null } }),
    prisma.dispute.count({ where: { completedAt: { gte: startOfDay }, deletedAt: null } }),
    prisma.payment.aggregate({ _sum: { amountUsd: true }, where: { status: 'SUCCEEDED' } }),
    prisma.evaluatorOutput.aggregate({ _sum: { costUsd: true } }),
  ]);

  const totalRevenue = Number(paymentsResult._sum.amountUsd || 0);
  const totalCost = Number(costResult._sum.costUsd || 0);

  return {
    totalDisputes,
    pendingAggregations,
    completedToday,
    totalRevenue,
    averageCostPerDispute: totalDisputes > 0 ? totalCost / totalDisputes : 0,
  };
}

export async function invalidateDashboardCache(): Promise<void> {
  await redis.del(DASHBOARD_STATS_KEY);
}

export function startDashboardCacheAutoRefresh(): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const stats = await computeDashboardStats();
      await redis.setex(DASHBOARD_STATS_KEY, CACHE_TTL_SECONDS, JSON.stringify(stats));
    } catch (error: any) {
      logger.error('Auto-refresh dashboard cache failed', error);
    }
  }, CACHE_TTL_SECONDS * 1000);
}
