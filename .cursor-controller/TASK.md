# Cursor Cloud Controller Task

STATUS: STARTED
STARTING_REF: master

## Title
AGENTUROS — KFZ PRODUCTION SMOKE + ADS HANDOFF V1

## Priority
P0. Finish the real Kfz launch path before any unrelated AgenturOS work.

## Context
PR #65 and PR #66 have been merged to master and the Kfz production stack has been deployed. Previous release-candidate QA reported 438/438 inbound tests plus TypeScript, lint and build PASS. The remaining job is to prove the actual production customer-to-lead journey and prepare a factual ads handoff. Do not build unrelated features.

## Goal
Verify the deployed Kfz funnel end-to-end with exactly one clearly synthetic submission, prove that it arrives and is usable in AgenturOS Leads/Eingang, verify document/privacy-safe analytics behavior, fix only bounded P0 launch blockers if found, and produce a concise launch evidence report.

## Required work

### M1 — Production entry proof
Open the actual public production /kfz URL in a fresh browser session.
Verify desktop and approximately 390x844 mobile.
Record the canonical public URL and confirm it is accessible without Vercel/GitHub authentication.
Verify the six existing customer entry scenarios and that the questionnaire can be entered from each. Do not redesign marketing copy in this task.

### M2 — Exactly one synthetic Kfz submission
Submit exactly ONE clearly synthetic lead through the production /kfz UI.
Use obviously non-real test identity/contact data and mark it as test wherever the form permits.
Do not use real customer PII.
Do not generate repeated submissions.
Capture the user-visible success/failure state.

### M3 — Lead arrival proof
Using the existing authenticated app flow/environment available to the Cloud run, prove whether that exact synthetic submission appears in:
- Eingang/inbox compatibility path;
- Vorgänge → Leads;
- Offene Leads dashboard KPI.
Verify the same lead identity/source is not duplicated by the UI.

### M4 — Lead usability
Open the synthetic lead and verify the existing production fields that are present: Kfz questionnaire facts, contact facts, source/UTM where available, missing-data indicators, status lifecycle, and document metadata.
Change status only if the existing test/smoke procedure requires it, then verify persistence after reload.
Do not create a Vorgang automatically and do not add CRM features.

### M5 — Documents + privacy
If the synthetic submission path supports a harmless test document, upload at most one tiny non-sensitive test file and prove authorized access plus unauthenticated denial. If production policy/environment makes document upload unsafe or unavailable, do not force it; report NOT TESTED with the exact blocker.
Verify analytics/telemetry used by the Kfz funnel remains privacy-safe: no name, email, phone, address, free-text, document filename/content, or raw questionnaire PII in analytics payloads/log evidence.

### M6 — Ads handoff evidence
Produce a short factual launch handoff containing:
- canonical public /kfz URL;
- production smoke result;
- desktop/mobile evidence;
- funnel steps proven;
- exact remaining P0 blockers, if any;
- whether the technical funnel is READY FOR EXTERNAL QA or BLOCKED.
Do not create, configure or launch Meta Ads. No Meta API.

## Repair rule
If production smoke exposes a code-level P0 blocker, make ONE bounded repair attempt on the Cursor branch, add deterministic regression coverage, rerun relevant tests/lint/typecheck/build and browser proof. Do not mutate production data/schema beyond the single authorized synthetic lead. Do not deploy a repair; report that deployment is owner-authorized separately unless an existing automatic preview deployment is sufficient for proof.

## Tests / quality
Run the relevant Kfz/inbound tests plus:
- npm run test:inbound
- npx tsc --noEmit
- npm run lint
- npm run build
Report exact results.

## Browser proof
Required:
- public production /kfz desktop
- public production /kfz ~390x844
- exactly one synthetic submit result
- authenticated Leads/Eingang evidence for that submission if environment permits
- dashboard Offene Leads relation
Do not call anything production-proven without this evidence.

## Non-goals
No unrelated AgenturOS work.
No Meta/WhatsApp API.
No auto-replies.
No new CRM.
No secrets exposure.
No paid services.
No destructive git.
No force push.
No manual main/master write or merge.
No additional production submissions beyond the single synthetic smoke lead.

## Deliverable
One Cursor result branch/PR only if code/evidence artifacts require it, with exact QA results and browser evidence. If no code changes are required, provide the smoke evidence/report without manufacturing changes.

## Definition of done
We can state from fresh production evidence whether a real ad click can traverse /kfz → submit → Eingang/Leads → usable lead while privacy-safe analytics remains clean, and we have a canonical URL ready for external Grok QA/Meta campaign preparation.

CONTROLLER_AGENT_ID: bc-bfb064a2-79ad-4f19-919a-e8a46e0f5b2a
CONTROLLER_STARTED_AT: 2026-09-16T20:10:40Z
