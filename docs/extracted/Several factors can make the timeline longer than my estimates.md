# Several factors can make the timeline longer than my estimates

Several factors can make the timeline longer than my estimates:

LLM provider integration headaches. Each provider has subtle differences in API formats, rate limits, error responses, content moderation, and edge cases. Integrating 3-5 providers takes longer than integrating one — not because the code is hard, but because handling the variations takes real testing time.

Prompt iteration cycles. Getting evaluation prompts to produce consistent, useful, calibrated outputs is genuinely difficult. You can plan for 2 weeks; budget 4 weeks. The first version will produce outputs that look reasonable but have systematic issues you'll only discover by examining many examples.

Legal review delays. Getting qualified counsel to review your UPL positioning, disclaimers, terms of service, and privacy policy takes longer than expected. Lawyers respond on their schedule, not yours. Build in 2-3 weeks of slack for legal review.

Payment compliance. Stripe integration is straightforward, but if you handle any data that triggers compliance requirements (it shouldn't for MeritView, but worth verifying), additional work is required.

Early user feedback iterations. Your first 10 users will identify problems you didn't anticipate. Some of these will require code changes before you can broaden the launch. Budget 2-3 weeks for the gap between "MVP technically works" and "MVP works well enough to scale beyond friends and family."

Realistic timeline with risk buffer

For a solo developer working full-time with vibe coding tools:

Optimistic: 10 weeks (everything goes well, you make smart scope decisions, prompts work on first try)

Realistic: 14 weeks (some bumps, prompt iteration takes longer than expected, one unexpected technical issue)

Pessimistic: 20 weeks (multiple bumps, legal delays, need to redesign one major component, slow start)

For a team of 2 (one founder doing product/business, one engineer doing development):

Optimistic: 8 weeks

Realistic: 12 weeks

Pessimistic: 16 weeks

For a small team of 3-4 (founder + 2 engineers + part-time designer):

Optimistic: 6 weeks

Realistic: 10 weeks

Pessimistic: 14 weeks

The team scaling helps less than you might expect because much of the bottleneck isn't coding speed — it's product decisions, prompt iteration, user feedback cycles, and legal review.

What I'd actually recommend

If you're seriously planning to build this MVP, here's the practical sequence I'd suggest:

Before you start coding (Week 0)

Validate the core thesis with manual testing. Before building anything, take 5-10 real disputes from your network, manually run them through 3-5 LLMs using the evaluation prompt we designed, and synthesize the outputs yourself. This takes 1 week and tells you:

Do the LLM outputs actually contain useful analysis?

How consistent are they across models?

What problems emerge that the spec doesn't anticipate?

Is the value proposition real?

If this manual test doesn't produce useful results, no amount of MVP-building will fix that. If it does produce useful results, you've validated the core thesis and can build the MVP with confidence.

Get rough legal guidance. Spend 2-3 hours with a tech-focused lawyer (or even a free consultation) confirming your UPL positioning is sound. This costs $500-$1,500 and protects you from building something legally problematic.

Identify your first 20 users. Make a list of specific people who have had small disputes recently and might use the service. If you can't name 20 specific people, your MVP doesn't have a clear initial market.

Coding phase (Weeks 1-12)

Start with the simplest possible flow. Single user creates dispute, manually submits both briefs (their own and pretend they're the other side), 3 LLMs evaluate, you manually aggregate, opinion displayed. This is week 1-3. It's not even a usable product but it validates the technical path.

Then add the counterparty flow. Real two-party dispute creation, invitation, brief preparation, both-submit gate. Weeks 4-7.

Then add payments and polish. Weeks 8-10.

Then test with real users. Weeks 11-12.

Post-MVP (Weeks 13+)

Real user feedback drives next phase. Don't build the full Phase 2 spec until you've learned what actually matters to users. Your first 20 users will tell you which features to build next.

A specific honest assessment

If you're asking me whether to commit to building this MVP, here's my honest take:

The product is buildable. With vibe coding tools, an experienced developer (or a determined non-developer founder with AI assistance) can build a credible MVP in 3-4 months.

The technical risk is moderate, not high. Multi-LLM orchestration is the most complex part, but it's not novel — it's pattern-matching and integration work.

The product risk is higher than the technical risk. The harder questions are: will the AI outputs actually be good enough? Will users trust them? Will users pay? Will regulators allow it?

Building the MVP is the right way to answer those questions. Spending 3-4 months and $20-50K to validate is cheaper than spending 12+ months and $200K+ to build something with all the polish.

The vibe coding angle is real but oversold in some marketing. It genuinely speeds up the coding parts but doesn't eliminate the product, design, prompt engineering, legal, and user research work. Maybe 40-50% speedup on total project time, not 5-10x.

Specific actions if you want to start

If you decide to proceed:

Week 1: Validate manually. Run 5-10 real disputes through the workflow by hand. Spend $50-100 in LLM API costs. Document what works and what doesn't.

Week 2: Set up infrastructure. Vercel account, Supabase account, Stripe test account, Anthropic/OpenAI/Google API keys, Claude Code or Cursor subscription. Total cost: ~$200/month while building.

Week 3-12: Build using the specs we've created. Reference the API spec, database schema, and architecture documents as the source of truth. Use vibe coding for everything that's standard; manually engineer the LLM orchestration and prompts.

Week 13-14: Test with first users. Use your list of 20 candidates. Don't market broadly until you've validated with these.

Week 15+: Iterate based on what you learn. Either commit to building toward Phase 2 (if validation succeeds) or pivot/abandon (if it doesn't).

On the "vibe coding" question specifically

I want to be direct about something: "vibe coding" is a useful capability but it's also a marketing term that sometimes implies more magic than reality. The honest version is:

AI coding tools have meaningfully changed software development. A developer who knows what they're doing can build certain things 2-5x faster than before. This is real and significant.

They don't replace engineering judgment. Knowing what to build, how to architect it, where the security boundaries are, what edge cases matter — these are human judgments that AI tools support but don't replace.

They work best with detailed specifications. The documents we've built (PRD, architecture, API spec, schema) are exactly the kind of detailed specifications that make AI coding tools highly productive. You'd be much less productive starting from "build me a dispute resolution service" than from the documents we have.

They have failure modes worth knowing. AI tools can confidently produce code that doesn't work, that has subtle bugs, that handles the happy path but fails on edge cases, that has security vulnerabilities, that's inefficient. A developer who blindly accepts AI output without review will produce worse code than one who reviews carefully.

The "vibe coder with no engineering experience" path is harder than it looks. A non-developer can build prototypes with AI assistance, but production systems (real user data, payments, AI integrations, privacy concerns) need engineering judgment that's hard to develop in months. If you don't have engineering background, partnering with a developer is likely faster than learning to vibe code production systems yourself.

Bottom line

Realistic MVP timeline with vibe coding: 12-14 weeks (3-3.5 months) for a solo developer working full-time, or 8-12 weeks for a small team.

This produces a basic but functional product that can validate the core thesis with paying users. It's not a polished product — it's a minimum viable test of whether people will pay for AI dispute analysis.

The bottleneck isn't coding speed. The bottlenecks are prompt engineering quality, legal validation, user acquisition, and learning what actually works. Vibe coding helps with the coding parts but doesn't shorten the other parts.

If you start tomorrow and work full-time on this, you could plausibly have first paying users by August-September 2026, with real feedback on whether the business has legs by Q4 2026.

That's a realistic timeline. Anyone telling you 4-6 weeks for an MVP of this complexity is either underestimating the work or planning to ship something that won't survive contact with real users.



