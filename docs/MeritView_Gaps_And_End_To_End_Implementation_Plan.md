# MeritView Gaps And End-To-End Implementation Plan

Date: 2026-08-03
Status: Working implementation plan

This document consolidates the current MeritView product documents, the resolved implementation plan, and the current frontend/backend implementation audit into one executable plan.

## 1. Inputs Reviewed

Source documents reviewed:

- `docs/extracted/MeritView_PRD.md`
- `docs/extracted/MeritView_Architecture.md`
- `docs/extracted/MeritView_API_Schema.md`
- `docs/extracted/MeritView_Exec_Summary.md`
- `docs/extracted/Several factors can make the timeline longer than my estimates.md`
- `/home/lap-19/.gemini/antigravity/brain/80d5150a-c96b-4b88-95d8-52a52657edae/implementation_plan.md.resolved`

Code areas audited:

- `backend/src/routes/v1/**`
- `backend/src/services/**`
- `backend/src/providers/**`
- `backend/prisma/schema.prisma`
- `frontend/src/app/**`
- `frontend/src/lib/api-client.ts`
- `frontend/src/components/DocumentUploader.tsx`
- current frontend/backend tests where present

## 2. Canonical Product Decisions

The docs contain several conflicts. These decisions should be treated as the source of truth for implementation unless the product owner changes them.

### 2.1 Product Positioning

MeritView is AI-powered dispute decision support. It is not arbitration, not legal advice, and not a binding judgment.

Every critical user step must include clear language that the service provides AI-generated decision support only.

### 2.2 V1 Dispute Model

V1 should be a two-party dispute flow by default.

Single-party analysis is useful for internal validation and possibly a future product mode, but it is not the primary V1 user experience. If retained in code, it should be behind an explicit feature flag and should not create confusing production states.

### 2.3 Payment Timing

Payment should happen immediately after dispute setup and before brief preparation becomes fully active.

Payment must not trigger evaluation. Evaluation starts only after both submitted briefs are sealed and the dispute is paid.

Canonical flow:

1. Initiator creates dispute with category, title, summary, estimated stakes, pricing tier, and counterparty email.
2. Backend creates dispute, parties, invitation token, payment record, and Stripe PaymentIntent in one transaction-safe flow.
3. Frontend displays Stripe payment UI.
4. Payment succeeds and is confirmed.
5. Backend transitions dispute to `AWAITING_COUNTERPARTY` and sends invite.
6. Initiator may prepare their brief while waiting.
7. Counterparty accepts and prepares their brief.
8. Both briefs submitted and sealed.
9. Backend transitions to `UNDER_ANALYSIS` and dispatches multi-model evaluation.
10. Aggregation completes, opinion is generated, parties are notified, and dispute transitions to `COMPLETED`.

### 2.4 Pricing

Public launch pricing:

| Tier | Price | Scope |
|---|---:|---|
| Standard | $99 | 5-model analysis, brief prep help, 4-hour turnaround target |
| Expedited | $199 | Standard plus priority queue and 1-hour turnaround target |
| Extended | $299 | Longer briefs and supplemental document analysis |
| Re-analysis | $49 | New analysis after updated briefs or evidence |

The $49 price should not appear as the normal public dispute price. If used during MVP/manual validation, it must be explicitly labeled as pilot pricing and isolated from production pricing constants.

### 2.5 API And State Naming

The current implementation uses uppercase Prisma enum values. The docs use lowercase API examples. The system needs one contract boundary.

Recommended approach:

- Keep Prisma/internal state enums uppercase.
- Add API response mappers and typed frontend client models.
- Do not allow pages to directly depend on inconsistent raw backend shapes.
- Choose one frontend domain shape and use it everywhere.
- Document the public API shape in one maintained OpenAPI file after implementation stabilizes.

### 2.6 Opinion Schema

The opinion schema must match the PRD/API/architecture structure:

- `executive_summary`
- `key_issues`
- `party_a_analysis`
- `party_b_analysis`
- `comparative_assessment`
- `confidence_indicators`
- `suggested_considerations`
- `disclaimers`
- evaluator provenance and model details
- PDF metadata/download link

The old `decision`, `ruling`, `reasoning`, `applicableLaw`, `strengths`, and `weaknesses` shape should be removed from the generation pipeline and UI.

