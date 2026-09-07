/**
 * Maps a persisted InboxItem to channel-agnostic InboundAnalysisInput.
 * Prefer normalized inbound_metadata over inventing facts.
 */

import type { InboundAnalysisInput } from '@/features/ai/inbound-analysis'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readSender(item: InboxItem): InboundAnalysisInput['sender'] {
  if (!isRecord(item.sender)) {
    return null
  }

  return {
    displayName: asNullableString(item.sender.displayName),
    address: asNullableString(item.sender.address),
    addressKind: asNullableString(item.sender.addressKind),
  }
}

function readUploadAttachments(
  metadata: Record<string, unknown> | null,
): InboundAnalysisInput['attachments'] {
  if (!metadata || !Array.isArray(metadata.uploadMeta)) {
    return []
  }

  const attachments: NonNullable<InboundAnalysisInput['attachments']> = []
  for (const entry of metadata.uploadMeta) {
    if (!isRecord(entry)) {
      continue
    }
    const filename = asNullableString(entry.filename)
    if (!filename) {
      continue
    }
    attachments.push({
      filename,
      mimeType: asNullableString(entry.mimeType),
    })
  }
  return attachments
}

/**
 * Builds analysis input from the existing inbox working copy.
 * Does not invent missing personal data.
 */
export function mapInboxItemToAnalysisInput(
  item: InboxItem,
): InboundAnalysisInput {
  const metadata = isRecord(item.inbound_metadata)
    ? (item.inbound_metadata as Record<string, unknown>)
    : null

  return {
    channel: item.channel || item.source || 'unknown',
    externalId: item.external_id,
    title: item.title,
    content: item.content,
    kind: item.message_kind,
    receivedAt: item.received_at,
    sender: readSender(item),
    attachments: readUploadAttachments(metadata),
    metadata,
    knownContext: null,
  }
}
