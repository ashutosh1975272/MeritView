import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';
import { evaluationQueue } from './queues';
import { createEvaluationJob } from '../services/evaluation';

const env = getEnv();

const redisUrl = new URL(env.REDIS_URL);

const connection = new IORedis({
  host: redisUrl.hostname,
  port: Number(redisUrl.port),
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
});

interface EvaluationJobData {
  disputeId: string;
  partyId: string;
}

const worker = new Worker<EvaluationJobData>(
  'evaluation',
  async (job: Job<EvaluationJobData>) => {
    const { disputeId, partyId } = job.data;
    logger.info('Processing evaluation job', { disputeId, partyId, jobId: job.id });

    const result = await createEvaluationJob({ disputeId, partyId });

    logger.info('Evaluation job completed', {
      disputeId,
      jobId: job.id,
      state: result.state,
      successCount: result.successCount,
      failureCount: result.failureCount,
    });

    return result;
  },
  {
    connection,
    concurrency: 2,
  }
);

worker.on('completed', (job) => {
  logger.info('Evaluation worker completed', { jobId: job.id });
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error('Evaluation worker job failed', err, { jobId: job?.id, attempts: job?.attemptsMade } as Record<string, unknown>);
});

worker.on('error', (err: Error) => {
  logger.error('Evaluation worker error', err);
});

export async function queueEvaluation(disputeId: string, partyId: string): Promise<void> {
  await evaluationQueue.add('evaluate-dispute', { disputeId, partyId });
  logger.info('Evaluation job queued', { disputeId, partyId });
}

export default worker;