## 3. Current High-Level Status

The product is partially implemented. The current code contains significant useful work, but the system is not yet reliable end-to-end.

Working or partially working:

- Authentication basics exist.
- Dispute creation/list/detail exists.
- Pricing constants are closer to the PRD than before.
- Stripe PaymentIntent and payment confirmation scaffolding exists.
- Invitation token generation and acceptance routes exist.
- Brief save/submit routes exist.
- Brief-prep session and WebSocket infrastructure exist.
- Multi-provider LLM registry exists.
- Evaluation, aggregation, opinion, and PDF services exist.
- Document upload/OCR/download scaffolding exists.
- Frontend pages exist for creation, payment, brief, invite, analysis, opinion, and dashboard.

Not yet reliable:

- Backend typecheck fails.
- Dispute creation with counterparty can silently fail to create the invitation.
- Initial PaymentIntent can be returned without a corresponding payment DB row.
- Payment webhook can dispatch evaluation before briefs are submitted.
- State transitions are inconsistent and often bypassed.
- Respondent access is broken in important routes.
- Brief privacy and visibility rules are incorrect.
- Evaluation and aggregation schemas do not reliably produce the documented opinion format.
- SSE exists but does not stream real progress.
- Document routes have access-control gaps.
- Frontend mixes API clients and direct fetch calls, causing `/v1/v1` and response-shape bugs.
- Guest invitation flow is incomplete.
- Marketing pages still advertise stale $49/three-model/contract-only messaging.

## 4. Full Gap List

### 4.1 Documentation Gaps

| Gap | Impact | Required Fix |
|---|---|---|
| PRD says initial price is $99, roadmap mentions MVP $49, marketing UI says $49 | User trust and payment inconsistency | Separate pilot pricing from production pricing; update all public copy |
| API schema says create dispute response state is `draft` but also returns PaymentIntent | State/payment ambiguity | Update schema to include `PAYMENT_PENDING` or documented mapped equivalent |
| API text says counterparty invited separately, request body includes counterparty | Implementation ambiguity | Treat counterparty as part of create-dispute setup for V1 |
| Architecture state flow lacks payment detail | Broken state machine | Write a single canonical state transition table |
| OpenAPI/backend/docs differ on SSE path | Frontend/backend mismatch | Standardize on `GET /v1/disputes/:id/opinion/stream` |
| Data retention differs between docs and code | Compliance risk | Align jobs and docs to 30-day user deletion and 12-month dispute retention |
| Security requirements are aspirational but not implemented | Privacy/legal risk | Convert into tracked implementation tasks before launch |

### 4.2 Backend Gaps

| Priority | Gap | Current Impact | Key Files |
|---|---|---|---|
| P0 | Backend typecheck fails | Cannot trust builds/tests | `backend/src/services/briefs/index.ts`, Prisma enum imports, strict-mode errors |
| P0 | Dispute creation/invite transaction is broken | Counterparty may not be invited | `backend/src/services/disputes/index.ts`, `backend/src/services/invitations/index.ts` |
| P0 | Initial PaymentIntent may lack Payment row | Payment cannot be confirmed reliably | `backend/src/services/disputes/index.ts`, `backend/src/services/payments/index.ts` |
| P0 | Payment webhook dispatches evaluation immediately | Analysis can run with missing briefs | `backend/src/services/payments/index.ts` |
| P0 | State machine does not match product flow | Invalid transitions and inconsistent UI | `backend/src/services/disputes/state-machine.ts` and direct updates across services |
| P0 | Respondent cannot reliably access disputes | Counterparty flow breaks | `backend/src/services/disputes/index.ts`, `backend/src/routes/v1/disputes.routes.ts` |
| P0 | Brief service has undefined variable and privacy bugs | Compile/runtime failure and wrong visibility | `backend/src/services/briefs/index.ts` |
| P1 | Evaluation provider diversity is not guaranteed | Core multi-model value weakens | `backend/src/services/evaluation/index.ts` |
| P1 | Aggregation prompt/schema mismatch | Opinion may render wrong/incomplete | `backend/src/prompts/aggregate-v1.0.ts`, `backend/src/services/opinions/index.ts` |
| P1 | SSE stream sends only initial status | Analysis progress UI cannot work | `backend/src/routes/v1/opinions.routes.ts` |
| P1 | Document download/OCR access checks are incomplete | Evidence leakage risk | `backend/src/routes/v1/documents.routes.ts`, `backend/src/services/documents/index.ts` |
| P1 | Refund paths incomplete | Declined/failed cases mishandle money | `backend/src/services/invitations/index.ts`, `backend/src/services/payments/index.ts` |
| P1 | Stripe webhook raw-body handling likely wrong | Payment webhooks may fail signature checks | `backend/src/index.ts`, `backend/src/routes/v1/webhooks.routes.ts` |
| P1 | Security leaks in auth/dev helpers | Production privacy risk | OTP temp file/logging, TOTP plaintext, JWT verification |
| P2 | RLS exists but is not integrated | Defense-in-depth missing | `backend/prisma/migrations/rls_policies.sql`, Prisma request flow |
| P2 | Audit logging partial | Compliance/audit gaps | services touching dispute, brief, opinion, document, payment data |
| P2 | Retention jobs do not match docs | Compliance gap | `backend/src/jobs/cron.ts` |

