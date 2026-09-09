# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-ff2e

## Title
AGENTUROS — PRIVACY-SAFE KFZ FUNNEL ANALYTICS

## Goal
Add a useful first-party analytics layer for the Kfz landing and questionnaire so Artjom can see visits, traffic sources, funnel starts, chosen branches, reached steps, drop-off points, time on page/step and successful submissions without storing customer answers or personal data in analytics and without adding a paid/external analytics service.

## Required work
- Create and work only on one new Cursor-created result branch starting from cursor/agenturos-controller-task-ff2e (PR #39). Do not merge or write to main/master.
- Preserve the approved Kfz landing, six questionnaire branches, normalized exact-once submission, unified inbox, retry/idempotency, search, duplicate review and manual handling by Artjom/Vera.
- Build a first-party analytics event model using the repository's existing storage/adapter patterns only. Do not add Google Analytics, Meta Pixel, Matomo cloud, tracking cookies, fingerprinting, advertising IDs or a new paid service.
- Analytics must never record form answers, names, phone numbers, email, licence plate, vehicle data, uploaded-file metadata, free text, IP address, user agent or full URLs that can contain personal/query data.
- Use an anonymous random session identifier only after the repository's privacy/consent boundary permits analytics. If consent is absent or declined, do not persist or send analytics events. Do not invent legal claims; document this technical boundary for later legal review.
- Record only allow-listed events and coarse factual properties:
  - landing_view
  - traffic_source category and allow-listed UTM campaign/source values with unsafe/free-form values discarded
  - funnel_start
  - initial_branch_selected
  - step_view with stable non-personal step id
  - step_completed
  - back_navigation
  - validation_blocked with stable field/category id only, never entered value
  - submit_started
  - submit_failed with coarse error category
  - submit_succeeded
  - funnel_abandoned derived from last safe step/session timeout or page lifecycle without storing form content
  - total active time and per-step active time, excluding hidden/background time
- Make event writes idempotent where appropriate and resilient to reload/back-forward. Repeated rendering must not inflate visits or completed steps.
- Add an internal AgenturOS Kfz analytics dashboard, clearly separated from the customer landing, showing for selectable periods:
  - visits and funnel starts
  - submissions and conversion rate
  - counts by traffic source/campaign and questionnaire branch
  - users reaching each step
  - drop-off count/rate by step
  - median/average active time on landing and steps
  - validation and submit-failure counts
- Use clear cards/funnel bars, not an Excel-like table as the primary view. Empty/partial data must be honest. No AI interpretation or automatic business action.
- Add deterministic fixtures and tests for consent allowed/declined, event allow-list and redaction, no PII leakage, source sanitization, visit/step deduplication, active-time calculation, reload/back-forward, abandonment, successful exact-once submission and dashboard aggregation.
- Run npm run test:inbound (or full relevant suite), npx tsc --noEmit, npm run lint and npm run build.
- Browser-check desktop and mobile customer flow with consent accepted and declined; one complete submission; one abandonment at a middle step; reload/back-forward; internal dashboard totals, funnel, source, branch, drop-off and timing. Inspect recorded event payloads to prove no form answers or personal data are stored. Record screenshots/video and exact evidence in the PR.

## Safety
Cursor-created branch only. No main/master, merge, auto-merge, deploy, production data, secrets, customer communication, external analytics/Meta/WhatsApp API, paid services, fingerprinting, tracking before consent, new storage vendor, legal claims, force push or destructive git.
