STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-2ebd

# AgenturOS — One unified inbox for landing and manual intake

## Goal
Let an employee see Kfz landing submissions and manually captured phone, email and note items in one daily inbox, with simple human-controlled filters.

## Required work
- Build on the finished authenticated inbox, Kfz review card, manual source choice, duplicate warning and manual-to-Kfz flow.
- Use the existing normalized inbound records; do not create a parallel inbox.
- Add simple filters for all items, Kfz, other, phone, pasted email and own note.
- Show source, received time, customer/contact fact, short request summary, missing-information state and manual review status on each card.
- Opening any item must use the existing human-review workspace.
- Preserve manual-only status changes, notes, tasks and editable drafts.
- AI suggestions must remain clearly labeled and require human review.
- No automatic classification, reply, status change, task creation, customer contact, provider connection, Meta/WhatsApp or CRM replacement.
- Keep safe local fixtures for browser verification without production data.
- Add deterministic tests; run inbound tests, TypeScript, lint and build.
- Browser-check desktop/mobile and record exact evidence or blockers.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, customer communication or paid services.

CONTROLLER_AGENT_ID: bc-925c4c4c-72f6-48ac-a7d3-d392cec33dfd
CONTROLLER_STARTED_AT: 2026-09-08T15:46:32Z
