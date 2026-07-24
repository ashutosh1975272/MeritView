import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { getEnv } from '../config/env';

const env = getEnv();

const redisUrl = new URL(env.REDIS_URL);

const connection = new IORedis({
  host: redisUrl.hostname,
  port: Number(redisUrl.port),
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
});

export const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

export const evaluationQueue = new Queue('evaluation', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});
