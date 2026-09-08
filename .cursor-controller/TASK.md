STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-0f60

# AgenturOS — Fast manual intake into the real inbox

## Goal
Let an employee capture a new customer information item in under 10 seconds by pasting or typing text, then review the normalized draft before it enters the real inbox.

## Required work
- Add one obvious manual quick-capture action to the authenticated app/inbox.
- Accept plain text only in this task; no email provider, voice, PDF, Meta or WhatsApp integration.
- Create a normalized inbound draft using existing provider-neutral fields.
- Show the source text and proposed structured fields before saving.
- Require an explicit human confirmation to create the inbox item; no automatic customer contact, task creation, status change or AI decision.
- After confirmation, open the existing human-review workspace.
- Keep AI-derived fields clearly labeled as suggestions if existing local logic supplies them; otherwise keep capture fully manual.
- Add deterministic tests; run inbound tests, TypeScript, lint and build.
- Browser-check desktop/mobile on a safe local route and record exact evidence or blockers.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, customer communication, Meta/WhatsApp, paid services or CRM replacement.
