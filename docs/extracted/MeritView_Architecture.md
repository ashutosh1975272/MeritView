# MeritView_Architecture

MeritView

System Architecture Document



Version 0.1 (Draft)

May 2026

Technical Design for AI-Powered Dispute Analysis

Confidential — Internal Engineering Document



1. Introduction and Scope

1.1 Purpose

This document defines the technical architecture for MeritView, an AI-powered dispute analysis service. It is intended to guide engineering implementation, inform infrastructure decisions, support security and privacy reviews, and serve as the authoritative reference for technical scope and design decisions.

This document focuses on the production system targeted for public launch (PRD Phase 3). The MVP and Beta phases will implement subsets of this architecture, with deliberate simplifications appropriate to their objectives.

1.2 Relationship to Other Documents

• PRD: Defines product requirements; this document defines technical implementation

• Security Policy: To be drafted; will define operational security practices not covered here

• API Specification: To be drafted; will provide detailed endpoint contracts

• Data Schema: To be drafted; will provide detailed entity definitions

1.3 Architectural Principles

The following principles guide all architectural decisions:

• Privacy by design: User dispute content is the most sensitive data the system handles; all design choices prioritize protecting it

• Model diversity: No single AI provider can become a critical dependency; system must function with any subset of supported models

• Auditability: Every opinion must be traceable to specific evaluator outputs and aggregation logic

• Cost efficiency: AI inference is the largest variable cost; optimize for token efficiency without sacrificing quality

• Operational simplicity: Prefer managed services over self-hosted infrastructure during early scale

• Geographic flexibility: Architecture must support deployment in multiple regions for compliance and latency

2. High-Level Architecture

2.1 System Overview

MeritView is a cloud-native web application with three primary tiers: a presentation tier (web and mobile clients), an application tier (API services, business logic, AI orchestration), and a data tier (databases, object storage, caching). The system integrates with multiple external LLM providers and supporting services.

Logical Architecture Overview

The system is organized in three tiers. A visual architecture diagram is provided as a separate file (MeritView_Architecture_Diagram.svg). The text below describes the same architecture in narrative form:

The presentation tier consists of client applications: a web application built with Next.js, plus native iOS and Android apps (in later phases). All client traffic routes through an API Gateway that handles authentication, rate limiting, and request routing.

The application tier contains several services. The Identity & Account Service manages user authentication and profiles. The Dispute Management Service handles dispute lifecycle and party coordination. The AI Orchestration Service — the most architecturally significant component — coordinates all LLM interactions through three sub-modules: the Brief Preparation Coordinator (manages conversational brief preparation), the Evaluator Dispatcher (submits briefs to multiple LLMs in parallel), and the Aggregation Engine (synthesizes evaluator outputs into final opinions). Supporting services include the Document Service (file uploads and OCR), Notification Service (email, push, SMS), Payment Service (Stripe integration), and Audit Log Service (append-only event tracking).

The AI Orchestration Service connects to five external LLM providers through a unified abstraction layer: Anthropic Claude, OpenAI GPT-4+, Google Gemini, Llama-based models (via Together.ai or similar), and Mistral. The abstraction layer isolates business logic from provider-specific details, allowing providers to be added, removed, or rotated without changing application code.

The data tier consists of PostgreSQL as the primary database (user accounts, disputes, briefs, opinions, audit events), Redis for caching and session management, and S3-compatible object storage for documents and generated opinion PDFs. All data is encrypted at rest using customer-managed keys.

2.2 Core Architectural Patterns

• Microservices with shared data layer: Services are logically separate but share a primary database during early stages to avoid distributed-system complexity

• Event-driven for async workflows: AI evaluation is long-running (minutes to hours); message queue decouples request handling from processing

• Strangler pattern for vendor flexibility: All LLM providers accessed through abstraction layer; new providers added without changing business logic

• CQRS for opinion delivery: Opinion read model optimized for delivery is separate from evaluation write model optimized for analysis

• Circuit breakers for external dependencies: Any LLM provider can fail without taking down the system; remaining providers continue serving

3. Component Architecture

3.1 Presentation Tier

Web Application

• Framework: Next.js 14+ with React 18+ (server components where appropriate)

• Styling: Tailwind CSS with custom design system tokens matching MeritView brand

