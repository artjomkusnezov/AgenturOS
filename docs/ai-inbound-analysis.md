# AgenturOS – Inbound AI Analysis (foundation)

Advisory analysis layer for normalized inbound information. Humans decide; AI proposes.

## Boundary

```text
Quelle → Adapter → InboundItem → Intake → Inbox
                                         ↓
                              Inbound AI Analysis (this module)
                                         ↓
                              InboundAnalysisSuggestion (advisory only)
                                         ↓
                    ai-inbound (Inbox proposal UI / Kfz Gate 4)
```

| Layer | Role |
|---|---|
| Adapter / Intake | Translate and store working copies — **no** AI decisions |
| `src/features/ai/inbound-analysis` | Domain contract, provider interface, validation, prompt builder, safe fallback |
| `src/lib/ai/inbound-analysis-provider` | Thin re-export of the provider interface |
| `src/features/ai-inbound` | Inbox integration: map website/Kfz items → proposal view, local provider, UI section |
| UI / mutation services | Must not auto-create cases, tasks, or replies from a proposal |

**Rules**

- Downstream of normalized intake only.
- Provider/model output is untrusted and runtime-validated.
- Invalid, incomplete, or failed provider output → deterministic safe fallback with `humanReviewRequired=true` and **no** suggested case/task/reply actions.
- Confidence is a number in **0..1** inclusive.
- Foundation prompt builder does not call an external host by itself.
- Gate 4 Kfz proposals use a **local deterministic heuristic provider** (no paid model host). Disable with `INBOUND_AI_ANALYSIS_ENABLED=false` for a safe unavailable state.
- Do not log raw customer payloads, prompts with unnecessary PII, secrets, or provider tokens.

## Contract (summary)

Input: channel-agnostic `InboundAnalysisInput` (text, attachment names, metadata, optional known context).

Output suggestion fields: summary, intent, productTopic, urgency, missingInformation, purchaseIntent, suggestedCaseAction, suggestedTask, suggestedReplyDraft, humanReviewRequired, humanReviewReason, confidence.

## Gate 4 — Kfz website Inbox proposal

Flow:

```text
Kfz website inquiry → Inbox item → getInboxAiProposal → visible internal KI-Vorschlag
```

- Shown only for Kfz website working copies (`channel/source=website` + `acquisition.product=kfz` or clear Kfz title).
- Labeled **KI-Vorschlag · Entwurf** — internal triage only.
- No automatic send, case/task creation, status change, or follow-up scheduling.
- Supported visible fields reuse the existing analysis contract (category/intent, product, urgency, missing info, purchaseIntent as proposal, next human step via `suggestedTask`, draft reply, human-takeover flag).

Deterministic tests: `tests/ai/inbound-analysis.test.ts`, `tests/ai/kfz-ai-proposal.test.ts` (via `npm run test:inbound`).

## Next integration step

1. Optional: swap/inject an external `InboundAnalysisProvider` without coupling the domain to a vendor (Owner decision; paid services out of default Gate 4).
2. Persist proposals only if a later gate explicitly requires it (no production migration in Gate 4).
3. Keep mutations (case/task/reply) behind explicit human confirmation — never from the analysis result alone.
