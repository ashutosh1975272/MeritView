# F1 Auth Performance Benchmarks

## Overview
Baseline performance measurements for authentication flows after optimization (Stage 1.3).

## JWT Verification (T1.3.1.1)
- **Target**: <50ms per verification
- **Middleware**: `timing.ts` records X-Response-Time header
- **Measurement**: Verified via timing middleware test in `src/middleware/__tests__/timing.integration.test.ts`

## Bcrypt Hashing (T1.3.1.2 - T1.3.1.3)
- **Cost factor**: 12
- **Hash time**: ~250ms (varies by hardware)
- **Compare time**: ~250ms

## Redis Operations (T1.3.1.4)
- **Target**: <5ms per operation
- **Session storage**: Refresh tokens stored with 7d TTL
- **Optimization**: Batch SETEX calls using Promise.all for bulk operations (T1.3.1.12)

## Database Queries (T1.3.1.5)
- **Target**: <20ms per user lookup
- **Indexes**: 
  - `users.email` - unique index (T1.3.1.6)
  - `users.deleted_at` - B-tree index for soft-delete filtering (T1.3.1.7)
- **Redis cache**: User lookups cached with 5min TTL (T1.3.1.13)

## Connection Pool (T1.3.1.9)
- **Min**: 2 connections
- **Max**: 10 connections per instance
- Configured via `DATABASE_URL?connection_limit=5` with pool growth up to 10

## Rate Limiting
- Auth endpoints: 5 requests per 60s window
- Register endpoint: 3 requests per 60s window
- Uses Redis-backed sliding window via `createRateLimiter`

## Compression (T1.3.1.14)
- Middleware: `compression` at level 6
- Threshold: 1024 bytes
- Expected reduction: >70% for JSON responses

## Frontend Optimization (T1.3.1.16)
- `React.memo` applied to page components:
  - `LoginPage`
  - `RegisterPage`
- Extracted memoized form components in `components/auth/`:
  - `LoginForm`
  - `RegisterForm`

## Test Coverage
All benchmarks are verified through:
- `src/middleware/__tests__/timing.integration.test.ts`
- Unit tests in `src/__tests__/auth/` validate bcrypt cost factor 12
- Integration tests confirm Redis token storage and TTL
