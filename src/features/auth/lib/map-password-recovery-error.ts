export function mapPasswordResetRequestError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid email')) {
    return 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
  }

  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Es wurden zu viele Anfragen gesendet. Bitte versuchen Sie es später erneut.'
  }

  return 'Die Anfrage konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.'
}

export function mapUpdatePasswordError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('password')) {
    return 'Das Passwort erfüllt nicht die Anforderungen.'
  }

  if (
    normalized.includes('session') ||
    normalized.includes('jwt') ||
    normalized.includes('expired')
  ) {
    return 'Der Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen.'
  }

  return 'Das Passwort konnte nicht geändert werden. Bitte versuchen Sie es erneut.'
}

export function mapRecoveryQueryError(
  code: string | undefined
): string | undefined {
  if (code === 'recovery') {
    return 'Der Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.'
  }

  return undefined
}

export function mapLoginQueryMessage(
  code: string | undefined
): string | undefined {
  if (code === 'password-reset') {
    return 'Ihr Passwort wurde erfolgreich geändert. Bitte melden Sie sich mit Ihrem neuen Passwort an.'
  }

  return undefined
}
