import type { CaseCoreStatus, CasePriority, CaseRecord } from '@/features/cases/types/case'
import { CASE_CORE_STATUSES } from '@/features/cases/types/case'
import { isValidCaseId } from '@/features/cases/lib/validate-case-timeline-note'
import { isTaskPriority } from '@/features/tasks/lib/task-priority'

export type UpdateCaseInput = {
  caseId: string
  coreStatus?: CaseCoreStatus
  assigneeUserId?: string | null
  setAssignee?: boolean
  priority?: CasePriority
  dueAt?: string | null
  setDueAt?: boolean
}

export type CaseWorkflowFieldErrors = {
  caseId?: string
  coreStatus?: string
  assigneeUserId?: string
  priority?: string
  dueAt?: string
}

export type CaseWorkflowMutationState = {
  fieldErrors?: CaseWorkflowFieldErrors
  error?: string
  success?: boolean
  caseId?: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isCaseCoreStatus(value: string): value is CaseCoreStatus {
  return (CASE_CORE_STATUSES as readonly string[]).includes(value)
}

export function validateUpdateCaseInput(input: UpdateCaseInput): CaseWorkflowFieldErrors {
  const errors: CaseWorkflowFieldErrors = {}

  if (!isValidCaseId(input.caseId)) {
    errors.caseId = 'Bitte geben Sie eine gültige Vorgangs-ID an.'
  }

  const hasStatus = input.coreStatus !== undefined
  const hasAssignee = Boolean(input.setAssignee)
  const hasPriority = input.priority !== undefined
  const hasDue = Boolean(input.setDueAt)

  if (!hasStatus && !hasAssignee && !hasPriority && !hasDue) {
    errors.caseId = 'Es wurde keine Änderung angegeben.'
  }

  if (hasStatus && !isCaseCoreStatus(input.coreStatus!)) {
    errors.coreStatus = 'Der Status ist ungültig.'
  }

  if (hasAssignee && input.assigneeUserId !== null && input.assigneeUserId !== undefined) {
    if (!UUID_PATTERN.test(input.assigneeUserId)) {
      errors.assigneeUserId = 'Der Verantwortliche ist ungültig.'
    }
  }

  if (hasPriority && !isTaskPriority(input.priority!)) {
    errors.priority = 'Die Priorität ist ungültig.'
  }

  if (hasDue && input.dueAt !== null && input.dueAt !== undefined) {
    if (!DATE_PATTERN.test(input.dueAt)) {
      errors.dueAt = 'Das Fälligkeitsdatum ist ungültig.'
    }
  }

  return errors
}

export function hasCaseWorkflowFieldErrors(errors: CaseWorkflowFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export type CaseUpdateResult =
  | { success: true; case: CaseRecord }
  | { success: false; error: string }
