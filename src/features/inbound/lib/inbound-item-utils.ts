import { normalizeUploadFilename } from '@/features/files/lib/validate-file'
import type {
  InboundChannel,
  InboundItem,
  InboundItemKind,
  InboundSender,
  InboundSenderRecord,
} from '@/features/inbound/types/inbound-item'
import {
  INBOX_SOURCE_EMAIL,
  INBOX_SOURCE_MANUAL_TEXT,
  INBOX_SOURCE_WHATSAPP,
} from '@/features/inbox/lib/inbox-source'

export function isInboundChannel(value: string): value is InboundChannel {
  return value === 'manual' || value === 'whatsapp' || value === 'email'
}

export function mapInboundChannelToInboxSource(
  channel: InboundChannel,
): typeof INBOX_SOURCE_MANUAL_TEXT | typeof INBOX_SOURCE_WHATSAPP | typeof INBOX_SOURCE_EMAIL {
  if (channel === 'whatsapp') {
    return INBOX_SOURCE_WHATSAPP
  }

  if (channel === 'email') {
    return INBOX_SOURCE_EMAIL
  }

  return INBOX_SOURCE_MANUAL_TEXT
}

export function normalizeInboundSender(sender: InboundSender): InboundSenderRecord {
  return {
    displayName: sender.displayName?.trim() || null,
    address: sender.address?.trim() || null,
    addressKind: sender.addressKind ?? null,
  }
}

/**
 * Baut den persistierten Inbox-Inhalt.
 * Primär `content`, dann `title`, sonst Anhänge / Absender-Fallback.
 */
export function buildInboundInboxContent(
  item: Pick<InboundItem, 'content' | 'title' | 'attachments' | 'kind' | 'sender'>,
): string {
  const trimmedContent = item.content?.trim() ?? ''

  if (trimmedContent.length > 0) {
    return trimmedContent
  }

  const trimmedTitle = item.title?.trim() ?? ''
  if (trimmedTitle.length > 0) {
    return trimmedTitle
  }

  const filenames = (item.attachments ?? [])
    .map((attachment) => normalizeUploadFilename(attachment.filename))
    .filter((filename) => filename.length > 0)

  if (filenames.length === 1) {
    return filenames[0]
  }

  if (filenames.length > 1) {
    return `Anhänge: ${filenames.join(', ')}`
  }

  const senderLabel =
    item.sender.displayName?.trim() || item.sender.address?.trim() || null

  if (senderLabel) {
    return `Eingang von ${senderLabel}`
  }

  const kind = item.kind?.trim() || 'unbekannt'
  return `Eingehende Information (${kind})`
}

/** Externe Quellen: Absender aus `sender`/`origin`, nicht Mitgliedsname. */
export function isExternalInboundChannel(channel: string | null | undefined): boolean {
  return channel === 'whatsapp' || channel === 'email'
}

export function formatInboundSenderLabel(
  sender: InboundSenderRecord | null | undefined,
): string | null {
  if (!sender) {
    return null
  }

  const name = sender.displayName?.trim()
  if (name) {
    return name
  }

  const address = sender.address?.trim()
  return address || null
}

export function assertInboundItemShape(item: InboundItem): string | null {
  if (!isInboundChannel(item.channel)) {
    return 'Ungültiger Kanal.'
  }

  if (!item.externalId.trim()) {
    return 'Externe ID fehlt.'
  }

  if (!item.receivedAt.trim()) {
    return 'Empfangszeitpunkt fehlt.'
  }

  const content = buildInboundInboxContent(item)
  if (!content.trim()) {
    return 'Eingang ohne Inhalt.'
  }

  void (item.kind as InboundItemKind | null | undefined)
  return null
}
