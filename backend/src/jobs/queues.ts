import { Queue, Worker } from 'bullmq';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';

const env = getEnv();

const connection = {
  url: env.REDIS_URL,
};

export const evaluationQueue = new Queue('evaluation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export async function addEvaluationJob(disputeId: string, userId: string): Promise<void> {
  await evaluationQueue.add(
    'evaluate-dispute',
    { disputeId, userId },
    {
      jobId: `eval:${disputeId}`,
      removeOnFail: false,
    }
  );
  logger.info('Evaluation job queued', { disputeId, userId });
}

export async function addEmailJob(
  template: string,
  to: string,
  data: Record<string, unknown>
): Promise<void> {
  await emailQueue.add(
    'send-email',
    { template, to, data },
    {
      removeOnFail: false,
    }
  );
  logger.info('Email job queued', { template, to });
}
