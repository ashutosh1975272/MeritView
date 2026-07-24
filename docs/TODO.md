# MeritView — Exhaustive Granular TODO List

Sequential lifecycle per feature: 1. Implementation -> 2. Testing -> 3. Optimization -> 4. Beta -> 5. PR -> 6. Merge

Environment: local PostgreSQL only. No AWS/cloud services. frontend/ + backend/ + infra/ strictly isolated. No shared monorepo.

## PHASE 0: PRE-BUILDING VALIDATION (Week 0 — Mandatory Gate)

### Part 1.1 Manual Thesis Validation (1 week)

- [ ] T0.1.1: Select 5-10 real contract disputes from the professional network
- [ ] T0.1.2: Document dispute details: party, stakes, contract type, desired outcome
- [ ] T0.1.3: Write initial single-party evaluation prompt (eval-v3.2 draft)
- [ ] T0.1.4: Set up local Groq Llama 3 70B test script
- [ ] T0.1.5: Set up local Groq Mixtral 8x7B test script
- [ ] T0.1.6: Set up local Gemini 1.5 Pro test script
- [ ] T0.1.7: Run Groq Llama 3 70B on dispute 1 and record structured JSON output
- [ ] T0.1.8: Run Groq Mixtral 8x7B on dispute 1 and record structured JSON output
- [ ] T0.1.9: Run Gemini 1.5 Pro on dispute 1 and record structured JSON output
- [ ] T0.1.10: Manually synthesize outputs for dispute 1 and score usefulness
- [ ] T0.1.11: Repeat provider runs for disputes 2-5
- [ ] T0.1.12: Document cross-provider consistency on same dispute
- [ ] T0.1.13: Measure LLM API costs for 5 disputes (verify <$100 total)
- [ ] T0.1.14: Assess output quality: strongest/weakest arguments present
- [ ] T0.1.15: Assess output quality: factual concerns flagged appropriately
- [ ] T0.1.16: Assess output quality: logical fallacies identified correctly
- [ ] T0.1.17: Assess output quality: confidence score calibrated reasonably
- [ ] T0.1.18: Decision gate: outputs useful and consistent? IF NO stop or pivot
- [ ] T0.1.19: Document Phase 0 decision and rationale in audit log
- [ ] T0.1.20: Finalize eval-v3.2 prompt based on validation results
- [ ] T0.1.21: Create backend/src/prompts/eval-v3.2.ts and enforce immutability
- [ ] T0.1.22: Add unit test for prompt version string format
- [ ] T0.1.23: Verify prompt immutability rule: old versions never edited
- [ ] T0.1.24: Document prompt testing methodology for future iterations
- [ ] T0.1.25: Create evaluation metrics spreadsheet (agreement rate, hallucination rate)
- [ ] T0.1.26: Establish baseline metrics from manual synthesis
- [ ] T0.1.27: Set up local cost tracking spreadsheet for validation
- [ ] T0.1.28: Verify all 3 APIs return JSON compatible with schema_v3.json
- [ ] T0.1.29: Test prompt with ~50-word brief edge case
- [ ] T0.1.30: Test prompt with ~5000-word brief edge case
- [ ] T0.1.31: Test prompt with third-party PII edge case
- [ ] T0.1.32: Test prompt with illegal activity description edge case
- [ ] T0.1.33: Document API key setup for Groq and Gemini
- [ ] T0.1.34: Create local .env.test with API keys for validation only
- [ ] T0.1.35: Verify no secrets committed to git during validation
- [ ] T0.1.36: Run validation script 3 times for cost consistency
- [ ] T0.1.37: Record per-provider latency (target <60s each)
- [ ] T0.1.38: Identify provider-specific failure modes
- [ ] T0.1.39: Document fallback strategy if primary provider fails
- [ ] T0.1.40: Confirm Phase 0 gate passed and update plan change log

### Part 1.2 Legal Guidance (2-3 hours, $500-1500)

- [ ] T0.2.1: Identify tech lawyer specializing in AI and UPL regulation
- [ ] T0.2.2: Provide MeritView value proposition and UPL positioning to lawyer
- [ ] T0.2.3: Request written review of "decision support, not legal advice" framing
- [ ] T0.2.4: Provide draft disclaimers for review
- [ ] T0.2.5: Request list of legally required disclaimers
- [ ] T0.2.6: Request list of prohibited jurisdictions
- [ ] T0.2.7: Review lawyer feedback on ToS draft
- [ ] T0.2.8: Review lawyer feedback on privacy policy draft
- [ ] T0.2.9: Incorporate required disclaimers into opinion delivery plan
- [ ] T0.2.10: Incorporate prohibited jurisdictions into geo-blocking plan
- [ ] T0.2.11: Obtain written confirmation to proceed
- [ ] T0.2.12: Store legal documents in infra/legal/ directory
- [ ] T0.2.13: Add legal review checkpoint to CI and release process
- [ ] T0.2.14: Document legal review cadence as quarterly
- [ ] T0.2.15: Finalize 4 standard disclaimers list
- [ ] T0.2.16: Add disclaimer enforcement to opinion creation endpoint
- [ ] T0.2.17: Create disclaimer versioning strategy
- [ ] T0.2.18: Verify SEO/meta pages include disclaimer language

### Part 1.3 First 20 Users Identified

- [ ] T0.3.1: Create spreadsheet with columns: name, dispute type, stakes, $49 willingness
- [ ] T0.3.2: Identify 20 specific people with recent small contract disputes
- [ ] T0.3.3: Record name, dispute type, estimated stakes, willingness to pay for each
- [ ] T0.3.4: Reach out to first 5 contacts via email or LinkedIn
- [ ] T0.3.5: Send outreach asking if they would use $49 AI analysis
- [ ] T0.3.6: Record responses with yes/no/maybe and reasoning
- [ ] T0.3.7: Follow up with non-responders after 5 days
- [ ] T0.3.8: Document common objections and pricing concerns
- [ ] T0.3.9: Decision gate: 20 named AND 5 say they would pay?
- [ ] T0.3.10: If yes proceed to Phase 1; if no fix marketing before building
- [ ] T0.3.11: Update plan with user research findings
- [ ] T0.3.12: Create user persona documents from research
- [ ] T0.3.13: Add personas to frontend design system
- [ ] T0.3.14: Document user pain points for feature prioritization
- [ ] T0.3.15: Create onboarding flow based on user research
- [ ] T0.3.16: Plan user interview schedule for future beta
- [ ] T0.3.17: Set up user feedback collection mechanism
- [ ] T0.3.18: Define success metrics from user research
- [ ] T0.3.19: Create user recruitment tracking spreadsheet
- [ ] T0.3.20: Finalize Phase 0 gate checklist and mark complete

## PHASE 1: FOUNDATION (Weeks 1-2)


## FEATURE F1: USER ACCOUNT AND AUTHENTICATION

### F1 Stage 1.1: Feature Implementation


#### Backend Infrastructure Setup

