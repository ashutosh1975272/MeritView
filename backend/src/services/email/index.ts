import nodemailer from 'nodemailer';
import { getEnv } from '../../config/env';
import { logger } from '../../utils/logger';
import { InternalError } from '../../utils/errors';

const env = getEnv();

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (env.SMTP_HOST && env.SMTP_PORT) {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER || '',
          pass: env.SMTP_PASS || '',
        },
      });
    } else {
      logger.warn('SMTP not configured, using JSON transport');
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }
  return transporter;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: `"MeritView" <${env.FROM_EMAIL}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    logger.info('Email sent', {
      to: input.to,
      subject: input.subject,
      messageId: info.messageId,
    });
  } catch (error) {
    logger.error('Failed to send email', error as Error, {
      to: input.to,
      subject: input.subject,
    });
    throw new InternalError('Failed to send email');
  }
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const { verificationEmail } = await import('./templates/verificationEmail.js');
  await sendEmail({
    to: email,
    subject: 'Verify your MeritView email address',
    html: verificationEmail({ link }),
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const { passwordReset } = await import('./templates/passwordReset.js');
  await sendEmail({
    to: email,
    subject: 'Reset your MeritView password',
    html: passwordReset({ link }),
  });
}

export async function sendDisputeCreatedEmail(email: string, disputeTitle: string, disputeId: string): Promise<void> {
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/disputes/${disputeId}`;
  const { disputeCreated } = await import('./templates/disputeCreated.js');
  await sendEmail({
    to: email,
    subject: 'Dispute created - Next steps',
    html: disputeCreated({ disputeTitle, disputeLink: link }),
  });
}

export async function sendBriefSubmittedEmail(email: string, disputeTitle: string, disputeId: string): Promise<void> {
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/disputes/${disputeId}`;
  const { briefSubmitted } = await import('./templates/briefSubmitted.js');
  await sendEmail({
    to: email,
    subject: 'Brief submitted successfully',
    html: briefSubmitted({ disputeTitle, disputeLink: link }),
  });
}

export async function sendPaymentSuccessEmail(email: string, disputeTitle: string, amount: number): Promise<void> {
  const { paymentSuccess } = await import('./templates/paymentSuccess.js');
  await sendEmail({
    to: email,
    subject: 'Payment successful - Analysis in progress',
    html: paymentSuccess({ disputeTitle, amount }),
  });
}

export async function sendPaymentFailedEmail(email: string, disputeTitle: string, disputeId: string): Promise<void> {
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/disputes/${disputeId}/payment`;
  const { paymentFailed } = await import('./templates/paymentFailed.js');
  await sendEmail({
    to: email,
    subject: 'Payment failed - Action required',
    html: paymentFailed({ disputeTitle, retryLink: link }),
  });
}

export async function sendOpinionReadyEmail(email: string, disputeTitle: string, disputeId: string): Promise<void> {
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const link = `${appUrl}/disputes/${disputeId}/opinion`;
  const { opinionReady } = await import('./templates/opinionReady.js');
  await sendEmail({
    to: email,
    subject: 'Your MeritView opinion is ready',
    html: opinionReady({ disputeTitle, opinionLink: link }),
  });
}

export async function sendAccountDeletionEmail(email: string, displayName: string): Promise<void> {
  const { accountDeletion } = await import('./templates/accountDeletion.js');
  await sendEmail({
    to: email,
    subject: 'Account deletion confirmation',
    html: accountDeletion({ displayName }),
  });
}
