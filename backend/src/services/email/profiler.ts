import { prisma } from '../../db/prisma';
import { getInMemoryQueue } from './index';
import { logger } from '../../utils/logger';

export async function profileEmailQueueLatency(): Promise<{
  queueDepth: number;
  totalQueued: number;
  totalProcessed: number;
  totalFailed: number;
  estimatedLatencyMs: number;
}> {
  const metrics = getInMemoryQueue().getMetrics();
  const queueDepth = metrics.queueDepth;
  const estimatedLatencyMs = queueDepth * 100;

  logger.info('Email queue profile', {
    queueDepth,
    totalQueued: metrics.totalQueued,
    totalProcessed: metrics.totalProcessed,
    totalFailed: metrics.totalFailed,
    estimatedLatencyMs,
  });

  return {
    queueDepth,
    totalQueued: metrics.totalQueued,
    totalProcessed: metrics.totalProcessed,
    totalFailed: metrics.totalFailed,
    estimatedLatencyMs,
  };
}

export async function profileEmailSendLatency(): Promise<{
  averageMs: number;
  sampleCount: number;
}> {
  const sentEmails = await prisma.auditEvent.findMany({
    where: {
      eventType: 'email_sent',
      createdAt: { gte: new Date(Date.now() - 86400000) },
    },
    take: 100,
    orderBy: { createdAt: 'desc' },
  });

  return {
    averageMs: 0,
    sampleCount: sentEmails.length,
  };
}
