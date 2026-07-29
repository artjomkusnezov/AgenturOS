import { createClient } from '@/lib/supabase/server'

import type { RegistrationInput, RegistrationResult } from '../types/registration'

function mapSignUpError(message: string): string {
  const normalized = message.toLowerCase()

  if (
    normalized.includes('already registered') ||
    normalized.includes('already been registered') ||
    normalized.includes('user already registered')
  ) {
    return 'Diese E-Mail-Adresse ist bereits registriert.'
  }

  if (normalized.includes('password')) {
    return 'Das Passwort erfüllt nicht die Anforderungen.'
  }

  if (normalized.includes('invalid email')) {
    return 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
  }

  return 'Die Registrierung ist fehlgeschlagen. Bitte versuchen Sie es erneut.'
}

export async function signUpUser(
  input: RegistrationInput
): Promise<RegistrationResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        agency_name: input.agencyName.trim(),
      },
    },
  })

  if (error) {
    return {
      success: false,
      error: mapSignUpError(error.message),
    }
  }

  const hasSession = Boolean(data.session)
  const requiresEmailConfirmation = !hasSession

  return {
    success: true,
    requiresEmailConfirmation,
    hasSession,
  }
}
