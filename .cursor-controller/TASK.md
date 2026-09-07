STATUS: READY

# AgenturOS Cursor Cloud pilot

## Goal
Continue the existing Kfz Funnel Gate 2 work from `agent/issue-18` and turn it into a reviewable, browser-verified slice without changing production.

## Required first actions
- Read `AGENTS.md`.
- Inspect open PR #19, its diff, comments, checks, and the exact reason CI shows `action_required`.
- Preserve all correct existing work; do not rebuild the project from scratch.
- Separate a GitHub approval/configuration blocker from a real code failure.

## Acceptance criteria
- The secure Kfz landing-page intake is understandable and usable on mobile and desktop.
- Submitted data enters AgenturOS through the existing normalized intake boundary.
- No automatic customer message, policy advice, tariff/deckung decision, case creation, production write, deployment, Meta or WhatsApp activation.
- Relevant regression tests cover the real intake path.
- Run `npm run test:inbound`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- Perform a browser smoke check and record exactly what was verified.
- Commit changes only to the Cursor-created branch.
- Finish with a concise report: changed files, tests, browser evidence, remaining blockers, and recommended PR target.

## Out of scope
- Merge or auto-merge
- Direct writes to `master`
- Production deployment or production data
- Secrets or permission changes
- WhatsApp/Meta activation
- Paid services or campaigns
- Automatic customer communication
- New CRM or second customer database
- Broad redesign outside the Kfz intake slice
