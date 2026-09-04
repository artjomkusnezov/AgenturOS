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
import { verifyMetaSignature256 } from '@/features/whatsapp/lib/verify-meta-signature'
import { ingestInboundItem } from '@/features/inbound/services/inbound-intake-service'
import type { InboundIntakeStore } from '@/features/inbound/types/inbound-intake-store'
import type { WhatsAppMediaServiceDeps } from '@/features/whatsapp/media/whatsapp-media-service'
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

/**
 * Meta-Transport: Signatur → Payload → NormalizedWhatsApp → Adapter → Intake.
 * Status-Events erzeugen keinen Eingang.
 * Env phone_number_id / WABA werden nicht als Empfangsfilter genutzt (Testnummer OK).
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
    const valid = verifySignature({
      rawBody: input.rawBody,
      signatureHeader: input.signatureHeader,
      appSecret: config.metaAppSecret,
    })
    if (!valid) {
      logWhatsAppInbound('signature_invalid', {})
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
    return {
      success: true,
      processed: 0,
      deduplicated: 0,
      skippedUnsupported: 0,
      statusEvents: 0,
      inboxItemIds: [],
    }
  }

  const extracted = extractMetaWhatsAppMessages(payload)

  // Nur Status-Events / leere Changes: schnell 200, kein Intake.
  if (extracted.messages.length === 0) {
    logWhatsAppInbound('ignored', {
      reason: 'statuses_or_empty',
      statusEvents: extracted.statusCount,
    })
    return {
      success: true,
      processed: 0,
      deduplicated: 0,
      skippedUnsupported: 0,
      statusEvents: extracted.statusCount,
      inboxItemIds: [],
    }
  }

  let processed = 0
  let deduplicated = 0
  let skippedUnsupported = 0
  const inboxItemIds: string[] = []

  for (const entry of extracted.messages) {
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
  }
}
