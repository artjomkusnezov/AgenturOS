import { createClient } from '@/lib/supabase/server'

import { mapLoginError } from '../lib/map-login-error'
import type { LoginInput, LoginResult } from '../types/login'

export async function signInUser(input: LoginInput): Promise<LoginResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  })

  if (error) {
    return {
      success: false,
      error: mapLoginError(error.message),
    }
  }

  return { success: true }
}
