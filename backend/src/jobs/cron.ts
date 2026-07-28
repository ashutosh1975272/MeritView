import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

export async function expireInvitations(): Promise<number> {
  const result = await prisma.party.updateMany({
    where: {
      invitationStatus: 'PENDING',
      invitationExpiresAt: { lte: new Date() },
    },
    data: { invitationStatus: 'EXPIRED' },
  });

  if (result.count > 0) {
    logger.info('Invitations expired', { count: result.count });
  }

  return result.count;
}

export async function purgeStaleBriefPrepSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await prisma.briefPrepSession.updateMany({
    where: {
      status: 'ACTIVE',
      lastActivityAt: { lt: cutoff },
    },
    data: { status: 'PURGED' },
  });

  if (result.count > 0) {
    logger.info('Stale brief prep sessions purged', { count: result.count });
  }

  return result.count;
}

export async function purgeDeletedUsers(): Promise<number> {
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const usersToPurge = await prisma.user.findMany({
    where: {
      deletedAt: { lte: cutoff },
    },
    select: { id: true, email: true },
  });

  for (const user of usersToPurge) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: `purged_${user.id}@meritview.app`,
        displayName: null,
        passwordHash: null,
        totpSecret: null,
      },
    });
  }

  if (usersToPurge.length > 0) {
    logger.info('Deleted user PII purged', { count: usersToPurge.length });
  }

  return usersToPurge.length;
}

export async function softDeleteOldDisputes(): Promise<number> {
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const result = await prisma.dispute.updateMany({
    where: {
      deletedAt: null,
      createdAt: { lte: cutoff },
      state: { in: ['COMPLETED', 'WITHDRAWN', 'DECLINED'] },
    },
    data: { deletedAt: new Date() },
  });

  if (result.count > 0) {
    logger.info('Old disputes soft-deleted', { count: result.count });
  }

  return result.count;
}

export async function runHourlyJobs(): Promise<void> {
  const startedAt = Date.now();
  logger.info('Starting hourly cron jobs');

  const expired = await expireInvitations();
  const purged = await purgeStaleBriefPrepSessions();

  logger.info('Hourly cron jobs completed', {
    expiredInvitations: expired,
    purgedSessions: purged,
    durationMs: Date.now() - startedAt,
  });
}

export async function runDailyJobs(): Promise<void> {
  const startedAt = Date.now();
  logger.info('Starting daily cron jobs');

  const deleted = await softDeleteOldDisputes();
  const purgedUsers = await purgeDeletedUsers();

  logger.info('Daily cron jobs completed', {
    deletedDisputes: deleted,
    purgedUsers,
    durationMs: Date.now() - startedAt,
  });
}

const HOURLY_INTERVAL_MS = 60 * 60 * 1000;
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function startCronScheduler(): void {
  logger.info('Starting cron job scheduler');

  const msUntilNextHour = HOURLY_INTERVAL_MS - (Date.now() % HOURLY_INTERVAL_MS);
  const msUntilNextDay = DAILY_INTERVAL_MS - (Date.now() % DAILY_INTERVAL_MS);

  setTimeout(() => {
    runHourlyJobs().catch(err => logger.error('Hourly cron job failed', err as Error));
    setInterval(() => {
      runHourlyJobs().catch(err => logger.error('Hourly cron job failed', err as Error));
    }, HOURLY_INTERVAL_MS);
  }, msUntilNextHour);

  setTimeout(() => {
    runDailyJobs().catch(err => logger.error('Daily cron job failed', err as Error));
    setInterval(() => {
      runDailyJobs().catch(err => logger.error('Daily cron job failed', err as Error));
    }, DAILY_INTERVAL_MS);
  }, msUntilNextDay);

  logger.info('Cron scheduler configured', {
    hourlyInterval: `${HOURLY_INTERVAL_MS / 60000}m`,
    dailyInterval: `${DAILY_INTERVAL_MS / 3600000}h`,
    firstHourlyIn: `${Math.round(msUntilNextHour / 60000)}m`,
    firstDailyIn: `${Math.round(msUntilNextDay / 3600000)}h`,
  });
}
