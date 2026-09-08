STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-80f0

# AgenturOS — Put the Kfz daily queue into the real inbox

## Goal
Move the verified daily Kfz queue from the local preview into the existing authenticated employee inbox/dashboard using real normalized inbound records, without deploying or sending anything.

## Required work
- Reuse the finished counts/filters: New, Missing information, In review and Done.
- Wire them into the existing employee inbox/dashboard route, not only /dev/kfz-work-queue.
- Use existing normalized inbound storage and existing manual states; do not add demo records to production paths.
- Opening an item must lead to the finished one-screen review workspace with facts, missing information, task, notes and editable draft.
- Preserve manual-only status changes. AI remains a labeled suggestion requiring human review.
- No sending, customer contact, Meta/WhatsApp or CRM replacement.
- Add deterministic tests; run inbound tests, TypeScript, lint and build.
- Browser-check the real app route desktop/mobile and record exact evidence or blockers.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, customer communication or destructive git.

CONTROLLER_AGENT_ID: bc-d485b5cb-dcc4-43c4-8aae-e0ecb9c68033
CONTROLLER_STARTED_AT: 2026-09-08T08:51:23Z
