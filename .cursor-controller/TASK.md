# Cursor Cloud Task

STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-83d4

## Title
AGENTUROS — PORT APPROVED KFZ LANDING REDESIGN ONTO CURRENT INBOUND FLOW

## Goal
Bring the owner-approved Kfz landing redesign from GitHub commit 80684551915024cd151fc31c54d5549759e85605 into the latest Cursor-created AgenturOS result while preserving the working normalized intake, retry/idempotency, unified inbox, search and manual duplicate review.

## Required work
- Create and work only on a new Cursor-created result branch starting from cursor/agenturos-controller-task-83d4 (PR #37).
- Use feature/kfz-landing-redesign commit 80684551915024cd151fc31c54d5549759e85605 only as the approved visual/content source. Port its Kfz landing changes and assets onto the current Cursor branch; do not merge branches, rewrite history, or discard newer inbound work.
- Preserve the approved elements: second Lengerich hero with Römer, Allianz logo, Artjom and Vera, phone/WhatsApp 05481 9039041, 4.9 stars/48 Google reviews, clear funnel entry and switching option, privacy in the form, upload explicitly optional, FAQ, direct contact CTA, and official imprint/privacy/address/email content already present in that source commit.
- Preserve the existing three-step Kfz intake and its normalized inbound submission, double-submit protection, retry/draft behavior, optional document metadata/camera picker, unified queue, factual search, manual response tools and exact duplicate review.
- WhatsApp remains a preferred contact channel only. Do not add Meta integration, automatic messages, CRM replacement behavior, uploads to a new storage service, analytics, tracking, cookies, or invented claims.
- Resolve conflicts conservatively. Missing facts must remain missing; do not invent legal or marketing text.
- Add/update deterministic tests for landing content, optional upload, privacy, contact preference, single normalized submission, retry/idempotency and no automatic communication.
- Run npm run test:inbound (or the repository's complete relevant test command), npx tsc --noEmit, npm run lint and npm run build.
- Browser-check the live preview on desktop and mobile: hero/contact facts, three-step form, optional upload, failure/retry, exactly one inbox item, search and duplicate review. Record screenshots/evidence in the PR.

## Safety
Cursor-created branch only. No master/main, merge, auto-merge, deploy, production data, secrets, customer communication, Meta/WhatsApp API, paid services, legal/privacy/business decisions, force push or destructive git.

CONTROLLER_AGENT_ID: bc-639fd0a5-a248-43b2-88b7-363b0c412c02
CONTROLLER_STARTED_AT: 2026-09-09T08:55:53Z
