import nodemailer from 'nodemailer';
import { getEnv } from './env';

const env = getEnv();

let transporter: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (env.SMTP_HOST && env.SMTP_PORT) {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
        dkim: env.NODE_ENV === 'production' ? {
          domainName: 'meritview.app',
          keySelector: 'default',
          privateKey: env.SMTP_DKIM_PRIVATE_KEY,
        } : undefined,
      });
    } else {
      console.warn('No SMTP credentials configured. Using localhost:1025 fallback (emails will not be delivered).');
      transporter = nodemailer.createTransport({
        host: 'localhost',
        port: 1025,
        ignoreTLS: true,
      });
    }
  }
  return transporter;
}

export function getFromAddress(): string {
  return env.FROM_EMAIL;
}
