/** Präsentationshilfen nur für das Dashboard (keine Fachlogik). */

export function formatDashboardDateOrTime(value: string, now = new Date()): string {
  const date = new Date(value)
  const berlinDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  if (berlinDay.format(date) === berlinDay.format(now)) {
    return new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin',
    }).format(date)
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Berlin',
  }).format(date)
}

export function splitInboxFeedContent(content: string): {
  title: string
  preview: string | null
} {
  const normalized = content.replace(/\s+/g, ' ').trim()

  if (!normalized) {
    return { title: 'Ohne Inhalt', preview: null }
  }

  const sentenceMatch = normalized.match(/^(.{12,80}?[.!?])\s+(.+)$/u)
  if (sentenceMatch) {
    const preview = sentenceMatch[2].trim()
    return {
      title: sentenceMatch[1].trim(),
      preview: preview.length > 100 ? `${preview.slice(0, 100).trimEnd()}…` : preview,
    }
  }

  if (normalized.length <= 80) {
    return { title: normalized, preview: null }
  }

  return {
    title: `${normalized.slice(0, 80).trimEnd()}…`,
    preview: null,
  }
}

export function getDisplayInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase()
  }
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase()
}
