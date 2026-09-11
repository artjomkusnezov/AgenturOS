# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-8bd0

## Title
AGENTUROS — KFZ RELEASE CHAIN AND MIGRATION HANDOFF

## Goal
Create one precise, secret-safe release handoff for the stacked Kfz work: dependency order, required migrations, verification commands and owner-only production steps, without merging or touching production.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-8bd0 (PR #54). No merge or main/master write.
- Derive the exact stacked PR/commit dependency chain from the current branch and checked-in migrations; do not guess.
- Add or update one concise repository handoff document and surface its status on the existing Kfz readiness screen.
- List required environment variable names only, migration filenames/order, build/test commands, expected readiness checks, Preview checks and rollback-safe stop conditions.
- Never read, print or store secret values, customer data, answers, filenames, object keys, document contents or personal identifiers.
- Make clear which steps are automated/tested and which require the owner; do not perform any owner-only, merge, deployment or production database step.
- Preserve all six Kfz branches, questionnaire, consent, analytics, private storage, inbox and authorized review.
- Add deterministic tests that the handoff matches the checked-in migration order/routes and contains no forbidden values.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts/routes.
- Browser-check readiness/handoff locally on desktop and mobile; inspect Vercel Preview read-only if available.

## Safety
Cursor-created branch only. No merge, auto-merge, production deploy/database mutation, secret changes/reads, customer data/contact, Meta/WhatsApp API, auto-replies, paid services, force push or destructive git.
