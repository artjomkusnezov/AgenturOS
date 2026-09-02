STATUS: READY

## Goal
Finish Point 38B by repairing the authenticated `/app` Server Component crash (`2558150778`) and publish a new PR #3 commit for Vercel browser verification. Preserve the approved Agenturzentrale composition and existing 38B UX.

## Current P0 evidence
Agent Task run #17 (`33678863334`) successfully fixed the false-positive boundary regression test. The runtime/boundary production code was intentionally left unchanged. Publication was blocked ONLY because Cursor created an accidental untracked temp file `.gitignore.append-temp`, which failed the Allowed-Path gate. Deterministic validation, commit and push were therefore skipped.

## Required repair
- Preserve the current runtime/boundary implementation and the corrected `dashboard-variant-boundary.test.ts` logic from run #17.
- Re-apply the narrow test fix: TypeScript generic syntax such as `Record<string, unknown>` must not be treated as JSX, while actual JSX construction inside the guarded try/catch must still fail the regression test.
- DO NOT create `.gitignore.append-temp`, helper scripts, temp files, or any files outside Allowed paths. Clean up any accidental temporary file before finishing.
- Do not move JSX back into try/catch.
- Keep plain dashboard DTO mapping, explicit variant props, Server Components, clickable team-task previews, `lg` command rail and mobile active-nav fix.

## Acceptance criteria
- Changed files are only within Allowed paths; specifically `.gitignore.append-temp` does not exist at completion.
- `npm run test:inbound` passes fully.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with no rule suppression.
- `npm run build` passes.
- New commit is pushed to existing branch `agent/issue-2` / PR #3.
- Vercel Preview is produced for that commit.
- `/app` is intended to render authenticated without Server Component error `2558150778`; owner browser verification follows before merge.
- No merge, no production deploy.

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
- No inbound/domain architecture changes.
- No WhatsApp or AI work.
- No broad redesign outside approved 38B.
- No `.agent-loop/**` coder changes.
- No `.gitignore*` changes or temporary files.
- No ESLint/test suppression workaround.
- No production deployment or merge.

## Product rule
Existing function = real data. Planned function = clearly marked Demo/Geplant. Never present invented data as real.
