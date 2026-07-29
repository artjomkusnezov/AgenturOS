import { redirect } from 'next/navigation'

import { AppShell } from '@/components/app/app-shell'
import { createClient } from '@/lib/supabase/server'
import { getDisplayName } from '@/lib/user/get-display-name'

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const displayName = getDisplayName(user) ?? 'Benutzer'

  return <AppShell userDisplayName={displayName}>{children}</AppShell>
}
