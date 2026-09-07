STATUS: READY

## Goal
Continue the approved Kfz Funnel on the existing `agent/issue-18` branch and existing Draft PR #19. Gate 3 (public Lengerich Kfz landing page wired into the secure website intake) has passed CI + independent review. Build the next coherent slice: after a Kfz website inquiry reaches AgenturOS Inbox, produce and show a safe AI analysis PROPOSAL for the agent — never an automatic customer action.

Expected internal flow:
`Kfz website inquiry -> existing AgenturOS Inbox item -> AI analysis proposal -> visible internal summary for the human agent`

This task is about useful internal triage. No outbound message, no automatic task/case creation, no tariff promise, no production deployment, no production migration, no customer communication.

## Required proposal fields
Reuse the existing AI inbound foundation and existing domain terminology where already present. For Kfz website leads, the visible proposal should cover only supported fields such as:
- category/service type;
- product = Kfz where confidently known;
- urgency;
- missing information;
- closing intent / sales readiness as a proposal, not fact;
- suggested next human step;
- draft response text clearly marked as draft/proposal;
- human-takeover flag when information is ambiguous, sensitive, contradictory or high-risk.

Do not invent personal data, prices, discounts, tariff results, binding insurance advice or coverage promises. Unknown remains unknown.

## Acceptance criteria
- Continue on existing `agent/issue-18` and update existing Draft PR #19; do not open a second PR.
- Use the existing inbound item and AI-analysis foundations; do not create a parallel CRM/lead database or second AI pipeline.
- Kfz website items can produce an AI proposal from the normalized inbound data already stored/available.
- The proposal is internal-only and visibly labeled as AI suggestion / Entwurf / Vorschlag.
- No automatic send, customer contact, case creation, task creation, contract/tariff action, status change or follow-up scheduling.
- If the AI provider/config is unavailable, the Inbox item must remain usable and show a safe unavailable/not-generated state rather than breaking the page.
- Do not log raw customer payloads, prompts containing unnecessary PII, secrets, provider tokens, or model credentials.
- Keep AI output schema deterministic/validated at the application boundary; malformed provider output must fail safely.
- Reuse existing fields and contracts where possible. Do not add speculative fields just because a model can generate them.
- Add a simple internal visible section in the relevant Inbox/detail flow showing the proposal fields that are already supported.
- Add focused deterministic tests for schema validation, Kfz mapping, missing/unknown data, provider failure, and the guarantee that proposal generation does not trigger outbound/customer-facing side effects.
- Preserve Gate 2 intake, Gate 3 landing page, email/WhatsApp inbound behavior and existing dashboard paths.
- Do not create temporary repository-root helper files such as `.gate4-checks.sh`; run validation commands directly or use files inside allowed paths only.
- `npm run test:inbound` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run build` passes.
- Independent production review must pass.
- Update existing Draft PR #19 with exact check results.

## Final review correction
- Keep this correction limited to the false-green side-effect test unless a real defect is exposed.
- Remove the cosmetic `sideEffects`/constant probe as a claimed runtime guarantee, or stop relying on it as proof.
- Add an enforceable test lock covering `get-inbox-ai-proposal.ts` and the providers it resolves: the test must fail if proposal generation imports or calls outbound messaging, case creation, task creation, inbox-status mutation, or follow-up scheduling code.
- A static import/call boundary assertion is acceptable; a spy/mock that fails on any write is also acceptable.
- Preserve advisory-only production behavior and all existing proposal tests.
- Run `npm run test:inbound`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, then independent review.
- Do not add product features or begin another gate.

## Allowed paths
- `src/app/**`
- `src/components/**`
- `src/features/inbound/**`
- `src/features/ai-inbound/**`
- `src/features/inbox/**`
- `src/lib/**`
- `src/styles/**`
- `src/config/**`
- `tests/**`
- `docs/**`
- `.agent-loop/TASK.md`
- `.env.example`
- `package.json`

## Out of scope
- No merge or auto-merge.
- No deployment, Vercel/domain/DNS changes.
- Do not apply any Supabase migration or change production data.
- No Meta campaign, Pixel, CAPI or advertising spend.
- No WhatsApp onboarding/outbound automation.
- No automatic customer messages, tasks, cases, appointments, tariff recommendations or contractual actions.
- No real customer data or secrets.
- No broad AgenturOS redesign unrelated to the Kfz inbound/AI proposal flow.
- No fake AI confidence, unsupported pricing claims or invented customer facts.

