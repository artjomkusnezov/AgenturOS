/**
 * Best-effort: Ursprünglichen Absender aus Weiterleitungs-Text/HTML erkennen.
 * Nur technische Heuristik — keine Kundensuche.
 */
export function extractOriginFromForwardedBody(
  plainText?: string | null,
  html?: string | null,
): { displayName?: string | null; address: string } | null {
  const source = `${plainText ?? ''}\n${html ?? ''}`
  if (!source.trim()) {
    return null
  }

  const patterns = [
    /(?:^|\n)\s*(?:From|Von)\s*:\s*(?:"?([^"<\n]+)"?\s*)?<?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})>?/i,
    /----------\s*Forwarded message\s*----------[\s\S]*?From:\s*(?:"?([^"<\n]+)"?\s*)?<?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})>?/i,
  ]

  for (const pattern of patterns) {
    const match = source.match(pattern)
    if (match?.[2]) {
      return {
        displayName: match[1]?.trim() || null,
        address: match[2].trim().toLowerCase(),
      }
    }
  }

  return null
}

export function parseEmailAddressHeader(
  value: string | null | undefined,
): { displayName?: string | null; address: string } | null {
  if (!value?.trim()) {
    return null
  }

  const trimmed = value.trim()
  const angle = trimmed.match(/^(.*?)<\s*([^>]+)\s*>$/)
  if (angle) {
    const address = angle[2].trim()
    if (!address.includes('@')) {
      return null
    }
    const displayName = angle[1].replace(/^"|"$/g, '').trim()
    return {
      displayName: displayName || null,
      address,
    }
  }

  if (trimmed.includes('@')) {
    return { displayName: null, address: trimmed }
  }

  return null
}

export function buildFallbackMessageId(parts: {
  receivedAt: string
  from: string
  subject: string
  bodyPreview: string
}): string {
  const material = [
    parts.receivedAt,
    parts.from,
    parts.subject,
    parts.bodyPreview.slice(0, 200),
  ].join('|')

  let hash = 0
  for (let i = 0; i < material.length; i += 1) {
    hash = (hash * 31 + material.charCodeAt(i)) >>> 0
  }

  return `generated-${hash.toString(16)}-${parts.receivedAt.replace(/[^0-9]/g, '').slice(0, 14)}`
}
