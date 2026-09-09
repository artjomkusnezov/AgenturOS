STATUS: STARTED
STARTING_REF: cursor/agenturos-controller-task-f287

# AgenturOS — Manual preferred-channel reply handoff

## Goal
Turn a reviewed inbound Kfz inquiry into a clear manual reply handoff: the employee sees the customer's chosen channel, prepares or edits the response, copies the exact contact/text, and records what they did without any automatic customer communication.

## Required work
- Build directly on the latest reliable Kfz landing result. Reuse the unified inbound item, Kfz review card, existing notes/tasks/draft/history and human-review boundaries; do not create a CRM or parallel inbox.
- Show the customer's preferred reply channel prominently in the review card: WhatsApp, Telefon or E-Mail, together with the matching factual contact value.
- WhatsApp is a preference only. Do not connect WhatsApp/Meta, open a paid service, send a message, or mark anything contacted automatically.
- Reuse the existing editable response draft. The employee must review and may edit it before any manual action.
- Add safe manual helpers only: copy phone/email, copy the reviewed draft, and for Telefon show a concise call preparation view using only existing inquiry facts and missing-information fields.
- Do not generate legal/tariff advice, prices, promises or automatic decisions. Any AI/suggested wording must remain visibly a draft requiring human review.
- Add explicit manual states/actions: Antwort vorbereiten, als kontaktiert markieren, Rückfrage nötig, erledigt. Each transition must require a deliberate employee action and append a factual history entry.
- Never infer successful contact from copying text or a phone number. Only the explicit manual confirmation may mark contact.
- Preserve original source, request type, preferred channel, missing information, document metadata and consent evidence without mutation.
- Make the card usable on desktop and phone with one clear primary next action and no dense table.
- Add deterministic tests for each channel, copy helpers, editable draft, no automatic send/status change, explicit contact confirmation, factual history entries, missing contact value, and reload persistence.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build.
- Browser-check desktop and mobile: open one WhatsApp-preferred, one phone-preferred and one email-preferred inquiry → edit/copy draft → verify no status change → explicitly mark contacted → verify history and reload. Use fixtures only; do not contact anyone.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, customer communication, Meta/WhatsApp connection, paid services, legal/tariff decisions or destructive git.

CONTROLLER_AGENT_ID: bc-d0965239-ea88-403c-91b8-e57aaac4d427
CONTROLLER_STARTED_AT: 2026-09-09T00:47:14Z
