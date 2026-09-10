# Cursor Cloud Task

STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-a5b3

## Title
AGENTUROS — KFZ PRE-LAUNCH ACCEPTANCE AND BLOCKER SURFACE

## Goal
Prepare the existing Kfz landing, questionnaire, normalized inbox handoff and privacy-safe analytics for an owner launch decision within days by adding one factual internal readiness surface and closing only deterministic local defects, without deploying, advertising or contacting customers.

## Required work
- Create and work only on one new Cursor-created result branch starting from cursor/agenturos-controller-task-a5b3 (PR #42). Do not merge or write to main/master.
- Preserve the approved landing, six branches, separate SF classes, structured deductibles, exact-once retry, unified inbox, analytics filters/consent/privacy boundary, search and duplicate review.
- Add one internal Kfz launch-readiness page/checklist inside AgenturOS, not a parallel dashboard.
- Show factual states for: landing route, six branch availability, required contact/consent validation, submit/retry/idempotency, normalized inbox creation, manual review path, analytics storage/dashboard, required database migrations/configuration and production-only unknowns.
- Distinguish PASS, BLOCKED, OWNER INPUT and NOT VERIFIED. Never claim production readiness from local fixtures.
- Link each blocker to the exact existing route, migration, environment variable name or documentation location without exposing secret values.
- Do not add Meta/WhatsApp integration, advertising, customer communication, tracking pixels, paid services or deployment.
- Close only deterministic code/test/UI defects discovered during the acceptance walk. Product, legal, tariff, campaign-budget, domain and production-data decisions remain Owner input.
- Add one deterministic end-to-end local acceptance test: landing choice → questionnaire/upload path → validation → designed failure/retry → exactly one normalized inbox item → manual review → anonymous analytics when consented; also verify declined analytics stores nothing.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build.
- Browser-check desktop and mobile for all six entry branches, one full questionnaire path, one upload path, failure/retry, one inbox item, review card, analytics consent declined/granted, dashboard filters and readiness page. Record evidence.

## Safety
Cursor-created branch only. No main/master, merge, auto-merge, deploy, production data, secrets, customer communication, Meta/WhatsApp API, ad campaign, paid service, legal-compliance claim, tariff calculation, force push or destructive git.

CONTROLLER_AGENT_ID: bc-8edb2167-7f80-4350-b5ef-99aaa90ee8f7
CONTROLLER_STARTED_AT: 2026-09-10T06:50:46Z
