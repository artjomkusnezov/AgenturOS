'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { forgotPasswordAction } from '@/features/auth/actions/forgot-password'
import type { ForgotPasswordActionState } from '@/features/auth/types/password-recovery'

type ForgotPasswordFormProps = {
  initialError?: string
}

const initialState: ForgotPasswordActionState = {}

export function ForgotPasswordForm({ initialError }: ForgotPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialState
  )

  if (state.success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
        <p className="font-medium">Anfrage gesendet</p>
        <p className="mt-1 text-sm">
          Falls für diese E-Mail-Adresse ein Konto existiert, wurde eine
          Nachricht zum Zurücksetzen des Passworts versendet.
        </p>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="font-medium text-zinc-900 underline">
            Zurück zur Anmeldung
          </Link>
        </p>
      </div>
    )
  }

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
        {isPending ? 'Wird gesendet…' : 'Link senden'}
      </button>

      <p className="text-center text-sm text-zinc-600">
        <Link href="/login" className="font-medium text-zinc-900 underline">
          Zurück zur Anmeldung
        </Link>
      </p>
    </form>
  )
}
