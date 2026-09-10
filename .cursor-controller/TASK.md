# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-5cb3

## Title
AGENTUROS — SUPABASE KFZ CONFIGURATION PREFLIGHT

## Goal
Make the existing private Kfz document-storage integration safely verifiable before owner setup, without applying production migrations, exposing secrets or deploying anything.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-5cb3 (PR #45). No merge or main/master write.
- Add one deterministic preflight command/check that validates required Supabase environment variable names, private bucket/migration presence, server-only service-role usage and fail-closed behavior.
- Never print, store or transmit secret values. Report only present/missing and safe configuration facts.
- Keep migration application and real environment changes as OWNER INPUT; provide one exact owner checklist using existing Supabase and Vercel only.
- Verify public bucket access stays disabled, anonymous/cross-item review stays blocked, retries remain exact-once and analytics receive no filenames, object keys, answers or personal data.
- Preserve the six Kfz branches, questionnaire, consent, inbox, analytics and readiness screen.
- Add deterministic tests for configured/missing environment states, private-storage contract and secret redaction.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts.
- Browser-check desktop/mobile local/test flow and record what cannot be verified without owner configuration. No production data.

## Safety
Cursor-created branch only. No merge, deploy, production mutation, secrets, customer contact, Meta/WhatsApp API, ads, new paid services, force push or destructive git.
