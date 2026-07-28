# MeritView_PRD

MeritView

Product Requirements Document



Version 0.1 (Draft)

May 2026

AI-Powered Dispute Analysis Service

Confidential — Internal Planning Document



1. Executive Summary

MeritView is an online service that delivers rigorous, AI-powered analysis of disputes at a fraction of traditional legal costs. The service enables parties in disagreement to receive a structured, multi-model assessment of their relative positions within hours rather than the weeks or months required by traditional dispute resolution mechanisms.

This PRD defines the product requirements for the initial version of MeritView, scoped to deliver a minimum viable product within 6 months and a commercially launched service within 12 months. The document is organized to guide product development, engineering, design, legal review, and go-to-market planning.

1.1 Product Vision

Our vision is a future where every dispute — whether between neighbors, business partners, family members, or strangers — can be evaluated quickly, fairly, and affordably. By combining the analytical power of multiple AI systems with rigorous structured assessment, we give parties the clarity they need to resolve disagreements on the merits of their arguments, not the depth of their pockets.

1.2 Strategic Positioning

• Category: AI-powered decision support (not arbitration)

• Target users: Individuals and small businesses facing disputes that do not justify traditional legal cost

• Core value: Affordable, fast, structured analysis of dispute merits

• Initial pricing: $99 per analysis, with premium tiers for expedited service and complex cases

• Differentiation: Multi-model AI aggregation, user choice of LLM for brief preparation, transparent methodology, no legal authority claims

2. Problem Statement

2.1 The Access Gap

Most disputes in everyday life never receive professional analysis because the legal system is too expensive and slow for the matters that affect ordinary people. A $5,000 contract dispute does not justify $5,000 in legal fees to understand its merits. A neighbor dispute over a fence, a partnership disagreement about responsibilities, a consumer complaint about service quality — these matters affect people deeply but rarely receive structured evaluation.

The result is a system where access to thoughtful dispute analysis is functionally gated by wealth. Parties with resources hire lawyers, conduct discovery, and receive informed advice. Parties without resources guess at their position, settle blindly, or escalate conflicts that could have been resolved with clarity.

2.2 User Pain Points

• Cost barrier: Traditional legal consultation costs $300-$800 per hour, making analysis of small disputes economically irrational

• Time barrier: Even informal legal review takes days or weeks; formal arbitration takes months

• Articulation barrier: Users without legal training struggle to organize their position into a coherent brief

• Information asymmetry: Parties cannot evaluate their relative positions without expert analysis

• Trust barrier: Single attorney opinions feel arbitrary; users want multiple perspectives

• Privacy concerns: Many disputes involve sensitive matters parties prefer to keep private

2.3 Market Opportunity

Several macro trends create the opening for an AI-powered dispute analysis service. The cost of high-quality language model inference has dropped dramatically and continues to decline. Modern LLMs demonstrate credible performance on argument evaluation tasks. Consumer comfort with AI-driven services has grown substantially. The legal services market has been resistant to disruption but small-dollar disputes represent a large underserved segment that traditional legal services have explicitly chosen not to serve.

3. Target Users and Use Cases

3.1 Primary User Personas

Persona 1: Small Business Owner with Contract Dispute

• Profile: Owner of a service business (consulting, contracting, professional services) with annual revenue $100K-$2M

• Situation: Client refuses to pay invoice citing alleged scope or quality issues; dispute is $3K-$25K

• Need: Understand whether to pursue collection, accept partial payment, or write off

• Why MeritView: Hiring a lawyer for $5K is irrational for a $10K dispute; small claims court is slow and uncertain

Persona 2: Individual in Partnership/Co-founder Conflict

• Profile: Member or co-founder of a small business with one or more partners

• Situation: Disagreement about contributions, equity, decision rights, or exit terms

• Need: Objective third-party view before escalating or accepting an unfavorable resolution

• Why MeritView: Internal disputes need neutral analysis but parties often cannot afford or trust formal mediation

Persona 3: Tenant or Consumer with Service Provider Dispute

• Profile: Individual consumer or tenant facing a dispute with a landlord, contractor, or service provider

• Situation: Disagreement over $500-$10K in damages, services, or refunds

• Need: Understand whether the complaint has merit and what arguments are strongest

• Why MeritView: Cost-effective alternative to legal aid (often overwhelmed) or paid consultation (often unaffordable)

Persona 4: Individual in Personal Disagreement

