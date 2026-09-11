# Cursor Cloud Task

STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-9bc0

## Title
AGENTUROS — KFZ RELEASE-CANDIDATE END-TO-END ACCEPTANCE

## Goal
Create one safe, deterministic release-candidate acceptance path from public /kfz through submission, private document storage, inbox and authorized review, without production deploy or customer data.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-9bc0 (PR #47). No merge or main/master write.
- Preserve the six Kfz branches, full questionnaire, consent, safe analytics, private bucket and current/legacy public Supabase-key compatibility.
- Add one test-only acceptance harness that exercises /kfz → submit → exact-once retry → one inbox item → authorized document review → anonymous/cross-item rejection.
- Use generated synthetic data and a tiny generated test file only. Never use or log customer data, answers, filenames, object keys or secret values in analytics.
- Verify source/referrer, visit, selected branch, reached step, stop point, site/step timing and submission events remain metadata-only.
- Make failures distinguish configuration missing, persistence unavailable, unauthorized review and route missing without printing values.
- Do not add Meta/WhatsApp API, auto-replies, ads or paid services.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts/routes.
- Browser-check desktop and mobile locally/test-only. Check Vercel Preview read-only if available; do not deploy or change environment values.

## Safety
Cursor-created branch only. No merge, auto-merge, production deploy or mutation, secret changes/reads, customer contact, Meta/WhatsApp API, paid services, force push or destructive git.

CONTROLLER_AGENT_ID: bc-fe63919b-b89b-46c0-acf0-8e83f8fb0280
CONTROLLER_STARTED_AT: 2026-09-11T00:16:39Z
