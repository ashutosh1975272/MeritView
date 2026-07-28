import express, { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { getEnv } from './config/env';
import { connectDatabase, disconnectDatabase } from './db/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { prisma } from './db/prisma';
import { redis } from './config/redis';
import { logger } from './utils/logger';
import { helmetMiddleware } from './middleware/helmet';
import { corsMiddleware } from './middleware/cors';
import { requestIdMiddleware } from './middleware/requestId';
import { generalRateLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authMiddleware, AuthenticatedRequest } from './middleware/auth';
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics';
import { i18nMiddleware } from './middleware/i18n';

const env = getEnv();

import { expressErrorHandler } from '@sentry/node';

const app: express.Express = express();

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    maxBreadcrumbs: 50,
  });
}

app.set('trust proxy', true);
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(requestIdMiddleware);
app.use(metricsMiddleware);
app.use(generalRateLimiter);

app.get('/health', async (req: Request, res: Response) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    healthy = false;
  }

  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
    healthy = false;
  }

  const status = healthy ? 'ok' : 'degraded';
  const statusCode = healthy ? 200 : 503;
  res.status(statusCode).json({ status, checks, timestamp: new Date().toISOString() });
});

app.get('/readyz', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
  }
});

app.get('/metrics', metricsEndpoint);

app.get('/v1/version', (req: Request, res: Response) => {
  res.json({ version: '0.1.0', name: 'MeritView API' });
});

import os from 'os';
import path from 'path';
app.use('/uploads', express.static(path.join(os.tmpdir(), 'meritview-uploads')));

import { authRouter } from './routes/v1/auth.routes';
import { userRouter } from './routes/v1/user.routes';
import { disputeRouter } from './routes/v1/disputes.routes';
import { briefRouter } from './routes/v1/briefs.routes';
import { paymentRouter } from './routes/v1/payments.routes';
import { webhookRouter } from './routes/v1/webhooks.routes';
import { evaluationRouter } from './routes/v1/evaluation.routes';
import { adminRouter } from './routes/v1/admin.routes';
import { opinionRouter } from './routes/v1/opinions.routes';
import { invitationRouter } from './routes/v1/invitations.routes';
import { documentRouter } from './routes/v1/documents.routes';
import { supportRouter } from './routes/v1/support.routes';
import { mediatorRouter } from './routes/v1/mediator.routes';

app.use(i18nMiddleware);
app.use('/v1/auth', authRouter);
app.use('/v1/users', userRouter);
app.use('/v1/disputes', disputeRouter);
app.use('/v1', briefRouter);
app.use('/v1', paymentRouter);
app.use('/webhooks', webhookRouter);
app.use(evaluationRouter);
app.use('/v1', adminRouter);
app.use(opinionRouter);
app.use(invitationRouter);
app.use(mediatorRouter);
app.use(documentRouter);
app.use(supportRouter);

app.use(notFoundHandler);

if (env.SENTRY_DSN) {
  app.use(expressErrorHandler());
}

app.use(errorHandler);

async function start() {
  try {
    await connectDatabase();
    await connectRedis();

    const { initializeProviders } = await import('./providers/init.js');
    initializeProviders();

    const server = app.listen(env.PORT, () => {
      logger.info(`Server started on port ${env.PORT}`);
    });

    const { setupBriefPrepWebSocket } = await import('./services/brief-prep/websocket.js');
    setupBriefPrepWebSocket(server);

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        await disconnectDatabase();
        await disconnectRedis();
        logger.info('Shutdown complete');
        process.exit(0);
      });
      
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', err);
      shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', reason as Error);
    });
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

start();

import './jobs/email.worker';
import './jobs/evaluation.worker';
import { startCronScheduler } from './jobs/cron';

startCronScheduler();

export { app };