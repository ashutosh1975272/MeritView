import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  replaysSessionSampleRate: process.env.NODE_ENV === 'development' ? 0.1 : 0.01,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
  debug: false,
});
