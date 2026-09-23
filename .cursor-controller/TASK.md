# Cursor Cloud Controller Task

STATUS: READY
STARTING_REF: master

## Title
AGENTUROS — KFZ PRODUCTION P0 + FINAL FULL SMOKE

## Scope
SHIP CURRENT /kfz only. No redesign, no Kfz V2, no Meta/WhatsApp API, no unrelated AgenturOS features. Preserve six-scenario first step with no silent preselection, existing questionnaire/document routing, Inbox/Leads, UTM/first-touch, PII-free analytics, branding and trust content.

## P0
Prove the real production submit/persistence chain end-to-end. Trace client -> route/server -> env/config -> DB/RLS -> persistence -> Inbox/Leads -> private document authorization -> analytics. Make only the smallest safe fix if required. Do not weaken auth/RLS/privacy.

## Verification
Run npm run test:inbound, npx tsc --noEmit, npm run lint, npm run build and focused Kfz tests. Browser proof desktop + ~390px mobile. Then exactly ONE unmistakably synthetic production Kfz submission and verify the SAME record in persistence, authenticated Inbox and /app/leads, document authorization where applicable, UTM/first-touch, PII-free analytics, and no duplicate lead.

## DoD
READY only with actual production end-to-end evidence. Otherwise BLOCKED with exact failing layer/error. After READY/DoD: STOP AgenturOS; do not invent another task. The separately owner-approved queued hero-asset replacement may only run if it already exists in the agreed queue after this P0.

## Retry context
Previous Cursor run reached FINISHED but reported result branch cursor/agenturos-controller-task-f4fa was not present in GitHub and no PR was delivered. GitHub verified that branch is absent. This is the single allowed delivery retry; do not create follow-up QA/polish/audit agents.

CONTROLLER_PREVIOUS_AGENT_ID: bc-c371f849-f7c3-4b19-a995-498996fa4ecf
CONTROLLER_PREVIOUS_RUN_ID: run-677e8bde-5a38-420b-b683-ac52adeae2ce
CONTROLLER_PREVIOUS_RUN_RESULT: FINISHED_WITHOUT_GITHUB_DELIVERY
CONTROLLER_RETRY_COUNT: 1
