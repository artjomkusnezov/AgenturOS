import { MAX_FILE_UPLOAD_BYTES } from '@/features/files/lib/file-storage'
import { normalizeUploadFilename } from '@/features/files/lib/validate-file'
import type { InboundItem, InboundItemKind } from '@/features/inbound/types/inbound-item'
import type {
  NormalizedInboundWhatsApp,
  NormalizedWhatsAppMessageType,
} from '@/features/whatsapp/types/normalized-inbound-whatsapp'

function mapKind(type: NormalizedWhatsAppMessageType): InboundItemKind {
  if (type === 'unsupported') {
    return 'unknown'
  }
  return type
}

function buildTitle(message: NormalizedInboundWhatsApp): string {
  const who =
    message.senderName?.trim() ||
    message.senderPhone.trim() ||
    'WhatsApp'

  if (message.type === 'text') {
    const body = message.text?.trim() ?? ''
    if (body.length === 0) {
      return `WhatsApp · ${who}`
    }
    const preview = body.length > 72 ? `${body.slice(0, 69)}…` : body
    return `${who}: ${preview}`
  }

  if (message.type === 'audio') {
    return `Sprachnachricht · ${who}`
  }

  if (message.type === 'image') {
    const caption = message.media?.caption?.trim()
    return caption ? `Bild · ${who}: ${caption.slice(0, 48)}` : `Bild · ${who}`
  }

  if (message.type === 'document') {
    const name = message.media?.filename?.trim()
    return name ? `Dokument · ${who}: ${name}` : `Dokument · ${who}`
  }

  const raw = message.rawType?.trim() || 'unbekannt'
  return `WhatsApp (${raw}) · ${who}`
}

function buildContent(message: NormalizedInboundWhatsApp): string {
  if (message.type === 'text') {
    return message.text?.trim() ?? ''
  }

  const caption = message.media?.caption?.trim() ?? ''
  if (caption.length > 0) {
    return caption
  }

  if (message.type === 'audio') {
    return 'Sprachnachricht'
  }

  if (message.type === 'image') {
    return 'Bildnachricht'
  }

  if (message.type === 'document') {
    return message.media?.filename?.trim() || 'Dokument'
  }

  const raw = message.rawType?.trim() || 'unbekannt'
  return `Nicht unterstützte WhatsApp-Nachricht (${raw})`
}

/**
 * Reine Übersetzung: NormalizedInboundWhatsApp → InboundItem.
 * Keine Businesslogik, kein Meta-Wissen.
 */
export function toInboundItemFromWhatsApp(
  message: NormalizedInboundWhatsApp,
): InboundItem {
  const externalId = message.externalMessageId.trim()
  const content = buildContent(message)
  const title = buildTitle(message)

  const skippedAttachments: string[] = []
  const attachments = []

  if (message.media) {
    const size =
      typeof message.media.sizeBytes === 'number' && message.media.sizeBytes > 0
        ? message.media.sizeBytes
        : message.media.bytes.byteLength

    if (size > MAX_FILE_UPLOAD_BYTES) {
      skippedAttachments.push(
        normalizeUploadFilename(message.media.filename) || 'anhang',
      )
    } else {
      attachments.push({
        filename: normalizeUploadFilename(message.media.filename) || 'anhang',
        mimeType: message.media.mimeType.trim() || 'application/octet-stream',
        bytes: message.media.bytes,
        sizeBytes: size,
      })
    }
  }

  const metadata: Record<string, unknown> = {
    ...(message.metadata ?? {}),
  }

  if (message.replyToExternalMessageId?.trim()) {
    metadata.replyToExternalMessageId = message.replyToExternalMessageId.trim()
  }

  if (message.media?.mediaId) {
    metadata.whatsappMediaId = message.media.mediaId
  }

  if (skippedAttachments.length > 0) {
    metadata.skippedAttachments = skippedAttachments
  }

  // Provider-Keys nicht durchreichen
  delete metadata.provider
  delete metadata.wabaId

  return {
    channel: 'whatsapp',
    externalId,
    sender: {
      displayName: message.senderName?.trim() || null,
      address: message.senderPhone.trim(),
      addressKind: 'phone',
    },
    origin: null,
    receivedAt: message.receivedAt,
    title,
    content,
    kind: mapKind(message.type),
    attachments,
    metadata,
  }
}
