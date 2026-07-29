export function mapLoginError(message: string): string {
  const normalized = message.toLowerCase()

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid credentials')
  ) {
    return 'E-Mail-Adresse oder Passwort sind nicht korrekt.'
  }

  if (normalized.includes('email not confirmed')) {
    return 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.'
  }

  return 'Die Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut.'
}

export function mapCallbackError(code: string | undefined): string | undefined {
  if (code === 'callback') {
    return 'Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.'
  }

  if (code === 'setup') {
    return 'Die Konto-Einrichtung ist fehlgeschlagen. Bitte versuchen Sie es erneut.'
  }

  return undefined
}
