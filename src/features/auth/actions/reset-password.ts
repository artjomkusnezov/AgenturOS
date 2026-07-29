'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import {
  hasResetPasswordFieldErrors,
  parseResetPasswordFormData,
  validateResetPasswordInput,
} from '../lib/validate-reset-password'
import { updateUserPassword } from '../services/update-user-password'
import type { ResetPasswordActionState } from '../types/password-recovery'

export async function resetPasswordAction(
  _prevState: ResetPasswordActionState,
  formData: FormData
): Promise<ResetPasswordActionState> {
  const input = parseResetPasswordFormData(formData)
  const fieldErrors = validateResetPasswordInput(input)

  if (hasResetPasswordFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const updateResult = await updateUserPassword(input.password)

  if (!updateResult.success) {
    return { error: updateResult.error }
  }

  const supabase = await createClient()

  // Bewusste Produktentscheidung:
  // Nach erfolgreichem Passwortwechsel wird die Session beendet,
  // damit sich der Benutzer mit dem neuen Passwort erneut authentifiziert.
  try {
    const { error } = await supabase.auth.signOut()
    void error
  } catch {
    // Weiterleitung trotzdem; keine Fehlermeldung an die UI.
  }

  redirect('/login?message=password-reset')
}
