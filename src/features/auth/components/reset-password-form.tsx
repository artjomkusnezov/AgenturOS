'use client'

import { useActionState } from 'react'

import { resetPasswordAction } from '@/features/auth/actions/reset-password'
import type { ResetPasswordActionState } from '@/features/auth/types/password-recovery'
import {
  aosAlertErrorClassName,
  aosFieldErrorSmClassName,
  aosInputClassName,
  aosTextLabelClassName,
} from '@/lib/design-system'

const initialState: ResetPasswordActionState = {}

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialState
  )

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className={aosTextLabelClassName}>
          Neues Passwort
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

      <div className="flex flex-col gap-1">
        <label
          htmlFor="passwordConfirmation"
          className={aosTextLabelClassName}
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
          className={aosInputClassName}
        />
        {state.fieldErrors?.passwordConfirmation ? (
          <p className={aosFieldErrorSmClassName}>
            {state.fieldErrors.passwordConfirmation}
          </p>
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
        {isPending ? 'Wird gespeichert…' : 'Passwort speichern'}
      </button>
    </form>
  )
}
