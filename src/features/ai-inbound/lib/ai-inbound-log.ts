/**
 * Safe logging for AI inbound proposal — no raw payloads, prompts, PII, or secrets.
 */

export function logAiInbound(
  event: string,
  fields: Record<string, string | number | boolean | null | undefined> = {},
): void {
  const safe: Record<string, string | number | boolean | null> = { event }
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue
    }
    safe[key] = value
  }
  console.info('[ai-inbound]', safe)
}
