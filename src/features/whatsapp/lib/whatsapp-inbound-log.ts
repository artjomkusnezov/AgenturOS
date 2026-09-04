/**
 * Minimale, sichere Observability für WhatsApp-Inbound.
 * Keine Tokens, keine Secrets, keine vollen Nachrichten/Telefonnummern/Payloads.
 */

export function shortenWhatsAppExternalId(externalId: string | null | undefined): string {
  const value = externalId?.trim() ?? ''
  if (value.length === 0) {
    return 'unknown'
  }
  if (value.length <= 16) {
    return value
  }
  return `${value.slice(0, 12)}…`
}

export function logWhatsAppInbound(
  event: string,
  details: Record<string, string | number | boolean | null | undefined> = {},
): void {
  const safe: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(details)) {
    if (value === undefined || value === null) {
      continue
    }
    safe[key] = value
  }
  console.info('[whatsapp-inbound]', event, safe)
}
