import { createClient } from '@/lib/supabase/server'

import { getAuthCallbackUrl } from '../lib/get-site-url'
import { mapPasswordResetRequestError } from '../lib/map-password-recovery-error'
import type { ForgotPasswordInput } from '../types/password-recovery'

export type RequestPasswordResetResult =
  | { success: true }
  | { success: false; error: string }

export async function requestPasswordReset(
  input: ForgotPasswordInput
): Promise<RequestPasswordResetResult> {
  const supabase = await createClient()
  const redirectTo = await getAuthCallbackUrl()

  const { error } = await supabase.auth.resetPasswordForEmail(
    input.email.trim().toLowerCase(),
    { redirectTo }
  )

  if (error) {
    return {
      success: false,
      error: mapPasswordResetRequestError(error.message),
    }
  }

  return { success: true }
}
