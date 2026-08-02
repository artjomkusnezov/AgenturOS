import {
  assertInboundItemShape,
  buildInboundInboxContent,
  mapInboundChannelToInboxSource,
  normalizeInboundSender,
} from '@/features/inbound/lib/inbound-item-utils'
import type { InboundItem } from '@/features/inbound/types/inbound-item'
import type { InboundIntakeStore } from '@/features/inbound/types/inbound-intake-store'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export type IngestInboundItemInput = {
  agencyId: string
  /** Audit-/RLS-Akteur (Integration/Mitglied), nicht der menschliche Absender. */
  actorUserId: string
  item: InboundItem
}

export type IngestInboundItemResult =
  | {
      success: true
      item: InboxItem
      deduplicated: boolean
      linkedFileIds: string[]
    }
  | {
      success: false
      error: string
    }

/**
 * Kanalneutraler Intake-Kern:
 * InboundItem → inbox_items (+ optionale Anhänge über bestehende File-Pipeline).
 */
export async function ingestInboundItem(
  store: InboundIntakeStore,
  input: IngestInboundItemInput,
): Promise<IngestInboundItemResult> {
  const agencyId = input.agencyId.trim()
  const actorUserId = input.actorUserId.trim()
  const externalId = input.item.externalId.trim()

  if (!agencyId) {
    return { success: false, error: 'Agency fehlt.' }
  }

  if (!actorUserId) {
    return { success: false, error: 'Akteur fehlt.' }
  }

  const shapeError = assertInboundItemShape({
    ...input.item,
    externalId,
  })

  if (shapeError) {
    return { success: false, error: shapeError }
  }

  const existing = await store.findByExternalIdentity({
    agencyId,
    channel: input.item.channel,
    externalId,
  })

  if (existing) {
    return {
      success: true,
      item: existing,
      deduplicated: true,
      linkedFileIds: [],
    }
  }

  const content = buildInboundInboxContent(input.item)
  const title = input.item.title?.trim() || null
  const sender = normalizeInboundSender(input.item.sender)
  const origin = input.item.origin
    ? normalizeInboundSender(input.item.origin)
    : null
  const source = mapInboundChannelToInboxSource(input.item.channel)
  const metadata = input.item.metadata ?? {}
  const itemKind = input.item.kind ?? null

  let item: InboxItem

  try {
    item = await store.createInboxItem({
      agencyId,
      actorUserId,
      content,
      title,
      source,
      channel: input.item.channel,
      externalId,
      sender,
      origin,
      receivedAt: input.item.receivedAt,
      itemKind,
      metadata,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''

    if (message.includes('inbox_items_agency_channel_external_id_uidx')) {
      const raced = await store.findByExternalIdentity({
        agencyId,
        channel: input.item.channel,
        externalId,
      })

      if (raced) {
        return {
          success: true,
          item: raced,
          deduplicated: true,
          linkedFileIds: [],
        }
      }
    }

    return {
      success: false,
      error: 'Das Eingangselement konnte nicht erstellt werden.',
    }
  }

  const linkedFileIds: string[] = []
  const attachments = input.item.attachments ?? []

  for (const attachment of attachments) {
    const linkResult = await store.uploadAndLinkAttachment({
      agencyId,
      actorUserId,
      inboxItemId: item.id,
      attachment,
    })

    if (!linkResult.success) {
      return {
        success: false,
        error: linkResult.error,
      }
    }

    linkedFileIds.push(linkResult.fileId)
  }

  return {
    success: true,
    item,
    deduplicated: false,
    linkedFileIds,
  }
}
