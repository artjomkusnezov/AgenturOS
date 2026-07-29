import { createClient } from '@/lib/supabase/server'

export type BootstrapUserAccountResult =
  | { success: true; agencyId: string }
  | { success: false; error: string }

/**
 * Ruft die atomare Bootstrap-RPC für den aktuell authentifizierten Benutzer auf.
 * Vorgesehen für den späteren Login-/Callback-Schritt — nicht aus dem Proxy aufrufen.
 */
export async function bootstrapUserAccount(): Promise<BootstrapUserAccountResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: 'Sie sind nicht angemeldet.',
    }
  }

  const { data, error } = await supabase.rpc('initialize_current_user_account')

  if (error || !data) {
    return {
      success: false,
      error: 'Die Konto-Einrichtung ist fehlgeschlagen. Bitte versuchen Sie es erneut.',
    }
  }

  return {
    success: true,
    agencyId: data,
  }
}
