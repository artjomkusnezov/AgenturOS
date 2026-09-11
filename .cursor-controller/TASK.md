# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-75b0

## Title
AGENTUROS — PRIVACY-SAFE KFZ FUNNEL ANALYTICS REVIEW

## Goal
Make the existing Kfz funnel analytics useful and safely reviewable: sources and transitions, visits, selected branch, reached step, stop point, site/step timing and submission, without collecting answers or personal data.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-75b0 (PR #48). No merge or main/master write.
- Improve the existing analytics implementation and review screen, not a parallel analytics system.
- Cover source/referrer category, visit, selected branch, reached step, stop point, time on site and per step, transitions and submission.
- Store and display metadata only. Never record form answers, names, contact data, filenames, document contents, object keys, free text, full URLs/query strings, secrets or identifiers that can expose a person.
- Make repeat/retry events idempotent where applicable and keep useful aggregate counts deterministic.
- Provide clear empty, unavailable and configuration-missing states without printing environment values.
- Preserve all six Kfz branches, questionnaire, consent, private storage, inbox and authorized document review.
- Add deterministic tests proving allowed fields and rejecting/redacting forbidden payload fields.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts/routes.
- Browser-check desktop and mobile locally/test-only with synthetic data; inspect Vercel Preview read-only if available. No deploy or environment mutation.

## Safety
Cursor-created branch only. No merge, auto-merge, production deploy or mutation, secret changes/reads, customer data/contact, Meta/WhatsApp API, auto-replies, paid services, force push or destructive git.