• Profile: Adult facing a dispute with family member, neighbor, friend, or acquaintance

• Situation: Loan repayment, shared expenses, property boundary, or other personal matter

• Need: Structured third-party view to inform negotiation

• Why MeritView: These disputes rarely justify legal action but benefit from neutral analysis

3.2 Initial Use Case Focus

Version 1 will focus on three specific dispute categories where AI analysis is most reliable and the user need is clearest:

• Contract interpretation disputes: Disagreements about what a written contract means and whether it was breached

• Small claims pre-filing assessment: Evaluation of whether a contemplated small claims case has merit

• Partnership and co-founder disagreements: Disputes between business partners about contributions, decisions, or terms

Additional categories will be added based on demand and validation. Categories explicitly out of scope for V1 include: criminal matters, child custody disputes, immigration matters, complex commercial litigation, regulatory enforcement, and matters requiring deep technical or scientific expertise.

4. Product Requirements

4.1 Core User Flow

The user flow consists of six steps, each designed to be completable in under 30 minutes of active user time:

• Step 1 — Dispute initiation: User creates account, describes dispute at high level, identifies counterparty, selects dispute category

• Step 2 — Counterparty invitation: System generates invitation link for counterparty; counterparty creates account or proceeds as guest

• Step 3 — Brief preparation: Each party selects an LLM assistant (Claude, GPT, Gemini, or others) to help articulate their position; AI assists with brief structure, clarity, and completeness; user reviews and submits final brief

• Step 4 — Analysis: System submits both briefs to multiple evaluating LLMs; each evaluator produces structured analysis; aggregation layer synthesizes results

• Step 5 — Opinion delivery: Both parties receive the same opinion document; opinion identifies stronger arguments, weaknesses, and assessment of relative merits

• Step 6 — Post-opinion actions: Parties may negotiate based on the opinion, settle, request expanded analysis, or escalate to traditional legal processes

4.2 Functional Requirements

FR-1: User Account and Authentication

• Email and password authentication with optional two-factor

• Social login options (Google, Apple) for convenience

• Guest mode for counterparties who do not want to create accounts

• Password recovery and account management

• Privacy controls for dispute visibility and data retention

FR-2: Dispute Creation and Setup

• Structured dispute initiation form with category selection

• Counterparty invitation via email or shareable link

• Document upload capability for supporting evidence (contracts, photos, communications)

• Dispute summary visible to both parties before brief preparation

• Optional dispute amount and stakes specification

FR-3: AI-Assisted Brief Preparation

• User selects preferred LLM from supported list (Claude, GPT, Gemini, others as added)

• AI assistant guides user through structured brief preparation

• Standard brief template: facts, position, supporting arguments, desired outcome

• Real-time suggestions for clarity, completeness, and structure

• User retains full editorial control; AI assists but does not write briefs autonomously

• Final brief preview and explicit submit action required from user

• Word count guidance (suggested 500-2000 words; hard cap at 5000)

FR-4: Multi-Model Evaluation

• System submits both briefs to multiple evaluating LLMs in parallel

• Minimum 3 evaluators per dispute; target 5 for production

• Evaluators include different model families to ensure diversity (e.g., Claude, GPT, Gemini, Llama-based)

• Each evaluator receives identical structured prompts requesting specific analyses

• Evaluators provide: argument strength assessment, identification of weaknesses, factual claims flagged for verification, overall position assessment

• Calibration layer normalizes scores across models with known biases

FR-5: Opinion Generation

• Aggregation engine synthesizes individual evaluator outputs

• Opinion document follows standard structure: summary, key issues, party A position analysis, party B position analysis, comparative assessment, suggested considerations

• Opinion explicitly identifies areas of evaluator agreement and disagreement

• Opinion includes confidence indicators for major conclusions

• Opinion does not render binding judgment; explicitly framed as analysis for decision support

• Standard disclaimers prominently displayed: not legal advice, AI-generated, not binding

FR-6: Delivery and Post-Opinion Workflow

• Both parties notified when opinion is ready

• Both parties receive identical opinion document

• Download as PDF for portable use

• Optional follow-up actions: request expanded analysis (premium), accept opinion as basis for settlement, schedule mediator referral (partner network)

• Opinion retained in user account for 12 months minimum; permanent deletion option

4.3 Non-Functional Requirements

Performance

• Brief preparation: AI responses within 5 seconds typical, 15 seconds maximum

• Opinion generation: complete analysis delivered within 4 hours of both briefs submitted; target 1 hour

