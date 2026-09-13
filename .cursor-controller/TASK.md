# Cursor Cloud Task

STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-ea23

## Title
AGENTUROS — PRIVACY-SAFE KFZ PERIOD TREND COMPARISON

## Goal
Help an authorized operator see whether the safe Kfz funnel is improving by comparing the selected aggregate period with the immediately preceding equal period, without exposing sessions, answers or personal data.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-ea23 (PR #59). No merge or main/master write.
- Extend the existing authorized Kfz analytics screen and aggregate query; do not create another store or dashboard.
- For 7/30/90 days, compare the current period with the preceding equal-length period using only allowed aggregates: visits, submissions, conversion, reached/stop summaries and aggregate timing.
- Reuse the existing source×branch categories and minimum-group suppression. A suppressed or incomplete comparison must remain absent/unknown, never inferred.
- Show absolute values and honest deltas; avoid causal claims, forecasts, recommendations or invented attribution.
- CSV export may include comparison aggregates only if identical privacy/suppression/formula protections are applied.
- Never expose event/session identifiers, answers, names, contacts, filenames, object keys, free text, URLs/query strings, secrets or personal identifiers.
- Keep consent gates, first-touch attribution, six Kfz flows and existing exports unchanged.
- Add deterministic tests for date boundaries, equal periods, zero denominators, suppression, unknowns, authorization, forbidden fields and stable export.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts/routes.
- Browser-check local desktop/mobile with synthetic anonymous fixtures for improving, declining, equal, suppressed and empty 7/30/90-day comparisons; inspect CSV if extended. Preview read-only only if available.

## Safety
Cursor-created branch only. No merge, auto-merge, production deploy/database mutation, secret changes/reads, customer data/contact, Meta/WhatsApp API, auto-replies, paid services, force push or destructive git.

CONTROLLER_AGENT_ID: bc-5b3051b1-ec4a-48a7-a13c-a72925dcc439
CONTROLLER_STARTED_AT: 2026-09-13T07:15:09Z
