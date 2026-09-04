STATUS: READY

## Goal
Prepare AgenturOS safely for WhatsApp Business App + Cloud API Coexistence before the production number is onboarded. Extend the existing WhatsApp webhook layer so Coexistence-specific webhook fields are recognized and handled without breaking the working normal `messages` intake.

## Acceptance criteria
- Preserve existing GET verification and POST HMAC signature behavior; existing WhatsApp inbound behavior stays green.
- Standard `messages` continue through the existing inbound adapter unchanged.
- Add defensive typed classification for at least `smb_message_echoes`, `history`, and `smb_app_state_sync`; account/update and unknown fields may also be classified where useful.
- Coexistence events not yet safe to persist as normal Inbox items are acknowledged HTTP 200 and create no bogus Inbox entries.
- Model `smb_message_echoes` distinctly as Business-App outbound/echo data for a later conversation layer.
- Model `history` distinctly as backfill/history; do not flood the Inbox.
- Model `smb_app_state_sync` distinctly as state-sync metadata; do not create Inbox items.
- Unsupported/unknown webhook fields are acknowledged safely; logs contain only non-secret diagnostic metadata and never message bodies, media, tokens, signatures, or secrets.
- Add representative fixtures/tests and regression coverage for normal `messages`.
- Add concise readiness documentation: READY now vs deferred until Meta onboarding.
- Optional future WABA/phone filtering seams are allowed only if non-breaking and empty/unset preserves current behavior; no real identifiers hardcoded.
- Run `npm run test:inbound`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`; report exact results in PR.
- Open/update a draft PR from autonomous branch; do not merge.

## Allowed paths
- `src/features/whatsapp/**`
- `src/app/api/inbound/whatsapp/**`
- `docs/whatsapp-coexistence-readiness.md`
- `docs/whatsapp-inbound-local-test.md`
- `.env.example`
- `tests/fixtures/whatsapp/**`
- `tests/whatsapp-coexistence.test.ts`
- `tests/whatsapp-inbound.test.ts`
- `package.json`

## Out of scope
- No Meta UI/API configuration changes.
- No Embedded Signup/config_id implementation.
- No production phone registration/migration/coexistence activation, `/register`, or `/smb_app_data`.
- No outbound send API, templates, chatbot, AI, transcription, conversation UI, mini-chat, or DB migration.
- No unrelated AgenturOS changes.
- No secrets/tokens/passwords in code/tests/docs/logs.
- No direct master write, merge, or deploy.

## Guardrails
- Production WhatsApp Business App number is untouchable.
- Existing signed inbound path is the regression baseline.
- Prefer additive classification over broad refactors.
- Do not invent uncertain Meta payload semantics; parse defensively and document uncertainty.

## Human blockers
- Meta business verification/App Review/final Coexistence onboarding remain owner-controlled and are not part of this task.