# MeritView_API_Schema

MeritView

API Specification

& Database Schema



Version 0.1 (Draft)

May 2026

REST API contracts and PostgreSQL schema

Confidential — Internal Engineering Document



PART 1: API SPECIFICATION

1. API Overview

1.1 Design Principles

• RESTful with pragmatic exceptions: Resource-oriented design where it fits; RPC-style endpoints where the operation doesn't map cleanly to CRUD

• Versioned from day one: URI versioning (/v1/, /v2/) to enable breaking changes without disrupting existing clients

• Consistent error handling: Standard error envelope across all endpoints

• Idempotent where possible: Mutating operations support idempotency keys for safe retry

• Pagination by default: All list endpoints use cursor-based pagination

• Streaming where natural: WebSocket and SSE for long-lived connections (brief preparation chat, opinion status)

1.2 Base URL and Versioning

Production:   https://api.meritview.app/v1

Staging:      https://api.staging.meritview.app/v1

Development:  http://localhost:3001/v1

1.3 Authentication

All authenticated endpoints require a Bearer token in the Authorization header. Tokens are JWTs issued by the Identity Service, with 15-minute access token lifetime and 7-day refresh token lifetime.

Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

Endpoints that do not require authentication are explicitly noted. Guest tokens (for unauthenticated counterparties accessing via invitation links) are issued separately and have limited scope.

1.4 Standard Error Envelope

All error responses follow a consistent structure:

{

  "error": {

    "code": "DISPUTE_NOT_FOUND",

    "message": "The requested dispute does not exist or you do not have access",

    "details": { "dispute_id": "disp_abc123" },

    "request_id": "req_xyz789",

    "documentation_url": "https://docs.meritview.app/errors/dispute-not-found"

  }

}

HTTP Status Code Conventions

Code

Meaning

When Used

200

OK

Successful read or update

201

Created

Resource successfully created

202

Accepted

Async operation accepted (e.g., evaluation started)

204

No Content

Successful delete

400

Bad Request

Request validation failed

401

Unauthorized

Missing or invalid authentication

403

Forbidden

Authenticated but lacks permission

404

Not Found

Resource does not exist or hidden

409

Conflict

State conflict (e.g., brief already submitted)

422

Unprocessable

Semantic validation failure

429

Rate Limited

Too many requests; includes Retry-After header

500

Internal Error

Unexpected server error

503

Unavailable

Temporary service unavailability



1.5 Rate Limiting

• Default: 100 requests per minute per authenticated user

• Burst: 10 requests per second

• AI endpoints (brief preparation): 30 messages per minute per session

• Rate limit headers in all responses: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

1.6 Idempotency

POST endpoints that create resources or trigger billable operations accept an Idempotency-Key header. Repeated requests with the same key within 24 hours return the original response without re-executing the operation.

POST /v1/disputes

Idempotency-Key: 7f3a1b2c-9e8d-4f5a-b6c3-2d1e0f8a9b7c

Content-Type: application/json

Authorization: Bearer ...

2. Authentication Endpoints

Register a new user

 POST   /v1/auth/register

Creates a new user account. Sends verification email.

Request

{

  "email": "user@example.com",

  "password": "securePassword123",

  "display_name": "Jane Doe",

  "accept_terms": true,

  "marketing_opt_in": false

}

Response (201 Created)

{

  "user": {

    "id": "user_8f3a1b2c",

    "email": "user@example.com",

    "display_name": "Jane Doe",

    "email_verified": false,

    "created_at": "2026-05-17T10:30:00Z"

  },

  "access_token": "eyJhbGciOiJSUzI1NiIs...",

  "refresh_token": "rt_abc123...",

  "expires_in": 900

}

Log in

 POST   /v1/auth/login

Authenticates with email and password. Returns access and refresh tokens.

Request

{

  "email": "user@example.com",

  "password": "securePassword123",

  "totp_code": "123456"

}

Response (200 OK)

{

  "user": { ... },

  "access_token": "eyJhbGciOiJSUzI1NiIs...",

  "refresh_token": "rt_abc123...",

  "expires_in": 900

}

Refresh access token

 POST   /v1/auth/refresh

Exchanges a refresh token for a new access token.

Request

{

  "refresh_token": "rt_abc123..."

}

Log out

 POST   /v1/auth/logout

Invalidates the current refresh token. Access tokens expire naturally.

Verify email

 POST   /v1/auth/verify-email

Confirms email ownership using a token sent to the user's email.

Request password reset

 POST   /v1/auth/password-reset/request

Complete password reset

 POST   /v1/auth/password-reset/complete

3. User Endpoints

Get current user

 GET   /v1/users/me

Returns the authenticated user's profile.

Response (200 OK)

{

  "id": "user_8f3a1b2c",

  "email": "user@example.com",

  "display_name": "Jane Doe",

  "email_verified": true,

  "totp_enabled": false,

  "preferred_llm_provider": "anthropic",

  "created_at": "2026-05-17T10:30:00Z",

  "stats": {

    "disputes_initiated": 3,

    "disputes_participated": 5

  }

}

