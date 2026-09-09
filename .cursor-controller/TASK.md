STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-e134

# AgenturOS — Factual unattended-inbound work queue

## Goal
Help the agency see which inbound items still need human attention using only factual timestamps and explicit statuses: what arrived today, what has never been contacted, and what was last worked on—without automatic urgency, SLA, scoring or customer communication.

## Required work
- Build directly on the latest manual reply-handoff branch. Reuse the unified inbound queue, Kfz review card, manual status/history and all existing sources; do not create a CRM or parallel dashboard.
- Add a concise factual work-queue view for all existing inbound sources: landing, phone, pasted email and note.
- Show received time, last human action time, preferred reply channel when present, current explicit status, missing-information marker and whether an explicit “contacted” history event exists.
- Provide clear factual filters: Neu eingegangen, noch nicht kontaktiert, Rückfrage nötig, in Prüfung, erledigt.
- Provide factual time groupings only: Heute, Gestern, Älter. Use the repository's local timezone convention if one exists; otherwise keep exact timestamps and document the limitation.
- Default ordering should prevent quiet loss of old untouched items while remaining factual. Do not assign lead quality, commercial value, urgency, SLA breach or AI priority.
- Copying contact/draft must not remove an item from “not contacted”. Only an explicit manual contacted action changes it.
- Every manual status transition must remain in the existing factual history and survive reload.
- Preserve source facts, consent, preferred channel, document metadata, notes, tasks and drafts.
- Make desktop and phone layouts quickly scannable with one primary next action per card and no dense spreadsheet.
- Add deterministic tests for all sources, filters, today/yesterday/older boundaries, never-contacted semantics, copy-without-status-change, explicit contact, manual completion, sorting and reload.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build.
- Browser-check desktop and mobile with fixtures containing new, yesterday, older, contacted, Rückfrage and completed items; verify filters/order, open review card, copy without status change, explicitly contact, return to queue and reload. Do not contact anyone.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, customer communication, Meta/WhatsApp connection, paid services, invented SLA/priority/scoring, legal/business decision or destructive git.

CONTROLLER_AGENT_ID: bc-dfd1b93f-9eb4-4f6d-a100-b30f3fc6dcb3
CONTROLLER_STARTED_AT: 2026-09-09T02:43:53Z
