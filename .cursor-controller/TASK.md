STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-3d66

# AgenturOS — Daily Kfz inquiry work queue

## Goal
Turn the finished single-inquiry review workspace into a simple daily employee queue: what is new, what needs information, what is being reviewed and what is done.

## Required work
- Reuse the existing normalized Kfz inquiry, manual states, missing-information checklist, internal task, notes and editable draft.
- Add clear counts/filters for New, Missing information, In review and Done.
- Each row must show the customer/request facts, urgency if factual, missing-information status and the next manual action.
- Opening a row must lead to the existing one-screen review workspace.
- AI remains a labeled suggestion requiring human review.
- No sending, automatic status changes, customer contact, Meta/WhatsApp or CRM replacement.
- Add deterministic tests; run inbound tests, TypeScript, lint and build.
- Browser-check desktop/mobile and record exact evidence or blockers.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, customer communication or destructive git.

CONTROLLER_AGENT_ID: bc-fcb7f218-4380-481e-8eb8-3109141d0375
CONTROLLER_STARTED_AT: 2026-09-08T07:43:37Z