Update user profile

 PATCH   /v1/users/me

Updates editable profile fields. Email and password changes use dedicated endpoints.

Delete user account

 DELETE   /v1/users/me

Initiates account deletion. Active disputes must be resolved or withdrawn first. Data deleted within 30 days per privacy policy. Returns 202 Accepted.

Enable two-factor authentication

 POST   /v1/users/me/totp/enable

Disable two-factor authentication

 POST   /v1/users/me/totp/disable

4. Dispute Endpoints

Create a new dispute

 POST   /v1/disputes

Creates a new dispute. The creating user becomes the initiating party. Counterparty is invited separately.

Request

{

  "category": "contract_interpretation",

  "title": "Disagreement over consulting agreement scope",

  "summary": "Brief description of what the dispute is about (200 char max)",

  "estimated_stakes_usd": 8500,

  "counterparty": {

    "email": "other.party@example.com",

    "display_name_for_invitation": "John Smith"

  },

  "pricing_tier": "standard"

}

Response (201 Created)

{

  "dispute": {

    "id": "disp_abc123",

    "category": "contract_interpretation",

    "title": "Disagreement over consulting agreement scope",

    "state": "draft",

    "created_at": "2026-05-17T10:30:00Z",

    "pricing_tier": "standard",

    "price_usd": 99.00,

    "parties": [

      {

        "id": "party_001",

        "role": "initiator",

        "user_id": "user_8f3a1b2c",

        "brief_status": "not_started"

      },

      {

        "id": "party_002",

        "role": "respondent",

        "user_id": null,

        "invitation_email": "other.party@example.com",

        "invitation_status": "pending",

        "brief_status": "not_started"

      }

    ],

    "invitation_url": "https://meritview.app/invite/inv_xyz789",

    "invitation_expires_at": "2026-05-24T10:30:00Z"

  },

  "payment_intent": {

    "client_secret": "pi_xyz_secret_abc..."

  }

}

List disputes

 GET   /v1/disputes

Returns disputes where the authenticated user is a party. Supports filtering and pagination.

Query Parameters

• state: Filter by state (draft, awaiting_counterparty, in_progress, under_analysis, completed, withdrawn)

• role: Filter by role (initiator, respondent)

• category: Filter by dispute category

• limit: Maximum results per page (default 20, max 100)

• cursor: Pagination cursor from previous response

Response (200 OK)

{

  "data": [

    { "id": "disp_abc123", ... },

    { "id": "disp_def456", ... }

  ],

  "pagination": {

    "next_cursor": "eyJjcmVhdGVkX2F0Ijoi...",

    "has_more": true

  }

}

Get dispute details

 GET   /v1/disputes/:dispute_id

Returns full details of a specific dispute. Visible fields depend on dispute state — briefs are visible to each party only after both have submitted.

Update dispute (draft state only)

 PATCH   /v1/disputes/:dispute_id

Updates dispute metadata while in draft state. Cannot modify after counterparty is invited.

Withdraw dispute

 POST   /v1/disputes/:dispute_id/withdraw

Cancels a dispute. Refund issued if no analysis has been performed.

Accept invitation (counterparty)

 POST   /v1/invitations/:invitation_token/accept

Counterparty accepts invitation. Creates account if needed, or links existing account.

Request

{

  "create_account": {

    "email": "respondent@example.com",

    "password": "securePassword456",

    "display_name": "John Smith"

  },

  "accept_terms": true

}

Decline invitation (counterparty)

 POST   /v1/invitations/:invitation_token/decline

Counterparty declines invitation. Dispute transitions to declined state; initiator notified; full refund issued.

5. Brief Endpoints

Start brief preparation session

 POST   /v1/disputes/:dispute_id/parties/:party_id/brief/session

Initiates a brief preparation session with the chosen LLM. Returns session credentials for WebSocket connection.

Request

{

  "llm_provider": "anthropic",

  "model_preference": "claude-3-5-sonnet"

}

Response (201 Created)

{

  "session": {

    "id": "sess_xyz789",

    "dispute_id": "disp_abc123",

    "party_id": "party_001",

    "llm_provider": "anthropic",

    "model_id": "claude-3-5-sonnet-20250620",

    "websocket_url": "wss://api.meritview.app/v1/brief-sessions/sess_xyz789",

    "websocket_token": "wst_abc123...",

    "expires_at": "2026-05-17T14:30:00Z"

  },

  "initial_message": "Hi, I'm here to help you articulate your position..."

}

Get brief preparation session

 GET   /v1/brief-sessions/:session_id

Returns session metadata and conversation history. Used for resuming sessions.

Save brief draft

 PUT   /v1/disputes/:dispute_id/parties/:party_id/brief/draft

Saves the current brief draft. Can be called multiple times before final submission.

Request

{

  "sections": {

    "factual_background": "On January 15, 2026, I entered into...",

    "my_position": "I maintain that the agreement clearly states...",

    "supporting_arguments": "The contract language in section 3.2...",

    "acknowledgment_of_opposing": "The other party will likely argue...",

    "desired_resolution": "I seek full payment of $8,500 plus..."

  },

  "supporting_document_ids": ["doc_111", "doc_222"]

}

