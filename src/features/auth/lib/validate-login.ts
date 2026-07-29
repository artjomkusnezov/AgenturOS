import type { LoginFieldErrors, LoginInput } from '../types/login'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateLoginInput(input: LoginInput): LoginFieldErrors {
  const errors: LoginFieldErrors = {}

  if (!input.email.trim()) {
    errors.email = 'Bitte geben Sie Ihre E-Mail-Adresse ein.'
  } else if (!EMAIL_PATTERN.test(input.email.trim())) {
    errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
  }

  if (!input.password) {
    errors.password = 'Bitte geben Sie Ihr Passwort ein.'
  }

  return errors
}

export function hasLoginFieldErrors(errors: LoginFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function parseLoginFormData(formData: FormData): LoginInput {
  return {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  }
}
