# Cursor Cloud Controller Task

STATUS: READY
STARTING_REF: master

## Title
AGENTUROS — KFZ RESTORE SCENARIO SELECTION AS STEP 1

## Owner correction — 2026-09-20
The current production flow is wrong at the very first step.

Schritt 1 MUST be the existing six-scenario selection (e.g. "Bestehendes Auto wechseln", neues Auto, etc.). "Bestehendes Auto wechseln" may be visually highlighted / marked "Am häufigsten", but it MUST NOT be preselected in a way that skips the choice. The customer must make a scenario choice.

The current "Schritt 1 von 11 · Start" screen that immediately asks "Womit sollen wir starten?" with "Unterlagen hochladen" / "Keine Unterlagen senden?" must NOT replace the scenario selection.

## Exact required flow
1. Public /kfz entry → Schritt 1 = existing six scenario choices.
2. Preserve all six existing scenarios and their existing scenario semantics.
3. "Bestehendes Auto wechseln" may have visual priority / "Am häufigsten", but customer still explicitly selects a scenario.
4. AFTER scenario selection, continue into the existing document/manual-data choice where appropriate.
5. Preserve the approved document routing:
   - Fahrzeugschein uploaded (with or without Beitragsrechnung) → short document-led path may continue to Kontakt.
   - Beitragsrechnung only → MUST continue through existing manual vehicle/questionnaire path before Kontakt.
   - no documents → existing manual questionnaire path.
   - both documents → short document-led path.
   - Beitragsrechnung optional; Fahrzeugschein not globally required.
6. Do not lose the selected scenario when switching into upload/manual path or submitting the lead.

## Preserve exactly
- existing six scenario cards/copy/logic; restore/reuse, do not redesign them
- current upload UI/private storage/auth
- existing manual questionnaire/fields/logic
- current contact step and inquiry-processing consent
- Inbox/Leads persistence
- retry/exact-once
- UTM/first-touch
- NO Messung/tracking consent UI
- Römer/Lengerich hero, Allianz branding, Artjom/Vera trust, reviews
- no new fields/screens/product ideas
- no OCR, Kfz V2, Meta/WhatsApp API
- AgenturOS outside /kfz untouched

## Regression proof required
Browser desktop + mobile ~390x844:
A. fresh /kfz → first questionnaire step visibly shows all six scenario choices
B. no scenario is silently chosen; user explicitly chooses one
C. "Bestehendes Auto wechseln" can remain visually prioritized / "Am häufigsten"
D. after scenario choice, upload/manual choice is reachable
E. invoice-only → manual vehicle/questionnaire before Kontakt
F. Fahrzeugschein-only → short path
G. both docs → short path
H. no docs → manual path
I. selected scenario persists through submission payload / lead
J. Messung absent

## Verification
Run exact:
- npm run test:inbound
- npx tsc --noEmit
- npm run lint
- npm run build

Fix only this proven first-step regression and any directly necessary wiring/tests. Do not perform unrelated CRO/polish.

After green evidence: merge/deploy under existing owner authorization, verify live /kfz. Then continue the already-authorized EXACTLY ONE synthetic production smoke if it has not already been performed. Verify persistence → authenticated Inbox/Leads → private document auth where safe → PII-free analytics. Then STOP AgenturOS.

Final report:
KFZ STATUS: READY / BLOCKED
FIRST STEP: six scenarios proof
DOCUMENT ROUTING: four combinations proof
TESTED: exact results
BROWSER: desktop/mobile evidence
PRODUCTION: deploy + synthetic smoke status
NEXT: if READY "Launch Meta test"; if BLOCKED exact blocker.

CONTROLLER_AGENT_ID:
CONTROLLER_STARTED_AT:
