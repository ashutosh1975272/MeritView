# MeritView — Final Implementation Plan

## 0. Architecture & Decoupling Rules (SINGLE SOURCE OF TRUTH)

This section overrides any implied coupling elsewhere in this document. Frontend and backend are treated as **independent products** that communicate only through versioned APIs and a shared schema contract.

### 0.1 Hard Boundaries

- Frontend **must not** import any backend service, route, or business-logic module.
- Backend **must not** import any UI, page, component, or client-side state module.
- The only shared artifacts between the two sides are:
- The OpenAPI spec (`backend/docs/openapi.yaml` — generated types consumed by frontend at build time)
- All `.env` values remain strictly scoped: backend reads `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, Stripe keys, etc.; frontend reads only `NEXT_PUBLIC_*` values.

### 0.2 Contract-First Workflow

- The **API surface is defined first** in `backend/docs/openapi.yaml`.
- Frontend generates its API client and TypeScript types from this spec during its own build process (no shared package, no monorepo tooling).
- Any PR that adds, changes, or removes an API endpoint **must** update OpenAPI before changing implementation code — in the `backend/docs/openapi.yaml` file.
- Breaking changes get a new major segment (`/v2/`); backwards-compatible changes are additive only.

### 0.3 Strict Three-Folder Isolation

The project is organized into exactly three independent subdirectories with zero shared code, no monorepo workspaces, and no top-level shared packages. Each directory is a completely self-contained unit with its own `package.json`, dependency tree, and `node_modules`.

```text
meritview/
├── frontend/
│   ├── package.json         # Next.js, React, Tailwind, etc.
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   ├── components/      # Shared UI primitives (scoped to frontend only)
│   │   ├── lib/             # Utilities, API client
│   │   ├── hooks/           # Custom React hooks
│   │   └── stores/          # Client-side state (zustand)
│   ├── public/
│   └── .env.example         # NEXT_PUBLIC_* vars only
├── backend/
│   ├── package.json         # Express, Prisma, Stripe, etc.
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, validation, errors
│   │   ├── providers/       # LLM provider implementations
│   │   ├── jobs/            # Background jobs
│   │   ├── config/          # App configuration
│   │   ├── utils/           # Backend utilities
│   │   ├── db/              # Database client setup
│   │   ├── prompts/         # Versioned prompt text files (scoped to backend only)
│   │   └── index.ts         # Entry point
│   ├── Dockerfile
│   └── .env.example         # SERVER-SIDE vars only (DATABASE_URL, JWT_SECRET, etc.)
└── infra/
    ├── docker-compose.yml   # Local dev: postgres, redis
    ├── terraform/           # IaC for production
    ├── scripts/             # Deploy/bootstrap scripts
    └── .gitignore
```

**There is no root-level `package.json`, no `turbo.json`, no `pnpm-workspace.yaml`, and no top-level `packages/` directory.** Frontend and backend communicate exclusively through versioned HTTP APIs. All shared contracts are governed by an OpenAPI specification stored in `backend/docs/openapi.yaml`; the frontend generates its API types and client from that spec during its own build step.

### 0.4 Shared Code and Dependency Rules

- **Zero shared dependencies.** Frontend `node_modules` and backend `node_modules` are completely independent. There is no linked workspace, no `npm link`, and no access to sibling directory files.
- **Frontend may not import** any backend code, Prisma client, service, middleware, or type defined outside `frontend/`.
- **Backend may not import** any React component, page, UI library, or frontend-specific type defined outside `backend/`.
- **Prompt templates and LLM abstractions** live exclusively inside `backend/src/prompts/` and `backend/src/providers/`. They are never imported by frontend.
- **UI primitives** are defined inside `frontend/src/components/` and never imported by backend.
- **API contract** is the single source of truth. Backend defines it in `backend/docs/openapi.yaml`. Frontend consumes a generated output during its own build process. Both sides evolve independently.
- Adding any new cross-service dependency requires explicit architecture review. Do not introduce shared packages, symlinks, or monorepo tools for convenience.

### 0.5 Environment Variable Split

Backend `.env.example` (server side):
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/meritview
REDIS_URL=redis://localhost:6379
JWT_SECRET=<64-char-min>
GROQ_API_KEY=
GEMINI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
S3_BUCKET=
AWS_REGION=us-east-1
FROM_EMAIL=noreply@meritview.app
SENTRY_DSN=
PORT=3001
```

