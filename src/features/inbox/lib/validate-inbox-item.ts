import type { InboxItemFieldErrors, InboxItemInput } from '@/features/inbox/types/inbox-item'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidInboxItemId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

export function normalizeInboxContent(content: string): string {
  return content.trim()
}

export function validateInboxItemInput(input: InboxItemInput): InboxItemFieldErrors {
  const errors: InboxItemFieldErrors = {}

  if (!normalizeInboxContent(input.content)) {
    errors.content = 'Bitte geben Sie einen Inhalt ein.'
  }

  return errors
}

export function hasInboxItemFieldErrors(errors: InboxItemFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function parseInboxItemFormData(formData: FormData): InboxItemInput {
  return {
    content: String(formData.get('content') ?? ''),
  }
}
