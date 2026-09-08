STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-a84f

# AgenturOS — Kfz work queue and follow-up visibility

## Goal
Continue the finished manual Kfz triage branch. Make Kfz website inquiries and their explicit internal follow-up tasks easy to find in the existing AgenturOS dashboard, without creating a CRM replacement or contacting customers.

## Required work
- Read AGENTS.md and inspect existing dashboard/inbox/task filters and persistence.
- Reuse existing normalized inbound items and task records.
- Make new, in-review and handled Kfz inquiries visibly distinguishable in the existing inbox/dashboard.
- Ensure an explicitly created internal follow-up task appears in the existing task area with a clear source link back to the inquiry where current domain boundaries permit.
- Preserve manual-only status changes, internal notes and AI-as-suggestion labeling.
- Add deterministic tests for intake → manual review → follow-up task visibility and source traceability.
- Run `npm run test:inbound`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- Browser-check desktop/mobile where safely available and record exact evidence/blockers.

## Safety
Cursor-created branch only. No master, merge, deploy, production data, secrets, customer communication, Meta/WhatsApp, paid services, CRM duplication or legal/privacy/business decisions.

## Done
An employee can find a Kfz inquiry by workflow state, create an internal follow-up explicitly, see it in the existing task area and return to the source inquiry; no external side effect occurs; tests and browser evidence are reported.