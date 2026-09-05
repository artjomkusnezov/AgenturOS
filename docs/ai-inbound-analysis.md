# AgenturOS – Inbound AI Analysis (foundation)

Advisory analysis layer for normalized inbound information. Humans decide; AI proposes.

## Boundary

```text
Quelle → Adapter → InboundItem → Intake → Inbox
                                         ↓
                              Inbound AI Analysis (this module)
                                         ↓
                              InboundAnalysisSuggestion (advisory only)
```

| Layer | Role |
|---|---|
| Adapter / Intake | Translate and store working copies — **no** AI decisions |
| `src/features/ai/inbound-analysis` | Domain contract, provider interface, validation, prompt builder, safe fallback |
| `src/lib/ai/inbound-analysis-provider` | Thin re-export of the provider interface |
| UI / mutation services | Out of scope here — must not auto-create cases, tasks, or replies |

**Rules**

- Downstream of normalized intake only.
- Provider/model output is untrusted and runtime-validated.
- Invalid, incomplete, or failed provider output → deterministic safe fallback with `humanReviewRequired=true` and **no** suggested case/task/reply actions.
- Confidence is a number in **0..1** inclusive.
- No customer data is sent to an external provider in this foundation task.

## Contract (summary)

Input: channel-agnostic `InboundAnalysisInput` (text, attachment names, metadata, optional known context).

Output suggestion fields: summary, intent, productTopic, urgency, missingInformation, purchaseIntent, suggestedCaseAction, suggestedTask, suggestedReplyDraft, humanReviewRequired, humanReviewReason, confidence.

## Next integration step

1. Implement `InboundAnalysisProvider` with a chosen model host (without coupling the domain to a vendor).
2. Call `analyzeInboundItem` from a **non-adapter** service after intake, persist or display the suggestion for human review.
3. Keep mutations (case/task/reply) behind explicit human confirmation — never from the analysis result alone.
