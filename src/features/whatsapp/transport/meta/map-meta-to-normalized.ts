import type {
  MetaWhatsAppContact,
  MetaWhatsAppMessage,
  MetaWhatsAppValue,
  MetaWhatsAppWebhookPayload,
} from '@/features/whatsapp/types/meta-webhook'
import type {
  NormalizedInboundWhatsApp,
  NormalizedWhatsAppMedia,
  NormalizedWhatsAppMessageType,
} from '@/features/whatsapp/types/normalized-inbound-whatsapp'
import {
  downloadWhatsAppMedia,
  type WhatsAppMediaServiceDeps,
} from '@/features/whatsapp/media/whatsapp-media-service'

export type ExtractedMetaWhatsAppMessages = {
  messages: Array<{
    message: MetaWhatsAppMessage
    contacts: MetaWhatsAppContact[]
    metadata: MetaWhatsAppValue['metadata']
    wabaId: string | null
  }>
  statusCount: number
  ignoredChangeCount: number
}

function unixSecondsToIso(timestamp: string | undefined): string {
  const seconds = Number(timestamp)
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return new Date().toISOString()
  }
  return new Date(seconds * 1000).toISOString()
}

function resolveSenderName(
  contacts: MetaWhatsAppContact[],
  phone: string,
): string | null {
  const match =
    contacts.find((contact) => contact.wa_id === phone) ?? contacts[0]
  return match?.profile?.name?.trim() || null
}

function resolveMessageType(
  type: string | undefined,
): NormalizedWhatsAppMessageType {
  if (type === 'text' || type === 'audio' || type === 'image' || type === 'document') {
    return type
  }
  return 'unsupported'
}

/**
 * Extrahiert Messages/Statuses aus einem Meta-Webhook ohne Side Effects.
 */
export function extractMetaWhatsAppMessages(
  payload: MetaWhatsAppWebhookPayload,
): ExtractedMetaWhatsAppMessages {
  const messages: ExtractedMetaWhatsAppMessages['messages'] = []
  let statusCount = 0
  let ignoredChangeCount = 0

  for (const entry of payload.entry ?? []) {
    const wabaId = entry.id?.trim() || null
    for (const change of entry.changes ?? []) {
      if (change.field && change.field !== 'messages') {
        ignoredChangeCount += 1
        continue
      }

      const value = change.value
      if (!value) {
        ignoredChangeCount += 1
        continue
      }

      const statuses = value.statuses ?? []
      statusCount += statuses.length

      for (const message of value.messages ?? []) {
        messages.push({
          message,
          contacts: value.contacts ?? [],
          metadata: value.metadata,
          wabaId,
        })
      }
    }
  }

  return { messages, statusCount, ignoredChangeCount }
}

export async function mapMetaMessageToNormalizedWhatsApp(input: {
  message: MetaWhatsAppMessage
  contacts: MetaWhatsAppContact[]
  metadata: MetaWhatsAppValue['metadata']
  wabaId: string | null
  accessToken: string
  graphApiVersion: string
  mediaDeps?: Partial<WhatsAppMediaServiceDeps>
}): Promise<NormalizedInboundWhatsApp | null> {
  const externalMessageId = input.message.id?.trim() ?? ''
  const senderPhone = input.message.from?.trim() ?? ''
  if (!externalMessageId || !senderPhone) {
    return null
  }

  const type = resolveMessageType(input.message.type)
  const senderName = resolveSenderName(input.contacts, senderPhone)
  const replyToExternalMessageId = input.message.context?.id?.trim() || null

  let text: string | null = null
  let media: NormalizedWhatsAppMedia | null = null
  let rawType: string | null = null

  if (type === 'text') {
    text = input.message.text?.body?.trim() ?? ''
  } else if (type === 'audio' || type === 'image' || type === 'document') {
    const payload =
      type === 'audio'
        ? input.message.audio
        : type === 'image'
          ? input.message.image
          : input.message.document

    const mediaId = payload?.id?.trim()
    if (!mediaId) {
      return null
    }

    const downloaded = await downloadWhatsAppMedia({
      mediaId,
      accessToken: input.accessToken,
      graphApiVersion: input.graphApiVersion,
      type,
      mimeTypeHint: payload?.mime_type,
      filenameHint: payload?.filename,
      voice: Boolean(payload?.voice),
      deps: input.mediaDeps,
    })

    media = {
      mediaId: downloaded.mediaId,
      mimeType: downloaded.mimeType,
      filename: downloaded.filename,
      caption: payload?.caption?.trim() || null,
      bytes: downloaded.bytes,
      sizeBytes: downloaded.sizeBytes,
    }
    text = payload?.caption?.trim() || null
  } else {
    rawType = input.message.type?.trim() || 'unknown'
  }

  return {
    externalMessageId,
    senderPhone,
    senderName,
    receivedAt: unixSecondsToIso(input.message.timestamp),
    type,
    text,
    replyToExternalMessageId,
    media,
    rawType,
    metadata: {
      provider: 'meta_whatsapp',
      phoneNumberId: input.metadata?.phone_number_id ?? null,
      displayPhoneNumber: input.metadata?.display_phone_number ?? null,
      wabaId: input.wabaId,
    },
  }
}
