# Cursor Cloud Controller Task

STATUS: READY
STARTING_REF: master

## Title
AGENTUROS — KFZ GROK P0 REPAIR: UPLOAD FLOW + SCENARIO STATE ISOLATION

## Priority
P0 launch blocker. External production QA on 2026-09-17 found two concrete defects before any production submission was made. Repair only these defects; do not expand AgenturOS.

## Source of truth
PR #65 and #66 are merged in master. Kfz production stack exists. External Grok QA verified /kfz desktop/mobile and all six entry scenarios can be opened, but found the two P0 defects below. Grok made ZERO production submissions, so do not spend the single synthetic production smoke submission in this repair task.

## P0 defects to reproduce and repair
1. upload_documents path: choosing the existing "Unterlagen hochladen" entry does not expose the expected document-upload control and can proceed directly toward Kontakt. Restore/ensure the intended existing upload step/control is reachable and understandable in this path. Do not invent a new document system; use the existing private document plumbing from the Kfz stack.
2. Scenario state isolation: switching/restarting from one entry scenario to another can retain answers belonging to the previous scenario (observed EVB → switch_car with EVB fields still present in summary). A newly selected scenario must start with only valid shared fields and must not submit stale scenario-specific answers from another flow.

## Required work
1. Reproduce both defects locally/browser-first from current master before changing code and record exact repro.
2. Implement the smallest bounded fixes using existing Kfz form/document architecture.
3. Add deterministic regression coverage for both contracts:
   - upload_documents exposes the existing upload capability before contact/submit and preserves safe document metadata behavior;
   - changing/restarting scenarios clears incompatible scenario-specific state while preserving only explicitly shared safe state, with summary/payload free of stale answers.
4. Fresh browser QA desktop and ~390x844 covering all six entry scenarios, especially upload_documents and EVB → switch_car plus reverse/another scenario switch. Verify no destructive horizontal overflow or dead end.
5. Verify analytics behavior remains privacy-safe and no PII was added to telemetry.
6. DO NOT submit any production lead in this task. Production E2E smoke is a separate follow-up after this repair is reviewed/deployed under existing owner authorization.

## Tests / quality
Run and report exact results:
- npm run test:inbound
- npx tsc --noEmit
- npm run lint
- npm run build

Add focused regression tests for both P0 defects and report their exact names/results.

## Hard boundaries
No unrelated AgenturOS work. No Meta/WhatsApp API. No auto-replies. No new CRM. No redesign beyond what is necessary for these two defects. No secrets exposure. No paid services. No production data/DB mutation. No production submission. No deploy. No merge. No manual main/master write. No force push or destructive git.

## Deliverable
One Cursor result branch/PR containing only the two bounded P0 repairs, deterministic tests, exact quality results and desktop/mobile browser evidence.

## Definition of done
Both Grok P0 defects are reproduced then demonstrably fixed: upload_documents has a usable existing upload path, and scenario switching cannot leak stale scenario-specific answers into summary/payload. All required checks pass and no production submission occurred.
