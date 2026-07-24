import Redis from 'ioredis';
import { getEnv } from '../config/env';

const env = getEnv();

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      enableReadyCheck: true,
      lazyConnect: true,
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    
    redisClient.on('connect', () => {
      console.log('Redis connected');
    });
  }
  
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const client = getRedis();
  if (client.status === 'wait') {
    await client.connect();
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export const redis = {
  get: (key: string) => getRedis().get(key),
  set: (key: string, value: string, mode?: string, ttlMs?: number) => {
    const client = getRedis();
    if (ttlMs) {
      return client.set(key, value, 'PX', ttlMs);
    }
    return client.set(key, value);
  },
  setex: (key: string, ttlSeconds: number, value: string) => getRedis().setex(key, ttlSeconds, value),
  psetex: (key: string, ttlMs: number, value: string) => getRedis().psetex(key, ttlMs, value),
  del: (key: string) => getRedis().del(key),
  exists: (key: string) => getRedis().exists(key),
  expire: (key: string, seconds: number) => getRedis().expire(key, seconds),
  pexpire: (key: string, ms: number) => getRedis().pexpire(key, ms),
  ttl: (key: string) => getRedis().ttl(key),
  pttl: (key: string) => getRedis().pttl(key),
  keys: (pattern: string) => getRedis().keys(pattern),
  incr: (key: string) => getRedis().incr(key),
  decr: (key: string) => getRedis().decr(key),
  eval: (script: string, numKeys: number, ...keys: string[]) => getRedis().eval(script, numKeys, ...keys),
  evalsha: (sha: string, numKeys: number, ...keys: string[]) => getRedis().evalsha(sha, numKeys, ...keys),
  script: {
    load: (script: string) => getRedis().script('LOAD', script),
  },
};