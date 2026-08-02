import { MAX_FILE_UPLOAD_BYTES } from '@/features/files/lib/file-storage'
import { normalizeUploadFilename } from '@/features/files/lib/validate-file'
import type { InboundItem, InboundItemKind } from '@/features/inbound/types/inbound-item'
import { htmlToPlainText } from '@/features/email/lib/html-to-plain-text'
import { normalizeMessageId } from '@/features/email/lib/normalize-message-id'
import type {
  NormalizedInboundEmail,
  NormalizedInboundEmailAttachment,
} from '@/features/email/types/normalized-inbound-email'

function isRealAttachment(attachment: NormalizedInboundEmailAttachment): boolean {
  if (attachment.disposition === 'inline') {
    return false
  }

  if (attachment.contentId && attachment.disposition !== 'attachment') {
    return false
  }

  return true
}

function resolveBody(email: NormalizedInboundEmail): string {
  const plain = email.plainText?.trim() ?? ''
  if (plain.length > 0) {
    return plain
  }

  const html = email.html?.trim() ?? ''
  if (html.length > 0) {
    return htmlToPlainText(html)
  }

  return ''
}

function resolveKind(
  body: string,
  attachments: NormalizedInboundEmailAttachment[],
): InboundItemKind {
  if (attachments.length === 0) {
    return 'text'
  }

  if (body.length === 0 && attachments.length === 1) {
    const mime = attachments[0].mimeType.toLowerCase()
    if (mime.startsWith('image/')) {
      return 'image'
    }
    if (mime.startsWith('audio/')) {
      return 'audio'
    }
    if (mime.startsWith('video/')) {
      return 'video'
    }
    return 'document'
  }

  return body.length > 0 ? 'text' : 'document'
}

/**
 * Reine Übersetzung: NormalizedInboundEmail → InboundItem.
 * Keine Businesslogik, kein Provider-Wissen.
 */
export function toInboundItemFromEmail(email: NormalizedInboundEmail): InboundItem {
  const externalId = normalizeMessageId(email.messageId)
  const title = email.subject?.trim() || null
  const content = resolveBody(email)

  const skippedAttachments: string[] = []
  const attachments = (email.attachments ?? [])
    .filter((attachment) => {
      if (!isRealAttachment(attachment)) {
        return false
      }

      const size =
        typeof attachment.sizeBytes === 'number' && attachment.sizeBytes > 0
          ? attachment.sizeBytes
          : attachment.bytes.byteLength

      if (size > MAX_FILE_UPLOAD_BYTES) {
        skippedAttachments.push(normalizeUploadFilename(attachment.filename) || 'anhang')
        return false
      }

      return true
    })
    .map((attachment) => ({
      filename: normalizeUploadFilename(attachment.filename) || 'anhang',
      mimeType: attachment.mimeType.trim() || 'application/octet-stream',
      bytes: attachment.bytes,
      sizeBytes:
        typeof attachment.sizeBytes === 'number' && attachment.sizeBytes > 0
          ? attachment.sizeBytes
          : attachment.bytes.byteLength,
    }))

  const metadata: Record<string, unknown> = {
    ...(email.metadata ?? {}),
  }

  if (skippedAttachments.length > 0) {
    metadata.skippedAttachments = skippedAttachments
  }

  // Provider-Keys nicht durchreichen
  delete metadata.provider
  delete metadata.resendEmailId
  delete metadata.postmarkMessageId

  return {
    channel: 'email',
    externalId,
    sender: {
      displayName: email.sender.displayName ?? null,
      address: email.sender.address,
      addressKind: 'email',
    },
    origin: email.origin
      ? {
          displayName: email.origin.displayName ?? null,
          address: email.origin.address,
          addressKind: 'email',
        }
      : null,
    receivedAt: email.receivedAt,
    title,
    content,
    kind: resolveKind(content, attachments),
    attachments,
    metadata,
  }
}
