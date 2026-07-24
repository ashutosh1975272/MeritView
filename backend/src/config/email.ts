import { getEnv } from './env';

const env = getEnv();

export interface EmailProviderConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string } | null;
  fromEmail: string;
  fromName: string;
}

export interface DkimConfig {
  domainName: string;
  keySelector: string;
  privateKey: string;
}

export function getEmailConfig(): EmailProviderConfig {
  return {
    host: env.SMTP_HOST || 'localhost',
    port: env.SMTP_PORT || 587,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS || '' }
      : null,
    fromEmail: env.FROM_EMAIL || 'noreply@meritview.app',
    fromName: 'MeritView',
  };
}

export function getDkimConfig(): DkimConfig {
  return {
    domainName: 'meritview.app',
    keySelector: 'mail',
    privateKey: process.env.DKIM_PRIVATE_KEY || '',
  };
}

export const EMAIL_QUEUE_CONFIG = {
  maxRetries: 3,
  backoffDelay: 2000,
  deadLetterQueueMaxSize: 1000,
};
