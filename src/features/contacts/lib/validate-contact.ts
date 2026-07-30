import type { ContactFieldErrors, ContactInput } from '@/features/contacts/types/contact'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const FIELD_MAX_LENGTH = 200

export function isValidContactId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

export function normalizeOptionalContactField(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function validateContactInput(input: ContactInput): ContactFieldErrors {
  const errors: ContactFieldErrors = {}
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const company = input.company.trim()

  if (!firstName && !lastName && !company) {
    errors.identity =
      'Bitte geben Sie mindestens Vorname, Nachname oder Firma ein.'
  }

  if (firstName.length > FIELD_MAX_LENGTH) {
    errors.firstName = `Der Vorname darf höchstens ${FIELD_MAX_LENGTH} Zeichen lang sein.`
  }

  if (lastName.length > FIELD_MAX_LENGTH) {
    errors.lastName = `Der Nachname darf höchstens ${FIELD_MAX_LENGTH} Zeichen lang sein.`
  }

  if (company.length > FIELD_MAX_LENGTH) {
    errors.company = `Die Firma darf höchstens ${FIELD_MAX_LENGTH} Zeichen lang sein.`
  }

  const email = input.email.trim()
  if (email.length > FIELD_MAX_LENGTH) {
    errors.email = `Die E-Mail darf höchstens ${FIELD_MAX_LENGTH} Zeichen lang sein.`
  }

  const phone = input.phone.trim()
  if (phone.length > FIELD_MAX_LENGTH) {
    errors.phone = `Die Telefonnummer darf höchstens ${FIELD_MAX_LENGTH} Zeichen lang sein.`
  }

  return errors
}

export function hasContactFieldErrors(errors: ContactFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function parseContactFormData(formData: FormData): ContactInput {
  return {
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    company: String(formData.get('company') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    notes: String(formData.get('notes') ?? ''),
  }
}

export function normalizeContactInput(input: ContactInput): {
  first_name: string | null
  last_name: string | null
  company: string | null
  email: string | null
  phone: string | null
  notes: string | null
} {
  return {
    first_name: normalizeOptionalContactField(input.firstName),
    last_name: normalizeOptionalContactField(input.lastName),
    company: normalizeOptionalContactField(input.company),
    email: normalizeOptionalContactField(input.email),
    phone: normalizeOptionalContactField(input.phone),
    notes: normalizeOptionalContactField(input.notes),
  }
}
