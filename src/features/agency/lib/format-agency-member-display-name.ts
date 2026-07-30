type ProfileNameFields = {
  display_name: string | null
  first_name: string | null
  last_name: string | null
}

export function formatAgencyMemberDisplayName(profile: ProfileNameFields): string {
  const displayName = profile.display_name?.trim()
  if (displayName) {
    return displayName
  }

  const firstName = profile.first_name?.trim() ?? ''
  const lastName = profile.last_name?.trim() ?? ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  if (fullName) {
    return fullName
  }

  return 'Unbenanntes Mitglied'
}
