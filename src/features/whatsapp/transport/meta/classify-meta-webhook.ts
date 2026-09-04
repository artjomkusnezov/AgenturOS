import type { WhatsAppCoexistenceEvent } from '@/features/whatsapp/types/coexistence-events'
import type {
  MetaWhatsAppChange,
  MetaWhatsAppWebhookPayload,
} from '@/features/whatsapp/types/meta-webhook'

/**
 * Defensive field classification for Meta WhatsApp webhooks.
 * Known Coexistence fields are named explicitly; everything else is `unknown`.
 * Do not invent nested payload semantics beyond safe counts.
 */

export type WhatsAppWebhookFieldKind =
  | 'messages'
  | 'smb_message_echoes'
  | 'history'
  | 'smb_app_state_sync'
  | 'account_update'
  | 'unknown'

export type ClassifiedWhatsAppChange = {
  field: WhatsAppWebhookFieldKind
  rawField: string | null
  wabaId: string | null
  phoneNumberId: string | null
  messageCount: number
  statusCount: number
  /** Safe structural count for coexistence / unknown value bags. */
  structuralItemCount: number
}

export type ClassifiedMetaWhatsAppWebhook = {
  changes: ClassifiedWhatsAppChange[]
  /** Per-kind change counts (one change = one webhook `changes[]` entry). */
  changeCounts: Record<WhatsAppWebhookFieldKind, number>
  /** Distinct models for later conversation / sync layers — never Inbox. */
  coexistenceEvents: WhatsAppCoexistenceEvent[]
  coexistenceChangeCount: number
  unknownChangeCount: number
  messageChangeCount: number
  totalStatusCount: number
  totalMessageCount: number
}

const EMPTY_COUNTS: Record<WhatsAppWebhookFieldKind, number> = {
  messages: 0,
  smb_message_echoes: 0,
  history: 0,
  smb_app_state_sync: 0,
  account_update: 0,
  unknown: 0,
}

export function classifyMetaWhatsAppWebhookField(
  field: string | null | undefined,
): WhatsAppWebhookFieldKind {
  const normalized = field?.trim() ?? ''
  if (normalized.length === 0) {
    return 'unknown'
  }
  switch (normalized) {
    case 'messages':
      return 'messages'
    case 'smb_message_echoes':
      return 'smb_message_echoes'
    case 'history':
      return 'history'
    case 'smb_app_state_sync':
      return 'smb_app_state_sync'
    case 'account_update':
      return 'account_update'
    default:
      return 'unknown'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

function readPhoneNumberId(value: unknown): string | null {
  if (!isRecord(value)) {
    return null
  }
  const metadata = value.metadata
  if (!isRecord(metadata)) {
    return null
  }
  const phoneNumberId = metadata.phone_number_id
  return typeof phoneNumberId === 'string' && phoneNumberId.trim().length > 0
    ? phoneNumberId.trim()
    : null
}

/**
 * Structural counts only — never inspect message bodies, captions, or media ids for logging.
 */
function structuralItemCountForField(
  kind: WhatsAppWebhookFieldKind,
  value: unknown,
): number {
  if (!isRecord(value)) {
    return 0
  }

  switch (kind) {
    case 'smb_message_echoes':
      return arrayLength(value.message_echoes)
    case 'history':
      return arrayLength(value.history)
    case 'smb_app_state_sync':
      return arrayLength(value.state_sync)
    case 'account_update':
      return 1
    case 'unknown':
      return 1
    case 'messages':
      return arrayLength(value.messages) + arrayLength(value.statuses)
    default:
      return 0
  }
}

function toCoexistenceEvent(
  change: ClassifiedWhatsAppChange,
): WhatsAppCoexistenceEvent | null {
  switch (change.field) {
    case 'smb_message_echoes':
      return {
        kind: 'smb_message_echoes',
        wabaId: change.wabaId,
        phoneNumberId: change.phoneNumberId,
        echoCount: change.structuralItemCount,
      }
    case 'history':
      return {
        kind: 'history',
        wabaId: change.wabaId,
        phoneNumberId: change.phoneNumberId,
        historyChunkCount: change.structuralItemCount,
      }
    case 'smb_app_state_sync':
      return {
        kind: 'smb_app_state_sync',
        wabaId: change.wabaId,
        phoneNumberId: change.phoneNumberId,
        stateSyncCount: change.structuralItemCount,
      }
    case 'account_update':
      return {
        kind: 'account_update',
        wabaId: change.wabaId,
        phoneNumberId: change.phoneNumberId,
      }
    case 'unknown':
      return {
        kind: 'unknown',
        rawField: change.rawField,
        wabaId: change.wabaId,
        phoneNumberId: change.phoneNumberId,
      }
    case 'messages':
      return null
    default:
      return null
  }
}

function classifyChange(
  change: MetaWhatsAppChange,
  wabaId: string | null,
): ClassifiedWhatsAppChange {
  const rawField = change.field?.trim() || null
  const field = classifyMetaWhatsAppWebhookField(change.field)
  const value = change.value as unknown
  const phoneNumberId = readPhoneNumberId(value)

  let messageCount = 0
  let statusCount = 0
  if (field === 'messages' && isRecord(value)) {
    messageCount = arrayLength(value.messages)
    statusCount = arrayLength(value.statuses)
  }

  return {
    field,
    rawField,
    wabaId,
    phoneNumberId,
    messageCount,
    statusCount,
    structuralItemCount: structuralItemCountForField(field, value),
  }
}

/**
 * Classifies all webhook changes without side effects.
 * Standard `messages` remain separate from Coexistence models.
 */
export function classifyMetaWhatsAppWebhook(
  payload: MetaWhatsAppWebhookPayload,
): ClassifiedMetaWhatsAppWebhook {
  const changes: ClassifiedWhatsAppChange[] = []
  const changeCounts: Record<WhatsAppWebhookFieldKind, number> = { ...EMPTY_COUNTS }
  const coexistenceEvents: WhatsAppCoexistenceEvent[] = []

  for (const entry of payload.entry ?? []) {
    const wabaId = entry.id?.trim() || null
    for (const change of entry.changes ?? []) {
      const classified = classifyChange(change, wabaId)
      changes.push(classified)
      changeCounts[classified.field] += 1

      const coexistence = toCoexistenceEvent(classified)
      if (coexistence) {
        coexistenceEvents.push(coexistence)
      }
    }
  }

  return {
    changes,
    changeCounts,
    coexistenceEvents,
    coexistenceChangeCount:
      changeCounts.smb_message_echoes +
      changeCounts.history +
      changeCounts.smb_app_state_sync +
      changeCounts.account_update,
    unknownChangeCount: changeCounts.unknown,
    messageChangeCount: changeCounts.messages,
    totalStatusCount: changes.reduce((sum, c) => sum + c.statusCount, 0),
    totalMessageCount: changes.reduce((sum, c) => sum + c.messageCount, 0),
  }
}

/** Fields that must never become normal Inbox items in this readiness phase. */
export function isNonInboxWhatsAppWebhookField(
  kind: WhatsAppWebhookFieldKind,
): boolean {
  return kind !== 'messages'
}
