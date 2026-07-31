import { isValidFileId } from '@/features/files/lib/validate-file'
import { isValidInformationItemId } from '@/features/information/lib/validate-information-item'
import { isValidTaskId } from '@/features/tasks/lib/validate-task'

export type TaskFileRelationInput = {
  taskId: string
  fileId: string
}

export type TaskInformationRelationInput = {
  taskId: string
  informationId: string
}

export function validateTaskFileRelationInput(input: TaskFileRelationInput): string | null {
  if (!isValidTaskId(input.taskId)) {
    return 'Bitte geben Sie einen gültigen Vorgang an.'
  }

  if (!isValidFileId(input.fileId)) {
    return 'Bitte geben Sie eine gültige Datei an.'
  }

  return null
}

export function validateTaskInformationRelationInput(
  input: TaskInformationRelationInput,
): string | null {
  if (!isValidTaskId(input.taskId)) {
    return 'Bitte geben Sie einen gültigen Vorgang an.'
  }

  if (!isValidInformationItemId(input.informationId)) {
    return 'Bitte geben Sie eine gültige Information an.'
  }

  return null
}
