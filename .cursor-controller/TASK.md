# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-ffd2

## Title
AGENTUROS — PRIVACY-SAFE KFZ AGGREGATE EXPORT

## Goal
Let an authorized operator export the existing Kfz campaign decision view for weekly review as a safe aggregate file, without exposing sessions, answers or personal data.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-ffd2 (PR #58). No merge or main/master write.
- Extend the existing authorized Kfz analytics screen and existing aggregate query; do not create another store or dashboard.
- Export only the currently selected allowed period and aggregate source×branch rows: visits, reached/stop summaries where threshold permits, aggregate timing, submissions and conversion.
- Apply the existing minimum-group suppression identically in UI and export. Suppressed details must remain absent, not merely hidden by formatting.
- Never export event/session identifiers, answers, names, contacts, filenames, object keys, free text, full URLs/query strings, secrets or personal identifiers.
- Make CSV safe for spreadsheet opening: stable UTF-8 headings, deterministic ordering, formula-injection neutralization and honest empty/unknown states.
- Keep consent write gates, first-touch attribution and all six Kfz flows unchanged.
- Add deterministic tests for authorization, filters, suppression, forbidden fields, formula injection, empty data and repeat download.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts/routes.
- Browser-check local desktop/mobile with synthetic anonymous fixtures for 7/30/90 days and inspect downloaded CSV contents; inspect Preview read-only if available.

## Safety
Cursor-created branch only. No merge, auto-merge, production deploy/database mutation, secret changes/reads, customer data/contact, Meta/WhatsApp API, auto-replies, paid services, force push or destructive git.
