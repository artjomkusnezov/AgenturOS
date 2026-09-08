STATUS: READY
STARTING_REF: cursor/agenturos-controller-task-c268

# AgenturOS — Mobile-first Kfz landing intake with documents

## Goal
Replace the current long administrative-looking Kfz form with a clear, trustworthy, mobile-first Allianz Kusnezov landing flow that creates the same normalized human-review inbound item and optionally carries customer documents.

## Required work
- Build directly on the latest Cursor history/inbox result. Reuse the existing Kfz normalization and human-review inbox; do not create a parallel CRM or inbox.
- Redesign /kfz as a focused local landing page for Allianz Kusnezov in Lengerich and Umgebung. It should feel like a modern personal agency landing page, not a government form or a raw table.
- Keep claims factual: personal local review, non-binding inquiry, no online price guarantee, no automatic tariff promise.
- Turn the long form into three short clear steps with visible progress:
  1. request type: Versicherung wechseln / neues Fahrzeug / Zweitwagen / bestehendes Angebot prüfen;
  2. contact details and preferred reply channel;
  3. optional documents plus final review/consent.
- Set preferred reply channel default to WhatsApp. Choices in this order: WhatsApp, Telefon, E-Mail. Store only the customer's preference. Do not send any WhatsApp message and do not connect Meta/WhatsApp APIs.
- For WhatsApp preference require a usable phone number; keep an explicit alternative choice. Do not infer consent for advertising.
- Add two optional document groups: Fahrzeugschein and Vorversicherung / letzte Beitragsrechnung.
- Desktop must allow file selection. Mobile must clearly allow taking a new photo or choosing an existing photo/file using native browser input capabilities.
- Allow multiple images and PDF where supported; show selected filenames/thumbnails, type/size validation, and removal before submit.
- Do not invent or expose permanent storage. If safe authenticated storage is not already implemented, make the local/dev flow deterministic and carry attachment metadata/previews only, clearly document the storage blocker, and do not inspect or add secrets.
- After submit show a simple confirmation: Anfrage ist angekommen. Wir prüfen sie persönlich und melden uns auf dem gewünschten Weg.
- Preserve the manual-first boundary: submission creates an inbound item for employee review; no automatic reply, status decision, quote, task, merge, AI decision, customer communication or provider connection.
- Keep Datenschutz/consent legally neutral and based on existing repository wording; do not make new legal decisions. Keep the visible consent concise with the existing privacy link and detailed text below.
- Make desktop and especially phone layout polished enough for realistic browser review: strong first screen, clear CTA, minimal empty space, large tap targets, no horizontal clipping.
- This is one bounded 2–6 hour product task. Do not redesign the entire AgenturOS application.
- Add deterministic tests for step navigation, WhatsApp default, alternative contact selection, document selection/removal/validation, submit normalization, and zero automatic communication.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint and npm run build.
- Browser-check desktop and mobile: landing → steps → choose/take document input → remove/re-add → submit → normalized inbox card. Record screenshots/video and exact limitations.

## Safety
Cursor-created branch only. No master, merge, deploy, secrets, production data, customer communication, paid services, Meta/WhatsApp connection, legal determination or destructive git.
