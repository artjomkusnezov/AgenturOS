STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-cc15

# AgenturOS — Fast factual search across unified inbound

## Goal
Let an employee find an existing inbound item in seconds across landing inquiries, phone captures, pasted emails and notes using factual customer/contact/content fields, while preserving the existing work queue and human-review flow.

## Required work
- Build directly on the latest factual work-queue Cursor branch. Reuse the unified inbound list, filters, review card, manual statuses/history and existing normalized fields; do not create a CRM or parallel search store.
- Add one clear search field to the existing inbound queue.
- Search only already-visible/authorized normalized data available to the current app path: customer name, phone, email, postal code/city, request type/product, vehicle registration/vehicle facts where present, source, short summary and original text where the existing review model already exposes it.
- Make matching forgiving for case, spaces and common phone formatting, but deterministic. Do not use external enrichment, fuzzy identity merging or AI guesses.
- Show why each result matched with a short factual excerpt/highlight, without exposing new hidden fields.
- Combine search with the existing factual filters and time groups. Clearing search must restore the exact prior queue/filter state.
- No-result state must offer clear manual options: clear search or create a new manual capture. Do not create automatically.
- Opening a result must preserve search/filter state on return and after reload where the existing local state convention allows it.
- Search must never change status, mark contact, merge duplicates, send a message or create a task.
- Keep phone and desktop usable with fast keyboard focus and large touch controls; avoid dense tables.
- Add deterministic tests for all inbound sources, name/contact/phone-format/original-text matches, combined filters, match explanations, no results, clear, state preservation, reload and zero mutations.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build.
- Browser-check desktop and mobile: search one landing inquiry by name, phone and vehicle fact; one phone/email/note item by content; combine with “Noch nicht kontaktiert”; open/return/reload; verify no statuses/history changed. Fixtures only.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, external enrichment, AI identity decision, automatic merge/status/task/customer communication, paid services or destructive git.
