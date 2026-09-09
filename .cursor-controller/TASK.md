# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-e04c

## Title
AGENTUROS — CORRECT KFZ SF CLASSES AND DEDUCTIBLE CHOICES

## Goal
Correct the owner-reviewed Kfz questionnaire so liability and comprehensive no-claims classes are collected separately and Teilkasko/Vollkasko deductibles use clear selectable amounts instead of free text, while preserving the completed questionnaire and privacy-safe analytics.

## Required work
- Create and work only on one new Cursor-created result branch starting from cursor/agenturos-controller-task-e04c (PR #40). Do not merge or write to main/master.
- Preserve the approved landing, all six questionnaire branches, normalized exact-once submission, analytics consent/events/dashboard, unified inbox, retry/idempotency, search and duplicate review.
- Replace the single generic Schadenfreiheitsklasse field with two separate fields:
  - SF-Klasse Haftpflicht
  - SF-Klasse Vollkasko
- Treat the two values independently; they may differ. Never copy one value into the other.
- Teilkasko has no SF class. Never show or store a Teilkasko SF field.
- Ask SF-Klasse Vollkasko only when the customer currently has or provides a known Vollkasko class relevant to the selected branch. Do not require it when not applicable.
- Use selectable chips/dropdowns instead of unrestricted SF free text. Include the supported factual German classes as explicit values: M, 0, S, 1/2, 1 through 50, plus "Weiß ich nicht". Do not calculate, transfer or recommend a class.
- Replace deductible free-text inputs with selectable choices:
  - Teilkasko: 0 €, 150 €, 300 €, 500 €, 1.000 €, Weiß ich nicht
  - Vollkasko: 0 €, 300 €, 500 €, 1.000 €, 2.500 €, Weiß ich nicht
- Show the selected combination clearly, e.g. "Vollkasko 500 € / Teilkasko 150 €".
- Show deductible controls only for the selected desired coverage. Haftpflicht alone shows neither. Teilkasko shows only Teilkasko deductible. Vollkasko shows both Vollkasko and Teilkasko deductibles.
- Remove internal/developer-facing copy such as "Allianz-SB-Stufen sind im Repository nicht dokumentiert" from the customer UI. Use short normal customer wording. Do not add tariff claims or recommendations.
- Update normalized inbox payload and review presentation with separate SF Haftpflicht/SF Vollkasko and structured deductible values. Preserve missing/unknown honestly.
- Keep analytics strictly non-personal: SF and deductible selections/form answers must never enter analytics event properties or dashboard data.
- Preserve back/forward and reload restoration, while consent remains unchecked after reload as already designed.
- Add deterministic tests for separate/different SF values, no Teilkasko SF, conditional Vollkasko SF, all selectable deductible values, coverage-dependent visibility, combination summary, normalized payload, reload/back-forward, exact-once retry and zero leakage into analytics.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build.
- Browser-check desktop and mobile for Haftpflicht-only, Teilkasko and Vollkasko paths; select different liability/Vollkasko SF classes; select VK/TK deductible combination; back/forward; reload; failed submit/retry; exactly one inbox item; analytics inspector contains no SF/deductible values. Record evidence in the PR.

## Safety
Cursor-created branch only. No main/master, merge, auto-merge, deploy, production data, secrets, customer communication, Meta/WhatsApp API, paid service, tariff calculation/recommendation, invented Allianz legal/business rules, force push or destructive git.