### 4.3 Frontend Gaps

| Priority | Gap | Current Impact | Key Files |
|---|---|---|---|
| P0 | API base URL and direct fetch usage inconsistent | `/v1/v1` bugs and response mismatch | `frontend/src/lib/api-client.ts`, direct fetch pages |
| P0 | Missing `resendInvitation` client method | Detail page runtime bug | `frontend/src/app/(dashboard)/dashboard/disputes/[id]/page.tsx`, `frontend/src/lib/api-client.ts` |
| P0 | Payment amount fallback can show wrong tier price | User may see wrong amount | new dispute/payment pages |
| P0 | Payment page redirects to analysis too early | User flow breaks after payment | `frontend/src/app/(dashboard)/dashboard/disputes/[id]/payment/page.tsx` |
| P0 | Invitation management still assumes `DRAFT` | Invite flow blocked after payment | `frontend/src/app/(dashboard)/dashboard/disputes/[id]/invite/page.tsx` |
| P0 | Guest accept redirects to login | Guest mode not implemented | `frontend/src/app/invitations/[token]/page.tsx` |
| P1 | Brief AI assistant does not use documented streaming contract | Core product feature incomplete | brief page and `brief/assist` page |
| P1 | LLM selector is not wired | User choice of LLM not real | brief page |
| P1 | Analysis page does not use SSE and expects wrong shape | Progress page likely broken | analysis page |
| P1 | Opinion page omits key issues/factual concerns/evaluator details | Opinion incomplete | opinion page |
| P1 | Document uploader posts wrong shape | Uploads incompatible with backend/API | `frontend/src/components/DocumentUploader.tsx` |
| P1 | Respondent/initiator UI is hard-coded | Counterparty sees wrong actions | dispute detail page |
| P1 | Legal disclaimers not mandatory at critical points | Regulatory/product risk | payment, invite, opinion pages |
| P2 | Marketing copy stale | Commercial/legal confusion | landing page, FAQ, metadata |
| P2 | Tests stale and incomplete | Regressions likely | frontend test suite |

### 4.4 Security, Privacy, And Compliance Gaps

These are launch blockers if real users, payments, or sensitive dispute data are involved.

- Remove OTP logging and `/tmp/latest_otp.txt` writes.
- Encrypt TOTP secrets.
- Verify JWT issuer/audience consistently in HTTP, SSE, and WebSocket auth.
- Enforce refresh-token device/IP/user-agent checks or remove unused checks.
- Stop logging sensitive dispute request bodies.
- Add access checks for every document download, OCR, deletion, and listing path.
- Integrate RLS session variables or remove claims that RLS protects production traffic.
- Use real per-dispute/per-party encryption key management or clearly document the MVP simplification.
- Verify LLM providers use no-training/API terms before sending dispute data.
- Add data deletion/retention jobs matching the PRD.
- Add audit events for state transitions, brief submit/seal, document access, payment actions, evaluator calls, and opinion delivery.
- Add mandatory disclaimer/terms acknowledgment before payment and opinion access.

## 5. Canonical State Machine

Use this as the implementation target.

