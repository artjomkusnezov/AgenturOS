# WhatsApp Business App + Cloud API Coexistence — Readiness

Scope: prepare AgenturOS webhook handling **before** the production number is onboarded. No Meta UI/API configuration, Embedded Signup, `/register`, `/smb_app_data`, or production migration is performed here.

## READY now (code)

| Area | Status |
|---|---|
| GET webhook verification (`hub.challenge`) | Unchanged |
| POST HMAC `X-Hub-Signature-256` | Unchanged |
| Standard `messages` → Adapter → Intake → Inbox | Unchanged |
| Typed classification of `smb_message_echoes` | Ready — modeled as Business-App outbound/echo; **no Inbox** |
| Typed classification of `history` | Ready — modeled as backfill/history; **no Inbox flood** |
| Typed classification of `smb_app_state_sync` | Ready — state-sync metadata; **no Inbox** |
| `account_update` / unknown fields | Acknowledged HTTP 200; **no Inbox** |
| Safe logs | Event name + structural counts only (no bodies, media, tokens, signatures) |
| Optional WABA / phone allowlist env seams | Present; **empty/unset = current accept-all behavior** |

Representative fixtures live under `tests/fixtures/whatsapp/`. Regression + coexistence coverage: `tests/whatsapp-inbound.test.ts`, `tests/whatsapp-coexistence.test.ts`.

## Deferred until Meta onboarding (owner-controlled)

- Meta business verification / App Review
- Final Coexistence onboarding of the **production** WhatsApp Business App number
- Embedded Signup / `config_id`
- Calling `/register` or `/smb_app_data`
- Persisting echoes / history into a conversation layer (DB + UI)
- Outbound Cloud API send, templates, chatbot, AI, transcription
- Turning on optional allowlists with real WABA / phone number ids (never hardcode)

## Behavior summary

1. Meta may send Coexistence webhook fields after onboarding.
2. AgenturOS **acknowledges** them (HTTP 200 after signature check) so Meta does not retry aggressively.
3. Only the `messages` field continues to create Inbox items via the existing inbound adapter.
4. Nested Coexistence payload semantics that are uncertain are **not invented** — we count structural arrays defensively and document uncertainty.

## Optional env seams (non-breaking)

```bash
# Comma-separated. Leave unset/empty to preserve current behavior.
# WHATSAPP_WEBHOOK_ALLOWED_WABA_IDS=
# WHATSAPP_WEBHOOK_ALLOWED_PHONE_NUMBER_IDS=
```

Do **not** put the production Business App number or real secrets into repo docs or fixtures.
