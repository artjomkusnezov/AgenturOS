const PREVIEW_MAX_LENGTH = 120

export function truncateInboxContentPreview(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()

  if (normalized.length <= PREVIEW_MAX_LENGTH) {
    return normalized
  }

  return `${normalized.slice(0, PREVIEW_MAX_LENGTH).trimEnd()} …`
}
