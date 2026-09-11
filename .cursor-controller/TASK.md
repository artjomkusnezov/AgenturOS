# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-13c0

## Title
AGENTUROS — KFZ AGGREGATE PERFORMANCE VIEW

## Goal
Extend the existing privacy-safe Kfz analytics review with useful period, source and branch comparisons so the owner can see where visits become inquiries without exposing individual sessions or personal data.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-13c0 (PR #51). No merge or main/master write.
- Improve the existing /app/kfz-analytics view and aggregation path, not a parallel dashboard.
- Add deterministic period presets and aggregate comparisons for coarse source/referrer category, selected branch, visits, starts, reached step, stop point, transitions, timing and submissions.
- Show conversion and drop-off only for aggregates; small/empty groups must remain honest and must not expose row-level sessions.
- If export already exists, keep it aggregate-only; otherwise do not add a new export.
- Never record or display names, contacts, answers, filenames, object keys, free text, full URLs/query strings, secrets or personal identifiers.
- Preserve consent/data-quality guardrails, all six Kfz branches, questionnaire, private storage, inbox and authorized review.
- Add deterministic tests for date boundaries, filters, aggregate math, empty/small groups and forbidden-field redaction.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts/routes.
- Browser-check desktop and mobile locally/test-only with synthetic fixtures; inspect Vercel Preview read-only if available. No deploy or environment mutation.

## Safety
Cursor-created branch only. No merge, auto-merge, production deploy or mutation, secret changes/reads, customer data/contact, Meta/WhatsApp API, auto-replies, paid services, force push or destructive git.
