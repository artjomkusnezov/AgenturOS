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
  openTaskCount: number
  informationCount: number
}

export function getWorkSituationHint({
  unprocessedInboxCount,
  openTaskCount,
  informationCount,
}: WorkSituationInput): string {
  const parts: string[] = []

  if (unprocessedInboxCount === 1) {
    parts.push('1 Eingang wartet auf Bearbeitung')
  } else if (unprocessedInboxCount > 1) {
    parts.push(`${unprocessedInboxCount} Eingänge warten auf Bearbeitung`)
  }

  if (openTaskCount === 1) {
    parts.push('1 offene Aufgabe')
  } else if (openTaskCount > 1) {
    parts.push(`${openTaskCount} offene Aufgaben`)
  }

  if (parts.length > 0) {
    return `${parts.join(' · ')}.`
  }

  if (informationCount > 0) {
    return 'Keine offenen Eingänge oder Aufgaben – Sie können in Ihren Informationen weiterarbeiten.'
  }

  return 'Legen Sie mit einem Eingang, einer Aufgabe oder einer Information los.'
}

export function getInboxCardDescription(unprocessedCount: number, totalCount: number): string {
  if (unprocessedCount === 0 && totalCount === 0) {
    return 'Noch nichts erfasst'
  }

  if (unprocessedCount === 0) {
    return 'Alles bearbeitet'
  }

  if (unprocessedCount === 1) {
    return '1 offen zur Bearbeitung'
  }

  return `${unprocessedCount} offen zur Bearbeitung`
}

export function getTasksCardDescription(openCount: number): string {
  if (openCount === 0) {
    return 'Keine offenen Aufgaben'
  }

  if (openCount === 1) {
    return '1 offene Aufgabe'
  }

  return `${openCount} offene Aufgaben`
}

export function getInformationCardDescription(count: number): string {
  if (count === 0) {
    return 'Noch keine Informationen'
  }

  if (count === 1) {
    return '1 gespeicherte Information'
  }

  return `${count} gespeicherte Informationen`
}
