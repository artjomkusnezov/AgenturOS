STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-0f60

# AgenturOS — Manual phone, email and note capture

## Goal
Extend the finished fast text capture so an employee can label where information came from — phone call, pasted email or personal note — while keeping one unified inbox and human confirmation.

## Required work
- Reuse the finished paste/type → review → confirm → inbox flow.
- Add a simple source choice: Telefonat, E-Mail eingefügt, Eigene Notiz.
- Keep the original text unchanged and store the selected source in existing provider-neutral metadata.
- Show only safe local suggestions for title/contact facts and label them as suggestions.
- Require explicit human confirmation before creating the inbox item.
- After confirmation, open the existing review workspace and show the source clearly.
- No provider connection, automatic reply, customer contact, task/status automation, Meta/WhatsApp or CRM replacement.
- Add deterministic tests; run inbound tests, TypeScript, lint and build.
- Browser-check desktop/mobile on a safe local route and record exact evidence or blockers.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, customer communication or paid services.

CONTROLLER_AGENT_ID: bc-5b7ff910-bb6c-43e8-964f-b603ed0c6918
CONTROLLER_STARTED_AT: 2026-09-08T11:47:39Z
