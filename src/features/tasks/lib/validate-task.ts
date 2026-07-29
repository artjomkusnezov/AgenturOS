import type { TaskFieldErrors, TaskInput } from '../types/task'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidTaskId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

export function normalizeTaskDescription(description: string): string | null {
  const trimmed = description.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function validateTaskInput(input: TaskInput): TaskFieldErrors {
  const errors: TaskFieldErrors = {}

  if (!input.title.trim()) {
    errors.title = 'Bitte geben Sie einen Titel ein.'
  }

  return errors
}

export function hasTaskFieldErrors(errors: TaskFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function parseTaskFormData(formData: FormData): TaskInput {
  return {
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
  }
}
