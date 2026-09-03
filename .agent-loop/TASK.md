STATUS: READY

## Goal
Start the clean 38B rebuild from the current working master with ONE SMALL VISUAL SLICE ONLY. Preserve the existing working dashboard/server/auth/data path. Do not reuse the failed PR #3 architecture.

Implementation target:
- Add the first Agenturzentrale visual shell to `/app` only.
- Dark premium command-center framing and page atmosphere.
- Preserve existing dashboard content/data/components and behavior as much as possible.
- No Provider/useContext changes.
- No Server→Client boundary changes.
- No data fetching/auth changes.
- No new DB/schema/API work.
- No hero scene yet, no right rail yet, no game mechanics yet.
- This step is intentionally small so runtime failure is easy to isolate.

Critical rule: the existing working `/app` from master must remain functionally intact. This is styling/composition only.

## Acceptance criteria
1. `/app` builds and renders without HTTP 500 / Server Component runtime failure.
2. Existing dashboard real data remains visible and usable.
3. Visual shell clearly moves toward the approved dark Agenturzentrale direction, not a full redesign yet.
4. No new React context/provider/client-boundary architecture.
5. Tests, TypeScript, lint, production build pass.
6. Publish to a branch/PR for Vercel Preview. Do not merge to master.

## Allowed paths
- src/app/**
- src/components/**
- src/features/**
- src/styles/**
- src/config/**
- package.json

## Out of scope
- .agent-loop/**
- database/schema/migrations
- inbound/email/domain architecture
- hero artwork
- right command rail
- weekly goals/XP/levels/rankings
- production deployment
- merge to master

This is a technical implementation of already-approved Point 38B; no new product decisions are required.
