import { Worker, Job, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';
import { generateOpinionPdf } from '../services/opinions';
import { prisma } from '../db/prisma';
import crypto from 'crypto';

const env = getEnv();

const redisUrl = new URL(env.REDIS_URL);
const connection = new IORedis({
  host: redisUrl.hostname,
  port: Number(redisUrl.port),
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
});

export const pdfQueue = new Queue('pdf-generation', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

interface PdfJobData {
  disputeId: string;
  opinionId: string;
}

const worker = new Worker<PdfJobData>(
  'pdf-generation',
  async (job: Job<PdfJobData>) => {
    const { disputeId, opinionId } = job.data;
    logger.info('Processing PDF generation job', { disputeId, opinionId, jobId: job.id });

    const pdfBuffer = await generateOpinionPdf(disputeId);
    const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    const pdfStorageKey = `opinions/${disputeId}/${pdfHash}.pdf`;

    await prisma.opinion.update({
      where: { id: opinionId },
      data: {
        pdfStorageKey,
        pdfGeneratedAt: new Date(),
      },
    });

    logger.info('PDF generated via async queue', { disputeId, pdfStorageKey });
    return { pdfStorageKey };
  },
  { connection, concurrency: 1 }
);

worker.on('completed', (job) => {
  logger.info('PDF worker completed', { jobId: job.id });
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  logger.warn('PDF worker failed, web-only fallback', {
    jobId: job?.id,
    disputeId: job?.data.disputeId,
    error: err.message,
  });
});

worker.on('error', (err: Error) => {
  logger.error('PDF worker error', err);
});

export async function queuePdfGeneration(disputeId: string, opinionId: string): Promise<void> {
  await pdfQueue.add('generate-pdf', { disputeId, opinionId });
  logger.info('PDF generation job queued', { disputeId, opinionId });
}

export default worker;