| Current State | Event | Next State | Notes |
|---|---|---|---|
| none | dispute created | `PAYMENT_PENDING` | Create initiator/respondent parties, invitation token, Payment row, PaymentIntent |
| `PAYMENT_PENDING` | payment confirmed and counterparty exists | `AWAITING_COUNTERPARTY` | Send invitation after payment succeeds |
| `PAYMENT_PENDING` | payment confirmed and single-party mode enabled | `AWAITING_BRIEFS` | Feature-flagged only |
| `PAYMENT_PENDING` | initiator withdraws | `WITHDRAWN` | Cancel/refund if needed |
| `AWAITING_COUNTERPARTY` | counterparty accepts | `AWAITING_BRIEFS` | Respondent user/guest is linked |
| `AWAITING_COUNTERPARTY` | counterparty declines | `DECLINED` | Automatic refund |
| `AWAITING_COUNTERPARTY` | invite expires | `EXPIRED` | Refund path or renewal path required |
| `AWAITING_BRIEFS` | one brief submitted | `AWAITING_COUNTERPARTY_BRIEF` | Track which party submitted |
| `AWAITING_COUNTERPARTY_BRIEF` | second brief submitted | `UNDER_ANALYSIS` | Dispatch evaluation once |
| `UNDER_ANALYSIS` | at least 3 evaluators succeed and aggregation succeeds | `COMPLETED` | Opinion delivered to both parties |
| `UNDER_ANALYSIS` | fewer than 3 evaluators succeed or aggregation fails | `FAILED` | Automatic refund or support review |
| `COMPLETED` | reanalysis paid and accepted | `REANALYSIS_IN_PROGRESS` | Future/phase-2 if needed |
| `REANALYSIS_IN_PROGRESS` | reanalysis complete | `COMPLETED` | Opinion versioning required |

Rules:

- All state changes must go through one state-machine helper.
- Direct Prisma `state` updates outside the helper should be banned except migrations/admin repair scripts.
- Every state transition must write an audit event.
- Evaluation dispatch must be idempotent and only happen from `AWAITING_COUNTERPARTY_BRIEF` after the second brief is submitted and payment succeeded.

## 6. End-To-End Build Plan

### Phase 0: Source-Of-Truth Cleanup

Goal: eliminate ambiguity before more code is written.

Tasks:

1. Treat this file as the working implementation plan.
2. Keep the original `.docx` and extracted docs until product/legal decisions are finalized.
3. Add a short `docs/README.md` that points engineers to this plan and marks older docs as background/reference.
4. After approval, archive or delete stale generated docs.
5. Update `backend/docs/openapi.yaml` after implementation decisions are stable.

Deletion recommendation:

- Do not delete the original docs until this plan is approved.
- If deletion is approved, delete only the stale generated/extracted files and keep the canonical plan plus any legal/business docs that are still needed.
- Exact deletion candidates are listed in section 10.

Acceptance criteria:

- One canonical plan exists.
- Product owner confirms payment timing, V1 two-party requirement, pricing, and guest mode behavior.
- Engineering stops using stale docs as implementation source of truth.

### Phase 1: Make The Codebase Buildable And Contract-Safe

Goal: fix compile/runtime blockers before feature work.

Backend tasks:

1. Regenerate/fix Prisma enum imports and generated client usage.
2. Fix `unsubmittedParties` undefined references in brief submission.
3. Fix strict TypeScript implicit `any` errors.
4. Fix impossible comparisons in payment code.
5. Run Prisma validation.

Frontend tasks:

1. Centralize all API calls through `frontend/src/lib/api-client.ts`.
2. Remove page-level raw fetch duplication unless there is a documented reason.
3. Normalize `NEXT_PUBLIC_API_URL` so it never double-adds `/v1`.
4. Add missing methods: resend invitation, invitation token detail/accept/decline helpers, status stream helper, reanalysis, document delete/download/list.
5. Fix stale tests that no longer match the wizard UI.

Acceptance criteria:

- Backend typecheck passes.
- Frontend typecheck passes.
- No known direct fetch path creates `/v1/v1`.
- Existing tests either pass or are replaced with accurate tests.

Verification:

```bash
cd backend && npm run typecheck && npm run lint && npx prisma validate
cd frontend && npm run typecheck && npm run lint
```

