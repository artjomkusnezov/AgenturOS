'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { loginAction } from '@/features/auth/actions/login'
import type { LoginActionState } from '@/features/auth/types/login'
import {
  aosAlertErrorClassName,
  aosAlertSuccessClassName,
  aosFieldErrorSmClassName,
  aosInputClassName,
  aosLinkInlineClassName,
  aosTextLabelClassName,
} from '@/lib/design-system'

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
        <label htmlFor="email" className={aosTextLabelClassName}>
          E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={aosInputClassName}
        />
        {state.fieldErrors?.email ? (
          <p className={aosFieldErrorSmClassName}>{state.fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className={aosTextLabelClassName}>
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={aosInputClassName}
        />
        {state.fieldErrors?.password ? (
          <p className={aosFieldErrorSmClassName}>{state.fieldErrors.password}</p>
        ) : null}
        <p className="text-right text-sm">
          <Link
            href="/forgot-password"
            className={aosLinkInlineClassName}
          >
            Passwort vergessen?
          </Link>
        </p>
      </div>

      {initialMessage ? (
        <p className={aosAlertSuccessClassName}>
          {initialMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className={aosAlertErrorClassName}>
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
        <Link href="/register" className={aosLinkInlineClassName}>
          Registrieren
        </Link>
      </p>
    </form>
  )
}
