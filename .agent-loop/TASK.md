STATUS: READY

## Goal
Repair the existing Draft PR #19 for Gate 2 of the approved Kfz Funnel Masterplan. Keep the current secure, provider-neutral Kfz lead intake, and close only the two concrete production-review gaps: database compatibility for the website channel and correct fallback replay protection.

Expected flow:
`kfz.artkus.de form -> authenticated/abuse-resistant intake endpoint -> normalized inbound item -> AgenturOS Inbox`

Owner approval for the small additive database migration was explicitly recorded on Draft PR #19. Implement the migration file and its tests only; do not apply it to any database and do not deploy.

WhatsApp/Meta onboarding remains paused. PR #14 may remain open and must not block this repair.

## Acceptance criteria
- Continue on the existing `agent/issue-18` branch and update Draft PR #19; do not open a second PR.
- Preserve the already implemented intake behavior and keep this repair narrowly limited to the review findings.
- Add an additive Supabase migration that updates the relevant `inbox_items` channel/source constraints so `website` is accepted without removing or weakening existing allowed values.
- Do not execute the migration against local, preview, staging, or production databases.
- Add a deterministic database-contract regression test that fails if the persisted Kfz intake shape (`channel='website'`, `source='website'`) is incompatible with the checked-in schema/migration contract. Memory-store-only coverage is insufficient.
- Correct fallback replay protection when `submissionId` is absent: identical replay of the same normalized inquiry must deduplicate, while a later distinct inquiry from the same person must create a separate Inbox item.
- The fallback idempotency key must incorporate stable normalized inquiry-specific data (including inquiry content and consent timestamp/version as appropriate), must not expose PII, and must remain deterministic.
- Add deterministic tests proving:
  1. identical replay without `submissionId` creates no duplicate
  2. same identity/contact with a different inquiry creates a new item
  3. explicit `submissionId` replay still deduplicates
  4. the website channel/source values are accepted by the checked-in database contract
- Preserve a leading `+` when normalizing international phone numbers.
- Preserve existing email and WhatsApp inbound behavior.
- Do not log customer payloads, documents, tokens, signatures, consent text, or idempotency inputs.
- Public validation stays separate from domain normalization.
- Unknown values remain unknown.
- AI analysis remains proposal-only; no customer-facing AI action.
- `npm run test:inbound` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run build` passes.
- The independent production review must pass.
- Report exact results in the existing Draft PR #19.
- Avoid overlapping changes with PR #14; if unavoidable, stop and report the blocker.

## Allowed paths
- `src/app/api/inbound/**`
- `src/features/inbound/**`
- `src/features/ai-inbound/**`
- `src/lib/**`
- `tests/**`
- `docs/**`
- `supabase/migrations/**`
- `.agent-loop/TASK.md` (workflow task snapshot only)
- `.env.example`
- `package.json`

## Out of scope
- No public landing-page visual design or upload UI.
- No new standalone CRM/lead module.
- No Meta campaign, Pixel or CAPI.
- No WhatsApp onboarding or outbound automation.
- No production secrets, real customer documents, or production data changes.
- No automatic customer message, task, case creation, tariff statement, or contractual action.
- Do not apply any migration.
- No Vercel/domain change or deployment.
- No merge or auto-merge.


## Final review correction
- Keep this correction test-only unless the corrected assertion exposes a real product defect.
- In `src/features/inbound/kfz/kfz-intake.smoke.test.ts` test 9c, keep identity/contact, `consentVersion`, and `consentTimestamp` identical across both submissions.
- Change only inquiry-specific content (for example `inquiryReason` or `contextNotes`).
- Prove that the same person submitting genuinely different inquiry content creates a second Inbox item.
- Preserve the separate identical-replay and explicit-`submissionId` tests.
- Rerun `npm run test:inbound`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, CI, and independent review.

