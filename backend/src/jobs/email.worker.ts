import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';
import { emailQueue } from './queues';

const env = getEnv();

const redisUrl = new URL(env.REDIS_URL);

const connection = new IORedis({
  host: redisUrl.hostname,
  port: Number(redisUrl.port),
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
});

interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

const worker = new Worker<EmailJobData>(
  'email',
  async (job: Job<EmailJobData>) => {
    const { to, subject, html } = job.data;
    logger.info('Sending email', { to, subject, jobId: job.id });

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: env.SMTP_HOST || 'localhost',
      port: env.SMTP_PORT || 1025,
      auth: env.SMTP_USER ? {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS || '',
      } : undefined,
      ignoreTLS: true,
    });

    await transporter.sendMail({
      from: env.FROM_EMAIL,
      to,
      subject,
      html,
    });

    logger.info('Email sent successfully', { to, subject, jobId: job.id });
  },
  {
    connection,
    concurrency: 5,
  }
);

worker.on('completed', (job) => {
  logger.info('Email job completed', { jobId: job.id });
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  logger.error('Email job failed', err, { jobId: job?.id, attempts: job?.attemptsMade } as Record<string, unknown>);
});

worker.on('error', (err: Error) => {
  logger.error('Email worker error', err);
});

export async function sendEmailAsync(to: string, subject: string, html: string): Promise<void> {
  await emailQueue.add('send-email', { to, subject, html });
  logger.info('Email queued', { to, subject });
}

export default worker;
