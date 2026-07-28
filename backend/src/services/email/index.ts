import { getTransporter, getFromAddress } from '../../config/email';
import { logger } from '../../utils/logger';
import {
  verificationEmail,
  passwordResetEmail,
  disputeCreatedEmail,
  briefSubmittedEmail,
  paymentSuccessEmail,
  paymentFailedEmail,
  opinionReadyEmail,
  accountDeletionEmail,
  invitationEmail,
  invitationAcceptedEmail,
  invitationDeclinedEmail,
} from './templates';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const emailLogger = logger.child({ service: 'email' });

const deliveryMetrics = {
  sent: 0,
  failed: 0,
  bounced: 0,
  complaints: 0,
};

export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
  const transporter = getTransporter();
  const from = getFromAddress();

  try {
    const info = await transporter.sendMail({
      from: `"MeritView" <${from}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
      headers: {
        'X-MeritView-Message-Type': 'transactional',
        'X-MeritView-Message-ID': `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      },
    });

    deliveryMetrics.sent++;
    emailLogger.info('Email sent', { to, subject, messageId: info.messageId });

    if (info.rejected && info.rejected.length > 0) {
      deliveryMetrics.bounced++;
      emailLogger.warn('Email rejected', { to, subject, rejected: info.rejected });
    }

    if (info.accepted && info.accepted.length === 0) {
      deliveryMetrics.failed++;
      emailLogger.warn('Email not accepted by any recipient', { to, subject });
    }

    if (info.pending && info.pending.length > 0) {
      emailLogger.warn('Email pending delivery', { to, subject, pending: info.pending });
    }
  } catch (error) {
    deliveryMetrics.failed++;
    emailLogger.error('Failed to send email', error instanceof Error ? error : undefined, { to, subject });
    throw error;
  }
}

export function getDeliveryMetrics() {
  return { ...deliveryMetrics };
}

export function resetDeliveryMetrics() {
  deliveryMetrics.sent = 0;
  deliveryMetrics.failed = 0;
  deliveryMetrics.bounced = 0;
  deliveryMetrics.complaints = 0;
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const html = verificationEmail(token);
  await sendEmail(email, 'Verify your MeritView email address', html);
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const html = passwordResetEmail(token);
  await sendEmail(email, 'Reset your MeritView password', html);
}

export async function sendDisputeCreatedEmail(email: string, disputeId: string, title: string): Promise<void> {
  const html = disputeCreatedEmail(disputeId, title);
  await sendEmail(email, `Dispute created: ${title}`, html);
}

export async function sendBriefSubmittedEmail(email: string, disputeId: string): Promise<void> {
  const html = briefSubmittedEmail(disputeId);
  await sendEmail(email, 'Your brief has been submitted', html);
}

export async function sendPaymentSuccessEmail(email: string, disputeId: string, amount: number): Promise<void> {
  const html = paymentSuccessEmail(amount);
  await sendEmail(email, 'Payment successful — analysis in progress', html);
}

export async function sendPaymentFailedEmail(email: string, disputeId: string, error: string): Promise<void> {
  const html = paymentFailedEmail(error);
  await sendEmail(email, 'Payment failed — please retry', html);
}

export async function sendOpinionReadyEmail(email: string, disputeId: string): Promise<void> {
  const html = opinionReadyEmail(disputeId);
  await sendEmail(email, 'Your MeritView opinion is ready', html);
}

export async function sendAccountDeletionEmail(email: string): Promise<void> {
  const html = accountDeletionEmail();
  await sendEmail(email, 'Your MeritView account has been deleted', html);
}

export async function sendInvitationSentEmail(
  email: string,
  disputeTitle: string,
  inviterName: string,
  token: string,
  expiresAt: string
): Promise<void> {
  const html = invitationEmail(disputeTitle, inviterName, token, expiresAt);
  await sendEmail(email, `You're invited to a dispute: ${disputeTitle}`, html);
}

export async function sendInvitationAcceptedEmail(email: string, disputeTitle: string): Promise<void> {
  const html = invitationAcceptedEmail(disputeTitle);
  await sendEmail(email, `Invitation accepted: ${disputeTitle}`, html);
}

export async function sendInvitationDeclinedEmail(email: string, disputeTitle: string): Promise<void> {
  const html = invitationDeclinedEmail(disputeTitle);
  await sendEmail(email, `Invitation declined: ${disputeTitle}`, html);
}