• State management: TanStack Query for server state, Zustand for client state

• Authentication client: OAuth2/OIDC flows handled by Auth.js (formerly NextAuth)

• Real-time features: WebSocket connection for brief preparation chat with LLM; Server-Sent Events for opinion status updates

• Deployment: Vercel or AWS Amplify for managed Next.js hosting; CDN for static assets

Mobile Applications (Phase 3+)

• Approach: Native iOS (Swift, SwiftUI) and Android (Kotlin, Jetpack Compose) for best user experience

• Shared logic: API contracts and business rules shared via well-documented REST/GraphQL API

• Alternative: React Native if resources are constrained; Flutter not recommended due to ecosystem fit

3.2 Application Tier

API Gateway

• Single entry point for all client requests

• Handles authentication, rate limiting, request routing

• Initial implementation: AWS API Gateway or Cloudflare Workers

• Rate limits: 100 requests/minute per user, 10 requests/second burst

• Authentication: Bearer tokens (JWT) issued by Identity Service

Identity and Account Service

• User registration, authentication, profile management

• Email + password with mandatory email verification

• OAuth: Google, Apple

• Optional TOTP-based two-factor authentication

• Session management with refresh tokens (15-minute access, 7-day refresh)

• Initial implementation: Clerk, Auth0, or custom (custom only if needed for compliance)

• Guest mode: pseudonymous accounts created via invitation links, upgradable to full accounts

Dispute Management Service

• Core business logic for dispute lifecycle

• Dispute creation, state transitions, participant management

• Implements state machine: Draft → Invited → Both-Briefs-In-Progress → Both-Briefs-Submitted → Under-Analysis → Opinion-Delivered → Closed

