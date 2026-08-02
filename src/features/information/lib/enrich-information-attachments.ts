import { isInlineDocumentMedia } from '@/features/files/lib/classify-media-kind'
import { createSignedDownloadUrlForCurrentUser } from '@/features/files/repositories/files-repository'
import type { InformationLinkedFile } from '@/features/information/types/information-item'

/**
 * Erzeugt Signed URLs für Anhänge, die im Dokument inline dargestellt werden.
 * Andere Anhänge bleiben unverändert (mediaUrl: null).
 */
export async function enrichInformationAttachmentsWithMediaUrls(
  attachments: InformationLinkedFile[],
): Promise<InformationLinkedFile[]> {
  return Promise.all(
    attachments.map(async (attachment) => {
      const file = attachment.file

      if (!file || !isInlineDocumentMedia(file.mime_type, file.filename)) {
        return {
          ...attachment,
          mediaUrl: null,
        }
      }

      const urlResult = await createSignedDownloadUrlForCurrentUser(file.id)

      return {
        ...attachment,
        mediaUrl: urlResult.success ? urlResult.downloadUrl : null,
      }
    }),
  )
}
