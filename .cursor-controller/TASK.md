# Cursor Cloud Task

STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-ee86

## Title
AGENTUROS — KFZ ANALYTICS FAILURE VISIBILITY AND SAFE RETRY

## Goal
Make privacy-safe Kfz funnel analytics failures visible and safely recoverable without losing or duplicating approved metadata, and without storing answers or personal data.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-ee86 (PR #55). No merge or main/master write.
- Extend the existing analytics ingestion and authorized aggregate review; do not create a parallel analytics store.
- Add aggregate health facts for accepted, rejected, duplicate and transiently failed events, using approved metadata only.
- Provide bounded, idempotent retry behavior for transient persistence failures; the existing event key must prevent duplicates.
- Never persist or display answers, names, contacts, filenames, object keys, free text, full URLs/query strings, secrets or personal identifiers.
- Consent remains a hard write gate; revoked or absent consent must not queue or retry events.
- Surface a concise authorized health state on the existing Kfz analytics/readiness UI, with honest READY/BLOCKED/UNKNOWN states and no secret values.
- Preserve all six Kfz branches, questionnaire, private document flow, inbox and authorized review.
- Add deterministic tests for transient failure, retry success, duplicate conflict, permanent rejection, consent withdrawal and sanitized aggregates.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts/routes.
- Browser-check local desktop/mobile analytics and readiness with synthetic anonymous fixtures; inspect Preview read-only if available.

## Safety
Cursor-created branch only. No merge, auto-merge, production deploy/database mutation, secret changes/reads, customer data/contact, Meta/WhatsApp API, auto-replies, paid services, force push or destructive git.

CONTROLLER_AGENT_ID: bc-c46ded3e-2c5c-4b05-97c6-f215993665bf
CONTROLLER_STARTED_AT: 2026-09-11T08:33:45Z
