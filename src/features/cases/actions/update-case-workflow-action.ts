'use server'

import { revalidatePath } from 'next/cache'

import { updateCaseForCurrentUser } from '@/features/cases/repositories/case-workflow-repository'
import {
  hasCaseWorkflowFieldErrors,
  isCaseCoreStatus,
  validateUpdateCaseInput,
  type CaseWorkflowMutationState,
  type UpdateCaseInput,
} from '@/features/cases/types/case-workflow'
import { isTaskPriority } from '@/features/tasks/lib/task-priority'

function parseUpdateCaseFormData(formData: FormData): UpdateCaseInput {
  const caseId = String(formData.get('caseId') ?? '')
  const field = String(formData.get('field') ?? '')

  if (field === 'coreStatus') {
    const value = String(formData.get('coreStatus') ?? '')
    return {
      caseId,
      coreStatus: isCaseCoreStatus(value) ? value : (value as UpdateCaseInput['coreStatus']),
    }
  }

  if (field === 'assignee') {
    const raw = String(formData.get('assigneeUserId') ?? '').trim()
    return {
      caseId,
      setAssignee: true,
      assigneeUserId: raw.length > 0 ? raw : null,
    }
  }

  if (field === 'priority') {
    const value = String(formData.get('priority') ?? '')
    return {
      caseId,
      priority: isTaskPriority(value) ? value : (value as UpdateCaseInput['priority']),
    }
  }

  if (field === 'dueAt') {
    const raw = String(formData.get('dueAt') ?? '').trim()
    return {
      caseId,
      setDueAt: true,
      dueAt: raw.length > 0 ? raw : null,
    }
  }

  return { caseId }
}

export async function updateCaseWorkflowAction(
  _prevState: CaseWorkflowMutationState,
  formData: FormData,
): Promise<CaseWorkflowMutationState> {
  const input = parseUpdateCaseFormData(formData)
  const fieldErrors = validateUpdateCaseInput(input)

  if (hasCaseWorkflowFieldErrors(fieldErrors)) {
    return { fieldErrors }
  }

  const result = await updateCaseForCurrentUser(input)

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath('/app/cases')

  return {
    success: true,
    caseId: result.case.id,
  }
}
