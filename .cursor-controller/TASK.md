STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-099b

# AgenturOS — manual Kfz inbox triage

## Goal
Continue the Kfz inquiry presentation branch. Make a new Kfz website inquiry usable by an employee through the existing manual inbox workflow, without contacting the customer or creating a second CRM.

## Required work
- Read AGENTS.md and inspect existing inbox/task actions before editing.
- Use existing status/task/note boundaries only.
- From the Kfz review panel, make the next manual action clear and functional where existing domain actions permit: claim/start review, record an internal note or create an internal follow-up task, and mark handled only through an explicit human action.
- Preserve factual source/customer/request/missing-information display and keep AI output clearly labeled as a suggestion.
- No automatic reply, case creation, tariff/coverage advice or external transmission.
- Add deterministic tests covering normalized Kfz intake → inbox review → explicit manual action and preventing automatic side effects.
- Run `npm run test:inbound`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- Browser-check desktop/mobile where safely available and report exact evidence/blockers.

## Safety
Cursor-created branch only. No master, merge, deploy, production data, secrets, customer communication, Meta/WhatsApp, paid services, CRM duplication or legal/privacy/business decisions.

## Done
An employee can understand and explicitly advance a Kfz inquiry using existing internal workflow actions; nothing is sent automatically; tests/checks and browser evidence are reported.