### Phase 2: Fix Core Dispute, Payment, Invitation, And State Flow

Goal: make the primary paid two-party flow reliable.

Backend tasks:

1. Rewrite `createDispute` to create dispute, initiator party, respondent party, invitation token, Payment row, and Stripe PaymentIntent consistently.
2. Do not swallow invitation creation errors.
3. Allow invitation setup during initial creation even when the new state is `PAYMENT_PENDING`.
4. Ensure payment confirmation updates the existing Payment row.
5. Payment confirmation transitions to `AWAITING_COUNTERPARTY`, not `UNDER_ANALYSIS`.
6. Stripe webhook must only update payment status and state. It must not dispatch evaluation unless the dispute is already in the correct brief-submitted state.
7. Fix webhook raw-body handling for Stripe signature verification.
8. Add refund flows for decline, expiration, withdrawal before analysis, technical evaluation failure.
9. Make all state updates use the canonical state-machine helper.

Frontend tasks:

1. Make counterparty email required for normal V1 creation unless single-party feature flag is enabled.
2. Show tier amount from selected tier and backend response consistently.
3. Fix PaymentIntent response parsing for nested and mapped shapes.
4. After payment success, redirect to dispute detail or brief prep, not analysis.
5. Show payment status and next step clearly.
6. Add mandatory payment disclaimer/terms acknowledgment.

Acceptance criteria:

- Creating a standard dispute with counterparty produces a dispute, two parties, invitation token, payment row, and PaymentIntent.
- Payment confirmation transitions to `AWAITING_COUNTERPARTY`.
- Invitation email is queued/sent only after successful payment.
- Evaluation does not start after payment.
- Decline/withdraw/expire refund behavior is deterministic.

Tests to add:

- Create dispute with counterparty and tier.
- Create dispute rejects missing counterparty in V1 mode.
- Payment confirm moves state correctly.
- Stripe webhook idempotency.
- Invitation decline triggers refund state.

### Phase 3: Fix Authorization, Privacy, And Party Access

Goal: make both initiator and respondent flows safe and usable.

Backend tasks:

1. Replace initiator-only dispute lookups with participant-aware access checks.
2. Fix route ordering so static respondent routes are not shadowed by `/:disputeId`.
3. Ensure respondent can read dispute details after acceptance.
4. Ensure stranger users cannot read dispute, brief, document, payment, status, or opinion data.
5. Fix brief visibility:
   - A party can always view its own draft/submitted brief.
   - Counterparty brief is hidden until both briefs are submitted/sealed.
   - After both briefs are sealed, both parties can view both submitted briefs if the product allows it.
6. Add document access checks to upload, list, metadata, download, OCR, delete.
7. Remove static file exposure for sensitive uploads or ensure signed URLs/access checks are enforced.

Frontend tasks:

1. Compute actual current user party from dispute parties.
2. Remove hard-coded `isInitiator = true` logic.
3. Show respondent-specific actions after invite acceptance.
4. Hide actions the current party cannot perform.
5. Add clean unauthorized/error states.

Acceptance criteria:

- Initiator and respondent can each access their own dispute views.
- Non-participants get 403/404 consistently.
- Document and brief access rules are covered by tests.
- UI actions match the current user's party and dispute state.

### Phase 4: Complete Invitation And Guest Mode

Goal: make the counterparty experience production-usable.

Backend tasks:

1. Add or verify invitation detail endpoint for public token preview.
2. Implement guest account/session behavior for invited respondents.
3. Ensure guest accounts are scoped only to accepted disputes.
4. Implement invitation resend and share-link retrieval.
5. Add invitation expiry job and transition/refund behavior.
6. Audit log invitation sent/opened/accepted/declined/expired/resent events.

Frontend tasks:

1. Public invite page must show dispute preview, inviter, category, estimated stakes if safe, and explanation of MeritView.
2. Add legal disclaimer and terms acknowledgment before accept.
3. Add decline button.
4. Support accept as existing user, create account, and continue as guest.
5. Establish guest session after guest acceptance.
6. Redirect accepted respondent directly to brief prep.
7. Let respondent select preferred LLM for brief assistance.
8. Dedicated invite management page must work in pre-analysis states, not just `DRAFT`.
9. Show shareable invitation link and resend status.

