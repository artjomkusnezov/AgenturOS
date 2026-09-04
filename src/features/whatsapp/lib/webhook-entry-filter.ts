/**
 * Optional future WABA / phone_number_id allowlist seams.
 * Empty / unset allowlists preserve current behavior (accept all).
 * No real production identifiers are hardcoded.
 */

export function parseOptionalIdAllowlist(
  raw: string | null | undefined,
): string[] {
  const value = raw?.trim() ?? ''
  if (value.length === 0) {
    return []
  }
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

/**
 * When both allowlists are empty, every entry is accepted (current behavior).
 * When an allowlist is set, the corresponding id must match if present on the webhook.
 * Missing webhook ids are not rejected solely for being absent — only mismatches fail.
 */
export function isWhatsAppWebhookEntryAllowed(input: {
  wabaId: string | null
  phoneNumberId: string | null
  allowedWabaIds: string[]
  allowedPhoneNumberIds: string[]
}): boolean {
  const { allowedWabaIds, allowedPhoneNumberIds } = input

  if (allowedWabaIds.length === 0 && allowedPhoneNumberIds.length === 0) {
    return true
  }

  if (allowedWabaIds.length > 0 && input.wabaId) {
    if (!allowedWabaIds.includes(input.wabaId)) {
      return false
    }
  }

  if (allowedPhoneNumberIds.length > 0 && input.phoneNumberId) {
    if (!allowedPhoneNumberIds.includes(input.phoneNumberId)) {
      return false
    }
  }

  return true
}
