import type { InboundAnalysisInput } from '@/features/ai/inbound-analysis/types'

export type InboundAnalysisInstructions = {
  system: string
  user: string
}

const SYSTEM_INSTRUCTIONS = `You are an advisory inbound-information analyzer for a German insurance agency (AgenturOS).

Return structured data only. Prefer a single JSON object matching the required schema. Do not wrap the answer in markdown. Do not add commentary outside the JSON.

Rules:
- Do not invent customer facts that are not present in the supplied text, attachments list, metadata, or knownContext.
- Do not make coverage, legal, tariff, or contract decisions.
- Do not claim a case or contact match unless knownContext supplies clear evidence.
- Escalate uncertainty to human review (humanReviewRequired=true with a clear reason).
- Suggestions are advisory only. Never imply that a case, task, or reply was created or sent.
- German customer text is expected and must be understood; do not assume a single inbound channel.
- confidence must be a number from 0 to 1 inclusive.
- If evidence is weak, set confidence low and humanReviewRequired=true.
- suggestedCaseAction must be "none", "find_existing", or "suggest_new". Use "find_existing" only with evidence in knownContext; otherwise prefer "suggest_new" or "none".
- suggestedTask is an object with title, reason, priority ("low"|"normal"|"high"), or null.
- suggestedReplyDraft is a draft string or null. Drafts must not invent facts or commit the agency.
- intent: "service" | "claim" | "new_business" | "unclear"
- urgency: "low" | "normal" | "high" | "immediate"
- purchaseIntent: "none" | "possible" | "strong" | "unclear"
- missingInformation: string array of important gaps (empty if none).
- productTopic: short product/topic label (e.g. "Kfz"), or "unclear".
- summary: concise German or neutral summary of what the customer wants.`

/**
 * Builds provider-agnostic analysis instructions.
 * Does not call any external service. Safe to log without secrets.
 */
export function buildInboundAnalysisInstructions(
  input: InboundAnalysisInput,
): InboundAnalysisInstructions {
  const payload = {
    channel: input.channel,
    externalId: input.externalId ?? null,
    title: input.title ?? null,
    content: input.content ?? null,
    kind: input.kind ?? null,
    receivedAt: input.receivedAt ?? null,
    sender: input.sender ?? null,
    attachments: input.attachments ?? [],
    metadata: input.metadata ?? null,
    knownContext: input.knownContext ?? null,
  }

  const user = [
    'Analyze the following normalized inbound information.',
    'Respond with one JSON object only, using these keys:',
    'summary, intent, productTopic, urgency, missingInformation, purchaseIntent,',
    'suggestedCaseAction, suggestedTask, suggestedReplyDraft, humanReviewRequired,',
    'humanReviewReason, confidence.',
    '',
    'Inbound payload:',
    JSON.stringify(payload, null, 2),
  ].join('\n')

  return {
    system: SYSTEM_INSTRUCTIONS,
    user,
  }
}
