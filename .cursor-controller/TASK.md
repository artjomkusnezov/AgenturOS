# Cursor Cloud Controller Task

STATUS: READY
STARTING_REF: master

## Title
AGENTUROS — KFZ FINAL CRO/UX POLISH + FULL SMOKE

## Goal
Ship the CURRENT /kfz for the first Meta test. This is one final small CRO/UX polish block after the completed production-readiness/P0 repair. Do not redesign or expand scope.

## Source of truth
PR #67 is merged to master as 0b61cc1a56ce86c98087155177955c347b8708b8. Its P0 repair passed 443/443 inbound tests, TypeScript, lint, build and desktop/mobile local browser QA. Preserve the existing Kfz funnel/backend, Inbox/Leads, documents, attribution and privacy-safe analytics.

Meta message match: Lengerich / Römer / Kfz / persönlich geprüft; CTA "Kfz-Check starten". Journey should feel: Ad → Kfz-Check starten → one simple first decision → questionnaire.

## Scope — maximum five CRO items
1. FIRST STEP / CONSENT FRICTION
Inspect current Mess-/Analytics-/Consent UI after Hero CTA. First useful action should be visible immediately on mobile. Keep all required privacy/compliance behavior. Prefer compact visual treatment. If moving consent would change privacy/analytics semantics, DO NOT move it; compact it only and document why.

2. SIX SCENARIOS — VISUAL PRIORITY ONLY
Keep all six scenarios and all routing/business logic. Make "Bestehendes Auto wechseln" the visually primary/default recommendation with badge "Am häufigsten". Keep all other scenarios fully accessible but visually secondary, e.g. under "Anderer Anlass?". Preserve deep links, attribution and analytics.

3. REMOVE PREMATURE COMPLETION COPY
Audit funnel for "Bereit zum Senden" or equivalent before actual final Contact/Submit. Before final submit use normal next-action copy ("Weiter" or existing context-specific equivalent). Only final action uses "Unverbindliche Anfrage senden" or the already-approved equivalent.

4. MOBILE STICKY PRIMARY ACTION + PROGRESS
On mobile questionnaire steps, if Weiter can fall below the viewport after answering, add a careful sticky-bottom primary action. It must not cover fields, safe area, keyboard, consent/legal text, or affect desktop. Keep progress clearly visible. Prefer "Schritt X von Y · Persönliche Prüfung" only when Y is truthful under branching; otherwise preserve the correct existing dynamic progress contract.

5. GERMAN DATE + SMALL MICROCOPY
Audit date inputs/placeholders. Use TT.MM.JJJJ where possible without breaking native input/accessibility; otherwise document why native behavior stays. Polish Weiter, Zurück, optional, Pflichtfeld, validation and final-submit German; remove developer-ish wording.

## Preserve exactly
- backend architecture and existing ~10-step questionnaire structure
- Supabase contract/migrations unless strictly required (expect none)
- AgenturOS outside Kfz
- document upload/private authorization
- Inbox/Leads integration
- attribution/UTM/first-touch
- privacy-safe analytics, PII-free
- Römer/Lengerich hero image
- Allianz branding
- Artjom/Vera trust elements
- Google review proof
- all six Kfz scenarios as business logic
- retry exact-once behavior
No large hero redesign, new product/function, Meta/WhatsApp API, generic personal-brand redesign, FAQ-form expansion, 4-step replacement funnel, fear/gap copy, green/carrier-free redesign.

## Required verification
Desktop and mobile (~390x844): /kfz hero → CTA → first viewport → scenarios → every scenario routing → questionnaire → validation → contact → consent → submit → success.
Mobile specifically: first viewport after CTA, scenario selection, sticky Weiter if implemented, keyboard/scrolling/safe-area, progress, final consent/submit.
Regression:
- all six scenarios work
- UTM/first-touch retained
- documents still work
- retry does not duplicate
- successful submission creates exactly one usable Kfz inquiry
- authenticated employee can see it in /app/inbox and Leads
- private document authorization still works
- analytics remains PII-free

Run and report exact results:
- npm run test:inbound
- npx tsc --noEmit
- npm run lint
- npm run build
- relevant Kfz E2E/smoke

## Production sequencing
Do not mix unknown production blockers into CRO. First record current master/readiness state. Implement only this CRO block on one Cursor result branch. After checks are green, provide browser evidence and a factual production-smoke handoff. Production deployment/synthetic smoke is authorized by Owner, but never expose secrets or real customer PII. Use unmistakably synthetic data and exactly one successful synthetic Kfz inquiry when performing the final production smoke. Do not create duplicate submissions.

## Definition of done
Each of the five CRO items is either implemented or explicitly documented as unsafe/unnecessary. Desktop/mobile smoke PASS. Submit → production persistence → authenticated AgenturOS Inbox/Leads PASS. No regression. Then STOP: do not invent another AgenturOS feature or further CRO research.

Final report format exactly:
KFZ STATUS: READY / BLOCKED
CHANGED: short
TESTED: short
OWNER ACTION: only what Artjom truly must do manually
NEXT: if READY "Launch Meta test"; if BLOCKED exactly one next blocker.

Main principle: SHIP THE CURRENT /KFZ. No Kfz V2 before real Meta data.
