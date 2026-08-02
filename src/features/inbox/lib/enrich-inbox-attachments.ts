import { enrichAttachmentsWithMediaUrls } from '@/features/files/lib/enrich-attachments-with-media-urls'
import { createSignedDownloadUrlForCurrentUser } from '@/features/files/repositories/files-repository'
import type { InboxLinkedFile } from '@/features/inbox/types/inbox-item'

export async function enrichInboxAttachmentsWithMediaUrls(
  attachments: InboxLinkedFile[],
): Promise<InboxLinkedFile[]> {
  return enrichAttachmentsWithMediaUrls(attachments, createSignedDownloadUrlForCurrentUser)
}
