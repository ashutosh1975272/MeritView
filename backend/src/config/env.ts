import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3001),
  
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  REDIS_URL: z.string().url().startsWith('redis://'),
  
  JWT_SECRET: z.string().min(64, 'JWT_SECRET must be at least 64 characters'),
  JWT_ACCESS_EXPIRY: z.string().regex(/^\d+[smhd]$/, 'Must be a duration like 15m, 1h, 7d').default('15m'),
  JWT_REFRESH_EXPIRY: z.string().regex(/^\d+[smhd]$/, 'Must be a duration like 15m, 1h, 7d').default('7d'),
  
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  TOGETHER_API_KEY: z.string().optional(),
  NVIDIA_API_KEY: z.string().optional(),

  EVALUATION_MODEL: z.string().default('groq/llama-3.3-70b-versatile'),
  AGGREGATION_MODEL: z.string().default('gemini/gemini-1.5-pro'),
  BRIEF_PREP_MODEL: z.string().default('groq/llama-3.1-8b-instant'),
  
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  STRIPE_PRODUCT_ID: z.string().optional(),
  
  PRICE_STANDARD: z.coerce.number().positive().default(49.00),
  PRICE_EXPEDITED: z.coerce.number().positive().default(99.00),
  PRICE_EXTENDED: z.coerce.number().positive().default(199.00),
  PRICE_REANALYSIS: z.coerce.number().positive().default(49.00),
  
  S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().regex(/^[a-z]{2}-[a-z]+-\d$/, 'Must be valid region like us-east-1').default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  
  FROM_EMAIL: z.string().email('Must be a valid email address'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.preprocess(v => v === '' ? undefined : v, z.coerce.number().int().positive().max(65535).optional()),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_DKIM_PRIVATE_KEY: z.string().optional().default(''),
  
  SENTRY_DSN: z.preprocess(v => v === '' ? undefined : v, z.string().url('Must be a valid Sentry DSN URL').optional()),
  
  ENCRYPTION_KEY: z.string().length(64, 'Must be exactly 64 hex characters'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().max(3600000).default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().max(10000).default(100),

  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),

  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (!cachedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors);
      throw new Error('Invalid environment configuration');
    }
    cachedEnv = result.data;
  }
  return cachedEnv;
}

export const env = getEnv();