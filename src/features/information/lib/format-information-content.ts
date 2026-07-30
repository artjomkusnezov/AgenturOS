const PREVIEW_MAX_LENGTH = 120

export function truncateInformationContentPreview(content: string | null): string | null {
  if (!content) {
    return null
  }

  const normalized = content.replace(/\s+/g, ' ').trim()

  if (!normalized) {
    return null
  }

  if (normalized.length <= PREVIEW_MAX_LENGTH) {
    return normalized
  }

  return `${normalized.slice(0, PREVIEW_MAX_LENGTH).trimEnd()} …`
}
