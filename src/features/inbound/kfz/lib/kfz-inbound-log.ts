/**
 * Kfz-Inbound-Logging: nur technische Events, keine Kunden-Payloads,
 * keine Tokens, keine Signaturen, kein Consent-Text, keine Dokumente.
 */
export function logKfzInbound(
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
  console.info('[inbound:kfz]', safe)
}
