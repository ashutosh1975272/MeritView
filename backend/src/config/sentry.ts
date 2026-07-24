import * as Sentry from '@sentry/node';
import { getEnv } from './env';

export function initializeSentry(): void {
  const env = getEnv();

  if (!env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 0.0,
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 0.0,
    enableTracing: env.NODE_ENV === 'production',
    attachStacktrace: true,
    maxBreadcrumbs: 50,
    debug: env.NODE_ENV === 'development',
  });
}

export function getSentryDSN(): string | undefined {
  return getEnv().SENTRY_DSN;
}