Submit brief

 POST   /v1/disputes/:dispute_id/parties/:party_id/brief/submit

Submits the final brief. Brief becomes immutable after submission. If both parties have submitted, triggers evaluation.

Response (200 OK)

{

  "brief": {

    "id": "brief_abc",

    "submitted_at": "2026-05-17T11:45:00Z",

    "word_count": 1247,

    "status": "submitted"

  },

  "dispute_state": "awaiting_counterparty_brief",

  "next_action": "We've notified the other party. You'll be notified when both briefs are in."

}

Get brief (post-submission)

 GET   /v1/disputes/:dispute_id/parties/:party_id/brief

Returns a submitted brief. Both briefs visible to both parties only after both submitted.

6. Document Endpoints

Upload a supporting document

 POST   /v1/disputes/:dispute_id/documents

Uploads a supporting document (contract, photo, screenshot, etc.). Multipart form upload.

Request (multipart/form-data)

file: <binary>

description: "Original signed consulting agreement"

extract_text: true

Response (201 Created)

{

  "document": {

    "id": "doc_111",

    "filename": "consulting_agreement.pdf",

    "size_bytes": 245678,

    "mime_type": "application/pdf",

    "uploaded_at": "2026-05-17T11:00:00Z",

    "ocr_status": "processing",

    "extracted_text_url": null

  }

}

Get document metadata

 GET   /v1/documents/:document_id

Download document

 GET   /v1/documents/:document_id/download

Returns a time-limited signed URL for downloading the original file.

Delete document

 DELETE   /v1/documents/:document_id

Cannot delete documents referenced by submitted briefs.

7. Opinion Endpoints

Get opinion for dispute

 GET   /v1/disputes/:dispute_id/opinion

Returns the opinion for a completed dispute. 404 if opinion not yet generated.

Response (200 OK)

{

  "opinion": {

    "id": "op_xyz",

    "dispute_id": "disp_abc123",

    "generated_at": "2026-05-17T13:30:00Z",

    "prompt_version": "eval-v3.2, agg-v2.1",

    "evaluators_used": [

      "anthropic/claude-3-5-sonnet",

      "openai/gpt-4-turbo",

      "google/gemini-pro",

      "together/llama-3-70b",

      "mistral/mistral-large"

    ],

    "executive_summary": "After analyzing both parties' positions...",

    "key_issues": [

      {

        "issue": "Whether section 3.2 limits scope to deliverables listed",

        "agreement_level": "high"

      }

    ],

    "party_a_analysis": {

      "strongest_arguments": [...],

      "weakest_points": [...],

      "factual_concerns": [...]

    },

    "party_b_analysis": { ... },

    "comparative_assessment": "...",

    "confidence_indicators": {

      "overall_confidence": 0.78,

      "evaluator_agreement": 0.82

    },

    "suggested_considerations": {

      "party_a": [...],

      "party_b": [...]

    },

    "disclaimers": [...]

  }

}

Download opinion as PDF

 GET   /v1/disputes/:dispute_id/opinion/pdf

Returns a signed URL for downloading the opinion as PDF.

Get opinion status

 GET   /v1/disputes/:dispute_id/opinion/status

Returns analysis status. Useful for polling while opinion is generating. Also available via SSE.

Response (200 OK)

{

  "status": "in_progress",

  "progress": {

    "evaluators_complete": 3,

    "evaluators_total": 5,

    "aggregation_status": "pending"

  },

  "estimated_completion": "2026-05-17T14:00:00Z"

}

Request opinion re-analysis

 POST   /v1/disputes/:dispute_id/reanalysis

Requests new analysis with updated briefs or additional evidence. Billed at re-analysis tier ($49).

8. Payment Endpoints

Get payment intent

 GET   /v1/disputes/:dispute_id/payment-intent

Returns Stripe payment intent for completing payment. Created when dispute is initiated.

Confirm payment

 POST   /v1/disputes/:dispute_id/payment/confirm

Called by client after successful Stripe payment confirmation.

Request refund

 POST   /v1/disputes/:dispute_id/refund-request

Initiates refund request. Automatic for technical failures; manual review for satisfaction-based refunds.

Get payment history

 GET   /v1/users/me/payments

9. WebSocket API

9.1 Brief Preparation Channel

Real-time chat between user and LLM during brief preparation. Connect to URL returned by session creation endpoint.

Connection

URL: wss://api.meritview.app/v1/brief-sessions/:session_id

Auth: Bearer token in connection query parameter or first message

Client → Server Messages

{

  "type": "user_message",

  "content": "I need help organizing my position..."

}

 

{

  "type": "request_brief_draft",

  "current_sections": { ... }

}

 

{

  "type": "ping"

}

Server → Client Messages

{

  "type": "assistant_message_chunk",

  "content": "Let me help you structure",

  "is_final": false

}

 

{

  "type": "assistant_message_complete",

  "message_id": "msg_xyz",

  "total_tokens": 142

}

 

{

  "type": "brief_draft_ready",

  "sections": { ... }

}

 

