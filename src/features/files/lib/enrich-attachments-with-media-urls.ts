import { isInlineDocumentMedia } from '@/features/files/lib/classify-media-kind'
import type { FileRecord } from '@/features/files/types/file'

type EnrichableAttachment = {
  file: FileRecord | null
}

type SignedUrlResult =
  | { success: true; downloadUrl: string }
  | { success: false; error?: string }

/**
 * Erzeugt Signed URLs für Anhänge, die inline dargestellt werden sollen.
 * Die URL-Fabrik bleibt kontextspezifisch (Owner / Task / …).
 */
export async function enrichAttachmentsWithMediaUrls<T extends EnrichableAttachment>(
  attachments: T[],
  createUrl: (fileId: string) => Promise<SignedUrlResult>,
): Promise<Array<T & { mediaUrl: string | null }>> {
  return Promise.all(
    attachments.map(async (attachment) => {
      const file = attachment.file

      if (!file || !isInlineDocumentMedia(file.mime_type, file.filename)) {
        return {
          ...attachment,
          mediaUrl: null,
        }
      }

      const urlResult = await createUrl(file.id)

      return {
        ...attachment,
        mediaUrl: urlResult.success ? urlResult.downloadUrl : null,
      }
    }),
  )
}