Acceptance criteria:

- Counterparty can open invitation without login, understand the dispute, accept/decline, and reach brief prep.
- Guest mode works without forcing login.
- Initiator can see invitation status and resend/share link.
- Decline and expiry notify initiator and handle refund.

### Phase 5: Complete Brief Preparation And Documents

Goal: deliver the product's assisted-brief experience.

Backend tasks:

1. Confirm brief-prep session create returns documented shape.
2. Verify WebSocket authentication, issuer/audience validation, and token expiry.
3. Implement streaming `user_message` responses.
4. Implement `request_brief_draft` response with structured sections.
5. Persist conversation history securely.
6. Enforce word limits by pricing tier.
7. Ensure brief submit seals content and dispatches evaluation only after both paid/sealed briefs exist.
8. Complete document multipart upload endpoint.
9. Add document list, download, delete, OCR status, and supporting-document IDs.

Frontend tasks:

1. Replace REST-only assistant with WebSocket streaming or a clearly aligned fallback.
2. Wire LLM selector to session creation.
3. Add chat history, streaming assistant messages, errors, reconnect/resume behavior.
4. Add `Generate Brief Draft` action that populates the five sections.
5. Keep user editorial control over every section.
6. Support autosave and final submit with clear immutable warning.
7. Make brief editor responsive on mobile.
8. Fix document uploader to match multipart backend and show uploaded files.
9. Include selected document IDs in draft/save/submit payloads.

Acceptance criteria:

- Each party can choose an LLM and get streaming brief help.
- AI can produce a structured draft that the user can edit.
- Autosave works.
- Document upload/list/delete works with access control.
- Submitting first brief moves to waiting state.
- Submitting second brief triggers exactly one evaluation job.

### Phase 6: Complete Multi-Model Evaluation, Aggregation, Opinion, And SSE

Goal: make the core differentiator real and observable.

Backend tasks:

1. Enforce evaluator selection across at least 3 provider families and target 5 evaluators.
2. Remove any hard-coded single-provider filters.
3. Label party A/party B briefs explicitly in prompts.
4. Make evaluation prompt category-aware, not contract-only.
5. Validate every evaluator output against a strict schema.
6. Store raw outputs, parse success, prompt version, token usage, cost, duration, model ID.
7. Require minimum 3 successful evaluations.
8. Trigger aggregation only after evaluator completion/timeout rules are satisfied.
9. Make aggregation output exactly match the canonical opinion schema.
10. Transition to `COMPLETED` only after opinion and PDF are successfully created or queued according to final product rule.
11. Implement SSE events:
    - `progress`
    - `evaluator_complete`
    - `aggregation_started`
    - `opinion_ready`
    - `failed`
12. Add idempotency so retrying jobs does not duplicate opinions or charges.

Frontend tasks:

1. Analysis page should connect to authenticated SSE or a fetch-event-source equivalent.
2. Fall back to polling only when SSE fails.
3. Show per-evaluator progress from real backend events.
4. Show aggregation state and estimated completion.
5. Redirect or link to opinion when ready.
6. Opinion page must render all canonical sections.
7. Show evaluator names/model IDs, agreement/confidence, and disclaimers.
8. Implement PDF download using the actual backend response shape.
9. Add request re-analysis CTA only when supported.

Acceptance criteria:

- `UNDER_ANALYSIS` shows live progress.
- Evaluator completion events update the UI.
- Aggregation completion creates an opinion matching schema.
- Opinion page renders every major section without relying on legacy fields.
- PDF download works.

### Phase 7: Legal, Compliance, And Trust Hardening

Goal: prepare for real users and payment data.

Tasks:

1. Add mandatory disclaimer acknowledgment before payment.
2. Add mandatory disclaimer acknowledgment before first opinion access.
3. Add visible disclaimers on invite, payment, brief assistant, analysis, and opinion pages.
4. Remove stale or over-strong language like `decision`, `verdict`, or `ruling` from user-facing UI unless clearly qualified.
5. Add terms/privacy/disclaimer links in correct routes.
6. Commission or attach legal review for UPL positioning before public launch.
7. Verify privacy policy covers LLM providers, data retention, deletion, and no-training usage.
8. Implement deletion/account closure flow consistent with docs.
9. Implement provider allowlist requiring no-training/API terms before dispute data is sent.
10. Add audit logs and admin/support restrictions.

