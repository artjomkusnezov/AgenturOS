import { createClient } from '@/lib/supabase/server'

import { mapUpdatePasswordError } from '../lib/map-password-recovery-error'

export type UpdateUserPasswordResult =
  | { success: true }
  | { success: false; error: string }

export async function updateUserPassword(
  password: string
): Promise<UpdateUserPasswordResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return {
      success: false,
      error: mapUpdatePasswordError(error.message),
    }
  }

  return { success: true }
}
