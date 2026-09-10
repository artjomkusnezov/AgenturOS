STATUS: READY

## Goal

Prepare a single reviewable Kfz pilot release for launch in 2–3 days. Consolidate the already implemented Kfz work from the current stacked implementation ending at `cursor/agenturos-controller-task-a5b3` onto current `master`, without redesigning or reimplementing approved functionality.

The launch version is German-only, manual-first and must honestly work end to end: public landing → submission → authenticated AgenturOS inbox → manual follow-up by Artjom or Vera.

## Acceptance criteria

- Create one coherent release implementation against current `master`; do not leave the result dependent on the open stacked PR chain #19–#42.
- Preserve the approved Kfz landing design and facts already present in `cursor/agenturos-controller-task-a5b3`: real Lengerich hero, Allianz branding, Artjom and Vera, Google rating 4.9/48, phone 05481 9039041, WhatsApp link, FAQ, Impressum and Datenschutz links.
- Preserve the full no-document questionnaire, including all existing entry branches, vehicle/driver/use/history/coverage/contact fields, separate SF classes and deductibles.
- Preserve reliable idempotent submit/retry, UTM/source capture, consent evidence, duplicate warning, authenticated inbox triage, manual response drafts and privacy-safe funnel analytics.
- Remove the misleading public document picker/upload path from the pilot landing. Do not show file selection, local preview or wording that suggests a Fahrzeugschein/PDF was uploaded. The current code stores metadata only and does not upload bytes.
- Replace upload copy with an honest note after submission or near the contact step: Artjom or Vera may request documents personally via the selected contact channel if needed.
- Keep WhatsApp manual-first: choosing WhatsApp records the preference; it must not claim or perform an automatic outbound message.
- Keep the checked-in migrations required by the consolidated functionality:
  - `supabase/migrations/20260906120000_inbox_website_channel_source.sql`
  - `supabase/migrations/20260909140000_kfz_funnel_analytics_events.sql`
- Ensure missing production Kfz configuration fails visibly and never reports a false success.
- Document the exact production checklist in `docs/kfz-pilot-release.md`: migrations, `INBOUND_KFZ_AGENCY_ID`, `INBOUND_KFZ_ACTOR_USER_ID`, `INBOUND_KFZ_INTAKE_SECRET`, DNS/routing for `kfz.artkus.de`, and a three-lead real-device smoke test for WhatsApp/Telefon/E-Mail.
- Add/update regression tests proving the pilot has no document picker or fake upload claim and that the real submission/inbox path remains intact.
- Run and pass:
  - `npm run test:inbound`
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build`
- Open a draft PR only. Do not merge or deploy.

## Allowed paths

- `.agent-loop/**`
- `.env.example`
- `docs/kfz-inbound-local-test.md`
- `docs/kfz-pilot-release.md`
- `public/kfz/**`
- `src/app/api/inbound/kfz/**`
- `src/app/app/kfz-analytics/**`
- `src/app/dev/kfz-analytics/**`
- `src/app/dev/kfz-landing/**`
- `src/app/kfz/**`
- `src/app/impressum/**`
- `src/app/datenschutz/**`
- `src/features/inbound/**`
- `src/features/inbox/**`
- `src/lib/inbound/**`
- `src/lib/supabase/**`
- `src/types/**`
- `supabase/migrations/20260906120000_inbox_website_channel_source.sql`
- `supabase/migrations/20260909140000_kfz_funnel_analytics_events.sql`

## Out of scope

- No merge to `master`.
- No production deployment, DNS change, secret change or database migration execution.
- No paid services, Meta campaign activation or external spend.
- No automatic WhatsApp/email sending.
- No WhatsApp Cloud API onboarding.
- No binary document upload/storage implementation in this pilot.
- No Russian/Ukrainian localization.
- No unrelated AgenturOS redesign or broad refactor.
- No fake production success, fake analytics or mocked persistence on the production route.

