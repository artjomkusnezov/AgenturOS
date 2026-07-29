import { isTaskPriority } from '@/features/tasks/lib/task-priority'
import type { TaskDetailInput, TaskFieldErrors, TaskInput } from '../types/task'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isValidTaskId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

export function normalizeTaskDescription(description: string): string | null {
  const trimmed = description.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeTaskDueDate(dueDate: string): string | null {
  const trimmed = dueDate.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function isValidCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function validateTaskInput(input: TaskInput): TaskFieldErrors {
  const errors: TaskFieldErrors = {}

  if (!input.title.trim()) {
    errors.title = 'Bitte geben Sie einen Titel ein.'
  }

  return errors
}

export function validateTaskDetailInput(input: TaskDetailInput): TaskFieldErrors {
  const errors = validateTaskInput(input)

  if (!isTaskPriority(input.priority)) {
    errors.priority = 'Bitte wählen Sie eine gültige Priorität.'
  }

  const dueDate = normalizeTaskDueDate(input.dueDate)

  if (dueDate !== null && !isValidCalendarDate(dueDate)) {
    errors.dueDate = 'Bitte geben Sie ein gültiges Fälligkeitsdatum ein.'
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

export function parseTaskDetailFormData(formData: FormData): TaskDetailInput {
  return {
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    priority: String(formData.get('priority') ?? ''),
    dueDate: String(formData.get('dueDate') ?? ''),
  }
}
