'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { registerAction } from '@/features/auth/actions/register'
import type { RegistrationActionState } from '@/features/auth/types/registration'

const initialState: RegistrationActionState = {}

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    registerAction,
    initialState
  )

  if (state.success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
        <p className="font-medium">Registrierung erfolgreich</p>
        <p className="mt-1 text-sm">
          Bitte bestätigen Sie Ihre E-Mail-Adresse. Anschließend werden Sie
          angemeldet und Ihr Konto eingerichtet.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="firstName" className="text-sm font-medium text-zinc-900">
          Vorname
        </label>
        <input
          id="firstName"
          name="firstName"
          type="text"
          autoComplete="given-name"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        {state.fieldErrors?.firstName ? (
          <p className="text-sm text-red-600">{state.fieldErrors.firstName}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="lastName" className="text-sm font-medium text-zinc-900">
          Nachname
        </label>
        <input
          id="lastName"
          name="lastName"
          type="text"
          autoComplete="family-name"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        {state.fieldErrors?.lastName ? (
          <p className="text-sm text-red-600">{state.fieldErrors.lastName}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="agencyName" className="text-sm font-medium text-zinc-900">
          Agenturname
        </label>
        <input
          id="agencyName"
          name="agencyName"
          type="text"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        {state.fieldErrors?.agencyName ? (
          <p className="text-sm text-red-600">{state.fieldErrors.agencyName}</p>
        ) : null}
      </div>

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
          autoComplete="new-password"
          required
          minLength={8}
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        {state.fieldErrors?.password ? (
          <p className="text-sm text-red-600">{state.fieldErrors.password}</p>
        ) : null}
      </div>

      {state.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? 'Registrierung läuft…' : 'Registrieren'}
      </button>

      <p className="text-center text-sm text-zinc-600">
        Bereits ein Konto?{' '}
        <Link href="/login" className="font-medium text-zinc-900 underline">
          Anmelden
        </Link>
      </p>
    </form>
  )
}
