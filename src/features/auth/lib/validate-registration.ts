import type {
  RegistrationFieldErrors,
  RegistrationInput,
} from '../types/registration'
import { slugifyAgencyName } from '@/lib/utils/slug'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export function validateRegistrationInput(
  input: RegistrationInput
): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {}

  if (!input.firstName.trim()) {
    errors.firstName = 'Bitte geben Sie Ihren Vornamen ein.'
  }

  if (!input.lastName.trim()) {
    errors.lastName = 'Bitte geben Sie Ihren Nachnamen ein.'
  }

  if (!input.agencyName.trim()) {
    errors.agencyName = 'Bitte geben Sie einen Agenturnamen ein.'
  } else if (!slugifyAgencyName(input.agencyName)) {
    errors.agencyName =
      'Der Agenturname muss mindestens einen Buchstaben oder eine Zahl enthalten.'
  }

  if (!input.email.trim()) {
    errors.email = 'Bitte geben Sie Ihre E-Mail-Adresse ein.'
  } else if (!EMAIL_PATTERN.test(input.email.trim())) {
    errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'
  }

  if (!input.password) {
    errors.password = 'Bitte geben Sie ein Passwort ein.'
  } else if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = 'Das Passwort muss mindestens 8 Zeichen lang sein.'
  }

  return errors
}

export function hasFieldErrors(errors: RegistrationFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function parseRegistrationFormData(
  formData: FormData
): RegistrationInput {
  return {
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    agencyName: String(formData.get('agencyName') ?? ''),
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  }
}
