import { enrichAttachmentsWithMediaUrls } from '@/features/files/lib/enrich-attachments-with-media-urls'
import { createSignedDownloadUrlForTaskFile } from '@/features/files/repositories/files-repository'
import type { TaskLinkedFile } from '@/features/tasks/types/task-relation'

export async function enrichTaskLinkedFilesWithMediaUrls(
  taskId: string,
  linkedFiles: TaskLinkedFile[],
): Promise<TaskLinkedFile[]> {
  return enrichAttachmentsWithMediaUrls(linkedFiles, (fileId) =>
    createSignedDownloadUrlForTaskFile(taskId, fileId),
  )
}
