export function getDisplayName(user: {
  email?: string
  user_metadata?: Record<string, unknown>
}): string | null {
  const firstName =
    typeof user.user_metadata?.first_name === 'string'
      ? user.user_metadata.first_name.trim()
      : ''
  const lastName =
    typeof user.user_metadata?.last_name === 'string'
      ? user.user_metadata.last_name.trim()
      : ''

  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  if (fullName) {
    return fullName
  }

  if (user.email) {
    return user.email
  }

  return null
}

export function getGreetingName(user: {
  email?: string
  user_metadata?: Record<string, unknown>
}): string | null {
  const firstName =
    typeof user.user_metadata?.first_name === 'string'
      ? user.user_metadata.first_name.trim()
      : ''

  if (firstName) {
    return firstName
  }

  return getDisplayName(user)
}

export function getGermanDateLabel(date = new Date()): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}
