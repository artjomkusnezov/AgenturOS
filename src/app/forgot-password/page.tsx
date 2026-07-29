import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form'
import { mapRecoveryQueryError } from '@/features/auth/lib/map-password-recovery-error'

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string }>
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams
  const initialError = mapRecoveryQueryError(params.error)

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Passwort vergessen
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Link zum
            Zurücksetzen Ihres Passworts.
          </p>
        </div>
        <ForgotPasswordForm initialError={initialError} />
      </div>
    </div>
  )
}