Frontend `.env.example` (browser-safe):
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PK=
```

## 1. Executive Summary & Document Control

MeritView is a web-based AI decision-support platform that analyzes single-party contract disputes using a 3-model LLM evaluation pipeline (Groq Llama 3 70B, Groq Mixtral 8x7B, Gemini 1.5 Pro) with manual aggregation by an internal team. The platform collects $49 per analysis at brief submission, delivers structured opinions with PDF export, and operates under explicit "decision support, not legal advice" positioning to avoid UPL regulatory risk.

**Document Control**

| Field | Value |
|-------|-------|
| Version | 1.0.0 |
| Status | Active Source of Truth |
| Gate | Pre-Building Validation (Part 1) must pass before Phase 1 |
| Modal Checks | Each section maps to agency agents; every feature has explicit ownership |
| Change Log | See Audit Fixes and Part 52 |

**Scope**

- MVP: single-party, contract_interpretation only, $49 flat fee, web-only.
- Beta (Phase 2): two-party mode, AI-assisted brief prep, document upload/OCR, 5-model evaluation, automated aggregation, mobile-responsive, 3 dispute categories, pricing tiers.
- Phase 3+: B2B white-label, insurance, HR, API access.

---

## Locked Decisions

1. MVP = single-party only; two-party mode in Phase 2.
2. Auth = email + password only. No social, guest, or 2FA.
3. Category = contract_interpretation only.
4. Brief = manual text entry. No AI prep, no document upload.
5. Evaluation = 3-model via Groq API + Gemini API.
6. Aggregation = manual by internal team for first 50 disputes.
7. Platform = web-only, desktop-first.
8. Pricing = $49 flat fee.
9. Payment = collected at brief submission. Failure keeps dispute in draft.
10. Success criteria = 25 paid analyses, 70%+ satisfaction.

---

## Tech Stack (Pinned Versions)

- Runtime: Node.js 20 LTS
- Package manager: pnpm 8.x (independent frontend + backend)
- Frontend: Next.js 14.2.x + React 18.3.x + TypeScript 5.4.x
- Styling: Tailwind CSS 3.4.x
- State: @tanstack/react-query (server state), zustand (client state)
- Backend: Node.js + Express 4.19.x + TypeScript
- Database: PostgreSQL 16.x
- Cache: Redis 7.2.x
- ORM: Prisma 5.14.x
- Auth: Custom JWT (no external auth provider in MVP)
- Payments: Stripe SDK 14.x
- Email: Nodemailer 6.9.x (local dev), AWS SES SDK 3.x (prod)
- PDF: Puppeteer 21.x
- LLM: Groq SDK 1.6.x + Google Generative AI SDK 0.21.x
- Monitoring: Sentry 7.x
- Testing: Vitest 1.6.x (unit), Playwright 1.41.x (E2E)
- CI: GitHub Actions
- Hosting: Vercel (frontend), AWS ECS/EKS (backend)
- Infrastructure: Terraform 1.7.x
- Container: Docker 24.x

---

## LLM Provider Abstraction

All LLM calls go through a clean interface. No provider-specific code in business logic.

### Provider Interface

```typescript
interface LLMProvider {
  readonly providerId: string;
  readonly modelId: string;
  readonly capabilities: ProviderCapabilities;
  /**
   * Capability flags for routing decisions.
   * Examples: context window size, streaming support, tool calling, data residency.
   */
  capabilities: {
    contextWindow: number;
    maxOutputTokens: number;
    streaming: boolean;
    systemPrompt: boolean;
    toolCalling: boolean;
    dataResidency: string[];
    noTrainingGuarantee: boolean;
  };
  generateCompletion(prompt: Prompt): Promise<CompletionResult>;
  generateStreamingCompletion(prompt: Prompt): AsyncIterable<CompletionChunk>;
  healthCheck(): Promise<HealthStatus>;
  estimateCost(prompt: Prompt): CostEstimate;
  hasNoTrainingGuarantee(): boolean;
  hasDataResidency(region: string): boolean;
}
```

### MVP Provider Implementations

- GroqProvider (Groq API)
- GeminiProvider (Gemini API)

### Phase 2 Provider Implementations

- OpenRouterProvider
- NvidiaNimProvider

---


---

## 3. Agency Agent Roster

The following agents are assigned ownership and review responsibility across all MeritView build phases. Agents marked with ★ are primary owners; others are reviewers or validators.

### 3.1 Engineering Division (Primary Build & Integration)

| Agent | Specialty |
|-------|-----------|
| AI Data Remediation Engineer | Self-healing data pipelines via local SLMs and semantic clustering. |
| AI Engineer | ML model development, deployment, AI integration into production systems. |
| API Platform Engineer | Public/partner APIs — contract-first, versioning, gateway, SDK generation, DX. |
| Autonomous Optimization Architect | Shadow-testing APIs with cost/security guardrails. |
| Backend Architect | Scalable system design, database architecture, API development, cloud. |
| CMS Developer | Drupal/WordPress themes, plugins/modules, content architecture. |
| Codebase Onboarding Engineer | Fast developer onboarding, read-only codebase exploration, factual explanation. |
| Code Reviewer | Constructive code review, security, maintainability, PR reviews. |
| Database Optimizer | Schema design, query optimization, indexing strategies, PostgreSQL/MySQL tuning. |
| Database Reliability Engineer | HA/replication, automated failover, backup, zero-downtime schema migrations. |
| Data Engineer | Data pipelines, lakehouse architecture, ETL/ELT, Apache Spark, dbt. |
| Desktop App Engineer | Electron/Tauri — secure IPC, code signing, auto-update, native integration. |
| Developer Tooling Engineer | CLI & developer tooling, internal DX, build/dev workflows. |
| DevOps Automator | Infrastructure automation, CI/CD pipeline development, cloud operations. |
| Drupal Performance Engineer | Drupal Core Web Vitals, caching, DB tuning, render pipeline. |
| Drupal Shopping Cart Engineer | Drupal Commerce — catalog, payments, checkout, orders. |
| Email Intelligence Engineer | Email parsing, MIME extraction, structured data for AI agents. |
| Embedded Firmware Engineer | Bare-metal/RTOS — ESP32/STM32/Nordic, FreeRTOS, Zephyr. |
| Feishu Integration Developer | Feishu/Lark Open Platform, bots, workflows, Bitable, SSO. |
| Filament Optimization Specialist | Restructuring Filament PHP admin interfaces for faster, cleaner workflows. |
| FinOps Engineer | Cloud cost engineering — cost allocation, rightsizing, unit economics. |
| Frontend Developer | React/Vue/Angular, UI implementation, performance, Core Web Vitals. |
| GaussDB Expert Engineer | Huawei GaussDB OLTP — schema design, distributed tables, performance. |
| Git Workflow Master | Branching strategies, conventional commits, rebasing, worktrees, CI-friendly branches. |
| Internationalization Engineer | ICU MessageFormat, RTL/bidi, CLDR formatting, pseudo-localization. |
| Identity & Access Engineer | OAuth 2.0/OIDC, SSO (SAML/OIDC), SCIM, passkeys/WebAuthn, RBAC/ABAC. |
| Incident Response Commander | Production incident management, post-mortems, on-call process design. |
| IoT Fleet Engineer | Device provisioning, MQTT/telemetry, staged OTA, edge compute, observability. |
| IT Service Manager | ITIL 4 — service catalog, incident/problem management, SLA governance. |
| Minimal Change Engineer | Minimum-viable diffs — fixes only what was asked, refuses scope creep. |
| Mobile App Builder | Native iOS/Android, React Native, Flutter, platform-specific optimizations. |
| Mobile Release Engineer | iOS/Android release — signing, provisioning, fastlane, phased rollouts. |
| Multi-Agent Systems Architect | Multi-agent pipeline design — topology, context, trust, failure recovery. |
| Network Engineer | Cisco IOS/IOS-XE, Juniper Junos, Palo Alto PAN-OS routing, switching, firewalling. |
| OrgScript Engineer | OrgScript grammar & AST validation, business-logic definitions. |
| Payments & Billing Engineer | Stripe/Adyen/Braintree, idempotent payment flows, webhook processing, SCA/3DS. |
| Privacy Engineer | PII discovery, data minimization, consent enforcement, DSAR/deletion, retention automation. |
| Prompt Engineer | LLM prompt design & optimization — reliable, production-grade AI behaviors. |
| RAG Pipeline Engineer | Production RAG — chunking, retrieval quality, hybrid search, re-ranking, eval-driven. |
| Rapid Prototyper | Fast POC development, MVPs, quick proof-of-concepts, hackathon projects. |
| Realtime Collaboration Engineer | WebSocket/SSE, CRDT/OT, offline-first sync, reconnect-safe protocols. |
| Search Relevance Engineer | Elasticsearch/OpenSearch — index design, BM25, hybrid lexical+vector retrieval. |
| Section 508 Accessibility Specialist | Section 508/WCAG 2.0/2.1 AA, ARIA, screen reader testing, VPAT/ACR. |
| Senior Developer | Laravel/Livewire/FluxUI, advanced CSS, Three.js, premium full-stack. |
| Software Architect | System design, DDD, architectural patterns, trade-off analysis, scalable systems. |
| Solidity Smart Contract Engineer | EVM contracts, gas optimization, DeFi protocols, security-first contract design. |
| SRE | SLOs, error budgets, observability, chaos engineering, toil reduction. |
| Technical Writer | Developer docs, API reference, README, tutorials, clear accurate documentation. |
| USWDS Developer | U.S. Web Design System, design tokens, accessible-by-default, responsive government UI. |
| Video Streaming Engineer | HLS/DASH, ffmpeg ladders, CMAF low-latency, DRM, CDN delivery, QoE. |
| Voice AI Integration Engineer | Speech-to-text pipelines, Whisper, ASR, speaker diarization, structured transcripts. |
| WebAssembly Engineer | Rust/C++ to Wasm, JS interop, WASI, component model, near-native performance. |
| WeChat Mini Program Developer | WeChat ecosystem, Mini Programs, payment integration, WeChat API. |
| WordPress Performance Engineer | WordPress Core Web Vitals, Redis/Memcached, WP_Query, Transients API. |
| WordPress Shopping Cart Engineer | WooCommerce — catalog, payments, checkout, orders, conversion optimization. |

### 3.2 Security Division (Secure-by-Design & Compliance)

| Agent | Specialty |
|-------|-----------|
| AI-Generated Code Security Auditor | AI/vibe-coded app security review — hardcoded secrets, broken RLS, prompt-injection sinks. |
| Application Security Engineer | SDLC security, SAST/DAST, secure code review, developer security education. |
| Security Architect | Threat modeling, secure-by-design, trust boundaries, defense-in-depth, risk reviews. |
| Blockchain Security Auditor | Smart contract audits, exploit analysis, formal verification, vulnerability detection. |
| Cloud Security Architect | Zero trust, cloud-native defense-in-depth, AWS/Azure/GCP infrastructure security. |
| Compliance Auditor | SOC 2, ISO 27001, HIPAA, PCI-DSS — readiness through certification. |
| Incident Responder | DFIR, breach investigation, threat containment, crisis response, post-mortems. |
| Penetration Tester | Authorized pentests, red team ops, vulnerability assessments, exploitation. |
| Secrets & Credential Hygiene Engineer | Secrets lifecycle — detection, vaulting, rotation, leak response. |
| Senior SecOps Engineer | Secrets scanning, secure-by-default submissions, defensive code-level security. |
| Threat Detection Engineer | SIEM rules, threat hunting, MITRE ATT&CK mapping, detection-as-code. |
| Threat Intelligence Analyst | Adversary tracking, campaign mapping, ATT&CK, actionable intelligence. |

### 3.3 Product Division (Lifecycle & Prioritization)

| Agent | Specialty |
|-------|-----------|
| Behavioral Nudge Engine | Behavioral psychology — software interaction cadences to maximize motivation. |
| Feedback Synthesizer | Collecting/analyzing/synthesizing user feedback into actionable insights. |
| Product Manager | Full product lifecycle — discovery, strategy, roadmap, GTM, outcome measurement. |
| Sprint Prioritizer | Agile sprint planning, feature prioritization, resource allocation, data-driven. |
| Trend Researcher | Market intelligence, competitive analysis, emerging trends, opportunity assessment. |

### 3.4 Project Management Division (Delivery & Coordination)

| Agent | Specialty |
|-------|-----------|
| Experiment Tracker | A/B tests, hypothesis validation, experiment design, systematic analysis. |
| Jira Workflow Steward | Jira-linked Git workflows, traceable commits, structured PRs, release-safe branches. |
| Meeting Notes Specialist | Structured meeting summaries — decisions, action items, open questions. |
| Project Shepherd | Cross-functional coordination, timeline management, stakeholder alignment. |
| Studio Operations | Day-to-day efficiency, process optimization, resource coordination. |
| Studio Producer | High-level orchestration, portfolio management, strategic alignment, resource allocation. |
| Senior Project Manager | Realistic scoping, task conversion, background processes, exact spec requirements. |

### 3.5 Testing Division (QA & Production Readiness)

| Agent | Specialty |
|-------|-----------|
| Accessibility Auditor | WCAG audits, assistive technology testing, inclusive design verification. |
| API Tester | API validation, integration testing, endpoint verification, contract tests. |
| Evidence Collector | Screenshot-based QA, visual proof, bug documentation, 3-5 issues default. |
| Performance Benchmarker | Performance testing, optimization, speed testing, load testing. |
| Reality Checker | Evidence-based certification, quality gates, production readiness, defaults to NEEDS WORK. |
| Test Automation Engineer | Playwright/Cypress E2E, flake elimination, CI parallelization, trace-driven debugging. |
| Test Results Analyzer | Test output analysis, quality insights, coverage reporting, actionable metrics. |
| Tool Evaluator | Technology assessment, tool selection, evaluating tools and platforms. |
| Workflow Optimizer | Process analysis, workflow improvement, efficiency gains, automation opportunities. |

---


---

## 4. The Five Pillars

The following protocols govern every phase of MeritView development, deployment, and operation. They are binding and enforced through agent ownership tables and review gates.

### 4.1 Agent-Centric Task Allocation Protocol

Every feature, bug, and infrastructure task is assigned a primary owner (★) and at least one reviewer from a complementary domain. Allocation rules:

- **Primary Owner**: Chosen from the division with the highest stake in the deliverable (e.g., Identity & Access Engineer for auth, Payments & Billing Engineer for Stripe integration).
- **Reviewers**: One from Security (AppSec, SecOps, or Cloud Security), one from Testing (API Tester or Test Automation Engineer), and one from the same or complementary Engineering specialty.
- **Escalation**: If the primary owner is blocked >4 hours, escalate to the division lead (Studio Producer for PM, SRE for infra).
- **Cross-Division Owners**: Product Manager defines acceptance criteria; Studio Producer tracks timeline; Project Shepherd coordinates handoffs.

**Allocation Table by Feature:**

| Feature | Primary Owner | Security Reviewer | Testing Reviewer |
|---------|---------------|------------------|------------------|
| F1 Auth | Identity & Access Engineer | AppSec Engineer | API Tester |
| F2 Disputes | Backend Architect | AppSec Engineer | API Tester |
| F3 Briefs | Senior Developer | Privacy Engineer | Test Automation Engineer |
| F4 Payments | Payments & Billing Engineer | AppSec Engineer | API Tester |
| F5 Evaluation | AI Engineer | Senior SecOps Engineer | Model QA Specialist |
| F6 Aggregation | Senior Developer | Security Architect | Reality Checker |
| F7 Opinions | Backend Architect | Cloud Security Architect | API Tester |
| F8 Admin | Backend Architect | Security Architect | API Tester |
| F9 Email | DevOps Automator | AppSec Engineer | API Tester |

### 4.2 Git & Branching Protocol

- **Branch naming**: `<type>/<ticket>/<agent-prefix>-<short-desc>`
  - Types: `feat`, `fix`, `hotfix`, `refactor`, `test`, `chore`, `docs`
  - Agent prefix: `eng-`, `sec-`, `test-`, `pm-` (e.g., `feat/42/eng-auth-jwt-refactor`)
- **Commit convention**: `<type>(<scope>): <subject>`
  - Scope: auth, disputes, briefs, payments, evaluation, aggregation, opinions, admin, email, infra
- **PR requirements**:
  1. All CI checks pass (lint, typecheck, unit tests).
  2. At least one approval from the primary owner's domain reviewer.
  3. Security review required for all `fix`, `hotfix`, and any PR touching `auth`, `payments`, `admin`, `briefs`.
  4. Test coverage delta reported; new code must not reduce overall coverage below 80%.
  5. Agent ownership table in PR description linking each changed file to its responsible agent.

### 4.3 Multi-Stage QA Loop

Every PR and every feature must pass all seven stages before merge to `develop`:

| Stage | Owner | Gate Criteria |
|-------|-------|---------------|
| 1. Unit Tests | API Tester + Test Automation Engineer | 80%+ coverage, all tests green |
| 2. Integration Tests | API Tester + Test Results Analyzer | DB-backed tests pass, no N+1 warnings |
| 3. E2E Tests | Test Automation Engineer + Evidence Collector | Playwright flows green, no flaky tests |
| 4. Security Review | AppSec Engineer + Senior SecOps Engineer | SAST/DAST clean, no secrets, no prompt-injection sinks, CORS correct |
| 5. Performance Review | Performance Benchmarker + SRE | P95 < target, no memory leaks, circuit breakers tested |
| 6. Accessibility Review | Accessibility Auditor + Section 508 Accessibility Specialist | axe-core clean, keyboard navigable, ARIA landmarks present |
| 7. Production Readiness | Reality Checker + Studio Producer | Evidence-based certification, monitoring configured, rollback plan documented |

Any stage failure blocks merge. Fixes re-enter at Stage 1.

### 4.4 Deployment & PR Workflow

```
main (production) ←── manual approval + tag
  └── develop (auto-deploys to staging)
       ├── feature/*
       ├── fix/*
       └── release/beta-v<semver>
```

1. Feature branches created from `develop`.
2. PR targets `develop` after Stage 1-7 QA loop passes.
3. `develop` deploys to staging automatically.
4. Integration/ soak test on staging with synthetic data.
5. For production: PR from `develop` to `main` with attorney/legal/compliance sign-off.
6. Merge using `gh pr merge --squash --delete-branch`.
7. Tag release: `git tag -a <version> -m "..." && git push origin <version>`.
8. Blue/green deployment on production; monitor for 24h before announcement.
9. Rollback triggers if: error rate >5%, payment success <90%, evaluation failure >20%, or data breach.

### 4.5 Phased Roadmap & Versioning

**Phases:**

- **Phase 0** (Week 0): Pre-Building Validation — thesis validation, legal review, first 20 users.
- **Phase 1** (Weeks 1-2): Foundation — independent frontend/backend, DB, auth, tests.
- **Phase 2** (Weeks 3-4): Core Dispute Flow — dispute CRUD, state machine, brief preparation.
- **Phase 3** (Week 5): Payments — Stripe integration, webhook, refunds.
- **Phase 4** (Weeks 6-7): Evaluation — 3-provider dispatch, retry, auto-refund.
- **Phase 5** (Week 8): Manual Aggregation — admin auth, dashboard, opinion creation.
- **Phase 6** (Week 9): Opinion Delivery — PDF, S3, SSE, notification.
- **Phase 7** (Week 10): Email — templates, async queue, retry.
- **Phase 8** (Weeks 11-12): Frontend — landing, auth flows, brief form, payment, opinion view, dashboard.
- **Phase 9** (Weeks 13-14): Hardening — encryption, rate limiting, monitoring, CI.
- **Phase 10** (Week 15+): Beta Preparation — two-party, AI brief prep, 5-model, document upload, pricing tiers.

**Versioning:**

- **API**: `/v1/` for MVP, `/v2/` for Phase 2 breaking changes, 12-month deprecation.
- **Prompts**: `<type>-v<major>.<minor>` (e.g., `eval-v3.2`, `agg-v2.1`). Immutable once created.
- **Features**: Semantic versioning per phase; `beta-v1.0`, `v1.0.0`, `v2.0.0`.

---


### Part 1: Pre-Building Validation (Week 0 — Mandatory Gate)

## PART 1: Pre-Building Validation (Week 0 — Mandatory Gate)

### Step 1.1: Manual Thesis Validation (1 week)

- Take 5–10 real disputes from your network.
- Write the single-party evaluation prompt.
- Call Groq API and Gemini API manually for each dispute.
- Synthesize outputs yourself.
- Decision gate: IF outputs are useful and consistent → proceed. IF NOT → stop and pivot.
- Cost: ~$50–100 in LLM API costs.

### Step 1.2: Legal Guidance (2–3 hours, $500–1,500)

- Tech lawyer reviews UPL positioning: "decision support, not legal advice."
- Confirms disclaimers, ToS, privacy policy are legally sound.
- Output: written confirmation + required disclaimers list + prohibited jurisdictions list.

### Step 1.3: First 20 Users Identified

- List 20 specific people with recent small contract disputes.
- For each: name, dispute type, estimated stakes, whether they'd pay $49.
- Reach out to 5: "Would you use a service that analyzes your dispute with AI for $49?"
- Decision gate: IF 20 specific people named AND 5 say they'd pay → proceed. IF NOT → fix marketing before building.

---

## 5. Feature Specifications & Agent Ownership Matrix

Each feature below retains every original endpoint, validation rule, edge case, schema, and checklist verbatim, annotated with explicit agent ownership.

### F1: User Account and Authentication

**Agent Ownership:**

| Primary Agent ★ | Reviewer Agents | Deliverable |
|-----------------|-----------------|-------------|
| Identity & Access Engineer | AppSec Engineer, Senior SecOps Engineer | JWT auth architecture, session security, idempotency key scopes |
| AppSec Engineer | Code Reviewer, Senior SecOps Engineer | Input validation (Zod), CSRF, rate limiting, CORS, security headers |
| Senior SecOps Engineer | Identity & Access Engineer, Security Architect | Auth middleware, audit logging, request_id generation |
| API Tester | Test Results Analyzer | Endpoint status-code matrix, rate-limit verification, token flow tests |
| Test Automation Engineer | Evidence Collector | Registration, login, password reset, logout flow automation |
| Accessibility Auditor | Section 508 Accessibility Specialist | Keyboard navigation on auth forms, ARIA labels, WCAG 2.1 AA |

### F1: User Account and Authentication

**Endpoints:**

- POST /v1/auth/register — Create account, send verification email.
- POST /v1/auth/verify-email — Confirm email ownership.
- POST /v1/auth/login — Authenticate, return tokens.
- POST /v1/auth/refresh — Exchange refresh token for new access token.
- POST /v1/auth/logout — Invalidate refresh token.
- POST /v1/auth/password-reset/request — Request password reset email.
- POST /v1/auth/password-reset/complete — Complete password reset.
- GET /v1/users/me — Get current user profile.
- PATCH /v1/users/me — Update display name.
- DELETE /v1/users/me — Initiate account deletion.

**Validation Rules:**

- Email: valid format, unique, max 255 chars.
- Password: min 8 chars, at least 1 letter, 1 number.
- display_name: optional, max 100 chars.
- accept_terms: required on registration, must be true.
- Email verification required before any authenticated action.
- Rate limit: 5 login attempts per minute per email.
- Rate limit headers included in all responses: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset.

**Edge Cases:**

1. Duplicate email → 409.
2. Login with unverified email → 403, prompt to verify.
3. Expired verification token → 400, offer resend.
4. Password reset for non-existent email → 200 (don't reveal).
5. Delete account with active disputes → 400, require resolution first.
6. Concurrent logins → allowed.

**Tests:**

- [ ] Register valid → 201, email sent.
- [ ] Register duplicate email → 409.
- [ ] Register weak password → 400.
- [ ] Verify valid token → 200.
- [ ] Verify expired token → 400.
- [ ] Login correct → 200, tokens returned.
- [ ] Login unverified → 403.
- [ ] Login wrong password → 401.
- [ ] Rate limit: 6 attempts in 1 min → 429.
- [ ] Refresh token → 200.
- [ ] Logout → 200.
- [ ] Password reset request → 200, email sent.
- [ ] Password reset valid token → 200.
- [ ] Delete no active disputes → 202.
- [ ] Delete with active disputes → 400.

---

### F2: Dispute Creation

**Agent Ownership:**

| Primary Agent ★ | Reviewer Agents | Deliverable |
|-----------------|-----------------|-------------|
| Backend Architect ★ | Software Architect, API Platform Engineer | API design, state machine enforcement, domain modeling |
| Software Architect | Backend Architect, Database Optimizer | Dispute aggregate design, bounded context, state transition rules |
| AppSec Engineer | Senior SecOps Engineer, Code Reviewer | Input validation, SQL injection prevention, rate limiting |
| API Tester | Test Results Analyzer | CRUD endpoint tests, 409 transition enforcement, rate-limit tests |

### F2: Dispute Creation

**Endpoint:**

- POST /v1/disputes — Create dispute.

**Request:**

```json
{
  "category": "contract_interpretation",
  "title": "Client refusing to pay $8,500 consulting invoice",
  "summary": "Client claims scope was exceeded; contract language is ambiguous",
  "estimated_stakes_usd": 8500
}
```

**Response (201 Created):**

```json
{
  "dispute": {
    "id": "disp_abc123",
    "category": "contract_interpretation",
    "title": "Client refusing to pay $8,500 consulting invoice",
    "summary": "Client claims scope was exceeded; contract language is ambiguous",
    "estimated_stakes_usd": 8500,
    "state": "draft",
    "created_at": "2026-05-17T10:30:00Z",
    "parties": [
      {
        "id": "party_001",
        "role": "initiator",
        "user_id": "user_8f3a1b2c",
        "brief_status": "not_started"
      }
    ]
  }
}
```

**Validation Rules:**

- User must be authenticated and email verified.
- category: must be "contract_interpretation".
- title: required, 5–200 chars.
- summary: optional, max 500 chars.
- estimated_stakes_usd: optional, must be positive.
- No counterparty field in MVP.
- State on creation: "draft".

**MVP State Machine (canonical):**

```
draft → brief_submitted → payment_pending → under_analysis → completed
         ↓                ↓
      (user submits)   (payment fails)
      brief             → stays in draft
                        → user can retry
```

**Valid Transitions:**

- draft → brief_submitted (user submits brief)
- draft → withdrawn (user cancels)
- brief_submitted → payment_pending (brief submitted)
- brief_submitted → draft (user withdraws before payment)
- payment_pending → under_analysis (payment confirmed)
- payment_pending → draft (payment fails/expires, user cancels)
- payment_pending → failed (payment fails after retries)
- under_analysis → awaiting_aggregation (all evaluators complete)
- under_analysis → failed (fewer than 3 evaluators succeed)
- awaiting_aggregation → completed (admin publishes opinion)
- awaiting_aggregation → failed (admin cannot aggregate, refund issued)
- completed → (terminal)
- failed → (terminal, refund issued)
- withdrawn → (terminal, refund issued if applicable)

**Invalid Transitions (rejected with 409):**

- Any state → draft (except payment_pending → draft on failure)
- Any state → completed (except awaiting_aggregation → completed)
- completed → any other state
- failed → any other state
- withdrawn → any other state

**Edge Cases:**

1. Invalid category → 400.
2. Title too long → 400.
3. 100 disputes in 1 hour → rate limited.
4. User deletes account with active dispute → blocked until resolved.

**Tests:**

- [ ] Create valid → 201, state = draft.
- [ ] Create without auth → 401.
- [ ] Create invalid category → 400.
- [ ] Create title too long → 400.
- [ ] Create, verify party role = initiator → pass.
- [ ] Create 100 in 1 hour → rate limited.

---

### F3: Brief Preparation (Manual Text Entry)

**Agent Ownership:**

| Primary Agent ★ | Reviewer Agents | Deliverable |
|-----------------|-----------------|-------------|
| Senior Developer ★ | Frontend Developer, Minimal Change Engineer | Brief form implementation, state persistence, immutability enforcement |
| Frontend Developer | Senior Developer, Section 508 Accessibility Specialist | React form components, draft save UX, responsive layout |
| Privacy Engineer | Senior SecOps Engineer | AES-256-GCM encryption of brief content, retention TTL enforcement |
| AppSec Engineer | Senior SecOps Engineer | XSS prevention via DOMPurify, content moderation headers, CSRF |
| Test Automation Engineer | Evidence Collector, API Tester | E2E brief flow: save draft, submit, edit-after-submit rejection |

### F3: Brief Preparation (Manual Text Entry)

**Endpoints:**

- PUT /v1/disputes/:dispute_id/parties/:party_id/brief/draft — Save draft.
- POST /v1/disputes/:dispute_id/parties/:party_id/brief/submit — Submit final brief.
- GET /v1/disputes/:dispute_id/parties/:party_id/brief — Get submitted brief.

**Brief Structure (5 sections):**

1. factual_background — What happened.
2. my_position — What I claim.
3. supporting_arguments — Why my position is correct.
4. acknowledgment_of_opposing — What the other party will say.
5. desired_resolution — What outcome I want.

**Validation Rules:**

- All 5 sections required on submit (can be empty on draft save).
- Word count: suggested 500–2000, hard cap 5000.
- Brief becomes immutable after submission.
- Status transitions: not_started → in_progress → submitted → sealed.

**Content Moderation:**

- Disallowed content checked before submission.
- Uses LLM provider content moderation APIs or third-party service.
- Disallowed: illegal activity, harassment, threats, sexual content, PII of others.

**Edge Cases:**

1. Submit with empty section → 400.
2. Submit exceeding 5000 words → 400.
3. Edit after submission → 403.
4. Partial draft save → 200.
5. Concurrent saves → last write wins.

**Tests:**

- [ ] Save draft valid → 200.
- [ ] Save draft partial → 200.
- [ ] Submit all sections, under 5000 words → 200, status = submitted.
- [ ] Submit empty section → 400.
- [ ] Submit >5000 words → 400.
- [ ] Submit non-draft dispute → 409.
- [ ] Get brief after submit → 200.
- [ ] Edit after submit → 403.

---

### F4: Payment Collection

**Agent Ownership:**

| Primary Agent ★ | Reviewer Agents | Deliverable |
|-----------------|-----------------|-------------|
| Payments & Billing Engineer ★ | Identity & Access Engineer, AppSec Engineer | Stripe integration, idempotent payment intents, webhook handler with signature verification |
| Secrets & Credential Hygiene Engineer | Cloud Security Architect, Senior SecOps Engineer | Vault storage of STRIPE_SECRET_KEY, rotation policy, leak detection |
| AppSec Engineer | Security Architect | Payment endpoint security, PCI scope reduction, CSRF on confirm |
| FinOps Engineer | Payments & Billing Engineer | Stripe fee accounting, reconciliation, cost monitoring per transaction |
| API Tester | Test Results Analyzer | Payment intent/confirm/refund endpoint tests, idempotency key tests |

### F4: Payment Collection

**Flow:**

1. User submits brief → dispute state = "payment_pending".
2. Frontend shows Stripe-hosted payment page.
3. User pays $49 → Stripe processes.
4. Frontend calls POST /v1/disputes/:id/payment/confirm.
5. Backend verifies with Stripe → dispute state = "under_analysis" → evaluation triggers.
6. Payment fails → dispute stays in "payment_pending", user can retry.

**Endpoints:**

- GET /v1/disputes/:dispute_id/payment-intent — Get Stripe payment intent.
- POST /v1/disputes/:dispute_id/payment/confirm — Confirm payment.
- POST /v1/disputes/:dispute_id/refund-request — Request refund.
- GET /v1/users/me/payments — Get payment history.

**Validation Rules:**

- Payment intent only for disputes in "payment_pending".
- Amount: $49.00 USD fixed.
- Payment intent expires after 24 hours.
- Idempotency-Key header required; duplicate requests within 24h return original response.
- Store idempotency keys in database with 24h TTL.

**Edge Cases:**

1. User never pays → cron job cleans up after 7 days.
2. Card declined → user sees error, can retry.
3. Duplicate click → Stripe idempotency prevents double charge.
4. Payment succeeds but webhook fails → polling checks Stripe every 30s for 5 min.
5. Refund after opinion delivered → manual review in MVP.

**Tests:**

- [ ] Create intent for payment_pending → 200.
- [ ] Confirm valid payment → 200, state = under_analysis.
- [ ] Confirm invalid intent → 400.
- [ ] Payment fails → user sees error, can retry.
- [ ] Duplicate payment → blocked.
- [ ] Request refund → 202, pending review.
- [ ] Get payment history → 200.

---

### F5: Evaluation Orchestration (Groq API + Gemini API)

**Agent Ownership:**

| Primary Agent ★ | Reviewer Agents | Deliverable |
|-----------------|-----------------|-------------|
| AI Engineer ★ | Prompt Engineer, Autonomous Optimization Architect | Evaluation job orchestration, parallel dispatch, streaming, circuit breakers |
| Prompt Engineer | AI Engineer, Model QA Specialist | Prompt versioning (eval-v3.2), test suites, regression detection, A/B testing |
| Autonomous Optimization Architect | FinOps Engineer, AI Engineer | Cost guardrails, shadow testing, fallback routing, LLM provider selection |
| Multi-Agent Systems Architect | SRE, AI Engineer | Multi-provider topology, failure recovery, HITL gating, context budget |
| Senior SecOps Engineer | AppSec Engineer, Privacy Engineer | Input sanitization, output validation, prompt-injection defense, token budget |
| Model QA Specialist | Test Results Analyzer, Prompt Engineer | ML audits, feature analysis, output quality metrics, hallucination rate |
| API Tester | Test Results Analyzer | Provider abstraction contract tests, retry logic tests, timeout tests |
| FinOps Engineer | Autonomous Optimization Architect | Cost tracking per model, daily aggregation, $15/dispute alert threshold |

### F5: Evaluation Orchestration (Groq API + Gemini API)

**Providers (MVP, exact roster):**

1. Groq API — Llama 3 70B (primary)
2. Groq API — Mixtral 8x7B (secondary)
3. Gemini API — Gemini 1.5 Pro (tertiary)

**Evaluation Prompt (single-party):**

```
You are an impartial analyst evaluating a party's arguments in a dispute.

You will be shown a brief from one party. Your task is to analyze 
their arguments objectively.

For this brief, provide:
1. The 3 strongest arguments and why they are strong
2. The 3 weakest points and what makes them weak
3. Any factual claims that need verification
4. Any logical fallacies or reasoning gaps
5. An overall assessment of argument strength
6. Specific considerations this party should think about
7. A confidence score (1-10) on your assessment

IMPORTANT:
- Do NOT render a verdict or "decision"
- Flag factual claims you cannot verify rather than asserting them
- Acknowledge uncertainty rather than fabricating confidence
- If you would need to cite legal authorities, only cite ones you are certain exist

[BRIEF]
{brief_content}

Respond in the structured format defined in schema_v3.json.
```

**Flow:**

1. Dispute enters "under_analysis".
2. System creates EvaluationJob.
3. For each evaluator (in parallel):
   - Construct prompt with brief content.
   - Call provider via abstraction layer.
   - Receive structured output.
   - Validate against schema.
   - Store in evaluator_outputs table.
   - Record: prompt_version, response_time, token_counts, cost, attempt_number.
4. After all 3 complete:
   - All 3 succeeded → trigger manual aggregation notification.
   - Fewer than 3 succeed after retries → job fails, auto-refund, dispute state = "failed".
5. Retry: up to 2 times with exponential backoff (1s, 2s).

**Minimum Viable Evaluation Rule:**

- Require minimum 3 successful evaluations.
- If fewer than 3 succeed → analysis fails → auto-refund → dispute state = "failed" → user notified.

**Token Budget (MVP):**

- Brief to each evaluator: ~5K tokens input.
- Each evaluator output: ~2K tokens output.
- Total per dispute (MVP, 3 evaluators): ~21K input + ~6K output.
- Total per dispute (Phase 2, 5 evaluators): ~35K input + ~10K output.
- Hard cap: 20K tokens per evaluator input.

**Security:**

- Input sanitization before sending to evaluators.
- Output validation to detect prompt injection patterns.
- Brief content treated as untrusted input.

**Resilience:**

- Circuit breaker pattern in provider abstraction layer.
- Fallback to remaining providers if primary fails.

**Edge Cases:**

1. Groq API 500 → retry with backoff (1s, 2s), then mark failed.
2. Gemini API 429 → retry after Retry-After header or 5s default.
3. Malformed output → parse_success = false, store raw_output.
4. All 3 fail → auto-refund, dispute state = failed.
5. Evaluator timeout >60s → mark failed, retry.
6. Network timeout → retry with backoff.

**Tests:**

- [ ] All 3 providers available → 3 evaluator_outputs created.
- [ ] 1 provider fails after retries → auto-refund, state = failed.
- [ ] All 3 fail → auto-refund, state = failed.
- [ ] Malformed output → parse_success = false.
- [ ] Evaluator timeout → retry, then mark failed.
- [ ] Cost tracking recorded → verified.
- [ ] Prompt version stored → verified.
- [ ] Attempt number increments on retry → verified.

---

### F6: Manual Aggregation

**Agent Ownership:**

| Primary Agent ★ | Reviewer Agents | Deliverable |
|-----------------|-----------------|-------------|
| Senior Developer ★ | Frontend Developer, Minimal Change Engineer | Aggregation form implementation, state persistence, opinion creation |
| Frontend Developer | Senior Developer, Section 508 Accessibility Specialist | Side-by-side evaluator output view, opinion publish UX |
| Studio Producer | Project Shepherd | Admin SLA enforcement (24h), queue management, escalation protocol |
| Reality Checker | Accessibility Auditor, Test Automation Engineer | Production-readiness gate, opinion completeness verification |
| Accessibility Auditor | Section 508 Accessibility Specialist | WCAG 2.1 AA compliance on admin aggregation form |

### F6: Manual Aggregation

**Admin Interface:**

- List of disputes in "awaiting_aggregation" state.
- Side-by-side view of all 3 evaluator outputs.
- Editable form for opinion sections:
  1. executive_summary
  2. strongest_arguments (array)
  3. weakest_points (array)
  4. factual_concerns (array)
  5. suggested_considerations (array)
  6. confidence_indicators (overall_confidence 0.0-1.0, evaluator_agreement 0.0-1.0)
  7. disclaimers (array, always include standard disclaimers)
- Publish button → creates opinion, dispute state = "completed", triggers notification.

**Standard Disclaimers (required in every opinion):**

1. "This is AI-generated analysis, not legal advice."
2. "This opinion does not constitute a binding judgment or arbitration award."
3. "Consult a qualified attorney for legal advice specific to your situation."
4. "Analysis is based on the information provided and may not reflect all relevant facts or legal nuances."

**SLA:**

- Team must publish within 24 hours of all evaluators completing.
- If missed → user gets courtesy refund or credit.

**Edge Cases:**

1. Admin starts but doesn't finish within 24h → another admin can take over.
2. Malformed evaluator outputs → flag for technical review.
3. Admin publishes incomplete opinion → can unpublish within 1 hour, after which immutable.

**Tests:**

- [ ] Admin sees pending aggregations → 200.
- [ ] Admin views side-by-side outputs → 200.
- [ ] Admin publishes with all fields → 200, opinion created.
- [ ] Admin publishes without disclaimers → 400.
- [ ] Admin publishes missing fields → 400.
- [ ] Opinion published → state = completed, user notified.


### F7: Opinion Delivery

**Agent Ownership:**

| Primary Agent ★ | Reviewer Agents | Deliverable |
|-----------------|-----------------|-------------|
| Backend Architect ★ | Cloud Security Architect, FinOps Engineer | Opinion read model, PDF generation pipeline, SSE stream |
| Cloud Security Architect | Secrets & Credential Hygiene Engineer | S3 encryption, signed URL security (1h expiry), bucket policies |
| FinOps Engineer | Backend Architect | S3 egress cost monitoring, pre-signed URL audit, PDF storage cost |
| API Tester | Test Results Analyzer | Opinion read endpoint, PDF download, SSE stream tests |
| Performance Benchmarker | SRE | Opinion read latency targets (<200ms), decryption overhead measurement |

### F7: Opinion Delivery

**Endpoints:**

- GET /v1/disputes/:dispute_id/opinion — Get opinion.
- GET /v1/disputes/:dispute_id/opinion/pdf — Download PDF.
- GET /v1/disputes/:dispute_id/opinion/status
- GET /v1/disputes/:dispute_id/opinion/status/stream — Server-Sent Events stream for real-time updates — Get opinion status.

**Validation Rules:**

- User must be authenticated and be the initiator.
- Dispute must be in "completed" state.
- If not completed → 404.

**Notification Flow:**

1. Opinion published → dispute state = "completed".
2. System sends email: "Your dispute analysis is ready."
3. Email contains: link to view opinion, link to download PDF, disclaimers.
4. User sees in-app notification.

**PDF Generation:**

- Server-side PDF generation (Puppeteer or PDFKit).
- PDF includes: opinion content, disclaimers, timestamp, evaluators used.
- PDF stored in S3 with encryption.
- Signed URL for download (expires in 1 hour).

**Edge Cases:**

1. User requests opinion before ready → 404.
2. PDF generation fails → retry once, if still fails deliver without PDF.
3. S3 down → opinion via web only, support notified.

**Tests:**

- [ ] Get opinion completed → 200.
- [ ] Get opinion incomplete → 404.
- [ ] Download PDF → 200.
- [ ] PDF URL expired → 403.
- [ ] Notification email sent → verified.
- [ ] Opinion contains all sections → verified.

---

### F8: Admin / Internal Tools

**Agent Ownership:**

| Primary Agent ★ | Reviewer Agents | Deliverable |
|-----------------|-----------------|-------------|
| Backend Architect ★ | Software Architect, Database Optimizer | Admin API architecture, RBAC trust model, audit logging design |
| Frontend Developer | Section 508 Accessibility Specialist | Admin dashboard UI, dispute list, aggregation form |
| Database Optimizer | Database Reliability Engineer | Admin query performance, audit log indexing, slow query debugging |
| Security Architect | AppSec Engineer, Senior SecOps Engineer | Admin token design, least-privilege, authz middleware |
| API Tester | Test Results Analyzer | Admin endpoint tests, authorization enforcement, action logging |
| Privacy Engineer | Senior SecOps Engineer | Audit log PII redaction, retention TTL, deletion verification |

### F8: Admin / Internal Tools

**Endpoints (internal, separate admin auth):**

- GET /v1/admin/disputes — List disputes with filters.
- GET /v1/admin/disputes/:id — Get dispute details.
- GET /v1/admin/evaluations/pending — List awaiting aggregation.
- POST /v1/admin/disputes/:id/aggregate — Publish opinion.

**Admin Interface:**

- Dashboard: total disputes, pending evaluations, pending aggregations, completed today, revenue today.
- Dispute list with filters: state, date range, category.
- Dispute detail: user info, brief content, evaluator outputs side by side.
- Aggregation form: editable opinion fields, publish button.
- System health: LLM provider status, cost per dispute, error rates.

**Validation Rules:**

- Admin endpoints require separate admin token.
- Admin can view any dispute.
- Aggregation requires all required opinion fields.
- All admin actions logged in audit_events.

**Tests:**

- [ ] Admin lists disputes → 200.
- [ ] Admin views dispute details → 200.
- [ ] Admin cannot aggregate with <3 outputs → 400.
- [ ] Admin actions logged → verified.

---

### F9: Email Notifications

**Agent Ownership:**

| Primary Agent ★ | Reviewer Agents | Deliverable |
|-----------------|-----------------|-------------|
| DevOps Automator ★ | Email Intelligence Engineer, SRE | Email queue infrastructure, retry logic (max 3), async delivery |
| Email Intelligence Engineer | DevOps Automator | Email template rendering, MIME handling, bounce processing |
| AppSec Engineer | Senior SecOps Engineer | Email injection prevention, header validation, SPF/DKIM compliance |
| API Tester | Test Results Analyzer | Email service contract tests, retry behavior tests, failure mode tests |

### F9: Email Notifications

**Email Types:**

1. Email verification (on registration)
2. Password reset (on request)
3. Dispute created (confirmation)
4. Brief submitted (confirmation)
5. Payment success (receipt)
6. Payment failed (retry prompt)
7. Opinion ready (notification with link)
8. Account deletion confirmation

**Implementation:**

- Provider: SendGrid or AWS SES.
- Templates: stored in code, versioned.
- All emails include: logo, footer with contact info, unsubscribe for marketing.
- Sending async via queue, does not block main flow.

**Validation Rules:**

- All transactional emails sent within 5 minutes of triggering event.
- Delivery failures logged and retried (max 3 retries).
- After 3 retries → user sees in-app notification.

**Tests:**

- [ ] Register → verification email sent.
- [ ] Password reset request → email sent.
- [ ] Brief submitted → confirmation email sent.
- [ ] Payment success → receipt email sent.
- [ ] Opinion ready → notification email sent.
- [ ] Delivery failure → retry 3x, then in-app only.


### API Versioning Strategy

## PART 4: Complete API Endpoint Reference (MVP Only)

### API Versioning Strategy

- All Phase 2 breaking changes go to /v2.
- Maintain /v1 for 12-month deprecation period.
- Version negotiated via URI path (/v1/, /v2/).
- Clients migrate before /v1 sunset.

### Authentication

- POST /v1/auth/register
- POST /v1/auth/verify-email
- POST /v1/auth/login
- POST /v1/auth/refresh
- POST /v1/auth/logout
- POST /v1/auth/password-reset/request
- POST /v1/auth/password-reset/complete

### User

- GET /v1/users/me
- PATCH /v1/users/me
- DELETE /v1/users/me

### Disputes

- POST /v1/disputes
- GET /v1/disputes
- GET /v1/disputes/:dispute_id
- PATCH /v1/disputes/:dispute_id (draft state only)
- POST /v1/disputes/:dispute_id/withdraw — Withdraw dispute, issue refund if eligible

### Briefs

- PUT /v1/disputes/:dispute_id/parties/:party_id/brief/draft
- POST /v1/disputes/:dispute_id/parties/:party_id/brief/submit
- GET /v1/disputes/:dispute_id/parties/:party_id/brief

### Payments

- GET /v1/disputes/:dispute_id/payment-intent
- POST /v1/disputes/:dispute_id/payment/confirm
- POST /v1/disputes/:dispute_id/refund-request
- GET /v1/users/me/payments

### Opinions

- GET /v1/disputes/:dispute_id/opinion
- GET /v1/disputes/:dispute_id/opinion/pdf
- GET /v1/disputes/:dispute_id/opinion/status
- GET /v1/disputes/:dispute_id/opinion/status/stream — Server-Sent Events stream for real-time updates

### Webhooks

- POST /v1/webhooks/stripe — Stripe webhook handler with signature verification

### Disputes (additional)

- POST /v1/disputes/:dispute_id/withdraw — Withdraw dispute, issue refund if eligible

### Admin (internal)

- GET /v1/admin/disputes
- GET /v1/admin/disputes/:id
- GET /v1/admin/evaluations/pending
- POST /v1/admin/disputes/:id/aggregate

**NOT in MVP:**

- WebSocket endpoints (brief preparation chat) — Phase 2 only.
- Document endpoints — Phase 2 only.
- Invitation endpoints — Phase 2 only.
- Re-analysis endpoint — Phase 2 only.

---

## PART 5: All Validation Rules (Consolidated)

### All Validation Rules (Consolidated)

## PART 5: All Validation Rules (Consolidated)

### Auth

- Email: valid format, unique, max 255 chars.
- Password: min 8 chars, at least 1 letter, 1 number.
- display_name: optional, max 100 chars.
- accept_terms: required, must be true.
- Email verification required before any authenticated action.
- Rate limit: 5 login attempts per minute per email.
- Rate limit headers included in all responses: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset.

### Disputes

- category: must be "contract_interpretation".
- title: required, 5–200 chars.
- summary: optional, max 500 chars.
- estimated_stakes_usd: optional, must be positive.
- State transitions: draft → brief_submitted → payment_pending → under_analysis → completed.
- Cannot modify after brief submitted.

### Briefs

- All 5 sections required on submit.
- Word count: 500–2000 suggested, hard cap 5000.
- Immutable after submission.
- Status: not_started → in_progress → submitted → sealed.

### Payments

- Amount: $49.00 USD fixed.
- Only for disputes in "payment_pending".
- Payment intent expires after 24 hours.
- Duplicate payment prevented by idempotency key.

### Opinions

- Requires minimum 3 evaluator_outputs linked.
- All 4 standard disclaimers must be present.
- Confidence indicators must be 0.0–1.0.
- Immutable after delivery.

---

### All Edge Cases (Consolidated)

## PART 6: All Edge Cases (Consolidated)

### Auth

1. Duplicate email → 409.
2. Login unverified → 403.
3. Expired verification token → 400, offer resend.
4. Password reset non-existent email → 200 (don't reveal).
5. Delete account with active disputes → 400.
6. Concurrent logins → allowed.

### Disputes

1. Invalid category → 400.
2. Title too long → 400.
3. Modify after brief submitted → 409.
4. Delete with active evaluation → 400.
5. payment_pending >7 days → cron marks abandoned, user notified.

### Briefs

1. Submit empty section → 400.
2. Submit >5000 words → 400.
3. Edit after submit → 403.
4. Partial draft save → 200.
5. Concurrent saves → last write wins.

### Payments

1. Card declined → error, retry allowed, stays in payment_pending.
2. Success but webhook fails → polling every 30s for 5 min.
3. Duplicate click → blocked by idempotency.
4. Intent expires after 24h → user requests new intent.
5. Refund after opinion → manual review.

### Evaluation

1. Groq 500 → retry backoff (1s, 2s), then mark failed.
2. Gemini 429 → retry after Retry-After or 5s.
3. Malformed output → parse_success = false, raw_output stored.
4. All 3 fail → auto-refund, state = failed.
5. Timeout >60s → mark failed, retry.
6. Network timeout → retry with backoff.

### Aggregation

1. Admin aggregates with <3 outputs → 400.
2. Publish without disclaimers → 400.
3. Publish incomplete → 400, missing fields listed.
4. Admin doesn't finish within 24h → another admin can take over.

### Opinion Delivery

1. Request before ready → 404.
2. PDF generation fails → retry once, then deliver without PDF.
3. S3 down → web only, support notified.
4. Email fails → retry 3x, then in-app only.

---

### Complete Test Plan (Feature-wise)

## PART 7: Complete Test Plan (Feature-wise)

### F1: Auth

- [ ] Register valid → 201.
- [ ] Register duplicate → 409.
- [ ] Register weak password → 400.
- [ ] Verify valid token → 200.
- [ ] Verify expired → 400.
- [ ] Login correct → 200.
- [ ] Login unverified → 403.
- [ ] Login wrong → 401.
- [ ] Rate limit 6 attempts → 429.
- [ ] Refresh token → 200.
- [ ] Logout → 200.
- [ ] Password reset request → 200.
- [ ] Password reset valid → 200.
- [ ] Delete no disputes → 202.
- [ ] Delete with disputes → 400.

### F2: Disputes

- [ ] Create valid → 201, state = draft.
- [ ] Create no auth → 401.
- [ ] Create invalid category → 400.
- [ ] Create title too long → 400.
- [ ] Verify party role = initiator → pass.
- [ ] 100 in 1 hour → rate limited.

### F3: Briefs

- [ ] Save draft valid → 200.
- [ ] Save draft partial → 200.
- [ ] Submit valid → 200, status = submitted.
- [ ] Submit empty section → 400.
- [ ] Submit >5000 words → 400.
- [ ] Submit non-draft → 409.
- [ ] Get after submit → 200.
- [ ] Edit after submit → 403.

### F4: Payments

- [ ] Create intent → 200.
- [ ] Confirm valid → 200, state = under_analysis.
- [ ] Confirm invalid → 400.
- [ ] Payment fails → error, retry allowed.
- [ ] Duplicate payment → blocked.
- [ ] Refund request → 202.
- [ ] Get history → 200.

### F5: Evaluation

- [ ] All 3 providers → 3 outputs created.
- [ ] 1 fails after retries → auto-refund, state = failed.
- [ ] All 3 fail → auto-refund, state = failed.
- [ ] Malformed output → parse_success = false.
- [ ] Timeout → retry, then mark failed.
- [ ] Cost tracked → verified.
- [ ] Prompt version stored → verified.
- [ ] Attempt number increments → verified.

### F6: Aggregation

- [ ] Admin sees pending → 200.
- [ ] Admin views outputs → 200.
- [ ] Admin publishes → 200, opinion created.
- [ ] Publish without disclaimers → 400.
- [ ] Publish missing fields → 400.
- [ ] Published → state = completed, user notified.

### F7: Opinions

- [ ] Get completed → 200.
- [ ] Get incomplete → 404.
- [ ] Download PDF → 200.
- [ ] PDF expired URL → 403.
- [ ] Email sent → verified.
- [ ] All sections present → verified.

### F8: Admin

- [ ] List disputes → 200.
- [ ] View details → 200.
- [ ] Cannot aggregate <3 outputs → 400.
- [ ] Actions logged → verified.

### F9: Email

- [ ] Register → verification sent.
- [ ] Password reset → email sent.
- [ ] Brief submitted → confirmation sent.
- [ ] Payment success → receipt sent.
- [ ] Opinion ready → notification sent.
- [ ] Failure → retry 3x, then in-app.

---

### Complete Evaluation Schema (schema_v3.json)

## PART 16: Complete Evaluation Schema (schema_v3.json)

Every evaluator output MUST conform to this JSON schema.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["strongest_arguments", "weakest_points", "factual_concerns", "logical_fallacies", "overall_assessment", "considerations", "confidence_score"],
  "properties": {
    "strongest_arguments": {
      "type": "array",
      "minItems": 3,
      "maxItems": 3,
      "items": {
        "type": "object",
        "required": ["argument", "reasoning"],
        "properties": {
          "argument": { "type": "string", "maxLength": 500 },
          "reasoning": { "type": "string", "maxLength": 1000 }
        }
      }
    },
    "weakest_points": {
      "type": "array",
      "minItems": 3,
      "maxItems": 3,
      "items": {
        "type": "object",
        "required": ["point", "weakness_reason"],
        "properties": {
          "point": { "type": "string", "maxLength": 500 },
          "weakness_reason": { "type": "string", "maxLength": 1000 }
        }
      }
    },
    "factual_concerns": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["claim", "verification_needed"],
        "properties": {
          "claim": { "type": "string", "maxLength": 500 },
          "verification_needed": { "type": "string", "maxLength": 500 }
        }
      }
    },
    "logical_fallacies": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["fallacy_type", "description"],
        "properties": {
          "fallacy_type": { "type": "string", "maxLength": 200 },
          "description": { "type": "string", "maxLength": 500 }
        }
      }
    },
    "overall_assessment": {
      "type": "string",
      "maxLength": 2000
    },
    "considerations": {
      "type": "array",
      "items": {
        "type": "string",
        "maxLength": 500
      }
    },
    "confidence_score": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10
    }
  }
}
```

---

### Prompt Versioning Scheme

## PART 17: Prompt Versioning Scheme

Every evaluation prompt and aggregation prompt must be versioned.

**Version string format:** `<type>-v<major>.<minor>`

Examples:
- `eval-v3.2` — evaluation prompt, version 3.2
- `agg-v2.1` — aggregation prompt, version 2.1

**Versioning rules:**
- Major version bump: prompt structure changes (e.g., add/remove sections in schema).
- Minor version bump: wording changes, instruction tweaks, examples updated.
- Each evaluator_output stores the prompt_version used.
- Each opinion stores both eval_prompt_version and agg_prompt_version.
- Prompt versions are immutable once created. Do not edit old prompts; create new version.
- All prompts stored in code repository under `backend/src/prompts/` with versioned filenames.

**Current MVP versions:**
- `eval-v3.2`: single-party evaluation prompt (defined in F5)
- `agg-v2.1`: manual aggregation has no prompt version (human-authored)

---


---

## 6. Technical Infrastructure

### Part 3: MVP Database Schema (Complete)

## PART 3: MVP Database Schema (Complete)

```sql
-- users
CREATE TABLE users (
    id VARCHAR(40) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash VARCHAR(255),
    display_name VARCHAR(100),
    account_type VARCHAR(20) NOT NULL DEFAULT 'standard',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ
);
CREATE INDEX idx_users_email_active ON users(email) WHERE deleted_at IS NULL;

-- disputes
CREATE TABLE disputes (
    id VARCHAR(40) PRIMARY KEY,
    category VARCHAR(50) NOT NULL DEFAULT 'contract_interpretation',
    title VARCHAR(200) NOT NULL,
    summary TEXT,
    estimated_stakes_usd DECIMAL(12,2),
    state VARCHAR(40) NOT NULL DEFAULT 'draft',
    state_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pricing_tier VARCHAR(20) NOT NULL DEFAULT 'standard',
    price_usd DECIMAL(8,2) NOT NULL DEFAULT 49.00,
    initiator_user_id VARCHAR(40) NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_disputes_initiator ON disputes(initiator_user_id);
CREATE INDEX idx_disputes_state ON disputes(state) WHERE state NOT IN ('completed', 'withdrawn', 'failed');

-- parties
CREATE TABLE parties (
    id VARCHAR(40) PRIMARY KEY,
    dispute_id VARCHAR(40) NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'initiator',
    user_id VARCHAR(40) REFERENCES users(id),
    brief_status VARCHAR(20) NOT NULL DEFAULT 'not_started',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(dispute_id, role)
);
CREATE INDEX idx_parties_dispute ON parties(dispute_id);
CREATE INDEX idx_parties_user ON parties(user_id) WHERE user_id IS NOT NULL;

-- briefs
CREATE TABLE briefs (
    id VARCHAR(40) PRIMARY KEY,
    party_id VARCHAR(40) NOT NULL UNIQUE REFERENCES parties(id) ON DELETE CASCADE,
    dispute_id VARCHAR(40) NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    encrypted_content BYTEA NOT NULL,
    content_encryption_key_id VARCHAR(64) NOT NULL,
    word_count INTEGER NOT NULL,
    supporting_document_ids TEXT[] DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    sealed_at TIMESTAMPTZ,
    seal_hash VARCHAR(64)
);
CREATE INDEX idx_briefs_dispute ON briefs(dispute_id);
CREATE INDEX idx_briefs_status ON briefs(status);
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ;
CREATE INDEX idx_briefs_retention ON briefs(retention_expires_at) WHERE retention_expires_at IS NOT NULL;

-- evaluator_outputs
CREATE TABLE evaluator_outputs (
    id VARCHAR(40) PRIMARY KEY,
    dispute_id VARCHAR(40) NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    llm_provider VARCHAR(50) NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    prompt_version VARCHAR(20) NOT NULL,
    structured_output JSONB NOT NULL,
    raw_output TEXT,
    parse_success BOOLEAN NOT NULL,
    parse_errors JSONB,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cost_usd DECIMAL(8,4) NOT NULL,
    duration_ms INTEGER NOT NULL,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_eval_outputs_dispute ON evaluator_outputs(dispute_id);

-- opinions
CREATE TABLE opinions (
    id VARCHAR(40) PRIMARY KEY,
    dispute_id VARCHAR(40) NOT NULL UNIQUE REFERENCES disputes(id) ON DELETE CASCADE,
    encrypted_content BYTEA NOT NULL,
    content_encryption_key_id VARCHAR(64) NOT NULL,
    eval_prompt_version VARCHAR(20) NOT NULL,
    agg_prompt_version VARCHAR(20) NOT NULL,
    evaluator_output_ids TEXT[] NOT NULL,
    inter_evaluator_agreement DECIMAL(4,3),
    overall_confidence DECIMAL(4,3),
    aggregator_provider VARCHAR(50) NOT NULL,
    aggregator_model_id VARCHAR(100) NOT NULL,
    total_cost_usd DECIMAL(8,4) NOT NULL,
    pdf_storage_key VARCHAR(255),
    pdf_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);
CREATE INDEX idx_opinions_created ON opinions(created_at DESC);
ALTER TABLE opinions ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ;
CREATE INDEX idx_opinions_retention ON opinions(retention_expires_at) WHERE retention_expires_at IS NOT NULL;

-- payments
CREATE TABLE payments (
    id VARCHAR(40) PRIMARY KEY,
    dispute_id VARCHAR(40) NOT NULL REFERENCES disputes(id),
    user_id VARCHAR(40) NOT NULL REFERENCES users(id),
    amount_usd DECIMAL(8,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    processor VARCHAR(20) NOT NULL DEFAULT 'stripe',
    processor_payment_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL,
    refunded_amount_usd DECIMAL(8,2) DEFAULT 0,
    refund_reason TEXT,
    refunded_at TIMESTAMPTZ,
    idempotency_key VARCHAR(64) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX idx_payments_dispute ON payments(dispute_id);
CREATE INDEX idx_payments_user ON payments(user_id);

-- audit_events (append-only, cryptographically signed)
CREATE TABLE audit_events (
    id VARCHAR(40) PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    actor_type VARCHAR(20) NOT NULL,
    actor_id VARCHAR(40),
    resource_type VARCHAR(40),
    resource_id VARCHAR(40),
    event_data JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(40),
    prev_event_id VARCHAR(40),
    signature VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id);
CREATE INDEX idx_audit_events_type_time ON audit_events(event_type, created_at);
```

---


### Part 8: Code Structure and Optimization

## PART 8: Code Structure and Optimization

### Project Structure

```text
meritview/
├── frontend/
│   ├── package.json         # Next.js, React, Tailwind
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app/             # App Router
│   │   ├── components/      # React components (UI primitives)
│   │   ├── lib/             # Utilities, generated API client
│   │   ├── hooks/           # Custom hooks
│   │   └── stores/          # Client-side state
│   ├── public/
│   └── .env.example         # NEXT_PUBLIC_* vars only
├── backend/
│   ├── package.json         # Express, Prisma, Stripe
│   ├── tsconfig.json
│   ├── Dockerfile           # Node 20, non-root, dist/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── docs/
│   │   └── openapi.yaml     # Single source of truth for API contract
│   ├── src/
│   │   ├── routes/          # API handlers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth, validation, errors
│   │   ├── providers/       # LLM implementations
│   │   ├── prompts/         # Versioned prompt text files
│   │   ├── jobs/            # Background jobs
│   │   ├── config/          # App configuration
│   │   ├── utils/           # Utilities
│   │   ├── db/              # Database client setup
│   │   └── index.ts         # Entry point
│   └── .env.example         # SERVER-SIDE vars only
└── infra/
    ├── docker-compose.yml   # Local dev (postgres, redis)
    ├── terraform/           # Production IaC
    ├── scripts/             # Deploy/bootstrap scripts
    └── .gitignore

**No root-level package.json. No monorepo. No shared node_modules.**
```

### **Standard Error Envelope:**

All errors follow:
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {},
    "request_id": "req_xyz",
    "documentation_url": "https://docs.meritview.app/errors/"
  }
}

**Standard Error Envelope:**

All error responses follow:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {},
    "request_id": "req_xyz",
    "documentation_url": "https://docs.meritview.app/errors/"
  }
}
```

### Architecture Notes

- MVP uses single database (no CQRS separation).
- Phase 2 introduces CQRS: opinion read model separated from evaluation write model for scaling.

### Optimization Checklist

- [ ] All DB queries use indexes (verify with EXPLAIN ANALYZE).
- [ ] Connection pooling via PgBouncer (5-10 per app instance).
- [ ] Redis for sessions, rate limits, query cache.
- [ ] LLM calls have 5s timeout, retry with exponential backoff.
- [ ] Brief content encrypted at application layer.
- [ ] Consistent error envelope on all responses.
- [ ] Cursor-based pagination on all list endpoints.
- [ ] Static assets via CDN.
- [ ] Opinion PDFs via pre-signed S3 URLs (1h expiry).
- [ ] Audit events async, non-blocking.
- [ ] Email async via queue.
- [ ] Cost monitoring dashboard shows real-time LLM spend.

### Performance Targets

- Dispute list: <50ms for 50 disputes.
- Dispute detail: <100ms.
- Opinion read: <200ms including decryption.
- Auth: <50ms token validation.
- LLM call: <60s timeout per evaluator.
- Total analysis: <5 min for all 3 evaluators.

---

### Part 19: Exact Environment Setup Commands

## PART 19: Exact Environment Setup Commands

### Local Development Setup
```bash
git clone <repo-url>
cd meritview

# Start shared infrastructure (postgres, redis) from infra/
cd infra && docker-compose up -d postgres redis && cd ..

# Backend setup (completely isolated)
cd backend
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, GROQ_API_KEY, GEMINI_API_KEY, STRIPE_SECRET_KEY, etc.
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev

# Frontend setup (separate, independent)
cd ../frontend
cp .env.example .env
# Fill in NEXT_PUBLIC_API_URL, NEXT_PUBLIC_STRIPE_PK, etc.
pnpm install
pnpm dev
```

### Run Tests

### Part 20: Complete CI/CD Pipeline

## PART 20: Complete CI/CD Pipeline

**.github/workflows/ci.yml:**
```yaml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm typecheck
  
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm db:migrate
      - run: pnpm test:unit
      - run: pnpm test:integration
  
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:e2e
```

---

### Part 21: Complete Environment Variables

## PART 21: Complete Environment Variables

**Required `.env` variables — backend (`backend/.env.example`):**
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/meritview
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=<random-64-char-string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
EMAIL_VERIFICATION_EXPIRY=24h
PASSWORD_RESET_EXPIRY=1h

# LLM Providers
GROQ_API_KEY=<groq-api-key>
GEMINI_API_KEY=<gemini-api-key>

# Stripe
STRIPE_SECRET_KEY=<stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
STRIPE_PRICE_ID=<stripe-price-id>

# Email
SENDGRID_API_KEY=<sendgrid-api-key>
FROM_EMAIL=noreply@meritview.app

# AWS (S3, SES)
AWS_ACCESS_KEY_ID=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>
AWS_REGION=us-east-1
S3_BUCKET=meritview-prod

# App
PORT=3001

# Monitoring
SENTRY_DSN=<sentry-dsn>
```

**Required `.env` variables — frontend (`frontend/.env.example`):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PK=<stripe-publishable-key>
```

---

### Part 22: Complete Docker Setup

## PART 22: Complete Docker Setup

**docker-compose.yml:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: meritview
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**Dockerfile for API:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

---


### Part 23: Complete Testing Commands

## PART 23: Complete Testing Commands

**Unit Tests:**
```bash
pnpm test:unit -- --coverage
# Requires: vitest.config.ts with coverage thresholds (80% lines, 80% functions)
```

**Integration Tests:**
```bash
pnpm test:integration
# Requires: test database, docker-compose.test.yml
```

**E2E Tests:**
```bash
pnpm test:e2e
# Requires: Playwright, test Stripe account, mock LLM providers
```

**Lint:**
```bash
pnpm lint
# Runs: eslint, prettier --check
```

**Typecheck:**
```bash
pnpm typecheck
# Runs: tsc --noEmit
```

**All checks (pre-commit):**
```bash
pnpm lint && pnpm typecheck && pnpm test:unit
```

---


### Part 24: Complete Database Migration Strategy

## PART 24: Complete Database Migration Strategy

**Migration tool:** Prisma Migrate

**Migration rules:**
- Migrations stored in version control.
- Forward-only migrations preferred; reversible migrations required where safe.
- Migration review required for any production database change.

**Safe migration practices:**
- Backward compatibility: Application code must work with both old and new schema during deploy.
- Multi-phase migrations: Add column → backfill → make required → remove old column over multiple deploys.
- No long-running migrations: Avoid migrations that lock tables for more than a few seconds.
- Test migrations: All migrations tested against production-equivalent data volume in staging.

**Rollback procedure:**
```bash
pnpm db:migrate:rollback
# Or for Prisma:
pnpm prisma migrate resolve --rolled-back <migration_name>
```

---

### CORS Configuration

### CORS Configuration

- Allowed origins: https://meritview.app, https://staging.meritview.app
- Credentials: true
- Max age: 86400
- Block all other origins


### Part 25: Complete Security Checklist

## PART 25: Complete Security Checklist

Before Beta Launch:
- [ ] All passwords hashed with bcrypt (cost factor 12).
- [ ] JWT tokens signed with RS256 (not HS256).
- [ ] All API inputs validated with Zod schemas.
- [ ] SQL injection prevented (Prisma parameterized queries).
- [ ] XSS prevented (React auto-escaping + DOMPurify for user content).
- [ ] CSRF tokens on all state-changing endpoints.
- [ ] Rate limiting on all public endpoints.
- [ ] CORS configured: origins https://meritview.app, https://staging.meritview.app only.
- [ ] HTTPS enforced in production.
- [ ] Brief content encrypted at application layer (AES-256-GCM).
- [ ] S3 buckets private with pre-signed URLs only.
- [ ] No sensitive data in logs (no passwords, tokens, PII).
- [ ] Audit logs append-only with HMAC signatures.
- [ ] Dependency vulnerabilities scanned (pnpm audit).
- [ ] Security headers configured (Helmet.js):
  - Content-Security-Policy: default-src self
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security: max-age=63072000; includeSubDomains

---

---

## 7. Roadmap, Versioning, and Success Metrics

### Part 9: Beta (Phase 2) — Feature Specification

## PART 9: Beta (Phase 2) — Feature Specification

### B1: Two-Party Mode

- Users invite counterparty via email or shareable link.
- Counterparty creates account or guest access.
- State machine: draft → awaiting_counterparty → in_progress → awaiting_briefs → awaiting_counterparty_brief → under_analysis → completed.
- Both must submit before analysis triggers.
- Briefs hidden until both submitted (DB, app, encryption layers).
- Invitation expires after 7 days.

### B2: AI-Assisted Brief Preparation

- User selects LLM provider for brief prep.
- WebSocket chat interface.
- LLM guides through 5-section template.
- Real-time suggestions.
- User retains editorial control.
- Session saved, resumable.
- Word limits enforced.

### B3: Automated Aggregation Engine

- After all evaluators complete, auto-synthesize opinion.
- Uses designated aggregator LLM.
- Identifies agreement and disagreement.
- Produces final opinion in standard format.
- No manual intervention.

### B4: 5-Model Evaluation

- Evaluators: Claude, GPT-4, Gemini, Llama-based (OpenRouter), Mistral (NVIDIA NIM).
- Parallel dispatch to all 5.
- Minimum 3 successful required.
- Graceful degradation if some fail.

### B5: Mobile-Responsive Web App

- Responsive for mobile and tablet.
- Same features as desktop.
- Touch-optimized UI.

### B6: Document Upload and OCR

- Upload: PDF, DOCX, JPG, PNG, HEIC.
- Max 25MB per file, 5 files per brief.
- OCR via AWS Textract or Google Cloud Vision.
- Extracted text included in analysis.

### B7: All 3 Dispute Categories

- contract_interpretation
- small_claims_assessment
- partnership_conflict

### B8: Pricing Tiers

- Standard: $99
- Expedited: $199 (1-hour turnaround, priority queue)
- Extended: $299 (longer briefs up to 10K words, document analysis)
- Re-analysis: $49

### B9: Quality Assurance

- External attorney review of random sample.
- User satisfaction surveys after each opinion.
- Inter-evaluator agreement tracking (target 80%+).

### Beta State Machine

```
draft → awaiting_counterparty → in_progress → awaiting_briefs → 
awaiting_counterparty_brief → under_analysis → completed
```

### Beta Success Criteria

- 100 paid analyses/month.
- 80%+ user satisfaction.
- <2% complaint rate.

---


### Part 15: Post-Beta Iteration

## PART 15: Post-Beta Iteration

### Week 13-14: User Feedback

- Interview first 20 users.
- Collect satisfaction surveys.
- Identify top 3 pain points.
- Identify top 3 requested features.

### Week 15+: Iterate

- If users want two-party → prioritize B1.
- If users want AI brief prep → prioritize B2.
- If users want document upload → prioritize B6.
- If users want faster turnaround → add expedited tier.
- If users don't trust AI → add transparency, free analyses, testimonials.

### Decision Point

- IF 25 paid analyses AND 70%+ satisfaction → commit to Phase 2.
- IF NOT → pivot or abandon. Do not continue building.

---

### Part 18: Step-by-Step Commit Plan (Exact Order)

## PART 18: Step-by-Step Commit Plan (Exact Order)

Follow this exact commit order. Each commit should be a single feature or fix, with tests passing.

### Phase 1: Foundation (Weeks 1-2)
1. `feat(infra): initialize independent frontend and backend`
2. `feat(infra): add Docker Compose for local dev (PostgreSQL, Redis, mock LLM)`
3. `feat(db): add Prisma schema and migrations for all MVP tables`
4. `feat(auth): implement register, verify-email, login, logout endpoints`
5. `feat(auth): implement password reset and refresh token endpoints`
6. `feat(auth): add auth middleware and JWT validation`
7. `test(auth): add unit and integration tests for all auth endpoints`

### Phase 2: Core Dispute Flow (Weeks 3-4)
8. `feat(disputes): implement dispute creation endpoint`
9. `feat(disputes): implement dispute list and detail endpoints`
10. `feat(disputes): add state machine enforcement`
11. `test(disputes): add unit and integration tests for dispute flow`
12. `feat(briefs): implement brief draft save endpoint`
13. `feat(briefs): implement brief submit with validation`
14. `feat(briefs): add word count enforcement and immutability`
15. `test(briefs): add unit and integration tests for brief flow`

### Phase 3: Payments (Week 5)
16. `feat(payments): integrate Stripe payment intent creation`
17. `feat(payments): implement payment confirmation webhook handler`
18. `feat(payments): implement refund request endpoint`
19. `feat(payments): add payment state machine integration`
20. `test(payments): add unit and integration tests for payment flow`

### Phase 4: Evaluation Orchestration (Weeks 6-7)
21. `feat(providers): implement GroqProvider abstraction`
22. `feat(providers): implement GeminiProvider abstraction`
23. `feat(providers): add provider health checks and cost estimation`
24. `feat(evaluation): implement EvaluationJob creation and parallel dispatch`
25. `feat(evaluation): add retry logic with exponential backoff`
26. `feat(evaluation): implement minimum 3 evaluator rule and auto-refund`
27. `test(evaluation): add unit tests with mock providers`
28. `test(evaluation): add integration tests with real Groq and Gemini APIs`

### Phase 5: Manual Aggregation (Week 8)
29. `feat(admin): implement admin authentication`
30. `feat(admin): implement admin dispute list and detail endpoints`
31. `feat(admin): implement pending aggregations list endpoint`
32. `feat(admin): implement aggregation publish endpoint`
33. `feat(admin): add admin dashboard UI`
34. `test(admin): add unit and integration tests for admin endpoints`

### Phase 6: Opinion Delivery (Week 9)
35. `feat(opinions): implement opinion creation from aggregation`
36. `feat(opinions): implement opinion read endpoint`
37. `feat(opinions): implement PDF generation with Puppeteer`
38. `feat(opinions): implement S3 PDF storage with signed URLs`
39. `feat(opinions): implement opinion status endpoint`
40. `test(opinions): add unit and integration tests for opinion flow`

### Phase 7: Email Notifications (Week 10)
41. `feat(email): implement email service with SendGrid/SES`
42. `feat(email): add email templates for all transactional emails`
43. `feat(email): implement async email queue`
44. `test(email): add unit tests with mocked email provider`

### Phase 8: Frontend (Weeks 11-12)
45. `feat(web): implement landing page`
46. `feat(web): implement registration and login flows`
47. `feat(web): implement dispute creation form`
48. `feat(web): implement brief preparation form with draft save`
49. `feat(web): implement payment page with Stripe`
50. `feat(web): implement opinion view and PDF download`
51. `feat(web): implement user dashboard (dispute list, status)`
52. `test(web): add Playwright E2E tests for complete user flow`

### Phase 9: Hardening (Weeks 13-14)
53. `feat(security): implement application-level encryption for briefs`
54. `feat(security): add rate limiting middleware`
55. `feat(monitoring): integrate Sentry for error tracking`
56. `feat(monitoring): add cost monitoring dashboard`
57. `chore(infra): add GitHub Actions CI pipeline`
58. `chore(infra): add Terraform for production infrastructure`
59. `test(security): run penetration test and fix findings`

### Phase 10: Beta Preparation (Week 15+)
60. `feat(beta): add two-party invitation system`
61. `feat(beta): add counterparty brief preparation`
62. `feat(beta): implement both-submit gate`
63. `feat(beta): add AI-assisted brief preparation with WebSocket`
64. `feat(beta): implement 5-model evaluation (Claude, GPT-4, Gemini, OpenRouter, NVIDIA NIM)`
65. `feat(beta): implement automated aggregation engine`
66. `feat(beta): add document upload and OCR`
67. `feat(beta): make web app mobile-responsive`
68. `feat(beta): add all 3 dispute categories`
69. `feat(beta): implement pricing tiers ($99/$199/$299/$49)`
70. `test(beta): add E2E tests for two-party flow`
71. `chore(beta): update documentation and pricing`

---

### Appendix: Quick Reference


### MVP Success Criteria

- 25 paid analyses.
- 70%+ user satisfaction.
- No major regulatory issues.

### Key Numbers

- Price: $49.
- Expected marginal cost: ~$8.30/analysis.
- Token budget: ~15K input + ~6K output per dispute.
- Evaluators: 3 (Groq: Llama 3 70B, Mixtral 8x7B; Gemini: Gemini 1.5 Pro).
- Word limit: 5000 hard cap.
- Payment timeout: 24 hours.
- Email verification expiry: 24 hours.
- Invitation expiry (Beta): 7 days.
- Data retention: 12 months disputes/briefs/opinions, 7 years payments/audit events.

### Important URLs

- Production API: https://api.meritview.app/v1
- Staging API: https://api.staging.meritview.app/v1
- Development API: http://localhost:3001/v1

---

End of Plan. This document is the single source of truth for building MeritView MVP and Beta. Follow this plan exactly unless explicit re-plan is triggered.


---

## 8. Operational Appendices

### Part 10: Git Workflow and Release Process

## PART 10: Git Workflow and Release Process

### Branch Strategy

```
main (production-ready)
  └── develop (integration)
       ├── feature/auth
       ├── feature/disputes
       ├── feature/briefs
       ├── feature/payments
       ├── feature/evaluation
       ├── feature/aggregation
       ├── feature/opinions
       └── feature/admin
```

### Commit Convention

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore
Scope: auth, disputes, briefs, payments, evaluation, aggregation, opinions, admin, email, infra

Examples:
feat(auth): add email verification endpoint
fix(briefs): enforce 5000 word limit on submit
docs(api): add payment confirmation endpoint spec
test(evaluation): add retry logic tests for provider failures
```

### Development Workflow

1. Create feature branch from `develop`.
2. Implement with tests.
3. Run lint, typecheck, tests locally.
4. Push, open PR to `develop`.
5. CI runs: lint, typecheck, unit tests, integration tests.
6. Code review by team member.
7. Merge to `develop` after approval.
8. `develop` auto-deploys to staging.
9. Test on staging with synthetic data.
10. When Beta ready: open PR from `develop` to `main`.
11. Manual approval gate before merge.
12. `main` deploys to production.

### Beta Release Process

1. All Phase 1 features complete and tested.
2. All Phase 2 features complete and tested.
3. Security audit and penetration testing passed.
4. Load testing passed (100 concurrent users).
5. Compliance review (GDPR, CCPA) passed.
6. External attorney review passed.
7. Create release branch: `release/beta-v1.0`.
8. Final QA on staging.
9. Open PR from `release/beta-v1.0` to `main`.
10. PR includes: changelog, test results, compliance sign-off, legal sign-off.
11. Review and approve.
12. Merge using `gh` CLI:
    ```bash
    gh pr checkout <pr_number>
    gh pr merge <pr_number> --squash --delete-branch
    ```
13. Tag release:
    ```bash
    git tag -a beta-v1.0 -m "Beta launch: single-party contract dispute analysis"
    git push origin beta-v1.0
    ```
14. Production deployment triggered.
15. Monitor for 24 hours before announcing.

---


### Part 11: Deployment Environments

## PART 11: Deployment Environments

### Local Development

- Docker Compose: PostgreSQL, Redis, mock LLM providers.
- No real API keys needed.
- Hot reload for frontend and backend.

### Development (Shared Cloud)

- Real LLM APIs (Groq, Gemini) with rate limits.
- Test Stripe account.
- Synthetic data only.
- Auto-deploy on push to `develop`.

### Staging (Production-Equivalent)

- Production-equivalent infrastructure.
- Synthetic test data only.
- Real LLM APIs.
- Test Stripe.
- Manual deployment trigger.

### Production

- Multi-AZ deployment.
- Real user traffic.
- Real LLM APIs.
- Live Stripe.
- Blue/green deployment.
- Manual approval gate.

---


### Part 12: Monitoring and Alerting

## PART 12: Monitoring and Alerting

### Metrics

- System: CPU, memory, disk, network, DB connections, Redis hit rate.
- API: request rate, error rate, p95 latency, p99 latency.
- Business: disputes/day, payment success rate, analysis completion rate, satisfaction score.
- LLM: cost/dispute, evaluator success rate, latency, token usage per provider.

### Alerts

- Error rate > 1% → PagerDuty.
- Evaluation failure rate > 5% → Slack.
- Cost per dispute > $15 → Slack.
- Payment success rate < 95% → Slack.
- DB connection pool > 80% → Slack.
- LLM provider health check fails → Slack.

### Dashboards

- System health (Grafana).
- Business metrics (custom).
- LLM cost (custom).

---


### Part 13: Compliance and Legal

## PART 13: Compliance and Legal

### Pre-Launch

- [ ] Legal counsel UPL review completed.
- [ ] Disclaimers finalized and approved.
- [ ] ToS drafted and reviewed.
- [ ] Privacy policy drafted and reviewed.
- [ ] Business entity formed.
- [ ] E&O insurance purchased.
- [ ] Cyber insurance purchased.
- [ ] Data breach response plan documented.

### Post-Launch

- [ ] GDPR compliance verified.
- [ ] CCPA compliance verified.
- [ ] SOC 2 Type II preparation started.
- [ ] Quarterly security audits scheduled.
- [ ] Quarterly red-team exercises scheduled.

---


### Part 14: Complete Checklist Before Beta Launch

## PART 14: Complete Checklist Before Beta Launch

### Feature Complete

- [ ] F1: Auth — done and tested.
- [ ] F2: Disputes — done and tested.
- [ ] F3: Briefs — done and tested.
- [ ] F4: Payments — done and tested.
- [ ] F5: Evaluation — done and tested.
- [ ] F6: Aggregation — done and tested.
- [ ] F7: Opinions — done and tested.
- [ ] F8: Admin — done and tested.
- [ ] F9: Email — done and tested.

### Testing Complete

- [ ] All unit tests passing (80%+ coverage).
- [ ] All integration tests passing.
- [ ] All E2E tests passing.
- [ ] Performance tests passed (100 concurrent users).
- [ ] Security tests passed (penetration test).
- [ ] Load tests passed.

### Infrastructure Complete

- [ ] Production DB provisioned and backed up.
- [ ] Redis cluster provisioned.
- [ ] S3 buckets with encryption.
- [ ] CI/CD pipeline operational.
- [ ] Monitoring and alerting configured.
- [ ] CDN configured.

### Legal and Compliance Complete

- [ ] Legal sign-off obtained.
- [ ] ToS published.
- [ ] Privacy policy published.
- [ ] Disclaimers finalized.
- [ ] Insurance active.

### Business Ready

- [ ] First 20 users identified and contacted.
- [ ] Stripe account live.
- [ ] Email service live.
- [ ] Support process defined.
- [ ] Pricing finalized.

---


### Part 26: Complete Rollback Procedure

## PART 26: Complete Rollback Procedure

If production deployment fails:
1. Detect issue via monitoring alerts or user reports.
2. Immediately roll back to previous stable version:
   ```bash
   kubectl rollout undo deployment/api -n production
   kubectl rollout undo deployment/web -n production
   ```
3. Verify rollback success:
   ```bash
   kubectl rollout status deployment/api -n production
   kubectl rollout status deployment/web -n production
   ```
4. Investigate root cause in staging environment.
5. Fix and re-deploy.

**Rollback criteria:**
- Error rate > 5% for 5 minutes.
- Payment success rate < 90%.
- Evaluation failure rate > 20%.
- Any data breach or security incident.

---


### Part 27: Complete Data Backup and Recovery

## PART 27: Complete Data Backup and Recovery

**Backup Schedule:**
- PostgreSQL: automated daily backups with 30-day retention, PITR enabled.
- Redis: RDB snapshots every 6 hours, AOF enabled.
- S3: versioning enabled, cross-region replication for production.

**Recovery Procedures:**
- Database restore from backup:
  ```bash
  aws rds restore-db-instance-from-db-snapshot --db-instance-identifier meritview-restore --db-snapshot-identifier meritview-snap-20260517
  ```
- S3 object recovery:
  ```bash
  aws s3api get-object --bucket meritview-prod --key opinions/op_xyz.json restored-op_xyz.json
  ```

**Recovery Time Objective (RTO):**
- Database: 1 hour.
- S3 objects: 15 minutes.
- Full system: 2 hours.

**Recovery Point Objective (RPO):**
- Database: 24 hours (daily backups).
- S3 objects: 6 hours (RDB snapshots).

---


### Part 28: Complete Cost Monitoring Setup

## PART 28: Complete Cost Monitoring Setup

**Cost Tracking:**
- Track LLM costs per dispute in evaluator_outputs table.
- Daily aggregation job calculates total LLM spend.
- Alert if cost per dispute exceeds $15 (3x expected).
- Weekly cost report sent to team Slack.

**Cost Optimization:**
- Use cheaper models for simpler disputes (heuristic-based routing).
- Cache identical brief evaluations (hash-based cache key).
- Batch evaluator calls where provider supports batch API.
- Monitor provider pricing changes monthly; rotate if cost increases >20%.

**Budget Alerts:**
- Daily spend > $100 → Slack alert.
- Monthly spend > $3,000 → email alert to leadership.
- Cost per dispute > $15 → Slack alert.

---


### Part 29: Complete Prompt Engineering Workflow

## PART 29: Complete Prompt Engineering Workflow

**Prompt Development:**
1. Write initial prompt based on PRD requirements.
2. Test prompt against 10 curated disputes.
3. Analyze outputs for systematic issues.
4. Iterate on prompt wording and instructions.
5. Version prompt (eval-v3.2, eval-v3.3, etc.).
6. A/B test new prompt version against old on live traffic (10% each).
7. If new version performs better (higher evaluator agreement, fewer hallucinations), promote to 100%.
8. Document prompt changes in CHANGELOG.md.

**Prompt Testing Metrics:**
- Inter-evaluator agreement: target 80%+.
- Hallucination rate: target <1% (flagged factual concerns).
- Factual concern relevance: human review of 10% of disputes.
- User satisfaction correlation: do higher confidence scores correlate with higher user satisfaction?

**Prompt Review Cadence:**
- Weekly: review 5 random disputes for prompt quality.
- Monthly: full prompt audit with external attorney.
- Quarterly: prompt version rotation if better models available.

---


### Part 30: Complete Incident Response Plan

## PART 30: Complete Incident Response Plan

**Severity Levels:**
- SEV1: Data breach, complete system outage, payment processing down. Response: 15 minutes. Escalate to leadership.
- SEV2: Partial outage, evaluation failures >20%, error rate >5%. Response: 1 hour.
- SEV3: Minor bugs, single provider down, cosmetic issues. Response: 24 hours.

**Incident Response Steps:**
1. Detect: monitoring alert or user report.
2. Triage: determine severity and impact.
3. Mitigate: rollback, disable failing component, switch providers.
4. Communicate: update status page, notify affected users.
5. Resolve: fix root cause.
6. Post-mortem: document incident, identify preventive measures.

**Communication Channels:**
- Status page: status.meritview.app
- Team Slack: #incidents
- User notifications: in-app + email for SEV1/SEV2.

---


### Part 31: Complete Access Control Matrix

## PART 31: Complete Access Control Matrix

**Role: User (standard)**
- Can create disputes
- Can write briefs
- Can pay for analysis
- Can view own disputes and opinions
- Cannot view other users' disputes
- Cannot access admin endpoints

**Role: Admin**
- Can view all disputes
- Can publish opinions (aggregation)
- Can view system health dashboard
- Cannot modify user data
- Cannot access payment processor
- All actions logged in audit_events

**Role: Support**
- Can view user disputes (with user consent)
- Can process refunds
- Can view audit logs
- Cannot view brief content without approval
- All actions logged in audit_events

---


### Part 32: Complete Dispute State Transitions (Canonical)

## PART 32: Complete Dispute State Transitions (Canonical)

**MVP States:**
- `draft`: initial state after creation
- `brief_submitted`: user has submitted brief
- `payment_pending`: brief submitted, awaiting payment
- `under_analysis`: payment confirmed, evaluation in progress
- `awaiting_aggregation`: all evaluators complete, waiting for manual aggregation
- `completed`: opinion published and delivered
- `failed`: evaluation failed (auto-refund issued)
- `withdrawn`: user cancelled before payment

**Valid Transitions:**
- `draft` → `brief_submitted` (user submits brief)
- `draft` → `withdrawn` (user cancels)
- `brief_submitted` → `payment_pending` (brief submitted)
- `brief_submitted` → `draft` (user withdraws before payment)
- `payment_pending` → `under_analysis` (payment confirmed)
- `payment_pending` → `draft` (payment fails/expires, user cancels)
- `payment_pending` → `failed` (payment fails after retries)
- `under_analysis` → `awaiting_aggregation` (all evaluators complete)
- `under_analysis` → `failed` (fewer than 3 evaluators succeed)
- `awaiting_aggregation` → `completed` (admin publishes opinion)
- `awaiting_aggregation` → `failed` (admin cannot aggregate, refund issued)
- `completed` → (terminal)
- `failed` → (terminal, refund issued)
- `withdrawn` → (terminal, refund issued if applicable)

**Invalid Transitions (rejected with 409):**
- Any state → `draft` (except `payment_pending` → `draft` on failure)
- Any state → `completed` (except `awaiting_aggregation` → `completed`)
- `completed` → any other state
- `failed` → any other state
- `withdrawn` → any other state

---


### Part 33: Complete B2B Expansion Plan (Phase 3+)

## PART 33: Complete B2B Expansion Plan (Phase 3+)

**B2B Offerings:**
1. White-label for legal aid organizations
   - Custom branding
   - Volume pricing ($10-20/analysis)
   - API access for case management systems

2. Insurance company integration
   - Pre-litigation dispute analysis for claims
   - Batch processing for multiple claims
   - Custom evaluation criteria per policy

3. HR department integration
   - Employee dispute resolution
   - Anonymous analysis option
   - Integration with HRIS systems

4. API access for legal tech platforms
   - REST API for opinion generation
   - Webhook notifications
   - Usage-based pricing ($X per API call)

**B2B Technical Requirements:**
- OAuth 2.0 client credentials for API access.
- Webhook signatures for secure notifications.
- Usage tracking and billing per organization.
- Custom evaluation prompts per organization.
- SLA guarantees (99.9% uptime, <1 hour support response).

**B2B Revenue Model:**
- Subscription: $500-5,000/month depending on volume.
- Per-use: $25-50 per analysis (volume discount).
- Enterprise: custom pricing for >1,000 analyses/month.

**B2B Timeline:**
- Month 12-15: API development and documentation.
- Month 16-18: Pilot with 2-3 legal aid organizations.
- Month 19-24: Full B2B launch with 10+ customers.

---

### Part 34: Complete Internationalization Plan (Phase 4)

## PART 34: Complete Internationalization Plan (Phase 4)

**Languages (priority order):**
1. Spanish (Month 13-15)
2. French (Month 16-18)
3. German (Month 19-21)
4. Portuguese (Month 22-24)

**Technical Requirements:**
- i18n framework: react-i18next for frontend, i18next for backend.
- All UI strings externalized to translation files.
- LLM prompts translated and tested for each language.
- Local LLM providers for EU data residency (Gemini EU, Mistral EU).

**Legal Requirements:**
- Terms of service translated and reviewed by local counsel.
- Privacy policy compliant with local regulations (GDPR, LGPD, etc.).
- Disclaimers in local language.

---

### Part 35: Complete Accessibility Requirements

## PART 35: Complete Accessibility Requirements

**WCAG 2.1 Level AA Compliance:**
- All interactive elements keyboard accessible.
- Color contrast ratio >= 4.5:1 for text.
- Screen reader support (ARIA labels).
- Focus indicators on all focusable elements.
- Alternative text for all images.
- Captions for all video content (if any).

**Testing:**
- Automated: axe-core in CI pipeline.
- Manual: keyboard navigation test, screen reader test (NVDA, VoiceOver).
- User testing: include users with disabilities in beta testing.

---

### Part 36: Complete Performance Optimization Plan

## PART 36: Complete Performance Optimization Plan

**Frontend:**
- Code splitting: dynamic imports for heavy components.
- Image optimization: Next.js Image component with WebP/AVIF.
- Bundle size: target <200KB initial JS bundle.
- Caching: stale-while-revalidate for API responses.
- CDN: Vercel Edge Network for static assets.

**Backend:**
- Database: read replicas for query scaling.
- Caching: Redis for frequent queries (dispute list, user profile).
- Connection pooling: PgBouncer (5-10 connections per instance).
- Rate limiting: express-rate-limit with Redis store.
- Compression: gzip/brotli for all responses.

**Database:**
- Indexes on all foreign keys and frequently queried columns.
- Partial indexes for state filtering (disputes by state).
- Covering indexes for hot query paths.
- Query optimization: avoid N+1 queries with Prisma includes.

**LLM:**
- Parallel evaluation: all 3 evaluators called simultaneously.
- Streaming: use streaming responses where supported.
- Caching: cache identical brief evaluations (hash-based cache key).
- Cost monitoring: real-time tracking per request.

---

### Part 37: Complete Disaster Recovery Plan

## PART 37: Complete Disaster Recovery Plan

**Disaster Scenarios:**
1. Database corruption
   - Recovery: restore from latest backup + replay WAL.
   - RTO: 2 hours.
   - RPO: 24 hours.

2. LLM provider outage
   - Recovery: switch to backup providers (Groq ↔ Gemini).
   - RTO: 5 minutes.
   - RPO: 0 (requests queued during outage).

3. S3 outage
   - Recovery: switch to backup bucket in different region.
   - RTO: 30 minutes.
   - RPO: 6 hours.

4. Complete AWS region outage
   - Recovery: failover to secondary region (us-west-2).
   - RTO: 4 hours.
   - RPO: 24 hours.

5. Data breach
   - Recovery: rotate all encryption keys, notify users, file insurance claim.
   - RTO: 4 hours.
   - RPO: 0 (prevent further breach).

---


### Part 38: Complete User Onboarding Flow

## PART 38: Complete User Onboarding Flow

**MVP Onboarding:**
1. User lands on meritview.app
2. Clicks "Start My Analysis"
3. Sees value prop: "AI-powered dispute analysis for $49"
4. Clicks "Get Started"
5. Enters email and password
6. Receives verification email
7. Clicks verification link
8. Redirected to dashboard
9. Clicks "New Dispute"
10. Fills dispute creation form
11. Redirected to brief preparation
12. Writes brief in 5-section form
13. Clicks "Submit Brief"
14. Reviews and confirms
15. Redirected to Stripe payment page
16. Enters card details and pays $49
17. Redirected to "Analysis in Progress" page
18. Receives email when opinion ready
19. Views opinion and downloads PDF

**Time to complete:** target <30 minutes of active user time.

**Beta Onboarding (improved):**
1-8: same as MVP
9. Onboarding tour highlighting new features
10. AI-assisted brief prep option shown
11. Document upload option shown
12. Two-party invite option shown
13. Faster completion time target: <20 minutes.

---

### Part 39: Complete Competitive Analysis

## PART 39: Complete Competitive Analysis

**Competitors:**
1. LegalZoom
   - Strengths: brand recognition, large user base, full legal services.
   - Weaknesses: expensive, slow, not AI-first.
   - MeritView advantage: affordable, fast, AI-native.

2. Rocket Lawyer
   - Strengths: subscription model, document templates.
   - Weaknesses: not dispute analysis, self-service only.
   - MeritView advantage: active analysis, multi-model evaluation.

3. Modria (online dispute resolution)
   - Strengths: established ODR platform, enterprise clients.
   - Weaknesses: human-mediated, expensive, slow.
   - MeritView advantage: AI-powered, fast, affordable.

4. Wevorce
   - Strengths: divorce specialization, mediation focus.
   - Weaknesses: niche (divorce only), human mediators.
   - MeritView advantage: broader categories, AI-first, faster.

**MeritView Differentiation:**
- Multi-model AI aggregation (unique).
- Single-party analysis option (unique).
- 4-hour turnaround vs. weeks/months.
- $49 vs. $300-800/hour legal fees.
- Decision support framing avoids regulatory pitfalls.

---

### Part 40: Complete Go-to-Market Strategy

## PART 40: Complete Go-to-Market Strategy

**Phase 1: MVP Launch (Months 1-3)**
- Target: 25 paid analyses
- Channels: personal network, Reddit (r/legaladvice, r/smallbusiness), LinkedIn
- Messaging: "AI-powered dispute analysis for $49"
- Offer: free initial analysis for first 10 users

**Phase 2: Beta Launch (Months 4-6)**
- Target: 100 paid analyses/month
- Channels: content marketing (blog posts on dispute resolution), SEO, partnerships with small business associations
- Messaging: "Fast, fair, affordable dispute analysis"
- Offer: free analysis for referrals

**Phase 3: Public Launch (Months 7-12)**
- Target: 1,000 paid analyses/month
- Channels: paid ads (Google, LinkedIn), PR, partnerships with legal tech platforms
- Messaging: "The future of dispute resolution"
- Offer: subscription option for repeat users

**Phase 4: Expansion (Months 12-24)**
- Target: 10,000+ paid analyses/month
- Channels: B2B sales, international expansion, API partnerships
- Messaging: "Enterprise dispute analysis at scale"
- Offer: custom pricing for volume

---

### Part 41: Complete User Feedback Loop

## PART 41: Complete User Feedback Loop

**Feedback Collection:**
1. Post-opinion survey (1-click satisfaction score + optional comments).
2. Email follow-up at 7 days: "How did the analysis help?"
3. Quarterly user interviews with 10% of users.
4. Support ticket analysis: categorize and prioritize issues.

**Feedback Processing:**
1. Weekly review of feedback by founder.
2. Triage: bug, feature request, UX improvement.
3. Prioritization: must-have for next sprint vs. nice-to-have.
4. Implementation: add to backlog, schedule for next sprint.
5. Communication: notify users who requested feature when implemented.

**Feedback Metrics:**
- User satisfaction score (target 4.0+/5.0).
- Net Promoter Score (NPS) (target >50).
- Feature request velocity (target 5 features/month from user feedback).
- Bug resolution time (target <48 hours for critical bugs).

---

### Part 42: Complete Accessibility and Usability Testing

## PART 42: Complete Accessibility and Usability Testing

**Testing Methods:**
1. Heuristic evaluation: expert review against Nielsen's 10 heuristics.
2. Cognitive walkthrough: task-based usability testing.
3. A/B testing: compare two designs for key flows.
4. Tree testing: test information architecture.
5. First-click testing: test navigation clarity.

**Testing Schedule:**
- Pre-MVP: heuristic evaluation + cognitive walkthrough with 5 users.
- Post-MVP: A/B testing on key conversion flows.
- Beta: tree testing + first-click testing.
- Post-Beta: full usability study with 15 users.

---

### Part 43: Complete Brand and Design System

## PART 43: Complete Brand and Design System

**Brand Colors:**
- Primary: #1a73e8 (Google Blue equivalent)
- Secondary: #34a853 (Green for success)
- Warning: #fbbc04 (Yellow for caution)
- Error: #ea4335 (Red for errors)
- Neutral: #5f6368 (Gray for text)

**Typography:**
- Headings: Inter, 600 weight
- Body: Inter, 400 weight
- Code: JetBrains Mono, 400 weight

**Spacing:**
- Base unit: 8px
- Scale: 8, 16, 24, 32, 48, 64, 128

**Components:**
- Button: primary, secondary, ghost variants
- Input: text, textarea, select, checkbox, radio
- Card: white background, shadow, rounded corners
- Modal: centered overlay, close button, ESC to close
- Toast: top-right corner, auto-dismiss after 5s

**Icons:**
- Lucide React (consistent, accessible, lightweight)

---

### Part 44: Complete Documentation Requirements

## PART 44: Complete Documentation Requirements

**User Documentation:**
- Landing page copy (value prop, how it works, pricing)
- FAQ page (20+ common questions)
- Terms of service
- Privacy policy
- Disclaimer page

**Developer Documentation:**
- README.md with setup instructions
- API documentation (OpenAPI/Swagger)
- Database schema documentation
- Architecture diagrams
- Deployment guide
- Contributing guide

**Internal Documentation:**
- Runbook for common incidents
- Onboarding guide for new team members
- Prompt engineering best practices
- LLM provider comparison matrix
- Legal review notes

---

### Part 45: Complete Partner Ecosystem

## PART 45: Complete Partner Ecosystem

**Partner Types:**
1. Legal Aid Organizations
   - Integration: white-label or API access
   - Revenue share: 20-30%
   - Value: access to users who can't afford legal fees

2. Mediation Services
   - Integration: referral flow from opinion to mediator
   - Revenue share: 10-15% per referral
   - Value: path to resolution for users

3. Legal Tech Platforms
   - Integration: API access for dispute analysis
   - Revenue: usage-based pricing
   - Value: distribution to existing user bases

4. Bar Associations
   - Integration: endorsed service for members
   - Revenue: none (marketing partnership)
   - Value: credibility and trust

**Partner Onboarding:**
1. Identify potential partners.
2. Send partnership proposal.
3. Technical integration (API docs, sandbox environment).
4. Legal agreement (revenue share, data handling).
5. Pilot with 10-20 disputes.
6. Full integration and launch.

---


### Part 46: Complete Research and Development Pipeline

## PART 46: Complete Research and Development Pipeline


**Ongoing R&D:**
1. Prompt engineering: monthly prompt audits and iterations.
2. Model evaluation: quarterly evaluation of new LLM models.
3. Aggregation research: test trained classifier vs. LLM aggregator.
4. Corpus analysis: privacy-preserving analysis of dispute outcomes.
5. Jurisdiction expansion: research new dispute categories and jurisdictions.

**R&D Budget:**
- LLM API costs: $500-1,000/month for testing.
- External evaluators: $2,000-5,000/quarter for attorney reviews.
- Tools and infrastructure: $500/month.

**R&D Timeline:**
- Month 3-4: prompt engineering sprint.
- Month 6-7: aggregation engine research.
- Month 9-10: jurisdiction expansion research.
- Month 12+: B2B feature development.

---

### Part 47: Complete Open Source Strategy

## PART 47: Complete Open Source Strategy

**Open Source Components:**
- LLM provider abstraction layer (backend/src/shared/llm-abstraction)
- Evaluation prompt templates (backend/src/shared/prompts)
- Database schema and migrations (infra/db)
- Docker Compose setup (infra/docker-compose.yml)

**Closed Source Components:**
- Business logic (backend/src/services)
- Frontend code (frontend/src)
- Admin dashboard (backend/src/routes/admin)

**Open Source Benefits:**
- Community contributions to provider adapters.
- Transparency builds trust with users.
- Attracts developer talent.
- Improves code quality through public scrutiny.

**Open Source Risks:**
- Competitors can copy provider adapters.
- Security researchers may find vulnerabilities.
- Support burden from community issues.

**Mitigations:**
- License: MIT for open source components.
- Security: responsible disclosure policy, bug bounty program.
- Support: community support via GitHub issues, paid support for enterprise.

---

### Part 48: Complete Accessibility and Inclusion

## PART 48: Complete Accessibility and Inclusion

**Inclusive Design:**
- Colorblind-friendly palette (tested with Color Blindness Simulator).
- Screen reader support (tested with NVDA and VoiceOver).
- Keyboard navigation (all features accessible without mouse).
- Language simplicity (avoid legal jargon in UI).

**Accessibility Testing:**
- Automated: axe-core in CI.
- Manual: keyboard navigation, screen reader testing.
- User testing: include users with disabilities in beta.

**Accessibility Standards:**
- WCAG 2.1 Level AA compliance.
- Section 508 compliance (US government requirement).
- EN 301 549 compliance (EU requirement).

---

### Part 49: Complete Sustainability and Scalability

## PART 49: Complete Sustainability and Scalability

**Sustainability:**
- Carbon footprint: monitor and optimize (Green Software Foundation principles).
- Energy efficiency: use managed services with renewable energy.
- E-waste: extend hardware lifecycle, recycle responsibly.

**Scalability:**
- Architecture designed for 100K+ analyses/month before major refactoring.
- Stateless services scale horizontally.
- Database scales vertically then via read replicas.
- LLM providers scale externally (their responsibility).

**Scalability Milestones:**
- 1,000 analyses/month: current architecture sufficient.
- 10,000 analyses/month: add read replicas, optimize queries.
- 100,000 analyses/month: consider sharding, custom aggregation model.
- 1,000,000 analyses/month: major architecture review, possibly custom LLM.

---

### Part 50: Complete Lessons Learned and Post-Mortem Template

## PART 50: Complete Lessons Learned and Post-Mortem Template

**Post-Mortem Template:**
1. Incident summary (what happened, when, impact).
2. Timeline of events.
3. Root cause analysis (5 whys).
4. What went well.
5. What went wrong.
6. Action items (who, what, when).
7. Follow-up review date.

**Lessons Learned (to be filled after MVP):**
- [ ] Technical: what architectural decisions worked/didn't work?
- [ ] Product: what features did users actually use/ignore?
- [ ] Process: what development practices were effective/ineffective?
- [ ] Business: what did we learn about user willingness to pay?

**Post-Mortem Cadence:**
- After MVP launch: comprehensive post-mortem.
- After Beta launch: focused post-mortem on scaling issues.
- Quarterly: review of lessons learned and process improvements.

---

### Part 51: Complete Handoff Checklist for New Team Members

## PART 51: Complete Handoff Checklist for New Team Members

**Before Starting:**
- [ ] Read this plan document completely.
- [ ] Set up local development environment (PART 19).
- [ ] Read architecture documentation.
- [ ] Review database schema.
- [ ] Review API specification.
- [ ] Review prompt templates.

**First Week:**
- [ ] Complete onboarding tasks (GitHub access, AWS access, etc.).
- [ ] Review recent PRs and codebase structure.
- [ ] Run tests locally and verify they pass.
- [ ] Deploy to staging environment.
- [ ] Complete first small bug fix or feature.

**First Month:**
- [ ] Contribute to at least 3 features.
- [ ] Participate in code reviews.
- [ ] Document any onboarding gaps.
- [ ] Meet with legal counsel to understand UPL positioning.

---

### Part 52: Complete Release Notes Template

## PART 52: Complete Release Notes Template

```
## [Version] - YYYY-MM-DD

### Added
- Feature descriptions

### Changed
- Change descriptions

### Deprecated
- Deprecated feature descriptions

### Removed
- Removed feature descriptions

### Fixed
- Bug fix descriptions

### Security
- Security fix descriptions
```

**Example:**
```
## beta-v1.0 - 2026-09-01

### Added
- Single-party contract dispute analysis
- 3-model AI evaluation (Groq Llama 3 70B, Groq Mixtral 8x7B, Gemini 1.5 Pro)
- Manual aggregation by internal team
- Opinion delivery via web, email, and PDF
- Admin dashboard for aggregation

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A
```


### Part 53: Complete Incident Communication Templates

## PART 53: Complete Incident Communication Templates

**Status Page Update:**
```
"Investigating - We are currently investigating [issue]. Users may experience [impact]. We will provide an update within [timeframe]."
```

**Update:**
```
"Identified - We have identified the root cause of [issue]. [Explanation]. We are working on a fix and expect to resolve by [time]."
```

**Resolved:**
```
"Resolved - [Issue] has been resolved. [Explanation of fix]. Thank you for your patience."
```

**User Email (SEV1/SEV2):**
```
Subject: Service Disruption - [Issue]

Dear MeritView User,

We are writing to inform you of a service disruption that affected [time period]. 
[Description of issue].
[Impact on users].
[Steps taken to resolve].
[Preventive measures for future].

We apologize for any inconvenience and appreciate your patience.

Sincerely,
The MeritView Team
```

---

### Part 54: Complete Data Migration Guide

## PART 54: Complete Data Migration Guide

**No data migrations needed for MVP (fresh database).**

**Beta Migration (if needed):**
- If adding new columns: use multi-phase migration (add column → backfill → make required → remove old).
- If changing schema: create new table, migrate data, switch over, drop old table.
- If adding indexes: create concurrently to avoid locking.

**Migration Testing:**
- Test all migrations on staging with production-equivalent data volume.
- Verify rollback procedure works.
- Measure migration time (target <5 minutes).

---

### Part 55: Complete Feature Flag Strategy

## PART 55: Complete Feature Flag Strategy

**Feature Flags (for gradual rollout):**
- `beta_two_party_mode`: enable two-party mode for 10% of users, then 50%, then 100%.
- `beta_ai_brief_prep`: enable AI-assisted brief preparation for beta users.
- `beta_document_upload`: enable document upload for beta users.
- `beta_pricing_tiers`: enable pricing tiers for beta users.

**Feature Flag Implementation:**
- Use LaunchDarkly or self-hosted solution.
- Flags evaluated server-side (no client-side flag logic).
- Flags logged in audit_events for debugging.
- Flags can be toggled without code deployment.

**Rollback Procedure:**
1. Disable feature flag in dashboard.
2. Verify flag disabled in production.
3. Monitor for 30 minutes to confirm issue resolved.
4. If not resolved, proceed to full rollback.

---

### Part 56: Complete Accessibility Testing Checklist

## PART 56: Complete Accessibility Testing Checklist

- [ ] All pages keyboard navigable (Tab, Enter, Escape, Arrow keys).
- [ ] All images have alt text.
- [ ] All form inputs have labels.
- [ ] Error messages are associated with form inputs.
- [ ] Color is not the only means of conveying information.
- [ ] Text has sufficient color contrast (4.5:1 for normal text, 3:1 for large text).
- [ ] Page has logical heading structure (h1 → h2 → h3).
- [ ] Focus order is logical and predictable.
- [ ] Skip navigation link provided.
- [ ] ARIA landmarks used (main, navigation, complementary).
- [ ] Live regions announced for dynamic content (opinion status updates).
- [ ] CAPTCHA alternatives provided (email verification, phone verification).

---

### Part 57: Complete Legal Compliance Checklist

## PART 57: Complete Legal Compliance Checklist

**Before Launch:**
- [ ] Terms of Service drafted and reviewed by counsel.
- [ ] Privacy Policy drafted and reviewed by counsel.
- [ ] Cookie Policy published (if applicable).
- [ ] Disclaimer language approved by counsel.
- [ ] UPL analysis completed for all target jurisdictions.
- [ ] Data processing agreements signed with all LLM providers.
- [ ] Business associate agreements signed (if handling health data in future).
- [ ] E&O insurance policy active.
- [ ] Cyber insurance policy active.
- [ ] Data breach notification procedures documented.
- [ ] GDPR compliance verified (right to access, right to deletion, data portability).
- [ ] CCPA compliance verified (privacy rights, opt-out, deletion).
- [ ] COPPA compliance verified (no users under 13).
- [ ] CAN-SPAM compliance verified (email marketing).

**Ongoing:**
- [ ] Quarterly legal review of terms and policies.
- [ ] Monitor regulatory changes (EU AI Act, US state laws).
- [ ] Annual security audit.
- [ ] Annual privacy audit.
- [ ] Incident response plan tested annually.

---

### Part 58: Complete User Story Map

## PART 58: Complete User Story Map

**Epic 1: Onboarding**
- Story 1.1: User lands on page and understands value prop
- Story 1.2: User creates account
- Story 1.3: User verifies email
- Story 1.4: User creates first dispute

**Epic 2: Brief Preparation**
- Story 2.1: User writes brief in structured form
- Story 2.2: User saves draft
- Story 2.3: User submits brief
- Story 2.4: User pays for analysis

**Epic 3: Analysis**
- Story 3.1: System evaluates brief with 3 LLMs
- Story 3.2: Team aggregates outputs
- Story 3.3: Opinion is generated

**Epic 4: Opinion Delivery**
- Story 4.1: User receives notification
- Story 4.2: User views opinion
- Story 4.3: User downloads PDF
- Story 4.4: User uses opinion to resolve dispute

**Epic 5: Repeat Usage**
- Story 5.1: User creates second dispute
- Story 5.2: User refers friend
- Story 5.3: User requests re-analysis

---

### Part 59: Complete Success Metrics Dashboard

## PART 59: Complete Success Metrics Dashboard

**Dashboard Sections:**

1. **Acquisition**
   - Signups per day/week/month
   - Signup conversion rate (landing → registered)
   - Source breakdown (organic, referral, paid)

2. **Activation**
   - Disputes created per day/week/month
   - Brief submission rate (disputes → briefs)
   - Payment success rate (briefs → paid)
   - Time to first payment

3. **Revenue**
   - Revenue per day/week/month
   - Average revenue per user (ARPU)
   - Customer lifetime value (LTV)
   - Customer acquisition cost (CAC)
   - LTV:CAC ratio (target >3:1)

4. **Engagement**
   - Active users per day/week/month
   - Disputes per user
   - Time spent in app
   - Feature adoption (brief save, PDF download)

5. **Retention**
   - Day 1/7/30 retention
   - Repeat usage rate (users with >1 dispute)
   - Churn rate

6. **Quality**
   - User satisfaction score (post-opinion survey)
   - Net Promoter Score (NPS)
   - Complaint rate
   - Refund rate
   - Evaluator agreement rate
   - Hallucination rate (flagged factual concerns)

7. **Operations**
   - Evaluation success rate
   - Evaluation latency (p50, p95, p99)
   - Cost per dispute
   - Support ticket volume
   - Support ticket resolution time

---

### Part 60: Complete Knowledge Base

## PART 60: Complete Knowledge Base

**Frequently Asked Questions (FAQ):**
1. What is MeritView? (AI-powered dispute analysis)
2. How much does it cost? ($49 per analysis)
3. Is this legal advice? (No, it's decision support)
4. How long does it take? (~4 hours for evaluation + aggregation)
5. Is my data secure? (Yes, encrypted at rest and in transit)
6. What if I'm not satisfied? (Refund policy)
7. Can I use this for any dispute? (Contract interpretation only in MVP)
8. What if the other party doesn't participate? (Single-party analysis available)
9. How do you ensure quality? (Multi-model evaluation, human review)
10. Who can see my dispute? (Only you and the MeritView team)

**Troubleshooting:**
- "I didn't receive verification email": Check spam, request new email.
- "Payment failed": Check card details, try again, contact support if persists.
- "Analysis is taking too long": Check opinion status, contact support if >24 hours.
- "I want a refund": Go to dispute page, click "Request Refund".

**Contact:**
- Support email: support@meritview.app
- Legal inquiries: legal@meritview.app
- Partnership inquiries: partners@meritview.app

---

### Part 61: Admin Authentication (Locked Decision)

## PART 61: Admin Authentication (Locked Decision)

### Decision

Admin users use the same `users` table as regular users. A `role` column distinguishes access levels.

### Database Change

Add to `users` table:
```sql
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'standard';
-- Allowed values: 'standard', 'admin', 'support'
CREATE INDEX idx_users_role ON users(role);
```

### Admin User Creation

Admin users are NOT created through self-service signup. They are created via:
1. Database seed script in development.
2. Direct database insert or admin CLI command in production.
3. Initial admin user created during first deployment via infrastructure bootstrap.

### Authentication Flow

1. Admin visits `/v1/auth/login` with email + password.
2. If user.role = 'admin', JWT payload includes `admin: true`.
3. If user.role = 'support', JWT payload includes `support: true`.
4. Regular users get no special claims.

### Authorization Middleware

```typescript
// Admin-only middleware
function requireAdmin(req, res, next) {
  if (!req.user.admin) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } });
  }
  next();
}

// Support-only middleware
function requireSupport(req, res, next) {
  if (!req.user.support) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Support access required' } });
  }
  next();
}
```

### Admin Endpoints Protection

All `/v1/admin/*` endpoints use `requireAdmin` middleware.

### Edge Cases

- Regular user tries to access admin endpoint → 403.
- Admin user is downgraded to standard → existing admin tokens remain valid until expiry (acceptable for MVP; add token revocation on role change in Phase 2 if needed).
- Admin account is deleted → all admin tokens expire naturally; no special handling needed.

### Tests

- [ ] Admin user logs in → JWT includes admin: true.
- [ ] Regular user logs in → JWT has no admin claim.
- [ ] Admin accesses admin endpoint → 200.
- [ ] Regular user accesses admin endpoint → 403.
- [ ] Support user accesses admin endpoint → 403.

---

End of Plan. This document is the single source of truth for building MeritView MVP and Beta. Follow this plan exactly unless explicit re-plan is triggered.


### Audit Fixes Applied (2026-07-22)


The following fixes were applied to close gaps identified in the end-to-end audit against the five source documents.

### Fix 1: Idempotency Keys

Added to F2, F4, and F6:
- All mutating POST endpoints accept `Idempotency-Key` header.
- Keys stored in database with 24h TTL.
- Repeated requests with same key return original response without re-executing.

### Fix 2: Stripe Webhook Endpoint

Added to PART 4 (API Reference):
- `POST /v1/webhooks/stripe` — handles Stripe webhook events.
- Verifies signature using `STRIPE_WEBHOOK_SECRET`.
- Handles `payment_intent.succeeded`, `payment_intent.failed`, and other events.

### Fix 3: SSE for Opinion Status

Added to F7:
- `GET /v1/disputes/:dispute_id/opinion/status/stream` — Server-Sent Events stream.
- Content-Type: `text/event-stream`.
- Pushes status updates in real time instead of polling.

### Fix 4: Rate Limit Headers

Added to F1 middleware:
- All responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- Documented in PART 4 API reference.

### Fix 5: Encryption Key Management

Added to PART 21 (Environment Variables):
- Production: AWS KMS for encryption keys with quarterly rotation.
- Local dev: environment variable fallback with warning.
- Keys never stored in code or unsecured storage.

### Fix 6: Data Retention TTL

Added to PART 3 (Database Schema):
- `retention_expires_at` column on `briefs`, `opinions`, and `audit_events`.
- Cron job enforces automated deletion after retention period.
- 12 months for briefs/opinions, 7 years for payments/audit events.

### Fix 7: Prompt Injection Mitigation

Added to F5:
- Input sanitization step before sending brief to evaluators.
- Output validation layer to detect prompt injection patterns.
- Documented threat model in PART 6 edge cases.

### Fix 8: Content Moderation

Added to F3:
- Content moderation check before brief submission.
- Uses LLM provider content moderation APIs or third-party service.
- Defines disallowed content policy.

### Fix 9: Standard Error Envelope

Added to PART 4:
- All errors follow `{ error: { code, message, details, request_id, documentation_url } }`.
- `request_id` generated per request in middleware.
- Error codes documented in API reference.

### Fix 10: Token Budget Alignment

Corrected in F5:
- MVP: 3 evaluators × ~5K input + ~2K output = ~21K per dispute.
- Phase 2: 5 evaluators × ~5K input + ~2K output = ~35K per dispute.
- Cost monitoring thresholds updated accordingly.

### Fix 11: User Profile Fields

Added to F1 and PART 3:
- `marketing_opt_in` boolean.
- `preferred_llm_provider` string.
- `stats` object computed from disputes table.
- Updated `GET /v1/users/me` response schema.

### Fix 12: Opinion Schema Fields

Added to F7 and PART 3:
- `total_cost_usd`, `aggregator_provider`, `aggregator_model_id`.
- `inter_evaluator_agreement` calculated from evaluator outputs.
- `evaluator_agreement` stored in opinion record.

### Fix 13: CORS Configuration

Added to PART 25 (Security Checklist):
- Allowed origins: `https://meritview.app`, `https://staging.meritview.app`.
- Credentials: true.
- Max age: 86400.

### Fix 14: Security Headers

Added to PART 25:
- Helmet.js configuration with exact headers:
  - `Content-Security-Policy`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains`

### Fix 15: CQRS Note

Added to PART 8:
- MVP uses single database.
- Phase 2 separates opinion read model from evaluation write model.

### Fix 16: Circuit Breakers

Added to F5:
- Circuit breaker pattern in provider abstraction layer.
- Fallback to remaining providers if primary fails.

### Fix 17: API Versioning Strategy

Added to PART 4:
- All Phase 2 breaking changes go to `/v2`.
- Maintain `/v1` for 12-month deprecation period.

### Fix 18: Withdrawal Endpoint

Added to F2:
- `POST /v1/disputes/:dispute_id/withdraw`.
- Full refund if no analysis performed.
- Prorated refund if partial analysis completed.

### Fix 19: Frontend State Management

Added to PART 8:
- `@tanstack/react-query` for server state.
- `zustand` for client state.
- Documented usage patterns.

### Fix 20: Capability Negotiation

Added to LLM Provider Interface:
- `capabilities` object includes context window, streaming support, etc.
- Business logic routes requests based on capabilities.

---

End of Audit Fixes.
