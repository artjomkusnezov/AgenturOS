import {
  formatWhatsAppConfigError,
  getInboundWhatsAppRuntimeConfig,
  listMissingInboundWhatsAppEnvFields,
} from '@/features/whatsapp/config/inbound-whatsapp-config'
import { toInboundItemFromWhatsApp } from '@/features/whatsapp/lib/whatsapp-adapter'
import {
  logWhatsAppInbound,
  shortenWhatsAppExternalId,
} from '@/features/whatsapp/lib/whatsapp-inbound-log'
import { isWhatsAppWebhookEntryAllowed } from '@/features/whatsapp/lib/webhook-entry-filter'
import { verifyMetaSignature256 } from '@/features/whatsapp/lib/verify-meta-signature'
import { ingestInboundItem } from '@/features/inbound/services/inbound-intake-service'
import type { InboundIntakeStore } from '@/features/inbound/types/inbound-intake-store'
import type { WhatsAppMediaServiceDeps } from '@/features/whatsapp/media/whatsapp-media-service'
import {
  classifyMetaWhatsAppWebhook,
  isNonInboxWhatsAppWebhookField,
  type WhatsAppWebhookFieldKind,
} from '@/features/whatsapp/transport/meta/classify-meta-webhook'
import {
  extractMetaWhatsAppMessages,
  mapMetaMessageToNormalizedWhatsApp,
} from '@/features/whatsapp/transport/meta/map-meta-to-normalized'
import type { MetaWhatsAppWebhookPayload } from '@/features/whatsapp/types/meta-webhook'

export type WhatsAppWebhookProcessResult =
  | {
      success: true
      processed: number
      deduplicated: number
      skippedUnsupported: number
      statusEvents: number
      inboxItemIds: string[]
      /** Coexistence + account_update changes acknowledged without Inbox. */
      coexistenceAcknowledged: number
      /** Unknown webhook fields acknowledged safely (no Inbox). */
      unknownFieldsAcknowledged: number
      /** Filtered out by optional allowlist seam (empty allowlist = never). */
      filteredOut: number
    }
  | { success: false; error: string; status: number }

export type MetaWhatsAppInboundTransportDeps = {
  verifySignature: (input: {
    rawBody: string
    signatureHeader: string | null
    appSecret: string
  }) => boolean
  media?: Partial<WhatsAppMediaServiceDeps>
}

function emptySuccess(input?: {
  statusEvents?: number
  coexistenceAcknowledged?: number
  unknownFieldsAcknowledged?: number
  filteredOut?: number
}): Extract<WhatsAppWebhookProcessResult, { success: true }> {
  return {
    success: true,
    processed: 0,
    deduplicated: 0,
    skippedUnsupported: 0,
    statusEvents: input?.statusEvents ?? 0,
    inboxItemIds: [],
    coexistenceAcknowledged: input?.coexistenceAcknowledged ?? 0,
    unknownFieldsAcknowledged: input?.unknownFieldsAcknowledged ?? 0,
    filteredOut: input?.filteredOut ?? 0,
  }
}

function logCoexistenceClassification(
  kind: WhatsAppWebhookFieldKind,
  details: {
    structuralItemCount: number
    rawField: string | null
  },
): void {
  // Metadata only — never bodies, media, tokens, signatures, or secrets.
  if (kind === 'smb_message_echoes') {
    logWhatsAppInbound('coexistence_smb_message_echoes', {
      echoCount: details.structuralItemCount,
      inbox: false,
    })
    return
  }
  if (kind === 'history') {
    logWhatsAppInbound('coexistence_history', {
      historyChunkCount: details.structuralItemCount,
      inbox: false,
    })
    return
  }
  if (kind === 'smb_app_state_sync') {
    logWhatsAppInbound('coexistence_smb_app_state_sync', {
      stateSyncCount: details.structuralItemCount,
      inbox: false,
    })
    return
  }
  if (kind === 'account_update') {
    logWhatsAppInbound('coexistence_account_update', {
      inbox: false,
    })
    return
  }
  if (kind === 'unknown') {
    logWhatsAppInbound('webhook_field_unknown', {
      field: details.rawField ?? 'missing',
      inbox: false,
    })
  }
}

/**
 * Meta-Transport: Signatur → Payload → Classification → NormalizedWhatsApp → Adapter → Intake.
 * Status-Events und Coexistence-Felder erzeugen keinen Eingang.
 * Env phone_number_id / WABA werden nicht als Empfangsfilter genutzt, sofern die
 * optionalen Allowlists leer/unset sind (Testnummer OK).
 */
