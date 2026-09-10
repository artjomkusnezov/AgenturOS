# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-097a

## Title
AGENTUROS — PRIVATE DURABLE KFZ DOCUMENT STORAGE

## Goal
Close the confirmed Kfz upload blocker by storing uploaded document bytes privately through the repository's existing Supabase infrastructure, without adding a new paid service or exposing customer documents.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-097a (PR #44). No merge or main/master write.
- Use only existing Supabase/storage patterns and checked-in configuration. If a required product decision is genuinely absent, stop at OWNER INPUT and document one exact question.
- Create a private bucket/migration and least-privilege server-side upload path; never expose service-role values or public document URLs.
- Store only a non-secret object reference in the normalized inbox record; preserve the original filename only where already approved for manual review.
- Validate file type/size using existing limits, reject unsupported input, clean up orphaned bytes after deterministic failures where safe, and keep retry/idempotency exact-once.
- Add an authorized internal download/review path; unauthenticated and cross-item access must fail.
- Preserve the six branches, questionnaire, consent, inbox, analytics privacy boundary and readiness checklist. Analytics must never receive file names, object keys, answers or personal data.
- Add deterministic tests for upload, retry, duplicate submit, authorization denial, cleanup, declined analytics and one normalized inbox item.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts.
- Browser-check desktop/mobile upload → designed failure/retry → one inbox item → authorized document review → blocked anonymous access → readiness status. Use local/test data only and record evidence.

## Safety
Cursor-created branch only. No merge, deploy, production data, secrets, customer contact, Meta/WhatsApp API, ads, new paid services, public buckets, force push or destructive git.
