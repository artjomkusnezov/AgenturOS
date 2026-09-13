# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-2d45

## Title
AGENTUROS — PRIVACY-SAFE KFZ FUNNEL BOTTLENECK SUMMARY

## Goal
Help an authorized operator identify where aggregate Kfz journeys stop in the selected period, without exposing sessions, answers or personal data and without making causal claims.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-2d45 (PR #60). No merge or main/master write.
- Extend the existing authorized Kfz analytics screen and aggregate query; do not create another store or dashboard.
- For 7/30/90 days, summarize the already allowed aggregate reached-step, stop-point and transition facts overall and by existing source×branch categories.
- Reuse minimum-group suppression. Suppressed, missing or incomplete facts remain absent/unknown and are never inferred as zero.
- Show counts and neutral descriptive labels only. No recommendations, causal claims, forecasts, scoring or invented attribution.
- If CSV is extended, apply identical suppression, stable ordering, formula neutralization and forbidden-field protections.
- Never expose event/session identifiers, answers, names, contacts, filenames, object keys, free text, URLs/query strings, secrets or personal identifiers.
- Keep consent gates, first-touch attribution, six Kfz flows, period trends and existing exports unchanged.
- Add deterministic tests for transition boundaries, stop aggregation, suppression, unknowns, empty periods, authorization, forbidden fields and stable export.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts/routes.
- Browser-check local desktop/mobile with synthetic anonymous complete, stopped, suppressed, unknown and empty 7/30/90-day fixtures; inspect CSV if extended. Preview read-only only if available.

## Safety
Cursor-created branch only. No merge, auto-merge, production deploy/database mutation, secret changes/reads, customer data/contact, Meta/WhatsApp API, auto-replies, paid services, force push or destructive git.
