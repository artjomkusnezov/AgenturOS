STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-dd22

# AgenturOS — Manual capture into the Kfz review card

## Goal
Let an employee turn a manually entered phone call, pasted email or own note into the existing normalized Kfz human-review card without automatic decisions.

## Required work
- Build on the finished manual source choice and duplicate warning.
- Add one explicit employee choice that the inquiry is a Kfz case; do not classify it automatically.
- Reuse the existing Kfz normalization and review workspace instead of creating a second system.
- Carry the unchanged source text and selected source into the Kfz card.
- Show extracted factual fields as suggestions and list missing information clearly.
- Require explicit human confirmation before the item enters the inbox.
- After confirmation, open the existing Kfz review card with source, facts, missing information, notes, task and editable draft.
- No automatic reply, status change, task creation, customer contact, provider connection, Meta/WhatsApp or CRM replacement.
- Add deterministic tests; run inbound tests, TypeScript, lint and build.
- Browser-check desktop/mobile on safe local fixtures and record exact evidence or blockers.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, customer communication or paid services.

CONTROLLER_AGENT_ID: bc-6b7cbf65-2311-4b0e-ba17-5dda571953ac
CONTROLLER_STARTED_AT: 2026-09-08T13:47:52Z