{

  "type": "error",

  "error": { ... }

}

9.2 Opinion Status Stream

Server-Sent Events stream for monitoring opinion generation progress.

Connection

GET /v1/disputes/:dispute_id/opinion/stream

Accept: text/event-stream

Authorization: Bearer ...

Event Format

event: progress

data: {"evaluators_complete": 2, "evaluators_total": 5}

 

event: evaluator_complete

data: {"evaluator": "anthropic/claude-3-5-sonnet", "duration_ms": 12450}

 

event: aggregation_started

data: {"timestamp": "2026-05-17T13:25:00Z"}

 

event: opinion_ready

data: {"opinion_id": "op_xyz"}

10. Webhooks (Future / Phase 4)

Webhook delivery for B2B integrations. Subscribers receive HTTP POST notifications for relevant events. Reserved for future phase.

Event Types (planned)

• dispute.created

• dispute.completed

• opinion.ready

• payment.completed

• payment.refunded



PART 2: DATABASE SCHEMA

11. Schema Overview

11.1 Design Principles

• UUIDs for primary keys: Generated as UUIDv7 for time-ordering with the uniqueness of UUIDs

• Soft deletes where reversible: deleted_at timestamps rather than DELETE for entities that may need recovery; hard delete for privacy compliance

• created_at and updated_at on all tables: Standard temporal tracking, automatically managed

• Foreign keys enforced: Referential integrity at database level; no orphan records

• Encrypted columns for sensitive data: Application-level encryption for brief content; PostgreSQL pgcrypto for moderate sensitivity

• Indexes on common query paths: Covering indexes for hot paths; partial indexes where state filtering is common

• Row-level security for multi-tenant isolation: PostgreSQL RLS policies enforce party-level access control

11.2 ID Conventions

All entity IDs use prefixed UUIDs for human readability and accidental misuse prevention:

• user_8f3a1b2c — User

• disp_abc123 — Dispute

• party_001 — Party (within a dispute)

• brief_abc — Brief

• sess_xyz — Brief preparation session

• doc_111 — Document

• eval_aaa — Evaluator output

• op_xyz — Opinion

• pay_bbb — Payment

• inv_xyz — Invitation

• audit_ccc — Audit event

12. Core Tables

12.1 users

Account records for all users (including guest accounts).

CREATE TABLE users (

    id              VARCHAR(40) PRIMARY KEY,

    email           VARCHAR(255) UNIQUE NOT NULL,

    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,

    password_hash   VARCHAR(255),  -- NULL for OAuth-only users

    display_name    VARCHAR(100),

    

    -- Authentication

    oauth_provider  VARCHAR(20),   -- 'google', 'apple', or NULL

    oauth_subject   VARCHAR(255),  -- provider-specific user ID

    totp_secret     VARCHAR(255),  -- encrypted; NULL if 2FA not enabled

    

    -- Preferences

    preferred_llm_provider  VARCHAR(50),

    marketing_opt_in        BOOLEAN NOT NULL DEFAULT FALSE,

    timezone                VARCHAR(50),

    locale                  VARCHAR(10) DEFAULT 'en-US',

    

    -- Account type

    account_type    VARCHAR(20) NOT NULL DEFAULT 'standard',

                    -- 'standard', 'guest', 'admin', 'support'

    

    -- Lifecycle

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    deleted_at      TIMESTAMPTZ,  -- soft delete; data purged after 30 days

    last_login_at   TIMESTAMPTZ,

    

    CONSTRAINT users_oauth_check CHECK (

        (oauth_provider IS NULL AND oauth_subject IS NULL) OR

        (oauth_provider IS NOT NULL AND oauth_subject IS NOT NULL)

    )

);

 

CREATE UNIQUE INDEX idx_users_oauth ON users(oauth_provider, oauth_subject)

    WHERE oauth_provider IS NOT NULL;

CREATE INDEX idx_users_email_active ON users(email)

    WHERE deleted_at IS NULL;

CREATE INDEX idx_users_created_at ON users(created_at DESC);

12.2 disputes

Container record for each dispute resolution case.

CREATE TABLE disputes (

    id              VARCHAR(40) PRIMARY KEY,

    

    -- Basic info

    category        VARCHAR(50) NOT NULL,

                    -- 'contract_interpretation', 'small_claims_assessment',

                    -- 'partnership_conflict', etc.

    title           VARCHAR(200) NOT NULL,

    summary         TEXT,

    estimated_stakes_usd  DECIMAL(12,2),

    

    -- State machine

    state           VARCHAR(40) NOT NULL DEFAULT 'draft',

                    -- 'draft', 'awaiting_counterparty', 'in_progress',

                    -- 'awaiting_briefs', 'awaiting_counterparty_brief',

                    -- 'under_analysis', 'completed', 'withdrawn', 'declined'

    state_changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    

    -- Pricing

    pricing_tier    VARCHAR(20) NOT NULL DEFAULT 'standard',

                    -- 'standard', 'expedited', 'extended', 'reanalysis'

    price_usd       DECIMAL(8,2) NOT NULL,

    

    -- Initiating user

    initiator_user_id  VARCHAR(40) NOT NULL REFERENCES users(id),

    

    -- Lifecycle

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    completed_at    TIMESTAMPTZ,

    deleted_at      TIMESTAMPTZ,

    

    CONSTRAINT disputes_state_check CHECK (

        state IN ('draft', 'awaiting_counterparty', 'in_progress',

                  'awaiting_briefs', 'awaiting_counterparty_brief',

                  'under_analysis', 'completed', 'withdrawn', 'declined')

    )

);

 

