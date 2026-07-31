'use server'

import { createSignedDownloadUrlForTaskFile } from '@/features/files/repositories/files-repository'
import { isValidFileId } from '@/features/files/lib/validate-file'
import { isValidTaskId } from '@/features/tasks/lib/validate-task'
import type { TaskFilePreviewMutationState } from '@/features/tasks/types/task-file-preview'

export async function downloadTaskFileAction(
  _prevState: TaskFilePreviewMutationState,
  formData: FormData,
): Promise<TaskFilePreviewMutationState> {
  const taskId = String(formData.get('taskId') ?? '')
  const fileId = String(formData.get('fileId') ?? '')

  if (!isValidTaskId(taskId) || !isValidFileId(fileId)) {
    return { error: 'Die Datei konnte nicht heruntergeladen werden.' }
  }

  const result = await createSignedDownloadUrlForTaskFile(taskId, fileId)

  if (!result.success) {
    return { error: 'Die Datei konnte nicht heruntergeladen werden.' }
  }

  return {
    success: true,
    downloadUrl: result.downloadUrl,
  }
}
