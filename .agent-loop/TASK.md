STATUS: READY

## Goal
Continue the approved Kfz Funnel on the existing `agent/issue-18` branch and existing Draft PR #19. Gate 2 (secure website intake into AgenturOS) has passed CI + independent review. Build the next coherent browser-visible slice: a real local Kfz landing page for Allianz Kusnezov / Lengerich that sends a valid inquiry through the already implemented Kfz intake endpoint into the AgenturOS Inbox.

Expected visible flow:
`visitor opens local Kfz page -> understands offer -> enters contact + vehicle/inquiry data -> gives required consent -> submits -> sees clear success/failure state -> existing /api/inbound/kfz path receives the inquiry`

This is a functional conversion page, not final ad-campaign polish. Keep WhatsApp/Meta onboarding paused. Do not merge, deploy, change domains, apply DB migrations, spend money, or touch production data.

## Acceptance criteria
- Continue on existing `agent/issue-18` and update existing Draft PR #19; do not open a second PR.
- Add one public browser page for the Kfz funnel, suitable for later use under `kfz.artkus.de` or an equivalent routed page, without changing DNS/domain/Vercel settings now.
- The page must be clearly regional: Allianz Kusnezov, Lengerich and nearby area. Do not make unsupported price promises or claim a cheapest-price guarantee.
- Keep text short and conversion-oriented: clear headline, trust/local section, simple benefits, one primary form, clear privacy/consent wording, and contact fallback.
- Form must use the existing Gate-2 Kfz intake contract/API rather than inventing a second lead pipeline.
- Collect only fields already supported or safely optional in the current contract. Reuse current normalization/validation where appropriate.
- Preserve international phone numbers including leading `+`.
- Generate/use `submissionId` client-side where appropriate so an accidental double-submit is safe; do not expose PII in URLs/logs.
- Disable or visibly lock the submit action while a request is in flight; prevent accidental duplicate clicks.
- Show understandable success state and retryable technical error state. Never claim a lead was saved when the endpoint failed.
- Do not display AI-generated tariff/pricing claims. AI inbound analysis remains proposal-only after ingestion.
- Add accessible labels, keyboard-usable controls and reasonable mobile layout. Functional/clean is enough; no expensive visual redesign.
- Add page metadata/SEO basics for local Kfz intent without keyword stuffing.
- Add focused deterministic tests for form payload mapping, consent, duplicate-submit protection and success/failure handling where practical.
- Preserve existing inbound email/WhatsApp behavior and existing AgenturOS dashboard paths.
- `npm run test:inbound` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run build` passes.
- Independent production review must pass.
- Update existing Draft PR #19 with exact check results.

## Allowed paths
- `src/app/**`
- `src/components/**`
- `src/features/inbound/**`
- `src/features/ai-inbound/**`
- `src/lib/**`
- `src/styles/**`
- `src/config/**`
- `tests/**`
- `docs/**`
- `.agent-loop/TASK.md`
- `.env.example`
- `package.json`

## Out of scope
- No merge or auto-merge.
- No deployment, Vercel/domain/DNS changes.
- Do not apply any Supabase migration.
- No Meta campaign, Pixel, CAPI or advertising spend.
- No WhatsApp onboarding/outbound automation.
- No customer-facing AI messages, tariff recommendations or automatic tasks/cases.
- No new CRM/lead subsystem; use the existing Inbox/intake pipeline.
- No real customer data or secrets.
- No broad AgenturOS redesign unrelated to the funnel.
- No fake testimonials, fake customer counts, fake savings or unsupported Allianz pricing claims.

