'use server'

import {
  hasFieldErrors,
  parseRegistrationFormData,
  validateRegistrationInput,
} from '../lib/validate-registration'
import { registerUser } from '../services/register-user'
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

  const result = await registerUser(input)

  if (!result.success) {
    return { error: result.error }
  }

  return { success: true }
}
