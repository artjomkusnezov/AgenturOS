import {
  getKfzLandingBranch,
  isKfzLandingBranchLabel,
  isQuestionnaireBranch,
  resolveKfzLandingBranchId,
  validateKfzQuestionScreen,
  validateKfzQuestionnaireComplete,
  type KfzLandingScreen,
  type KfzQuestionnaireAnswers,
} from '@/features/inbound/kfz/lib/kfz-questionnaire'
import type { KfzPreferredChannel } from '@/features/inbound/kfz/types/public-kfz-inquiry'

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

export type KfzLandingStepValidation =
  | { ok: true }
  | { ok: false; error: string; code: string }

export type KfzLandingContactInput = {
  fullName: string
  postalCode: string
  city: string
  phone: string
  email: string
  preferredChannel: KfzPreferredChannel
}

export type KfzLandingAdvanceInput = KfzLandingContactInput & {
  inquiryReason: string
  branchId?: string
  questionnaireAnswers?: KfzQuestionnaireAnswers
  inquiryProcessingConsent?: boolean
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

export function validateKfzLandingBranch(
  input: { branchId?: string; inquiryReason: string },
): KfzLandingStepValidation {
  const branchId = resolveKfzLandingBranchId(input.branchId, input.inquiryReason)
  if (!branchId) {
    return {
      ok: false,
      error: 'Bitte wählen Sie, womit wir starten sollen.',
      code: 'missing_request_type',
    }
  }
  if (!isKfzLandingBranchLabel(getKfzLandingBranch(branchId)?.label ?? '')) {
    return {
      ok: false,
      error: 'Bitte wählen Sie, womit wir starten sollen.',
      code: 'missing_request_type',
    }
  }
  return { ok: true }
}

export function validateKfzLandingContact(
  input: KfzLandingContactInput,
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

export function validateKfzLandingConsent(
  granted: boolean | undefined,
): KfzLandingStepValidation {
  if (granted !== true) {
    return {
      ok: false,
      error: 'Bitte stimmen Sie der Bearbeitung Ihrer Anfrage zu.',
      code: 'invalid_consent',
    }
  }
  return { ok: true }
}

export function canAdvanceKfzLandingScreen(
  screen: KfzLandingScreen,
  input: KfzLandingAdvanceInput,
): KfzLandingStepValidation {
  const branchId = resolveKfzLandingBranchId(input.branchId, input.inquiryReason)
  const answers = input.questionnaireAnswers ?? {}

  if (screen.kind === 'branch') {
    return validateKfzLandingBranch(input)
  }

  if (screen.kind === 'questions') {
    const result = validateKfzQuestionScreen(screen, branchId, answers)
    if (!result.ok) {
      return { ok: false, error: result.error, code: result.code }
    }
    return { ok: true }
  }

  if (screen.kind === 'contact') {
    const contact = validateKfzLandingContact(input)
    if (!contact.ok) {
      return contact
    }
    if (isQuestionnaireBranch(branchId)) {
      const complete = validateKfzQuestionnaireComplete(branchId, answers)
      if (!complete.ok) {
        return { ok: false, error: complete.error, code: complete.code }
      }
      return validateKfzLandingConsent(input.inquiryProcessingConsent)
    }
    return { ok: true }
  }

  if (screen.kind === 'documents') {
    return validateKfzLandingConsent(input.inquiryProcessingConsent)
  }

  return { ok: true }
}

export function isKfzLandingSubmitScreen(
  screen: KfzLandingScreen | undefined,
  screens: readonly KfzLandingScreen[],
  branchId: string,
): boolean {
  if (!branchId || !screen || screen.kind === 'branch') {
    return false
  }
  return screens[screens.length - 1]?.id === screen.id
}

export function isKfzLandingRequestTypeLabel(value: string): boolean {
  return isKfzLandingBranchLabel(value)
}

export const KFZ_LANDING_REQUEST_TYPES = [
  { id: 'upload_documents', label: 'Unterlagen hochladen' },
  { id: 'no_documents', label: 'Keine Unterlagen vorhanden' },
  { id: 'first_car', label: 'Erstes Auto versichern' },
  { id: 'additional_car', label: 'Weiteres Auto versichern' },
  { id: 'switch_car', label: 'Bestehendes Auto wechseln' },
  { id: 'evb', label: 'eVB für Zulassung' },
] as const

export function validateKfzLandingStep1(input: { inquiryReason: string }): KfzLandingStepValidation {
  return validateKfzLandingBranch(input)
}

export function validateKfzLandingStep2(
  input: KfzLandingContactInput,
): KfzLandingStepValidation {
  return validateKfzLandingContact(input)
}
