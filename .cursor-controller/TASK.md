STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-882b

# AgenturOS — Human review history inside each inbound item

## Goal
Let an employee understand what happened to an inbound item by showing a simple factual history of manual review actions inside the existing workspace.

## Required work
- Build on the unified inbox and existing Kfz/manual review workspace.
- Reuse existing normalized records, status changes, notes, internal tasks and saved drafts.
- Show a chronological history of factual manual actions: received, review started, note saved, internal task created, draft saved, manually completed.
- Clearly separate original source facts from later employee actions and AI suggestions.
- Do not invent actors or timestamps; if current fixtures lack them, use deterministic local fixture facts only and document the limitation.
- Opening history must stay within the same inbox item, with a clear return to the work area.
- No automatic status change, reply, task creation, customer contact, provider connection, Meta/WhatsApp or CRM replacement.
- Keep safe local fixtures for browser verification without production data.
- Add deterministic tests; run inbound tests, TypeScript, lint and build.
- Browser-check desktop/mobile and record exact evidence or blockers.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, customer communication or paid services.
