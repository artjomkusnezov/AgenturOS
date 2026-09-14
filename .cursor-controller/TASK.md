# Cursor Cloud Task

STATUS: READY
STARTING_REF: cursor/kfz-launch-merge-5f6f

## Title
AGENTUROS / KFZ — FINAL PRODUCTION LAUNCH READINESS

## Priority
P0. Finish the existing Kfz launch. Do not build new AgenturOS features.

## Source of truth
Repository: artjomkusnezov/AgenturOS
Integration PR: #62
Branch/ref: cursor/kfz-launch-merge-5f6f
PR #62 is the only Kfz integration PR to consider for master. Do not merge older stacked Kfz PRs separately.

## Goal
Bring the already-built Kfz stack to a proven production-launch handoff. The critical product path is:
/kfz → persistence/Supabase → inbox_items → authenticated /app/inbox → usable Kfz inquiry → authorized private document.

The work is not done merely because automated tests pass. The remaining priority is to prove that a real employee can receive and work a Kfz inquiry in the production-equivalent path.

## Required work

### 1. Final integration audit
- Rebase/merge current master only if needed on the Cursor-created working branch; do not write master.
- Verify PR #62 still contains the complete intended Kfz release stack and no required Kfz work exists only in older stacked PRs.
- Verify /kfz public route, six entry branches, questionnaire, consent, submit/retry, idempotency, private documents, inbox creation/review, UTM/first-touch and privacy-safe analytics.
- Fix only launch-blocking Kfz defects. No redesign and no unrelated features.
- Run npm run test:inbound, npx tsc --noEmit, npm run lint, npm run build and relevant Kfz/Supabase preflight checks. Report exact results.

### 2. Prove the employee inbox experience
Audit the real authenticated /app/inbox, not only /dev/inbox.
A Kfz inquiry must expose enough existing data for an employee to process it without database/dev tools, including where already captured: customer/contact, selected Kfz branch, vehicle/questionnaire information, coverage/start/history/damage information, missing information, uploaded documents, notes/task/status where already supported, and operational source/UTM where intended.
If launch-critical stored information is not visible, make the minimum presentation fix. Do not create a new CRM.

### 3. Remove dev-only proof assumptions
Inventory every launch proof that previously depended on /dev/inbox, /dev/kfz-readiness, /dev/kfz-document, mocks, synthetic-only persistence or local-only assumptions.
For each record: production equivalent, proven YES/NO, blocker.
A /dev route is not accepted as production launch proof.

### 4. Production configuration contract
Verify the exact required migrations and order. Expected set:
- 20260906120000_inbox_website_channel_source.sql
- 20260909140000_kfz_funnel_analytics_events.sql
- 20260910120000_kfz_inbound_documents_bucket.sql
- 20260911120000_kfz_funnel_analytics_persistence_contract.sql
Confirm completeness from code; do not guess.
List every required Vercel production/preview environment variable by NAME ONLY, with purpose, required/optional, scope, and a verification method that never exposes secret values.
Do not read or print secret values and do not add paid services.

### 5. Minimize owner-only work
For every action that genuinely requires owner credentials/approval, provide an exact click-by-click checklist: where to go, what to set/apply, what not to expose, how to verify, and what success looks like. Target less than 10–15 minutes of owner work. Do not ask the owner to inspect code.

### 6. Merge/deploy gate
Do not merge, deploy, mutate production DB, or change secrets without explicit authorization available to this run.
Prepare a single gate:
PR #62 MERGEABLE
CI GREEN
MIGRATIONS READY
ENV NAMES KNOWN
OWNER ACTION REQUIRED
SAFE TO MERGE
SAFE TO DEPLOY AFTER CONFIG
All YES/NO with evidence.
Do not merge PR #61 or older stacked PRs separately.

### 7. Production smoke plan/evidence
If production execution is explicitly authorized and credentials are available, perform ONE clearly synthetic Kfz submission through public /kfz and verify:
- success confirmation;
- exactly one persisted inquiry;
- exactly one relevant inbox item;
- authenticated employee sees and opens it in /app/inbox;
- operational Kfz/contact details are usable;
- synthetic private document is accessible only through authorized path and no public bucket URL is exposed;
- UTM/first-touch persists;
- privacy-safe analytics contains no questionnaire answers, names, email, phone or other PII.
Use the safest supported proof for retry/idempotency; do not intentionally damage production.
If production execution is not authorized/possible, stop at the gate and provide the exact one-shot smoke procedure instead of pretending it passed.

### 8. Desktop/mobile launch smoke
Browser-check production-equivalent /kfz on desktop and about 390x844 mobile: landing, all six entries, questionnaire, validation, consent, submit and confirmation. Fix launch blockers only.
Verify no dev/test copy, placeholders, broken images/dead CTAs, internal terminology or broken legal/privacy links.

### 9. Marketing handoff only
Do not implement Meta Ads.
Document the stable successful-submit point/event suitable for a future Meta Lead conversion and verify UTM/first-touch survives the funnel. Do not add Pixel/CAPI unless already present and explicitly in scope. No PII in funnel analytics.

### 10. Controller cleanup
This task supersedes the stale privacy-safe Kfz bottleneck-summary task. Do not continue analytics merely because the old TASK.md said STARTED. Preserve valid completed analytics code, but the sole priority is Kfz production launch readiness.

## Required final artifact
Create/update KFZ_PRODUCTION_LAUNCH_STATUS.md containing only:
STATUS: READY / BLOCKED / LIVE
PUBLIC URL
PR
COMMIT
TESTS
DESKTOP PASS/FAIL
MOBILE PASS/FAIL
SUPABASE MIGRATIONS APPLIED/PENDING
PRODUCTION ENV READY/PENDING (names only; never values)
REAL /KFZ SUBMISSION PASS/FAIL/NOT YET AUTHORIZED
REAL /APP/INBOX PASS/FAIL/NOT YET AUTHORIZED
PRIVATE DOCUMENT PASS/FAIL/NOT YET AUTHORIZED
UTM PASS/FAIL
DUPLICATE PROTECTION PASS/FAIL
PRIVACY PASS/FAIL
BLOCKERS
OWNER ACTIONS
NEXT ACTION: exactly one next action

## Definition of done
Kfz is DONE only when public /kfz works, a synthetic production customer can submit, the inquiry persists, the employee sees exactly one usable Kfz inquiry in authenticated /app/inbox, private documents remain authorized, UTM is retained, retry does not duplicate, privacy-safe analytics contains no PII, and desktop/mobile smoke passes.
If owner authorization/config is the only blocker, report STATUS: BLOCKED with the smallest possible owner checklist.
Do not start another product task after this task.

## Safety
Cursor-created branch only. No master write, merge, auto-merge, production deploy/database mutation, secret value reads/changes, customer contact/data, Meta/WhatsApp API, auto-replies, paid services, force push or destructive git unless a later explicit owner authorization specifically permits the relevant production action.
