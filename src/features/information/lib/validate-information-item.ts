import type { InformationFieldErrors, InformationInput } from '@/features/information/types/information-item'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const TITLE_MAX_LENGTH = 200

export function isValidInformationItemId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

export function normalizeInformationContent(content: string): string | null {
  const trimmed = content.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function validateInformationInput(input: InformationInput): InformationFieldErrors {
  const errors: InformationFieldErrors = {}
  const title = input.title.trim()

  if (!title) {
    errors.title = 'Bitte geben Sie einen Titel ein.'
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `Der Titel darf höchstens ${TITLE_MAX_LENGTH} Zeichen lang sein.`
  }

  return errors
}

export function hasInformationFieldErrors(errors: InformationFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function parseInformationFormData(formData: FormData): InformationInput {
  return {
    title: String(formData.get('title') ?? ''),
    content: String(formData.get('content') ?? ''),
  }
}
