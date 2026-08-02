import { enrichAttachmentsWithMediaUrls } from '@/features/files/lib/enrich-attachments-with-media-urls'
import { createSignedDownloadUrlForCurrentUser } from '@/features/files/repositories/files-repository'
import type { InformationLinkedFile } from '@/features/information/types/information-item'

/**
 * Erzeugt Signed URLs für Informationsanhänge (Owner-Pfad).
 */
export async function enrichInformationAttachmentsWithMediaUrls(
  attachments: InformationLinkedFile[],
): Promise<InformationLinkedFile[]> {
  return enrichAttachmentsWithMediaUrls(attachments, createSignedDownloadUrlForCurrentUser)
}
