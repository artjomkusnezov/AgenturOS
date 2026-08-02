import type {
  CreateCaseTimelineNoteInput,
  CaseTimelineNoteFieldErrors,
} from '@/features/cases/types/case-timeline'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const CASE_TIMELINE_NOTE_MAX_LENGTH = 10_000

export function isValidCaseId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

export function normalizeCaseTimelineNoteContent(content: string): string {
  return content.trim()
}

export function validateCaseTimelineNoteInput(
  input: CreateCaseTimelineNoteInput,
): CaseTimelineNoteFieldErrors {
  const errors: CaseTimelineNoteFieldErrors = {}

  if (!isValidCaseId(input.caseId)) {
    errors.caseId = 'Bitte geben Sie eine gültige Vorgangs-ID an.'
  }

  const normalizedContent = normalizeCaseTimelineNoteContent(input.content)

  if (!normalizedContent) {
    errors.content = 'Bitte geben Sie einen Inhalt ein.'
  } else if (normalizedContent.length > CASE_TIMELINE_NOTE_MAX_LENGTH) {
    errors.content = 'Der Inhalt darf höchstens 10.000 Zeichen lang sein.'
  }

  return errors
}

export function hasCaseTimelineNoteFieldErrors(
  errors: CaseTimelineNoteFieldErrors,
): boolean {
  return Object.keys(errors).length > 0
}
