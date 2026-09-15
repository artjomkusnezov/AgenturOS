STATUS: READY

## Goal
Continue the latest completed Cursor result. Let an employee prepare and edit a response draft inside the inquiry while ensuring nothing is sent automatically.

## Required work
- Add an editable internal draft associated with the inquiry.
- Label AI text as a suggestion requiring human review.
- Provide no send integration and no automatic external side effect.
- Preserve source traceability, internal notes and tasks.
- Add deterministic tests and run inbound tests, TypeScript, lint and build.
- Browser-check desktop/mobile and record evidence.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, customer communication, Meta/WhatsApp or CRM replacement.

Controller safety: Work only on the new Cursor-created branch. Never write main, merge, deploy, change production data, inspect/expose secrets, rewrite history, force-push, reset/clean user work, or self-assign another task. Read AGENTS.md first. Preserve provider-neutral intake and mandatory human review. Never contact customers or activate Meta/WhatsApp. Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build once.
