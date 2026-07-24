# F2: Dispute Creation - Pull Request

## Summary
Implements full dispute creation flow: create, read, update, withdraw with state machine, Redis caching, cursor pagination, accessibility, and comprehensive tests.

## Changes

### Backend (`backend/`)
- `prisma/schema.prisma` - Added covering index `idx_disputes_list_covering` for dispute list queries
- `src/services/disputes/index.ts` - Added Redis caching (5min TTL), cursor-based pagination, max page size 50, cache invalidation on state change
- `src/routes/v1/disputes.routes.ts` - Page size limit validation (max 50)
- `src/__tests__/disputes/integration/` - Integration tests for create, state machine, withdraw flows
- `src/__tests__/disputes/optimization.test.ts` - Performance regression tests

### Frontend (`frontend/`)
- `src/app/(dashboard)/disputes/new/page.tsx` - React Query optimistic updates, cache invalidation, keyboard navigation, WCAG ARIA labels
- `src/app/(dashboard)/disputes/page.tsx` - Skeleton loaders, ARIA labels, keyboard navigation
- `src/__tests__/components/DisputeForm.test.tsx` - Form validation, submit, loading, error tests
- `src/__tests__/components/DisputeList.test.tsx` - Fetch/display, skeleton, empty state, error tests
- `src/__tests__/pages/disputes/new.test.tsx` - Page render, redirect, validation tests
- `tests/e2e/disputes/create-dispute.spec.ts` - Playwright E2E tests

### Docs
- `docs/PR_TEMPLATE_F2.md` - This PR template

## Agent Ownership
| Area | Owner |
|------|-------|
| Backend API | Backend_Architect |
| Security & Auth | AppSec_Engineer |
| API Testing | API_Tester |

## Checklist
- [x] Prisma schema with covering index
- [x] Cursor-based pagination (max 50)
- [x] Redis caching with 5min TTL
- [x] Cache invalidation on state change
- [x] Frontend optimistic updates
- [x] React Query cache invalidation
- [x] Skeleton loaders
- [x] Keyboard navigation
- [x] WCAG 2.1 AA ARIA labels
- [x] Integration tests (create, state machine, withdraw)
- [x] Unit tests (optimization, performance regression)
- [x] Frontend component tests
- [x] E2E tests
- [x] Coverage >= 80%
