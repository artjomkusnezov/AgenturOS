# Cursor Cloud Task

STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-b715

## Title
AGENTUROS — KFZ SOURCE ATTRIBUTION INTEGRITY

## Goal
Make Kfz funnel source attribution reliable across entry, navigation, reload and submission while storing only approved coarse analytics metadata and never customer answers or personal data.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-b715 (PR #56). No merge or main/master write.
- Extend the existing Kfz analytics pipeline and authorized aggregate review; do not create a parallel store.
- Preserve the first approved coarse source category and campaign identifiers already allowed by the schema across landing, branch selection, step transitions, reload and submission.
- Categorize direct, referral, organic and paid entries using existing approved fields only. Never store full URLs, query strings, free text or referrer details.
- Prevent later internal navigation, retries or duplicate events from overwriting the original attribution.
- Consent remains a hard gate; without consent nothing is queued, persisted or retried.
- Add authorized aggregate comparison by coarse source and selected Kfz branch with existing small-group protection.
- Preserve all six branches, questionnaire, private document flow, inbox, readiness and safe retry behavior.
- Add deterministic tests for direct/referral/paid/organic entry, reload, cross-route navigation, duplicate retry, consent withdrawal and forbidden-field stripping.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts/routes.
- Browser-check local desktop/mobile with synthetic anonymous fixtures; inspect Preview read-only if available.

## Safety
Cursor-created branch only. No merge, auto-merge, production deploy/database mutation, secret changes/reads, customer data/contact, Meta/WhatsApp API, auto-replies, paid services, force push or destructive git.

CONTROLLER_AGENT_ID: bc-3d17f4f6-305a-496c-a12a-d1d45cdd4921
CONTROLLER_STARTED_AT: 2026-09-12T05:56:53Z
