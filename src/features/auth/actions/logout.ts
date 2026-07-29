'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()

  try {
    const { error } = await supabase.auth.signOut()
    void error
  } catch {
    // Defensive Absicherung; Weiterleitung erfolgt trotzdem.
  }

  redirect('/login')
}
