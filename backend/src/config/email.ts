import nodemailer from 'nodemailer';
import { getEnv } from './env';

const env = getEnv();

let transporter: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (env.SMTP_HOST && env.SMTP_PORT) {
      const dkimConfigured = Boolean(
        env.SMTP_DKIM_DOMAIN &&
        env.SMTP_DKIM_KEY_SELECTOR &&
        env.SMTP_DKIM_PRIVATE_KEY
      );

      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
        dkim: env.NODE_ENV === 'production' && dkimConfigured ? {
          domainName: env.SMTP_DKIM_DOMAIN,
          keySelector: env.SMTP_DKIM_KEY_SELECTOR,
          privateKey: env.SMTP_DKIM_PRIVATE_KEY,
        } : undefined,
      });
    } else {
      if (env.NODE_ENV === 'production') {
        throw new Error('SMTP_HOST and SMTP_PORT must be configured in production');
      }

      console.warn('No SMTP server configured. Using JSON email transport; emails will be logged but not delivered.');
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }
  return transporter;
}

export function getFromAddress(): string {
  return env.FROM_EMAIL;
}

export function getFromName(): string {
  return env.SMTP_FROM_NAME;
}
