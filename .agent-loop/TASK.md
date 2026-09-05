STATUS: READY

## Goal

Create the first safe AI-assistance foundation for AgenturOS inbound information. An inbound item must be analyzable into a structured, provider-neutral suggestion that answers:

- What does the customer want?
- Is it service, claim, new business, or unclear?
- Which insurance/product topic is involved?
- How urgent is it?
- Which important information appears to be missing?
- Is there recognizable purchase intent?
- Should it be linked to an existing case, or is a new case only suggested?
- Which task could be created?
- What reply could be drafted?
- Must a human take over immediately?

The result is advisory only. Humans remain responsible for professional decisions.

## Current problem

AgenturOS already has provider-neutral inbound normalization, email inbound, prepared WhatsApp inbound, inbox items, files, cases, and tasks. It currently lacks one explicit, reusable analysis contract between inbound intake and later AI/model integrations.

Do not add business decisions to inbound adapters or intake. The analysis layer must be a separate downstream module.

## Known evidence

- GitHub source of truth: master at e1910df0224cfbb31a6a6421a2717b9ad432abb1 when this task was created.
- Product principle: Alles beginnt mit einer Information.
- Architecture: Adapter = translation, Intake = processing, Inbox = work.
- AI principle: AI proposes and assists; humans decide.
- Future channels include email, WhatsApp, website forms, Meta leads, voice notes, and documents.
- The first future acquisition use case is a Kfz lead containing message text, campaign/source metadata, Fahrzeugschein, and possibly the current contribution invoice.

## Acceptance criteria

1. Add a provider-neutral inbound analysis domain module with explicit TypeScript input and output types.
2. The structured output includes at least:
   - concise summary
   - intent: service | claim | new_business | unclear
   - product/topic
   - urgency: low | normal | high | immediate
   - missing information list
   - purchase intent: none | possible | strong | unclear
   - suggested case action: none | find_existing | suggest_new
   - suggested task with title, reason, and priority, or null
   - suggested reply draft, or null
   - human review required boolean
   - human review reason
   - confidence value with a documented range
3. Add runtime validation for untrusted analysis output using an existing repository dependency where possible. Do not add a dependency unless it is genuinely required.
4. Add a provider interface so a later LLM implementation can be plugged in without coupling the domain to OpenAI, Anthropic, Meta, or another provider.
5. Add a deterministic safe fallback. Invalid, incomplete, or failed provider output must never create an action; it must return humanReviewRequired=true with a useful reason.
6. Add a prompt/instruction builder that clearly states:
   - return structured data only
   - do not invent customer facts
   - do not make coverage, legal, tariff, or contract decisions
   - do not claim a case/contact match without supplied evidence
   - escalate uncertainty to human review
7. Add focused automated tests for at least:
   - Kfz new-business price-check request with Fahrzeugschein mentioned
   - motor claim with an urgent safety/towing signal
   - routine service request such as address change
   - ambiguous message
   - malformed provider response and provider failure
8. Document the boundary and the next integration step in one concise architecture document.
9. All repository baseline checks pass:
   - npm run test:inbound
   - npx tsc --noEmit
   - npm run lint
   - npm run build
10. Open a draft PR only. Do not merge or deploy.

## Allowed paths

- src/features/ai/**
- src/lib/ai/**
- tests/ai/**
- tests/inbound/**
- docs/ai-inbound-analysis.md
- package.json
- package-lock.json

## Out of scope

- No UI changes.
- No database migration or production data access.
- No automatic creation or mutation of cases, tasks, contacts, leads, or inbox items.
- No automatic customer replies.
- No OpenAI, Anthropic, Meta, or other paid/external API call.
- No secrets or environment-variable changes.
- No WhatsApp activation.
- No changes to inbound adapters, webhook routes, domain configuration, deployment, or authentication.
- No CRM/customer master-data feature.
- No lead dashboard, campaign analytics, SEO, landing page, or Kfz funnel implementation in this task.
- No merge, auto-merge, or production deployment.

## Guardrails

- Read AGENTS.md before implementation.
- Keep the module downstream of normalized intake.
- Prefer pure functions and explicit contracts.
- Treat all provider/model output as untrusted.
- Suggestions must be inspectable and reversible.
- Human review is the default whenever confidence or evidence is insufficient.
- German customer text must work; architecture must not hardcode one inbound channel.
- Do not expose customer data to an external provider in this task.

## Human blockers

None expected. If existing repository structures make the allowed paths insufficient, stop and report the exact required path instead of editing outside scope.

