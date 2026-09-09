# Cursor Cloud Task

STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-c467

## Title
AGENTUROS — FULL ALLIANZ KFZ QUESTION FLOW WITHOUT DOCUMENTS

## Goal
Add a separate step-by-step Kfz intake branch for customers who cannot upload documents, insure a first or additional car, switch an existing car, or need an eVB. Reproduce the factual Allianz quotation question order, logic, questions and answer options as accurately as the repository's approved sources allow, while keeping the approved AgenturOS Kfz landing visual style. Never show an invented instant price; submit one normalized request for manual review by Artjom or Vera.

## Required work
- Create and work only on one new Cursor-created result branch starting from cursor/agenturos-controller-task-c467 (PR #38). Do not merge PR #38 or write to main/master.
- Preserve the approved Kfz landing, Lengerich/Römer visual, Allianz branding, Artjom/Vera, 05481 9039041, 4.9 stars/48 reviews, existing optional upload path, privacy, retry/idempotency, unified inbox, search and manual duplicate review.
- Add the initial choice exactly:
  - Unterlagen hochladen
  - Keine Unterlagen vorhanden
  - Erstes Auto versichern
  - Weiteres Auto versichern
  - Bestehendes Auto wechseln
  - eVB für Zulassung
- Keep Unterlagen hochladen on the existing optional-document path.
- For all no-document/manual branches, implement a clear multi-step flow collecting every fact needed for manual Allianz Angebotsberechnung: vehicle identification/details, registration situation, ownership/financing when relevant, usage and annual mileage, parking, drivers and dates of birth/licence details, policyholder relationship, SF class and source/transfer logic, previous insurer and policy facts, claims/loss history, desired liability/partial/full coverage and deductibles, optional protection choices only when supported by approved repository sources, start date/eVB purpose, contact and consent.
- Branch questions conditionally so irrelevant questions are not shown. Preserve entered answers when moving back and forward and after reload.
- Do not invent Allianz rules, discounts, eligibility, tariff names, legal wording, premiums or default answers. When an exact Allianz question/order/option is not present in approved repository material, mark the implementation boundary clearly in the PR instead of guessing.
- No instant price, recommendation presented as final, automatic acceptance or policy creation. The final screen must state that Artjom or Vera checks the request manually.
- Submit exactly one normalized inbound item with branch, answers, missing facts and preferred response method. WhatsApp is only a preference; no Meta/WhatsApp API or automatic message.
- Files remain document metadata only. Add no storage service.
- Add deterministic tests for every initial branch, conditional logic, required validation, back/forward and reload persistence, exact-once retry/idempotency, normalized inbox payload, privacy/consent and absence of invented price/automatic communication.
- Run npm run test:inbound (or the complete relevant test suite), npx tsc --noEmit, npm run lint and npm run build.
- Browser-check the preview on desktop and mobile for every initial branch, at least one complete no-document submission, back/forward, reload restore, failed submit/retry producing exactly one inbox item, and the final manual-review message. Put screenshots/video and exact checks in the PR.

## Safety
Cursor-created branch only. No main/master, merge, auto-merge, deploy, production data, secrets, customer communication, Meta/WhatsApp API, paid services, new persistent file storage, invented Allianz/legal/business rules, force push or destructive git.

CONTROLLER_AGENT_ID: bc-09eafdd7-860e-4f80-9560-2f35b576cf93
CONTROLLER_STARTED_AT: 2026-09-09T11:08:50Z