Acceptance criteria:

- No critical flow allows users to miss the decision-support disclaimer.
- Opinion is clearly labeled AI-generated, non-binding, and not legal advice.
- Legal routes exist and links are correct.
- Sensitive-data handling is documented and technically enforced where required.

### Phase 8: Dashboard, Marketing, And Product Polish

Goal: make the product coherent to users.

Tasks:

1. Update landing page pricing from stale `$49` to current tiers or pilot label.
2. Update FAQ from `three models` to `target five models` and mention current supported categories.
3. Fix `/disclaimers` vs `/disclaimer` route mismatch.
4. Update metadata title/description pricing.
5. Improve dashboard status cards for:
   - `PAYMENT_PENDING`
   - `AWAITING_COUNTERPARTY`
   - `AWAITING_BRIEFS`
   - `AWAITING_COUNTERPARTY_BRIEF`
   - `UNDER_ANALYSIS`
   - `COMPLETED`
   - `FAILED`
   - `DECLINED`
   - `EXPIRED`
6. Add payment status, party status, invite status, and timeline/history to detail page.
7. Ensure mobile layouts are usable for creation, invite accept, brief prep, payment, analysis, and opinion.

Acceptance criteria:

- Public content no longer contradicts product pricing/model count.
- Dashboard tells users exactly what to do next.
- Mobile flows are usable without horizontal overflow or hidden primary actions.

### Phase 9: Testing And Launch Readiness

Goal: prove the whole paid dispute lifecycle works.

Backend verification:

```bash
cd backend
npm run typecheck
npm run lint
npm run test:unit
npm run test:coverage
npm run build
npx prisma validate
```

Frontend verification:

