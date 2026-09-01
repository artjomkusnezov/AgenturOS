<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AgenturOS Agent Rules

## Roles

- Owner decides product direction, merge, production deploys, secrets, paid services, destructive actions, and material product ambiguity.
- ChatGPT orchestrates tasks, branches, PRs, CI, review, and repair cycles.
- Cursor/CLI agents implement scoped tasks and tests.
- GitHub is the source of truth.

## Product

AgenturOS is the digital operating layer / memory of a small insurance agency. It is not a CRM replacement and not a second customer database.

Core principle: **Alles beginnt mit einer Information.**

Current desktop direction: **Football Manager × modern business software × AgenturOS**. Real work should feel like a living management system, without fake game mechanics. Prefer real state, real progress, visible people, context, and clear next actions.

Mobile principle: **Mobile First beim Erfassen – Desktop First beim Bearbeiten.**

AI principle: AI proposes and assists; humans make professional decisions.

## Architecture guardrails

- Preserve source systems; inbound integrations create a working copy and do not mutate the original source.
- Adapter = translation, Intake = processing, Inbox = work.
- Inbound adapters contain no business decisions, promotions, case/task creation, priorities, customer matching, or AI decisions.
- Keep provider-neutral inbound contracts.
- Do not expose service-role credentials to clients.
- Do not introduce a new UI library without an explicit product decision.

## Git / autonomy

- Never work directly on `master`.
- Use `agent/*`, `feature/*`, or `fix/*` branches.
- Never merge or enable auto-merge.
- Never force-push `master`.
- Safe, reversible, in-scope technical decisions may be made autonomously.
- Ask the Owner only for merge, production deploy, secrets, paid/external spending, destructive operations, security/permission changes, risky migrations, or material product ambiguity.

## Quality

Baseline deterministic checks:

1. `npm run test:inbound`
2. `npx tsc --noEmit`
3. `npm run lint`
4. `npm run build`

A green unit test is not enough if the real production path is different. Add integration/regression coverage for real user paths when relevant.

## Scope

- Respect TASK acceptance criteria, allowed paths, and out-of-scope sections.
- Do not turn a small fix into a broad refactor.
- Do not change production secrets, production data, domain/inbound architecture, or external services unless the task explicitly authorizes it.
