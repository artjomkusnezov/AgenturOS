STATUS: READY
STARTING_REF: AUTO_LATEST_CURSOR

# AgenturOS — Kfz review summary and missing information

## Goal
Continue the latest completed Cursor result. Make each Kfz inquiry ready for fast human review with a concise factual summary and clear missing-information checklist.

## Required work
- Reuse normalized inbound records and current human-review inbox.
- Separate submitted facts, missing information and optional AI suggestion.
- Keep every status change and customer response manual.
- Add deterministic tests and run inbound tests, TypeScript, lint and build.
- Browser-check desktop/mobile and record evidence.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, customer communication, Meta/WhatsApp or CRM replacement.