• System uptime: 99.5% availability target

• Concurrent users: support 1000 simultaneous active users at launch, scale to 10,000+

Security and Privacy

• End-to-end encryption of dispute content

• Data isolation: party A cannot see party B's brief preparation; system reveals only the final submitted briefs

• LLM API calls: ensure no training data leakage; use enterprise/no-training APIs where available

• PII handling: minimize collection; allow pseudonymous use where possible

• Data retention: configurable retention with default 12-month deletion

• Compliance: GDPR-compliant by design; CCPA-compliant for California users

• Right to be forgotten: complete deletion within 30 days of request

Legal and Regulatory

• Clear positioning as decision support, not legal advice or arbitration

• Prominent disclaimers on all opinions and throughout the user flow

• Terms of service developed by qualified counsel

• Unauthorized practice of law (UPL) review for each target jurisdiction

• Mandatory acknowledgment of disclaimers before opinion delivery

• No fee structure that creates financial interest in outcomes (no contingency, no success fees)

Quality and Reliability

• Hallucination mitigation: evaluators instructed to flag uncertain factual claims rather than assert them

• Verification: any cited legal authorities must be verifiable; system flags potentially hallucinated citations

• Calibration: ongoing comparison of AI assessments against human expert review on sample disputes

• User feedback collection: post-opinion surveys to identify systematic issues

• Adversarial testing: regular red-team exercises to identify gaming and manipulation

5. AI Architecture and Methodology

5.1 Multi-Model Approach

MeritView's core differentiation is the use of multiple independent AI systems to evaluate each dispute. The multi-model approach addresses several limitations of single-model evaluation:

• Bias reduction: Different models have different training data and biases; aggregation reduces systematic errors

• Robustness: Single models occasionally produce poor outputs; multiple models provide redundancy

• Confidence calibration: Agreement across models signals high-confidence conclusions; disagreement signals uncertainty

• Transparency: Multi-model analysis can show users where evaluators agreed and disagreed

5.2 Evaluator Selection

Production system uses 5 evaluating models drawn from at least 3 different model families. Initial production roster includes:

• Claude (Anthropic) — strong reasoning, careful with legal facts

• GPT-4 or successor (OpenAI) — broad knowledge, well-calibrated

• Gemini (Google) — different training corpus, useful diversity

• Llama-based open model — provides architectural diversity

• Mistral or similar — additional diversity from European model families

Models will be evaluated quarterly and rotated based on demonstrated performance. New models added when they pass internal benchmarks.

5.3 Prompt Engineering

Standard evaluation prompts are versioned, tested, and consistent across evaluators. Each evaluator receives:

• The full text of both briefs (anonymized where possible)

• Structured request for specific analyses: argument identification, strength assessment, weakness identification, factual claim flagging

• Explicit instruction to flag uncertain claims rather than hallucinate confident assertions

• Standard output format for downstream aggregation

Prompts will be subject to ongoing refinement based on quality metrics and user feedback.

5.4 Aggregation and Synthesis

Aggregation is performed by a dedicated synthesis layer (initially another LLM call, eventually a more sophisticated pipeline). Aggregation produces:

• Summary of areas where evaluators agreed

• Identification of areas where evaluators disagreed (with explanation of the disagreement)

• Synthesized assessment of each party's strongest and weakest arguments

• Overall confidence-weighted assessment of relative position strength

• Suggested questions or considerations for each party

5.5 Calibration and Quality Assurance

System quality is measured continuously through multiple mechanisms:

• Inter-evaluator agreement: Measure consistency across evaluators on identical inputs

• Test set performance: Periodic evaluation against curated test disputes with known characteristics

• Human expert review: Random sample of opinions reviewed by qualified attorneys

• User satisfaction: Post-opinion surveys measuring perceived fairness and usefulness

• Outcome tracking: Where possible, track whether opinions correlate with actual dispute outcomes

6. Business Model and Pricing

6.1 Pricing Tiers

Initial pricing structure (subject to refinement based on willingness-to-pay testing):

Tier

Price

What's Included

Target User

Standard

$99

Single dispute analysis, brief preparation assistance, 5-model evaluation, 4-hour turnaround

Most users

Expedited

$199

Standard tier + 1-hour turnaround + priority queue

Time-sensitive disputes

Extended

$299

Standard tier + longer briefs (up to 10K words) + supplemental document analysis

Complex disputes

Re-analysis

