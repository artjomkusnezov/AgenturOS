STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-5fa3

# AgenturOS — Kfz intake to human-review inbox

## Goal
Continue the completed Kfz landing/intake branch above. Make the manual-first operator path reviewable end to end: a valid Kfz website inquiry enters the existing normalized inbound boundary and is presented in AgenturOS as a clear inbox item for human review. AgenturOS remains a unified inbound operating layer, not a CRM replacement.

## Required work
- Read AGENTS.md and inspect the previous Cursor commit before editing.
- Preserve the secure public Kfz form and its real HTTP handler.
- Trace the real path from landing submission into the existing inbound store/inbox UI.
- Fix only concrete gaps preventing an operator from recognizing source, customer details, request, urgency/missing information and the next manual action.
- AI output, if already present, must remain a suggestion requiring human review. Do not send or execute anything automatically.
- Add deterministic regression coverage for the real form → HTTP → normalized intake → inbox presentation path.
- Run `npm run test:inbound`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- Browser-check the public Kfz form at desktop/mobile and the authenticated inbox only if safely available in the Cloud environment. Record exact evidence and honest blockers.
- Commit only to the new Cursor-created branch and report changed files, checks, browser evidence and recommended PR target.

## Out of scope
No merge/deploy, master writes, production data, secrets, customer communication, automatic reply/case creation, tariff or coverage advice, Meta/WhatsApp activation, paid service, CRM duplication, broad redesign, legal/privacy/business decisions.

## Done
A developer can demonstrate the deterministic Kfz inquiry path into a human-review inbox, all touched checks are green, and browser claims are backed by fresh evidence.