import type { CasePriority } from '@/features/cases/types/case'
import { isTaskPriority } from '@/features/tasks/lib/task-priority'

export type DirectCaseTypeKey = 'offer' | 'claim' | 'follow_up'

export const DIRECT_CASE_TYPE_KEYS = ['offer', 'claim', 'follow_up'] as const satisfies readonly DirectCaseTypeKey[]

export function isDirectCaseTypeKey(value: string): value is DirectCaseTypeKey {
  return (DIRECT_CASE_TYPE_KEYS as readonly string[]).includes(value)
}

export type CreateCaseFormInput = {
  caseTypeKey: DirectCaseTypeKey
  title: string
  description: string
  assigneeUserId: string
  priority: CasePriority
  dueAt: string
}

export type CreateCaseFieldErrors = {
  title?: string
  dueAt?: string
  priority?: string
  assigneeUserId?: string
}

export function parseCreateCaseFormData(formData: FormData): CreateCaseFormInput {
  const caseTypeRaw = String(formData.get('caseTypeKey') ?? '').trim()

  return {
    caseTypeKey: isDirectCaseTypeKey(caseTypeRaw) ? caseTypeRaw : 'offer',
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    assigneeUserId: String(formData.get('assigneeUserId') ?? '').trim(),
    priority: String(formData.get('priority') ?? 'normal').trim() as CasePriority,
    dueAt: String(formData.get('dueAt') ?? '').trim(),
  }
}

export function validateCreateCaseInput(
  input: CreateCaseFormInput,
): CreateCaseFieldErrors {
  const errors: CreateCaseFieldErrors = {}
  const title = input.title.trim()

  if (!title) {
    errors.title = 'Bitte geben Sie einen Titel ein.'
  }

  if (!isTaskPriority(input.priority)) {
    errors.priority = 'Die Priorität ist ungültig.'
  }

  if (!input.assigneeUserId) {
    errors.assigneeUserId = 'Bitte wählen Sie einen Verantwortlichen.'
  }

  if (input.caseTypeKey === 'follow_up' && !input.dueAt) {
    errors.dueAt = 'Für Wiedervorlagen ist ein Datum erforderlich.'
  }

  return errors
}

export function hasCreateCaseFieldErrors(errors: CreateCaseFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function normalizeCreateCaseDescription(description: string): string | null {
  const trimmed = description.trim()
  return trimmed.length > 0 ? trimmed : null
}
