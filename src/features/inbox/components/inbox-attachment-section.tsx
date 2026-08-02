'use client'

import { DocumentMediaSection } from '@/features/files/components/document-media-section'
import { downloadFileAction } from '@/features/files/actions/download-file'
import type { DocumentMediaItem } from '@/features/files/types/document-media'
import type { InboxLinkedFile } from '@/features/inbox/types/inbox-item'

type InboxAttachmentSectionProps = {
  attachments: InboxLinkedFile[]
}

function toMediaItems(attachments: InboxLinkedFile[]): DocumentMediaItem[] {
  return attachments.map((attachment) => ({
    key: attachment.relationId,
    file: attachment.file,
    mediaUrl: attachment.mediaUrl ?? null,
  }))
}

export function InboxAttachmentSection({ attachments }: InboxAttachmentSectionProps) {
  return (
    <DocumentMediaSection
      items={toMediaItems(attachments)}
      openAction={downloadFileAction}
      emptyLabel="Keine Anhänge"
    />
  )
}
