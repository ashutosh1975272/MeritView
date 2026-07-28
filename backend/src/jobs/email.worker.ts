import { Worker, Job, Queue } from 'bullmq';
import { getEnv } from '../config/env';
import { logger } from '../utils/logger';
import * as emailService from '../services/email';

const env = getEnv();

const connection = {
  url: env.REDIS_URL,
};

const DEAD_LETTER_QUEUE_NAME = 'email-dead-letter';

interface EmailJobData {
  template: string;
  to: string;
  data: Record<string, unknown>;
}

interface DeadLetterJobData extends EmailJobData {
  originalJobId: string | undefined;
  failedAt: string;
  attempts: number;
  lastError: string;
}

export const deadLetterQueue = new Queue<DeadLetterJobData>(DEAD_LETTER_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 100,
  },
});

const jobLogger = logger.child({ worker: 'email' });

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { template, to, data } = job.data;

  jobLogger.info('Processing email job', { jobId: job.id, template, to, attempt: job.attemptsMade + 1 });

  switch (template) {
    case 'verification': {
      const token = data.token as string;
      await emailService.sendVerificationEmail(to, token);
      break;
    }
    case 'password-reset': {
      const token = data.token as string;
      await emailService.sendPasswordResetEmail(to, token);
      break;
    }
    case 'dispute-created': {
      const disputeId = data.disputeId as string;
      const title = data.title as string;
      await emailService.sendDisputeCreatedEmail(to, disputeId, title);
      break;
    }
    case 'brief-submitted': {
      const disputeId = data.disputeId as string;
      await emailService.sendBriefSubmittedEmail(to, disputeId);
      break;
    }
    case 'payment-success': {
      const disputeId = data.disputeId as string;
      const amount = data.amount as number;
      await emailService.sendPaymentSuccessEmail(to, disputeId, amount);
      break;
    }
    case 'payment-failed': {
      const disputeId = data.disputeId as string;
      const error = data.error as string;
      await emailService.sendPaymentFailedEmail(to, disputeId, error);
      break;
    }
    case 'opinion-ready': {
      const disputeId = data.disputeId as string;
      await emailService.sendOpinionReadyEmail(to, disputeId);
      break;
    }
    case 'account-deletion': {
      await emailService.sendAccountDeletionEmail(to);
      break;
    }
    case 'invitation-sent': {
      const disputeTitle = data.disputeTitle as string;
      const inviterName = data.inviterName as string;
      const token = data.token as string;
      const expiresAt = data.expiresAt as string;
      await emailService.sendInvitationSentEmail(to, disputeTitle, inviterName, token, expiresAt);
      break;
    }
    case 'invitation-accepted': {
      const disputeTitle = data.disputeTitle as string;
      await emailService.sendInvitationAcceptedEmail(to, disputeTitle);
      break;
    }
    case 'invitation-declined': {
      const disputeTitle = data.disputeTitle as string;
      await emailService.sendInvitationDeclinedEmail(to, disputeTitle);
      break;
    }
    default:
      jobLogger.warn('Unknown email template', { template });
  }

  jobLogger.info('Email job completed', { jobId: job.id, template, to, attempt: job.attemptsMade + 1 });
}

export const emailWorker = new Worker<EmailJobData>(
  'email',
  async (job: Job<EmailJobData>) => {
    await processEmailJob(job);
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

emailWorker.on('completed', (job: Job) => {
  jobLogger.info('Email worker job completed', {
    jobId: job.id,
    template: job.data.template,
    to: job.data.to,
  });
});

emailWorker.on('failed', async (job: Job<EmailJobData> | undefined, error: Error) => {
  if (!job) return;

  const attemptsMade = job.attemptsMade;
  const maxAttempts = job.opts.attempts || 3;

  jobLogger.error('Email job failed', error, {
    jobId: job.id,
    template: job.data.template,
    to: job.data.to,
    attempt: attemptsMade,
    maxAttempts,
  });

  if (attemptsMade >= maxAttempts) {
    jobLogger.warn('Email job exhausted all retries, moving to dead letter queue', {
      jobId: job.id,
      template: job.data.template,
      to: job.data.to,
    });

    try {
      await deadLetterQueue.add(
        `dead-letter:${job.data.template}`,
        {
          template: job.data.template,
          to: job.data.to,
          data: job.data.data,
          originalJobId: job.id,
          failedAt: new Date().toISOString(),
          attempts: attemptsMade,
          lastError: error.message,
        },
        {
          jobId: `dlq:${job.id}`,
        }
      );
    } catch (dlqError) {
      jobLogger.error('Failed to move job to dead letter queue', dlqError instanceof Error ? dlqError : undefined);
    }
  }
});

emailWorker.on('error', (error: Error) => {
  jobLogger.error('Email worker error', error);
});

logger.info('Email worker initialized', {
  concurrency: 5,
  rateLimit: '10/sec',
  deadLetterQueue: DEAD_LETTER_QUEUE_NAME,
});

export { emailWorker as emailWorkerInstance };
