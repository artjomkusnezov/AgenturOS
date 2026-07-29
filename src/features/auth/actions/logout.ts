'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()

  try {
    await supabase.auth.signOut()
  } catch {
    // Weiterleitung auch bei Fehlern, damit der Benutzer den Login erneut versuchen kann.
  }

  redirect('/login')
}
