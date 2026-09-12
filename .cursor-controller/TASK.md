# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-c51e

## Title
AGENTUROS — KFZ CAMPAIGN DECISION VIEW

## Goal
Turn the existing privacy-safe Kfz funnel aggregates into one concise operator decision view showing which coarse sources and entry branches produce visits, progress, drop-offs and submissions without exposing individuals or customer answers.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-c51e (PR #57). No merge or main/master write.
- Extend the existing authorized Kfz analytics screen; do not create another analytics store or dashboard.
- For approved aggregate metadata only, compare coarse source and selected branch by visits, reached step, main stop point, median site/step time and submitted applications.
- Show conversion rates only where the existing small-group threshold permits; otherwise show a privacy-safe suppressed state.
- Keep first-touch attribution immutable across filters, reload, retries and internal navigation.
- Provide clear 7/30/90-day filters using existing timestamps and honest empty/unknown states.
- Never store or display answers, names, contacts, filenames, object keys, free text, full URLs/query strings, secrets or personal identifiers.
- Consent remains a hard write gate. Preserve all six Kfz branches, questionnaire, private documents, inbox, readiness, safe retries and attribution integrity.
- Add deterministic tests for source×branch aggregation, reached/stop steps, timing, submission, small groups, empty periods and forbidden-field stripping.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts/routes.
- Browser-check local desktop/mobile with synthetic anonymous fixtures for 7/30/90 days; inspect Preview read-only if available.

## Safety
Cursor-created branch only. No merge, auto-merge, production deploy/database mutation, secret changes/reads, customer data/contact, Meta/WhatsApp API, auto-replies, paid services, force push or destructive git.
