import { createClient } from '@/lib/supabase/server'

import { bootstrapUserAccount } from './bootstrap-user-account'

const SETUP_ERROR_MESSAGE =
  'Die Konto-Einrichtung ist fehlgeschlagen. Bitte versuchen Sie es erneut.'

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

  try {
    const { error } = await supabase.auth.signOut()
    void error
  } catch {
    // signOut-Fehler dürfen die neutrale Bootstrap-Fehlermeldung nicht überschreiben.
  }

  return {
    success: false,
    error: SETUP_ERROR_MESSAGE,
  }
}
