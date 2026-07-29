'use server'

import { redirect } from 'next/navigation'

import {
  hasLoginFieldErrors,
  parseLoginFormData,
  validateLoginInput,
} from '../lib/validate-login'
import { completeAuthenticatedSession } from '../services/complete-authenticated-session'
import { signInUser } from '../services/sign-in-user'
import type { LoginActionState } from '../types/login'

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const input = parseLoginFormData(formData)
  const fieldErrors = validateLoginInput(input)

  if (hasLoginFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const signInResult = await signInUser(input)

  if (!signInResult.success) {
    return { error: signInResult.error }
  }

  const sessionResult = await completeAuthenticatedSession()

  if (!sessionResult.success) {
    return { error: sessionResult.error }
  }

  redirect('/app')
}
