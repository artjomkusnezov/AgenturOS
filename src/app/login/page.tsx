import { LoginForm } from '@/features/auth/components/login-form'
import { mapCallbackError } from '@/features/auth/lib/map-login-error'

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const initialError = mapCallbackError(params.error)

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">Anmelden</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Melden Sie sich mit Ihrem Benutzerkonto an.
          </p>
        </div>
        <LoginForm initialError={initialError} />
      </div>
    </div>
  )
}
