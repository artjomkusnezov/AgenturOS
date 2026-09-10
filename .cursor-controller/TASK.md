# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-d2b8

## Title
AGENTUROS — USABLE PRIVACY-SAFE KFZ FUNNEL BREAKDOWN

## Goal
Make the existing first-party Kfz analytics dashboard useful for daily funnel decisions by adding factual date, traffic-source, initial-branch and step/drop-off breakdowns from the already allow-listed anonymous events, without storing or exposing customer answers or personal data.

## Required work
- Create and work only on one new Cursor-created result branch starting from cursor/agenturos-controller-task-d2b8 (PR #41). Do not merge or write to main/master.
- Preserve the approved landing, all six questionnaire branches, corrected separate SF classes, structured deductibles, exact-once submission, analytics consent boundary, unified inbox, retry/idempotency, search and duplicate review.
- Extend the existing /app/kfz-analytics dashboard, not a parallel product.
- Add factual filters/breakdowns for a small explicit date range, allowed traffic-source category, initial branch, reached step and abandonment/drop-off point.
- Show visits, funnel starts, successful submissions and conversion ratios using only existing allow-listed event types.
- Keep unknown/empty data honest; no invented attribution, benchmark, recommendation, revenue, lead quality or customer identity.
- Ensure analytics never receives or renders form answers, names, phone, email, licence plate, vehicle facts, SF classes, deductibles, filenames, free text, IP, user agent or full URLs.
- Maintain consent-declined behavior: no session id, persistence or event send.
- Make filters usable on desktop and mobile; reload must not duplicate events or inflate counts.
- Add deterministic tests for filters, source/branch/step aggregation, drop-off, empty/unknown states, idempotency and zero PII/form-answer leakage.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build.
- Browser-check desktop and mobile dashboard with empty and local fixture data; verify filters, totals, drop-off and event inspector; search for representative personal/form values and confirm none appear. Record evidence in the PR.

## Safety
Cursor-created branch only. No main/master, merge, auto-merge, deploy, production data, secrets, customer communication, Meta/WhatsApp API, paid tracker, fingerprinting, legal-compliance claim, tariff calculation, force push or destructive git.