CREATE INDEX idx_disputes_initiator ON disputes(initiator_user_id);

CREATE INDEX idx_disputes_state ON disputes(state)

    WHERE state NOT IN ('completed', 'withdrawn', 'declined');

CREATE INDEX idx_disputes_created_at ON disputes(created_at DESC);

12.3 parties

Junction table linking users to disputes. Each dispute has exactly two parties.

CREATE TABLE parties (

    id              VARCHAR(40) PRIMARY KEY,

    dispute_id      VARCHAR(40) NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,

    role            VARCHAR(20) NOT NULL,

                    -- 'initiator', 'respondent'

    

    -- User assignment (NULL until invitation accepted)

    user_id         VARCHAR(40) REFERENCES users(id),

    

    -- Invitation tracking (for respondents before acceptance)

    invitation_email      VARCHAR(255),

    invitation_token      VARCHAR(64) UNIQUE,

    invitation_status     VARCHAR(20) DEFAULT 'pending',

                          -- 'pending', 'accepted', 'declined', 'expired'

    invitation_sent_at    TIMESTAMPTZ,

    invitation_expires_at TIMESTAMPTZ,

    invitation_accepted_at TIMESTAMPTZ,

    

    -- Brief status

    brief_status    VARCHAR(20) NOT NULL DEFAULT 'not_started',

                    -- 'not_started', 'in_progress', 'submitted'

    

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    

    UNIQUE(dispute_id, role)

);

 

CREATE INDEX idx_parties_dispute ON parties(dispute_id);

