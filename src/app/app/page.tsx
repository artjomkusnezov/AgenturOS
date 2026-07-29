import { redirect } from 'next/navigation'

import { LogoutButton } from '@/features/auth/components/logout-button'
import { createClient } from '@/lib/supabase/server'

function getDisplayName(user: {
  email?: string
  user_metadata?: Record<string, unknown>
}): string {
  const firstName =
    typeof user.user_metadata?.first_name === 'string'
      ? user.user_metadata.first_name.trim()
      : ''
  const lastName =
    typeof user.user_metadata?.last_name === 'string'
      ? user.user_metadata.last_name.trim()
      : ''

  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  if (fullName) {
    return fullName
  }

  return user.email ?? 'Benutzer'
}

export default async function AppPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const displayName = getDisplayName(user)

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">AgenturOS</h1>
        <p className="mt-4 text-sm text-zinc-600">
          Die Anmeldung war erfolgreich.
        </p>
        <p className="mt-2 text-sm text-zinc-900">
          Angemeldet als <span className="font-medium">{displayName}</span>
        </p>
        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
