export function getTimeOfDayGreeting(date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Europe/Berlin',
    }).format(date)
  )

  if (hour < 12) {
    return 'Guten Morgen'
  }

  if (hour < 18) {
    return 'Guten Tag'
  }

  return 'Guten Abend'
}

export function getFirstNameFromUser(user: {
  user_metadata?: Record<string, unknown>
}): string | null {
  const firstName =
    typeof user.user_metadata?.first_name === 'string'
      ? user.user_metadata.first_name.trim()
      : ''

  return firstName.length > 0 ? firstName : null
}

type WorkSituationInput = {
  unprocessedInboxCount: number
  attentionCount: number
  myOpenWorkCount: number
}

function sanitizeCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0
  }

  return Math.floor(value)
}

function formatSentence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) {
    return ''
  }
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`
}

export function getWorkSituationHint({
  unprocessedInboxCount,
  attentionCount,
  myOpenWorkCount,
}: WorkSituationInput): string {
  const inboxCount = sanitizeCount(unprocessedInboxCount)
  const needsAttention = sanitizeCount(attentionCount)
  const myWorkCount = sanitizeCount(myOpenWorkCount)
  const sentences: string[] = []

  if (inboxCount === 1) {
    sentences.push('1 neuer Eingang wartet oben')
  } else if (inboxCount > 1) {
    sentences.push(`${inboxCount} neue Eingänge warten oben`)
  }

  if (needsAttention === 1) {
    sentences.push('1 Vorgang braucht Aufmerksamkeit')
  } else if (needsAttention > 1) {
    sentences.push(`${needsAttention} Vorgänge brauchen Aufmerksamkeit`)
  }

  if (myWorkCount === 1) {
    sentences.push('1 offener Punkt unter Meine Arbeit')
  } else if (myWorkCount > 1) {
    sentences.push(`${myWorkCount} offene Punkte unter Meine Arbeit`)
  }

  if (sentences.length === 0) {
    return 'Alles ruhig für den Moment. Nichts braucht gerade deine Aufmerksamkeit.'
  }

  return sentences.map(formatSentence).join(' ')
}

export function getInboxCardDescription(unprocessedCount: number, totalCount: number): string {
  const safeUnprocessed = sanitizeCount(unprocessedCount)
  const safeTotal = sanitizeCount(totalCount)

  if (safeUnprocessed === 0 && safeTotal === 0) {
    return 'Noch nichts erfasst'
  }

  if (safeUnprocessed === 0) {
    return 'Alles bearbeitet'
  }

  if (safeUnprocessed === 1) {
    return '1 offen zur Bearbeitung'
  }

  return `${safeUnprocessed} offen zur Bearbeitung`
}

export function getTasksCardDescription(openCount: number): string {
  const safeOpen = sanitizeCount(openCount)

  if (safeOpen === 0) {
    return 'Keine offenen Aufgaben'
  }

  if (safeOpen === 1) {
    return '1 offene Aufgabe'
  }

  return `${safeOpen} offene Aufgaben`
}

export function getInformationCardDescription(count: number): string {
  const safeCount = sanitizeCount(count)

  if (safeCount === 0) {
    return 'Noch keine Informationen'
  }

  if (safeCount === 1) {
    return '1 gespeicherte Information'
  }

  return `${safeCount} gespeicherte Informationen`
}