CREATE INDEX idx_parties_user ON parties(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX idx_parties_invitation_token ON parties(invitation_token)

    WHERE invitation_token IS NOT NULL;

12.4 briefs

Submitted brief content. Encrypted at application layer with per-dispute keys.

CREATE TABLE briefs (

    id              VARCHAR(40) PRIMARY KEY,

    party_id        VARCHAR(40) NOT NULL UNIQUE REFERENCES parties(id) ON DELETE CASCADE,

    dispute_id      VARCHAR(40) NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,

    

    -- Brief content (encrypted at application layer)

    -- Sections stored as encrypted JSONB

    encrypted_content       BYTEA NOT NULL,

    content_encryption_key_id  VARCHAR(64) NOT NULL,

                          -- References key in key management system

    

    -- Metadata

    word_count      INTEGER NOT NULL,

    

    -- Supporting documents

    supporting_document_ids  TEXT[] DEFAULT '{}',

    

    -- Status

    status          VARCHAR(20) NOT NULL DEFAULT 'draft',

                    -- 'draft', 'submitted', 'sealed'

    

    -- Lifecycle

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    submitted_at    TIMESTAMPTZ,

    sealed_at       TIMESTAMPTZ,  -- when made immutable post-submission

    

    -- Cryptographic seal for tamper evidence after submission

    seal_hash       VARCHAR(64),  -- SHA-256 hash for verification

    

    CONSTRAINT briefs_submitted_has_seal CHECK (

        status != 'sealed' OR seal_hash IS NOT NULL

    )

);

 

CREATE INDEX idx_briefs_dispute ON briefs(dispute_id);

CREATE INDEX idx_briefs_status ON briefs(status);

12.5 brief_prep_sessions

LLM conversation history for brief preparation. Stored encrypted; retained for 90 days post-submission for audit.

CREATE TABLE brief_prep_sessions (

    id              VARCHAR(40) PRIMARY KEY,

    party_id        VARCHAR(40) NOT NULL REFERENCES parties(id) ON DELETE CASCADE,

    dispute_id      VARCHAR(40) NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,

    

    -- LLM provider

    llm_provider    VARCHAR(50) NOT NULL,

    model_id        VARCHAR(100) NOT NULL,

    

    -- Conversation history (encrypted)

    encrypted_messages  BYTEA NOT NULL,

    message_count       INTEGER NOT NULL DEFAULT 0,

    

    -- Token tracking for cost analysis

    total_input_tokens   INTEGER NOT NULL DEFAULT 0,

    total_output_tokens  INTEGER NOT NULL DEFAULT 0,

    total_cost_usd       DECIMAL(8,4) NOT NULL DEFAULT 0,

    

    -- Session lifecycle

    status          VARCHAR(20) NOT NULL DEFAULT 'active',

                    -- 'active', 'completed', 'abandoned', 'purged'

    

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    completed_at    TIMESTAMPTZ,

    purge_after     TIMESTAMPTZ  -- typically submitted_at + 90 days

);

 

CREATE INDEX idx_brief_sessions_party ON brief_prep_sessions(party_id);

CREATE INDEX idx_brief_sessions_purge ON brief_prep_sessions(purge_after)

    WHERE status != 'purged';

12.6 evaluator_outputs

Raw output from each evaluating LLM. Used for opinion generation and audit.

CREATE TABLE evaluator_outputs (

    id              VARCHAR(40) PRIMARY KEY,

    dispute_id      VARCHAR(40) NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,

    

    -- Which evaluator

    llm_provider    VARCHAR(50) NOT NULL,

    model_id        VARCHAR(100) NOT NULL,

    

    -- Prompt version used (for reproducibility)

    prompt_version  VARCHAR(20) NOT NULL,

    

    -- Output content

    structured_output  JSONB NOT NULL,

                       -- Structured analysis per schema

    raw_output         TEXT,

                       -- Original LLM response before parsing

    

    -- Quality indicators

    parse_success   BOOLEAN NOT NULL,

    parse_errors    JSONB,

    

    -- Performance metrics

    input_tokens    INTEGER NOT NULL,

    output_tokens   INTEGER NOT NULL,

    cost_usd        DECIMAL(8,4) NOT NULL,

    duration_ms     INTEGER NOT NULL,

    

    -- Retry tracking

    attempt_number  INTEGER NOT NULL DEFAULT 1,

    

    -- Lifecycle

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    

    CONSTRAINT evaluator_outputs_attempt CHECK (attempt_number > 0)

);

 

CREATE INDEX idx_eval_outputs_dispute ON evaluator_outputs(dispute_id);

CREATE INDEX idx_eval_outputs_provider ON evaluator_outputs(llm_provider, model_id);

12.7 opinions

Final aggregated opinion delivered to both parties.

CREATE TABLE opinions (

    id              VARCHAR(40) PRIMARY KEY,

    dispute_id      VARCHAR(40) NOT NULL UNIQUE REFERENCES disputes(id) ON DELETE CASCADE,

    

    -- Opinion content (encrypted at application layer)

    encrypted_content       BYTEA NOT NULL,

    content_encryption_key_id  VARCHAR(64) NOT NULL,

    

    -- Provenance

    eval_prompt_version  VARCHAR(20) NOT NULL,

    agg_prompt_version   VARCHAR(20) NOT NULL,

    evaluator_output_ids TEXT[] NOT NULL,

                         -- References to evaluator_outputs.id

    

    -- Quality metrics

    inter_evaluator_agreement   DECIMAL(4,3),

                                -- 0.000 to 1.000

    overall_confidence          DECIMAL(4,3),

    

    -- Aggregation provider info

    aggregator_provider  VARCHAR(50) NOT NULL,

    aggregator_model_id  VARCHAR(100) NOT NULL,

    

    -- Cost

    total_cost_usd   DECIMAL(8,4) NOT NULL,

    

    -- PDF generation

    pdf_storage_key  VARCHAR(255),  -- S3 key for generated PDF

    pdf_generated_at TIMESTAMPTZ,

    

    -- Lifecycle

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    delivered_at    TIMESTAMPTZ

);

 

CREATE INDEX idx_opinions_created ON opinions(created_at DESC);

12.8 documents

Supporting documents uploaded by parties.

CREATE TABLE documents (

    id              VARCHAR(40) PRIMARY KEY,

    dispute_id      VARCHAR(40) NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,

    uploaded_by_user_id  VARCHAR(40) NOT NULL REFERENCES users(id),

    uploaded_by_party_id VARCHAR(40) NOT NULL REFERENCES parties(id),

    

    -- File metadata

    filename        VARCHAR(255) NOT NULL,

    size_bytes      BIGINT NOT NULL,

    mime_type       VARCHAR(100) NOT NULL,

    

    -- Storage (S3)

    storage_key     VARCHAR(255) NOT NULL,

    storage_bucket  VARCHAR(100) NOT NULL,

    encryption_key_id VARCHAR(64) NOT NULL,

    

    -- Optional OCR

    ocr_status      VARCHAR(20) DEFAULT 'not_requested',

                    -- 'not_requested', 'pending', 'processing', 'completed', 'failed'

    extracted_text_storage_key  VARCHAR(255),

    

    -- User description

    description     TEXT,

    

    -- Lifecycle

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    deleted_at      TIMESTAMPTZ

);

 

CREATE INDEX idx_documents_dispute ON documents(dispute_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_documents_party ON documents(uploaded_by_party_id);

12.9 payments

Payment records linked to disputes.

CREATE TABLE payments (

    id              VARCHAR(40) PRIMARY KEY,

    dispute_id      VARCHAR(40) NOT NULL REFERENCES disputes(id),

    user_id         VARCHAR(40) NOT NULL REFERENCES users(id),

    

    -- Amount

    amount_usd      DECIMAL(8,2) NOT NULL,

    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',

    

    -- Payment processor

    processor       VARCHAR(20) NOT NULL DEFAULT 'stripe',

    processor_payment_id    VARCHAR(255) UNIQUE NOT NULL,

                            -- Stripe payment_intent ID

    processor_charge_id     VARCHAR(255),

    

    -- Status

    status          VARCHAR(20) NOT NULL,

                    -- 'pending', 'succeeded', 'failed', 'refunded',

                    -- 'partially_refunded'

    

    -- Refund tracking

    refunded_amount_usd     DECIMAL(8,2) DEFAULT 0,

    refund_reason           TEXT,

    refunded_at             TIMESTAMPTZ,

    

    -- Idempotency

    idempotency_key VARCHAR(64) UNIQUE,

    

    -- Lifecycle

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    completed_at    TIMESTAMPTZ

);

 

CREATE INDEX idx_payments_dispute ON payments(dispute_id);

CREATE INDEX idx_payments_user ON payments(user_id);

CREATE INDEX idx_payments_status ON payments(status);

12.10 audit_events

Append-only log of significant system events. Cryptographically signed for tamper evidence.

CREATE TABLE audit_events (

    id              VARCHAR(40) PRIMARY KEY,

    

    -- What happened

    event_type      VARCHAR(50) NOT NULL,

                    -- 'user.created', 'dispute.created', 'brief.submitted',

                    -- 'evaluator.called', 'opinion.delivered', etc.

    

    -- Who and what

    actor_type      VARCHAR(20) NOT NULL,

                    -- 'user', 'system', 'admin', 'support'

    actor_id        VARCHAR(40),  -- user.id or system service name

    

    -- Affected resources

    resource_type   VARCHAR(40),

                    -- 'user', 'dispute', 'brief', 'opinion', etc.

    resource_id     VARCHAR(40),

    

    -- Event details (structured)

    event_data      JSONB NOT NULL DEFAULT '{}',

    

    -- Request context

    ip_address      INET,

    user_agent      TEXT,

    request_id      VARCHAR(40),

    

    -- Cryptographic seal for tamper evidence

    -- HMAC of (id, event_type, actor_id, resource_id, event_data, prev_signature)

    prev_event_id   VARCHAR(40),  -- Forms hash chain

    signature       VARCHAR(64) NOT NULL,

    

    -- Append-only: created_at is the only timestamp; never updated

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

 

-- Partitioned by month for performance and retention management

CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id);

CREATE INDEX idx_audit_events_actor ON audit_events(actor_id) WHERE actor_id IS NOT NULL;

CREATE INDEX idx_audit_events_type_time ON audit_events(event_type, created_at);

CREATE INDEX idx_audit_events_request ON audit_events(request_id) WHERE request_id IS NOT NULL;

 

-- Note: This table should be partitioned by month in production

-- and old partitions archived to cold storage after 7 years

13. Auxiliary Tables

13.1 invitations

Tracks counterparty invitations. Most invitation data lives in parties table; this table handles re-sends and history.

CREATE TABLE invitation_events (

    id              VARCHAR(40) PRIMARY KEY,

    party_id        VARCHAR(40) NOT NULL REFERENCES parties(id) ON DELETE CASCADE,

    

    event_type      VARCHAR(20) NOT NULL,

                    -- 'sent', 'opened', 'accepted', 'declined', 'expired', 'resent'

    email           VARCHAR(255) NOT NULL,

    

    -- For tracking

    ip_address      INET,

    user_agent      TEXT,

    

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

);

 

CREATE INDEX idx_invitation_events_party ON invitation_events(party_id);

13.2 refresh_tokens

Active refresh tokens for session management. Rotated on each use.

CREATE TABLE refresh_tokens (

    id              VARCHAR(40) PRIMARY KEY,

    user_id         VARCHAR(40) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    

    -- Token (hashed)

    token_hash      VARCHAR(64) UNIQUE NOT NULL,

    

    -- Session context

    device_fingerprint  VARCHAR(255),

    ip_address          INET,

    user_agent          TEXT,

    

    -- Lifecycle

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expires_at      TIMESTAMPTZ NOT NULL,

    last_used_at    TIMESTAMPTZ,

    revoked_at      TIMESTAMPTZ

);

 

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id) WHERE revoked_at IS NULL;

CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;

13.3 rate_limit_counters

Note: For production scale, rate limiting state lives in Redis, not PostgreSQL. This schema is for the development environment fallback.

14. Row-Level Security Policies

PostgreSQL Row-Level Security (RLS) policies enforce party-level access control as a defense-in-depth measure. Application code is the primary access control, but RLS provides protection against bugs.

14.1 Session Variables

-- Set per-request by application

SET LOCAL meritview.current_user_id = 'user_8f3a1b2c';

SET LOCAL meritview.is_admin = 'false';

14.2 Example Policies

-- Disputes: users can only see disputes they participate in

CREATE POLICY disputes_select_policy ON disputes

    FOR SELECT

    USING (

        current_setting('meritview.is_admin')::boolean = TRUE

        OR id IN (

            SELECT dispute_id FROM parties

            WHERE user_id = current_setting('meritview.current_user_id')

        )

    );

 

-- Briefs: users can only see their own brief, OR both briefs if both submitted

CREATE POLICY briefs_select_policy ON briefs

    FOR SELECT

    USING (

        current_setting('meritview.is_admin')::boolean = TRUE

        OR (

            -- My own brief always visible

            party_id IN (

                SELECT id FROM parties

                WHERE user_id = current_setting('meritview.current_user_id')

            )

        )

        OR (

            -- Counterparty's brief visible after both submitted

            dispute_id IN (

                SELECT d.id FROM disputes d

                WHERE EXISTS (

                    SELECT 1 FROM parties p1

                    WHERE p1.dispute_id = d.id

                    AND p1.user_id = current_setting('meritview.current_user_id')

                )

                AND NOT EXISTS (

                    SELECT 1 FROM briefs b2

                    JOIN parties p2 ON b2.party_id = p2.id

                    WHERE p2.dispute_id = d.id

                    AND b2.status != 'sealed'

                )

            )

        )

    );

15. State Machines

15.1 Dispute State Transitions

Disputes progress through a defined sequence of states. Invalid transitions are rejected at the application layer:

draft

  → awaiting_counterparty       (counterparty invited)

  → withdrawn                   (initiator cancels before invitation)

 

awaiting_counterparty

  → in_progress                 (counterparty accepts)

  → declined                    (counterparty declines)

  → withdrawn                   (initiator cancels)

  → expired                     (invitation expires after 7 days)

 

in_progress

  → awaiting_briefs             (when both parties start briefs)

 

awaiting_briefs

  → awaiting_counterparty_brief (one party submits, other hasn't)

  → under_analysis              (both parties submit)

 

awaiting_counterparty_brief

  → under_analysis              (second party submits)

  → withdrawn                   (initiator cancels)

 

under_analysis

  → completed                   (opinion delivered)

  → failed                      (analysis failure; auto-refund)

 

completed

  → reanalysis_in_progress      (re-analysis requested)

  → (terminal otherwise)

15.2 Brief Status Transitions

not_started

  → in_progress     (session started)

 

in_progress

  → submitted       (party submits brief)

 

submitted

  → sealed          (brief made immutable, 1 minute after submission)

16. Data Retention and Purging

16.1 Retention Schedules

Table

Default Retention

Purge Process

disputes

12 months after completion

Soft delete → hard delete after 30 days

briefs

12 months after completion

Cascade with dispute deletion

brief_prep_sessions

90 days after brief submission

Daily background purge job

opinions

12 months after delivery

Cascade with dispute deletion

documents

12 months after upload

Both DB row and S3 object purged

evaluator_outputs

12 months

Cascade with dispute deletion

payments

7 years

Required by financial regulations

audit_events

7 years

Partitioned monthly; old partitions archived

users (deleted)

30 days after deletion request

Hard delete + cascade



16.2 User-Initiated Deletion

Users can request immediate deletion of specific disputes or their entire account. Deletion respects the following rules:

• Cannot delete disputes in 'under_analysis' state until analysis completes

• Counterparty consent required for jointly-completed disputes (or 30-day waiting period)

• Payment records retained for regulatory compliance (anonymized after personal deletion)

• Audit events retained but personally-identifying fields nullified

17. Indexes and Performance

17.1 Hot Query Paths

Indexes are designed around the most common query patterns:

• User → disputes list: Index on parties(user_id) → join to disputes

• Dispute by ID with parties: PK lookup + small join

• Active disputes for processing: Partial index on disputes(state) for active states only

• Audit events for a resource: Composite index on (resource_type, resource_id)

• Recent activity for a user: Index on parties(user_id) combined with disputes ordering

17.2 Performance Targets

• Dispute list query: <50ms for 50 disputes

• Dispute detail load: <100ms including all parties and brief metadata

• Opinion read: <200ms including decryption

• Audit log write: <10ms (async path)

• Authentication: <50ms for token validation

17.3 Connection Pooling

• Application connections pooled via PgBouncer in transaction mode

• Target: 5-10 PgBouncer connections per application instance

• PgBouncer → PostgreSQL: 50-100 connections per database

• Separate pools for read-only and read-write workloads

18. Schema Migration Strategy

18.1 Migration Tooling

• Migration tool: Prisma Migrate or Flyway

• Migrations stored in version control

• Forward-only migrations preferred; reversible migrations required where safe

• Migration review required for any production database change

18.2 Safe Migration Practices

• Backward compatibility: Application code must work with both old and new schema during deploy

• Multi-phase migrations: Add column → backfill → make required → remove old column over multiple deploys

• No long-running migrations: Avoid migrations that lock tables for more than a few seconds

• Test migrations: All migrations tested against production-equivalent data volume in staging

19. Appendices

19.1 Reserved Endpoint Paths

Paths reserved for future use; not implemented in v1 but should not be repurposed:

• /v1/admin/* — Admin/support tools (separate auth)

• /v1/webhooks/* — Webhook subscription management

• /v1/integrations/* — B2B partner integrations

• /v1/legal/* — Legal disclosures and policies

• /v1/health, /v1/version — Operational endpoints (no auth)

19.2 Document History

• v0.1 (May 2026): Initial API and schema specification



End of Document

