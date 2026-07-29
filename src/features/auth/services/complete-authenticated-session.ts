import { createClient } from '@/lib/supabase/server'

import { bootstrapUserAccount } from './bootstrap-user-account'

export type CompleteAuthenticatedSessionResult =
  | { success: true }
  | { success: false; error: string }

/**
 * Führt den atomaren Account-Bootstrap aus. Bei Fehler wird die Session beendet,
 * damit kein authentifizierter Benutzer in einem unvollständigen Zustand verbleibt.
 */
export async function completeAuthenticatedSession(): Promise<CompleteAuthenticatedSessionResult> {
  const bootstrapResult = await bootstrapUserAccount()

  if (bootstrapResult.success) {
    return { success: true }
  }

  const supabase = await createClient()
  await supabase.auth.signOut()

  return {
    success: false,
    error: bootstrapResult.error,
  }
}
