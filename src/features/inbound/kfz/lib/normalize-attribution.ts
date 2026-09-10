/**
 * Source/UTM-Attribution: sanitize + normalize, unknown bleibt null.
 */

const ATTR_ALLOWED = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,118}$/

export function normalizeAttributionValue(
  raw: string | null | undefined,
  maxLen: number,
): string | null {
  if (raw == null) {
    return null
  }

  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, '-')
  if (!trimmed) {
    return null
  }

  const clipped = trimmed.slice(0, maxLen)
  if (!ATTR_ALLOWED.test(clipped)) {
    return null
  }

  return clipped
}
