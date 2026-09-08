import type { KfzPreferredChannel } from '@/features/inbound/kfz/types/public-kfz-inquiry'

export const KFZ_LANDING_STEPS = [1, 2, 3] as const
export type KfzLandingStep = (typeof KFZ_LANDING_STEPS)[number]

export const KFZ_LANDING_STEP_LABELS = {
  1: 'Anliegen',
  2: 'Kontakt',
  3: 'Unterlagen',
} as const

export const KFZ_LANDING_REQUEST_TYPES = [
  {
    id: 'switch',
    label: 'Versicherung wechseln',
  },
  {
    id: 'new_vehicle',
    label: 'Neues Fahrzeug',
  },
  {
    id: 'second_car',
    label: 'Zweitwagen',
  },
  {
    id: 'review_offer',
    label: 'Bestehendes Angebot prüfen',
  },
] as const

export type KfzLandingRequestTypeId =
  (typeof KFZ_LANDING_REQUEST_TYPES)[number]['id']

export const KFZ_LANDING_CHANNEL_CHOICES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone', label: 'Telefon' },
  { value: 'email', label: 'E-Mail' },
] as const satisfies ReadonlyArray<{
  value: KfzPreferredChannel
  label: string
}>

export const KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL: KfzPreferredChannel =
  'whatsapp'

export type KfzLandingStep1Input = {
  inquiryReason: string
}

export type KfzLandingStep2Input = {
  fullName: string
  postalCode: string
  city: string
  phone: string
  email: string
  preferredChannel: KfzPreferredChannel
}

export type KfzLandingStepValidation =
  | { ok: true }
  | { ok: false; error: string; code: string }

const REQUEST_TYPE_LABELS = new Set<string>(
  KFZ_LANDING_REQUEST_TYPES.map((entry) => entry.label),
)

export function isKfzLandingRequestTypeLabel(value: string): boolean {
  return REQUEST_TYPE_LABELS.has(value.trim())
}

export function labelKfzLandingRequestType(
  id: KfzLandingRequestTypeId,
): string {
  const match = KFZ_LANDING_REQUEST_TYPES.find((entry) => entry.id === id)
  return match?.label ?? id
}

export function isUsableKfzLandingPhone(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) {
    return false
  }
  const digits = trimmed.replace(/[^\d]/g, '')
  return (
    digits.length >= 7 &&
    digits.length <= 15 &&
    /^\+?[\d\s()./-]+$/.test(trimmed)
  )
}

export function nextKfzLandingStep(step: KfzLandingStep): KfzLandingStep | null {
  if (step === 1) {
    return 2
  }
  if (step === 2) {
    return 3
  }
  return null
}

export function previousKfzLandingStep(
  step: KfzLandingStep,
): KfzLandingStep | null {
  if (step === 3) {
    return 2
  }
  if (step === 2) {
    return 1
  }
  return null
}

export function validateKfzLandingStep1(
  input: KfzLandingStep1Input,
): KfzLandingStepValidation {
  if (!isKfzLandingRequestTypeLabel(input.inquiryReason)) {
    return {
      ok: false,
      error: 'Bitte wählen Sie Ihr Anliegen.',
      code: 'missing_request_type',
    }
  }
  return { ok: true }
}

export function validateKfzLandingStep2(
  input: KfzLandingStep2Input,
): KfzLandingStepValidation {
  if (!input.fullName.trim()) {
    return { ok: false, error: 'Bitte geben Sie Ihren Namen an.', code: 'missing_field' }
  }
  if (!input.postalCode.trim()) {
    return { ok: false, error: 'Bitte geben Sie Ihre PLZ an.', code: 'missing_field' }
  }
  if (!input.city.trim()) {
    return { ok: false, error: 'Bitte geben Sie Ihren Ort an.', code: 'missing_field' }
  }

  const phone = input.phone.trim()
  const email = input.email.trim()

  if (input.preferredChannel === 'whatsapp') {
    if (!isUsableKfzLandingPhone(phone)) {
      return {
        ok: false,
        error:
          'Für WhatsApp benötigen wir eine nutzbare Telefonnummer. Sie können stattdessen Telefon oder E-Mail wählen.',
        code: 'whatsapp_requires_phone',
      }
    }
    return { ok: true }
  }

  if (!phone && !email) {
    return {
      ok: false,
      error: 'Bitte Telefon oder E-Mail angeben.',
      code: 'missing_contact',
    }
  }

  if (phone && !isUsableKfzLandingPhone(phone)) {
    return {
      ok: false,
      error: 'Bitte eine nutzbare Telefonnummer angeben.',
      code: 'invalid_contact',
    }
  }

  return { ok: true }
}

export function canAdvanceKfzLandingStep(
  step: KfzLandingStep,
  input: KfzLandingStep1Input & KfzLandingStep2Input,
): KfzLandingStepValidation {
  if (step === 1) {
    return validateKfzLandingStep1(input)
  }
  if (step === 2) {
    return validateKfzLandingStep2(input)
  }
  return { ok: true }
}
