'use client'

import { useActionState } from 'react'

import { resetPasswordAction } from '@/features/auth/actions/reset-password'
import type { ResetPasswordActionState } from '@/features/auth/types/password-recovery'

const initialState: ResetPasswordActionState = {}

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialState
  )

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-900">
          Neues Passwort
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

      <div className="flex flex-col gap-1">
        <label
          htmlFor="passwordConfirmation"
          className="text-sm font-medium text-zinc-900"
        >
          Passwort bestätigen
        </label>
        <input
          id="passwordConfirmation"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
        />
        {state.fieldErrors?.passwordConfirmation ? (
          <p className="text-sm text-red-600">
            {state.fieldErrors.passwordConfirmation}
          </p>
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
        {isPending ? 'Wird gespeichert…' : 'Passwort speichern'}
      </button>
    </form>
  )
}