$49

Re-run analysis with updated briefs or additional evidence

Follow-up needs



6.2 Unit Economics

Estimated cost per Standard tier analysis based on current LLM API pricing:

• Brief preparation assistance (one LLM, ~10K tokens combined): ~$0.50

• Multi-model evaluation (5 models × ~5K tokens): ~$2.50

• Aggregation and synthesis (~3K tokens): ~$0.30

• Infrastructure and support overhead: ~$5.00

• Total marginal cost: ~$8.30 per analysis

• Gross margin at $99: ~92%

Gross margin is high because the marginal cost of AI inference is low. Profitability at scale depends on user acquisition costs, customer support burden, and quality assurance investments.

6.3 Revenue Model Evolution

• Phase 1 (Months 1-12): Pay-per-analysis, no recurring revenue, focus on validating willingness to pay

• Phase 2 (Months 12-24): Add subscription option for repeat users (e.g., $29/month for 1 analysis + discounts on additional)

• Phase 3 (Months 24+): B2B offerings: white-label for legal aid organizations, integration with existing legal tech platforms, enterprise dispute analysis

6.4 Strategic Asset: Dispute Corpus

Over time, MeritView accumulates a substantial corpus of analyzed disputes with structured outcomes. This corpus has long-term strategic value as training data for improved models, as a research dataset for academic partnerships, and as a foundation for predictive analytics. Privacy-preserving methods (differential privacy, federated learning) will be used to enable corpus utilization without compromising user confidentiality.

7. Development Roadmap

7.1 Phase 1: MVP (Months 1-3)

• Objective: Validate core thesis with limited but functional product

• Single dispute category (contract interpretation)

• Manual brief intake (no AI-assisted preparation yet)

• 3-model evaluation (Claude, GPT, Gemini)

• Manual aggregation by team for first 50 disputes

• Web-only, desktop-first

• Pricing: $49 to encourage adoption

• Success criteria: 25 paid analyses, 70%+ user satisfaction, no major regulatory issues

7.2 Phase 2: Beta (Months 4-6)

• Objective: Automate workflow, add additional dispute categories, validate at scale

• AI-assisted brief preparation with user choice of LLM

• All three target dispute categories supported

• 5-model evaluation with automated aggregation

• Mobile-responsive web app

• Pricing: $99 standard tier

• Success criteria: 100 paid analyses per month, 80%+ user satisfaction, <2% complaint rate

7.3 Phase 3: Public Launch (Months 7-12)

• Objective: Commercial launch with full feature set

• All pricing tiers active

• Native mobile apps (iOS and Android)

• Document upload and analysis

• Mediator referral partnerships

• Quality assurance program with external attorney review

• Success criteria: 1000 paid analyses per month, 80%+ user satisfaction, positive unit economics

7.4 Phase 4: Expansion (Months 12-24)

• Objective: Scale, expand categories, develop B2B offerings

• Additional dispute categories (employment, tenant-landlord, consumer)

• Multi-language support (Spanish, then additional languages)

• International expansion (UK, EU)

• Subscription pricing for repeat users

• B2B partnerships with legal aid organizations

• API access for legal tech integrations

8. Risks and Mitigations

8.1 Regulatory Risks

• Risk: Unauthorized practice of law (UPL) claims in one or more jurisdictions

• Likelihood: Medium

• Impact: High — could force service modifications or geographic limitations

• Mitigation: Clear positioning as decision support, prominent disclaimers, qualified counsel review, monitor regulatory developments, prepare to exclude problematic jurisdictions if needed

8.2 Quality and Hallucination Risks

• Risk: AI-generated analyses contain fabricated citations or incorrect legal reasoning

• Likelihood: Medium to high without mitigation

• Impact: High — could cause user harm and reputational damage

• Mitigation: Multi-model aggregation reduces single-point hallucination, evaluators instructed to flag uncertainty, citation verification layer, ongoing human review, explicit framing of opinions as analysis not legal advice

8.3 Adversarial User Behavior

• Risk: Users game the system by writing briefs designed to score well with LLMs rather than accurately representing their positions

• Likelihood: Medium and increasing as system becomes well-known

• Impact: Medium — undermines fairness and value of analyses

• Mitigation: Prompt engineering robust to manipulation, multi-model evaluation reduces single-model exploitation, periodic red-team testing, transparent methodology, user feedback loops to identify systematic gaming

8.4 Market Acceptance Risks

