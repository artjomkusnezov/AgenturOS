# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-32b5

## Title
AGENTUROS — KFZ ANALYTICS CONSENT AND DATA-QUALITY GUARDRAILS

## Goal
Harden the existing privacy-safe Kfz funnel analytics so consent state, duplicate events, invalid transitions and incomplete sessions produce trustworthy aggregates without collecting answers or personal data.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-32b5 (PR #49). No merge or main/master write.
- Extend the existing analytics path and review screen, not a parallel system.
- Verify no analytics event persists before consent; withdrawal stops future collection and does not expose or reconstruct form answers.
- Detect or safely ignore duplicate submissions, impossible step transitions, negative/extreme timings, missing session metadata and malformed referrer/source categories.
- Keep aggregates deterministic and show a small metadata-only data-quality summary with clear empty/unavailable/configuration-missing states.
- Allow only coarse source/referrer categories, visit, branch, reached step, stop point, site/step timing, transitions and submission.
- Never record names, contacts, answers, filenames, object keys, free text, full URLs/query strings, secrets or personal identifiers.
- Preserve all six Kfz branches, questionnaire, consent UI, private storage, inbox and authorized document review.
- Add deterministic tests for consent lifecycle, deduplication, invalid transition/timing rejection and forbidden-field redaction.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts/routes.
- Browser-check desktop and mobile locally/test-only with synthetic fixtures; inspect Vercel Preview read-only if available. No deploy or environment mutation.

## Safety
Cursor-created branch only. No merge, auto-merge, production deploy or mutation, secret changes/reads, customer data/contact, Meta/WhatsApp API, auto-replies, paid services, force push or destructive git.
