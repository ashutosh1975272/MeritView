import { getEnv } from '../config/env';
import { redis } from '../config/redis';

const env = getEnv();

const METRICS_PREFIX = 'meritview:metrics';

function metricKey(name: string): string {
  return `${METRICS_PREFIX}:${env.NODE_ENV}:${name}`;
}

export const metrics = {
  async incrementCounter(name: string, value: number = 1): Promise<void> {
    try {
      await redis.incr(metricKey(`counter:${name}`));
    } catch {
    }
  },

  async recordGauge(name: string, value: number): Promise<void> {
    try {
      await redis.set(metricKey(`gauge:${name}`), value.toString());
    } catch {
    }
  },

  async recordLatency(name: string, durationMs: number): Promise<void> {
    try {
      const key = metricKey(`latency:${name}`);
      await redis.lpush(key, durationMs.toString());
      await redis.ltrim(key, 0, 999);
      await redis.expire(key, 86400);
    } catch {
    }
  },

  async trackRequest(method: string, path: string, statusCode: number, durationMs: number): Promise<void> {
    try {
      const timestamp = Math.floor(Date.now() / 60000);
      const requestsKey = metricKey(`requests:${timestamp}`);
      await redis.incr(requestsKey);
      await redis.expire(requestsKey, 7200);

      const statusBucket = Math.floor(statusCode / 100) * 100;
      const errorsKey = metricKey(`errors:${statusBucket}:${timestamp}`);
      if (statusCode >= 400) {
        await redis.incr(errorsKey);
        await redis.expire(errorsKey, 7200);
      }

      await this.recordLatency(`p95:${method}:${path}`, durationMs);
    } catch {
    }
  },

  async trackBusinessMetric(name: string, value: number = 1): Promise<void> {
    try {
      const day = new Date().toISOString().slice(0, 10);
      const key = metricKey(`business:${name}:${day}`);
      await redis.incrby(key, value);
      await redis.expire(key, 86400 * 90);
    } catch {
    }
  },

  async getRequestRate(minutes: number = 5): Promise<number> {
    try {
      let total = 0;
      const now = Math.floor(Date.now() / 60000);
      for (let i = 0; i < minutes; i++) {
        const val = await redis.get(metricKey(`requests:${now - i}`));
        total += parseInt(val || '0', 10);
      }
      return Math.round(total / minutes);
    } catch {
      return 0;
    }
  },

  async getErrorRate(minutes: number = 5): Promise<number> {
    try {
      let errors = 0;
      let total = 0;
      const now = Math.floor(Date.now() / 60000);
      for (let i = 0; i < minutes; i++) {
        const ts = now - i;
        const reqVal = await redis.get(metricKey(`requests:${ts}`));
        total += parseInt(reqVal || '0', 10);
        for (const bucket of ['400', '500']) {
          const errVal = await redis.get(metricKey(`errors:${bucket}:${ts}`));
          errors += parseInt(errVal || '0', 10);
        }
      }
      if (total === 0) return 0;
      return Math.round((errors / total) * 100);
    } catch {
      return 0;
    }
  },

  async getLatencyPercentile(name: string, percentile: number = 95): Promise<number> {
    try {
      const key = metricKey(`latency:${name}`);
      const values = await redis.lrange(key, 0, -1);
      if (values.length === 0) return 0;
      const sorted = values.map(Number).sort((a, b) => a - b);
      const index = Math.ceil((percentile / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    } catch {
      return 0;
    }
  },

  async getDailyMetric(name: string): Promise<number> {
    try {
      const day = new Date().toISOString().slice(0, 10);
      const val = await redis.get(metricKey(`business:${name}:${day}`));
      return parseInt(val || '0', 10);
    } catch {
      return 0;
    }
  },
};
