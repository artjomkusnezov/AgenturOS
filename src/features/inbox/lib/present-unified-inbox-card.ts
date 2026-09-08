/**
 * One list card for every normalized inbox working copy.
 * Source facts only — no automatic classification or outbound action.
 */

import { isKfzInboxItem } from '@/features/ai-inbound/lib/is-kfz-website-inbox-item'
import {
  formatInboundSenderLabel,
} from '@/features/inbound/lib/inbound-item-utils'
import type { InboundSenderRecord } from '@/features/inbound/types/inbound-item'
import { getInboxListTitle, truncateInboxContentPreview } from '@/features/inbox/lib/format-inbox-content'
import { getInboxItemSourceLabel } from '@/features/inbox/lib/inbox-source'
import {
  formatInboxListDate,
} from '@/features/inbox/lib/inbox-status'
import { readInboxSourceContent } from '@/features/inbox/lib/kfz-response-draft'
import {
  buildInboxHref,
  presentInboxStatusChip,
  presentKfzWorkQueueRow,
  type KfzWorkQueueFilter,
  type KfzWorkQueueStatusChip,
} from '@/features/inbox/lib/kfz-work-queue'
import { presentKfzWebsiteInboxItem } from '@/features/inbox/lib/present-kfz-website-inbox'
import type { InboxSourceFilter } from '@/features/inbox/lib/inbox-source-filter'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

export const UNIFIED_INBOX_CONTACT_MISSING = 'Kein Kontakt' as const
export const UNIFIED_INBOX_CONTACT_PRESENT_STATE = 'Kontakt vorhanden' as const
export const UNIFIED_INBOX_CONTACT_MISSING_STATE = 'Kontakt fehlt' as const

export type UnifiedInboxCard = {
  itemId: string
  headline: string
  sourceLabel: string
  receivedAt: string
  receivedAtLabel: string
  customerContact: string
  requestSummary: string
  missingInformationLabel: string
  missingCount: number
  reviewStatus: KfzWorkQueueStatusChip
  href: string
  isKfz: boolean
  urgencyNote: string | null
  nextActionLabel: string | null
}

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

export function inboxReceivedAt(
  item: Pick<InboxItem, 'received_at' | 'created_at'>,
): string {
  return item.received_at?.trim() || item.created_at
}

function readParty(
  value: InboxItem['origin'] | InboxItem['sender'],
): { name: string | null; address: string | null } {
  if (!isRecord(value)) {
    return { name: null, address: null }
  }

  return {
    name: formatInboundSenderLabel(value as InboundSenderRecord),
    address: asNullableString(value.address),
  }
}

function joinCustomerContact(name: string | null, contact: string | null): string {
  if (name && contact && name !== contact) {
    return `${name} · ${contact}`
  }

  return name || contact || UNIFIED_INBOX_CONTACT_MISSING
}

function presentNonKfzCustomerContact(
  item: Pick<InboxItem, 'channel' | 'origin' | 'sender'>,
): { label: string; hasContact: boolean } {
  const origin = readParty(item.origin)
  const sender = readParty(item.sender)
  const isManual = item.channel === 'manual'
  const name = origin.name || (isManual ? null : sender.name)
  const address = origin.address || (isManual ? null : sender.address)
  const hasContact = Boolean(address)

  return {
    label: joinCustomerContact(name, address),
    hasContact,
  }
}

function presentNonKfzRequestSummary(
  item: Pick<InboxItem, 'title' | 'content'>,
): string {
  const source = readInboxSourceContent(item.content)
  if (source.trim()) {
    return truncateInboxContentPreview(source)
  }

  const title = item.title?.trim()
  return title && title.length > 0 ? title : 'Kein Anliegen'
}

export function presentUnifiedInboxCard(
  item: InboxItem,
  options?: {
    linkedTaskId?: string | null
    phase?: KfzWorkQueueFilter | null
    source?: InboxSourceFilter | null
    basePath?: string | null
  },
): UnifiedInboxCard {
  const linkedTaskId = options?.linkedTaskId ?? null
  const receivedAt = inboxReceivedAt(item)
  const href = buildInboxHref({
    itemId: item.id,
    phase: options?.phase ?? 'all',
    source: options?.source ?? 'all',
    basePath: options?.basePath,
  })
  const reviewStatus =
    presentInboxStatusChip(item, linkedTaskId) ?? {
      label: 'Neu',
      kind: 'new',
    }

  const kfzRow = presentKfzWorkQueueRow(item, {
    linkedTaskId,
    phase: options?.phase ?? 'all',
    source: options?.source ?? 'all',
    basePath: options?.basePath,
  })
  const kfzReview = kfzRow ? presentKfzWebsiteInboxItem(item, { linkedTaskId }) : null

  if (kfzRow && kfzReview) {
    const contact = [kfzReview.phone, kfzReview.email]
      .filter((part): part is string => Boolean(part))
      .join(' · ')

    return {
      itemId: item.id,
      headline: kfzRow.headline,
      sourceLabel: kfzRow.sourceLabel,
      receivedAt,
      receivedAtLabel: formatInboxListDate(receivedAt),
      customerContact: joinCustomerContact(kfzReview.customerName, contact || null),
      requestSummary: kfzRow.requestFacts,
      missingInformationLabel: kfzRow.missingCountLabel,
      missingCount: kfzRow.missingCount,
      reviewStatus: kfzRow.chip,
      href,
      isKfz: true,
      urgencyNote: kfzRow.urgencyNote,
      nextActionLabel: kfzRow.nextActionLabel,
    }
  }

  const contact = presentNonKfzCustomerContact(item)

  return {
    itemId: item.id,
    headline: getInboxListTitle(item),
    sourceLabel: getInboxItemSourceLabel(item),
    receivedAt,
    receivedAtLabel: formatInboxListDate(receivedAt),
    customerContact: contact.label,
    requestSummary: presentNonKfzRequestSummary(item),
    missingInformationLabel: contact.hasContact
      ? UNIFIED_INBOX_CONTACT_PRESENT_STATE
      : UNIFIED_INBOX_CONTACT_MISSING_STATE,
    missingCount: contact.hasContact ? 0 : 1,
    reviewStatus,
    href,
    isKfz: isKfzInboxItem(item),
    urgencyNote: null,
    nextActionLabel: null,
  }
}
