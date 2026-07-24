# MeritView — AI Decision Support for Contract Disputes

## Overview
MeritView is a web-based AI decision-support platform that analyzes single-party contract disputes using a 3-model LLM evaluation pipeline (Groq Llama 3 70B, Groq Mixtral 8x7B, Gemini 1.5 Pro) with manual aggregation by an internal team. The platform collects $49 per analysis at brief submission, delivers structured opinions with PDF export, and operates under explicit "decision support, not legal advice" positioning to avoid UPL regulatory risk.

## Architecture
Three completely isolated folders — no monorepo, no shared packages:

```
meritview/
├── backend/          # Express + Prisma + Redis + JWT (port 3001)
├── frontend/         # Next.js 14 + React 18 + Tailwind (port 3000)
├── infra/            # Docker Compose (PostgreSQL + Redis)
└── docs/             # All documentation & specs
```

Each folder has its own `package.json`, dependency tree, and `node_modules`. Frontend and backend communicate **only** through versioned HTTP APIs (`/api/v1/...`). The OpenAPI spec in `backend/docs/openapi.yaml` is the single source of truth; frontend generates its types at build time.

## Tech Stack (Pinned)
- **Runtime**: Node.js 20 LTS
- **Package Manager**: pnpm 8.x (independent per folder)
- **Frontend**: Next.js 14.2, React 18.3, TypeScript 5.4, Tailwind 3.4, Zustand, TanStack Query
- **Backend**: Express 4.19, Prisma 5.14, PostgreSQL 16, Redis 7.2, bcrypt, jsonwebtoken, bullmq
- **Auth**: Custom JWT (15m access / 7d refresh), email verification, password reset
- **Payments**: Stripe SDK 14.x
- **LLM**: Groq SDK + Google Generative AI SDK
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **CI**: GitHub Actions
- **Infra**: Docker, Terraform

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- Docker & Docker Compose

### 1. Start Infrastructure
```bash
cd infra
docker-compose up -d
```
This starts PostgreSQL (5432) and Redis (6379).

### 2. Backend Setup
```bash
cd backend
cp .env.example .env   # edit with your keys
pnpm install
pnpm db:push           # creates tables
pnpm db:seed           # seeds admin + test user
pnpm dev               # runs on http://localhost:3001
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env.local
pnpm install
pnpm dev               # runs on http://localhost:3000
```

### 4. Run Tests
```bash
# Backend
cd backend && pnpm test

# Frontend
cd frontend && pnpm test && pnpm test:e2e
```

## API Documentation
- **OpenAPI Spec**: `backend/docs/openapi.yaml`
- **Base URL (dev)**: `http://localhost:3001/api/v1`
- **Authentication**: Bearer JWT in `Authorization` header

Key endpoints:
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account, send verification email |
| POST | `/auth/login` | Authenticate, return tokens |
| POST | `/auth/verify-email` | Confirm email ownership |
| POST | `/auth/refresh` | Exchange refresh token |
| POST | `/auth/logout` | Invalidate refresh token |
| POST | `/auth/password-reset/request` | Request reset email |
| POST | `/auth/password-reset/complete` | Complete password reset |
| GET | `/users/me` | Current user profile |
| PATCH | `/users/me` | Update display name |
| DELETE | `/users/me` | Delete account (no active disputes) |

## Project Structure

### Backend (`backend/`)
```
src/
├── config/         # env, redis
├── db/             # prisma client, connection
├── middleware/     # auth, rate-limit, cors, helmet, errors, validation
├── routes/v1/      # auth.routes.ts, user.routes.ts
├── services/       # auth service
├── types/          # zod schemas
├── utils/          # errors, logger
└── index.ts        # Express entry point
prisma/
├── schema.prisma   # Full DB schema
├── seed.ts
└── migrations/
docs/
└── openapi.yaml    # OpenAPI 3.0 spec
```

### Frontend (`frontend/`)
```
src/
├── app/
│   ├── (auth)/     # register, login, verify-email
│   ├── (dashboard)/# dashboard layout, profile
│   ├── layout.tsx  # root layout
│   ├── page.tsx    # landing page
│   └── globals.css
├── components/     # shared UI primitives
├── lib/            # api-client.ts
├── hooks/          # custom React hooks
├── stores/         # zustand stores (useAuthStore)
└── types/          # generated from OpenAPI
```

### Infra (`infra/`)
```
docker-compose.yml  # postgres + redis
terraform/          # AWS ECS/EKS, RDS, ElastiCache, S3, SES
scripts/            # deploy/bootstrap scripts
```

### Docs (`docs/`)
All `.docx` reference files + `plan.md` + `TODO.md`

## Development Workflow
- **Branch naming**: `<type>/<ticket>/<agent-prefix>-<short-desc>`
- **Commit convention**: `<type>(<scope>): <subject>`
- **PR requirements**: lint, typecheck, unit tests pass, 80%+ coverage, security review for auth/payments/admin
- **Deploy**: `develop` → staging (auto), `develop` → `main` (manual + legal sign-off), blue/green on prod

## MVP Scope (Locked)
- Single-party only; two-party in Phase 2
- Email + password auth only
- Category: `contract_interpretation` only
- Manual brief entry (no AI prep, no uploads)
- 3-model evaluation (Groq Llama 3 70B, Mixtral 8x7B, Gemini 1.5 Pro)
- Manual aggregation for first 50 disputes
- Web-only, desktop-first
- $49 flat fee, collected at brief submission
- Success: 25 paid analyses, 70%+ satisfaction

## License
Proprietary — internal use only.