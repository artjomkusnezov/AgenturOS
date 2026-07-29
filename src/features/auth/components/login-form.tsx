'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { loginAction } from '@/features/auth/actions/login'
import type { LoginActionState } from '@/features/auth/types/login'

type LoginFormProps = {
  initialError?: string
  initialMessage?: string
}

const initialState: LoginActionState = {}

export function LoginForm({ initialError, initialMessage }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  )

  const errorMessage = state.error ?? initialError

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-900">
          E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        {state.fieldErrors?.email ? (
          <p className="text-sm text-red-600">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-900">
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        {state.fieldErrors?.password ? (
          <p className="text-sm text-red-600">{state.fieldErrors.password}</p>
        ) : null}
        <p className="text-right text-sm">
          <Link
            href="/forgot-password"
            className="font-medium text-zinc-900 underline"
          >
            Passwort vergessen?
          </Link>
        </p>
      </div>

      {initialMessage ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {initialMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? 'Anmeldung läuft…' : 'Anmelden'}
      </button>

      <p className="text-center text-sm text-zinc-600">
        Noch kein Konto?{' '}
        <Link href="/register" className="font-medium text-zinc-900 underline">
          Registrieren
        </Link>
      </p>
    </form>
  )
}
