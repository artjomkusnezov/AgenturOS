STATUS: READY

## Goal
Build Gate 2 of the approved Kfz Funnel Masterplan: a secure, provider-neutral Kfz lead intake that sends landing-page inquiries into the existing AgenturOS inbound pipeline.

Expected flow:
`kfz.artkus.de form -> authenticated/abuse-resistant intake endpoint -> normalized inbound item -> AgenturOS Inbox`

WhatsApp/Meta onboarding is paused because the business-registration document is not currently available. PR #14 may remain open and must not block this task.

## Acceptance criteria
- Implement the backend/intake foundation and deterministic tests only; do not build the public landing-page design.
- Reuse the existing normalized inbound domain and inbox creation path.
- Accept full name, postal code/city, at least one usable contact method (phone or email), preferred channel, inquiry reason, optional vehicle/context fields, optional language (de/ru/en), explicit inquiry-processing consent, consent timestamp/version, source/campaign/UTM attribution, server receive time, and an optional upload-metadata seam.
- Keep public validation separate from domain normalization.
- Use a provider-neutral acquisition/website source; do not create a parallel Kfz CRM.
- Strictly validate schemas and size limits; reject absent/false consent, absent contact methods, malformed contact/PLZ data, and oversized input.
- Normalize/sanitize source and UTM values.
- Do not log customer payloads, documents, tokens, signatures, or consent text.
- Deduplicate or replay-protect repeated submissions.
- Preserve evidence for handling the concrete inquiry separately from future marketing consent.
- Rate-limit or document a clear integration seam using existing conventions.
- Unknown values remain unknown.
- AI analysis remains proposal-only through the existing safe seam; no customer-facing AI action.
- If safe document storage cannot reuse an existing path without architectural change, persist metadata only and document the follow-up.
- Document retention/deletion as a follow-up if it is not already supported.
- Add deterministic tests for:
  1. valid phone inquiry
  2. valid email inquiry
  3. valid inquiry with both contact methods
  4. missing both contact methods is rejected
  5. false/missing consent is rejected
  6. malformed email/phone/PLZ fails safely
  7. oversized fields/payload are rejected
  8. hostile HTML/script content is stored/displayed safely
  9. duplicate/replayed submission creates no duplicate Inbox item
  10. UTM/source attribution is normalized and retained
- Preserve a leading `+` when normalizing international phone numbers; `+491701234567` must remain `+491701234567`.
- Preserve existing email and WhatsApp inbound behavior.
- Deliver the public intake route/service, Kfz schema and normalization adapter, consent evidence/versioning contract, source/UTM mapping, fixtures/tests, concise local-test documentation, and exact next landing-page integration point.
- `npm run test:inbound` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run build` passes.
- Report exact results in a Draft PR.
- Avoid overlapping changes with PR #14; if unavoidable, stop and report the blocker.

## Allowed paths
- `src/app/api/inbound/**`
- `src/features/inbound/**`
- `src/features/ai-inbound/**`
- `src/lib/**`
- `tests/**`
- `docs/**`
- `.env.example`
- `package.json`

## Out of scope
- No public landing-page visual design.
- No new standalone CRM/lead module.
- No Meta campaign, Pixel or CAPI.
- No WhatsApp outbound automation.
- No production secrets, real customer documents, or production data changes.
- No automatic customer message, task, case creation, tariff statement, or contractual action.
- No production migration unless separately approved.
- No Vercel/domain change or deployment.
- No automatic merge.

