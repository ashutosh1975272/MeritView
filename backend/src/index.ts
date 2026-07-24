import express, { Request, Response, NextFunction } from 'express';
import { getEnv } from './config/env';
import { connectDatabase, disconnectDatabase } from './db/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { logger } from './utils/logger';
import { helmetMiddleware } from './middleware/helmet';
import { corsMiddleware } from './middleware/cors';
import { requestIdMiddleware } from './middleware/requestId';
import { generalRateLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authMiddleware, AuthenticatedRequest } from './middleware/auth';

const env = getEnv();

const app = express();

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(requestIdMiddleware);
app.use(generalRateLimiter);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/v1/version', (req: Request, res: Response) => {
  res.json({ version: '0.1.0', name: 'MeritView API' });
});

import { authRouter } from './routes/v1/auth.routes';
import { userRouter } from './routes/v1/user.routes';

app.use('/v1/auth', authRouter);
app.use('/v1/users', userRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await connectDatabase();
    await connectRedis();

    const server = app.listen(env.PORT, () => {
      logger.info(`Server started on port ${env.PORT}`);
    });

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

export { app };