• Risk: Users do not trust AI-generated dispute analysis enough to pay for it

• Likelihood: Medium

• Impact: High — affects entire business viability

• Mitigation: Free initial analyses for early users to build trust, transparency about methodology, prominent display of multi-model agreement, user testimonials and case studies, partnership with respected legal organizations

8.5 Competitive Risks

• Risk: Major legal tech players (LegalZoom, Rocket Lawyer) or AI players (OpenAI, Anthropic) launch competing services

• Likelihood: Medium to high over 12-24 months

• Impact: Medium — competition is real but market is large

• Mitigation: Speed to market, accumulated corpus advantage, brand and methodology differentiation, focus on specific user segments where general players are weak

8.6 Privacy and Data Risks

• Risk: Dispute content leaked, used for training without consent, or compromised in breach

• Likelihood: Low with proper engineering

• Impact: Very high — could destroy user trust permanently

• Mitigation: Enterprise LLM APIs with no-training guarantees, end-to-end encryption, strict data minimization, regular security audits, transparent privacy policy, breach response plan

9. Success Metrics

9.1 Product Metrics

• Time to opinion: Median time from second brief submission to opinion delivery; target <2 hours

• Completion rate: % of started disputes that complete the full flow; target >70%

• Inter-evaluator agreement: Average agreement rate across the 5 evaluating models; target 80%+

• User satisfaction: Post-opinion satisfaction score; target 4.0+/5.0

• Perceived fairness: Specific score for perceived fairness of analysis; target 4.0+/5.0

9.2 Business Metrics

• Monthly active disputes: Number of new disputes initiated per month

• Conversion rate: % of dispute initiators who reach paid analysis; target 40%+

• Customer acquisition cost: Marketing cost per paying user; target <$50 at scale

• Lifetime value: Revenue per user including repeat usage; target $200+ at maturity

• Gross margin: Revenue minus marginal costs; target 85%+

9.3 Quality and Trust Metrics

• Citation accuracy: % of cited authorities that verify as accurate; target 99%+

• Expert agreement: Agreement between AI analysis and human expert review on sample; target 80%+

• Complaint rate: % of users who file formal complaints; target <1%

• Refund rate: % of analyses requiring refund; target <2%

10. Open Questions and Decisions Needed

10.1 Product Questions

• Should counterparties be required to participate, or should single-party analysis be offered? (Single-party is faster but less fair; both-party is fairer but requires counterparty cooperation.)

• Should the system enforce time limits on counterparty response, or wait indefinitely?

• Should opinions be revisable after initial delivery if either party provides new information?

• Should the platform facilitate post-opinion negotiation or refer to external mediators?

10.2 Business Questions

• What is the actual willingness-to-pay for this service? $99 is hypothesis, not validation.

• Is there a B2B path that monetizes faster (legal aid orgs, insurance companies, HR departments)?

• Should we partner with bar associations or operate independently?

• What is the realistic customer acquisition cost in the target segments?

10.3 Legal and Regulatory Questions

• Which jurisdictions require explicit legal review before launch?

• What disclaimers are sufficient to defeat UPL claims?

• Can the service be characterized as 'consumer review' to fall under journalist protections?

• What is the proper insurance structure (E&O, cyber, general liability)?

10.4 Technical Questions

• Which LLM APIs offer the best combination of quality, cost, privacy guarantees, and reliability?

• Should we build a custom aggregation model or use existing LLMs for aggregation?

• What is the right architecture for the brief-preparation feature (chat interface vs. structured form vs. hybrid)?

• How do we handle disputes that touch multiple jurisdictions or legal systems?

11. Appendices

11.1 Glossary

• Brief: Written statement of a party's position, facts, and arguments in a dispute

• Evaluator: One of the AI models that analyzes briefs and produces an assessment

• Aggregation: The process of synthesizing multiple evaluator outputs into a single opinion

• Opinion: The final analysis document delivered to both parties

• Decision support: Information and analysis intended to inform user decisions, distinct from legal advice or binding judgment

• UPL: Unauthorized practice of law — providing legal services without a license

11.2 Related Documents

• MeritView Vision and Mission Statement

• MeritView Executive Summary

• MeritView Brand Identity Guidelines (logo and visual standards)

• Legal Review Memo (to be commissioned)

• Technical Architecture Document (to be drafted)

• Go-to-Market Plan (to be drafted)

11.3 Document History

• v0.1 (May 2026): Initial draft for internal review



End of Document

