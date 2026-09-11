# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-4e4f

## Title
AGENTUROS — KFZ MIGRATION CHAIN DRY RUN

## Goal
Prove the complete Kfz Supabase migration chain works safely on clean and legacy test databases, including private documents, inbox review and metadata-only analytics, without touching production.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-4e4f (PR #53). No merge or main/master write.
- Build a deterministic test-only migration harness for an empty schema and the supported pre-analytics legacy schema.
- Apply the checked-in Kfz migrations twice in the test harness to prove additive idempotency and compatibility.
- Verify private bucket/policies, submission/inbox linkage, authorized review, analytics allow-list, unique retry behavior and no public reads.
- Use synthetic data only. Never read, print or persist real secrets, answers, names, contacts, filenames, object keys, free text or full URLs/query strings.
- Report failures by migration/check name only; never print environment values or credentials.
- Preserve current routes, all six Kfz branches, questionnaire, consent, readiness and analytics UI.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts/routes.
- Browser-check readiness and analytics locally/test-only after the harness; inspect Vercel Preview read-only if available. No production database or environment mutation.

## Safety
Cursor-created branch only. No merge, auto-merge, production deploy/database mutation, secret changes/reads, customer data/contact, Meta/WhatsApp API, auto-replies, paid services, force push or destructive git.