• Enforces invariants (e.g., parties cannot see each other's briefs until both submitted)

• Generates invitation links with single-use tokens

• Implementation: Node.js (TypeScript) microservice with REST API

AI Orchestration Service

The most architecturally significant component. Coordinates all AI interactions and is responsible for the system's core differentiation. Composed of three sub-modules:

Brief Preparation Coordinator

• Manages conversational interaction between user and chosen LLM

• Maintains structured brief template state

• Streams LLM responses to client via WebSocket

• Enforces word limits and content policies

• Stores conversation history with brief versions

Evaluator Dispatcher

• Submits both briefs to each evaluating LLM in parallel

• Uses standardized prompts (versioned, with prompt versions stored alongside outputs)

• Implements retry logic with exponential backoff for transient failures

• Handles model-specific output format variations

• Records timing, token usage, and cost per evaluation

• Stores raw evaluator outputs for audit and aggregation

Aggregation Engine

• Receives all evaluator outputs after dispatcher completes

• Performs structured synthesis to identify agreement and disagreement

• Calls a designated aggregator LLM (typically the most capable model available) for final synthesis

• Produces final opinion in standardized format

• Includes confidence scoring based on inter-evaluator agreement

• Implementation choice: dedicated LLM call (initially) vs. trained classifier (longer term)

Document Service

• Handles user-uploaded supporting documents (contracts, photos, screenshots)

• Supports common formats: PDF, DOCX, JPG, PNG, HEIC

• Performs OCR on images using AWS Textract or Google Cloud Vision

• Generates document summaries via LLM for inclusion in briefs

• Storage: S3 with server-side encryption (KMS), 12-month default retention

• Size limits: 25MB per file, 5 files per brief

Notification Service

• Email: SendGrid or AWS SES for transactional emails

• Push: Firebase Cloud Messaging (FCM) and Apple Push Notification (APN)

• SMS: Twilio for critical notifications (optional, user opt-in)

• Event types: invitation, brief submitted by counterparty, opinion ready, payment receipts

Payment Service

• Stripe as primary payment processor

• PayPal as secondary option for non-card payments

• Handles one-time payments (per-analysis) and future subscription billing

• PCI compliance handled by Stripe (we do not store card data)

• Refund logic: automatic for technical failures, manual review for satisfaction-based refunds

Audit Log Service

• Append-only log of all system actions affecting user data

• Tracks: dispute state transitions, evaluator calls (with prompt versions), opinion generations, data access events

• Cryptographically signed entries for tamper evidence

• Storage: separate database with restricted access; 7-year retention for compliance

• Purpose: incident investigation, compliance audits, quality assurance, dispute resolution

3.3 Data Tier

Primary Database (PostgreSQL)

• Hosted PostgreSQL 16+ on AWS RDS or equivalent managed service

• Schema includes: users, disputes, briefs, evaluator_outputs, opinions, payments, audit_events

• Encryption at rest using KMS-managed keys

• Read replicas for query scaling; primary write instance

• Daily automated backups with 30-day retention; PITR (point-in-time recovery)

• Connection pooling via PgBouncer to handle high connection counts

Cache and Session Store (Redis)

• AWS ElastiCache or Redis Cloud managed service

• Used for: session tokens, rate-limit counters, WebSocket session state, expensive query caching

• NOT used for: anything requiring durability (Redis is treated as ephemeral)

• Encryption in transit (TLS) and at rest

Object Storage (S3 or equivalent)

• AWS S3 (or Google Cloud Storage / Azure Blob in respective regions)

• Stored objects: uploaded documents, generated opinion PDFs, conversation transcripts (encrypted)

• Bucket-level encryption with customer-managed KMS keys

• Versioning enabled for accidental deletion recovery

• Lifecycle policies: automatic deletion after retention period expires

• Cross-region replication for disaster recovery (production data only)

4. AI Integration Architecture

4.1 Provider Abstraction Layer

All LLM interactions go through an abstraction layer that isolates business logic from provider-specific details. This layer is the most important architectural component because it determines how well the system can adapt to the rapidly evolving LLM landscape.

Provider Interface

 

interface LLMProvider {

  // Identity

  readonly providerId: string;

  readonly modelId: string;

  readonly capabilities: ProviderCapabilities;

  

  // Generation methods

  generateCompletion(prompt: Prompt): Promise<CompletionResult>;

  generateStreamingCompletion(prompt: Prompt): AsyncIterable<CompletionChunk>;

  

  // Health and cost

  healthCheck(): Promise<HealthStatus>;

  estimateCost(prompt: Prompt): CostEstimate;

  

  // Compliance

  hasNoTrainingGuarantee(): boolean;

  hasDataResidency(region: string): boolean;

}

Concrete implementations: AnthropicProvider, OpenAIProvider, GeminiProvider, MistralProvider, TogetherProvider (for Llama-based models). New providers added by implementing the interface; no changes required to business logic.

Capability Negotiation

Different providers have different capabilities. The abstraction layer normalizes these where possible and exposes provider capabilities for routing decisions:

• Context window size (varies from 32K to 200K+ tokens)

• Output token limit

• Streaming support

• System prompt support

• Tool/function calling support

• Data residency options (US, EU)

• No-training guarantees

• SLA commitments

4.2 Brief Preparation Flow

When a user selects an LLM for brief preparation, the system creates a dedicated conversation session:

Sequence

 

1. User selects LLM provider (e.g., "Claude")

2. System creates BriefPreparationSession

   - session_id, dispute_id, party_id, provider_id

   - initial_prompt: structured template + dispute context

3. WebSocket connection established between client and Brief Preparation Coordinator

4. User messages flow: client → Coordinator → Provider → streaming back to client

5. Coordinator maintains conversation history

6. User can request structured output at any time:

   - Coordinator sends "generate brief draft" prompt

   - Provider returns structured brief

   - User reviews and edits

7. On submit:

   - Final brief stored with conversation history

   - Brief content cryptographically sealed (no further edits)

   - Counterparty notified that this party's brief is complete

 

Brief Template Structure

• Section 1: Factual background (what happened)

• Section 2: My position (what I claim)

• Section 3: Supporting arguments (why my position is correct)

• Section 4: Acknowledgment of opposing arguments (what the other party will say)

• Section 5: Desired resolution (what outcome I want)

• Optional: Section 6 supporting documents (uploaded files referenced inline)

4.3 Evaluation Flow

Once both briefs are submitted, the Evaluator Dispatcher orchestrates multi-model analysis:

Sequence

 

1. Both briefs submitted → Dispute state: Under-Analysis

2. Dispatcher creates EvaluationJob with:

   - job_id, dispute_id, both brief contents

   - List of evaluator providers (5 in production)

   - Prompt version to use

3. For each evaluator (in parallel):

   - Construct evaluation prompt (standardized)

   - Submit to provider via abstraction layer

   - Receive structured output

   - Validate against expected schema

   - Store output in evaluator_outputs table

   - Record: prompt_version, response_time, token_counts, cost

4. After all evaluators complete (or timeout):

   - Aggregation Engine triggered

5. If any evaluator fails:

   - Retry up to 2 times with exponential backoff

   - If still failing, mark as missing and proceed with remaining evaluators

   - Require minimum 3 successful evaluations to proceed

6. If fewer than 3 successful evaluations:

   - Job fails; user notified; partial refund issued

 

Evaluation Prompt Structure

Each evaluator receives a standardized prompt:

 

You are an impartial analyst evaluating arguments in a dispute. 

You will be shown two briefs from opposing parties. Your task is 

to analyze each side's arguments objectively.

 

For each party's brief, provide:

1. The 3 strongest arguments and why they are strong

2. The 3 weakest points and what makes them weak

3. Any factual claims that need verification

4. Any logical fallacies or reasoning gaps

 

Then provide:

5. An overall assessment of relative argument strength

6. Specific considerations each party should think about

7. A confidence score (1-10) on your assessment

 

IMPORTANT:

- Do NOT render a verdict or "decision"

- Flag factual claims you cannot verify rather than asserting them

- If you would need to cite legal authorities, only cite ones you 

  are certain exist

- Acknowledge uncertainty rather than fabricating confidence

 

[BRIEF A]

{brief_a_content}

 

[BRIEF B]  

{brief_b_content}

 

Respond in the structured format defined in schema_v3.json.

 

4.4 Aggregation

After all evaluators complete, the Aggregation Engine produces the final opinion:

Aggregation Process

• Parse all evaluator outputs into structured form

• Compute inter-evaluator agreement metrics

• Identify points where evaluators agree (high confidence) vs. disagree (lower confidence)

• Submit consolidated input to aggregator LLM for narrative synthesis

• Validate aggregator output for hallucinated citations or unsupported claims

• Generate final opinion document

• Store with full provenance (which evaluators contributed, prompt versions, timestamps)

Opinion Output Schema

 

{

  "opinion_id": "uuid",

  "dispute_id": "uuid",

  "generated_at": "2026-05-17T10:30:00Z",

  "prompt_version": "eval-v3.2, agg-v2.1",

  "evaluators_used": ["claude-3-5", "gpt-4", "gemini-pro", ...],

  "executive_summary": "string",

  "key_issues": [

    { "issue": "...", "agreement_level": "high|medium|low" }

  ],

  "party_a_analysis": {

    "strongest_arguments": [...],

    "weakest_points": [...],

    "factual_concerns": [...]

  },

  "party_b_analysis": { ... },

  "comparative_assessment": "string",

  "confidence_indicators": {

    "overall_confidence": 0.0-1.0,

    "evaluator_agreement": 0.0-1.0

  },

  "suggested_considerations": {

    "party_a": [...],

    "party_b": [...]

  },

  "disclaimers": [...]

}

4.5 Cost and Performance Optimization

Token Budget Management

• Brief preparation: budget 10K tokens per session, hard cap at 20K

• Evaluation per evaluator: budget 5K tokens (input) + 2K tokens (output)

• Aggregation: budget 15K tokens input + 3K tokens output

• Total per dispute: ~50K tokens across all providers

Cost Monitoring

• Real-time cost tracking per request

• Daily and weekly cost dashboards

• Alerts when cost-per-dispute exceeds threshold

• Per-provider cost breakdown for optimization decisions

Performance Optimization

• Parallel evaluator dispatch (all 5 simultaneously)

• Streaming responses where supported (improves perceived latency)

• Response caching for identical evaluation inputs (rare but possible during testing)

• Provider selection by latency for time-sensitive operations

5. Data Architecture

5.1 Core Entities

Entity

Purpose

Key Relationships

User

Account holder with authentication credentials

Has many Disputes (as participant)

Dispute

Container for a single dispute resolution case

Has 2 Parties, 2 Briefs, 1 Opinion

Party

Participant in a specific dispute (links User to Dispute)

Belongs to Dispute, references User

Brief

Written position statement by one party

Belongs to Party, has BriefPrepSession

BriefPrepSession

Conversation history with LLM during brief preparation

Belongs to Brief, references LLMProvider

EvaluatorOutput

Raw output from one evaluating LLM for one dispute

Belongs to Dispute, references LLMProvider

Opinion

Final synthesized analysis delivered to both parties

Belongs to Dispute, derived from EvaluatorOutputs

Payment

Record of payment for a dispute analysis

Belongs to Dispute, references User

AuditEvent

Append-only record of significant system actions

References User, Dispute, or system actor



5.2 Data Encryption

All user dispute content is treated as highly sensitive and encrypted using a layered approach:

• Transport: TLS 1.3 for all client-server communication

• At rest (databases): PostgreSQL transparent data encryption with KMS-managed keys

• At rest (objects): S3 server-side encryption with customer-managed KMS keys

• Application-level encryption: Brief content and conversation transcripts encrypted at application layer before storage; separate key per dispute

• Key management: AWS KMS or HashiCorp Vault for key storage; quarterly key rotation

5.3 Data Retention

Data Type

Default Retention

User Control

Dispute briefs and conversation history

12 months

Can be deleted earlier on request

Opinion documents

12 months

Can be downloaded as PDF; deleted on request

Uploaded supporting documents

12 months

Can be deleted earlier on request

Account profile data

Until account deletion

Account deletion removes within 30 days

Payment records

7 years

Required by tax/financial regulations

Audit events

7 years

Required for compliance; not user-deletable



5.4 Data Isolation

A critical privacy invariant: parties to a dispute must not see each other's briefs or preparation conversations until both briefs are submitted. This is enforced at multiple layers:

• Database row-level security policies

• Application-level authorization checks before any read operation

• Separate encryption keys per party until both briefs sealed

• Audit logging of all access attempts

6. Security Architecture

6.1 Authentication and Authorization

• OAuth2/OIDC for authentication

• JWT bearer tokens for API authorization

• Role-based access control with roles: user, support_agent, admin, auditor

• Resource-based authorization: users can only access their own disputes

• Mandatory email verification before first dispute

• Optional two-factor authentication via TOTP

6.2 LLM Provider Security

LLM provider relationships require specific attention because dispute content is transmitted to external services:

• No-training agreements: Use enterprise/API tiers that contractually prohibit training on submitted content (Anthropic, OpenAI, Google all offer this)

• Data residency: For EU users, use providers offering EU data processing; for sensitive jurisdictions, prefer in-region providers

• Audit logs: Maintain logs of what content was sent to which provider when

• Contractual protections: BAAs (Business Associate Agreements) or DPAs (Data Processing Agreements) with each provider

• Provider rotation capability: If a provider has a security incident, we can disable that provider and continue operating

6.3 Threat Model

Threats Considered

• Account takeover: Mitigation: strong authentication, 2FA, anomaly detection, session monitoring

• Cross-party data leakage: Mitigation: data isolation policies enforced at multiple layers

• LLM prompt injection: Mitigation: input sanitization, system prompt isolation, output validation

• LLM data leakage in training: Mitigation: no-training API tiers, contractual protections

• Insider data access: Mitigation: minimal access by default, audit logging, separation of duties

• Database breach: Mitigation: encryption at rest, network isolation, principle of least privilege

• DDoS attacks: Mitigation: CloudFlare or AWS Shield protection, rate limiting

• Bad-faith user behavior: Mitigation: content policies, abuse detection, account suspension processes

6.4 Compliance Considerations

• GDPR (EU users): right to access, right to deletion, data portability, breach notification

• CCPA (California): privacy rights, opt-out of data sales (we don't sell data), deletion rights

• HIPAA: not currently applicable, but architecture allows future expansion to healthcare disputes if needed

• SOC 2 Type II: target compliance within 12 months of public launch

• Industry-specific: monitor evolving AI regulations (EU AI Act, US state AI laws)

7. Deployment Architecture

7.1 Cloud Provider Strategy

Primary deployment on AWS for breadth of services and maturity. Architecture is designed to be cloud-portable to allow future expansion to GCP (for Gemini proximity, EU presence) and Azure (for enterprise customers if relevant).

7.2 Environment Strategy

• Local development: Docker Compose with mock LLM providers

• Development: Shared cloud environment with real LLM APIs (rate-limited)

• Staging: Production-equivalent infrastructure, synthetic test data only

• Production: Multi-AZ deployment, live LLM APIs, real user traffic

7.3 Geographic Deployment

• Phase 1-2: Single region: AWS us-east-1 (Virginia)

• Phase 3: Add AWS us-west-2 (Oregon) for redundancy

• Phase 4: Add AWS eu-west-1 (Ireland) for EU users with data residency requirements

• Future: Asia-Pacific region based on market demand

7.4 CI/CD

• Source control: GitHub with branch protection on main

• CI: GitHub Actions for tests, linting, security scans

• CD: Automated deployment to staging on merge to main

• Production deployment: manual approval gate, blue/green deployment strategy

• Database migrations: separate review process, reversible migrations required

• Feature flags: LaunchDarkly or self-hosted for gradual rollout

7.5 Monitoring and Observability

• Metrics: Prometheus + Grafana for system metrics; custom dashboards for business metrics

• Logging: Structured JSON logs to CloudWatch or Datadog

• Tracing: OpenTelemetry distributed tracing for request flows

• Errors: Sentry for application error tracking and alerting

• Uptime: External monitoring via Pingdom or UptimeRobot

• Cost: AWS Cost Explorer + custom dashboards for LLM cost tracking

8. Scalability Considerations

8.1 Expected Load Profile

System sizing based on PRD targets:

• Phase 3 target: 1,000 paid analyses per month (~33/day average, ~100/day peak)

• Phase 4 target: 10,000+ analyses per month (~300+/day)

• Each analysis: 2 user sessions, 5 LLM evaluations, 1 aggregation

• Concurrent active users: ~100 at Phase 3 peak, ~500-1000 at Phase 4 peak

• This load is modest by web application standards; architecture is designed to scale to 100K+ analyses/month before requiring major refactoring

8.2 Scaling Approach

• Stateless services: All application services are stateless; scale horizontally by adding instances

• Database scaling: Vertical scaling (larger RDS instance) sufficient for early growth; read replicas for read-heavy workloads; sharding only at very large scale

• LLM scaling: External (provider responsibility); we manage rate limits and provider mix

• Background processing: Queue-based processing (SQS) for long-running evaluations; workers scale based on queue depth

• CDN: Static assets and downloadable opinions served from CDN

8.3 Cost Scaling

Major cost drivers and their scaling characteristics:

• LLM API costs: scale linearly with volume; ~$8/analysis at current pricing

• Infrastructure: scales sub-linearly; ~$2-3/analysis at low volume, ~$0.50/analysis at scale

• Personnel: relatively fixed up to ~$1M ARR; step changes at scale milestones

• Marketing/CAC: highly variable; depends on growth strategy

9. Key Architectural Decisions

9.1 Decisions Made

• LLM provider abstraction: Build a clean abstraction layer rather than coupling to specific providers. Rationale: LLM landscape evolves rapidly; provider lock-in is a critical risk.

• Microservices with shared DB: Logical service separation but shared database in early phases. Rationale: avoid distributed-system complexity until scale justifies it.

• Managed services first: Use managed cloud services (RDS, ElastiCache, S3) rather than self-hosted. Rationale: operational simplicity matters more than cost at early scale.

• Queue-based async processing: Use message queues for AI evaluation rather than synchronous API calls. Rationale: evaluation is long-running; users should not wait for HTTP responses.

• Event sourcing for audit: Audit log is append-only with cryptographic signing. Rationale: dispute resolution requires high auditability; legal disputes about our process need defensible records.

9.2 Open Decisions

• Aggregation engine implementation: LLM-based aggregator (initially) vs. trained classifier (longer term). Decision deferred until we have enough data to train a classifier.

• Mobile app technology: Native (iOS Swift + Android Kotlin) vs. React Native. Decision deferred until Phase 3 planning.

• Frontend framework: Next.js (current choice) vs. Remix vs. SvelteKit. Decision: Next.js for ecosystem maturity, but revisit if specific advantages emerge.

• Self-hosted models: Whether to add self-hosted models for cost control. Decision deferred; current API costs are acceptable, self-hosting adds complexity.

9.3 Rejected Alternatives

• Single LLM provider: Rejected. Vendor lock-in is critical risk. Multi-model approach is also a core product differentiator.

• Synchronous evaluation: Rejected. Multi-model evaluation takes minutes to hours; cannot be synchronous HTTP.

• Self-hosted infrastructure: Rejected for now. Operational burden too high relative to scale.

• Blockchain for audit trail: Rejected. Audit requirements are met by cryptographically signed append-only logs; blockchain adds complexity without proportionate benefit.

• Custom-trained model for evaluation: Rejected for V1. Current frontier LLMs perform adequately; training would require substantial data and expertise we don't yet have.

10. Implementation Roadmap

10.1 Foundation (Months 1-2)

• Cloud accounts and infrastructure setup

• CI/CD pipeline operational

• Identity service with basic authentication

• PostgreSQL schema for core entities

• LLM provider abstraction layer with 2 providers

• Basic web app with authentication flow

10.2 Core Flow (Months 2-4)

• Dispute creation and invitation flow

• Brief preparation with conversational LLM

• Evaluator dispatcher with 3 providers

• Basic aggregation engine

• Opinion generation and delivery

• Payment integration (Stripe)

10.3 Polish (Months 4-6)

• Add 2 more evaluator providers (reach 5 total)

• Aggregation engine refinement

• Mobile-responsive web design

• Document upload and OCR

• Notification service

• Production monitoring and alerting

10.4 Hardening (Months 6-9)

• Security audit and penetration testing

• Load testing and performance optimization

• Disaster recovery procedures

• Compliance review (GDPR, CCPA)

• SOC 2 preparation

10.5 Scale (Months 9-12+)

• Multi-region deployment

• Native mobile apps

• Advanced analytics and dashboards

• API for B2B partners





































11. Appendices

11.1 Technology Stack Summary

Layer

Primary Choice

Alternatives Considered

Frontend

Next.js + React + TypeScript

Remix, SvelteKit, Vue/Nuxt

Backend services

Node.js (TypeScript) + Express/Fastify

Go, Python (FastAPI), Rust

Database

PostgreSQL 16+

MySQL, CockroachDB

Cache/Sessions

Redis

Memcached, DynamoDB

Object storage

AWS S3

GCS, Azure Blob, Cloudflare R2

Message queue

AWS SQS

RabbitMQ, Kafka, Redis Streams

Auth

Clerk or Auth0

Cognito, Supabase Auth, custom

Payments

Stripe

Paddle, Lemon Squeezy

Email

SendGrid or AWS SES

Postmark, Mailgun

Monitoring

Datadog or Grafana Cloud

New Relic, Honeycomb

Error tracking

Sentry

Rollbar, Bugsnag



11.2 LLM Provider Comparison

Provider

Strengths

Weaknesses

Role in System

Anthropic Claude

Strong reasoning, careful with uncertainty, good with legal content

Higher cost, smaller deployment footprint

Primary evaluator + aggregator

OpenAI GPT-4+

Strong general capability, broad knowledge, mature API

Variable on legal precision; data retention concerns historically

Evaluator

Google Gemini

Different training data, competitive performance, EU data residency

Less mature API, occasional format inconsistency

Evaluator

Llama-based

Architectural diversity, lower cost, open-source backing

Quality varies by fine-tune, requires careful prompt engineering

Evaluator (diversity)

Mistral

European provider, strong on European legal contexts, competitive performance

Smaller ecosystem, less mature tooling

Evaluator (EU diversity)



11.3 Glossary

• Evaluator: An LLM that analyzes briefs and produces an assessment

• Aggregator: The LLM (or future trained model) that synthesizes multiple evaluator outputs

• Brief: A party's written position in a dispute

• Opinion: The final synthesized analysis delivered to both parties

• Provider: An external LLM service (Anthropic, OpenAI, etc.)

• Provider abstraction: The software layer that isolates business logic from provider-specific implementation

• Inter-evaluator agreement: Statistical measure of how much different evaluators agreed on a given dispute

11.4 Document History

• v0.1 (May 2026): Initial architecture draft based on PRD v0.1



End of Document

