import { getEnv } from '../../config/env';
import { getEmailConfig, getDkimConfig, EMAIL_QUEUE_CONFIG } from '../../config/email';
import { logger } from '../../utils/logger';
import { InMemoryEmailQueue, EmailJobData, EmailQueueStatus } from './in-memory-queue';
import { createTransport } from 'nodemailer';

const env = getEnv();
const emailConfig = getEmailConfig();

const inMemoryQueue = new InMemoryEmailQueue();

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
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

export async function sendEmail(input: SendEmailInput): Promise<EmailResult> {
  try {
    const transporter = createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth || undefined,
      ignoreTLS: !emailConfig.secure,
    });

    const headers = buildHeaders();

    const info = await transporter.sendMail({
      from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      headers,
    });

    logger.info('Email sent successfully', { to: input.to, subject: input.subject, messageId: info.messageId });
    return { success: true, messageId: info.messageId || undefined };
  } catch (error) {
    logger.error('Failed to send email', error as Error, { to: input.to, subject: input.subject });
    return { success: false, error: (error as Error).message };
  }
}

export async function queueEmail(input: SendEmailInput): Promise<EmailJobData> {
  const job = inMemoryQueue.add({
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  logger.info('Email queued in-memory', { to: input.to, subject: input.subject, jobId: job.id });
  return job;
}

export function getInMemoryQueue(): InMemoryEmailQueue {
  return inMemoryQueue;
}

export function processEmailQueue(): void {
  inMemoryQueue.processQueue(async (job: EmailJobData) => {
    const result = await sendEmail({ to: job.to, subject: job.subject, html: job.html });
    if (result.success) {
      return { status: 'completed' as EmailQueueStatus };
    }
    return { status: 'failed' as EmailQueueStatus, error: result.error };
  });
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const { verificationEmail } = await import('./templates/verification-email');
  await queueEmail({
    to: email,
    subject: 'Verify your MeritView email address',
    html: verificationEmail({ link }),
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const { passwordReset } = await import('./templates/password-reset');
  await queueEmail({
    to: email,
    subject: 'Reset your MeritView password',
    html: passwordReset({ link }),
  });
}

export async function sendDisputeCreatedEmail(email: string, disputeTitle: string, disputeId: string): Promise<void> {
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/disputes/${disputeId}`;
  const { disputeCreated } = await import('./templates/dispute-created');
  await queueEmail({
    to: email,
    subject: 'Dispute created - Next steps',
    html: disputeCreated({ disputeTitle, disputeLink: link }),
  });
}

export async function sendBriefSubmittedEmail(email: string, disputeTitle: string, disputeId: string): Promise<void> {
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/disputes/${disputeId}`;
  const { briefSubmitted } = await import('./templates/brief-submitted');
  await queueEmail({
    to: email,
    subject: 'Brief submitted successfully',
    html: briefSubmitted({ disputeTitle, disputeLink: link }),
  });
}

export async function sendPaymentSuccessEmail(email: string, disputeTitle: string, amount: number): Promise<void> {
  const { paymentSuccess } = await import('./templates/payment-success');
  await queueEmail({
    to: email,
    subject: 'Payment successful - Analysis in progress',
    html: paymentSuccess({ disputeTitle, amount }),
  });
}

export async function sendPaymentFailedEmail(email: string, disputeTitle: string, disputeId: string): Promise<void> {
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/disputes/${disputeId}/payment`;
  const { paymentFailed } = await import('./templates/payment-failed');
  await queueEmail({
    to: email,
    subject: 'Payment failed - Action required',
    html: paymentFailed({ disputeTitle, retryLink: link }),
  });
}

export async function sendOpinionReadyEmail(email: string, disputeTitle: string, disputeId: string): Promise<void> {
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/disputes/${disputeId}/opinion`;
  const { opinionReady } = await import('./templates/opinion-ready');
  await queueEmail({
    to: email,
    subject: 'Your MeritView opinion is ready',
    html: opinionReady({ disputeTitle, opinionLink: link }),
  });
}

export async function sendAccountDeletionEmail(email: string, displayName: string): Promise<void> {
  const { accountDeletion } = await import('./templates/account-deletion');
  await queueEmail({
    to: email,
    subject: 'Account deletion confirmation',
    html: accountDeletion({ displayName }),
  });
}

export interface EmailMetrics {
  totalQueued: number;
  totalProcessed: number;
  totalFailed: number;
  deadLetterCount: number;
  queueDepth: number;
}

export function getEmailMetrics(): EmailMetrics {
  return inMemoryQueue.getMetrics();
}

export { EMAIL_QUEUE_CONFIG };
