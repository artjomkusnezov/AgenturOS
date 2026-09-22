# Cursor Cloud Controller Task

STATUS: STARTED
STARTING_REF: master
TRIGGER_NONCE: 2026-09-22T21:trigger-agenturos-kfz-p0

## Title
AGENTUROS — KFZ PRODUCTION P0 + FINAL FULL SMOKE

## Owner authority
Owner explicitly authorizes merge/main writes/deploy/production smoke within this already agreed Kfz task. No force push/destructive git, secrets exposure, real customer communications or meaningless production mutations.

## Context
PR #71 is merged and validated: Schritt 1 is explicit selection among all six scenarios; "Bestehendes Auto wechseln" may be visually prioritized / "Am häufigsten" but MUST NOT be silently selected. Document/manual routing follows scenario selection. Preserve this exactly.

A later production proof showed the final submit/persistence chain is not yet proven and previously produced no Kfz lead in authenticated /app/leads. Treat production persistence as P0. Do not claim READY from HTTP 200, local tests or a success screen alone.

## Single goal
SHIP CURRENT /kfz. No redesign, no Kfz V2, no Meta/WhatsApp API, no unrelated AgenturOS features.

Preserve backend intent, ~10-step questionnaire, documents, Inbox/Leads, UTM/first-touch, PII-free analytics, Römer/Lengerich hero, Allianz branding, Artjom/Vera trust/reviews and six-scenario logic.

Allowed CRO polish only if not already present, maximum these owner-approved items: compact consent without weakening compliance; visual priority for "Bestehendes Auto wechseln" / "Am häufigsten" while preserving all six choices; remove premature "Bereit zum Senden"; mobile sticky primary action/progress only where safe; German date/microcopy polish. Do not expand scope.

## P0 forensic/fix
Reproduce/trace the real production submit path and identify the exact failing layer if persistence is still broken: client validation/request -> route/server action -> env/config -> DB/RLS -> persistence -> Inbox/Leads projection -> document authorization -> analytics. Make the smallest safe fix necessary. Do not weaken auth/RLS/privacy and do not expose secrets.

## Verification before production
Run exact full quality gate available in repo, including npm run test:inbound, npx tsc --noEmit, npm run lint, npm run build, plus any focused Kfz tests. Record exact counts/results.
Browser proof desktop + ~390px mobile: six scenarios are visible at Schritt 1 with no silent preselection; questionnaire/document routing works; final submit UI is coherent.

## Deploy + exactly one production smoke
After code/CRO checks are green, merge/deploy if required and authorized. Then perform EXACTLY ONE unmistakably synthetic production Kfz submission. Verify the SAME synthetic record end-to-end:
1. production persistence;
2. visible in authenticated Inbox and /app/leads;
3. private document authorization where safe/applicable;
4. UTM/first-touch preservation where supplied;
5. analytics remain PII-free;
6. no duplicate lead caused by the one submit.
Do not contact any real customer and do not perform extra production mutations.

If production credentials/config make a step impossible, report the exact external blocker and evidence; do not fabricate success.

## DoD
READY only with actual production end-to-end evidence for the one synthetic submission. Otherwise BLOCKED with exact failing layer/error and completed local evidence.
After READY: STOP AgenturOS. Next owner action is Launch Meta test. Do not invent another AgenturOS task.

## Controller
Use only controller/cursor-cloud-v1. Never .agent-loop or issue-driven Agent Task/Review. Work only on Cursor-created cursor/* branch.

CONTROLLER_AGENT_ID: bc-c371f849-f7c3-4b19-a995-498996fa4ecf
CONTROLLER_RUN_ID: run-677e8bde-5a38-420b-b683-ac52adeae2ce
CONTROLLER_RUN_STATUS_AT_LAUNCH: RUNNING
CONTROLLER_STARTED_AT: 2026-09-22T19:26:48Z
