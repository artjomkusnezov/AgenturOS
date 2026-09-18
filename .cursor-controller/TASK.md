# Cursor Cloud Controller Task

STATUS: READY
STARTING_REF: master

## Title
AGENTUROS — KFZ OWNER CORRECTION: UPLOAD-FIRST, NO MESSUNG

## Owner correction — 2026-09-18
This task supersedes the previous final CRO task where it conflicts. Do not invent any additional UX, CRO, product logic, analytics, fields, screens, or copy beyond the instructions below.

## Goal
Correct the CURRENT production /kfz before any production synthetic smoke or Meta launch.

The owner has manually inspected production and explicitly rejected the current behavior:
1. Remove the user-facing optional "Nutzung dieser Seite messen?" / Messung consent feature from /kfz completely. Do not replace it with another analytics consent banner, modal, drawer, checkbox, or prompt.
2. Make the existing document-upload route the easiest/shortest path. The intended customer behavior is: send Fahrzeugschein and, if available, current/last Kfz Beitragsrechnung; then the agency prepares the price personally.
3. Manual questionnaire remains only as the fallback for customers who do NOT want to send the documents. Do not force customers with documents through HSN/TSN/Marke/Modell and the long questionnaire.
4. Reuse the existing upload implementation and existing private document storage/auth. Do not design a new upload system.
5. Preserve all six business scenarios and existing backend/Inbox/Leads contracts unless a minimal routing adjustment is required to make the existing upload-first path reachable and obvious.

## Exact UX intent
The shortest path must visibly offer the already-existing:
- Fahrzeugschein upload/photo
- Vorversicherung / letzte Beitragsrechnung upload/photo

These uploads are optional individually; a customer may send what they have.
A clear fallback must let the customer continue with manual data entry/questionnaire if they do not want to upload documents.
Do not add new questions or require document hunting before the customer can submit the upload path.

## Remove Messung
Remove the public /kfz measurement-consent UI and its associated optional analytics behavior from the customer journey. Do not weaken the inquiry-processing consent required to submit the insurance inquiry. Keep required legal/privacy handling for the actual inquiry.
Do not expose PII in analytics/logging. If removing the measurement feature leaves dead analytics code used only by /kfz measurement, remove/disable it only as far as needed for a clean build; do not refactor unrelated AgenturOS analytics.

## Preserve
- current Römer/Lengerich hero
- Allianz branding
- Artjom/Vera trust and review proof
- existing private upload/storage authorization
- Inbox/Leads persistence
- UTM/first-touch data needed on the inquiry itself
- retry/exact-once behavior
- six Kfz scenario business logic
- AgenturOS outside /kfz
- no Meta/WhatsApp API
- no redesign / no Kfz V2

## Regression check from owner screenshots
On the manual vehicle step, HSN/TSN/Hersteller/Modell may remain for the manual fallback. They must NOT be the default burden for a customer who chooses to send Fahrzeugschein/rechnung.

## Required implementation evidence
Use only controller/cursor-cloud-v1 and one Cursor result branch. Do not use .agent-loop or issue-driven Agent Task/Review.

Run and report exact:
- npm run test:inbound
- npx tsc --noEmit
- npm run lint
- npm run build
- relevant Kfz browser/E2E smoke on desktop and mobile

Browser proof must show:
- /kfz has NO "Nutzung dieser Seite messen?", "Messung erlauben", or equivalent measurement-consent UI
- existing upload-first path is obvious and reachable
- Fahrzeugschein photo/file upload visible
- Beitragsrechnung/Vorversicherung photo/file upload visible
- manual questionnaire fallback reachable
- upload path does not require HSN/TSN/Marke/Modell
- six scenarios still route
- submit/contact/inquiry-processing consent still work
- no duplicate on retry
- authenticated Inbox/Leads and private document auth contracts remain intact

## Production sequence
Do NOT ask Owner to perform a synthetic submission while this correction is pending.
After tests + browser proof are green: merge to main/master, deploy production, verify live UI first. Only then perform exactly one unmistakably synthetic production Kfz submission if the available tooling can safely do the real public flow. Never fake it with direct DB inserts.

## Definition of done
Corrected production /kfz is upload-first for customers with documents, manual questionnaire is fallback, public Messung UI is gone, regression checks green. Then complete the previously authorized single production synthetic smoke if technically possible and STOP AgenturOS.

Final report:
KFZ STATUS: READY / BLOCKED
CHANGED: factual only
TESTED: exact results
OWNER ACTION: only if truly necessary
NEXT: if READY "Launch Meta test"; if BLOCKED exactly one blocker.

CONTROLLER_AGENT_ID:
CONTROLLER_STARTED_AT:
