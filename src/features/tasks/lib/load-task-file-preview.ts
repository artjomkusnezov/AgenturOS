import {
  createSignedDownloadUrlForTaskFile,
  getFileForTask,
} from '@/features/files/repositories/files-repository'
import { isValidFileId } from '@/features/files/lib/validate-file'
import { isValidTaskId } from '@/features/tasks/lib/validate-task'
import type { TaskFilePreviewLoadState } from '@/features/tasks/types/task-file-preview'

export async function loadTaskFilePreview(
  taskId: string,
  fileId: string,
): Promise<TaskFilePreviewLoadState> {
  if (!isValidTaskId(taskId) || !isValidFileId(fileId)) {
    return { status: 'invalid' }
  }

  const fileResult = await getFileForTask(taskId, fileId)

  if (!fileResult.success) {
    return {
      status: 'error',
      message: 'Die Datei konnte nicht geöffnet werden.',
    }
  }

  const urlResult = await createSignedDownloadUrlForTaskFile(taskId, fileId)

  if (!urlResult.success) {
    return {
      status: 'error',
      message: 'Die Datei konnte nicht geöffnet werden.',
    }
  }

  return {
    status: 'ready',
    file: fileResult.file,
    previewUrl: urlResult.downloadUrl,
  }
}
