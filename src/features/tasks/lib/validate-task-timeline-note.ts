import { isValidTaskId } from '@/features/tasks/lib/validate-task'
import type {
  CreateTaskTimelineNoteInput,
  TaskTimelineNoteFieldErrors,
} from '@/features/tasks/types/task-timeline'

export const TASK_TIMELINE_NOTE_MAX_LENGTH = 10_000

export function normalizeTaskTimelineNoteContent(content: string): string {
  return content.trim()
}

export function validateTaskTimelineNoteInput(
  input: CreateTaskTimelineNoteInput,
): TaskTimelineNoteFieldErrors {
  const errors: TaskTimelineNoteFieldErrors = {}

  if (!isValidTaskId(input.taskId)) {
    errors.taskId = 'Bitte geben Sie eine gültige Aufgaben-ID an.'
  }

  const normalizedContent = normalizeTaskTimelineNoteContent(input.content)

  if (!normalizedContent) {
    errors.content = 'Bitte geben Sie einen Inhalt ein.'
  } else if (normalizedContent.length > TASK_TIMELINE_NOTE_MAX_LENGTH) {
    errors.content = 'Der Inhalt darf höchstens 10.000 Zeichen lang sein.'
  }

  return errors
}

export function hasTaskTimelineNoteFieldErrors(
  errors: TaskTimelineNoteFieldErrors,
): boolean {
  return Object.keys(errors).length > 0
}
