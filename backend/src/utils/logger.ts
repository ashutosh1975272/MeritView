import { getEnv } from '../config/env';

const env = getEnv();

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const currentLevel = (env.NODE_ENV === 'production' ? 'info' : 'debug') as LogLevel;

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatLog(entry: LogEntry): string {
  const base = {
    level: entry.level,
    message: entry.message,
    timestamp: entry.timestamp,
    ...(entry.requestId && { requestId: entry.requestId }),
    ...(entry.userId && { userId: entry.userId }),
    ...(entry.metadata && { metadata: entry.metadata }),
    ...(entry.error && { error: entry.error }),
  };
  return JSON.stringify(base);
}

export const logger = {
  debug(message: string, metadata?: Record<string, unknown>, requestId?: string, userId?: string): void {
    if (shouldLog('debug')) {
      console.log(formatLog({
        level: 'debug',
        message,
        timestamp: new Date().toISOString(),
        requestId,
        userId,
        metadata,
      }));
    }
  },

  info(message: string, metadata?: Record<string, unknown>, requestId?: string, userId?: string): void {
    if (shouldLog('info')) {
      console.log(formatLog({
        level: 'info',
        message,
        timestamp: new Date().toISOString(),
        requestId,
        userId,
        metadata,
      }));
    }
  },

  warn(message: string, metadata?: Record<string, unknown>, requestId?: string, userId?: string): void {
    if (shouldLog('warn')) {
      console.warn(formatLog({
        level: 'warn',
        message,
        timestamp: new Date().toISOString(),
        requestId,
        userId,
        metadata,
      }));
    }
  },

  error(message: string, error?: Error, metadata?: Record<string, unknown>, requestId?: string, userId?: string): void {
    if (shouldLog('error')) {
      console.error(formatLog({
        level: 'error',
        message,
        timestamp: new Date().toISOString(),
        requestId,
        userId,
        metadata: {
          ...metadata,
          ...(error && {
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
          }),
        },
      }));
    }
  },

  child(baseMetadata: Record<string, unknown>) {
    return {
      debug: (message: string, metadata?: Record<string, unknown>, requestId?: string, userId?: string) =>
        logger.debug(message, { ...baseMetadata, ...metadata }, requestId, userId),
      info: (message: string, metadata?: Record<string, unknown>, requestId?: string, userId?: string) =>
        logger.info(message, { ...baseMetadata, ...metadata }, requestId, userId),
      warn: (message: string, metadata?: Record<string, unknown>, requestId?: string, userId?: string) =>
        logger.warn(message, { ...baseMetadata, ...metadata }, requestId, userId),
      error: (message: string, error?: Error, metadata?: Record<string, unknown>, requestId?: string, userId?: string) =>
        logger.error(message, error, { ...baseMetadata, ...metadata }, requestId, userId),
    };
  },
};