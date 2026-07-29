import { createAdminClient } from '@/lib/supabase/admin'
import { slugifyAgencyName } from '@/lib/utils/slug'

import {
  hasFieldErrors,
  validateRegistrationInput,
} from '../lib/validate-registration'
import type {
  RegistrationInput,
  RegistrationResult,
} from '../types/registration'

function mapAuthError(message: string): string {
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

function mapDatabaseError(code: string | undefined): string | null {
  if (code === '23505') {
    return 'Dieser Agenturname ist bereits vergeben. Bitte wählen Sie einen anderen Namen.'
  }

  return null
}

async function rollbackRegistration(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  agencyId?: string
) {
  if (agencyId) {
    await admin.from('agencies').delete().eq('id', agencyId)
  }

  await admin.auth.admin.deleteUser(userId)
}

export async function registerUser(
  input: RegistrationInput
): Promise<RegistrationResult> {
  const fieldErrors = validateRegistrationInput(input)

  if (hasFieldErrors(fieldErrors)) {
    return {
      success: false,
      error: 'Bitte prüfen Sie Ihre Eingaben.',
    }
  }

  let admin: ReturnType<typeof createAdminClient>

  try {
    admin = createAdminClient()
  } catch {
    return {
      success: false,
      error:
        'Die Registrierung ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.',
    }
  }

  const email = input.email.trim().toLowerCase()
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const agencyName = input.agencyName.trim()
  const slug = slugifyAgencyName(agencyName)

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return {
      success: false,
      error: mapAuthError(authError?.message ?? 'Unbekannter Fehler'),
    }
  }

  const userId = authData.user.id

  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    first_name: firstName,
    last_name: lastName,
    display_name: `${firstName} ${lastName}`.trim(),
  })

  if (profileError) {
    await rollbackRegistration(admin, userId)
    return {
      success: false,
      error:
        mapDatabaseError(profileError.code) ??
        'Die Registrierung ist fehlgeschlagen. Bitte versuchen Sie es erneut.',
    }
  }

  const { data: agency, error: agencyError } = await admin
    .from('agencies')
    .insert({
      name: agencyName,
      slug,
      created_by: userId,
    })
    .select('id')
    .single()

  if (agencyError || !agency) {
    await rollbackRegistration(admin, userId)
    return {
      success: false,
      error:
        mapDatabaseError(agencyError?.code) ??
        'Die Registrierung ist fehlgeschlagen. Bitte versuchen Sie es erneut.',
    }
  }

  const { error: membershipError } = await admin.from('agency_memberships').insert({
    agency_id: agency.id,
    user_id: userId,
    role: 'owner',
    status: 'active',
  })

  if (membershipError) {
    await rollbackRegistration(admin, userId, agency.id)
    return {
      success: false,
      error:
        mapDatabaseError(membershipError.code) ??
        'Die Registrierung ist fehlgeschlagen. Bitte versuchen Sie es erneut.',
    }
  }

  return { success: true }
}
