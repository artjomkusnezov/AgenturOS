'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { registerAction } from '@/features/auth/actions/register'
import type { RegistrationActionState } from '@/features/auth/types/registration'
import {
  aosAlertErrorClassName,
  aosAlertSuccessClassName,
  aosFieldErrorSmClassName,
  aosInputClassName,
  aosLinkInlineClassName,
  aosTextLabelClassName,
} from '@/lib/design-system'

const initialState: RegistrationActionState = {}

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    registerAction,
    initialState
  )

  if (state.success) {
    return (
      <div className={aosAlertSuccessClassName}>
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
        <label htmlFor="firstName" className={aosTextLabelClassName}>
          Vorname
        </label>
        <input
          id="firstName"
          name="firstName"
          type="text"
          autoComplete="given-name"
          required
          className={aosInputClassName}
        />
        {state.fieldErrors?.firstName ? (
          <p className={aosFieldErrorSmClassName}>{state.fieldErrors.firstName}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="lastName" className={aosTextLabelClassName}>
          Nachname
        </label>
        <input
          id="lastName"
          name="lastName"
          type="text"
          autoComplete="family-name"
          required
          className={aosInputClassName}
        />
        {state.fieldErrors?.lastName ? (
          <p className={aosFieldErrorSmClassName}>{state.fieldErrors.lastName}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="agencyName" className={aosTextLabelClassName}>
          Agenturname
        </label>
        <input
          id="agencyName"
          name="agencyName"
          type="text"
          required
          className={aosInputClassName}
        />
        {state.fieldErrors?.agencyName ? (
          <p className={aosFieldErrorSmClassName}>{state.fieldErrors.agencyName}</p>
        ) : null}
      </div>

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
          autoComplete="new-password"
          required
          minLength={8}
          className={aosInputClassName}
        />
        {state.fieldErrors?.password ? (
          <p className={aosFieldErrorSmClassName}>{state.fieldErrors.password}</p>
        ) : null}
      </div>

      {state.error ? (
        <p className={aosAlertErrorClassName}>
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
        <Link href="/login" className={aosLinkInlineClassName}>
          Anmelden
        </Link>
      </p>
    </form>
  )
}
