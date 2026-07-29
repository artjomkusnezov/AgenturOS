'use server'

import {
  hasForgotPasswordFieldErrors,
  parseForgotPasswordFormData,
  validateForgotPasswordInput,
} from '../lib/validate-forgot-password'
import { requestPasswordReset } from '../services/request-password-reset'
import type { ForgotPasswordActionState } from '../types/password-recovery'

export async function forgotPasswordAction(
  _prevState: ForgotPasswordActionState,
  formData: FormData
): Promise<ForgotPasswordActionState> {
  const input = parseForgotPasswordFormData(formData)
  const fieldErrors = validateForgotPasswordInput(input)

  if (hasForgotPasswordFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const result = await requestPasswordReset(input)

  if (!result.success) {
    return { error: result.error }
  }

  return { success: true }
}
