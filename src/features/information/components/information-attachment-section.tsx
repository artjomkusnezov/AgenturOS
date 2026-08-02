'use client'

import { WorkspaceSectionHeading } from '@/components/app/workspace'
import { DashboardIconFile } from '@/features/dashboard/components/dashboard-icons'
import {
  classifyMediaKind,
  isInlineDocumentMedia,
} from '@/features/files/lib/classify-media-kind'
import { InformationAudioAttachment } from '@/features/information/components/information-audio-attachment'
import { InformationGenericAttachment } from '@/features/information/components/information-generic-attachment'
import { InformationImageAttachment } from '@/features/information/components/information-image-attachment'
import { InformationPdfAttachment } from '@/features/information/components/information-pdf-attachment'
import { InformationVideoAttachment } from '@/features/information/components/information-video-attachment'
import type { InformationLinkedFile } from '@/features/information/types/information-item'
import {
  aosWorkspaceMetaClassName,
  aosWorkspaceSectionClassName,
} from '@/lib/design-system'

type InformationAttachmentSectionProps = {
  attachments: InformationLinkedFile[]
}

function InlineMediaBlock({ attachment }: { attachment: InformationLinkedFile }) {
  const { file, mediaUrl = null } = attachment

  if (!file) {
    return null
  }

  const kind = classifyMediaKind(file.mime_type, file.filename)

  switch (kind) {
    case 'image':
      return <InformationImageAttachment file={file} mediaUrl={mediaUrl} />
    case 'pdf':
      return <InformationPdfAttachment file={file} mediaUrl={mediaUrl} />
    case 'audio':
      return <InformationAudioAttachment file={file} mediaUrl={mediaUrl} />
    case 'video':
      return <InformationVideoAttachment file={file} mediaUrl={mediaUrl} />
    default:
      return null
  }
}

export function InformationAttachmentSection({
  attachments,
}: InformationAttachmentSectionProps) {
  const inlineAttachments = attachments.filter(
    (attachment) =>
      attachment.file !== null &&
      isInlineDocumentMedia(attachment.file.mime_type, attachment.file.filename),
  )

  const otherAttachments = attachments.filter(
    (attachment) =>
      attachment.file === null ||
      !isInlineDocumentMedia(attachment.file.mime_type, attachment.file.filename),
  )

  const isEmpty = attachments.length === 0

  return (
    <section aria-label="Anhänge" className={aosWorkspaceSectionClassName}>
      <WorkspaceSectionHeading
        title="Anhänge"
        accent="neutral"
        count={attachments.length}
        icon={<DashboardIconFile className="h-4 w-4" />}
      />

      {isEmpty ? (
        <p className={aosWorkspaceMetaClassName}>Keine Anhänge</p>
      ) : (
        <div className="space-y-5">
          {inlineAttachments.length > 0 ? (
            <div className="space-y-5" aria-label="Medien">
              {inlineAttachments.map((attachment) => (
                <div key={attachment.relationId}>
                  <InlineMediaBlock attachment={attachment} />
                </div>
              ))}
            </div>
          ) : null}

          {otherAttachments.length > 0 ? (
            <ul
              className={
                inlineAttachments.length > 0
                  ? 'divide-y divide-zinc-100 border-t border-zinc-200/40 pt-3'
                  : 'divide-y divide-zinc-100'
              }
              aria-label="Weitere Anhänge"
            >
              {otherAttachments.map((attachment) => (
                <InformationGenericAttachment
                  key={attachment.relationId}
                  file={attachment.file}
                />
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </section>
  )
}
