import { redirect } from 'next/navigation'

import { ResetPasswordForm } from '@/features/auth/components/reset-password-form'
import { createClient } from '@/lib/supabase/server'

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/forgot-password?error=recovery')
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Neues Passwort setzen
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Wählen Sie ein neues Passwort für Ihr Benutzerkonto.
          </p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  )
}
