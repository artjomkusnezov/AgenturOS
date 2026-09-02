STATUS: READY

## Goal
Implement the first visible Point 38B Agenturzentrale. The supplied reference screenshot is the BINDING ART-DIRECTION TARGET, not merely inspiration. This task must recreate its overall experience and composition in AgenturOS using real existing product data/functions where available.

## Critical visual requirement
DO NOT interpret this as “make the current dashboard dark”. A recolored SaaS dashboard FAILS this task.

The target must visibly contain the same design language and major composition as the reference:
- full dark premium command-center shell with real spatial depth
- large cinematic office/agency hero scene across the upper center, integrated into the UI rather than a small decorative banner
- greeting layered into the hero (“Guten Morgen …”) and a daily quote integrated prominently into that scene
- daily quote system prepared so the displayed quote can change by day; a small curated local quote set is sufficient for this slice, no external API required
- left navigation rail with strong active state and operational counters where real counts already exist
- central “Die Lage heute” state strip/cards
- operational work zones below: “Was braucht mich jetzt?”, “Aktive Vorgänge”, “Mein nächster Schritt” or equivalent mappings to existing AgenturOS data
- right command/status rail for team/agency state; use real existing data where possible and clearly marked DEMO/PLATZHALTER for planned concepts
- bottom/day-rhythm/quick-action area that makes the page feel like an agency management cockpit rather than a generic card grid
- visible Artjom/Vera/team presence where existing profile/member data permits it
- icons, colored states, subtle glow/depth, layered surfaces, compact information density and management-game hierarchy
- desktop should feel like ENTERING THE REAL AGENCY in the morning

## P0 runtime repair — STILL BROKEN AFTER RUN #12
Owner re-tested the newly deployed commit `b84356d49cb91aae242f4753c693fe2f53b9aa1a` in the Vercel Preview after Vercel reported Ready. `/app` STILL crashes with the same production error page. Visible digest/error number: `2558150778`.

Run #13 found a likely concrete root cause and implemented a repair in the runner, but publication was blocked only by ESLint in `dashboard-page-content.tsx`.

### Preserve the Run #13 repair
Re-implement the same repair from Run #13:
- remove `DashboardVariantProvider` / `useDashboardVariant` from the Agenturzentrale live-data render path
- pass the dashboard variant explicitly as props
- restore Server Components for the dashboard overview, command rail, inbox, attention, my-work, my-tasks, section and task rows so real inbox/case/task objects do not cross a new unsafe Server→Client boundary
- preserve the approved visual composition
- preserve clickable team-task previews
- keep right command rail from `lg`
- keep mobile active-navigation styling correct
- harden malformed live rows/date/content mapping only where needed

### Fix the exact Run #13 validation blocker
The previous attempt failed ESLint with `react-hooks/error-boundaries` because JSX returns were constructed inside a broad `try/catch` in `src/features/dashboard/components/dashboard-page-content.tsx`.

Do NOT solve this by disabling ESLint or suppressing the rule.
Refactor so async/data operations that can throw are caught separately and converted to plain result/state values; perform JSX returns outside `try/catch`. Keep the intended runtime hardening without constructing JSX inside catchable blocks.

### Runtime acceptance is mandatory
A successful build or Vercel Ready status is NOT sufficient. The published PR commit must be Vercel-preview-ready and intended to render authenticated `/app` without error `2558150778`.

## Acceptance criteria
- `/app` renders successfully in Vercel Preview with no HTTP 500 / Server Components render failure / error `2558150778`.
- Run #13 server/client-boundary repair is preserved.
- ESLint passes without rule suppression.
- Tests/typecheck/lint/build pass.
- Hero/office scene + greeting + daily quote remain present.
- Daily quote changes deterministically by date from a curated local set.
- Existing real dashboard data/functions remain functional and are reused where available.
- Existing clickable team-task preview behavior is preserved.
- Mobile active-navigation styling remains correct.
- Right command/status rail remains usable from normal desktop widths (`lg`).
- Planned concepts may appear only when visibly labelled Demo/Geplant.
- No fake XP, levels, rankings, trophies, streaks or fake performance metrics.
- Produce a new Vercel-preview-ready commit on PR #3 for owner browser verification before merge.

## Allowed paths
- src/app/**
- src/components/**
- src/config/**
- src/features/**
- src/lib/**
- src/styles/**
- public/**
- docs/design/**
- package.json

## Out of scope
- No database/schema migrations.
- No inbound email/domain architecture changes.
- No WhatsApp implementation.
- No AI feature implementation.
- No production deployment or merge.
- No broad redesign of Inbox, Tasks, Cases, Files or Contacts.
- No autonomous product decisions beyond the approved 38B art direction.
- No `.agent-loop/**` file changes by the coder.
- No ESLint rule disabling/suppression as a workaround.

## Product rule
Existing function = real data.
Planned function = clearly marked placeholder/demo.
Never present invented data as real.

## Definition of failure
The task is NOT accepted if `/app` still returns HTTP 500 in Preview, if error `2558150778` remains, if the Run #13 boundary repair is lost, if lint is bypassed rather than fixed, or if the result can reasonably be described as “the old AgenturOS dashboard, just darker”.
