# Cursor Cloud Task

STATUS: STARTED
STARTING_REF: master

## Title
AGENTUROS — LEADS WORKSPACE + DASHBOARD INTEGRATION V1

## Priority
P0. Make Kfz leads operationally visible in the employee UI. No unrelated AgenturOS work.

## Context
Owner explicitly approved this task on 2026-09-15 after reviewing the current AgenturOS dashboard.
Kfz production stack is already merged to master and the four required Kfz Supabase migrations have been applied by the owner-authorized launch workflow.

## Product decision
A Kfz website submission is first a Lead, not automatically a full Vorgang.
Use the existing Kfz/inbox persistence as source of truth. Do NOT create a parallel CRM or duplicate customer/inquiry storage.

## Goal
Create one obvious employee workflow for Kfz leads:
public /kfz submission → existing persisted inquiry/inbox item → Leads workspace → qualify/work lead → existing AgenturOS workflow.

## Required UI

### 1. Left navigation
Under "Vorgänge", add "Leads" as the FIRST child item, before Aufgaben.
It must navigate to the real employee leads workspace.
Keep existing navigation responsive and visually consistent.

Target order:
Vorgänge
- Leads
- Aufgaben
- Angebote
- Schäden
- Wiedervorlagen
- existing remaining children

### 2. Dashboard KPI
Replace the top KPI card "LETZTE INFORMATION" with "OFFENE LEADS".
Show a real count derived from existing persisted Kfz lead/inbox facts, never a demo number.
Click opens Leads.
If zero, show a useful zero state, not fake content.

The top KPI row should read conceptually:
Neue Eingänge | Braucht Aufmerksamkeit | Aktive Vorgänge | Offene Leads

### 3. Leads workspace
Create /app/leads (or the repository's canonical equivalent).
Reuse existing Kfz inquiry/inbox data. No second lead database unless absolutely required by an existing schema contract.

Each lead should expose the operational facts already captured and safe for the employee:
- received time
- lead status
- Kfz branch/intent
- customer/contact
- vehicle/questionnaire summary
- coverage/start/history/damage facts where captured
- missing information
- document presence/access through the existing authorized private-document path
- source + UTM/first-touch where stored

Do not expose raw JSON as the normal UI.

### 4. Minimal lead lifecycle
Implement the smallest useful lifecycle compatible with existing storage:
Neu → Kontaktiert → Termin/Angebot → Gewonnen / Verloren.
If existing status infrastructure can represent this, reuse it.
If persistence genuinely needs an additive migration, create it on the Cursor branch and document it; DO NOT apply production migrations in this task.
Do not invent scoring, automation, outbound messages, Meta API, WhatsApp API or CRM duplication.

### 5. Relationship to Eingang/Vorgang
A new Kfz submission may still exist in Eingang as today, but Leads must be the dedicated work surface.
Do not silently create a Vorgang just because a lead exists.
Where an existing supported action can promote/link the inquiry to a Vorgang/task/offer, reuse it. Otherwise show a truthful next action without inventing backend semantics.

### 6. Browser proof
Use a synthetic/local or preview-safe Kfz lead.
Prove on desktop and about 390x844:
- Leads appears under Vorgänge as first child
- Offene Leads replaces Letzte Information and count is real
- KPI click opens Leads
- Leads list opens a Kfz lead
- captured Kfz/contact/source facts are readable
- private document path remains authorized
- status change persists after reload if implemented
- Eingang and existing Vorgänge remain functional

No feature is considered available without browser evidence.

## Tests / quality
Run the full relevant suite including at minimum:
- npm run test:inbound
- npx tsc --noEmit
- npm run lint
- npm run build
- new deterministic tests for lead selection/count/status/navigation
Report exact numbers/results.

## Non-goals / safety
- No Meta Ads implementation
- No WhatsApp API
- No auto-replies
- No unrelated AgenturOS features
- No new CRM/customer master
- No production deploy
- No production DB mutation
- No secrets
- No master/main write
- No force push
- Do not weaken Kfz privacy, RLS, private storage or analytics protections

## Deliverable
One Cursor-created branch and one PR with implementation, tests, exact browser evidence and a concise migration note if an additive migration is required.

## Definition of done
An employee opening AgenturOS immediately sees the real count of open Kfz leads on the dashboard, can open Leads from the first child under Vorgänge, inspect a usable Kfz lead and its existing source/document facts, and work its minimal status without breaking Eingang or existing Vorgänge.

CONTROLLER_AGENT_ID: bc-a8befae3-ff05-410d-a696-03d69aa86842
CONTROLLER_STARTED_AT: 2026-09-15T13:36:36Z