- [ ] T1.1.1.1: Initialize backend/package.json with Express, Prisma, Zod, bcrypt, jsonwebtoken, bullmq, stripe, redis, ioredis, cors, helmet, express-rate-limit, nodemailer, groq-sdk, @google/generative-ai, @sentry/node, zod
- [ ] T1.1.1.2: Initialize backend/tsconfig.json with strict TypeScript settings and @/* path alias
- [ ] T1.1.1.3: Create backend/src/index.ts Express entry point
- [ ] T1.1.1.4: Create backend/src/config/env.ts for typed environment variables
- [ ] T1.1.1.5: Create backend/src/config/redis.ts for Redis connection
- [ ] T1.1.1.6: Create backend/src/db/database.ts for PostgreSQL connection
- [ ] T1.1.1.7: Create backend/src/db/prisma.ts for Prisma client singleton
- [ ] T1.1.1.8: Create backend/prisma/schema.prisma with User model and role enum
- [ ] T1.1.1.9: Run prisma migrate dev --name init to create users table
- [ ] T1.1.1.10: Create backend/prisma/seed.ts with admin user seed
- [ ] T1.1.1.11: Run prisma db seed and verify admin user created
- [ ] T1.1.1.12: Create backend/src/middleware/error.ts global error handler with envelope
- [ ] T1.1.1.13: Create backend/src/middleware/validate.ts Zod validation wrapper
- [ ] T1.1.1.14: Create backend/src/middleware/auth.ts JWT verification middleware
- [ ] T1.1.1.15: Create backend/src/middleware/rateLimit.ts rate limiting middleware with Redis store
- [ ] T1.1.1.16: Create backend/src/middleware/cors.ts CORS allowlist
- [ ] T1.1.1.17: Create backend/src/middleware/helmet.ts security headers
- [ ] T1.1.1.18: Create backend/src/middleware/requestId.ts request ID generation
- [ ] T1.1.1.19: Create backend/src/utils/errors.ts typed error classes
- [ ] T1.1.1.20: Create backend/src/utils/logger.ts structured logger

#### Auth Service Implementation

- [ ] T1.1.2.0: Create backend/src/services/auth/index.ts
- [ ] T1.1.2.1: Implement register: uniqueness check, bcrypt hash cost 12, verification token, Redis SETEX 24h
- [ ] T1.1.2.2: Implement verifyEmail: lookup Redis token, update user verified true, delete token
- [ ] T1.1.2.3: Implement login: bcrypt compare, JWT access 15m, refresh 7d, Redis refresh storage, update lastLoginAt
- [ ] T1.1.2.4: Implement refreshToken: verify type, rotate refresh token, update Redis, return new pair
- [ ] T1.1.2.5: Implement logout: delete refresh key from Redis, return success
- [ ] T1.1.2.6: Implement requestPasswordReset: generate token, store in Redis 1h, return success (do not reveal user existence)
- [ ] T1.1.2.7: Implement completePasswordReset: verify token, hash new password, clear tokens
- [ ] T1.1.2.8: Implement getMe: select safe fields, exclude passwordHash
- [ ] T1.1.2.9: Implement updateMe: update displayName, marketingOptIn, preferredLlmProvider
- [ ] T1.1.2.10: Implement deleteAccount: check active disputes, soft delete, set deletedAt timestamp

#### Auth Routes Implementation

- [ ] T1.1.3.1: Create backend/src/routes/v1/auth.routes.ts
- [ ] T1.1.3.2: Implement POST /v1/auth/register with validation and rate limit 3/min/IP
- [ ] T1.1.3.3: Implement POST /v1/auth/verify-email
- [ ] T1.1.3.4: Implement POST /v1/auth/login with rate limit 5/min/email
- [ ] T1.1.3.5: Implement POST /v1/auth/refresh
- [ ] T1.1.3.6: Implement POST /v1/auth/logout
- [ ] T1.1.3.7: Implement POST /v1/auth/password-reset/request
- [ ] T1.1.3.8: Implement POST /v1/auth/password-reset/complete

#### User Routes Implementation

- [ ] T1.1.4.1: Create backend/src/routes/v1/user.routes.ts
- [ ] T1.1.4.2: Implement GET /v1/users/me with auth middleware
- [ ] T1.1.4.3: Implement PATCH /v1/users/me with auth middleware
- [ ] T1.1.4.4: Implement DELETE /v1/users/me with active-dispute guard

#### Error Envelope, Rate Limiting, OpenAPI

- [ ] T1.1.5.1: Implement standard error envelope { error: { code, message, details, requestId, documentationUrl } }
- [ ] T1.1.5.2: Add requestId generation middleware to every request
- [ ] T1.1.5.3: Map all error classes to error codes
- [ ] T1.1.5.4: Create backend/docs/openapi.yaml
- [ ] T1.1.5.5: Define all auth and user endpoints with request/response schemas
- [ ] T1.1.5.6: Define BearerAuth security scheme in OpenAPI
- [ ] T1.1.5.7: Add rate limit headers to all responses: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- [ ] T1.1.5.8: Validate OpenAPI spec with swagger-cli or openapi-generator
- [ ] T1.1.5.9: Generate TypeScript types from OpenAPI for frontend consumption
- [ ] T1.1.5.10: Create frontend/src/lib/api-client.ts from generated types

#### Frontend Infrastructure Setup

- [ ] T1.1.6.1: Initialize frontend/package.json with Next.js, React, Tailwind, zustand, tanstack/react-query
- [ ] T1.1.6.2: Initialize frontend/tsconfig.json with Next.js plugin and @/* path alias
- [ ] T1.1.6.3: Create frontend/next.config.mjs with reactStrictMode true
- [ ] T1.1.6.4: Create frontend/tailwind.config.ts and postcss.config.cjs
- [ ] T1.1.6.5: Create frontend/src/app/globals.css with Tailwind directives
- [ ] T1.1.6.6: Create frontend/src/app/layout.tsx root layout
- [ ] T1.1.6.7: Create frontend/src/app/loading.tsx loading state
- [ ] T1.1.6.8: Create frontend/src/app/error.tsx error boundary
- [ ] T1.1.6.9: Create frontend/src/app/not-found.tsx 404 page
- [ ] T1.1.6.10: Set up frontend/.env.example with NEXT_PUBLIC_API_URL and NEXT_PUBLIC_APP_URL
- [ ] T1.1.6.11: Install frontend dependencies and verify pnpm build succeeds
- [ ] T1.1.6.12: Create frontend/src/stores/useAuthStore.ts with zustand
- [ ] T1.1.6.13: Implement auth store state and actions: login, register, logout, refresh
- [ ] T1.1.6.14: Create frontend/src/hooks/useAuth.ts custom hook
- [ ] T1.1.6.15: Create frontend/src/lib/api-client.ts fetch wrapper
- [ ] T1.1.6.16: Add JWT token interceptor and automatic refresh logic to api-client
- [ ] T1.1.6.17: Create frontend/src/app/(marketing)/page.tsx landing page
- [ ] T1.1.6.18: Create frontend/src/app/(auth)/register/page.tsx registration page with form
- [ ] T1.1.6.19: Create frontend/src/app/(auth)/verify-email/page.tsx email verification page
- [ ] T1.1.6.20: Create frontend/src/app/(auth)/login/page.tsx login page with form
- [ ] T1.1.6.21: Create frontend/src/app/(dashboard)/layout.tsx dashboard layout
- [ ] T1.1.6.22: Implement protected route wrapper for authenticated pages
- [ ] T1.1.6.23: Add logout button to dashboard layout with store clearing
- [ ] T1.1.6.24: Create frontend/public/assets (favicon.ico and logo.svg placeholders)
- [ ] T1.1.6.25: Verify frontend lint passes with zero warnings

### F1 Stage 1.2: Comprehensive Testing


#### Backend Unit Tests

- [ ] T1.2.1.1: Create backend/src/__tests__/auth/register.test.ts
- [ ] T1.2.1.2: Test register valid input returns 201, creates user, queues email
- [ ] T1.2.1.3: Test register duplicate email returns 409
- [ ] T1.2.1.4: Test register weak password returns 400
- [ ] T1.2.1.5: Test register missing accept_terms returns 400
- [ ] T1.2.1.6: Test register display_name >100 chars returns 400
- [ ] T1.2.1.7: Test register invalid email format returns 400
- [ ] T1.2.1.8: Create backend/src/__tests__/auth/verify-email.test.ts
- [ ] T1.2.1.9: Test verify-email valid token returns 200
- [ ] T1.2.1.10: Test verify-email expired token returns 400
- [ ] T1.2.1.11: Test verify-email invalid token returns 400
- [ ] T1.2.1.12: Create backend/src/__tests__/auth/login.test.ts
- [ ] T1.2.1.13: Test login correct credentials returns 200 with tokens
- [ ] T1.2.1.14: Test login unverified email returns 403
- [ ] T1.2.1.15: Test login wrong password returns 401
- [ ] T1.2.1.16: Test login non-existent email returns 401
- [ ] T1.2.1.17: Test rate limit 6 attempts in 1 minute returns 429
- [ ] T1.2.1.18: Test rate limit headers present in every response
- [ ] T1.2.1.19: Create backend/src/__tests__/auth/refresh.test.ts
- [ ] T1.2.1.20: Test refresh valid token returns 200 and new tokens
- [ ] T1.2.1.21: Test refresh invalid token returns 401
- [ ] T1.2.1.22: Test refresh expired token returns 401
- [ ] T1.2.1.23: Create backend/src/__tests__/auth/logout.test.ts
- [ ] T1.2.1.24: Test logout invalidates refresh token
- [ ] T1.2.1.25: Test logout then refresh returns 401
- [ ] T1.2.1.26: Create backend/src/__tests__/auth/password-reset.test.ts
- [ ] T1.2.1.27: Test reset request existing email returns 200 and queues email
- [ ] T1.2.1.28: Test reset request non-existent email returns 200 with no reveal
- [ ] T1.2.1.29: Test reset valid token returns 200
- [ ] T1.2.1.30: Test reset expired token returns 400
- [ ] T1.2.1.31: Create backend/src/__tests__/auth/user.test.ts
- [ ] T1.2.1.32: Test GET /v1/users/me with valid token returns 200 and user data
- [ ] T1.2.1.33: Test PATCH /v1/users/me updates display_name
- [ ] T1.2.1.34: Test DELETE /v1/users/me with no active disputes returns 202
- [ ] T1.2.1.35: Test DELETE /v1/users/me with active disputes returns 400
- [ ] T1.2.1.36: Create backend/src/__tests__/auth/security.test.ts
- [ ] T1.2.1.37: Test password hashing uses bcrypt cost factor 12
- [ ] T1.2.1.38: Test JWT tokens are signed and verifiable
- [ ] T1.2.1.39: Test access token expiry 15m and refresh expiry 7d

#### Backend Integration Tests

- [ ] T1.2.2.1: Set up vitest.integration.config.ts with local PostgreSQL
- [ ] T1.2.2.2: Create backend/src/__integration__/auth/register.integration.test.ts
- [ ] T1.2.2.3: Test full register flow: POST -> DB row -> verification queued
- [ ] T1.2.2.4: Test concurrent register same email -> one succeeds one 409
- [ ] T1.2.2.5: Create backend/src/__integration__/auth/login.integration.test.ts
- [ ] T1.2.2.6: Test full login flow: POST -> JWT -> Redis session created
- [ ] T1.2.2.7: Test login unverified email returns 403
- [ ] T1.2.2.8: Create backend/src/__integration__/auth/verify-email.integration.test.ts
- [ ] T1.2.2.9: Test full verification flow: register -> verify -> login succeeds
- [ ] T1.2.2.10: Create backend/src/__integration__/auth/password-reset.integration.test.ts
- [ ] T1.2.2.11: Test full password reset flow in database
- [ ] T1.2.2.12: Test JWT payload claims correct for admin and support roles
- [ ] T1.2.2.13: Test refresh token rotation invalidates old token
- [ ] T1.2.2.14: Create backend/src/__integration__/auth/rate-limit.integration.test.ts
- [ ] T1.2.2.15: Test rate limit persists across requests from same IP
- [ ] T1.2.2.16: Test rate limit resets after window expires

#### Frontend Unit and E2E Tests

- [ ] T1.2.3.1: Create frontend/src/__tests__/stores/useAuthStore.test.ts
- [ ] T1.2.3.2: Test initial auth store state is null user and null tokens
- [ ] T1.2.3.3: Test login action sets user and tokens
- [ ] T1.2.3.4: Test logout action clears user and tokens
- [ ] T1.2.3.5: Test refresh action updates tokens
- [ ] T1.2.3.6: Create frontend/src/__tests__/components/LoginForm.test.tsx
- [ ] T1.2.3.7: Test LoginForm renders email and password inputs
- [ ] T1.2.3.8: Test LoginForm validates email format
- [ ] T1.2.3.9: Test LoginForm validates password minimum length
- [ ] T1.2.3.10: Test LoginForm submits with valid data
- [ ] T1.2.3.11: Test LoginForm shows error on failed login
- [ ] T1.2.3.12: Create frontend/src/__tests__/components/RegisterForm.test.tsx
- [ ] T1.2.3.13: Test RegisterForm validates password match
- [ ] T1.2.3.14: Test RegisterForm validates accept_terms checkbox
- [ ] T1.2.3.15: Test RegisterForm submits successfully
- [ ] T1.2.3.16: Create frontend/src/__tests__/hooks/useAuth.test.ts
- [ ] T1.2.3.17: Create frontend/src/__tests__/lib/api-client.test.ts
- [ ] T1.2.3.18: Test api-client adds Authorization header
- [ ] T1.2.3.19: Test api-client handles 401 by refreshing token
- [ ] T1.2.3.20: Test api-client handles 403 correctly
- [ ] T1.2.3.21: Test api-client handles network errors gracefully
- [ ] T1.2.3.22: Verify frontend unit tests pass with vitest
- [ ] T1.2.3.23: Verify frontend coverage >= 80% for auth-related files
- [ ] T1.2.3.24: Install Playwright browsers
- [ ] T1.2.3.25: Create frontend/tests/e2e/auth/register.spec.ts
- [ ] T1.2.3.26: Test registration page navigation and submission
- [ ] T1.2.3.27: Test verification email flow mocked in test
- [ ] T1.2.3.28: Test login page flow
- [ ] T1.2.3.29: Test logout flow
- [ ] T1.2.3.30: Test password reset flow
- [ ] T1.2.3.31: Test redirects after auth state changes
- [ ] T1.2.3.32: Run Playwright tests against local backend on port 3001
- [ ] T1.2.3.33: Verify all E2E tests pass
- [ ] T1.2.3.34: Fix any flaky E2E tests and re-run
- [ ] T1.2.3.35: Document E2E test results

### F1 Stage 1.3: Optimization

- [ ] T1.3.1.1: Profile JWT verification middleware latency target <50ms
- [ ] T1.3.1.2: Benchmark bcrypt hashing at cost factor 12
- [ ] T1.3.1.3: Benchmark bcrypt comparison at cost factor 12
- [ ] T1.3.1.4: Profile Redis operations for session storage target <5ms
- [ ] T1.3.1.5: Profile database queries for user lookup target <20ms
- [ ] T1.3.1.6: Add database index on users.email column
- [ ] T1.3.1.7: Add database index on users.deleted_at for soft delete
- [ ] T1.3.1.8: Verify EXPLAIN ANALYZE on user queries uses index
- [ ] T1.3.1.9: Configure Prisma connection pool 5-10 per instance
- [ ] T1.3.1.10: Test connection pool under 100 concurrent requests
- [ ] T1.3.1.11: Verify no connection leaks after load test
- [ ] T1.3.1.12: Optimize registration batch Redis SETEX calls
- [ ] T1.3.1.13: Optimize login cache user lookup in Redis 5min TTL
- [ ] T1.3.1.14: Add gzip compression middleware to Express
- [ ] T1.3.1.15: Verify gzip reduces response size by >70%
- [ ] T1.3.1.16: Frontend optimize auth form render performance
- [ ] T1.3.1.17: Frontend add React.memo to auth form components
- [ ] T1.3.1.18: Frontend verify no unnecessary re-renders in auth flow
- [ ] T1.3.1.19: Document auth performance benchmarks

### F1 Stage 1.4: Beta Phase

- [ ] T1.4.1.1: Deploy auth flow to local staging environment
- [ ] T1.4.1.2: Test auth flow with 5 real users from Phase 0 research
- [ ] T1.4.1.3: Collect feedback on registration UX
- [ ] T1.4.1.4: Collect feedback on login UX
- [ ] T1.4.1.5: Collect feedback on password reset UX
- [ ] T1.4.1.6: Monitor auth error rates in staging
- [ ] T1.4.1.7: Monitor auth latency in staging
- [ ] T1.4.1.8: Fix critical bugs found in beta testing
- [ ] T1.4.1.9: Add accessibility improvements from beta feedback
- [ ] T1.4.1.10: Verify WCAG 2.1 AA compliance on all auth pages
- [ ] T1.4.1.11: Test keyboard navigation on all auth forms
- [ ] T1.4.1.12: Test screen reader compatibility on auth pages
- [ ] T1.4.1.13: Add ARIA labels to all form inputs
- [ ] T1.4.1.14: Add error message associations to form inputs
- [ ] T1.4.1.15: Test colorblind simulation on auth pages
- [ ] T1.4.1.16: Document beta feedback and action items
- [ ] T1.4.1.17: Update onboarding flow based on beta feedback
- [ ] T1.4.1.18: Prepare auth flow for upcoming Phase 2 features
- [ ] T1.4.1.19: Document beta testing results in plan.md
- [ ] T1.4.1.20: Mark F1 beta phase complete

### F1 Stage 1.5: Pull Request Creation

- [ ] T1.5.1.1: Create feature branch feat/1/eng-auth-jwt-implementation
- [ ] T1.5.1.2: Stage backend auth service and route files
- [ ] T1.5.1.3: Stage backend middleware files
- [ ] T1.5.1.4: Stage frontend auth pages and stores
- [ ] T1.5.1.5: Stage OpenAPI spec changes for auth endpoints
- [ ] T1.5.1.6: Stage Prisma schema and migrations
- [ ] T1.5.1.7: Stage test files (unit, integration, E2E)
- [ ] T1.5.1.8: Run pre-commit checks: lint, typecheck, test:unit
- [ ] T1.5.1.9: Verify all CI checks pass
- [ ] T1.5.1.10: Ensure test coverage >= 80% for changed files
- [ ] T1.5.1.11: Write PR description with feature summary
- [ ] T1.5.1.12: Add agent ownership table to PR description
- [ ] T1.5.1.13: Link OpenAPI spec changes in PR
- [ ] T1.5.1.14: Request review from Identity_and_Access_Engineer
- [ ] T1.5.1.15: Request security review from AppSec_Engineer
- [ ] T1.5.1.16: Request testing review from API_Tester
- [ ] T1.5.1.17: Address review comments
- [ ] T1.5.1.18: Re-run CI after addressing comments
- [ ] T1.5.1.19: Squash and merge PR to develop branch
- [ ] T1.5.1.20: Delete feature branch after merge

### F1 Stage 1.6: Merging to Main Execution

- [ ] T1.6.1.1: Verify F1 complete and stable on develop branch
- [ ] T1.6.1.2: Create PR from develop to main for F1
- [ ] T1.6.1.3: Get attorney/legal/compliance sign-off on auth flow
- [ ] T1.6.1.4: Run full test suite on develop: unit, integration, E2E
- [ ] T1.6.1.5: Verify all tests pass
- [ ] T1.6.1.6: Verify code coverage >= 80%
- [ ] T1.6.1.7: Get approval from Identity_and_Access_Engineer
- [ ] T1.6.1.8: Get approval from AppSec_Engineer
- [ ] T1.6.1.9: Merge PR using gh pr merge --squash --delete-branch
- [ ] T1.6.1.10: Tag release: git tag -a v0.1.0-auth -m "F1 Auth complete"
- [ ] T1.6.1.11: Push tag to remote
- [ ] T1.6.1.12: Deploy to local staging
- [ ] T1.6.1.13: Smoke test auth flow on staging
- [ ] T1.6.1.14: Monitor staging for 24 hours
- [ ] T1.6.1.15: Document F1 completion in plan.md change log
- [ ] T1.6.1.16: Update project checklist to mark F1 complete
- [ ] T1.6.1.17: Notify team of F1 merge to main
- [ ] T1.6.1.18: Archive F1 feature branch
- [ ] T1.6.1.19: Create new develop branch from updated main
- [ ] T1.6.1.20: Mark F1 complete in project management tool


## PHASE 2: CORE DISPUTE FLOW (Weeks 3-4)


## FEATURE F2: DISPUTE CREATION


### F2 Stage 2.1: Feature Implementation


#### Database Schema

- [ ] T2.1.1.1: Create disputes table migration in backend/prisma/migrations/
- [ ] T2.1.1.2: Add disputes columns: id, category, title, summary, estimated_stakes_usd, state, pricing_tier, price_usd, initiator_user_id, created_at, updated_at, completed_at, deleted_at
- [ ] T2.1.1.3: Create parties table migration in backend/prisma/migrations/
- [ ] T2.1.1.4: Add parties columns: id, dispute_id, role, user_id, brief_status, created_at, updated_at
- [ ] T2.1.1.5: Add UNIQUE constraint on parties(dispute_id, role)
- [ ] T2.1.1.6: Add index on disputes(initiator_user_id)
- [ ] T2.1.1.7: Add partial index on disputes(state) excluding completed, withdrawn, failed
- [ ] T2.1.1.8: Add index on parties(dispute_id)
- [ ] T2.1.1.9: Add partial index on parties(user_id) where user_id IS NOT NULL
- [ ] T2.1.1.10: Run prisma migrate dev --name add-disputes-and-parties
- [ ] T2.1.1.11: Run prisma db seed and verify migration
- [ ] T2.1.1.12: Update backend/src/types/schemas.ts with DisputeCreateInput Zod schema
- [ ] T2.1.1.13: Update backend/src/types/schemas.ts with DisputeUpdateInput Zod schema
- [ ] T2.1.1.14: Update OpenAPI spec with DisputeCreateRequest and DisputeResponse
- [ ] T2.1.1.15: Generate frontend types from updated OpenAPI spec

#### Backend Dispute Service

- [ ] T2.1.2.1: Create backend/src/services/disputes/index.ts
- [ ] T2.1.2.2: Implement createDispute validate category contract_interpretation
- [ ] T2.1.2.3: Implement createDispute validate title length 5-200 chars
- [ ] T2.1.2.4: Implement createDispute validate summary max 500 chars
- [ ] T2.1.2.5: Implement createDispute validate estimated_stakes_usd positive if provided
- [ ] T2.1.2.6: Implement createDispute set default price_usd 49.00
- [ ] T2.1.2.7: Implement createDispute set initial state draft
- [ ] T2.1.2.8: Implement createDispute create party record role initiator brief_status not_started
- [ ] T2.1.2.9: Implement getDisputes return only initiator user_id disputes exclude deleted
- [ ] T2.1.2.10: Implement getDispute with parties, briefs, opinion, evaluator_outputs, payments includes
- [ ] T2.1.2.11: Implement updateDispute enforce draft state only
- [ ] T2.1.2.12: Implement withdrawDispute validate allowedStates: draft, brief_submitted, payment_pending
- [ ] T2.1.2.13: Implement withdrawDispute refund logic if successful payment exists
- [ ] T2.1.2.14: Implement withdrawDispute inside database transaction
- [ ] T2.1.2.15: Create dispute state machine enforcement function
- [ ] T2.1.2.16: Create state transition validation function reject invalid transitions 409

#### Backend Dispute Routes

- [ ] T2.1.3.1: Create backend/src/routes/v1/disputes.routes.ts
- [ ] T2.1.3.2: Implement POST /v1/disputes with auth, email_verified, Zod validation, rate limit 100/hour
- [ ] T2.1.3.3: Implement GET /v1/disputes list endpoint
- [ ] T2.1.3.4: Implement GET /v1/disputes/:dispute_id detail endpoint
- [ ] T2.1.3.5: Implement PATCH /v1/disputes/:dispute_id draft-only update
- [ ] T2.1.3.6: Implement POST /v1/disputes/:dispute_id/withdraw endpoint
- [ ] T2.1.3.7: Wire dispute routes into main Express app
- [ ] T2.1.3.8: Add dispute endpoints to OpenAPI spec

#### Frontend Dispute Implementation

- [ ] T2.1.4.1: Create frontend/src/app/(dashboard)/disputes/page.tsx
- [ ] T2.1.4.2: Create frontend/src/app/(dashboard)/disputes/[id]/page.tsx
- [ ] T2.1.4.3: Create frontend/src/app/(dashboard)/disputes/new/page.tsx
- [ ] T2.1.4.4: Implement dispute creation form component
- [ ] T2.1.4.5: Add category dropdown (contract_interpretation only)
- [ ] T2.1.4.6: Add title input with 5-200 char validation and character counter
- [ ] T2.1.4.7: Add summary textarea with 500 char max and counter
- [ ] T2.1.4.8: Add estimated_stakes_usd input with positive number validation
- [ ] T2.1.4.9: Add form submission loading state and error display
- [ ] T2.1.4.10: Add success redirect to newly created dispute detail page
- [ ] T2.1.4.11: Implement dispute list with TanStack Query useQuery
- [ ] T2.1.4.12: Add loading skeleton and error state for dispute list
- [ ] T2.1.4.13: Implement dispute detail display with state badge
- [ ] T2.1.4.14: Add color-coded state badge component
- [ ] T2.1.4.15: Add withdraw button visible only for draft disputes
- [ ] T2.1.4.16: Implement withdraw confirmation dialog
- [ ] T2.1.4.17: Add dispute list link to dashboard navigation
- [ ] T2.1.4.18: Add empty state for users with no disputes

### F2 Stage 2.2: Comprehensive Testing


#### Backend Unit Tests

- [ ] T2.2.1.1: Create backend/src/__tests__/disputes/create.test.ts
- [ ] T2.2.1.2: Test create valid returns 201 state draft party role initiator
- [ ] T2.2.1.3: Test create without auth returns 401
- [ ] T2.2.1.4: Test create invalid category returns 400
- [ ] T2.2.1.5: Test create title too long returns 400
- [ ] T2.2.1.6: Test create negative stakes returns 400
- [ ] T2.2.1.7: Test create sets default price_usd 49.00
- [ ] T2.2.1.8: Test create sets brief_status not_started
- [ ] T2.2.1.9: Test create 100 requests in 1 hour rate limited
- [ ] T2.2.1.10: Create backend/src/__tests__/disputes/state-machine.test.ts
- [ ] T2.2.1.11: Test valid transition draft -> brief_submitted
- [ ] T2.2.1.12: Test valid transition draft -> withdrawn
- [ ] T2.2.1.13: Test valid transition brief_submitted -> payment_pending
- [ ] T2.2.1.14: Test valid transition brief_submitted -> draft on withdraw
- [ ] T2.2.1.15: Test valid transition payment_pending -> under_analysis
- [ ] T2.2.1.16: Test valid transition payment_pending -> draft on failure
- [ ] T2.2.1.17: Test valid transition payment_pending -> failed after retries
- [ ] T2.2.1.18: Test valid transition under_analysis -> awaiting_aggregation
- [ ] T2.2.1.19: Test valid transition under_analysis -> failed
- [ ] T2.2.1.20: Test valid transition awaiting_aggregation -> completed
- [ ] T2.2.1.21: Test invalid completed -> any state returns 409
- [ ] T2.2.1.22: Test invalid failed -> any state returns 409
- [ ] T2.2.1.23: Test invalid withdrawn -> any state returns 409
- [ ] T2.2.1.24: Test invalid any state -> completed except awaiting_aggregation returns 409
- [ ] T2.2.1.25: Create backend/src/__tests__/disputes/withdraw.test.ts
- [ ] T2.2.1.26: Test withdraw draft returns 200 state withdrawn
- [ ] T2.2.1.27: Test withdraw brief_submitted returns 200
- [ ] T2.2.1.28: Test withdraw payment_pending returns 200
- [ ] T2.2.1.29: Test withdraw under_analysis returns 400
- [ ] T2.2.1.30: Test withdraw with succeeded payment creates refund record
- [ ] T2.2.1.31: Test withdraw without payment creates no refund record
- [ ] T2.2.1.32: Test withdraw refund amount matches original payment
- [ ] T2.2.1.33: Create backend/src/__tests__/disputes/update.test.ts
- [ ] T2.2.1.34: Test update in draft state returns 200
- [ ] T2.2.1.35: Test update in non-draft state returns 409
- [ ] T2.2.1.36: Test partial update title only
- [ ] T2.2.1.37: Create backend/src/__tests__/disputes/get.test.ts
- [ ] T2.2.1.38: Test getDisputes returns only users own disputes exclude deleted
- [ ] T2.2.1.39: Test getDispute returns dispute with parties
- [ ] T2.2.1.40: Test getDispute invalid ID returns 404
- [ ] T2.2.1.41: Test getDispute other users dispute returns 404
- [ ] T2.2.1.42: Test getDispute soft-deleted dispute returns 404

#### Backend Integration Tests

- [ ] T2.2.2.1: Create backend/src/__integration__/disputes/create.integration.test.ts
- [ ] T2.2.2.2: Test full create dispute flow: auth -> create -> verify DB
- [ ] T2.2.2.3: Test create with real Prisma database
- [ ] T2.2.2.4: Verify dispute record created with correct fields
- [ ] T2.2.2.5: Verify party record created correctly
- [ ] T2.2.2.6: Create backend/src/__integration__/disputes/state-machine.integration.test.ts
- [ ] T2.2.2.7: Test full state transition flow in database
- [ ] T2.2.2.8: Test concurrent state transitions race condition handled
- [ ] T2.2.2.9: Verify no orphaned records on state change
- [ ] T2.2.2.10: Test N+1 queries prevented with Prisma includes on dispute detail
- [ ] T2.2.2.11: Profile dispute list query with EXPLAIN ANALYZE
- [ ] T2.2.2.12: Verify index usage on disputes(initiator_user_id)
- [ ] T2.2.2.13: Profile dispute detail query with EXPLAIN ANALYZE
- [ ] T2.2.2.14: Verify partial index usage for state filtering
- [ ] T2.2.2.15: Test soft delete excluded from normal queries
- [ ] T2.2.2.16: Create backend/src/__integration__/disputes/withdraw.integration.test.ts
- [ ] T2.2.2.17: Test withdrawal with payment creates refund record
- [ ] T2.2.2.18: Test withdrawal without payment creates no refund record
- [ ] T2.2.2.19: Verify refund amount matches original payment
- [ ] T2.2.2.20: Test database transaction rollback on withdrawal failure

#### Frontend Tests

- [ ] T2.2.3.1: Create frontend/src/__tests__/components/DisputeForm.test.tsx
- [ ] T2.2.3.2: Test DisputeForm validates title length
- [ ] T2.2.3.3: Test DisputeForm validates summary max length
- [ ] T2.2.3.4: Test DisputeForm validates stakes must be positive
- [ ] T2.2.3.5: Test DisputeForm submits with valid data
- [ ] T2.2.3.6: Test DisputeForm shows loading state during submission
- [ ] T2.2.3.7: Test DisputeForm shows error on API failure
- [ ] T2.2.3.8: Create frontend/src/__tests__/components/DisputeList.test.tsx
- [ ] T2.2.3.9: Test DisputeList fetches and displays disputes
- [ ] T2.2.3.10: Test DisputeList shows loading skeleton
- [ ] T2.2.3.11: Test DisputeList shows empty state when no disputes
- [ ] T2.2.3.12: Test DisputeList handles API error gracefully
- [ ] T2.2.3.13: Create frontend/src/__tests__/pages/disputes/new.test.tsx
- [ ] T2.2.3.14: Test new dispute page renders form
- [ ] T2.2.3.15: Test successful creation redirects to detail page
- [ ] T2.2.3.16: Test validation errors displayed inline
- [ ] T2.2.3.17: Verify frontend coverage >= 80% for dispute components
- [ ] T2.2.3.18: Create frontend/tests/e2e/disputes/create-dispute.spec.ts
- [ ] T2.2.3.19: Test end-to-end dispute creation flow
- [ ] T2.2.3.20: Test dispute appears in list after creation
- [ ] T2.2.3.21: Test dispute detail page shows correct data
- [ ] T2.2.3.22: Test withdraw flow from dispute detail page
- [ ] T2.2.3.23: Run all E2E tests and verify pass
- [ ] T2.2.3.24: Fix any flaky E2E tests
- [ ] T2.2.3.25: Document E2E test results

### F2 Stage 2.3: Optimization

- [ ] T2.3.1.1: Profile dispute list query target <50ms for 50 disputes
- [ ] T2.3.1.2: Profile dispute detail query target <100ms
- [ ] T2.3.1.3: Add covering index for dispute list query
- [ ] T2.3.1.4: Verify INDEX ONLY SCAN on dispute list
- [ ] T2.3.1.5: Add cursor-based pagination for dispute list
- [ ] T2.3.1.6: Implement cursor parameter in GET /v1/disputes
- [ ] T2.3.1.7: Add page size limit max 50 per page
- [ ] T2.3.1.8: Add Redis caching for dispute list 5min TTL
- [ ] T2.3.1.9: Add Redis caching for dispute detail 5min TTL
- [ ] T2.3.1.10: Invalidate cache on dispute state change
- [ ] T2.3.1.11: Monitor cache hit rate target >80%
- [ ] T2.3.1.12: Frontend implement optimistic updates for dispute creation
- [ ] T2.3.1.13: Frontend add React Query cache invalidation after mutation
- [ ] T2.3.1.14: Frontend implement skeleton loaders for list and detail
- [ ] T2.3.1.15: Frontend add error boundaries for dispute pages
- [ ] T2.3.1.16: Benchmark under 100 concurrent users
- [ ] T2.3.1.17: Document query optimization results
- [ ] T2.3.1.18: Document frontend performance metrics
- [ ] T2.3.1.19: Create performance regression tests
- [ ] T2.3.1.20: Verify all performance targets met

### F2 Stage 2.4: Beta Phase

- [ ] T2.4.1.1: Deploy dispute flow to local staging
- [ ] T2.4.1.2: Test dispute flow with 5 beta users
- [ ] T2.4.1.3: Collect feedback on dispute creation UX
- [ ] T2.4.1.4: Collect feedback on dispute list UX
- [ ] T2.4.1.5: Monitor dispute creation error rates
- [ ] T2.4.1.6: Monitor database query performance
- [ ] T2.4.1.7: Fix critical bugs found in beta testing
- [ ] T2.4.1.8: Add keyboard navigation to dispute forms
- [ ] T2.4.1.9: Test WCAG 2.1 AA compliance on dispute pages
- [ ] T2.4.1.10: Add ARIA labels to dispute form fields
- [ ] T2.4.1.11: Test with screen reader on dispute pages
- [ ] T2.4.1.12: Document beta feedback
- [ ] T2.4.1.13: Update dispute flow based on beta feedback
- [ ] T2.4.1.14: Mark F2 beta phase complete

### F2 Stage 2.5: Pull Request Creation

- [ ] T2.5.1.1: Create feature branch feat/2/eng-dispute-creation
- [ ] T2.5.1.2: Stage Prisma schema and migrations
- [ ] T2.5.1.3: Stage dispute service and routes
- [ ] T2.5.1.4: Stage dispute frontend pages and components
- [ ] T2.5.1.5: Stage OpenAPI spec updates
- [ ] T2.5.1.6: Stage test files
- [ ] T2.5.1.7: Run pre-commit checks
- [ ] T2.5.1.8: Verify CI passes
- [ ] T2.5.1.9: Verify coverage >= 80%
- [ ] T2.5.1.10: Write PR description
- [ ] T2.5.1.11: Add agent ownership table
- [ ] T2.5.1.12: Request reviews from Backend_Architect AppSec_Engineer API_Tester
- [ ] T2.5.1.13: Address review comments
- [ ] T2.5.1.14: Squash and merge to develop
- [ ] T2.5.1.15: Delete feature branch

### F2 Stage 2.6: Merging to Main Execution

- [ ] T2.6.1.1: Verify F2 complete on develop
- [ ] T2.6.1.2: Create PR from develop to main for F2
- [ ] T2.6.1.3: Get approval from Backend_Architect
- [ ] T2.6.1.4: Get security approval from AppSec_Engineer
- [ ] T2.6.1.5: Get testing approval from API_Tester
- [ ] T2.6.1.6: Run full test suite
- [ ] T2.6.1.7: Verify coverage >= 80%
- [ ] T2.6.1.8: Merge PR using gh pr merge --squash --delete-branch
- [ ] T2.6.1.9: Tag release git tag -a v0.2.0-disputes -m "F2 Disputes complete"
- [ ] T2.6.1.10: Push tag to remote
- [ ] T2.6.1.11: Deploy to local staging
- [ ] T2.6.1.12: Smoke test dispute flow on staging
- [ ] T2.6.1.13: Monitor for 24 hours
- [ ] T2.6.1.14: Update plan.md change log
- [ ] T2.6.1.15: Update project checklist
- [ ] T2.6.1.16: Notify team of F2 merge
- [ ] T2.6.1.17: Create new develop branch
- [ ] T2.6.1.18: Mark F2 complete
- [ ] T2.6.1.19: Begin F3 implementation

## FEATURE F3: BRIEF PREPARATION (Manual Text Entry — 5-Section Form)

### F3 Stage 3.1: Feature Implementation

#### Database Schema — Briefs
- [ ] T3_Brief.001: Create briefs table migration in backend/prisma/migrations/
- [ ] T3_Brief.002: Add briefs columns: id, party_id, dispute_id, encrypted_content BYTEA, content_encryption_key_id, word_count, supporting_document_ids, status, timestamps, seal_hash, retention_expires_at
- [ ] T3_Brief.003: Add UNIQUE constraint on briefs(party_id)
- [ ] T3_Brief.004: Add indexes: briefs(dispute_id), briefs(status), partial index on retention_expires_at
- [ ] T3_Brief.005: Run prisma migrate dev --name add-briefs
- [ ] T3_Brief.006: Update Prisma schema with Brief model and relations
- [ ] T3_Brief.007: Update backend/src/types/schemas.ts with BriefSections Zod schema (5 required sections)
- [ ] T3_Brief.008: Update OpenAPI spec with brief endpoints
- [ ] T3_Brief.009: Generate frontend types from OpenAPI

#### Backend Encryption Utilities
- [ ] T3_Brief.010: Create backend/src/utils/crypto.ts AES-256-GCM encrypt/decrypt helpers
- [ ] T3_Brief.011: Implement encrypt(content, keyId) returning encryptedContent and contentEncryptionKeyId
- [ ] T3_Brief.012: Implement decrypt(encryptedContent, keyId) returning plaintext
- [ ] T3_Brief.013: Implement generateContentEncryptionKey() creating 32-byte key
- [ ] T3_Brief.014: Implement rotateEncryptionKey() for quarterly rotation
- [ ] T3_Brief.015: Add encryption key storage in backend/config/encryption.ts
- [ ] T3_Brief.016: Ensure encryption keys never logged or exposed in error messages
- [ ] T3_Brief.017: Add key rotation audit logging

#### Backend Brief Service
- [ ] T3_Brief.018: Create backend/src/services/briefs/index.ts
- [ ] T3_Brief.019: Implement saveDraft() allowing partial section data
- [ ] T3_Brief.020: Validate party exists in dispute and user is party member in saveDraft
- [ ] T3_Brief.021: Validate dispute state allows brief editing (draft or brief_submitted only)
- [ ] T3_Brief.022: Encrypt brief content with AES-256-GCM before storing in saveDraft
- [ ] T3_Brief.023: Calculate and store word_count from non-empty sections
- [ ] T3_Brief.024: Update existing draft or create new if none exists (upsert)
- [ ] T3_Brief.025: Implement submitBrief() with full validation
- [ ] T3_Brief.026: Validate all 5 sections present and non-empty on submit
- [ ] T3_Brief.027: Enforce word count: 500-2000 suggested, hard cap 5000 on submit
- [ ] T3_Brief.028: Run content moderation check before final submission
- [ ] T3_Brief.029: Reject disallowed content with 400: illegal activity, harassment, threats, sexual content, PII of others
- [ ] T3_Brief.030: Set status to submitted and record submitted_at timestamp
- [ ] T3_Brief.031: Generate seal_hash SHA-256 of encrypted_content for immutability proof
- [ ] T3_Brief.032: Set status to sealed after submission — no further edits allowed
- [ ] T3_Brief.033: Implement getBrief() with ownership check and on-the-fly decryption
- [ ] T3_Brief.034: Return 404 if brief not found or user not party member
- [ ] T3_Brief.035: Return 403 if brief is sealed and user attempts edit
- [ ] T3_Brief.036: Implement content moderation helper using LLM provider or third-party service
- [ ] T3_Brief.037: Log all moderation checks in audit_events table
- [ ] T3_Brief.038: Implement brief status state machine: not_started -> in_progress -> submitted -> sealed

#### Backend Brief Routes
- [ ] T3_Brief.039: Create backend/src/routes/v1/briefs.routes.ts
- [ ] T3_Brief.040: Implement PUT /v1/disputes/:dispute_id/parties/:party_id/brief/draft
- [ ] T3_Brief.041: Add auth middleware: user must be authenticated and email_verified
- [ ] T3_Brief.042: Add party ownership check: user must be member of the party
- [ ] T3_Brief.043: Add Zod validation: partial sections allowed, max 5000 words per section
- [ ] T3_Brief.044: Implement POST /v1/disputes/:dispute_id/parties/:party_id/brief/submit
- [ ] T3_Brief.045: Add Zod validation: all 5 sections required, word count enforced
- [ ] T3_Brief.046: Add rate limiting: max 5 submit attempts per 10 minutes per user
- [ ] T3_Brief.047: Implement GET /v1/disputes/:dispute_id/parties/:party_id/brief
- [ ] T3_Brief.048: Return 404 if brief not found or user not authorized
- [ ] T3_Brief.049: Return 403 if brief is sealed and user tries to edit
- [ ] T3_Brief.050: Wire brief routes into main Express app
- [ ] T3_Brief.051: Add brief endpoints to OpenAPI spec with request/response schemas
- [ ] T3_Brief.052: Generate frontend types from OpenAPI

#### Frontend Brief Implementation
- [ ] T3_Brief.053: Create frontend/src/app/(dashboard)/disputes/[id]/brief/page.tsx
- [ ] T3_Brief.054: Build 5-section form component: factual_background, my_position, supporting_arguments, acknowledgment_of_opposing, desired_resolution
- [ ] T3_Brief.055: Render each section as separate textarea with label and word count
- [ ] T3_Brief.056: Add real-time word count display per section and total
- [ ] T3_Brief.057: Add visual warning indicator at 4500 words (approaching 5000 cap)
- [ ] T3_Brief.058: Add hard stop at 5000 words — prevent further input, show error
- [ ] T3_Brief.059: Add auto-save draft every 30 seconds with debounce
- [ ] T3_Brief.060: Add "Save Draft" manual button with loading state
- [ ] T3_Brief.061: Show last saved timestamp after each auto-save
- [ ] T3_Brief.062: Add "Submit Brief" button — disabled until all 5 sections have content
- [ ] T3_Brief.063: Add confirmation dialog before submit: "This cannot be edited after submission."
- [ ] T3_Brief.064: Add content moderation warning before submit
- [ ] T3_Brief.065: Implement submit API call with loading spinner on button
- [ ] T3_Brief.066: Show success state after submit: "Brief submitted. Payment required."
- [ ] T3_Brief.067: Disable all textareas and hide Save/Submit buttons after submit (immutability)
- [ ] T3_Brief.068: Add brief status badge: draft (gray), submitted (blue), sealed (green)
- [ ] T3_Brief.069: Handle concurrent saves: show "Saving...", resolve with last server response
- [ ] T3_Brief.070: Add error display for API failures with retry button
- [ ] T3_Brief.071: Add success toast notifications for save and submit
- [ ] T3_Brief.072: Navigate to payment page after successful submit

### F3 Stage 3.2: Comprehensive Testing

#### Backend Unit Tests
- [ ] T3_Brief.073: Create backend/src/__tests__/briefs/save-draft.test.ts
- [ ] T3_Brief.074: Test save draft with valid partial data returns 200 status=draft
- [ ] T3_Brief.075: Test save draft updates existing draft if already exists
- [ ] T3_Brief.076: Test save draft for non-existent dispute returns 404
- [ ] T3_Brief.077: Test save draft for non-party member returns 403
- [ ] T3_Brief.078: Test save draft for non-draft dispute state returns 409
- [ ] T3_Brief.079: Create backend/src/__tests__/briefs/submit.test.ts
- [ ] T3_Brief.080: Test submit with all 5 sections returns 200 status=submitted
- [ ] T3_Brief.081: Test submit with empty section returns 400
- [ ] T3_Brief.082: Test submit with exactly 5000 words returns 200
- [ ] T3_Brief.083: Test submit with 5001 words returns 400
- [ ] T3_Brief.084: Test submit on draft dispute returns 200 state becomes brief_submitted
- [ ] T3_Brief.085: Test submit on non-draft dispute returns 409
- [ ] T3_Brief.086: Test submit sets seal_hash and makes content immutable
- [ ] T3_Brief.087: Test edit after submit returns 403
- [ ] T3_Brief.088: Test word count calculated correctly across all 5 sections
- [ ] T3_Brief.089: Create backend/src/__tests__/briefs/encryption.test.ts
- [ ] T3_Brief.090: Test encryptBriefContent produces non-readable ciphertext
- [ ] T3_Brief.091: Test decryptBriefContent recovers original plaintext exactly
- [ ] T3_Brief.092: Test decryption fails with wrong key (throws, no plaintext leak)
- [ ] T3_Brief.093: Test encrypt-then-decrypt roundtrip preserves content
- [ ] T3_Brief.094: Create backend/src/__tests__/briefs/moderation.test.ts
- [ ] T3_Brief.095: Test moderation blocks illegal activity returns 400
- [ ] T3_Brief.096: Test moderation blocks harassment returns 400
- [ ] T3_Brief.097: Test moderation blocks threats returns 400
- [ ] T3_Brief.098: Test moderation blocks sexual content returns 400
- [ ] T3_Brief.099: Test moderation blocks PII of others returns 400
- [ ] T3_Brief.100: Test moderation passes allowed dispute content returns 200

#### Backend Integration Tests
- [ ] T3_Brief.101: Create backend/src/__integration__/briefs/brief-flow.integration.test.ts
- [ ] T3_Brief.102: Test full flow: create dispute -> save draft multiple times -> submit
- [ ] T3_Brief.103: Verify brief content encrypted in database (BYTEA non-readable)
- [ ] T3_Brief.104: Verify brief decryption on getBrief returns original content
- [ ] T3_Brief.105: Test brief immutability: submit -> attempt edit -> 403
- [ ] T3_Brief.106: Test concurrent saves (two simultaneous draft saves) last write wins no corruption
- [ ] T3_Brief.107: Test word count enforced on submit with real 5000-word content
- [ ] T3_Brief.108: Test status transitions: not_started -> in_progress -> submitted -> sealed
- [ ] T3_Brief.109: Test brief cannot be modified after sealed status
- [ ] T3_Brief.110: Verify N+1 prevention when fetching briefs with disputes
- [ ] T3_Brief.111: Profile brief save and submit queries with EXPLAIN ANALYZE
- [ ] T3_Brief.112: Verify index usage on briefs(dispute_id) and briefs(status)
- [ ] T3_Brief.113: Test retention_expires_at enforced by retention cron job
- [ ] T3_Brief.114: Test brief deleted after retention period expires

#### Frontend Tests
- [ ] T3_Brief.115: Create frontend/src/__tests__/components/BriefForm.test.tsx
- [ ] T3_Brief.116: Test BriefForm renders all 5 sections with textareas
- [ ] T3_Brief.117: Test validates all 5 sections required on submit
- [ ] T3_Brief.118: Test allows partial fill on draft save
- [ ] T3_Brief.119: Test word count updates correctly per section and total
- [ ] T3_Brief.120: Test shows warning at 4500 words
- [ ] T3_Brief.121: Test hard blocks input at 5000 words
- [ ] T3_Brief.122: Test auto-save triggers every 30 seconds
- [ ] T3_Brief.123: Test submit button disabled until all sections filled
- [ ] T3_Brief.124: Test submit shows loading state
- [ ] T3_Brief.125: Test disables all inputs after submit
- [ ] T3_Brief.126: Test shows error on API failure with retry
- [ ] T3_Brief.127: Test shows success message after submit
- [ ] T3_Brief.128: Create frontend/tests/e2e/brief/brief-flow.spec.ts
- [ ] T3_Brief.129: Test E2E: create dispute -> open brief -> fill sections -> save draft -> submit -> payment
- [ ] T3_Brief.130: Test E2E word count enforcement
- [ ] T3_Brief.131: Test E2E brief becomes immutable after submit
- [ ] T3_Brief.132: Verify frontend coverage >= 80% for brief components
- [ ] T3_Brief.133: Run all brief tests and verify pass
- [ ] T3_Brief.134: Fix any flaky tests and re-run
- [ ] T3_Brief.135: Document brief test results

### F3 Stage 3.3: Optimization
- [ ] T3_Brief.136: Profile brief save latency target <200ms
- [ ] T3_Brief.137: Profile brief submit latency target <500ms
- [ ] T3_Brief.138: Optimize AES-256-GCM encryption/decryption performance
- [ ] T3_Brief.139: Add gzip compression before encryption to reduce ciphertext size
- [ ] T3_Brief.140: Add Redis caching for draft briefs with 5min TTL
- [ ] T3_Brief.141: Invalidate cache on brief state change (draft -> submitted)
- [ ] T3_Brief.142: Optimize database queries for brief retrieval with Prisma includes
- [ ] T3_Brief.143: Frontend: add React.memo to BriefForm sections to prevent re-renders
- [ ] T3_Brief.144: Frontend: add debounced auto-save (30s) to reduce API calls
- [ ] T3_Brief.145: Frontend: add optimistic updates for draft save
- [ ] T3_Brief.146: Benchmark encryption under 100 concurrent brief saves
- [ ] T3_Brief.147: Document brief performance benchmarks

### F3 Stage 3.4: Beta Phase
- [ ] T3_Brief.148: Deploy brief flow to local staging
- [ ] T3_Brief.149: Test brief flow with 5 beta users
- [ ] T3_Brief.150: Collect feedback on brief form UX and 5-section layout
- [ ] T3_Brief.151: Monitor brief save and submit error rates
- [ ] T3_Brief.152: Monitor encryption performance in staging
- [ ] T3_Brief.153: Fix critical bugs found in beta testing
- [ ] T3_Brief.154: Add keyboard navigation to all brief form fields
- [ ] T3_Brief.155: Test WCAG 2.1 AA compliance on brief pages
- [ ] T3_Brief.156: Add ARIA labels to all brief form labels and error messages
- [ ] T3_Brief.157: Test with screen reader on brief preparation pages
- [ ] T3_Brief.158: Test content moderation with edge case inputs
- [ ] T3_Brief.159: Document beta feedback
- [ ] T3_Brief.160: Update brief flow based on beta feedback
- [ ] T3_Brief.161: Mark F3 beta phase complete

### F3 Stage 3.5: Pull Request Creation
- [ ] T3_Brief.162: Create feature branch feat/3/eng-brief-preparation
- [ ] T3_Brief.163: Stage brief schema migrations
- [ ] T3_Brief.164: Stage brief service, routes, encryption utils, moderation
- [ ] T3_Brief.165: Stage frontend brief pages and BriefForm component
- [ ] T3_Brief.166: Stage OpenAPI updates
- [ ] T3_Brief.167: Stage test files (unit, integration, E2E)
- [ ] T3_Brief.168: Run pre-commit checks: lint, typecheck, test:unit
- [ ] T3_Brief.169: Verify all CI checks pass
- [ ] T3_Brief.170: Ensure test coverage >= 80% for changed files
- [ ] T3_Brief.171: Write PR description with feature summary
- [ ] T3_Brief.172: Add agent ownership table to PR
- [ ] T3_Brief.173: Link OpenAPI spec changes in PR
- [ ] T3_Brief.174: Request review from Senior_Developer (primary)
- [ ] T3_Brief.175: Request review from Privacy_Engineer (encryption)
- [ ] T3_Brief.176: Request security review from AppSec_Engineer
- [ ] T3_Brief.177: Request testing review from API_Tester
- [ ] T3_Brief.178: Address review comments
- [ ] T3_Brief.179: Re-run CI after addressing comments
- [ ] T3_Brief.180: Squash and merge PR to develop branch
- [ ] T3_Brief.181: Delete feature branch after merge

### F3 Stage 3.6: Merging to Main Execution
- [ ] T3_Brief.182: Verify F3 complete and stable on develop
- [ ] T3_Brief.183: Create PR from develop to main for F3
- [ ] T3_Brief.184: Get attorney/legal sign-off on brief encryption and moderation
- [ ] T3_Brief.185: Run full test suite on develop: unit, integration, E2E
- [ ] T3_Brief.186: Verify all tests pass
- [ ] T3_Brief.187: Verify code coverage >= 80%
- [ ] T3_Brief.188: Get approval from Senior_Developer
- [ ] T3_Brief.189: Get approval from Privacy_Engineer
- [ ] T3_Brief.190: Get approval from AppSec_Engineer
- [ ] T3_Brief.191: Merge PR using gh pr merge --squash --delete-branch
- [ ] T3_Brief.192: Tag release: git tag -a v0.3.0-briefs -m "F3 Brief Preparation complete"
- [ ] T3_Brief.193: Push tag to remote
- [ ] T3_Brief.194: Deploy to local staging
- [ ] T3_Brief.195: Smoke test brief flow on staging
- [ ] T3_Brief.196: Monitor staging for 24 hours
- [ ] T3_Brief.197: Document F3 completion in plan.md change log
- [ ] T3_Brief.198: Update project checklist to mark F3 complete
- [ ] T3_Brief.199: Notify team of F3 merge to main
- [ ] T3_Brief.200: Archive F3 feature branch
- [ ] T3_Brief.201: Mark F3 complete in project management tool


## PHASE 3: PAYMENTS (Week 5)


## FEATURE F4: PAYMENT COLLECTION


### F4 Stage 3.1: Feature Implementation

- [ ] T3.1.1.1: Create payments table migration in backend/prisma/migrations/
- [ ] T3.1.1.2: Add payments columns: id, dispute_id, user_id, amount_usd, currency, processor, processor_payment_id, status, refunded_amount_usd, refund_reason, refunded_at, idempotency_key, created_at, updated_at, completed_at
- [ ] T3.1.1.3: Add index on payments(dispute_id)
- [ ] T3.1.1.4: Add index on payments(user_id)
- [ ] T3.1.1.5: Add unique constraint on payments(processor_payment_id)
- [ ] T3.1.1.6: Add unique constraint on payments(idempotency_key)
- [ ] T3.1.1.7: Run prisma migrate dev --name add-payments
- [ ] T3.1.1.8: Update backend/src/types/schemas.ts with payment Zod schemas
- [ ] T3.1.1.9: Update OpenAPI spec with payment endpoints
- [ ] T3.1.1.10: Generate frontend types from OpenAPI
- [ ] T3.1.1.11: Create backend/src/services/payments/index.ts
- [ ] T3.1.1.12: Implement createPaymentIntent validate dispute in payment_pending state
- [ ] T3.1.1.13: Implement createPaymentIntent call Stripe paymentIntents create for $49 USD
- [ ] T3.1.1.14: Implement createPaymentIntent store idempotency key with 24h TTL
- [ ] T3.1.1.15: Implement confirmPayment verify idempotency key then update state
- [ ] T3.1.1.16: Implement confirmPayment update dispute state to under_analysis
- [ ] T3.1.1.17: Implement confirmPayment trigger evaluation job
- [ ] T3.1.1.18: Implement requestRefund validate dispute eligible for refund
- [ ] T3.1.1.19: Create backend/src/routes/v1/payments.routes.ts
- [ ] T3.1.1.20: Implement GET /v1/disputes/:dispute_id/payment-intent endpoint
- [ ] T3.1.1.21: Implement POST /v1/disputes/:dispute_id/payment/confirm endpoint
- [ ] T3.1.1.22: Implement POST /v1/disputes/:dispute_id/refund-request endpoint
- [ ] T3.1.1.23: Implement GET /v1/users/me/payments endpoint
- [ ] T3.1.1.24: Create Stripe webhook handler POST /v1/webhooks/stripe
- [ ] T3.1.1.25: Implement Stripe webhook signature verification with STRIPE_WEBHOOK_SECRET
- [ ] T3.1.1.26: Handle payment_intent.succeeded: update state and trigger evaluation
- [ ] T3.1.1.27: Handle payment_intent.failed: revert to draft or payment_pending
- [ ] T3.1.1.28: Create backend/src/jobs/email.worker.ts or queue consumer for async emails
- [ ] T3.1.1.29: Create email templates payment-success.ts, payment-failed.ts
- [ ] T3.1.1.30: Create frontend src/app/(dashboard)/disputes/[id]/payment/page.tsx
- [ ] T3.1.1.31: Create Stripe Elements payment form in frontend
- [ ] T3.1.1.32: Implement Stripe payment confirmation flow
- [ ] T3.1.1.33: Add payment success and error states
- [ ] T3.1.1.34: Add retry payment button for failed payments
- [ ] T3.1.1.35: Add payment history to user dashboard

### F4 Stage 3.2: Comprehensive Testing

- [ ] T3.2.1.1: Create backend/src/__tests__/payments/intent.test.ts
- [ ] T3.2.1.2: Test create intent for payment_pending dispute returns 200
- [ ] T3.2.1.3: Test create intent for non-payment_pending returns 400
- [ ] T3.2.1.4: Test create intent duplicate idempotency key returns original response
- [ ] T3.2.1.5: Test create intent amount always 49.00 USD
- [ ] T3.2.1.6: Create backend/src/__tests__/payments/confirm.test.ts
- [ ] T3.2.1.7: Test confirm valid payment returns 200 state under_analysis
- [ ] T3.2.1.8: Test confirm invalid intent returns 400
- [ ] T3.2.1.9: Test confirm duplicate idempotency returns original
- [ ] T3.2.1.10: Create backend/src/__tests__/payments/refund.test.ts
- [ ] T3.2.1.11: Test refund request eligible dispute returns 202
- [ ] T3.2.1.12: Test refund request ineligible dispute returns 400
- [ ] T3.2.1.13: Create backend/src/__tests__/payments/webhook.test.ts
- [ ] T3.2.1.14: Test Stripe webhook signature verification rejects bad sig
- [ ] T3.2.1.15: Test payment_intent.succeeded updates state and triggers evaluation
- [ ] T3.2.1.16: Test payment_intent.failed reverts to draft
- [ ] T3.2.1.17: Create backend/src/__tests__/payments/integration.test.ts
- [ ] T3.2.1.18: Test full payment flow create intent -> confirm -> state change
- [ ] T3.2.1.19: Test webhook failure fallback polling every 30s for 5 min
- [ ] T3.2.1.20: Create backend/src/__tests__/payments/idempotency.test.ts
- [ ] T3.2.1.21: Test idempotency keys stored with 24h TTL
- [ ] T3.2.1.22: Test repeated request with same key returns original
- [ ] T3.2.1.23: Test idempotency key expires after 24h
- [ ] T3.2.1.24: Test concurrent payment confirmations handled safely
- [ ] T3.2.1.25: Create frontend/tests/e2e/payments/payment-flow.spec.ts
- [ ] T3.2.1.26: Test user can pay for analysis with Stripe test card
- [ ] T3.2.1.27: Test payment success redirects to analysis-in-progress
- [ ] T3.2.1.28: Test payment failure shows error and retry option
- [ ] T3.2.1.29: Run all payment tests and verify pass
- [ ] T3.2.1.30: Document payment test results

### F4 Stage 3.3: Optimization

- [ ] T3.3.1.1: Profile Stripe API call latency target <500ms
- [ ] T3.3.1.2: Add Stripe API call timeout 10s
- [ ] T3.3.1.3: Add retry with exponential backoff for Stripe API failures
- [ ] T3.3.1.4: Optimize idempotency key database queries with index
- [ ] T3.3.1.5: Add batch webhook processing for high volume
- [ ] T3.3.1.6: Monitor payment success rate target >95%
- [ ] T3.3.1.7: Monitor payment latency p95 <2s
- [ ] T3.3.1.8: Frontend optimize payment form render performance
- [ ] T3.3.1.9: Frontend add loading skeletons during payment processing
- [ ] T3.3.1.10: Document payment performance benchmarks

### F4 Stage 3.4: Beta Phase

- [ ] T3.4.1.1: Deploy payment flow to local staging with Stripe test mode
- [ ] T3.4.1.2: Test payment flow with 5 beta users
- [ ] T3.4.1.3: Collect feedback on payment UX
- [ ] T3.4.1.4: Monitor payment success rate in staging
- [ ] T3.4.1.5: Monitor Stripe webhook delivery success
- [ ] T3.4.1.6: Fix critical bugs found in beta testing
- [ ] T3.4.1.7: Add accessibility checks on payment form
- [ ] T3.4.1.8: Document beta feedback
- [ ] T3.4.1.9: Mark F4 beta phase complete

### F4 Stage 3.5: Pull Request Creation

- [ ] T3.5.1.1: Create feature branch feat/4/eng-payments-stripe
- [ ] T3.5.1.2: Stage payment schema migrations
- [ ] T3.5.1.3: Stage payment service, routes, webhook handler
- [ ] T3.5.1.4: Stage frontend payment pages and Stripe integration
- [ ] T3.5.1.5: Stage OpenAPI updates
- [ ] T3.5.1.6: Stage test files
- [ ] T3.5.1.7: Run checks verify CI and coverage >= 80%
- [ ] T3.5.1.8: Write PR description and ownership table
- [ ] T3.5.1.9: Request reviews from Payments_and_Billing_Engineer AppSec_Engineer API_Tester
- [ ] T3.5.1.10: Address comments and squash merge to develop
- [ ] T3.5.1.11: Delete feature branch

### F4 Stage 3.6: Merging to Main Execution

- [ ] T3.6.1.1: Verify F4 complete on develop
- [ ] T3.6.1.2: Create PR from develop to main for F4
- [ ] T3.6.1.3: Get approvals from Payments_and_Billing_Engineer and AppSec
- [ ] T3.6.1.4: Run full test suite and verify coverage >= 80%
- [ ] T3.6.1.5: Merge PR squash and delete branch
- [ ] T3.6.1.6: Tag release v0.4.0-payments and push tag
- [ ] T3.6.1.7: Deploy to local staging and smoke test
- [ ] T3.6.1.8: Monitor for 24 hours, update logs, notify team
- [ ] T3.6.1.9: Mark F4 complete

## PHASE 4: EVALUATION ORCHESTRATION (Weeks 6-7)


## FEATURE F5: EVALUATION ORCHESTRATION


### F5 Stage 4.1: Feature Implementation

- [ ] T4.1.1.1: Create backend/src/providers/llm.ts LLMProvider interface and ProviderCapabilities type
- [ ] T4.1.1.2: Create backend/src/providers/types.ts Prompt CompletionResult HealthStatus CostEstimate
- [ ] T4.1.1.3: Create backend/src/providers/errors.ts provider error classes
- [ ] T4.1.1.4: Create backend/src/providers/retry.ts withRetry exponential backoff utility
- [ ] T4.1.1.5: Create backend/src/providers/circuit-breaker.ts CircuitBreaker class
- [ ] T4.1.1.6: Create backend/src/providers/cost.ts cost estimation utilities
- [ ] T4.1.1.7: Create backend/src/providers/health.ts health check utilities
- [ ] T4.1.1.8: Create backend/src/providers/registry.ts ProviderRegistry class
- [ ] T4.1.1.9: Create backend/src/providers/index.ts barrel export
- [ ] T4.1.1.10: Create backend/src/providers/groq.provider.ts GroqProvider for Llama 3 70B
- [ ] T4.1.1.11: Create backend/src/providers/groq.provider.ts MixtralProvider for Mixtral 8x7B
- [ ] T4.1.1.12: Create backend/src/providers/gemini.provider.ts GeminiProvider for Gemini 1.5 Pro
- [ ] T4.1.1.13: Configure providers from env GROQ_API_KEY and GEMINI_API_KEY
- [ ] T4.1.1.14: Create backend/src/prompts/eval-v3.2.ts with immutable EVAL_PROMPT_V3_2 string
- [ ] T4.1.1.15: Create backend/src/prompts/agg-v2.1.ts with immutable AGG_PROMPT_V2_1 string
- [ ] T4.1.1.16: Create evaluator_outputs table migration in backend/prisma/migrations/
- [ ] T4.1.1.17: Add evaluator_outputs columns with all required fields
- [ ] T4.1.1.18: Add index on evaluator_outputs(dispute_id)
- [ ] T4.1.1.19: Run prisma migrate dev --name add-evaluator-outputs
- [ ] T4.1.1.20: Create backend/src/services/evaluation/index.ts
- [ ] T4.1.1.21: Implement createEvaluationJob dispute and brief validation
- [ ] T4.1.1.22: Implement dispatchEvaluators with Promise.allSettled parallel dispatch
- [ ] T4.1.1.23: Implement dispatchEvaluators retry loop up to 3 attempts 1s then 2s backoff
- [ ] T4.1.1.24: Implement dispatchEvaluators store output in evaluator_outputs table
- [ ] T4.1.1.25: Implement dispatchEvaluators record prompt_version cost duration attempt_number
- [ ] T4.1.1.26: Implement dispatchEvaluators minimum 3 successful rule
- [ ] T4.1.1.27: Implement dispatchEvaluators auto-refund when fewer than 3 succeed
- [ ] T4.1.1.28: Implement dispatchEvaluators update dispute state to awaiting_aggregation or failed
- [ ] T4.1.1.29: Implement decodeContent AES-256-GCM decrypt helper for brief content
- [ ] T4.1.1.30: Implement input sanitization before sending brief to evaluators
- [ ] T4.1.1.31: Implement output validation detect prompt injection patterns
- [ ] T4.1.1.32: Create backend/src/jobs/evaluation.worker.ts BullMQ worker
- [ ] T4.1.1.33: Create backend/src/jobs/queues.ts queue definitions
- [ ] T4.1.1.34: Create backend/src/routes/v1/evaluation.routes.ts
- [ ] T4.1.1.35: Implement POST /v1/disputes/:dispute_id/evaluate endpoint
- [ ] T4.1.1.36: Implement GET /v1/disputes/:dispute_id/evaluation/status endpoint
- [ ] T4.1.1.37: Add evaluation endpoints to OpenAPI spec
- [ ] T4.1.1.38: Generate frontend types from OpenAPI
- [ ] T4.1.1.39: Create frontend src/app/(dashboard)/disputes/[id]/analysis/page.tsx
- [ ] T4.1.1.40: Implement analysis status display with SSE or polling
- [ ] T4.1.1.41: Add evaluator progress indicators
- [ ] T4.1.1.42: Add evaluation complete notification state

### F5 Stage 4.2: Comprehensive Testing

- [ ] T4.2.1.1: Create backend/src/__tests__/providers/groq.test.ts
- [ ] T4.2.1.2: Test GroqProvider generateCompletion returns completion
- [ ] T4.2.1.3: Test GroqProvider healthCheck returns healthy true on valid API
- [ ] T4.2.1.4: Test GroqProvider healthCheck returns healthy false on invalid API
- [ ] T4.2.1.5: Test GroqProvider data residency checks
- [ ] T4.2.1.6: Test GroqProvider hasNoTrainingGuarantee returns true
- [ ] T4.2.1.7: Create backend/src/__tests__/providers/gemini.test.ts
- [ ] T4.2.1.8: Test GeminiProvider generateCompletion returns completion
- [ ] T4.2.1.9: Test GeminiProvider healthCheck latency tracking
- [ ] T4.2.1.10: Create backend/src/__tests__/providers/registry.test.ts
- [ ] T4.2.1.11: Test ProviderRegistry register and all return providers
- [ ] T4.2.1.12: Create backend/src/__tests__/providers/circuit-breaker.test.ts
- [ ] T4.2.1.13: Test CircuitBreaker opens on consecutive failures
- [ ] T4.2.1.14: Test CircuitBreaker half-open after timeout
- [ ] T4.2.1.15: Test CircuitBreaker closes on success
- [ ] T4.2.1.16: Create backend/src/__tests__/providers/retry.test.ts
- [ ] T4.2.1.17: Test withRetry succeeds on first attempt
- [ ] T4.2.1.18: Test withRetry retries on transient failure
- [ ] T4.2.1.19: Test withRetry throws after max attempts
- [ ] T4.2.1.20: Create backend/src/__tests__/evaluation/dispatch.test.ts
- [ ] T4.2.1.21: Test dispatchEvaluators calls all 3 providers in parallel
- [ ] T4.2.1.22: Test dispatchEvaluators stores outputs in database
- [ ] T4.2.1.23: Test dispatchEvaluators records prompt_version cost duration
- [ ] T4.2.1.24: Test dispatchEvaluators minimum 3 success moves to awaiting_aggregation
- [ ] T4.2.1.25: Test dispatchEvaluators 1 failure after retries auto-refund
- [ ] T4.2.1.26: Test dispatchEvaluators all 3 failures state failed auto-refund
- [ ] T4.2.1.27: Test dispatchEvaluators prompt injection output flagged parse_success false
- [ ] T4.2.1.28: Test dispatchEvaluators timeout >60s marked failed and retried
- [ ] T4.2.1.29: Test dispatchEvaluators attempt_number increments on retry
- [ ] T4.2.1.30: Test input sanitization blocks prompt injection patterns
- [ ] T4.2.1.31: Create backend/src/__tests__/evaluation/integration.test.ts
- [ ] T4.2.1.32: Test full evaluation flow with mock providers
- [ ] T4.2.1.33: Test full evaluation flow with real Groq API
- [ ] T4.2.1.34: Test full evaluation flow with real Gemini API
- [ ] T4.2.1.35: Test cost tracking recorded per evaluator
- [ ] T4.2.1.36: Test cost threshold alert triggered at $15/dispute
- [ ] T4.2.1.37: Create backend/src/__tests__/evaluation/state-machine.test.ts
- [ ] T4.2.1.38: Test state transition under_analysis -> awaiting_aggregation
- [ ] T4.2.1.39: Test state transition under_analysis -> failed on insufficient successes
- [ ] T4.2.1.40: Create frontend/tests/e2e/evaluation/analysis-flow.spec.ts
- [ ] T4.2.1.41: Test user sees analysis in progress after payment
- [ ] T4.2.1.42: Test user sees evaluation status updates
- [ ] T4.2.1.43: Test user receives notification when analysis complete
- [ ] T4.2.1.44: Run all evaluation tests and verify pass
- [ ] T4.2.1.45: Document evaluation test results

### F5 Stage 4.3: Optimization

- [ ] T4.3.1.1: Profile provider dispatch latency target all 3 complete <5 min
- [ ] T4.3.1.2: Parallel dispatch with Promise.allSettled already implemented
- [ ] T4.3.1.3: Add circuit breaker per provider to fail fast
- [ ] T4.3.1.4: Add provider fallback routing on primary failure
- [ ] T4.3.1.5: Add brief content caching hash-based key for identical briefs
- [ ] T4.3.1.6: Monitor provider success rate per evaluator
- [ ] T4.3.1.7: Monitor LLM cost per dispute target <$8.30
- [ ] T4.3.1.8: Add daily cost aggregation job
- [ ] T4.3.1.9: Add Slack alert if cost per dispute > $15
- [ ] T4.3.1.10: Optimize database queries for evaluation status
- [ ] T4.3.1.11: Frontend add optimistic status updates during evaluation
- [ ] T4.3.1.12: Document evaluation performance benchmarks

### F5 Stage 4.4: Beta Phase

- [ ] T4.4.1.1: Deploy evaluation flow to local staging
- [ ] T4.4.1.2: Test evaluation with real Groq and Gemini APIs
- [ ] T4.4.1.3: Test evaluation with 5 real briefs from beta users
- [ ] T4.4.1.4: Monitor evaluation success rate
- [ ] T4.4.1.5: Monitor evaluation latency p95 <5min
- [ ] T4.4.1.6: Monitor LLM costs per dispute
- [ ] T4.4.1.7: Fix provider-specific bugs
- [ ] T4.4.1.8: Add accessibility on analysis status page
- [ ] T4.4.1.9: Document beta feedback
- [ ] T4.4.1.10: Mark F5 beta phase complete

### F5 Stage 4.5: Pull Request Creation

- [ ] T4.5.1.1: Create feature branch feat/5/eng-evaluation-orchestration
- [ ] T4.5.1.2: Stage provider abstraction files
- [ ] T4.5.1.3: Stage evaluation service, routes, jobs
- [ ] T4.5.1.4: Stage prompt files
- [ ] T4.5.1.5: Stage OpenAPI updates
- [ ] T4.5.1.6: Stage test files
- [ ] T4.5.1.7: Run checks verify CI and coverage >= 80%
- [ ] T4.5.1.8: Write PR description and ownership table
- [ ] T4.5.1.9: Request reviews from AI_Engineer Prompt_Engineer Senior_SecOps_Engineer
- [ ] T4.5.1.10: Address comments squash merge to develop
- [ ] T4.5.1.11: Delete feature branch

### F5 Stage 4.6: Merging to Main Execution

- [ ] T4.6.1.1: Verify F5 complete on develop
- [ ] T4.6.1.2: Create PR from develop to main for F5
- [ ] T4.6.1.3: Get approvals from AI_Engineer and Senior_SecOps
- [ ] T4.6.1.4: Run full test suite and verify coverage >= 80%
- [ ] T4.6.1.5: Merge PR squash and delete branch
- [ ] T4.6.1.6: Tag release v0.5.0-evaluation and push tag
- [ ] T4.6.1.7: Deploy to local staging and smoke test
- [ ] T4.6.1.8: Monitor 24 hours update logs notify team
- [ ] T4.6.1.9: Mark F5 complete

## PHASE 5: MANUAL AGGREGATION (Week 8)


## FEATURE F6: MANUAL AGGREGATION


### F6 Stage 5.1: Feature Implementation

- [ ] T5.1.1.1: Create aggregation service with opinion generation logic
- [ ] T5.1.1.2: Enforce minimum 3 evaluator outputs before allowing aggregation
- [ ] T5.1.1.3: Compute inter_evaluator_agreement from evaluator outputs
- [ ] T5.1.1.4: Compute overall_confidence for the opinion
- [ ] T5.1.1.5: Generate opinion with all required fields and standard disclaimers
- [ ] T5.1.1.6: Create admin authentication middleware and role checks
- [ ] T5.1.1.7: Implement admin dispute list and detail endpoints
- [ ] T5.1.1.8: Implement pending aggregations list endpoint
- [ ] T5.1.1.9: Implement aggregation publish endpoint
- [ ] T5.1.1.10: Wire aggregation routes into Express app
- [ ] T5.1.1.11: Add admin endpoints to OpenAPI spec
- [ ] T5.1.1.12: Generate frontend types from OpenAPI
- [ ] T5.1.1.13: Build admin dashboard UI: dispute list, filters, detail view
- [ ] T5.1.1.14: Build aggregation form: side-by-side evaluator outputs, opinion fields
- [ ] T5.1.1.15: Add publish and unpublish within 1 hour controls

### F6 Stage 5.2: Comprehensive Testing

- [ ] T5.2.1.1: Test admin authentication rejects non-admin users
- [ ] T5.2.1.2: Test admin lists disputes with filters
- [ ] T5.2.1.3: Test admin views dispute details
- [ ] T5.2.1.4: Test aggregates with 3 outputs -> 200 opinion created
- [ ] T5.2.1.5: Test aggregates with <3 outputs -> 400
- [ ] T5.2.1.6: Test publishes without disclaimers -> 400
- [ ] T5.2.1.7: Test publishes missing fields -> 400
- [ ] T5.2.1.8: Test publish sets state completed
- [ ] T5.2.1.9: Test publish triggers user notification
- [ ] T5.2.1.10: Test unpublish within 1 hour succeeds
- [ ] T5.2.1.11: Test unpublish after 1 hour blocked
- [ ] T5.2.1.12: Test full aggregation flow: pending -> aggregate -> completed
- [ ] T5.2.1.13: Test audit log records admin actions
- [ ] T5.2.1.14: Run E2E tests for admin aggregation flow
- [ ] T5.2.1.15: Document aggregation test results

### F6 Stage 5.3: Optimization

- [ ] T5.3.1.1: Profile admin list query target <100ms
- [ ] T5.3.1.2: Add covering index for admin dispute queries
- [ ] T5.3.1.3: Cache admin dashboard stats with 1min TTL
- [ ] T5.3.1.4: Frontend virtualize large admin dispute tables
- [ ] T5.3.1.5: Document admin performance benchmarks

### F6 Stage 5.4: Beta Phase

- [ ] T5.4.1.1: Deploy aggregation to local staging
- [ ] T5.4.1.2: Test aggregation with internal team as admins
- [ ] T5.4.1.3: Monitor aggregation SLA 24h
- [ ] T5.4.1.4: Collect admin UX feedback
- [ ] T5.4.1.5: Fix critical bugs
- [ ] T5.4.1.6: Verify WCAG 2.1 AA on admin pages
- [ ] T5.4.1.7: Mark F6 beta phase complete

### F6 Stage 5.5: Pull Request Creation

- [ ] T5.5.1.1: Create feature branch feat/6/eng-manual-aggregation
- [ ] T5.5.1.2: Stage aggregation service and admin routes
- [ ] T5.5.1.3: Stage frontend admin pages
- [ ] T5.5.1.4: Stage OpenAPI updates
- [ ] T5.5.1.5: Stage test files
- [ ] T5.5.1.6: Run checks verify CI and coverage >= 80%
- [ ] T5.5.1.7: Write PR description and ownership table
- [ ] T5.5.1.8: Request reviews from Senior_Developer Security_Architect API_Tester
- [ ] T5.5.1.9: Address comments squash merge to develop
- [ ] T5.5.1.10: Delete feature branch

### F6 Stage 5.6: Merging to Main Execution

- [ ] T5.6.1.1: Verify F6 complete on develop
- [ ] T5.6.1.2: Create PR from develop to main for F6
- [ ] T5.6.1.3: Get required approvals
- [ ] T5.6.1.4: Run full test suite verify coverage >= 80%
- [ ] T5.6.1.5: Merge PR squash and delete branch
- [ ] T5.6.1.6: Tag release v0.6.0-aggregation and push tag
- [ ] T5.6.1.7: Deploy to local staging and smoke test
- [ ] T5.6.1.8: Monitor 24 hours update logs notify team
- [ ] T5.6.1.9: Mark F6 complete

## PHASE 6: OPINION DELIVERY (Week 9)


## FEATURE F7: OPINION DELIVERY


### F7 Stage 6.1: Feature Implementation

- [ ] T6.1.1.1: Create opinions table migration in backend/prisma/migrations/
- [ ] T6.1.1.2: Add opinions columns id, dispute_id, encrypted_content, content_encryption_key_id, eval_prompt_version, agg_prompt_version, evaluator_output_ids, inter_evaluator_agreement, overall_confidence, aggregator_provider, aggregator_model_id, total_cost_usd, pdf_storage_key, pdf_generated_at, created_at, delivered_at, retention_expires_at
- [ ] T6.1.1.3: Add index on opinions(created_at DESC)
- [ ] T6.1.1.4: Add partial index on opinions(retention_expires_at) where retention_expires_at IS NOT NULL
- [ ] T6.1.1.5: Run prisma migrate dev --name add-opinions
- [ ] T6.1.1.6: Implement encryptOpinionContent AES-256-GCM helper
- [ ] T6.1.1.7: Implement decryptOpinionContent AES-256-GCM helper
- [ ] T6.1.1.8: Implement getOpinion with ownership check for dispute initiator
- [ ] T6.1.1.9: Implement PDF generation with Puppeteer including opinion content, disclaimers, timestamp, evaluators
- [ ] T6.1.1.10: Implement PDF retry once on failure; if still failing deliver without PDF
- [ ] T6.1.1.11: Create opinion read route and PDF download route
- [ ] T6.1.1.12: Implement opinion status endpoint with SSE stream
- [ ] T6.1.1.13: Add opinion endpoints to OpenAPI spec
- [ ] T6.1.1.14: Generate frontend types from OpenAPI
- [ ] T6.1.1.15: Build opinion display page on frontend
- [ ] T6.1.1.16: Add PDF download button and signed URL expiry handling
- [ ] T6.1.1.17: Add SSE status updates for real-time opinion readiness
- [ ] T6.1.1.18: Add notification when opinion is ready

### F7 Stage 6.2: Comprehensive Testing

- [ ] T6.2.1.1: Test createOpinionFromAggregation stores opinion with all fields
- [ ] T6.2.1.2: Test createOpinionFromAggregation includes all 4 required disclaimers
- [ ] T6.2.1.3: Test PDF generation creates valid PDF with Puppeteer
- [ ] T6.2.1.4: Test PDF delivery falls back to web-only when PDF generation fails
- [ ] T6.2.1.5: Test opinion read returns opinion for dispute initiator
- [ ] T6.2.1.6: Test opinion read returns 404 for non-initiator
- [ ] T6.2.1.7: Test opinion read returns 404 for non-completed dispute
- [ ] T6.2.1.8: Test SSE stream pushes status updates
- [ ] T6.2.1.9: Test SSE stream closes after dispute completed
- [ ] T6.2.1.10: Test full opinion delivery flow aggregate -> create -> deliver
- [ ] T6.2.1.11: Test notification email sent when opinion ready
- [ ] T6.2.1.12: Run E2E tests for opinion read and PDF download
- [ ] T6.2.1.13: Document opinion test results

### F7 Stage 6.3: Optimization

- [ ] T6.3.1.1: Profile opinion read latency target <200ms including decryption
- [ ] T6.3.1.2: Profile PDF generation latency target <10s
- [ ] T6.3.1.3: Add async PDF generation queue
- [ ] T6.3.1.4: Cache opinion read queries
- [ ] T6.3.1.5: Monitor PDF generation success rate
- [ ] T6.3.1.6: Monitor SSE connection count
- [ ] T6.3.1.7: Frontend optimize opinion page render
- [ ] T6.3.1.8: Frontend add PDF download progress indicator
- [ ] T6.3.1.9: Document opinion delivery benchmarks

### F7 Stage 6.4: Beta Phase

- [ ] T6.4.1.1: Deploy opinion delivery to local staging
- [ ] T6.4.1.2: Test opinion flow with 10 aggregated evaluations
- [ ] T6.4.1.3: Test PDF generation and download
- [ ] T6.4.1.4: Test SSE real-time updates
- [ ] T6.4.1.5: Monitor opinion delivery success rate
- [ ] T6.4.1.6: Collect user feedback on opinion format
- [ ] T6.4.1.7: Fix critical bugs
- [ ] T6.4.1.8: Verify WCAG 2.1 AA on opinion page
- [ ] T6.4.1.9: Document beta feedback
- [ ] T6.4.1.10: Mark F7 beta phase complete

### F7 Stage 6.5: Pull Request Creation

- [ ] T6.5.1.1: Create feature branch feat/7/eng-opinion-delivery
- [ ] T6.5.1.2: Stage opinion service routes encryption utils
- [ ] T6.5.1.3: Stage frontend opinion pages and SSE hooks
- [ ] T6.5.1.4: Stage OpenAPI updates
- [ ] T6.5.1.5: Stage test files
- [ ] T6.5.1.6: Run checks verify CI and coverage >= 80%
- [ ] T6.5.1.7: Write PR description and ownership table
- [ ] T6.5.1.8: Request reviews from Backend_Architect Cloud_Security_Architect API_Tester
- [ ] T6.5.1.9: Address comments squash merge to develop
- [ ] T6.5.1.10: Delete feature branch

### F7 Stage 6.6: Merging to Main Execution

- [ ] T6.6.1.1: Verify F7 complete on develop
- [ ] T6.6.1.2: Create PR from develop to main for F7
- [ ] T6.6.1.3: Run full test suite verify coverage >= 80%
- [ ] T6.6.1.4: Merge PR squash and delete branch
- [ ] T6.6.1.5: Tag release v0.7.0-opinions and push tag
- [ ] T6.6.1.6: Deploy to local staging and smoke test
- [ ] T6.6.1.7: Monitor 24 hours update logs notify team
- [ ] T6.6.1.8: Mark F7 complete

## PHASE 7: EMAIL NOTIFICATIONS (Week 10)


## FEATURE F9: EMAIL NOTIFICATIONS


### F9 Stage 7.1: Feature Implementation

- [ ] T7.1.1.1: Create backend/src/services/email/index.ts email service
- [ ] T7.1.1.2: Implement sendEmail function using Nodemailer locally
- [ ] T7.1.1.3: Create email templates: verification-email.ts, password-reset.ts
- [ ] T7.1.1.4: Create email templates: dispute-created.ts, brief-submitted.ts
- [ ] T7.1.1.5: Create email templates: payment-success.ts, payment-failed.ts
- [ ] T7.1.1.6: Create email templates: opinion-ready.ts, account-deletion.ts
- [ ] T7.1.1.7: Create backend/src/config/email.ts email provider configuration
- [ ] T7.1.1.8: Implement email queue with BullMQ
- [ ] T7.1.1.9: Create backend/src/jobs/email.worker.ts worker for sending emails
- [ ] T7.1.1.10: Implement retry logic max 3 retries with exponential backoff
- [ ] T7.1.1.11: Implement dead letter queue after 3 retries
- [ ] T7.1.1.12: After 3 retries trigger in-app notification fallback
- [ ] T7.1.1.13: Integrate email triggers into auth register and verify flow
- [ ] T7.1.1.14: Integrate email triggers into password reset flow
- [ ] T7.1.1.15: Integrate email triggers into dispute and brief flows
- [ ] T7.1.1.16: Integrate email triggers into payment success/failure flow
- [ ] T7.1.1.17: Integrate email triggers into opinion ready flow
- [ ] T7.1.1.18: Add email sending metrics to monitoring
- [ ] T7.1.1.19: Add email bounce and complaint handling
- [ ] T7.1.1.20: Add SPF and DKIM compliance headers to all emails

### F9 Stage 7.2: Comprehensive Testing

- [ ] T7.2.1.1: Test sendEmail with Nodemailer test account
- [ ] T7.2.1.2: Test sendEmail queues job in BullMQ
- [ ] T7.2.1.3: Test retry logic succeeds after transient failure
- [ ] T7.2.1.4: Test retry logic exhausted after 3 retries
- [ ] T7.2.1.5: Test dead letter queue receives failed jobs
- [ ] T7.2.1.6: Test all templates render without errors
- [ ] T7.2.1.7: Test all templates include required fields: logo, footer, contact
- [ ] T7.2.1.8: Test verification email contains verification link
- [ ] T7.2.1.9: Test password reset email contains reset link
- [ ] T7.2.1.10: Test opinion ready email contains opinion link and PDF link
- [ ] T7.2.1.11: Test full email flow: register -> verification queued -> sent
- [ ] T7.2.1.12: Test full email flow: opinion published -> notification email sent
- [ ] T7.2.1.13: Test email sending respects 5 minute SLA
- [ ] T7.2.1.14: Test user sees in-app notification when opinion ready
- [ ] T7.2.1.15: Test user can mark notification as read
- [ ] T7.2.1.16: Run all email tests and verify pass
- [ ] T7.2.1.17: Document email test results

### F9 Stage 7.3: Optimization

- [ ] T7.3.1.1: Profile email queue latency target send within 5 minutes
- [ ] T7.3.1.2: Batch email sending for bulk notifications
- [ ] T7.3.1.3: Monitor email delivery success rate target >99%
- [ ] T7.3.1.4: Monitor email queue depth
- [ ] T7.3.1.5: Monitor bounce and complaint rates
- [ ] T7.3.1.6: Frontend optimize notification component render
- [ ] T7.3.1.7: Document email service benchmarks

### F9 Stage 7.4: Beta Phase

- [ ] T7.4.1.1: Deploy email notifications to local staging with Mailhog
- [ ] T7.4.1.2: Test all email types with test addresses
- [ ] T7.4.1.3: Verify emails arrive in Mailhog
- [ ] T7.4.1.4: Test retry behavior by simulating SMTP failure
- [ ] T7.4.1.5: Monitor email delivery rates
- [ ] T7.4.1.6: Fix critical bugs
- [ ] T7.4.1.7: Mark F9 beta phase complete

### F9 Stage 7.5: Pull Request Creation

- [ ] T7.5.1.1: Create feature branch feat/9/ops-email-notifications
- [ ] T7.5.1.2: Stage email service, templates, queue worker
- [ ] T7.5.1.3: Stage frontend notification component
- [ ] T7.5.1.4: Stage test files
- [ ] T7.5.1.5: Run checks verify CI and coverage >= 80%
- [ ] T7.5.1.6: Write PR description and ownership table
- [ ] T7.5.1.7: Request reviews from DevOps_Automator AppSec_Engineer API_Tester
- [ ] T7.5.1.8: Address comments squash merge to develop
- [ ] T7.5.1.9: Delete feature branch

### F9 Stage 7.6: Merging to Main Execution

- [ ] T7.6.1.1: Verify F9 complete on develop
- [ ] T7.6.1.2: Create PR from develop to main for F9
- [ ] T7.6.1.3: Run full test suite verify coverage >= 80%
- [ ] T7.6.1.4: Merge PR squash and delete branch
- [ ] T7.6.1.5: Tag release v0.9.0-email and push tag
- [ ] T7.6.1.6: Deploy to local staging and smoke test
- [ ] T7.6.1.7: Monitor 24 hours update logs notify team
- [ ] T7.6.1.8: Mark F9 complete

## PHASE 8: FRONTEND COMPLETION (Weeks 11-12)


## FEATURE F8: FRONTEND COMPLETION AND ADMIN UI


### F8 Stage 8.1: Feature Implementation

- [ ] T8.1.1.1: Create frontend/src/app/(marketing)/about/page.tsx
- [ ] T8.1.1.2: Create frontend/src/app/(marketing)/layout.tsx marketing layout with nav
- [ ] T8.1.1.3: Implement landing page with value prop CTA and social proof
- [ ] T8.1.1.4: Implement how-it-works page with 3-step process
- [ ] T8.1.1.5: Implement FAQ page with 20+ common questions
- [ ] T8.1.1.6: Implement terms of service page with legal disclaimers
- [ ] T8.1.1.7: Implement privacy policy page
- [ ] T8.1.1.8: Implement disclaimer page
- [ ] T8.1.1.9: Create frontend/src/app/(dashboard)/dashboard/page.tsx user dashboard
- [ ] T8.1.1.10: Create frontend/src/app/(dashboard)/profile/page.tsx user profile settings
- [ ] T8.1.1.11: Implement dispute list page with TanStack Query
- [ ] T8.1.1.12: Implement dispute detail page with state badge
- [ ] T8.1.1.13: Add loading skeletons for all data-fetching pages
- [ ] T8.1.1.14: Add error boundaries for all route segments
- [ ] T8.1.1.15: Add React Query devtools in development mode
- [ ] T8.1.1.16: Implement session expiry handling with redirect to login
- [ ] T8.1.1.17: Add auto-save draft for brief preparation form
- [ ] T8.1.1.18: Add word count indicator on brief form with 5000 hard cap
- [ ] T8.1.1.19: Add content moderation warning before brief submit
- [ ] T8.1.1.20: Implement payment retry flow with Stripe
- [ ] T8.1.1.21: Add opinion export to PDF from frontend
- [ ] T8.1.1.22: Implement responsive layout for mobile below 768px
- [ ] T8.1.1.23: Implement responsive layout for tablet 768px-1024px
- [ ] T8.1.1.24: Add touch-optimized UI interactions for mobile
- [ ] T8.1.1.25: Add skip navigation link for accessibility
- [ ] T8.1.1.26: Add ARIA landmarks to all pages
- [ ] T8.1.1.27: Add alt text to all images
- [ ] T8.1.1.28: Add focus indicators to all focusable elements
- [ ] T8.1.1.29: Add colorblind-friendly palette throughout UI

### F8 Stage 8.2: Comprehensive Testing

- [ ] T8.2.1.1: Test landing page renders value prop correctly
- [ ] T8.2.1.2: Test CTA button navigates to registration
- [ ] T8.2.1.3: Test dashboard loads with user disputes
- [ ] T8.2.1.4: Test dashboard navigation links work
- [ ] T8.2.1.5: Test complete brief flow: draft save submit
- [ ] T8.2.1.6: Test word count enforcement on brief form
- [ ] T8.2.1.7: Test brief becomes immutable after submit
- [ ] T8.2.1.8: Test responsive layout on mobile viewport 375px
- [ ] T8.2.1.9: Test responsive layout on tablet viewport 768px
- [ ] T8.2.1.10: Test touch interactions on mobile
- [ ] T8.2.1.11: Test all pages keyboard navigable
- [ ] T8.2.1.12: Test skip navigation link present and functional
- [ ] T8.2.1.13: Test ARIA landmarks present on all pages
- [ ] T8.2.1.14: Run Playwright across Chrome Firefox and Safari
- [ ] T8.2.1.15: Run axe-core accessibility scan on all pages
- [ ] T8.2.1.16: Test with NVDA screen reader
- [ ] T8.2.1.17: Test with VoiceOver screen reader
- [ ] T8.2.1.18: Fix any accessibility violations
- [ ] T8.2.1.19: Document frontend test results

### F8 Stage 8.3: Optimization

- [ ] T8.3.1.1: Profile initial JS bundle size target <200KB
- [ ] T8.3.1.2: Add code splitting with dynamic imports for heavy components
- [ ] T8.3.1.3: Optimize images with Next.js Image component WebP/AVIF
- [ ] T8.3.1.4: Add caching with stale-while-revalidate for API responses
- [ ] T8.3.1.5: Add CDN for static assets via Vercel Edge or equivalent
- [ ] T8.3.1.6: Frontend implement optimistic updates for all mutations
- [ ] T8.3.1.7: Frontend add React Query cache invalidation after mutations
- [ ] T8.3.1.8: Monitor frontend Core Web Vitals: LCP FID CLS
- [ ] T8.3.1.9: Document frontend performance benchmarks

### F8 Stage 8.4: Beta Phase

- [ ] T8.4.1.1: Deploy completed frontend to local staging
- [ ] T8.4.1.2: Test complete user flow with 5 beta users
- [ ] T8.4.1.3: Collect feedback on UX and UI
- [ ] T8.4.1.4: Monitor frontend error rates in staging
- [ ] T8.4.1.5: Fix critical bugs
- [ ] T8.4.1.6: Verify WCAG 2.1 AA compliance across all pages
- [ ] T8.4.1.7: Document beta feedback
- [ ] T8.4.1.8: Mark F8 beta phase complete

### F8 Stage 8.5: Pull Request Creation

- [ ] T8.5.1.1: Create feature branch feat/8/frontend-completion
- [ ] T8.5.1.2: Stage frontend pages components and assets
- [ ] T8.5.1.3: Stage responsive and accessibility improvements
- [ ] T8.5.1.4: Stage test files E2E
- [ ] T8.5.1.5: Run checks verify CI and coverage >= 80%
- [ ] T8.5.1.6: Write PR description and ownership table
- [ ] T8.5.1.7: Request reviews from Frontend_Developer Section_508_Specialist
- [ ] T8.5.1.8: Address comments squash merge to develop
- [ ] T8.5.1.9: Delete feature branch

### F8 Stage 8.6: Merging to Main Execution

- [ ] T8.6.1.1: Verify F8 complete on develop
- [ ] T8.6.1.2: Create PR from develop to main for F8
- [ ] T8.6.1.3: Run full test suite verify coverage >= 80%
- [ ] T8.6.1.4: Merge PR squash and delete branch
- [ ] T8.6.1.5: Tag release v0.8.0-frontend and push tag
- [ ] T8.6.1.6: Deploy to local staging and smoke test
- [ ] T8.6.1.7: Monitor 24 hours update logs notify team
- [ ] T8.6.1.8: Mark F8 complete

## PHASE 9: HARDENING (Weeks 13-14)


### Part 9.1: Security Hardening

- [ ] T9.1.1.1: Implement application-layer encryption for brief content AES-256-GCM
- [ ] T9.1.1.2: Encrypt all brief content before storing in database
- [ ] T9.1.1.3: Decrypt brief content only during evaluation dispatch
- [ ] T9.1.1.4: Implement rate limiting middleware on all public endpoints
- [ ] T9.1.1.5: Integrate Sentry for error tracking in backend and frontend
- [ ] T9.1.1.6: Configure Sentry DSN in backend/.env.example
- [ ] T9.1.1.7: Configure Sentry DSN in frontend/.env.example
- [ ] T9.1.1.8: Add cost monitoring dashboard for LLM spend
- [ ] T9.1.1.9: Add GitHub Actions CI pipeline
- [ ] T9.1.1.10: Configure CI to run lint typecheck test:unit test:integration on every push
- [ ] T9.1.1.11: Add security scanning to CI with pnpm audit
- [ ] T9.1.1.12: Add secret scanning to CI with truffleHog or gitleaks
- [ ] T9.1.1.13: Add Brakeman or Semgrep for security linting if applicable
- [ ] T9.1.1.14: Run penetration test against local staging
- [ ] T9.1.1.15: Fix all critical and high severity findings
- [ ] T9.1.1.16: Document security hardening measures in plan.md

### Part 9.2: Monitoring and Alerting

- [ ] T9.2.1.1: Configure application metrics: request rate error rate p95 latency
- [ ] T9.2.1.2: Configure business metrics: disputes/day payment success rate
- [ ] T9.2.1.3: Configure LLM metrics: cost/dispute evaluator success rate
- [ ] T9.2.1.4: Set up alerts in Sentry: error rate >1% notifies PagerDuty
- [ ] T9.2.1.5: Set up alerts: evaluation failure rate >5% notifies Slack
- [ ] T9.2.1.6: Set up alerts: cost per dispute >$15 notifies Slack
- [ ] T9.2.1.7: Set up alerts: payment success rate <95% notifies Slack
- [ ] T9.2.1.8: Set up alerts: DB connection pool >80% notifies Slack
- [ ] T9.2.1.9: Create Grafana dashboard for system health
- [ ] T9.2.1.10: Create custom dashboard for business and LLM metrics
- [ ] T9.2.1.11: Document alert escalation procedures

### Part 9.3: Terraform and Production Infrastructure

- [ ] T9.3.1.1: Create infra/terraform/main.tf with provider configuration
- [ ] T9.3.1.2: Create infra/terraform/variables.tf
- [ ] T9.3.1.3: Create infra/terraform/outputs.tf
- [ ] T9.3.1.4: Create infra/terraform/postgres.tf for RDS or local PostgreSQL
- [ ] T9.3.1.5: Create infra/terraform/redis.tf for ElastiCache or local Redis
- [ ] T9.3.1.6: Create infra/terraform/s3.tf for opinion PDF storage
- [ ] T9.3.1.7: Create infra/terraform/ses.tf for email sending
- [ ] T9.3.1.8: Create infra/terraform/security-groups.tf
- [ ] T9.3.1.9: Create infra/terraform/iam.tf for service roles
- [ ] T9.3.1.10: Run terraform init and terraform plan
- [ ] T9.3.1.11: Review terraform plan for security and cost
- [ ] T9.3.1.12: Run terraform apply to provision staging infrastructure
- [ ] T9.3.1.13: Document terraform usage in plan.md

### Part 9.4: CI/CD Hardening

- [ ] T9.4.1.1: Add CI job for dependency vulnerability scanning
- [ ] T9.4.1.2: Add CI job for SAST with Semgrep or SonarQube
- [ ] T9.4.1.3: Add CI job for license compliance check
- [ ] T9.4.1.4: Add CI job for E2E tests with Playwright
- [ ] T9.4.1.5: Configure CI to block merge on test failure
- [ ] T9.4.1.6: Configure CI to block merge on security findings
- [ ] T9.4.1.7: Add deployment workflow for staging on push to develop
- [ ] T9.4.1.8: Add manual approval gate for production deployment
- [ ] T9.4.1.9: Document CI/CD pipeline in plan.md

### Part 9.5: Beta Phase

- [ ] T9.5.1.1: Deploy hardened system to local staging
- [ ] T9.5.1.2: Run full penetration test
- [ ] T9.5.1.3: Fix all security findings
- [ ] T9.5.1.4: Monitor system for 1 week in staging
- [ ] T9.5.1.5: Collect performance and security metrics
- [ ] T9.5.1.6: Document beta feedback
- [ ] T9.5.1.7: Mark Phase 9 beta phase complete

### Part 9.6: Pull Request Creation

- [ ] T9.6.1.1: Create feature branch feat/9/hardening-security
- [ ] T9.6.1.2: Stage security, monitoring, terraform, CI changes
- [ ] T9.6.1.3: Stage test files
- [ ] T9.6.1.4: Run checks verify CI and coverage >= 80%
- [ ] T9.6.1.5: Write PR description and ownership table
- [ ] T9.6.1.6: Request reviews from AppSec_Engineer SRE Cloud_Security_Architect
- [ ] T9.6.1.7: Address comments squash merge to develop
- [ ] T9.6.1.8: Delete feature branch

### Part 9.7: Merging to Main Execution

- [ ] T9.7.1.1: Verify Phase 9 complete on develop
- [ ] T9.7.1.2: Create PR from develop to main for hardening
- [ ] T9.7.1.3: Get security sign-off from AppSec and Cloud Security
- [ ] T9.7.1.4: Run full test suite verify coverage >= 80%
- [ ] T9.7.1.5: Merge PR squash and delete branch
- [ ] T9.7.1.6: Tag release v0.9.0-hardening and push tag
- [ ] T9.7.1.7: Deploy to local staging and smoke test
- [ ] T9.7.1.8: Monitor 24 hours update logs notify team
- [ ] T9.7.1.9: Mark Phase 9 complete

## PHASE 10: BETA PREPARATION (Week 15+)


### Part 10.1: Beta Feature Implementation

- [ ] T10.1.1.1: Implement two-party invitation system via email and shareable link
- [ ] T10.1.1.2: Implement counterparty account creation or guest access flow
- [ ] T10.1.1.3: Extend state machine for two-party: awaiting_counterparty, in_progress, awaiting_briefs, awaiting_counterparty_brief
- [ ] T10.1.1.4: Implement both-submit gate: evaluation triggers only when both briefs submitted
- [ ] T10.1.1.5: Briefs hidden until both submitted at DB app and encryption layers
- [ ] T10.1.1.6: Implement invitation expiry after 7 days
- [ ] T10.1.1.7: Implement AI-assisted brief preparation with WebSocket chat
- [ ] T10.1.1.8: Implement LLM-guided 5-section brief template
- [ ] T10.1.1.9: Implement real-time suggestions during brief writing
- [ ] T10.1.1.10: Implement 5-model evaluation: Claude GPT-4 Gemini OpenRouter NVIDIA NIM
- [ ] T10.1.1.11: Implement automated aggregation engine post-evaluation
- [ ] T10.1.1.12: Implement document upload and OCR for PDF DOCX JPG PNG HEIC
- [ ] T10.1.1.13: Implement max 25MB per file 5 files per brief limits
- [ ] T10.1.1.14: Integrate OCR via Textract or Google Cloud Vision
- [ ] T10.1.1.15: Add all 3 dispute categories: contract_interpretation small_claims_assessment partnership_conflict
- [ ] T10.1.1.16: Implement pricing tiers: Standard $99 Expedited $199 Extended $299 Re-analysis $49
- [ ] T10.1.1.17: Update frontend for mobile-responsive layout
- [ ] T10.1.1.18: Add touch-optimized UI for mobile and tablet
- [ ] T10.1.1.19: Update OpenAPI spec with v2 endpoints for breaking changes
- [ ] T10.1.1.20: Maintain v1 API for 12-month deprecation period

### Part 10.2: Beta Testing

- [ ] T10.2.1.1: Test two-party invitation flow end-to-end
- [ ] T10.2.1.2: Test counterparty registration and brief preparation
- [ ] T10.2.1.3: Test both-submit gate blocks evaluation until both briefs ready
- [ ] T10.2.1.4: Test AI-assisted brief prep with WebSocket chat
- [ ] T10.2.1.5: Test 5-model evaluation with mock providers
- [ ] T10.2.1.6: Test automated aggregation engine outputs
- [ ] T10.2.1.7: Test document upload and OCR extraction
- [ ] T10.2.1.8: Test all 3 dispute categories create correctly
- [ ] T10.2.1.9: Test pricing tiers applied correctly
- [ ] T10.2.1.10: Test mobile-responsive layout on iOS and Android
- [ ] T10.2.1.11: Run E2E tests for complete two-party flow
- [ ] T10.2.1.12: Run E2E tests for AI brief prep flow
- [ ] T10.2.1.13: Run E2E tests for document upload flow
- [ ] T10.2.1.14: Run E2E tests for pricing tier selection
- [ ] T10.2.1.15: Monitor beta user satisfaction target >80%
- [ ] T10.2.1.16: Fix all critical and high priority bugs
- [ ] T10.2.1.17: Document beta testing results

### Part 10.3: Beta Optimization

- [ ] T10.3.1.1: Profile two-party state machine performance
- [ ] T10.3.1.2: Optimize document upload and OCR processing
- [ ] T10.3.1.3: Cache OCR results for identical documents
- [ ] T10.3.1.4: Monitor AI brief prep latency
- [ ] T10.3.1.5: Monitor 5-model evaluation cost per dispute
- [ ] T10.3.1.6: Frontend optimize mobile touch interactions
- [ ] T10.3.1.7: Frontend reduce bundle size for mobile networks
- [ ] T10.3.1.8: Document beta performance benchmarks

### Part 10.4: Beta Launch

- [ ] T10.4.1.1: Deploy beta to production-like staging environment
- [ ] T10.4.1.2: Onboard first 20 beta users from Phase 0 research
- [ ] T10.4.1.3: Monitor beta metrics: 100 paid analyses/month target
- [ ] T10.4.1.4: Monitor user satisfaction target >80%
- [ ] T10.4.1.5: Monitor complaint rate target <2%
- [ ] T10.4.1.6: Collect user feedback weekly
- [ ] T10.4.1.7: Fix bugs within 48 hour SLA
- [ ] T10.4.1.8: Document beta launch results
- [ ] T10.4.1.9: Decision gate: 25 paid analyses AND 70%+ satisfaction -> commit to Phase 2

### Part 10.5: Beta PR and Merge

- [ ] T10.5.1.1: Create feature branch feat/beta-v1.0
- [ ] T10.5.1.2: Stage all beta feature code
- [ ] T10.5.1.3: Stage beta test files
- [ ] T10.5.1.4: Run full CI pipeline
- [ ] T10.5.1.5: Write PR description with beta changelog
- [ ] T10.5.1.6: Get legal sign-off on beta features
- [ ] T10.5.1.7: Request reviews from all division leads
- [ ] T10.5.1.8: Address comments squash merge
- [ ] T10.5.1.9: Tag release beta-v1.0 and push
- [ ] T10.5.1.10: Deploy beta to production
- [ ] T10.5.1.11: Monitor for 24 hours
- [ ] T10.5.1.12: Document beta launch in plan.md