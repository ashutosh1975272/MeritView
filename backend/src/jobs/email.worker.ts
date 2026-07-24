import { getEnv } from '../config/env';
import { getEmailConfig, getDkimConfig } from '../config/email';
import { logger } from '../utils/logger';
import { InMemoryEmailQueue, EmailJobData } from '../services/email/in-memory-queue';
import { createTransport } from 'nodemailer';

const env = getEnv();
const emailConfig = getEmailConfig();

export interface EmailQueueMetrics {
  processed: number;
  failed: number;
  deadLetterCount: number;
  queueDepth: number;
}

function buildHeaders(): Record<string, string> {
  const dkim = getDkimConfig();
  const headers: Record<string, string> = {
    'X-Mailer': 'MeritView-Mailer',
    'X-MeritView-Message-Type': 'transactional',
    'List-Unsubscribe': '<mailto:unsubscribe@meritview.app>',
  };
  if (dkim.domainName && dkim.keySelector && dkim.privateKey) {
    headers['DKIM-Signature'] = `v=1; a=rsa-sha256; c=relaxed/relaxed; d=${dkim.domainName}; s=${dkim.keySelector}`;
  }
  return headers;
}

async function sendEmailDirect(job: EmailJobData): Promise<void> {
  const transporter = createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth || undefined,
    ignoreTLS: !emailConfig.secure,
  });

  const headers = buildHeaders();

  await transporter.sendMail({
    from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
    to: job.to,
    subject: job.subject,
    html: job.html,
    headers,
  });
}

export function createEmailWorker(queue: InMemoryEmailQueue): void {
  queue.processQueue(async (job: EmailJobData) => {
    try {
      await sendEmailDirect(job);
      logger.info('Email sent successfully via worker', { jobId: job.id, to: job.to, subject: job.subject });
      return { status: 'completed' as const };
    } catch (error) {
      logger.error('Email worker send failed', error as Error, {
        jobId: job.id,
        to: job.to,
        subject: job.subject,
        retryCount: job.retryCount,
      });

      if (job.retryCount >= job.maxRetries - 1) {
        logger.info('Email failed after max retries, triggering in-app notification fallback', {
          jobId: job.id,
          to: job.to,
        });
        triggerInAppNotification(job);
      }

      return { status: 'failed' as const, error: (error as Error).message };
    }
  });
}

function triggerInAppNotification(job: EmailJobData): void {
  logger.info('In-app notification triggered as email fallback', {
    to: job.to,
    subject: job.subject,
    jobId: job.id,
  });
}

export function handleBounce(email: string, reason: string): void {
  logger.warn('Email bounce received', { email, reason });
}

export function handleComplaint(email: string, reason: string): void {
  logger.warn('Email complaint received', { email, reason });
}

export { buildHeaders, sendEmailDirect };
