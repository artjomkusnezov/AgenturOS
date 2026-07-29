import type {
  ResetPasswordFieldErrors,
  ResetPasswordInput,
} from '../types/password-recovery'

const MIN_PASSWORD_LENGTH = 8

export function validateResetPasswordInput(
  input: ResetPasswordInput
): ResetPasswordFieldErrors {
  const errors: ResetPasswordFieldErrors = {}

  if (!input.password) {
    errors.password = 'Bitte geben Sie ein neues Passwort ein.'
  } else if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = 'Das Passwort muss mindestens 8 Zeichen lang sein.'
  }

  if (!input.passwordConfirmation) {
    errors.passwordConfirmation = 'Bitte bestätigen Sie Ihr neues Passwort.'
  } else if (input.password !== input.passwordConfirmation) {
    errors.passwordConfirmation = 'Die Passwörter stimmen nicht überein.'
  }

  return errors
}

export function hasResetPasswordFieldErrors(
  errors: ResetPasswordFieldErrors
): boolean {
  return Object.keys(errors).length > 0
}

export function parseResetPasswordFormData(
  formData: FormData
): ResetPasswordInput {
  return {
    password: String(formData.get('password') ?? ''),
    passwordConfirmation: String(formData.get('passwordConfirmation') ?? ''),
  }
}
