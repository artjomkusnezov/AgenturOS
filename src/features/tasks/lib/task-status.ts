import type { Task } from '@/features/tasks/types/task'

export function isTaskOpen(task: Task): boolean {
  return task.completed_at === null
}

export function formatTaskDateTime(value: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  }).format(new Date(value))
}

export function formatTaskListDate(value: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Berlin',
  }).format(new Date(value))
}

export function formatTaskListDescription(description: string | null): string {
  const trimmed = description?.trim()

  if (!trimmed) {
    return 'Keine Beschreibung'
  }

  if (trimmed.length <= 80) {
    return trimmed
  }

  return `${trimmed.slice(0, 80)}…`
}

export function getTodayDateString(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
  }).format(date)
}

export function isTaskOverdue(task: Task, today = getTodayDateString()): boolean {
  if (!isTaskOpen(task) || task.due_date === null) {
    return false
  }

  return task.due_date < today
}

export function formatDueDateLabel(
  dueDate: string,
  today = getTodayDateString(),
  allowOverdue = true
): string {
  if (dueDate === today) {
    return 'Heute'
  }

  const tomorrow = getTomorrowDateString(today)

  if (dueDate === tomorrow) {
    return 'Morgen'
  }

  if (dueDate < today && allowOverdue) {
    return 'Überfällig'
  }

  return formatDateOnlyLabel(dueDate)
}

function formatDateOnlyLabel(dueDate: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(parseDateOnly(dueDate))
}

function getTomorrowDateString(today: string): string {
  const date = parseDateOnly(today)
  date.setUTCDate(date.getUTCDate() + 1)

  return date.toISOString().slice(0, 10)
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}