export async function processMetaWhatsAppInboundWebhook(input: {
  rawBody: string
  signatureHeader: string | null
  store: InboundIntakeStore
  deps?: Partial<MetaWhatsAppInboundTransportDeps>
}): Promise<WhatsAppWebhookProcessResult> {
  const missing = listMissingInboundWhatsAppEnvFields()
  const config = getInboundWhatsAppRuntimeConfig()
  if (!config || missing.length > 0) {
    logWhatsAppInbound('config_missing', { fields: missing.join(',') })
    return {
      success: false,
      error: formatWhatsAppConfigError(missing),
      status: 503,
    }
  }

  const verifySignature = input.deps?.verifySignature ?? verifyMetaSignature256

  if (!config.skipSignatureVerify) {
    const signatureHeader = input.signatureHeader?.trim() ?? ''
    const valid = verifySignature({
      rawBody: input.rawBody,
      signatureHeader: input.signatureHeader,
      appSecret: config.metaAppSecret,
    })
    if (!valid) {
      logWhatsAppInbound('signature_invalid', {
        signaturePresent: signatureHeader.length > 0,
        signatureSha256Format: /^sha256=[0-9a-fA-F]{64}$/.test(signatureHeader),
        signatureLength: signatureHeader.length,
        rawBodyBytes: Buffer.byteLength(input.rawBody, 'utf8'),
      })
      return { success: false, error: 'Ungültige Webhook-Signatur.', status: 401 }
    }
  } else {
    logWhatsAppInbound('signature_skipped_dev', {})
  }

  let payload: MetaWhatsAppWebhookPayload
  try {
    payload = JSON.parse(input.rawBody) as MetaWhatsAppWebhookPayload
  } catch {
    logWhatsAppInbound('payload_malformed', {})
    return { success: false, error: 'Ungültiger Webhook-Payload.', status: 400 }
  }

  logWhatsAppInbound('event_received', {
    object: payload.object ?? 'unknown',
  })

  if (payload.object !== 'whatsapp_business_account') {
    logWhatsAppInbound('ignored', { reason: 'object_mismatch' })
    return emptySuccess()
  }

  const classified = classifyMetaWhatsAppWebhook(payload)

  for (const change of classified.changes) {
    if (!isNonInboxWhatsAppWebhookField(change.field)) {
      continue
    }
    logCoexistenceClassification(change.field, {
      structuralItemCount: change.structuralItemCount,
      rawField: change.rawField,
    })
  }

  const coexistenceAcknowledged = classified.coexistenceChangeCount
  const unknownFieldsAcknowledged = classified.unknownChangeCount

  const extracted = extractMetaWhatsAppMessages(payload)

  let filteredOut = 0
  const allowedMessages = extracted.messages.filter((entry) => {
    const allowed = isWhatsAppWebhookEntryAllowed({
      wabaId: entry.wabaId,
      phoneNumberId: entry.metadata?.phone_number_id?.trim() || null,
      allowedWabaIds: config.webhookAllowedWabaIds,
      allowedPhoneNumberIds: config.webhookAllowedPhoneNumberIds,
    })
    if (!allowed) {
      filteredOut += 1
      logWhatsAppInbound('filtered_out', {
        reason: 'allowlist_mismatch',
      })
    }
    return allowed
  })

  if (allowedMessages.length === 0) {
    const reason =
      coexistenceAcknowledged > 0 || unknownFieldsAcknowledged > 0
        ? 'coexistence_or_unknown_ack'
        : extracted.statusCount > 0
          ? 'statuses_or_empty'
          : filteredOut > 0
            ? 'filtered_empty'
            : 'statuses_or_empty'

    logWhatsAppInbound('ignored', {
      reason,
      statusEvents: extracted.statusCount,
      coexistenceAcknowledged,
      unknownFieldsAcknowledged,
      filteredOut,
    })
    return emptySuccess({
      statusEvents: extracted.statusCount,
      coexistenceAcknowledged,
      unknownFieldsAcknowledged,
      filteredOut,
    })
  }

  let processed = 0
  let deduplicated = 0
  let skippedUnsupported = 0
  const inboxItemIds: string[] = []

  for (const entry of allowedMessages) {
    const rawType = entry.message.type ?? 'unknown'
    const externalIdPreview = shortenWhatsAppExternalId(entry.message.id)

    try {
      const normalized = await mapMetaMessageToNormalizedWhatsApp({
        message: entry.message,
        contacts: entry.contacts,
        metadata: entry.metadata,
        wabaId: entry.wabaId,
        accessToken: config.accessToken,
        graphApiVersion: config.graphApiVersion,
        mediaDeps: input.deps?.media,
      })

      if (!normalized) {
        skippedUnsupported += 1
        logWhatsAppInbound('ignored', {
          reason: 'unmappable_message',
          messageType: rawType,
          externalMessageId: externalIdPreview,
        })
        continue
      }

      const inboundItem = toInboundItemFromWhatsApp(normalized)
      const result = await ingestInboundItem(input.store, {
        agencyId: config.agencyId,
        actorUserId: config.actorUserId,
        item: inboundItem,
      })

      if (!result.success) {
        logWhatsAppInbound('failed', {
          messageType: normalized.type,
          externalMessageId: externalIdPreview,
          reason: 'intake_error',
        })
        return { success: false, error: result.error, status: 500 }
      }

      if (result.deduplicated) {
        deduplicated += 1
        logWhatsAppInbound('duplicate', {
          messageType: normalized.type,
          externalMessageId: externalIdPreview,
        })
      } else {
        processed += 1
        inboxItemIds.push(result.item.id)
        logWhatsAppInbound('success', {
          messageType: normalized.type,
          externalMessageId: externalIdPreview,
        })
      }

      if (normalized.type === 'unsupported') {
        skippedUnsupported += 1
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Verarbeitung fehlgeschlagen.'
      logWhatsAppInbound('failed', {
        messageType: rawType,
        externalMessageId: externalIdPreview,
        reason: 'exception',
      })
      return { success: false, error: message, status: 500 }
    }
  }

  return {
    success: true,
    processed,
    deduplicated,
    skippedUnsupported,
    statusEvents: extracted.statusCount,
    inboxItemIds,
    coexistenceAcknowledged,
    unknownFieldsAcknowledged,
    filteredOut,
  }
}
