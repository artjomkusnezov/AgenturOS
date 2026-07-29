'use server'

import { redirect } from 'next/navigation'

import {
  hasFieldErrors,
  parseRegistrationFormData,
  validateRegistrationInput,
} from '../lib/validate-registration'
import { completeAuthenticatedSession } from '../services/complete-authenticated-session'
import { signUpUser } from '../services/sign-up-user'
import type { RegistrationActionState } from '../types/registration'

export async function registerAction(
  _prevState: RegistrationActionState,
  formData: FormData
): Promise<RegistrationActionState> {
  const input = parseRegistrationFormData(formData)
  const fieldErrors = validateRegistrationInput(input)

  if (hasFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const result = await signUpUser(input)

  if (!result.success) {
    return { error: result.error }
  }

  if (result.hasSession) {
    const sessionResult = await completeAuthenticatedSession()

    if (!sessionResult.success) {
      return { error: sessionResult.error }
    }

    redirect('/app')
  }

  return {
    success: true,
    requiresEmailConfirmation: result.requiresEmailConfirmation,
  }
}
