import type {
  ForgotPasswordFieldErrors,
  ForgotPasswordInput,
} from '../types/password-recovery'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateForgotPasswordInput(
  input: ForgotPasswordInput
): ForgotPasswordFieldErrors {
  const errors: ForgotPasswordFieldErrors = {}

  if (!input.email.trim()) {
    errors.email = 'Bitte geben Sie Ihre E-Mail-Adresse ein.'
  } else if (!EMAIL_PATTERN.test(input.email.trim())) {
    errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
  }

  return errors
}

export function hasForgotPasswordFieldErrors(
  errors: ForgotPasswordFieldErrors
): boolean {
  return Object.keys(errors).length > 0
}

export function parseForgotPasswordFormData(
  formData: FormData
): ForgotPasswordInput {
  return {
    email: String(formData.get('email') ?? ''),
  }
}
