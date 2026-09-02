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

The reference is the desired quality bar for layout, hierarchy, atmosphere and richness. Simplification is allowed only where AgenturOS lacks the underlying feature/data; it is NOT permission to fall back to the existing white/flat dashboard structure.

## Acceptance criteria
- At first glance the implementation clearly resembles the supplied Agenturzentrale reference in composition and experience, not merely color palette.
- Hero/office scene + greeting + daily quote are present.
- Daily quote changes deterministically by date from a curated local set.
- The page has left navigation, central operational cockpit and right status/command rail on desktop.
- Existing real dashboard data/functions remain functional and are reused where available.
- Existing navigation and core workflows are not broken.
- People/team presence is visually stronger where existing member/profile data permits it.
- Operational state is the primary hierarchy: attention, active work, next actions, team/agency state.
- Planned concepts such as weekly goals/statistics may appear only when visibly labelled “Demo”, “Geplant” or equivalent. Invented values must never look like production data.
- DO NOT introduce fake XP, levels, rankings, trophies, streaks or fake performance metrics as if real.
- Responsive behavior remains usable; this slice focuses on desktop and must not degrade mobile.
- Reuse existing AgenturOS tokens/primitives where sensible, but extend them enough to achieve the reference.
- Tests/typecheck/lint/build pass.
- Produce a Vercel-preview-ready branch/PR for Artjom’s visual review before merge.

## Visual assets
The reference screenshot supplied by Artjom is authoritative for this task. If the coding environment cannot directly access that chat image, use this written specification literally and create/choose a suitable local visual treatment for the office hero without depending on an external runtime image URL.

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
- No broad redesign of Inbox, Tasks, Cases, Files or Contacts in this task.
- No autonomous product decisions beyond this approved 38B art direction.

## Product rule
Existing function = real data.
Planned function = clearly marked placeholder/demo.
Never present invented data as real.

## Definition of failure
The task is NOT accepted if the result can reasonably be described as “the old AgenturOS dashboard, just darker”.
