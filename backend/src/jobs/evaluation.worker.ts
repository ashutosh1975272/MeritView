import { Worker, Job } from 'bullmq';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';
import { dispatchEvaluators } from '../services/evaluation/index.js';

const env = getEnv();

const connection = {
  url: env.REDIS_URL,
};

interface EvaluationJobData {
  disputeId: string;
  userId: string;
}

const worker = new Worker<EvaluationJobData>(
  'evaluation',
  async (job: Job<EvaluationJobData>) => {
    const { disputeId, userId } = job.data;

    logger.info('Processing evaluation job', { jobId: job.id, disputeId, userId });

    const result = await dispatchEvaluators(disputeId);

    logger.info('Evaluation dispatch complete', {
      jobId: job.id,
      disputeId,
      successCount: result.successCount,
      failureCount: result.failureCount,
      totalCost: result.totalCost,
    });
  },
  {
    connection,
    concurrency: 3,
  }
);

worker.on('completed', (job: Job) => {
  logger.info('Evaluation job completed', { jobId: job.id, disputeId: job.data.disputeId });
});

worker.on('failed', (job: Job | undefined, error: Error) => {
  if (job) {
    logger.error('Evaluation job failed', error, { jobId: job.id, disputeId: job.data.disputeId });
  }
});

worker.on('error', (error: Error) => {
  logger.error('Evaluation worker error', error);
});

logger.info('Evaluation worker initialized');

export { worker as evaluationWorker };
