STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-7f68

# AgenturOS — Reliable Kfz landing submit and retry

## Goal
Make the new three-step /kfz landing safe and dependable when submission is slow, retried or temporarily unavailable: keep the customer's work visible, prevent duplicate inbound items, and always leave the final decision with an employee.

## Required work
- Build directly on the latest Cursor Kfz landing result branch. Reuse the existing normalized inbound path and unified human-review inbox; do not create another inbox or CRM.
- Preserve the accepted three-step mobile-first landing, WhatsApp default preference, Telefon/E-Mail alternatives, optional Fahrzeugschein/Vorversicherung selection, existing consent wording and metadata-only document limitation.
- Add explicit submit states in simple German: ready, sending, received, and failed/retryable.
- While sending, prevent double clicks and repeated browser submissions from creating duplicate inbound items.
- Keep one stable submission identity across a retry of the same prepared inquiry. A retry after timeout, back/forward navigation or repeated response must resolve to the same normalized inbound item.
- On a network/config/server failure, keep all typed form fields and currently selected local files/previews available on the page so the customer can retry or correct data. Do not claim that files were stored.
- If a full page reload happens, safely restore ordinary text/select draft fields where the existing client architecture allows it, but clearly require the user to reselect documents because browsers do not restore file bytes. Do not persist consent as pre-checked.
- After confirmed success, clear the local draft and show the existing personal-review confirmation. Do not automatically navigate away or send a message.
- Ensure preferred contact, request type and document metadata arrive once in the existing review card, with no automatic reply, merge, task, status decision or AI/customer communication.
- Keep production behavior honest: missing intake configuration must remain an explicit error, never fake success.
- Add deterministic tests for double-click, timeout then retry, stable submission identity, no duplicate inbox item, retained fields/files after failure, reload draft restoration with document reselect notice, consent not restored as checked, and clearing after success.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build.
- Browser-check desktop and mobile: fill all three steps → select documents → force a failed submit → verify data remains → retry through the real handler/test seam → verify one inbox item and success confirmation. Record exact environment limitations.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, binary document storage, customer communication, paid services, Meta/WhatsApp connection, legal determination or destructive git.

CONTROLLER_AGENT_ID: bc-0281c4b0-3f1a-42ad-a00c-626b6803dbdf
CONTROLLER_STARTED_AT: 2026-09-08T22:44:47Z
