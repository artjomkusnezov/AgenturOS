# Cursor Cloud Controller Task

STATUS: READY
STARTING_REF: master

## Title
AGENTUROS — KFZ PRODUCTION SMOKE RETRY V1

## Priority
P0. The prior production-smoke controller run is stale: it was marked STARTED at 2026-09-16T20:10:40Z but produced no linked Cursor result branch/PR/evidence. Retry the same launch proof once; do not build new features.

## Context
PR #65 and #66 are already merged and the Kfz production stack is deployed. Previous release-candidate QA: 438/438 inbound tests, TypeScript/lint/build PASS. The only remaining job is production evidence.

## Goal
Verify the deployed Kfz funnel end-to-end with exactly ONE clearly synthetic submission, prove arrival and usability in Eingang/Leads/Offene Leads, verify document/privacy-safe analytics behavior, and report READY FOR EXTERNAL QA or BLOCKED.

## Required work
1. Open canonical public production /kfz fresh on desktop and ~390x844; verify six existing entry scenarios and questionnaire entry.
2. Submit exactly ONE synthetic Kfz lead through production UI using obviously non-real identity/contact data. No real customer PII and no repeated submissions.
3. Prove that exact lead appears in Eingang compatibility path, Vorgänge → Leads, and Offene Leads KPI, without duplicate UI identity.
4. Open it and verify existing questionnaire/contact/source/UTM/missing-data/status/document metadata. If status is changed for smoke, verify persistence after reload. Do not auto-create a Vorgang.
5. If safe, upload at most one tiny non-sensitive test document and prove authorized access plus unauthenticated denial; otherwise report NOT TESTED and exact blocker.
6. Verify Kfz analytics/telemetry evidence contains no name, email, phone, address, free text, document filename/content or raw questionnaire PII.
7. Produce factual launch handoff: canonical URL, production smoke result, desktop/mobile evidence, proven path, blockers, READY FOR EXTERNAL QA or BLOCKED.

## Repair rule
If smoke exposes a code-level P0 blocker, make at most ONE bounded repair attempt on the Cursor branch with deterministic regression coverage and rerun quality checks. Do not deploy a repair in this task.

## Tests / quality
Run and report exact results:
- npm run test:inbound
- npx tsc --noEmit
- npm run lint
- npm run build

## Hard boundaries
No unrelated AgenturOS work. No Meta/WhatsApp API. No auto-replies. No new CRM. No secrets exposure. No paid services. No destructive git. No force push. No manual main/master write or merge. No additional production submissions beyond the single synthetic smoke lead.

## Deliverable
One Cursor result branch/PR only if code/evidence artifacts require it. If no code change is needed, return the production smoke evidence without manufacturing changes.

## Definition of done
Fresh evidence proves or disproves /kfz → submit → Eingang/Leads → usable lead and privacy-safe analytics, with exactly one synthetic production submission.
