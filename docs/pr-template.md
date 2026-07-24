# Pull Request Template

## Feature: F1 Authentication (JWT Implementation)

### Summary
Complete authentication flow including register, login, email verification, password reset, token refresh, and user profile management.

### Changes
- **Backend**: Auth services, routes, middleware (JWT, rate limiting, validation)
- **Frontend**: Auth pages (login, register, verify-email), Zustand store, API client
- **Database**: Prisma schema with User model + migrations
- **Infrastructure**: Redis session storage, email queue via BullMQ

### Agent Ownership
| Component | Owner |
|-----------|-------|
| Auth Service | Backend Engineer |
| JWT Middleware | Backend Engineer |
| Rate Limiting | Backend Engineer |
| Auth Store | Frontend Engineer |
| Auth Forms | Frontend Engineer |
| API Client | Frontend Engineer |
| E2E Tests | QA Engineer |
| Security Review | AppSec Engineer |

### OpenAPI Spec
See `docs/openapi/auth.yaml` for endpoint definitions.

### Checklist
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Coverage >= 80%
- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Security review completed
- [ ] Accessibility review completed
