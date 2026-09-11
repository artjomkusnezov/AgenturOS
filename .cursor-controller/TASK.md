# Cursor Cloud Task

STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-9908

## Title
AGENTUROS — KFZ LAUNCH READINESS CHECK

## Goal
Make the existing Kfz readiness screen give the owner one simple, secret-safe answer about whether questionnaire, persistence, private documents, inbox review and analytics are configured for launch.

## Required work
- Work only on one new Cursor-created branch from cursor/agenturos-controller-task-9908 (PR #50). No merge or main/master write.
- Improve the existing /app/kfz-readiness screen and checks, not a parallel system.
- Check names/presence only for required public configuration, migrations, private bucket/policies, submission persistence, inbox item creation, authorized document review and metadata-only analytics.
- Never read, print or return secret values, form answers, personal data, filenames, object keys or document contents.
- Show clear READY / BLOCKED / UNKNOWN results with one concrete safe next action per failed check.
- Preserve all six Kfz branches, questionnaire, consent, analytics guardrails, private storage, inbox and review routes.
- Use synthetic/test-only probes; do not submit customer data or mutate production.
- Add deterministic tests for configured, missing, partial, unauthorized and unavailable states plus secret redaction.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build; publish exact counts/routes.
- Browser-check desktop and mobile locally/test-only; inspect Vercel Preview read-only if available. No deploy or environment mutation.

## Safety
Cursor-created branch only. No merge, auto-merge, production deploy or mutation, secret changes/reads, customer data/contact, Meta/WhatsApp API, auto-replies, paid services, force push or destructive git.

CONTROLLER_AGENT_ID: bc-a6270c7f-af9f-449b-a371-a2f17ca4796d
CONTROLLER_STARTED_AT: 2026-09-11T03:46:53Z
