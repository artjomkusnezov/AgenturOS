# Cursor Cloud Controller Task

STATUS: READY
STARTING_REF: master

## Title
AGENTUROS — KFZ FIX DOCUMENT ROUTING REGRESSION

## Owner bug report — 2026-09-18
Production screenshot proves a regression in the upload-first route:
If the customer uploads ONLY "Vorversicherung / letzte Beitragsrechnung" and no Fahrzeugschein, clicking Weiter currently jumps directly to Schritt 3 von 3 · Kontakt. That is wrong because the vehicle itself is not identified.

Fix ONLY this routing regression. No new UX/product ideas.

## Required behavior
There are two independent document slots:
- Fahrzeugschein
- Vorversicherung / letzte Beitragsrechnung

Routing must follow these exact rules:
1. Fahrzeugschein uploaded (with or without Beitragsrechnung) → the document-led short path may continue to Kontakt. Do NOT force manual HSN/TSN/Hersteller/Modell.
2. Beitragsrechnung uploaded but NO Fahrzeugschein → MUST NOT skip vehicle data. Continue into the existing manual vehicle/questionnaire path so the vehicle is identified.
3. Neither document uploaded → existing manual questionnaire path.
4. Both uploaded → existing short document-led path.
5. Do not require Beitragsrechnung. It remains optional.
6. Do not require Fahrzeugschein generally; a customer may instead use the existing manual questionnaire.

## Preserve exactly
- current upload UI and private storage/auth
- current manual questionnaire and its existing fields/logic
- all six scenarios
- current contact step
- inquiry-processing consent
- Inbox/Leads persistence
- retry/exact-once behavior
- UTM/first-touch
- NO public Messung/tracking consent UI
- no new fields/screens/copy/redesign
- no OCR
- no Kfz V2
- no Meta/WhatsApp API
- AgenturOS outside /kfz untouched

## Regression tests required
Add/adjust tests for the 4 document combinations:
A. no docs → manual path
B. Fahrzeugschein only → short path/contact
C. Beitragsrechnung only → manual vehicle/questionnaire path
D. both docs → short path/contact

The tests must specifically prevent "invoice-only → contact" from returning.

## Browser proof required
Desktop + mobile ~390x844:
- select/upload only Beitragsrechnung, click Weiter, prove vehicle/manual questionnaire appears before Kontakt
- select/upload only Fahrzeugschein, click Weiter, prove short path to Kontakt
- both docs, short path
- no docs/manual fallback
- Messung UI remains absent

## Verification
Run exact:
- npm run test:inbound
- npx tsc --noEmit
- npm run lint
- npm run build

Do not perform production synthetic smoke until this fix is merged/deployed and live UI is verified.

After green evidence: merge/deploy under existing owner authorization, verify live behavior, then continue the already-authorized single unmistakably synthetic production smoke. STOP AgenturOS after READY/BLOCKED.

Final report:
KFZ STATUS: READY / BLOCKED
BUG: invoice-only routing
CHANGED: factual only
TESTED: exact results
BROWSER: four document combinations desktop/mobile
NEXT: if READY "Launch Meta test"; if BLOCKED exact blocker.

CONTROLLER_AGENT_ID:
CONTROLLER_STARTED_AT:
