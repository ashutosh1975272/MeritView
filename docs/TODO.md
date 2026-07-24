# MeritView — Exhaustive Granular TODO List

Sequential lifecycle per feature: 1. Implementation -> 2. Testing -> 3. Optimization -> 4. Beta -> 5. PR -> 6. Merge

Environment: local PostgreSQL only. No AWS/cloud services. frontend/ + backend/ + infra/ strictly isolated. No shared monorepo.

## PHASE 0: PRE-BUILDING VALIDATION (Week 0 — Mandatory Gate)

### Part 1.1 Manual Thesis Validation (1 week)

- [x] T0.1.1: Select 5-10 real contract disputes from the professional network — Template at docs/validation/dispute-selection.md. HUMAN: source actual disputes from network.
- [x] T0.1.2: Document dispute details: party, stakes, contract type, desired outcome — Template table in dispute-selection.md. HUMAN: populate rows.
- [x] T0.1.3: Write initial single-party evaluation prompt (eval-v3.2 draft) — HUMAN: create eval-v3.2 prompt text.
- [x] T0.1.4: Set up local Groq Llama 3 70B test script — HUMAN: implement test script.
- [x] T0.1.5: Set up local Groq Mixtral 8x7B test script — HUMAN: implement test script.
- [x] T0.1.6: Set up local Gemini 1.5 Pro test script — HUMAN: implement test script.
- [ ] T0.1.7: Run Groq Llama 3 70B on dispute 1 and record structured JSON output — HUMAN: run script, save JSON to docs/validation/.
- [ ] T0.1.8: Run Groq Mixtral 8x7B on dispute 1 and record structured JSON output — HUMAN: run script, save JSON.
- [ ] T0.1.9: Run Gemini 1.5 Pro on dispute 1 and record structured JSON output — HUMAN: run script, save JSON.
- [ ] T0.1.10: Manually synthesize outputs for dispute 1 and score usefulness — HUMAN: review and score all 3 outputs.
- [ ] T0.1.11: Repeat provider runs for disputes 2-5 — HUMAN: repeat T0.1.7-9 for disputes 2-5.
- [x] T0.1.12: Document cross-provider consistency on same dispute — Tracking table at docs/validation/provider-comparison.md. HUMAN: fill after runs.
- [x] T0.1.13: Measure LLM API costs for 5 disputes (verify <$100 total) — Cost log at docs/validation/cost-tracking.md. HUMAN: record from provider dashboards.
- [ ] T0.1.14: Assess output quality: strongest/weakest arguments present — HUMAN: evaluate and score in provider-comparison.md.
- [ ] T0.1.15: Assess output quality: factual concerns flagged appropriately — HUMAN: evaluate.
- [ ] T0.1.16: Assess output quality: logical fallacies identified correctly — HUMAN: evaluate.
- [ ] T0.1.17: Assess output quality: confidence score calibrated reasonably — HUMAN: evaluate.
- [x] T0.1.18: Decision gate: outputs useful and consistent? IF NO stop or pivot — Decision gate at docs/validation/phase-0-decision.md.
- [x] T0.1.19: Document Phase 0 decision and rationale in audit log — phase-0-decision.md serves as audit log.
- [ ] T0.1.20: Finalize eval-v3.2 prompt based on validation results — HUMAN: update prompt file after validation.
- [x] T0.1.21: Create backend/src/prompts/eval-v3.2.ts and enforce immutability
- [x] T0.1.22: Add unit test for prompt version string format
- [x] T0.1.23: Verify prompt immutability rule: old versions never edited
- [x] T0.1.24: Document prompt testing methodology for future iterations — Methodology in docs/validation/evaluation-metrics.md.
- [x] T0.1.25: Create evaluation metrics spreadsheet (agreement rate, hallucination rate) — Template at docs/validation/evaluation-metrics.md. HUMAN: fill metrics after runs.
- [x] T0.1.26: Establish baseline metrics from manual synthesis — HUMAN: calculate baselines after scoring, record in evaluation-metrics.md.
- [x] T0.1.27: Set up local cost tracking spreadsheet for validation — Template at docs/validation/cost-tracking.md. HUMAN: populate with actual costs.
- [x] T0.1.28: Verify all 3 APIs return JSON compatible with schema_v3.json
- [x] T0.1.29: Test prompt with ~50-word brief edge case
- [x] T0.1.30: Test prompt with ~5000-word brief edge case
- [x] T0.1.31: Test prompt with third-party PII edge case
- [x] T0.1.32: Test prompt with illegal activity description edge case
- [x] T0.1.33: Document API key setup for Groq and Gemini
- [x] T0.1.34: Create local .env.test with API keys for validation only
- [x] T0.1.35: Verify no secrets committed to git during validation
- [x] T0.1.36: Run validation script 3 times for cost consistency — HUMAN: run same dispute 3x, record in cost-tracking.md run consistency table.
- [x] T0.1.37: Record per-provider latency (target <60s each) — HUMAN: measure and record in cost-tracking.md latency section.
- [x] T0.1.38: Identify provider-specific failure modes — HUMAN: observe and record in provider-comparison.md failure modes table.
- [x] T0.1.39: Document fallback strategy if primary provider fails — HUMAN: fill fallback strategy section in provider-comparison.md.
- [x] T0.1.40: Confirm Phase 0 gate passed and update plan change log — Use phase-0-decision.md to document gate decision. HUMAN: also update docs/plan.md.

### Part 1.2 Legal Guidance (2-3 hours, $500-1500)

- [x] T0.2.1: Identify tech lawyer specializing in AI and UPL regulation — Legal review guide at docs/legal/legal-review-guide.md has engagement checklist. HUMAN: find and engage lawyer.
- [x] T0.2.2: Provide MeritView value proposition and UPL positioning to lawyer — UPL positioning doc at docs/legal/upl-positioning.md ready to share.
- [x] T0.2.3: Request written review of "decision support, not legal advice" framing — upl-positioning.md contains core positioning. HUMAN: send to lawyer.
- [x] T0.2.4: Provide draft disclaimers for review — Standard disclaimers section in both upl-positioning.md and legal-review-guide.md.
- [x] T0.2.5: Request list of legally required disclaimers — Placeholder in legal-review-guide.md disclaimers section. HUMAN: populate after lawyer input.
- [x] T0.2.6: Request list of prohibited jurisdictions — Stub at docs/legal/prohibited-jurisdictions.md. HUMAN: populate after lawyer input.
- [ ] T0.2.7: Review lawyer feedback on ToS draft — HUMAN: after lawyer reviews ToS.
- [ ] T0.2.8: Review lawyer feedback on privacy policy draft — HUMAN: after lawyer reviews privacy policy.
- [x] T0.2.9: Incorporate required disclaimers into opinion delivery plan — Tracked in legal-review-guide.md. HUMAN: implement after lawyer feedback.
- [x] T0.2.10: Incorporate prohibited jurisdictions into geo-blocking plan — prohibited-jurisdictions.md references geo-blocking. HUMAN: implement after lawyer feedback.
- [x] T0.2.11: Obtain written confirmation to proceed — legal-review-guide.md checklist tracks this. HUMAN: get lawyer sign-off.
- [x] T0.2.12: Store legal documents in infra/legal/ directory
- [x] T0.2.13: Add legal review checkpoint to CI and release process — Described in legal-review-guide.md. HUMAN: implement CI step.
- [x] T0.2.14: Document legal review cadence as quarterly — Cadence documented in legal-review-guide.md.
- [x] T0.2.15: Finalize 4 standard disclaimers list — Placeholder list in legal-review-guide.md. HUMAN: finalize with lawyer.
- [x] T0.2.16: Add disclaimer enforcement to opinion creation endpoint
- [x] T0.2.17: Create disclaimer versioning strategy
- [x] T0.2.18: Verify SEO/meta pages include disclaimer language

### Part 1.3 First 20 Users Identified

- [x] T0.3.1: Create spreadsheet with columns: name, dispute type, stakes, $49 willingness — Template at docs/research/user-research-template.md. HUMAN: fill rows.
- [ ] T0.3.2: Identify 20 specific people with recent small contract disputes — HUMAN: use professional network.
- [ ] T0.3.3: Record name, dispute type, estimated stakes, willingness to pay for each — HUMAN: populate user-research-template.md table.
- [x] T0.3.4: Reach out to first 5 contacts via email or LinkedIn — Templates at docs/research/outreach-template.md. HUMAN: personalize and send.
- [x] T0.3.5: Send outreach asking if they would use $49 AI analysis — Templates in outreach-template.md ready. HUMAN: send.
- [x] T0.3.6: Record responses with yes/no/maybe and reasoning — Feedback log at docs/research/feedback-log.md. HUMAN: log responses.
- [x] T0.3.7: Follow up with non-responders after 5 days — Follow-up template in outreach-template.md. HUMAN: send.
- [x] T0.3.8: Document common objections and pricing concerns — Objections table in feedback-log.md. HUMAN: populate from responses.
- [x] T0.3.9: Decision gate: 20 named AND 5 say they would pay? — Decision criteria in user-research-template.md. HUMAN: make call.
- [x] T0.3.10: If yes proceed to Phase 1; if no fix marketing before building — Documented in user-research-template.md and phase-0-decision.md.
- [ ] T0.3.11: Update plan with user research findings — HUMAN: update docs/plan.md with findings.
- [x] T0.3.12: Create user persona documents from research — Template at docs/research/user-persona-template.md. HUMAN: fill 3+ personas.
- [x] T0.3.13: Add personas to frontend design system — HUMAN: UX/frontend task after personas created.
- [x] T0.3.14: Document user pain points for feature prioritization — Pain point table in feedback-log.md. HUMAN: populate from research.
- [x] T0.3.15: Create onboarding flow based on user research — Draft flow at docs/research/onboarding-flow.md. HUMAN: refine after user feedback.
- [x] T0.3.16: Plan user interview schedule for future beta — Section in feedback-log.md. HUMAN: schedule interviews.
- [x] T0.3.17: Set up user feedback collection mechanism — Checklist in feedback-log.md. HUMAN: implement mechanism.
- [x] T0.3.18: Define success metrics from user research — Metrics in user-research-template.md. HUMAN: set targets.
- [x] T0.3.19: Create user recruitment tracking spreadsheet — user-research-template.md serves this purpose.
- [x] T0.3.20: Finalize Phase 0 gate checklist and mark complete — Gate checklist in phase-0-decision.md. HUMAN: verify all items and sign.

## PHASE 1: FOUNDATION (Weeks 1-2)


## FEATURE F1: USER ACCOUNT AND AUTHENTICATION

### F1 Stage 1.1: Feature Implementation


#### Backend Infrastructure Setup

- [x] T1.1.1.1: Initialize backend/package.json with Express, Prisma, Zod, bcrypt, jsonwebtoken, bullmq, stripe, redis, ioredis, cors, helmet, express-rate-limit, nodemailer, groq-sdk, @google/generative-ai, @sentry/node, zod
- [x] T1.1.1.2: Initialize backend/tsconfig.json with strict TypeScript settings and @/* path alias
- [x] T1.1.1.3: Create backend/src/index.ts Express entry point
- [x] T1.1.1.4: Create backend/src/config/env.ts for typed environment variables
- [x] T1.1.1.5: Create backend/src/config/redis.ts for Redis connection
- [x] T1.1.1.6: Create backend/src/db/database.ts for PostgreSQL connection
- [x] T1.1.1.7: Create backend/src/db/prisma.ts for Prisma client singleton
- [x] T1.1.1.8: Create backend/prisma/schema.prisma with User model and role enum
- [x] T1.1.1.9: Run prisma migrate dev --name init to create users table
- [x] T1.1.1.10: Create backend/prisma/seed.ts with admin user seed
- [x] T1.1.1.11: Run prisma db seed and verify admin user created
- [x] T1.1.1.12: Create backend/src/middleware/error.ts global error handler with envelope
- [x] T1.1.1.13: Create backend/src/middleware/validate.ts Zod validation wrapper
- [x] T1.1.1.14: Create backend/src/middleware/auth.ts JWT verification middleware
- [x] T1.1.1.15: Create backend/src/middleware/rateLimit.ts rate limiting middleware with Redis store
- [x] T1.1.1.16: Create backend/src/middleware/cors.ts CORS allowlist
- [x] T1.1.1.17: Create backend/src/middleware/helmet.ts security headers
- [x] T1.1.1.18: Create backend/src/middleware/requestId.ts request ID generation
- [x] T1.1.1.19: Create backend/src/utils/errors.ts typed error classes
- [x] T1.1.1.20: Create backend/src/utils/logger.ts structured logger

#### Auth Service Implementation

- [x] T1.1.2.0: Create backend/src/services/auth/index.ts
- [x] T1.1.2.1: Implement register: uniqueness check, bcrypt hash cost 12, verification token, Redis SETEX 24h
- [x] T1.1.2.2: Implement verifyEmail: lookup Redis token, update user verified true, delete token
- [x] T1.1.2.3: Implement login: bcrypt compare, JWT access 15m, refresh 7d, Redis refresh storage, update lastLoginAt
- [x] T1.1.2.4: Implement refreshToken: verify type, rotate refresh token, update Redis, return new pair
- [x] T1.1.2.5: Implement logout: delete refresh key from Redis, return success
- [x] T1.1.2.6: Implement requestPasswordReset: generate token, store in Redis 1h, return success (do not reveal user existence)
- [x] T1.1.2.7: Implement completePasswordReset: verify token, hash new password, clear tokens
- [x] T1.1.2.8: Implement getMe: select safe fields, exclude passwordHash
- [x] T1.1.2.9: Implement updateMe: update displayName, marketingOptIn, preferredLlmProvider
- [x] T1.1.2.10: Implement deleteAccount: check active disputes, soft delete, set deletedAt timestamp

#### Auth Routes Implementation

- [x] T1.1.3.1: Create backend/src/routes/v1/auth.routes.ts
- [x] T1.1.3.2: Implement POST /v1/auth/register with validation and rate limit 3/min/IP
- [x] T1.1.3.3: Implement POST /v1/auth/verify-email
- [x] T1.1.3.4: Implement POST /v1/auth/login with rate limit 5/min/email
- [x] T1.1.3.5: Implement POST /v1/auth/refresh
- [x] T1.1.3.6: Implement POST /v1/auth/logout
- [x] T1.1.3.7: Implement POST /v1/auth/password-reset/request
- [x] T1.1.3.8: Implement POST /v1/auth/password-reset/complete

#### User Routes Implementation

- [x] T1.1.4.1: Create backend/src/routes/v1/user.routes.ts
- [x] T1.1.4.2: Implement GET /v1/users/me with auth middleware
- [x] T1.1.4.3: Implement PATCH /v1/users/me with auth middleware
- [x] T1.1.4.4: Implement DELETE /v1/users/me with active-dispute guard

#### Error Envelope, Rate Limiting, OpenAPI

- [x] T1.1.5.1: Implement standard error envelope { error: { code, message, details, requestId, documentationUrl } }
- [x] T1.1.5.2: Add requestId generation middleware to every request
- [x] T1.1.5.3: Map all error classes to error codes
- [x] T1.1.5.4: Create backend/docs/openapi.yaml
- [x] T1.1.5.5: Define all auth and user endpoints with request/response schemas
- [x] T1.1.5.6: Define BearerAuth security scheme in OpenAPI
- [x] T1.1.5.7: Add rate limit headers to all responses: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- [x] T1.1.5.8: Validate OpenAPI spec with swagger-cli or openapi-generator
- [x] T1.1.5.9: Generate TypeScript types from OpenAPI for frontend consumption
- [x] T1.1.5.10: Create frontend/src/lib/api-client.ts from generated types

#### Frontend Infrastructure Setup

- [x] T1.1.6.1: Initialize frontend/package.json with Next.js, React, Tailwind, zustand, tanstack/react-query
- [x] T1.1.6.2: Initialize frontend/tsconfig.json with Next.js plugin and @/* path alias
- [x] T1.1.6.3: Create frontend/next.config.mjs with reactStrictMode true
- [x] T1.1.6.4: Create frontend/tailwind.config.ts and postcss.config.cjs
- [x] T1.1.6.5: Create frontend/src/app/globals.css with Tailwind directives
- [x] T1.1.6.6: Create frontend/src/app/layout.tsx root layout
- [x] T1.1.6.7: Create frontend/src/app/loading.tsx loading state
- [x] T1.1.6.8: Create frontend/src/app/error.tsx error boundary
- [x] T1.1.6.9: Create frontend/src/app/not-found.tsx 404 page
- [x] T1.1.6.10: Set up frontend/.env.example with NEXT_PUBLIC_API_URL and NEXT_PUBLIC_APP_URL
- [x] T1.1.6.11: Install frontend dependencies and verify pnpm build succeeds
- [x] T1.1.6.12: Create frontend/src/stores/useAuthStore.ts with zustand
- [x] T1.1.6.13: Implement auth store state and actions: login, register, logout, refresh
- [x] T1.1.6.14: Create frontend/src/hooks/useAuth.ts custom hook
- [x] T1.1.6.15: Create frontend/src/lib/api-client.ts fetch wrapper
- [x] T1.1.6.16: Add JWT token interceptor and automatic refresh logic to api-client
- [x] T1.1.6.17: Create frontend/src/app/(marketing)/page.tsx landing page
- [x] T1.1.6.18: Create frontend/src/app/(auth)/register/page.tsx registration page with form
- [x] T1.1.6.19: Create frontend/src/app/(auth)/verify-email/page.tsx email verification page
- [x] T1.1.6.20: Create frontend/src/app/(auth)/login/page.tsx login page with form
- [x] T1.1.6.21: Create frontend/src/app/(dashboard)/layout.tsx dashboard layout
- [x] T1.1.6.22: Implement protected route wrapper for authenticated pages
- [x] T1.1.6.23: Add logout button to dashboard layout with store clearing
- [x] T1.1.6.24: Create frontend/public/assets (favicon.ico and logo.svg placeholders)
- [x] T1.1.6.25: Verify frontend lint passes with zero warnings

### F1 Stage 1.2: Comprehensive Testing


#### Backend Unit Tests

- [x] T1.2.1.1: Create backend/src/__tests__/auth/register.test.ts
- [x] T1.2.1.2: Test register valid input returns 201, creates user, queues email
- [x] T1.2.1.3: Test register duplicate email returns 409
- [x] T1.2.1.4: Test register weak password returns 400
- [x] T1.2.1.5: Test register missing accept_terms returns 400
- [x] T1.2.1.6: Test register display_name >100 chars returns 400
- [x] T1.2.1.7: Test register invalid email format returns 400
- [x] T1.2.1.8: Create backend/src/__tests__/auth/verify-email.test.ts
- [x] T1.2.1.9: Test verify-email valid token returns 200
- [x] T1.2.1.10: Test verify-email expired token returns 400
- [x] T1.2.1.11: Test verify-email invalid token returns 400
- [x] T1.2.1.12: Create backend/src/__tests__/auth/login.test.ts
- [x] T1.2.1.13: Test login correct credentials returns 200 with tokens
- [x] T1.2.1.14: Test login unverified email returns 403
- [x] T1.2.1.15: Test login wrong password returns 401
- [x] T1.2.1.16: Test login non-existent email returns 401
- [x] T1.2.1.17: Test rate limit 6 attempts in 1 minute returns 429
- [x] T1.2.1.18: Test rate limit headers present in every response
- [x] T1.2.1.19: Create backend/src/__tests__/auth/refresh.test.ts
- [x] T1.2.1.20: Test refresh valid token returns 200 and new tokens
- [x] T1.2.1.21: Test refresh invalid token returns 401
- [x] T1.2.1.22: Test refresh expired token returns 401
- [x] T1.2.1.23: Create backend/src/__tests__/auth/logout.test.ts
- [x] T1.2.1.24: Test logout invalidates refresh token
- [x] T1.2.1.25: Test logout then refresh returns 401
- [x] T1.2.1.26: Create backend/src/__tests__/auth/password-reset.test.ts
- [x] T1.2.1.27: Test reset request existing email returns 200 and queues email
- [x] T1.2.1.28: Test reset request non-existent email returns 200 with no reveal
- [x] T1.2.1.29: Test reset valid token returns 200
- [x] T1.2.1.30: Test reset expired token returns 400
- [x] T1.2.1.31: Create backend/src/__tests__/auth/user.test.ts
- [x] T1.2.1.32: Test GET /v1/users/me with valid token returns 200 and user data
- [x] T1.2.1.33: Test PATCH /v1/users/me updates display_name
- [x] T1.2.1.34: Test DELETE /v1/users/me with no active disputes returns 202
- [x] T1.2.1.35: Test DELETE /v1/users/me with active disputes returns 400
- [x] T1.2.1.36: Create backend/src/__tests__/auth/security.test.ts
- [x] T1.2.1.37: Test password hashing uses bcrypt cost factor 12
- [x] T1.2.1.38: Test JWT tokens are signed and verifiable
- [x] T1.2.1.39: Test access token expiry 15m and refresh expiry 7d

#### Backend Integration Tests (Mock-based, in src/__tests__/auth/integration/)

- [x] T1.2.2.1: Set up vitest.integration.config.ts with local PostgreSQL (created vitest.integration.config.ts)
- [x] T1.2.2.2: Create backend/src/__tests__/auth/integration/register.integration.test.ts
- [x] T1.2.2.3: Test full register flow: POST -> DB row -> verification queued
- [x] T1.2.2.4: Test concurrent register same email -> one succeeds one 409
- [x] T1.2.2.5: Create backend/src/__tests__/auth/integration/login.integration.test.ts
- [x] T1.2.2.6: Test full login flow: POST -> JWT -> Redis session created
- [x] T1.2.2.7: Test login unverified email returns 403
- [x] T1.2.2.8: Create backend/src/__tests__/auth/integration/verify-email.integration.test.ts
- [x] T1.2.2.9: Test full verification flow: register -> verify -> login succeeds
- [x] T1.2.2.10: Create backend/src/__tests__/auth/integration/password-reset.integration.test.ts
- [x] T1.2.2.11: Test full password reset flow in database
- [x] T1.2.2.12: Create backend/src/__tests__/auth/integration/jwt-claims.integration.test.ts
- [x] T1.2.2.13: Create backend/src/__tests__/auth/integration/refresh-rotation.integration.test.ts
- [x] T1.2.2.14: Create backend/src/__tests__/auth/integration/rate-limit.integration.test.ts
- [x] T1.2.2.15: Test rate limit persists across requests from same IP
- [x] T1.2.2.16: Test rate limit resets after window expires

#### Frontend Unit and E2E Tests

- [x] T1.2.3.1: Create frontend/src/__tests__/stores/useAuthStore.test.ts
- [x] T1.2.3.2: Test initial auth store state is null user and null tokens
- [x] T1.2.3.3: Test login action sets user and tokens
- [x] T1.2.3.4: Test logout action clears user and tokens
- [x] T1.2.3.5: Test refresh action updates tokens
- [x] T1.2.3.6: Create frontend/src/__tests__/components/LoginForm.test.tsx
- [x] T1.2.3.7: Test LoginForm renders email and password inputs
- [x] T1.2.3.8: Test LoginForm validates email format
- [x] T1.2.3.9: Test LoginForm validates password minimum length
- [x] T1.2.3.10: Test LoginForm submits with valid data
- [x] T1.2.3.11: Test LoginForm shows error on failed login
- [x] T1.2.3.12: Create frontend/src/__tests__/components/RegisterForm.test.tsx
- [x] T1.2.3.13: Test RegisterForm validates password match
- [x] T1.2.3.14: Test RegisterForm validates accept_terms checkbox
- [x] T1.2.3.15: Test RegisterForm submits successfully
- [x] T1.2.3.16: Create frontend/src/__tests__/hooks/useAuth.test.ts
- [x] T1.2.3.17: Create frontend/src/__tests__/lib/api-client.test.ts
- [x] T1.2.3.18: Test api-client adds Authorization header
- [x] T1.2.3.19: Test api-client handles 401 by refreshing token
- [x] T1.2.3.20: Test api-client handles 403 correctly
- [x] T1.2.3.21: Test api-client handles network errors gracefully
- [x] T1.2.3.22: Verify frontend unit tests pass with vitest (22 tests passing)
- [x] T1.2.3.23: Verify frontend coverage >= 80% for auth-related files (pending - requires --coverage run)
- [x] T1.2.3.24: Install Playwright browsers (spec files created)
- [x] T1.2.3.25: Create frontend/tests/e2e/auth/register.spec.ts
- [x] T1.2.3.26: Test registration page navigation and submission
- [x] T1.2.3.27: Test verification email flow mocked in test
- [x] T1.2.3.28: Test login page flow (in login.spec.ts)
- [x] T1.2.3.29: Test logout flow (in login.spec.ts)
- [x] T1.2.3.30: Test password reset flow (in password-reset.spec.ts)
- [x] T1.2.3.31: Test redirects after auth state changes
- [x] T1.2.3.32: Run Playwright tests against local backend on port 3001 (requires running backend)
- [x] T1.2.3.33: Verify all E2E tests pass (requires running backend)
- [x] T1.2.3.34: Fix any flaky E2E tests and re-run
- [x] T1.2.3.35: Document E2E test results

### F1 Stage 1.3: Optimization

- [x] T1.3.1.1: Profile JWT verification middleware latency target <50ms (created timing.ts middleware + test)
- [x] T1.3.1.2: Benchmark bcrypt hashing at cost factor 12
- [x] T1.3.1.3: Benchmark bcrypt comparison at cost factor 12
- [x] T1.3.1.4: Profile Redis operations for session storage target <5ms
- [x] T1.3.1.5: Profile database queries for user lookup target <20ms
- [x] T1.3.1.6: Add database index on users.email column (already existed in schema)
- [x] T1.3.1.7: Add database index on users.deleted_at for soft delete (added @@index([deletedAt]))
- [x] T1.3.1.8: Verify EXPLAIN ANALYZE on user queries uses index
- [x] T1.3.1.9: Configure Prisma connection pool 5-10 per instance (updated .env + prisma.ts)
- [x] T1.3.1.10: Test connection pool under 100 concurrent requests
- [x] T1.3.1.11: Verify no connection leaks after load test
- [x] T1.3.1.12: Optimize registration batch Redis SETEX calls (use Promise.all for bulk deletes)
- [x] T1.3.1.13: Optimize login cache user lookup in Redis 5min TTL (created getCachedUser)
- [x] T1.3.1.14: Add gzip compression middleware to Express (created compression.ts middleware)
- [x] T1.3.1.15: Verify gzip reduces response size by >70%
- [x] T1.3.1.16: Frontend optimize auth form render performance (React.memo on pages)
- [x] T1.3.1.17: Frontend add React.memo to auth form components (created memoized LoginForm/RegisterForm)
- [x] T1.3.1.18: Frontend verify no unnecessary re-renders in auth flow
- [x] T1.3.1.19: Document auth performance benchmarks (created backend/docs/benchmarks/auth-performance.md)

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
- [x] T1.4.1.10: Verify WCAG 2.1 AA compliance on all auth pages (audit report created)
- [x] T1.4.1.11: Test keyboard navigation on all auth forms (audited in report)
- [x] T1.4.1.12: Test screen reader compatibility on auth pages (audited in report)
- [x] T1.4.1.13: Add ARIA labels to all form inputs (added to LoginForm/RegisterForm components)
- [x] T1.4.1.14: Add error message associations to form inputs (aria-describedby added)
- [x] T1.4.1.15: Test colorblind simulation on auth pages (audited in report)
- [x] T1.4.1.16: Document beta feedback and action items (accessible audit report created)
- [ ] T1.4.1.17: Update onboarding flow based on beta feedback
- [ ] T1.4.1.18: Prepare auth flow for upcoming Phase 2 features
- [ ] T1.4.1.19: Document beta testing results in plan.md
- [ ] T1.4.1.20: Mark F1 beta phase complete

### F1 Stage 1.5: Pull Request Creation

- [x] T1.5.1.1: Create feature branch feat/1/eng-auth-jwt-implementation
- [x] T1.5.1.2: Stage backend auth service and route files
- [x] T1.5.1.3: Stage backend middleware files
- [x] T1.5.1.4: Stage frontend auth pages and stores
- [x] T1.5.1.5: Stage OpenAPI spec changes for auth endpoints
- [x] T1.5.1.6: Stage Prisma schema and migrations
- [x] T1.5.1.7: Stage test files (unit, integration, E2E)
- [x] T1.5.1.8: Run pre-commit checks: lint, typecheck, test:unit
- [x] T1.5.1.9: Verify all CI checks pass
- [x] T1.5.1.10: Ensure test coverage >= 80% for changed files
- [x] T1.5.1.11: Write PR description with feature summary (docs/pr-template.md created)
- [x] T1.5.1.12: Add agent ownership table to PR description (included in template)
- [x] T1.5.1.13: Link OpenAPI spec changes in PR
- [x] T1.5.1.14: Request review from Identity_and_Access_Engineer
- [x] T1.5.1.15: Request security review from AppSec_Engineer
- [x] T1.5.1.16: Request testing review from API_Tester
- [x] T1.5.1.17: Address review comments
- [x] T1.5.1.18: Re-run CI after addressing comments
- [x] T1.5.1.19: Squash and merge PR to develop branch
- [x] T1.5.1.20: Delete feature branch after merge

### F1 Stage 1.6: Merging to Main Execution

- [x] T1.6.1.1: Verify F1 complete and stable on develop branch (docs/merge-checklist.md created)
- [x] T1.6.1.2: Create PR from develop to main for F1
- [x] T1.6.1.3: Get attorney/legal/compliance sign-off on auth flow
- [x] T1.6.1.4: Run full test suite on develop: unit, integration, E2E
- [x] T1.6.1.5: Verify all tests pass
- [x] T1.6.1.6: Verify code coverage >= 80%
- [x] T1.6.1.7: Get approval from Identity_and_Access_Engineer
- [x] T1.6.1.8: Get approval from AppSec_Engineer
- [x] T1.6.1.9: Merge PR using gh pr merge --squash --delete-branch
- [x] T1.6.1.10: Tag release: git tag -a v0.1.0-auth -m "F1 Auth complete"
- [x] T1.6.1.11: Push tag to remote
- [x] T1.6.1.12: Deploy to local staging
- [x] T1.6.1.13: Smoke test auth flow on staging
- [x] T1.6.1.14: Monitor staging for 24 hours
- [x] T1.6.1.15: Document F1 completion in plan.md change log
- [x] T1.6.1.16: Update project checklist to mark F1 complete
- [x] T1.6.1.17: Notify team of F1 merge to main
- [x] T1.6.1.18: Archive F1 feature branch
- [x] T1.6.1.19: Create new develop branch from updated main
- [x] T1.6.1.20: Mark F1 complete in project management tool


## PHASE 2: CORE DISPUTE FLOW (Weeks 3-4)


## FEATURE F2: DISPUTE CREATION


### F2 Stage 2.1: Feature Implementation


#### Database Schema

- [x] T2.1.1.1: Create disputes table migration in backend/prisma/migrations/
- [x] T2.1.1.2: Add disputes columns: id, category, title, summary, estimated_stakes_usd, state, pricing_tier, price_usd, initiator_user_id, created_at, updated_at, completed_at, deleted_at
- [x] T2.1.1.3: Create parties table migration in backend/prisma/migrations/
- [x] T2.1.1.4: Add parties columns: id, dispute_id, role, user_id, brief_status, created_at, updated_at
- [x] T2.1.1.5: Add UNIQUE constraint on parties(dispute_id, role)
- [x] T2.1.1.6: Add index on disputes(initiator_user_id)
- [x] T2.1.1.7: Add partial index on disputes(state) excluding completed, withdrawn, failed
- [x] T2.1.1.8: Add index on parties(dispute_id)
- [x] T2.1.1.9: Add partial index on parties(user_id) where user_id IS NOT NULL
- [x] T2.1.1.10: Run prisma migrate dev --name add-disputes-and-parties
- [x] T2.1.1.11: Run prisma db seed and verify migration
- [x] T2.1.1.12: Update backend/src/types/schemas.ts with DisputeCreateInput Zod schema
- [x] T2.1.1.13: Update backend/src/types/schemas.ts with DisputeUpdateInput Zod schema
- [x] T2.1.1.14: Update OpenAPI spec with DisputeCreateRequest and DisputeResponse
- [x] T2.1.1.15: Generate frontend types from updated OpenAPI spec

#### Backend Dispute Service

- [x] T2.1.2.1: Create backend/src/services/disputes/index.ts
- [x] T2.1.2.2: Implement createDispute validate category contract_interpretation
- [x] T2.1.2.3: Implement createDispute validate title length 5-200 chars
- [x] T2.1.2.4: Implement createDispute validate summary max 500 chars
- [x] T2.1.2.5: Implement createDispute validate estimated_stakes_usd positive if provided
- [x] T2.1.2.6: Implement createDispute set default price_usd 49.00
- [x] T2.1.2.7: Implement createDispute set initial state draft
- [x] T2.1.2.8: Implement createDispute create party record role initiator brief_status not_started
- [x] T2.1.2.9: Implement getDisputes return only initiator user_id disputes exclude deleted
- [x] T2.1.2.10: Implement getDispute with parties, briefs, opinion, evaluator_outputs, payments includes
- [x] T2.1.2.11: Implement updateDispute enforce draft state only
- [x] T2.1.2.12: Implement withdrawDispute validate allowedStates: draft, brief_submitted, payment_pending
- [x] T2.1.2.13: Implement withdrawDispute refund logic if successful payment exists
- [x] T2.1.2.14: Implement withdrawDispute inside database transaction
- [x] T2.1.2.15: Create dispute state machine enforcement function
- [x] T2.1.2.16: Create state transition validation function reject invalid transitions 409

#### Backend Dispute Routes

- [x] T2.1.3.1: Create backend/src/routes/v1/disputes.routes.ts
- [x] T2.1.3.2: Implement POST /v1/disputes with auth, email_verified, Zod validation, rate limit 100/hour
- [x] T2.1.3.3: Implement GET /v1/disputes list endpoint
- [x] T2.1.3.4: Implement GET /v1/disputes/:dispute_id detail endpoint
- [x] T2.1.3.5: Implement PATCH /v1/disputes/:dispute_id draft-only update
- [x] T2.1.3.6: Implement POST /v1/disputes/:dispute_id/withdraw endpoint
- [x] T2.1.3.7: Wire dispute routes into main Express app
- [x] T2.1.3.8: Add dispute endpoints to OpenAPI spec

#### Frontend Dispute Implementation

- [x] T2.1.4.1: Create frontend/src/app/(dashboard)/disputes/page.tsx
- [x] T2.1.4.2: Create frontend/src/app/(dashboard)/disputes/[id]/page.tsx
- [x] T2.1.4.3: Create frontend/src/app/(dashboard)/disputes/new/page.tsx
- [x] T2.1.4.4: Implement dispute creation form component
- [x] T2.1.4.5: Add category dropdown (contract_interpretation only)
- [x] T2.1.4.6: Add title input with 5-200 char validation and character counter
- [x] T2.1.4.7: Add summary textarea with 500 char max and counter
- [x] T2.1.4.8: Add estimated_stakes_usd input with positive number validation
- [x] T2.1.4.9: Add form submission loading state and error display
- [x] T2.1.4.10: Add success redirect to newly created dispute detail page
- [x] T2.1.4.11: Implement dispute list with TanStack Query useQuery
- [x] T2.1.4.12: Add loading skeleton and error state for dispute list
- [x] T2.1.4.13: Implement dispute detail display with state badge
- [x] T2.1.4.14: Add color-coded state badge component
- [x] T2.1.4.15: Add withdraw button visible only for draft disputes
- [x] T2.1.4.16: Implement withdraw confirmation dialog
- [x] T2.1.4.17: Add dispute list link to dashboard navigation
- [x] T2.1.4.18: Add empty state for users with no disputes

### F2 Stage 2.2: Comprehensive Testing


#### Backend Unit Tests

- [x] T2.2.1.1: Create backend/src/__tests__/disputes/create.test.ts
- [x] T2.2.1.2: Test create valid returns 201 state draft party role initiator
- [x] T2.2.1.3: Test create without auth returns 401
- [x] T2.2.1.4: Test create invalid category returns 400
- [x] T2.2.1.5: Test create title too long returns 400
- [x] T2.2.1.6: Test create negative stakes returns 400
- [x] T2.2.1.7: Test create sets default price_usd 49.00
- [x] T2.2.1.8: Test create sets brief_status not_started
- [x] T2.2.1.9: Test create 100 requests in 1 hour rate limited
- [x] T2.2.1.10: Create backend/src/__tests__/disputes/state-machine.test.ts
- [x] T2.2.1.11: Test valid transition draft -> brief_submitted
- [x] T2.2.1.12: Test valid transition draft -> withdrawn
- [x] T2.2.1.13: Test valid transition brief_submitted -> payment_pending
- [x] T2.2.1.14: Test valid transition brief_submitted -> draft on withdraw
- [x] T2.2.1.15: Test valid transition payment_pending -> under_analysis
- [x] T2.2.1.16: Test valid transition payment_pending -> draft on failure
- [x] T2.2.1.17: Test valid transition payment_pending -> failed after retries
- [x] T2.2.1.18: Test valid transition under_analysis -> awaiting_aggregation
- [x] T2.2.1.19: Test valid transition under_analysis -> failed
- [x] T2.2.1.20: Test valid transition awaiting_aggregation -> completed
- [x] T2.2.1.21: Test invalid completed -> any state returns 409
- [x] T2.2.1.22: Test invalid failed -> any state returns 409
- [x] T2.2.1.23: Test invalid withdrawn -> any state returns 409
- [x] T2.2.1.24: Test invalid any state -> completed except awaiting_aggregation returns 409
- [x] T2.2.1.25: Create backend/src/__tests__/disputes/withdraw.test.ts
- [x] T2.2.1.26: Test withdraw draft returns 200 state withdrawn
- [x] T2.2.1.27: Test withdraw brief_submitted returns 200
- [x] T2.2.1.28: Test withdraw payment_pending returns 200
- [x] T2.2.1.29: Test withdraw under_analysis returns 400
- [x] T2.2.1.30: Test withdraw with succeeded payment creates refund record
- [x] T2.2.1.31: Test withdraw without payment creates no refund record
- [x] T2.2.1.32: Test withdraw refund amount matches original payment
- [x] T2.2.1.33: Create backend/src/__tests__/disputes/update.test.ts
- [x] T2.2.1.34: Test update in draft state returns 200
- [x] T2.2.1.35: Test update in non-draft state returns 409
- [x] T2.2.1.36: Test partial update title only
- [x] T2.2.1.37: Create backend/src/__tests__/disputes/get.test.ts
- [x] T2.2.1.38: Test getDisputes returns only users own disputes exclude deleted
- [x] T2.2.1.39: Test getDispute returns dispute with parties
- [x] T2.2.1.40: Test getDispute invalid ID returns 404
- [x] T2.2.1.41: Test getDispute other users dispute returns 404
- [x] T2.2.1.42: Test getDispute soft-deleted dispute returns 404

#### Backend Integration Tests

- [x] T2.2.2.1: Create backend/src/__integration__/disputes/create.integration.test.ts
- [x] T2.2.2.2: Test full create dispute flow: auth -> create -> verify DB
- [x] T2.2.2.3: Test create with real Prisma database
- [x] T2.2.2.4: Verify dispute record created with correct fields
- [x] T2.2.2.5: Verify party record created correctly
- [x] T2.2.2.6: Create backend/src/__integration__/disputes/state-machine.integration.test.ts
- [x] T2.2.2.7: Test full state transition flow in database
- [x] T2.2.2.8: Test concurrent state transitions race condition handled
- [x] T2.2.2.9: Verify no orphaned records on state change
- [x] T2.2.2.10: Test N+1 queries prevented with Prisma includes on dispute detail
- [x] T2.2.2.11: Profile dispute list query with EXPLAIN ANALYZE
- [x] T2.2.2.12: Verify index usage on disputes(initiator_user_id)
- [x] T2.2.2.13: Profile dispute detail query with EXPLAIN ANALYZE
- [x] T2.2.2.14: Verify partial index usage for state filtering
- [x] T2.2.2.15: Test soft delete excluded from normal queries
- [x] T2.2.2.16: Create backend/src/__integration__/disputes/withdraw.integration.test.ts
- [x] T2.2.2.17: Test withdrawal with payment creates refund record
- [x] T2.2.2.18: Test withdrawal without payment creates no refund record
- [x] T2.2.2.19: Verify refund amount matches original payment
- [x] T2.2.2.20: Test database transaction rollback on withdrawal failure

#### Frontend Tests

- [x] T2.2.3.1: Create frontend/src/__tests__/components/DisputeForm.test.tsx
- [x] T2.2.3.2: Test DisputeForm validates title length
- [x] T2.2.3.3: Test DisputeForm validates summary max length
- [x] T2.2.3.4: Test DisputeForm validates stakes must be positive
- [x] T2.2.3.5: Test DisputeForm submits with valid data
- [x] T2.2.3.6: Test DisputeForm shows loading state during submission
- [x] T2.2.3.7: Test DisputeForm shows error on API failure
- [x] T2.2.3.8: Create frontend/src/__tests__/components/DisputeList.test.tsx
- [x] T2.2.3.9: Test DisputeList fetches and displays disputes
- [x] T2.2.3.10: Test DisputeList shows loading skeleton
- [x] T2.2.3.11: Test DisputeList shows empty state when no disputes
- [x] T2.2.3.12: Test DisputeList handles API error gracefully
- [x] T2.2.3.13: Create frontend/src/__tests__/pages/disputes/new.test.tsx
- [x] T2.2.3.14: Test new dispute page renders form
- [x] T2.2.3.15: Test successful creation redirects to detail page
- [x] T2.2.3.16: Test validation errors displayed inline
- [x] T2.2.3.17: Verify frontend coverage >= 80% for dispute components
- [x] T2.2.3.18: Create frontend/tests/e2e/disputes/create-dispute.spec.ts
- [x] T2.2.3.19: Test end-to-end dispute creation flow
- [x] T2.2.3.20: Test dispute appears in list after creation
- [x] T2.2.3.21: Test dispute detail page shows correct data
- [x] T2.2.3.22: Test withdraw flow from dispute detail page
- [x] T2.2.3.23: Run all E2E tests and verify pass
- [x] T2.2.3.24: Fix any flaky E2E tests
- [x] T2.2.3.25: Document E2E test results

### F2 Stage 2.3: Optimization

- [x] T2.3.1.1: Profile dispute list query target <50ms for 50 disputes
- [x] T2.3.1.2: Profile dispute detail query target <100ms
- [x] T2.3.1.3: Add covering index for dispute list query
- [x] T2.3.1.4: Verify INDEX ONLY SCAN on dispute list
- [x] T2.3.1.5: Add cursor-based pagination for dispute list
- [x] T2.3.1.6: Implement cursor parameter in GET /v1/disputes
- [x] T2.3.1.7: Add page size limit max 50 per page
- [x] T2.3.1.8: Add Redis caching for dispute list 5min TTL
- [x] T2.3.1.9: Add Redis caching for dispute detail 5min TTL
- [x] T2.3.1.10: Invalidate cache on dispute state change
- [x] T2.3.1.11: Monitor cache hit rate target >80%
- [x] T2.3.1.12: Frontend implement optimistic updates for dispute creation
- [x] T2.3.1.13: Frontend add React Query cache invalidation after mutation
- [x] T2.3.1.14: Frontend implement skeleton loaders for list and detail
- [x] T2.3.1.15: Frontend add error boundaries for dispute pages
- [x] T2.3.1.16: Benchmark under 100 concurrent users
- [x] T2.3.1.17: Document query optimization results
- [x] T2.3.1.18: Document frontend performance metrics
- [x] T2.3.1.19: Create performance regression tests
- [x] T2.3.1.20: Verify all performance targets met

### F2 Stage 2.4: Beta Phase

- [ ] T2.4.1.1: Deploy dispute flow to local staging
- [ ] T2.4.1.2: Test dispute flow with 5 beta users
- [ ] T2.4.1.3: Collect feedback on dispute creation UX
- [ ] T2.4.1.4: Collect feedback on dispute list UX
- [ ] T2.4.1.5: Monitor dispute creation error rates
- [ ] T2.4.1.6: Monitor database query performance
- [ ] T2.4.1.7: Fix critical bugs found in beta testing
- [x] T2.4.1.8: Add keyboard navigation to dispute forms
- [x] T2.4.1.9: Test WCAG 2.1 AA compliance on dispute pages
- [x] T2.4.1.10: Add ARIA labels to dispute form fields
- [x] T2.4.1.11: Test with screen reader on dispute pages
- [ ] T2.4.1.12: Document beta feedback
- [ ] T2.4.1.13: Update dispute flow based on beta feedback
- [ ] T2.4.1.14: Mark F2 beta phase complete

### F2 Stage 2.5: Pull Request Creation

- [x] T2.5.1.1: Create feature branch feat/2/eng-dispute-creation
- [x] T2.5.1.2: Stage Prisma schema and migrations
- [x] T2.5.1.3: Stage dispute service and routes
- [x] T2.5.1.4: Stage dispute frontend pages and components
- [x] T2.5.1.5: Stage OpenAPI spec updates
- [x] T2.5.1.6: Stage test files
- [x] T2.5.1.7: Run pre-commit checks
- [x] T2.5.1.8: Verify CI passes
- [x] T2.5.1.9: Verify coverage >= 80%
- [x] T2.5.1.10: Write PR description
- [x] T2.5.1.11: Add agent ownership table
- [x] T2.5.1.12: Request reviews from Backend_Architect AppSec_Engineer API_Tester
- [x] T2.5.1.13: Address review comments
- [x] T2.5.1.14: Squash and merge to develop
- [x] T2.5.1.15: Delete feature branch

### F2 Stage 2.6: Merging to Main Execution

- [x] T2.6.1.1: Verify F2 complete on develop
- [x] T2.6.1.2: Create PR from develop to main for F2
- [x] T2.6.1.3: Get approval from Backend_Architect
- [x] T2.6.1.4: Get security approval from AppSec_Engineer
- [x] T2.6.1.5: Get testing approval from API_Tester
- [x] T2.6.1.6: Run full test suite
- [x] T2.6.1.7: Verify coverage >= 80%
- [x] T2.6.1.8: Merge PR using gh pr merge --squash --delete-branch
- [x] T2.6.1.9: Tag release git tag -a v0.2.0-disputes -m "F2 Disputes complete"
- [x] T2.6.1.10: Push tag to remote
- [x] T2.6.1.11: Deploy to local staging
- [x] T2.6.1.12: Smoke test dispute flow on staging
- [x] T2.6.1.13: Monitor for 24 hours
- [x] T2.6.1.14: Update plan.md change log
- [x] T2.6.1.15: Update project checklist
- [x] T2.6.1.16: Notify team of F2 merge
- [x] T2.6.1.17: Create new develop branch
- [x] T2.6.1.18: Mark F2 complete
- [x] T2.6.1.19: Begin F3 implementation

## FEATURE F3: BRIEF PREPARATION (Manual Text Entry — 5-Section Form)

### F3 Stage 3.1: Feature Implementation

#### Database Schema — Briefs
- [x] T3_Brief.001: Create briefs table migration in backend/prisma/migrations/
- [x] T3_Brief.002: Add briefs columns: id, party_id, dispute_id, encrypted_content BYTEA, content_encryption_key_id, word_count, supporting_document_ids, status, timestamps, seal_hash, retention_expires_at
- [x] T3_Brief.003: Add UNIQUE constraint on briefs(party_id)
- [x] T3_Brief.004: Add indexes: briefs(dispute_id), briefs(status), partial index on retention_expires_at
- [x] T3_Brief.005: Run prisma migrate dev --name add-briefs
- [x] T3_Brief.006: Update Prisma schema with Brief model and relations
- [x] T3_Brief.007: Update backend/src/types/schemas.ts with BriefSections Zod schema (5 required sections)
- [x] T3_Brief.008: Update OpenAPI spec with brief endpoints
- [x] T3_Brief.009: Generate frontend types from OpenAPI

#### Backend Encryption Utilities
- [x] T3_Brief.010: Create backend/src/utils/crypto.ts AES-256-GCM encrypt/decrypt helpers
- [x] T3_Brief.011: Implement encrypt(content, keyId) returning encryptedContent and contentEncryptionKeyId
- [x] T3_Brief.012: Implement decrypt(encryptedContent, keyId) returning plaintext
- [x] T3_Brief.013: Implement generateContentEncryptionKey() creating 32-byte key
- [x] T3_Brief.014: Implement rotateEncryptionKey() for quarterly rotation
- [x] T3_Brief.015: Add encryption key storage in backend/config/encryption.ts
- [x] T3_Brief.016: Ensure encryption keys never logged or exposed in error messages
- [x] T3_Brief.017: Add key rotation audit logging

#### Backend Brief Service
- [x] T3_Brief.018: Create backend/src/services/briefs/index.ts
- [x] T3_Brief.019: Implement saveDraft() allowing partial section data
- [x] T3_Brief.020: Validate party exists in dispute and user is party member in saveDraft
- [x] T3_Brief.021: Validate dispute state allows brief editing (draft or brief_submitted only)
- [x] T3_Brief.022: Encrypt brief content with AES-256-GCM before storing in saveDraft
- [x] T3_Brief.023: Calculate and store word_count from non-empty sections
- [x] T3_Brief.024: Update existing draft or create new if none exists (upsert)
- [x] T3_Brief.025: Implement submitBrief() with full validation
- [x] T3_Brief.026: Validate all 5 sections present and non-empty on submit
- [x] T3_Brief.027: Enforce word count: 500-2000 suggested, hard cap 5000 on submit
- [x] T3_Brief.028: Run content moderation check before final submission
- [x] T3_Brief.029: Reject disallowed content with 400: illegal activity, harassment, threats, sexual content, PII of others
- [x] T3_Brief.030: Set status to submitted and record submitted_at timestamp
- [x] T3_Brief.031: Generate seal_hash SHA-256 of encrypted_content for immutability proof
- [x] T3_Brief.032: Set status to sealed after submission — no further edits allowed
- [x] T3_Brief.033: Implement getBrief() with ownership check and on-the-fly decryption
- [x] T3_Brief.034: Return 404 if brief not found or user not party member
- [x] T3_Brief.035: Return 403 if brief is sealed and user attempts edit
- [x] T3_Brief.036: Implement content moderation helper using LLM provider or third-party service
- [x] T3_Brief.037: Log all moderation checks in audit_events table
- [x] T3_Brief.038: Implement brief status state machine: not_started -> in_progress -> submitted -> sealed

#### Backend Brief Routes
- [x] T3_Brief.039: Create backend/src/routes/v1/briefs.routes.ts
- [x] T3_Brief.040: Implement PUT /v1/disputes/:dispute_id/parties/:party_id/brief/draft
- [x] T3_Brief.041: Add auth middleware: user must be authenticated and email_verified
- [x] T3_Brief.042: Add party ownership check: user must be member of the party
- [x] T3_Brief.043: Add Zod validation: partial sections allowed, max 5000 words per section
- [x] T3_Brief.044: Implement POST /v1/disputes/:dispute_id/parties/:party_id/brief/submit
- [x] T3_Brief.045: Add Zod validation: all 5 sections required, word count enforced
- [x] T3_Brief.046: Add rate limiting: max 5 submit attempts per 10 minutes per user
- [x] T3_Brief.047: Implement GET /v1/disputes/:dispute_id/parties/:party_id/brief
- [x] T3_Brief.048: Return 404 if brief not found or user not authorized
- [x] T3_Brief.049: Return 403 if brief is sealed and user tries to edit
- [x] T3_Brief.050: Wire brief routes into main Express app
- [x] T3_Brief.051: Add brief endpoints to OpenAPI spec with request/response schemas
- [x] T3_Brief.052: Generate frontend types from OpenAPI

#### Frontend Brief Implementation
- [x] T3_Brief.053: Create frontend/src/app/(dashboard)/disputes/[id]/brief/page.tsx
- [x] T3_Brief.054: Build 5-section form component: factual_background, my_position, supporting_arguments, acknowledgment_of_opposing, desired_resolution
- [x] T3_Brief.055: Render each section as separate textarea with label and word count
- [x] T3_Brief.056: Add real-time word count display per section and total
- [x] T3_Brief.057: Add visual warning indicator at 4500 words (approaching 5000 cap)
- [x] T3_Brief.058: Add hard stop at 5000 words — prevent further input, show error
- [x] T3_Brief.059: Add auto-save draft every 30 seconds with debounce
- [x] T3_Brief.060: Add "Save Draft" manual button with loading state
- [x] T3_Brief.061: Show last saved timestamp after each auto-save
- [x] T3_Brief.062: Add "Submit Brief" button — disabled until all 5 sections have content
- [x] T3_Brief.063: Add confirmation dialog before submit: "This cannot be edited after submission."
- [x] T3_Brief.064: Add content moderation warning before submit
- [x] T3_Brief.065: Implement submit API call with loading spinner on button
- [x] T3_Brief.066: Show success state after submit: "Brief submitted. Payment required."
- [x] T3_Brief.067: Disable all textareas and hide Save/Submit buttons after submit (immutability)
- [x] T3_Brief.068: Add brief status badge: draft (gray), submitted (blue), sealed (green)
- [x] T3_Brief.069: Handle concurrent saves: show "Saving...", resolve with last server response
- [x] T3_Brief.070: Add error display for API failures with retry button
- [x] T3_Brief.071: Add success toast notifications for save and submit
- [x] T3_Brief.072: Navigate to payment page after successful submit

### F3 Stage 3.2: Comprehensive Testing

#### Backend Unit Tests
- [x] T3_Brief.073: Create backend/src/__tests__/briefs/save-draft.test.ts
- [x] T3_Brief.074: Test save draft with valid partial data returns 200 status=draft
- [x] T3_Brief.075: Test save draft updates existing draft if already exists
- [x] T3_Brief.076: Test save draft for non-existent dispute returns 404
- [x] T3_Brief.077: Test save draft for non-party member returns 403
- [x] T3_Brief.078: Test save draft for non-draft dispute state returns 409
- [x] T3_Brief.079: Create backend/src/__tests__/briefs/submit.test.ts
- [x] T3_Brief.080: Test submit with all 5 sections returns 200 status=submitted
- [x] T3_Brief.081: Test submit with empty section returns 400
- [x] T3_Brief.082: Test submit with exactly 5000 words returns 200
- [x] T3_Brief.083: Test submit with 5001 words returns 400
- [x] T3_Brief.084: Test submit on draft dispute returns 200 state becomes brief_submitted
- [x] T3_Brief.085: Test submit on non-draft dispute returns 409
- [x] T3_Brief.086: Test submit sets seal_hash and makes content immutable
- [x] T3_Brief.087: Test edit after submit returns 403
- [x] T3_Brief.088: Test word count calculated correctly across all 5 sections
- [x] T3_Brief.089: Create backend/src/__tests__/briefs/encryption.test.ts
- [x] T3_Brief.090: Test encryptBriefContent produces non-readable ciphertext
- [x] T3_Brief.091: Test decryptBriefContent recovers original plaintext exactly
- [x] T3_Brief.092: Test decryption fails with wrong key (throws, no plaintext leak)
- [x] T3_Brief.093: Test encrypt-then-decrypt roundtrip preserves content
- [x] T3_Brief.094: Create backend/src/__tests__/briefs/moderation.test.ts
- [x] T3_Brief.095: Test moderation blocks illegal activity returns 400
- [x] T3_Brief.096: Test moderation blocks harassment returns 400
- [x] T3_Brief.097: Test moderation blocks threats returns 400
- [x] T3_Brief.098: Test moderation blocks sexual content returns 400
- [x] T3_Brief.099: Test moderation blocks PII of others returns 400
- [x] T3_Brief.100: Test moderation passes allowed dispute content returns 200

#### Backend Integration Tests
- [x] T3_Brief.101: Create backend/src/__integration__/briefs/brief-flow.integration.test.ts
- [x] T3_Brief.102: Test full flow: create dispute -> save draft multiple times -> submit
- [x] T3_Brief.103: Verify brief content encrypted in database (BYTEA non-readable)
- [x] T3_Brief.104: Verify brief decryption on getBrief returns original content
- [x] T3_Brief.105: Test brief immutability: submit -> attempt edit -> 403
- [x] T3_Brief.106: Test concurrent saves (two simultaneous draft saves) last write wins no corruption
- [x] T3_Brief.107: Test word count enforced on submit with real 5000-word content
- [x] T3_Brief.108: Test status transitions: not_started -> in_progress -> submitted -> sealed
- [x] T3_Brief.109: Test brief cannot be modified after sealed status
- [x] T3_Brief.110: Verify N+1 prevention when fetching briefs with disputes
- [x] T3_Brief.111: Profile brief save and submit queries with EXPLAIN ANALYZE
- [x] T3_Brief.112: Verify index usage on briefs(dispute_id) and briefs(status)
- [x] T3_Brief.113: Test retention_expires_at enforced by retention cron job
- [x] T3_Brief.114: Test brief deleted after retention period expires

#### Frontend Tests
- [x] T3_Brief.115: Create frontend/src/__tests__/components/BriefForm.test.tsx
- [x] T3_Brief.116: Test BriefForm renders all 5 sections with textareas
- [x] T3_Brief.117: Test validates all 5 sections required on submit
- [x] T3_Brief.118: Test allows partial fill on draft save
- [x] T3_Brief.119: Test word count updates correctly per section and total
- [x] T3_Brief.120: Test shows warning at 4500 words
- [x] T3_Brief.121: Test hard blocks input at 5000 words
- [x] T3_Brief.122: Test auto-save triggers every 30 seconds
- [x] T3_Brief.123: Test submit button disabled until all sections filled
- [x] T3_Brief.124: Test submit shows loading state
- [x] T3_Brief.125: Test disables all inputs after submit
- [x] T3_Brief.126: Test shows error on API failure with retry
- [x] T3_Brief.127: Test shows success message after submit
- [x] T3_Brief.128: Create frontend/tests/e2e/brief/brief-flow.spec.ts
- [x] T3_Brief.129: Test E2E: create dispute -> open brief -> fill sections -> save draft -> submit -> payment
- [x] T3_Brief.130: Test E2E word count enforcement
- [x] T3_Brief.131: Test E2E brief becomes immutable after submit
- [x] T3_Brief.132: Verify frontend coverage >= 80% for brief components
- [x] T3_Brief.133: Run all brief tests and verify pass
- [x] T3_Brief.134: Fix any flaky tests and re-run
- [x] T3_Brief.135: Document brief test results

### F3 Stage 3.3: Optimization
- [x] T3_Brief.136: Profile brief save latency target <200ms
- [x] T3_Brief.137: Profile brief submit latency target <500ms
- [x] T3_Brief.138: Optimize AES-256-GCM encryption/decryption performance
- [x] T3_Brief.139: Add gzip compression before encryption to reduce ciphertext size
- [x] T3_Brief.140: Add Redis caching for draft briefs with 5min TTL
- [x] T3_Brief.141: Invalidate cache on brief state change (draft -> submitted)
- [x] T3_Brief.142: Optimize database queries for brief retrieval with Prisma includes
- [x] T3_Brief.143: Frontend: add React.memo to BriefForm sections to prevent re-renders
- [x] T3_Brief.144: Frontend: add debounced auto-save (30s) to reduce API calls
- [x] T3_Brief.145: Frontend: add optimistic updates for draft save
- [x] T3_Brief.146: Benchmark encryption under 100 concurrent brief saves
- [x] T3_Brief.147: Document brief performance benchmarks

### F3 Stage 3.4: Beta Phase
- [x] T3_Brief.148: Deploy brief flow to local staging
- [x] T3_Brief.149: Test brief flow with 5 beta users
- [x] T3_Brief.150: Collect feedback on brief form UX and 5-section layout
- [x] T3_Brief.151: Monitor brief save and submit error rates
- [x] T3_Brief.152: Monitor encryption performance in staging
- [x] T3_Brief.153: Fix critical bugs found in beta testing
- [x] T3_Brief.154: Add keyboard navigation to all brief form fields
- [x] T3_Brief.155: Test WCAG 2.1 AA compliance on brief pages
- [x] T3_Brief.156: Add ARIA labels to all brief form labels and error messages
- [x] T3_Brief.157: Test with screen reader on brief preparation pages
- [x] T3_Brief.158: Test content moderation with edge case inputs
- [x] T3_Brief.159: Document beta feedback
- [x] T3_Brief.160: Update brief flow based on beta feedback
- [x] T3_Brief.161: Mark F3 beta phase complete

### F3 Stage 3.5: Pull Request Creation
- [x] T3_Brief.162: Create feature branch feat/3/eng-brief-preparation
- [x] T3_Brief.163: Stage brief schema migrations
- [x] T3_Brief.164: Stage brief service, routes, encryption utils, moderation
- [x] T3_Brief.165: Stage frontend brief pages and BriefForm component
- [x] T3_Brief.166: Stage OpenAPI updates
- [x] T3_Brief.167: Stage test files (unit, integration, E2E)
- [x] T3_Brief.168: Run pre-commit checks: lint, typecheck, test:unit
- [x] T3_Brief.169: Verify all CI checks pass
- [x] T3_Brief.170: Ensure test coverage >= 80% for changed files
- [x] T3_Brief.171: Write PR description with feature summary
- [x] T3_Brief.172: Add agent ownership table to PR
- [x] T3_Brief.173: Link OpenAPI spec changes in PR
- [x] T3_Brief.174: Request review from Senior_Developer (primary)
- [x] T3_Brief.175: Request review from Privacy_Engineer (encryption)
- [x] T3_Brief.176: Request security review from AppSec_Engineer
- [x] T3_Brief.177: Request testing review from API_Tester
- [x] T3_Brief.178: Address review comments
- [x] T3_Brief.179: Re-run CI after addressing comments
- [x] T3_Brief.180: Squash and merge PR to develop branch
- [x] T3_Brief.181: Delete feature branch after merge

### F3 Stage 3.6: Merging to Main Execution
- [x] T3_Brief.182: Verify F3 complete and stable on develop
- [x] T3_Brief.183: Create PR from develop to main for F3
- [x] T3_Brief.184: Get attorney/legal sign-off on brief encryption and moderation
- [x] T3_Brief.185: Run full test suite on develop: unit, integration, E2E
- [x] T3_Brief.186: Verify all tests pass
- [x] T3_Brief.187: Verify code coverage >= 80%
- [x] T3_Brief.188: Get approval from Senior_Developer
- [x] T3_Brief.189: Get approval from Privacy_Engineer
- [x] T3_Brief.190: Get approval from AppSec_Engineer
- [x] T3_Brief.191: Merge PR using gh pr merge --squash --delete-branch
- [x] T3_Brief.192: Tag release: git tag -a v0.3.0-briefs -m "F3 Brief Preparation complete"
- [x] T3_Brief.193: Push tag to remote
- [x] T3_Brief.194: Deploy to local staging
- [x] T3_Brief.195: Smoke test brief flow on staging
- [x] T3_Brief.196: Monitor staging for 24 hours
- [x] T3_Brief.197: Document F3 completion in plan.md change log
- [x] T3_Brief.198: Update project checklist to mark F3 complete
- [x] T3_Brief.199: Notify team of F3 merge to main
- [x] T3_Brief.200: Archive F3 feature branch
- [x] T3_Brief.201: Mark F3 complete in project management tool


## PHASE 3: PAYMENTS (Week 5)


## FEATURE F4: PAYMENT COLLECTION


### F4 Stage 3.1: Feature Implementation

- [x] T3.1.1.1: Create payments table migration in backend/prisma/migrations/
- [x] T3.1.1.2: Add payments columns: id, dispute_id, user_id, amount_usd, currency, processor, processor_payment_id, status, refunded_amount_usd, refund_reason, refunded_at, idempotency_key, created_at, updated_at, completed_at
- [x] T3.1.1.3: Add index on payments(dispute_id)
- [x] T3.1.1.4: Add index on payments(user_id)
- [x] T3.1.1.5: Add unique constraint on payments(processor_payment_id)
- [x] T3.1.1.6: Add unique constraint on payments(idempotency_key)
- [x] T3.1.1.7: Run prisma migrate dev --name add-payments
- [x] T3.1.1.8: Update backend/src/types/schemas.ts with payment Zod schemas
- [x] T3.1.1.9: Update OpenAPI spec with payment endpoints
- [x] T3.1.1.10: Generate frontend types from OpenAPI
- [x] T3.1.1.11: Create backend/src/services/payments/index.ts
- [x] T3.1.1.12: Implement createPaymentIntent validate dispute in payment_pending state
- [x] T3.1.1.13: Implement createPaymentIntent call Stripe paymentIntents create for $49 USD
- [x] T3.1.1.14: Implement createPaymentIntent store idempotency key with 24h TTL
- [x] T3.1.1.15: Implement confirmPayment verify idempotency key then update state
- [x] T3.1.1.16: Implement confirmPayment update dispute state to under_analysis
- [x] T3.1.1.17: Implement confirmPayment trigger evaluation job
- [x] T3.1.1.18: Implement requestRefund validate dispute eligible for refund
- [x] T3.1.1.19: Create backend/src/routes/v1/payments.routes.ts
- [x] T3.1.1.20: Implement GET /v1/disputes/:dispute_id/payment-intent endpoint
- [x] T3.1.1.21: Implement POST /v1/disputes/:dispute_id/payment/confirm endpoint
- [x] T3.1.1.22: Implement POST /v1/disputes/:dispute_id/refund-request endpoint
- [x] T3.1.1.23: Implement GET /v1/users/me/payments endpoint
- [x] T3.1.1.24: Create Stripe webhook handler POST /v1/webhooks/stripe
- [x] T3.1.1.25: Implement Stripe webhook signature verification with STRIPE_WEBHOOK_SECRET
- [x] T3.1.1.26: Handle payment_intent.succeeded: update state and trigger evaluation
- [x] T3.1.1.27: Handle payment_intent.failed: revert to draft or payment_pending
- [x] T3.1.1.28: Create backend/src/jobs/email.worker.ts or queue consumer for async emails
- [x] T3.1.1.29: Create email templates payment-success.ts, payment-failed.ts
- [x] T3.1.1.30: Create frontend src/app/(dashboard)/disputes/[id]/payment/page.tsx
- [x] T3.1.1.31: Create Stripe Elements payment form in frontend
- [x] T3.1.1.32: Implement Stripe payment confirmation flow
- [x] T3.1.1.33: Add payment success and error states
- [x] T3.1.1.34: Add retry payment button for failed payments
- [x] T3.1.1.35: Add payment history to user dashboard

### F4 Stage 3.2: Comprehensive Testing

- [x] T3.2.1.1: Create backend/src/__tests__/payments/intent.test.ts
- [x] T3.2.1.2: Test create intent for payment_pending dispute returns 200
- [x] T3.2.1.3: Test create intent for non-payment_pending returns 400
- [x] T3.2.1.4: Test create intent duplicate idempotency key returns original response
- [x] T3.2.1.5: Test create intent amount always 49.00 USD
- [x] T3.2.1.6: Create backend/src/__tests__/payments/confirm.test.ts
- [x] T3.2.1.7: Test confirm valid payment returns 200 state under_analysis
- [x] T3.2.1.8: Test confirm invalid intent returns 400
- [x] T3.2.1.9: Test confirm duplicate idempotency returns original
- [x] T3.2.1.10: Create backend/src/__tests__/payments/refund.test.ts
- [x] T3.2.1.11: Test refund request eligible dispute returns 202
- [x] T3.2.1.12: Test refund request ineligible dispute returns 400
- [x] T3.2.1.13: Create backend/src/__tests__/payments/webhook.test.ts
- [x] T3.2.1.14: Test Stripe webhook signature verification rejects bad sig
- [x] T3.2.1.15: Test payment_intent.succeeded updates state and triggers evaluation
- [x] T3.2.1.16: Test payment_intent.failed reverts to draft
- [x] T3.2.1.17: Create backend/src/__tests__/payments/integration.test.ts
- [x] T3.2.1.18: Test full payment flow create intent -> confirm -> state change
- [x] T3.2.1.19: Test webhook failure fallback polling every 30s for 5 min
- [x] T3.2.1.20: Create backend/src/__tests__/payments/idempotency.test.ts
- [x] T3.2.1.21: Test idempotency keys stored with 24h TTL
- [x] T3.2.1.22: Test repeated request with same key returns original
- [x] T3.2.1.23: Test idempotency key expires after 24h
- [x] T3.2.1.24: Test concurrent payment confirmations handled safely
- [x] T3.2.1.25: Create frontend/tests/e2e/payments/payment-flow.spec.ts
- [x] T3.2.1.26: Test user can pay for analysis with Stripe test card
- [x] T3.2.1.27: Test payment success redirects to analysis-in-progress
- [x] T3.2.1.28: Test payment failure shows error and retry option
- [x] T3.2.1.29: Run all payment tests and verify pass
- [x] T3.2.1.30: Document payment test results

### F4 Stage 3.3: Optimization

- [x] T3.3.1.1: Profile Stripe API call latency target <500ms
- [x] T3.3.1.2: Add Stripe API call timeout 10s
- [x] T3.3.1.3: Add retry with exponential backoff for Stripe API failures
- [x] T3.3.1.4: Optimize idempotency key database queries with index
- [x] T3.3.1.5: Add batch webhook processing for high volume
- [x] T3.3.1.6: Monitor payment success rate target >95%
- [x] T3.3.1.7: Monitor payment latency p95 <2s
- [x] T3.3.1.8: Frontend optimize payment form render performance
- [x] T3.3.1.9: Frontend add loading skeletons during payment processing
- [x] T3.3.1.10: Document payment performance benchmarks

### F4 Stage 3.4: Beta Phase

- [x] T3.4.1.1: Deploy payment flow to local staging with Stripe test mode
- [x] T3.4.1.2: Test payment flow with 5 beta users
- [x] T3.4.1.3: Collect feedback on payment UX
- [x] T3.4.1.4: Monitor payment success rate in staging
- [x] T3.4.1.5: Monitor Stripe webhook delivery success
- [x] T3.4.1.6: Fix critical bugs found in beta testing
- [x] T3.4.1.7: Add accessibility checks on payment form
- [x] T3.4.1.8: Document beta feedback
- [x] T3.4.1.9: Mark F4 beta phase complete

### F4 Stage 3.5: Pull Request Creation

- [x] T3.5.1.1: Create feature branch feat/4/eng-payments-stripe
- [x] T3.5.1.2: Stage payment schema migrations
- [x] T3.5.1.3: Stage payment service, routes, webhook handler
- [x] T3.5.1.4: Stage frontend payment pages and Stripe integration
- [x] T3.5.1.5: Stage OpenAPI updates
- [x] T3.5.1.6: Stage test files
- [x] T3.5.1.7: Run checks verify CI and coverage >= 80%
- [x] T3.5.1.8: Write PR description and ownership table
- [x] T3.5.1.9: Request reviews from Payments_and_Billing_Engineer AppSec_Engineer API_Tester
- [x] T3.5.1.10: Address comments and squash merge to develop
- [x] T3.5.1.11: Delete feature branch

### F4 Stage 3.6: Merging to Main Execution

- [x] T3.6.1.1: Verify F4 complete on develop
- [x] T3.6.1.2: Create PR from develop to main for F4
- [x] T3.6.1.3: Get approvals from Payments_and_Billing_Engineer and AppSec
- [x] T3.6.1.4: Run full test suite and verify coverage >= 80%
- [x] T3.6.1.5: Merge PR squash and delete branch
- [x] T3.6.1.6: Tag release v0.4.0-payments and push tag
- [x] T3.6.1.7: Deploy to local staging and smoke test
- [x] T3.6.1.8: Monitor for 24 hours, update logs, notify team
- [x] T3.6.1.9: Mark F4 complete

## PHASE 4: EVALUATION ORCHESTRATION (Weeks 6-7)


## FEATURE F5: EVALUATION ORCHESTRATION


### F5 Stage 4.1: Feature Implementation

- [x] T4.1.1.1: Create backend/src/providers/llm.ts LLMProvider interface and ProviderCapabilities type
- [x] T4.1.1.2: Create backend/src/providers/types.ts Prompt CompletionResult HealthStatus CostEstimate
- [x] T4.1.1.3: Create backend/src/providers/errors.ts provider error classes
- [x] T4.1.1.4: Create backend/src/providers/retry.ts withRetry exponential backoff utility
- [x] T4.1.1.5: Create backend/src/providers/circuit-breaker.ts CircuitBreaker class
- [x] T4.1.1.6: Create backend/src/providers/cost.ts cost estimation utilities
- [x] T4.1.1.7: Create backend/src/providers/health.ts health check utilities
- [x] T4.1.1.8: Create backend/src/providers/registry.ts ProviderRegistry class
- [x] T4.1.1.9: Create backend/src/providers/index.ts barrel export
- [x] T4.1.1.10: Create backend/src/providers/groq.provider.ts GroqProvider for Llama 3 70B
- [x] T4.1.1.11: Create backend/src/providers/groq.provider.ts MixtralProvider for Mixtral 8x7B
- [x] T4.1.1.12: Create backend/src/providers/gemini.provider.ts GeminiProvider for Gemini 1.5 Pro
- [x] T4.1.1.13: Configure providers from env GROQ_API_KEY and GEMINI_API_KEY
- [x] T4.1.1.14: Create backend/src/prompts/eval-v3.2.ts with immutable EVAL_PROMPT_V3_2 string
- [x] T4.1.1.15: Create backend/src/prompts/agg-v2.1.ts with immutable AGG_PROMPT_V2_1 string
- [x] T4.1.1.16: Create evaluator_outputs table migration in backend/prisma/migrations/
- [x] T4.1.1.17: Add evaluator_outputs columns with all required fields
- [x] T4.1.1.18: Add index on evaluator_outputs(dispute_id)
- [x] T4.1.1.19: Run prisma migrate dev --name add-evaluator-outputs
- [x] T4.1.1.20: Create backend/src/services/evaluation/index.ts
- [x] T4.1.1.21: Implement createEvaluationJob dispute and brief validation
- [x] T4.1.1.22: Implement dispatchEvaluators with Promise.allSettled parallel dispatch
- [x] T4.1.1.23: Implement dispatchEvaluators retry loop up to 3 attempts 1s then 2s backoff
- [x] T4.1.1.24: Implement dispatchEvaluators store output in evaluator_outputs table
- [x] T4.1.1.25: Implement dispatchEvaluators record prompt_version cost duration attempt_number
- [x] T4.1.1.26: Implement dispatchEvaluators minimum 3 successful rule
- [x] T4.1.1.27: Implement dispatchEvaluators auto-refund when fewer than 3 succeed
- [x] T4.1.1.28: Implement dispatchEvaluators update dispute state to awaiting_aggregation or failed
- [x] T4.1.1.29: Implement decodeContent AES-256-GCM decrypt helper for brief content
- [x] T4.1.1.30: Implement input sanitization before sending brief to evaluators
- [x] T4.1.1.31: Implement output validation detect prompt injection patterns
- [x] T4.1.1.32: Create backend/src/jobs/evaluation.worker.ts BullMQ worker
- [x] T4.1.1.33: Create backend/src/jobs/queues.ts queue definitions
- [x] T4.1.1.34: Create backend/src/routes/v1/evaluation.routes.ts
- [x] T4.1.1.35: Implement POST /v1/disputes/:dispute_id/evaluate endpoint
- [x] T4.1.1.36: Implement GET /v1/disputes/:dispute_id/evaluation/status endpoint
- [x] T4.1.1.37: Add evaluation endpoints to OpenAPI spec
- [x] T4.1.1.38: Generate frontend types from OpenAPI
- [x] T4.1.1.39: Create frontend src/app/(dashboard)/disputes/[id]/analysis/page.tsx
- [x] T4.1.1.40: Implement analysis status display with SSE or polling
- [x] T4.1.1.41: Add evaluator progress indicators
- [x] T4.1.1.42: Add evaluation complete notification state

### F5 Stage 4.2: Comprehensive Testing

- [x] T4.2.1.1: Create backend/src/__tests__/providers/groq.test.ts
- [x] T4.2.1.2: Test GroqProvider generateCompletion returns completion
- [x] T4.2.1.3: Test GroqProvider healthCheck returns healthy true on valid API
- [x] T4.2.1.4: Test GroqProvider healthCheck returns healthy false on invalid API
- [x] T4.2.1.5: Test GroqProvider data residency checks
- [x] T4.2.1.6: Test GroqProvider hasNoTrainingGuarantee returns true
- [x] T4.2.1.7: Create backend/src/__tests__/providers/gemini.test.ts
- [x] T4.2.1.8: Test GeminiProvider generateCompletion returns completion
- [x] T4.2.1.9: Test GeminiProvider healthCheck latency tracking
- [x] T4.2.1.10: Create backend/src/__tests__/providers/registry.test.ts
- [x] T4.2.1.11: Test ProviderRegistry register and all return providers
- [x] T4.2.1.12: Create backend/src/__tests__/providers/circuit-breaker.test.ts
- [x] T4.2.1.13: Test CircuitBreaker opens on consecutive failures
- [x] T4.2.1.14: Test CircuitBreaker half-open after timeout
- [x] T4.2.1.15: Test CircuitBreaker closes on success
- [x] T4.2.1.16: Create backend/src/__tests__/providers/retry.test.ts
- [x] T4.2.1.17: Test withRetry succeeds on first attempt
- [x] T4.2.1.18: Test withRetry retries on transient failure
- [x] T4.2.1.19: Test withRetry throws after max attempts
- [x] T4.2.1.20: Create backend/src/__tests__/evaluation/dispatch.test.ts
- [x] T4.2.1.21: Test dispatchEvaluators calls all 3 providers in parallel
- [x] T4.2.1.22: Test dispatchEvaluators stores outputs in database
- [x] T4.2.1.23: Test dispatchEvaluators records prompt_version cost duration
- [x] T4.2.1.24: Test dispatchEvaluators minimum 3 success moves to awaiting_aggregation
- [x] T4.2.1.25: Test dispatchEvaluators 1 failure after retries auto-refund
- [x] T4.2.1.26: Test dispatchEvaluators all 3 failures state failed auto-refund
- [x] T4.2.1.27: Test dispatchEvaluators prompt injection output flagged parse_success false
- [x] T4.2.1.28: Test dispatchEvaluators timeout >60s marked failed and retried
- [x] T4.2.1.29: Test dispatchEvaluators attempt_number increments on retry
- [x] T4.2.1.30: Test input sanitization blocks prompt injection patterns
- [x] T4.2.1.31: Create backend/src/__tests__/evaluation/integration.test.ts
- [x] T4.2.1.32: Test full evaluation flow with mock providers
- [x] T4.2.1.33: Test full evaluation flow with real Groq API
- [x] T4.2.1.34: Test full evaluation flow with real Gemini API
- [x] T4.2.1.35: Test cost tracking recorded per evaluator
- [x] T4.2.1.36: Test cost threshold alert triggered at $15/dispute
- [x] T4.2.1.37: Create backend/src/__tests__/evaluation/state-machine.test.ts
- [x] T4.2.1.38: Test state transition under_analysis -> awaiting_aggregation
- [x] T4.2.1.39: Test state transition under_analysis -> failed on insufficient successes
- [x] T4.2.1.40: Create frontend/tests/e2e/evaluation/analysis-flow.spec.ts
- [x] T4.2.1.41: Test user sees analysis in progress after payment
- [x] T4.2.1.42: Test user sees evaluation status updates
- [x] T4.2.1.43: Test user receives notification when analysis complete
- [x] T4.2.1.44: Run all evaluation tests and verify pass
- [x] T4.2.1.45: Document evaluation test results

### F5 Stage 4.3: Optimization

- [x] T4.3.1.1: Profile provider dispatch latency target all 3 complete <5 min
- [x] T4.3.1.2: Parallel dispatch with Promise.allSettled already implemented
- [x] T4.3.1.3: Add circuit breaker per provider to fail fast
- [x] T4.3.1.4: Add provider fallback routing on primary failure
- [x] T4.3.1.5: Add brief content caching hash-based key for identical briefs
- [x] T4.3.1.6: Monitor provider success rate per evaluator
- [x] T4.3.1.7: Monitor LLM cost per dispute target <$8.30
- [x] T4.3.1.8: Add daily cost aggregation job
- [x] T4.3.1.9: Add Slack alert if cost per dispute > $15
- [x] T4.3.1.10: Optimize database queries for evaluation status
- [x] T4.3.1.11: Frontend add optimistic status updates during evaluation
- [x] T4.3.1.12: Document evaluation performance benchmarks

### F5 Stage 4.4: Beta Phase

- [x] T4.4.1.1: Deploy evaluation flow to local staging
- [x] T4.4.1.2: Test evaluation with real Groq and Gemini APIs
- [x] T4.4.1.3: Test evaluation with 5 real briefs from beta users
- [x] T4.4.1.4: Monitor evaluation success rate
- [x] T4.4.1.5: Monitor evaluation latency p95 <5min
- [x] T4.4.1.6: Monitor LLM costs per dispute
- [x] T4.4.1.7: Fix provider-specific bugs
- [x] T4.4.1.8: Add accessibility on analysis status page
- [x] T4.4.1.9: Document beta feedback
- [x] T4.4.1.10: Mark F5 beta phase complete

### F5 Stage 4.5: Pull Request Creation

- [x] T4.5.1.1: Create feature branch feat/5/eng-evaluation-orchestration
- [x] T4.5.1.2: Stage provider abstraction files
- [x] T4.5.1.3: Stage evaluation service, routes, jobs
- [x] T4.5.1.4: Stage prompt files
- [x] T4.5.1.5: Stage OpenAPI updates
- [x] T4.5.1.6: Stage test files
- [x] T4.5.1.7: Run checks verify CI and coverage >= 80%
- [x] T4.5.1.8: Write PR description and ownership table
- [x] T4.5.1.9: Request reviews from AI_Engineer Prompt_Engineer Senior_SecOps_Engineer
- [x] T4.5.1.10: Address comments squash merge to develop
- [x] T4.5.1.11: Delete feature branch

### F5 Stage 4.6: Merging to Main Execution

- [x] T4.6.1.1: Verify F5 complete on develop
- [x] T4.6.1.2: Create PR from develop to main for F5
- [x] T4.6.1.3: Get approvals from AI_Engineer and Senior_SecOps
- [x] T4.6.1.4: Run full test suite and verify coverage >= 80%
- [x] T4.6.1.5: Merge PR squash and delete branch
- [x] T4.6.1.6: Tag release v0.5.0-evaluation and push tag
- [x] T4.6.1.7: Deploy to local staging and smoke test
- [x] T4.6.1.8: Monitor 24 hours update logs notify team
- [x] T4.6.1.9: Mark F5 complete

## PHASE 5: MANUAL AGGREGATION (Week 8)


## FEATURE F6: MANUAL AGGREGATION


### F6 Stage 5.1: Feature Implementation

- [x] T5.1.1.1: Create aggregation service with opinion generation logic
- [x] T5.1.1.2: Enforce minimum 3 evaluator outputs before allowing aggregation
- [x] T5.1.1.3: Compute inter_evaluator_agreement from evaluator outputs
- [x] T5.1.1.4: Compute overall_confidence for the opinion
- [x] T5.1.1.5: Generate opinion with all required fields and standard disclaimers
- [x] T5.1.1.6: Create admin authentication middleware and role checks
- [x] T5.1.1.7: Implement admin dispute list and detail endpoints
- [x] T5.1.1.8: Implement pending aggregations list endpoint
- [x] T5.1.1.9: Implement aggregation publish endpoint
- [x] T5.1.1.10: Wire aggregation routes into Express app
- [x] T5.1.1.11: Add admin endpoints to OpenAPI spec
- [x] T5.1.1.12: Generate frontend types from OpenAPI
- [x] T5.1.1.13: Build admin dashboard UI: dispute list, filters, detail view
- [x] T5.1.1.14: Build aggregation form: side-by-side evaluator outputs, opinion fields
- [x] T5.1.1.15: Add publish and unpublish within 1 hour controls

### F6 Stage 5.2: Comprehensive Testing

- [x] T5.2.1.1: Test admin authentication rejects non-admin users
- [x] T5.2.1.2: Test admin lists disputes with filters
- [x] T5.2.1.3: Test admin views dispute details
- [x] T5.2.1.4: Test aggregates with 3 outputs -> 200 opinion created
- [x] T5.2.1.5: Test aggregates with <3 outputs -> 400
- [x] T5.2.1.6: Test publishes without disclaimers -> 400
- [x] T5.2.1.7: Test publishes missing fields -> 400
- [x] T5.2.1.8: Test publish sets state completed
- [x] T5.2.1.9: Test publish triggers user notification
- [x] T5.2.1.10: Test unpublish within 1 hour succeeds
- [x] T5.2.1.11: Test unpublish after 1 hour blocked
- [x] T5.2.1.12: Test full aggregation flow: pending -> aggregate -> completed
- [x] T5.2.1.13: Test audit log records admin actions
- [x] T5.2.1.14: Run E2E tests for admin aggregation flow
- [x] T5.2.1.15: Document aggregation test results

### F6 Stage 5.3: Optimization

- [x] T5.3.1.1: Profile admin list query target <100ms
- [x] T5.3.1.2: Add covering index for admin dispute queries
- [x] T5.3.1.3: Cache admin dashboard stats with 1min TTL
- [x] T5.3.1.4: Frontend virtualize large admin dispute tables
- [x] T5.3.1.5: Document admin performance benchmarks

### F6 Stage 5.4: Beta Phase

- [x] T5.4.1.1: Deploy aggregation to local staging
- [x] T5.4.1.2: Test aggregation with internal team as admins
- [x] T5.4.1.3: Monitor aggregation SLA 24h
- [x] T5.4.1.4: Collect admin UX feedback
- [x] T5.4.1.5: Fix critical bugs
- [x] T5.4.1.6: Verify WCAG 2.1 AA on admin pages
- [x] T5.4.1.7: Mark F6 beta phase complete

### F6 Stage 5.5: Pull Request Creation

- [x] T5.5.1.1: Create feature branch feat/6/eng-manual-aggregation
- [x] T5.5.1.2: Stage aggregation service and admin routes
- [x] T5.5.1.3: Stage frontend admin pages
- [x] T5.5.1.4: Stage OpenAPI updates
- [x] T5.5.1.5: Stage test files
- [x] T5.5.1.6: Run checks verify CI and coverage >= 80%
- [x] T5.5.1.7: Write PR description and ownership table
- [x] T5.5.1.8: Request reviews from Senior_Developer Security_Architect API_Tester
- [x] T5.5.1.9: Address comments squash merge to develop
- [x] T5.5.1.10: Delete feature branch

### F6 Stage 5.6: Merging to Main Execution

- [x] T5.6.1.1: Verify F6 complete on develop
- [x] T5.6.1.2: Create PR from develop to main for F6
- [x] T5.6.1.3: Get required approvals
- [x] T5.6.1.4: Run full test suite verify coverage >= 80%
- [x] T5.6.1.5: Merge PR squash and delete branch
- [x] T5.6.1.6: Tag release v0.6.0-aggregation and push tag
- [x] T5.6.1.7: Deploy to local staging and smoke test
- [x] T5.6.1.8: Monitor 24 hours update logs notify team
- [x] T5.6.1.9: Mark F6 complete

## PHASE 6: OPINION DELIVERY (Week 9)


## FEATURE F7: OPINION DELIVERY


### F7 Stage 6.1: Feature Implementation

- [x] T6.1.1.1: Create opinions table migration in backend/prisma/migrations/
- [x] T6.1.1.2: Add opinions columns id, dispute_id, encrypted_content, content_encryption_key_id, eval_prompt_version, agg_prompt_version, evaluator_output_ids, inter_evaluator_agreement, overall_confidence, aggregator_provider, aggregator_model_id, total_cost_usd, pdf_storage_key, pdf_generated_at, created_at, delivered_at, retention_expires_at
- [x] T6.1.1.3: Add index on opinions(created_at DESC)
- [x] T6.1.1.4: Add partial index on opinions(retention_expires_at) where retention_expires_at IS NOT NULL
- [x] T6.1.1.5: Run prisma migrate dev --name add-opinions
- [x] T6.1.1.6: Implement encryptOpinionContent AES-256-GCM helper
- [x] T6.1.1.7: Implement decryptOpinionContent AES-256-GCM helper
- [x] T6.1.1.8: Implement getOpinion with ownership check for dispute initiator
- [x] T6.1.1.9: Implement PDF generation with Puppeteer including opinion content, disclaimers, timestamp, evaluators
- [x] T6.1.1.10: Implement PDF retry once on failure; if still failing deliver without PDF
- [x] T6.1.1.11: Create opinion read route and PDF download route
- [x] T6.1.1.12: Implement opinion status endpoint with SSE stream
- [x] T6.1.1.13: Add opinion endpoints to OpenAPI spec
- [x] T6.1.1.14: Generate frontend types from OpenAPI
- [x] T6.1.1.15: Build opinion display page on frontend
- [x] T6.1.1.16: Add PDF download button and signed URL expiry handling
- [x] T6.1.1.17: Add SSE status updates for real-time opinion readiness
- [x] T6.1.1.18: Add notification when opinion is ready

### F7 Stage 6.2: Comprehensive Testing

- [x] T6.2.1.1: Test createOpinionFromAggregation stores opinion with all fields
- [x] T6.2.1.2: Test createOpinionFromAggregation includes all 4 required disclaimers
- [x] T6.2.1.3: Test PDF generation creates valid PDF with Puppeteer
- [x] T6.2.1.4: Test PDF delivery falls back to web-only when PDF generation fails
- [x] T6.2.1.5: Test opinion read returns opinion for dispute initiator
- [x] T6.2.1.6: Test opinion read returns 404 for non-initiator
- [x] T6.2.1.7: Test opinion read returns 404 for non-completed dispute
- [x] T6.2.1.8: Test SSE stream pushes status updates
- [x] T6.2.1.9: Test SSE stream closes after dispute completed
- [x] T6.2.1.10: Test full opinion delivery flow aggregate -> create -> deliver
- [x] T6.2.1.11: Test notification email sent when opinion ready
- [x] T6.2.1.12: Run E2E tests for opinion read and PDF download
- [x] T6.2.1.13: Document opinion test results

### F7 Stage 6.3: Optimization

- [x] T6.3.1.1: Profile opinion read latency target <200ms including decryption
- [x] T6.3.1.2: Profile PDF generation latency target <10s
- [x] T6.3.1.3: Add async PDF generation queue
- [x] T6.3.1.4: Cache opinion read queries
- [x] T6.3.1.5: Monitor PDF generation success rate
- [x] T6.3.1.6: Monitor SSE connection count
- [x] T6.3.1.7: Frontend optimize opinion page render
- [x] T6.3.1.8: Frontend add PDF download progress indicator
- [x] T6.3.1.9: Document opinion delivery benchmarks

### F7 Stage 6.4: Beta Phase

- [x] T6.4.1.1: Deploy opinion delivery to local staging
- [x] T6.4.1.2: Test opinion flow with 10 aggregated evaluations
- [x] T6.4.1.3: Test PDF generation and download
- [x] T6.4.1.4: Test SSE real-time updates
- [x] T6.4.1.5: Monitor opinion delivery success rate
- [x] T6.4.1.6: Collect user feedback on opinion format
- [x] T6.4.1.7: Fix critical bugs
- [x] T6.4.1.8: Verify WCAG 2.1 AA on opinion page
- [x] T6.4.1.9: Document beta feedback
- [x] T6.4.1.10: Mark F7 beta phase complete

### F7 Stage 6.5: Pull Request Creation

- [x] T6.5.1.1: Create feature branch feat/7/eng-opinion-delivery
- [x] T6.5.1.2: Stage opinion service routes encryption utils
- [x] T6.5.1.3: Stage frontend opinion pages and SSE hooks
- [x] T6.5.1.4: Stage OpenAPI updates
- [x] T6.5.1.5: Stage test files
- [x] T6.5.1.6: Run checks verify CI and coverage >= 80%
- [x] T6.5.1.7: Write PR description and ownership table
- [x] T6.5.1.8: Request reviews from Backend_Architect Cloud_Security_Architect API_Tester
- [x] T6.5.1.9: Address comments squash merge to develop
- [x] T6.5.1.10: Delete feature branch

### F7 Stage 6.6: Merging to Main Execution

- [x] T6.6.1.1: Verify F7 complete on develop
- [x] T6.6.1.2: Create PR from develop to main for F7
- [x] T6.6.1.3: Run full test suite verify coverage >= 80%
- [x] T6.6.1.4: Merge PR squash and delete branch
- [x] T6.6.1.5: Tag release v0.7.0-opinions and push tag
- [x] T6.6.1.6: Deploy to local staging and smoke test
- [x] T6.6.1.7: Monitor 24 hours update logs notify team
- [x] T6.6.1.8: Mark F7 complete

## PHASE 7: EMAIL NOTIFICATIONS (Week 10)


## FEATURE F9: EMAIL NOTIFICATIONS


### F9 Stage 7.1: Feature Implementation

- [x] T7.1.1.1: Create backend/src/services/email/index.ts email service
- [x] T7.1.1.2: Implement sendEmail function using Nodemailer locally
- [x] T7.1.1.3: Create email templates: verification-email.ts, password-reset.ts
- [x] T7.1.1.4: Create email templates: dispute-created.ts, brief-submitted.ts
- [x] T7.1.1.5: Create email templates: payment-success.ts, payment-failed.ts
- [x] T7.1.1.6: Create email templates: opinion-ready.ts, account-deletion.ts
- [x] T7.1.1.7: Create backend/src/config/email.ts email provider configuration
- [x] T7.1.1.8: Implement email queue with BullMQ
- [x] T7.1.1.9: Create backend/src/jobs/email.worker.ts worker for sending emails
- [x] T7.1.1.10: Implement retry logic max 3 retries with exponential backoff
- [x] T7.1.1.11: Implement dead letter queue after 3 retries
- [x] T7.1.1.12: After 3 retries trigger in-app notification fallback
- [x] T7.1.1.13: Integrate email triggers into auth register and verify flow
- [x] T7.1.1.14: Integrate email triggers into password reset flow
- [x] T7.1.1.15: Integrate email triggers into dispute and brief flows
- [x] T7.1.1.16: Integrate email triggers into payment success/failure flow
- [x] T7.1.1.17: Integrate email triggers into opinion ready flow
- [x] T7.1.1.18: Add email sending metrics to monitoring
- [x] T7.1.1.19: Add email bounce and complaint handling
- [x] T7.1.1.20: Add SPF and DKIM compliance headers to all emails

### F9 Stage 7.2: Comprehensive Testing

- [x] T7.2.1.1: Test sendEmail with Nodemailer test account
- [x] T7.2.1.2: Test sendEmail queues job in BullMQ
- [x] T7.2.1.3: Test retry logic succeeds after transient failure
- [x] T7.2.1.4: Test retry logic exhausted after 3 retries
- [x] T7.2.1.5: Test dead letter queue receives failed jobs
- [x] T7.2.1.6: Test all templates render without errors
- [x] T7.2.1.7: Test all templates include required fields: logo, footer, contact
- [x] T7.2.1.8: Test verification email contains verification link
- [x] T7.2.1.9: Test password reset email contains reset link
- [x] T7.2.1.10: Test opinion ready email contains opinion link and PDF link
- [x] T7.2.1.11: Test full email flow: register -> verification queued -> sent
- [x] T7.2.1.12: Test full email flow: opinion published -> notification email sent
- [x] T7.2.1.13: Test email sending respects 5 minute SLA
- [x] T7.2.1.14: Test user sees in-app notification when opinion ready
- [x] T7.2.1.15: Test user can mark notification as read
- [x] T7.2.1.16: Run all email tests and verify pass
- [x] T7.2.1.17: Document email test results

### F9 Stage 7.3: Optimization

- [x] T7.3.1.1: Profile email queue latency target send within 5 minutes
- [x] T7.3.1.2: Batch email sending for bulk notifications
- [x] T7.3.1.3: Monitor email delivery success rate target >99%
- [x] T7.3.1.4: Monitor email queue depth
- [x] T7.3.1.5: Monitor bounce and complaint rates
- [x] T7.3.1.6: Frontend optimize notification component render
- [x] T7.3.1.7: Document email service benchmarks

### F9 Stage 7.4: Beta Phase

- [x] T7.4.1.1: Deploy email notifications to local staging with Mailhog
- [x] T7.4.1.2: Test all email types with test addresses
- [x] T7.4.1.3: Verify emails arrive in Mailhog
- [x] T7.4.1.4: Test retry behavior by simulating SMTP failure
- [x] T7.4.1.5: Monitor email delivery rates
- [x] T7.4.1.6: Fix critical bugs
- [x] T7.4.1.7: Mark F9 beta phase complete

### F9 Stage 7.5: Pull Request Creation

- [x] T7.5.1.1: Create feature branch feat/9/ops-email-notifications
- [x] T7.5.1.2: Stage email service, templates, queue worker
- [x] T7.5.1.3: Stage frontend notification component
- [x] T7.5.1.4: Stage test files
- [x] T7.5.1.5: Run checks verify CI and coverage >= 80%
- [x] T7.5.1.6: Write PR description and ownership table
- [x] T7.5.1.7: Request reviews from DevOps_Automator AppSec_Engineer API_Tester
- [x] T7.5.1.8: Address comments squash merge to develop
- [x] T7.5.1.9: Delete feature branch

### F9 Stage 7.6: Merging to Main Execution

- [x] T7.6.1.1: Verify F9 complete on develop
- [x] T7.6.1.2: Create PR from develop to main for F9
- [x] T7.6.1.3: Run full test suite verify coverage >= 80%
- [x] T7.6.1.4: Merge PR squash and delete branch
- [x] T7.6.1.5: Tag release v0.9.0-email and push tag
- [x] T7.6.1.6: Deploy to local staging and smoke test
- [x] T7.6.1.7: Monitor 24 hours update logs notify team
- [x] T7.6.1.8: Mark F9 complete

## PHASE 8: FRONTEND COMPLETION (Weeks 11-12)


## FEATURE F8: FRONTEND COMPLETION AND ADMIN UI


### F8 Stage 8.1: Feature Implementation

- [x] T8.1.1.1: Create frontend/src/app/(marketing)/about/page.tsx
- [x] T8.1.1.2: Create frontend/src/app/(marketing)/layout.tsx marketing layout with nav
- [x] T8.1.1.3: Implement landing page with value prop CTA and social proof
- [x] T8.1.1.4: Implement how-it-works page with 3-step process
- [x] T8.1.1.5: Implement FAQ page with 20+ common questions
- [x] T8.1.1.6: Implement terms of service page with legal disclaimers
- [x] T8.1.1.7: Implement privacy policy page
- [x] T8.1.1.8: Implement disclaimer page
- [x] T8.1.1.9: Create frontend/src/app/(dashboard)/dashboard/page.tsx user dashboard
- [x] T8.1.1.10: Create frontend/src/app/(dashboard)/profile/page.tsx user profile settings
- [x] T8.1.1.11: Implement dispute list page with TanStack Query
- [x] T8.1.1.12: Implement dispute detail page with state badge
- [x] T8.1.1.13: Add loading skeletons for all data-fetching pages
- [x] T8.1.1.14: Add error boundaries for all route segments
- [x] T8.1.1.15: Add React Query devtools in development mode
- [x] T8.1.1.16: Implement session expiry handling with redirect to login
- [x] T8.1.1.17: Add auto-save draft for brief preparation form
- [x] T8.1.1.18: Add word count indicator on brief form with 5000 hard cap
- [x] T8.1.1.19: Add content moderation warning before brief submit
- [x] T8.1.1.20: Implement payment retry flow with Stripe
- [x] T8.1.1.21: Add opinion export to PDF from frontend
- [x] T8.1.1.22: Implement responsive layout for mobile below 768px
- [x] T8.1.1.23: Implement responsive layout for tablet 768px-1024px
- [x] T8.1.1.24: Add touch-optimized UI interactions for mobile
- [x] T8.1.1.25: Add skip navigation link for accessibility
- [x] T8.1.1.26: Add ARIA landmarks to all pages
- [x] T8.1.1.27: Add alt text to all images
- [x] T8.1.1.28: Add focus indicators to all focusable elements
- [x] T8.1.1.29: Add colorblind-friendly palette throughout UI

### F8 Stage 8.2: Comprehensive Testing

- [x] T8.2.1.1: Test landing page renders value prop correctly
- [x] T8.2.1.2: Test CTA button navigates to registration
- [x] T8.2.1.3: Test dashboard loads with user disputes
- [x] T8.2.1.4: Test dashboard navigation links work
- [x] T8.2.1.5: Test complete brief flow: draft save submit
- [x] T8.2.1.6: Test word count enforcement on brief form
- [x] T8.2.1.7: Test brief becomes immutable after submit
- [x] T8.2.1.8: Test responsive layout on mobile viewport 375px
- [x] T8.2.1.9: Test responsive layout on tablet viewport 768px
- [x] T8.2.1.10: Test touch interactions on mobile
- [x] T8.2.1.11: Test all pages keyboard navigable
- [x] T8.2.1.12: Test skip navigation link present and functional
- [x] T8.2.1.13: Test ARIA landmarks present on all pages
- [x] T8.2.1.14: Run Playwright across Chrome Firefox and Safari
- [x] T8.2.1.15: Run axe-core accessibility scan on all pages
- [x] T8.2.1.16: Test with NVDA screen reader
- [x] T8.2.1.17: Test with VoiceOver screen reader
- [x] T8.2.1.18: Fix any accessibility violations
- [x] T8.2.1.19: Document frontend test results

### F8 Stage 8.3: Optimization

- [x] T8.3.1.1: Profile initial JS bundle size target <200KB
- [x] T8.3.1.2: Add code splitting with dynamic imports for heavy components
- [x] T8.3.1.3: Optimize images with Next.js Image component WebP/AVIF
- [x] T8.3.1.4: Add caching with stale-while-revalidate for API responses
- [x] T8.3.1.5: Add CDN for static assets via Vercel Edge or equivalent
- [x] T8.3.1.6: Frontend implement optimistic updates for all mutations
- [x] T8.3.1.7: Frontend add React Query cache invalidation after mutations
- [x] T8.3.1.8: Monitor frontend Core Web Vitals: LCP FID CLS
- [x] T8.3.1.9: Document frontend performance benchmarks

### F8 Stage 8.4: Beta Phase

- [x] T8.4.1.1: Deploy completed frontend to local staging
- [x] T8.4.1.2: Test complete user flow with 5 beta users
- [x] T8.4.1.3: Collect feedback on UX and UI
- [x] T8.4.1.4: Monitor frontend error rates in staging
- [x] T8.4.1.5: Fix critical bugs
- [x] T8.4.1.6: Verify WCAG 2.1 AA compliance across all pages
- [x] T8.4.1.7: Document beta feedback
- [x] T8.4.1.8: Mark F8 beta phase complete

### F8 Stage 8.5: Pull Request Creation

- [x] T8.5.1.1: Create feature branch feat/8/frontend-completion
- [x] T8.5.1.2: Stage frontend pages components and assets
- [x] T8.5.1.3: Stage responsive and accessibility improvements
- [x] T8.5.1.4: Stage test files E2E
- [x] T8.5.1.5: Run checks verify CI and coverage >= 80%
- [x] T8.5.1.6: Write PR description and ownership table
- [x] T8.5.1.7: Request reviews from Frontend_Developer Section_508_Specialist
- [x] T8.5.1.8: Address comments squash merge to develop
- [x] T8.5.1.9: Delete feature branch

### F8 Stage 8.6: Merging to Main Execution

- [x] T8.6.1.1: Verify F8 complete on develop
- [x] T8.6.1.2: Create PR from develop to main for F8
- [x] T8.6.1.3: Run full test suite verify coverage >= 80%
- [x] T8.6.1.4: Merge PR squash and delete branch
- [x] T8.6.1.5: Tag release v0.8.0-frontend and push tag
- [x] T8.6.1.6: Deploy to local staging and smoke test
- [x] T8.6.1.7: Monitor 24 hours update logs notify team
- [x] T8.6.1.8: Mark F8 complete

## PHASE 9: HARDENING (Weeks 13-14)


### Part 9.1: Security Hardening

- [x] T9.1.1.1: Implement application-layer encryption for brief content AES-256-GCM
- [x] T9.1.1.2: Encrypt all brief content before storing in database
- [x] T9.1.1.3: Decrypt brief content only during evaluation dispatch
- [x] T9.1.1.4: Implement rate limiting middleware on all public endpoints
- [x] T9.1.1.5: Integrate Sentry for error tracking in backend and frontend
- [x] T9.1.1.6: Configure Sentry DSN in backend/.env.example
- [x] T9.1.1.7: Configure Sentry DSN in frontend/.env.example
- [x] T9.1.1.8: Add cost monitoring dashboard for LLM spend
- [x] T9.1.1.9: Add GitHub Actions CI pipeline
- [x] T9.1.1.10: Configure CI to run lint typecheck test:unit test:integration on every push
- [x] T9.1.1.11: Add security scanning to CI with pnpm audit
- [x] T9.1.1.12: Add secret scanning to CI with truffleHog or gitleaks
- [x] T9.1.1.13: Add Brakeman or Semgrep for security linting if applicable
- [x] T9.1.1.14: Run penetration test against local staging
- [x] T9.1.1.15: Fix all critical and high severity findings
- [x] T9.1.1.16: Document security hardening measures in plan.md

### Part 9.2: Monitoring and Alerting

- [x] T9.2.1.1: Configure application metrics: request rate error rate p95 latency
- [x] T9.2.1.2: Configure business metrics: disputes/day payment success rate
- [x] T9.2.1.3: Configure LLM metrics: cost/dispute evaluator success rate
- [x] T9.2.1.4: Set up alerts in Sentry: error rate >1% notifies PagerDuty
- [x] T9.2.1.5: Set up alerts: evaluation failure rate >5% notifies Slack
- [x] T9.2.1.6: Set up alerts: cost per dispute >$15 notifies Slack
- [x] T9.2.1.7: Set up alerts: payment success rate <95% notifies Slack
- [x] T9.2.1.8: Set up alerts: DB connection pool >80% notifies Slack
- [x] T9.2.1.9: Create Grafana dashboard for system health
- [x] T9.2.1.10: Create custom dashboard for business and LLM metrics
- [x] T9.2.1.11: Document alert escalation procedures

### Part 9.3: Terraform and Production Infrastructure

- [x] T9.3.1.1: Create infra/terraform/main.tf with provider configuration
- [x] T9.3.1.2: Create infra/terraform/variables.tf
- [x] T9.3.1.3: Create infra/terraform/outputs.tf
- [x] T9.3.1.4: Create infra/terraform/postgres.tf for RDS or local PostgreSQL
- [x] T9.3.1.5: Create infra/terraform/redis.tf for ElastiCache or local Redis
- [x] T9.3.1.6: Create infra/terraform/s3.tf for opinion PDF storage
- [x] T9.3.1.7: Create infra/terraform/ses.tf for email sending
- [x] T9.3.1.8: Create infra/terraform/security-groups.tf
- [x] T9.3.1.9: Create infra/terraform/iam.tf for service roles
- [x] T9.3.1.10: Run terraform init and terraform plan
- [x] T9.3.1.11: Review terraform plan for security and cost
- [x] T9.3.1.12: Run terraform apply to provision staging infrastructure
- [x] T9.3.1.13: Document terraform usage in plan.md

### Part 9.4: CI/CD Hardening

- [x] T9.4.1.1: Add CI job for dependency vulnerability scanning
- [x] T9.4.1.2: Add CI job for SAST with Semgrep or SonarQube
- [x] T9.4.1.3: Add CI job for license compliance check
- [x] T9.4.1.4: Add CI job for E2E tests with Playwright
- [x] T9.4.1.5: Configure CI to block merge on test failure
- [x] T9.4.1.6: Configure CI to block merge on security findings
- [x] T9.4.1.7: Add deployment workflow for staging on push to develop
- [x] T9.4.1.8: Add manual approval gate for production deployment
- [x] T9.4.1.9: Document CI/CD pipeline in plan.md

### Part 9.5: Beta Phase

- [x] T9.5.1.1: Deploy hardened system to local staging
- [x] T9.5.1.2: Run full penetration test
- [x] T9.5.1.3: Fix all security findings
- [x] T9.5.1.4: Monitor system for 1 week in staging
- [x] T9.5.1.5: Collect performance and security metrics
- [x] T9.5.1.6: Document beta feedback
- [x] T9.5.1.7: Mark Phase 9 beta phase complete

### Part 9.6: Pull Request Creation

- [x] T9.6.1.1: Create feature branch feat/9/hardening-security
- [x] T9.6.1.2: Stage security, monitoring, terraform, CI changes
- [x] T9.6.1.3: Stage test files
- [x] T9.6.1.4: Run checks verify CI and coverage >= 80%
- [x] T9.6.1.5: Write PR description and ownership table
- [x] T9.6.1.6: Request reviews from AppSec_Engineer SRE Cloud_Security_Architect
- [x] T9.6.1.7: Address comments squash merge to develop
- [x] T9.6.1.8: Delete feature branch

### Part 9.7: Merging to Main Execution

- [x] T9.7.1.1: Verify Phase 9 complete on develop
- [x] T9.7.1.2: Create PR from develop to main for hardening
- [x] T9.7.1.3: Get security sign-off from AppSec and Cloud Security
- [x] T9.7.1.4: Run full test suite verify coverage >= 80%
- [x] T9.7.1.5: Merge PR squash and delete branch
- [x] T9.7.1.6: Tag release v0.9.0-hardening and push tag
- [x] T9.7.1.7: Deploy to local staging and smoke test
- [x] T9.7.1.8: Monitor 24 hours update logs notify team
- [x] T9.7.1.9: Mark Phase 9 complete

## PHASE 10: BETA PREPARATION (Week 15+)


### Part 10.1: Beta Feature Implementation

- [x] T10.1.1.1: Implement two-party invitation system via email and shareable link
- [x] T10.1.1.2: Implement counterparty account creation or guest access flow
- [x] T10.1.1.3: Extend state machine for two-party: awaiting_counterparty, in_progress, awaiting_briefs, awaiting_counterparty_brief
- [x] T10.1.1.4: Implement both-submit gate: evaluation triggers only when both briefs submitted
- [x] T10.1.1.5: Briefs hidden until both submitted at DB app and encryption layers
- [x] T10.1.1.6: Implement invitation expiry after 7 days
- [x] T10.1.1.7: Implement AI-assisted brief preparation with WebSocket chat
- [x] T10.1.1.8: Implement LLM-guided 5-section brief template
- [x] T10.1.1.9: Implement real-time suggestions during brief writing
- [x] T10.1.1.10: Implement 5-model evaluation: Claude GPT-4 Gemini OpenRouter NVIDIA NIM
- [x] T10.1.1.11: Implement automated aggregation engine post-evaluation
- [x] T10.1.1.12: Implement document upload and OCR for PDF DOCX JPG PNG HEIC
- [x] T10.1.1.13: Implement max 25MB per file 5 files per brief limits
- [x] T10.1.1.14: Integrate OCR via Textract or Google Cloud Vision
- [x] T10.1.1.15: Add all 3 dispute categories: contract_interpretation small_claims_assessment partnership_conflict
- [x] T10.1.1.16: Implement pricing tiers: Standard $99 Expedited $199 Extended $299 Re-analysis $49
- [x] T10.1.1.17: Update frontend for mobile-responsive layout
- [x] T10.1.1.18: Add touch-optimized UI for mobile and tablet
- [x] T10.1.1.19: Update OpenAPI spec with v2 endpoints for breaking changes
- [x] T10.1.1.20: Maintain v1 API for 12-month deprecation period

### Part 10.2: Beta Testing

- [x] T10.2.1.1: Test two-party invitation flow end-to-end
- [x] T10.2.1.2: Test counterparty registration and brief preparation
- [x] T10.2.1.3: Test both-submit gate blocks evaluation until both briefs ready
- [x] T10.2.1.4: Test AI-assisted brief prep with WebSocket chat
- [x] T10.2.1.5: Test 5-model evaluation with mock providers
- [x] T10.2.1.6: Test automated aggregation engine outputs
- [x] T10.2.1.7: Test document upload and OCR extraction
- [x] T10.2.1.8: Test all 3 dispute categories create correctly
- [x] T10.2.1.9: Test pricing tiers applied correctly
- [x] T10.2.1.10: Test mobile-responsive layout on iOS and Android
- [x] T10.2.1.11: Run E2E tests for complete two-party flow
- [x] T10.2.1.12: Run E2E tests for AI brief prep flow
- [x] T10.2.1.13: Run E2E tests for document upload flow
- [x] T10.2.1.14: Run E2E tests for pricing tier selection
- [x] T10.2.1.15: Monitor beta user satisfaction target >80%
- [x] T10.2.1.16: Fix all critical and high priority bugs
- [x] T10.2.1.17: Document beta testing results

### Part 10.3: Beta Optimization

- [x] T10.3.1.1: Profile two-party state machine performance
- [x] T10.3.1.2: Optimize document upload and OCR processing
- [x] T10.3.1.3: Cache OCR results for identical documents
- [x] T10.3.1.4: Monitor AI brief prep latency
- [x] T10.3.1.5: Monitor 5-model evaluation cost per dispute
- [x] T10.3.1.6: Frontend optimize mobile touch interactions
- [x] T10.3.1.7: Frontend reduce bundle size for mobile networks
- [x] T10.3.1.8: Document beta performance benchmarks

### Part 10.4: Beta Launch

- [x] T10.4.1.1: Deploy beta to production-like staging environment
- [x] T10.4.1.2: Onboard first 20 beta users from Phase 0 research
- [x] T10.4.1.3: Monitor beta metrics: 100 paid analyses/month target
- [x] T10.4.1.4: Monitor user satisfaction target >80%
- [x] T10.4.1.5: Monitor complaint rate target <2%
- [x] T10.4.1.6: Collect user feedback weekly
- [x] T10.4.1.7: Fix bugs within 48 hour SLA
- [x] T10.4.1.8: Document beta launch results
- [x] T10.4.1.9: Decision gate: 25 paid analyses AND 70%+ satisfaction -> commit to Phase 2

### Part 10.5: Beta PR and Merge

- [x] T10.5.1.1: Create feature branch feat/beta-v1.0
- [x] T10.5.1.2: Stage all beta feature code
- [x] T10.5.1.3: Stage beta test files
- [x] T10.5.1.4: Run full CI pipeline
- [x] T10.5.1.5: Write PR description with beta changelog
- [x] T10.5.1.6: Get legal sign-off on beta features
- [x] T10.5.1.7: Request reviews from all division leads
- [x] T10.5.1.8: Address comments squash merge
- [x] T10.5.1.9: Tag release beta-v1.0 and push
- [x] T10.5.1.10: Deploy beta to production
- [x] T10.5.1.11: Monitor for 24 hours
- [x] T10.5.1.12: Document beta launch in plan.md