```bash
cd frontend
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

Required backend tests:

- Auth register/login/refresh/logout/password reset.
- Guest accept token lifecycle.
- Create dispute with counterparty, tier, payment row, PaymentIntent.
- Payment confirmation and webhook idempotency.
- State transition validation and invalid transition rejection.
- Invitation accept/decline/expire/resend.
- Respondent dispute access.
- Brief own/counterparty visibility.
- Brief submit triggers evaluation exactly once after second brief.
- Provider selection diversity.
- Aggregation schema validation.
- Opinion status and SSE events.
- Document upload/list/download/delete access checks.
- Refund paths.

Required frontend tests:

- New dispute wizard validates required fields and tier pricing.
- Payment step displays correct amount and redirects correctly.
- Invite management share/resend behavior.
- Public invite accept as guest/account and decline.
- Brief assistant provider selection and draft population.
- Document upload and selected evidence IDs.
- Analysis SSE/polling progress render.
- Opinion renders full schema and PDF download.
- Dashboard state-specific CTAs.
- Mobile smoke tests for major flows.

Required manual E2E scenarios:

1. Initiator creates Standard dispute with counterparty and pays.
2. Initiator starts brief, uses AI assistant, uploads document, saves draft.
3. Counterparty opens invite, accepts as guest, chooses LLM, prepares brief.
4. Initiator submits brief first; state waits for counterparty.
5. Counterparty submits second brief; state enters analysis.
6. SSE progress shows evaluator completion and aggregation.
7. Opinion renders all sections and PDF downloads.
8. Counterparty decline path refunds and closes dispute.
9. Analysis failure path refunds or creates support-review state.
10. Stranger attempts to access dispute/brief/document/opinion and is blocked.

## 7. Recommended Implementation Order

Use this order to avoid building UI on unstable backend behavior.

1. Backend build/typecheck blockers.
2. Central API client and frontend typecheck blockers.
3. Canonical backend state machine and direct-update cleanup.
4. Dispute creation/payment/invite transaction.
5. Payment confirm/webhook/refund correctness.
6. Party-aware authorization and respondent access.
7. Invitation and guest mode.
8. Brief privacy, submission, and document access.
9. Brief AI assistant WebSocket and draft generation.
10. Evaluation provider diversity and schema validation.
11. Aggregation/opinion schema correction.
12. SSE progress and analysis page.
13. Opinion page, PDF, reanalysis.
14. Legal disclaimers and marketing copy.
15. Full test suite and manual E2E.

## 8. MVP Scope Recommendation

To avoid overbuilding, the first usable MVP should include:

- Email/password auth.
- Two-party disputes only.
- Three supported categories: contract interpretation, small claims assessment, partnership conflict.
- Standard tier only initially, with code structure ready for other tiers.
- Stripe test/live payment for Standard tier.
- Counterparty invitation by email/share link.
- Guest respondent acceptance.
- AI-assisted brief prep using one or two reliable LLM providers first.
- Multi-model evaluation with at least 3 providers for MVP, target 5 for beta.
- Automated aggregation into canonical opinion schema.
- Opinion page and PDF download.
- Strong disclaimers.
- Basic document upload, but OCR/supplemental document analysis can be beta if needed.

Defer until after MVP validation:

- Native mobile apps.
- OAuth/social login.
- TOTP UI.
- PayPal.
- Mediator referrals.
- Subscriptions.
- B2B APIs/webhooks.
- Advanced analytics dashboards.
- Full SOC 2 program.
- Multi-region deployment.

## 9. Timeline

Based on the timeline/risk note and current implementation state, a realistic completion estimate is:

| Team | Realistic Time To Credible MVP | Notes |
|---|---:|---|
| Solo full-time engineer | 10-14 weeks | Current code gives a head start, but state/security/schema bugs are non-trivial |
| 2-person team | 8-12 weeks | Best split: backend/core flow plus frontend/product polish |
| 3-4 person team | 6-10 weeks | Bottlenecks remain product/legal/prompt validation |

Recommended sprint breakdown:

| Sprint | Focus |
|---|---|
| Week 1 | Build/typecheck, source-of-truth contracts, state machine |
| Week 2 | Dispute/payment/invite transaction and refunds |
| Week 3 | Authorization, respondent access, guest mode |
| Week 4 | Brief privacy, brief submit, document upload/access |
| Week 5 | Brief AI assistant and LLM selector |
| Week 6 | Evaluation provider diversity and schema validation |
| Week 7 | Aggregation/opinion schema and PDF |
| Week 8 | SSE analysis progress and frontend status hub |
| Week 9 | Legal/disclaimer hardening and marketing cleanup |
| Week 10 | E2E tests, bug fixes, pilot readiness |
| Weeks 11-14 | Real-user feedback, prompt iteration, legal review slack |

## 10. Documentation Cleanup And Deletion Plan

The user requested deletion/cleanup of docs. Deleting all docs immediately is risky because the `.docx` originals and extracted Markdown are still useful reference material until this plan is approved.

Recommended safe cleanup sequence:

1. Keep this file as the canonical working plan.
2. Add `docs/README.md` pointing to this file.
3. Move old docs to `docs/archive/` or delete them only after explicit approval.
4. Keep legal/business source docs if counsel or investors need them.
5. Regenerate/update OpenAPI only after backend contracts stabilize.

Deletion candidates after approval:

- `docs/extracted/MeritView_Exec_Summary.md`
- `docs/extracted/MeritView_PRD.md`
- `docs/extracted/MeritView_Architecture.md`
- `docs/extracted/MeritView_API_Schema.md`
- `docs/extracted/Several factors can make the timeline longer than my estimates.md`
- `docs/MeritView_Exec_Summary.docx`
- `docs/MeritView_PRD.docx`
- `docs/MeritView_Architecture.docx`
- `docs/MeritView_API_Schema.docx`
- `docs/Several factors can make the timeline longer than my estimates.docx`

Preferred alternative to deletion:

- Move those files to `docs/archive/legacy-2026-08-03/`.
- Keep `docs/MeritView_Gaps_And_End_To_End_Implementation_Plan.md` as active.
- Add a lightweight `docs/README.md`.

## 11. Immediate Next Tasks

Start here:

1. Fix backend typecheck errors.
2. Fix frontend API client/direct fetch inconsistencies.
3. Implement canonical state machine transitions.
4. Fix create-dispute/payment/invitation transaction.
5. Fix payment confirmation and webhook behavior so payment never starts evaluation.
6. Fix respondent access and route ordering.
7. Add tests around the paid two-party happy path.

These tasks unlock the rest of the product. Without them, AI assistant, opinion UI, and analysis progress will continue to sit on unstable foundations.
