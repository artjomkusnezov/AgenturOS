# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-c46d

## Title
AGENTUROS — KFZ ANALYTICS PERSISTENCE CONTRACT

## Goal
Verify and harden the existing Supabase persistence contract for privacy-safe Kfz analytics so the database schema, migrations and policies accept only the approved aggregate metadata and reject forbidden fields.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-c46d (PR #52). No merge or main/master write.
- Extend the existing analytics persistence and migrations, not a parallel store.
- Confirm schema/migrations support coarse source/referrer category, visit, branch, reached step, stop point, site/step timing, transitions and submission plus current consent/data-quality fields.
- Reject or discard names, contacts, answers, filenames, object keys, free text, full URLs/query strings, secrets and personal identifiers before persistence.
- Verify RLS/policies keep anonymous writes narrowly allow-listed and prevent public reads; authorized aggregate review remains server-side.
- Keep migrations additive/idempotent and safe for already-created tables; do not run them against production.
- Preserve all six Kfz branches, questionnaire, consent, private documents, inbox, authorized review and current analytics UI.
- Add deterministic migration/schema, payload allow-list, RLS contract, retry and redaction tests using synthetic data only.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts/routes.
- Browser-check desktop and mobile locally/test-only; inspect Vercel Preview read-only if available. No deploy or environment mutation.

## Safety
Cursor-created branch only. No merge, auto-merge, production deploy or mutation, secret changes/reads, customer data/contact, Meta/WhatsApp API, auto-replies, paid services, force push or destructive git.
