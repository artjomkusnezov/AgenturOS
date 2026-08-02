import { Resend } from 'resend'

import { getInboundEmailRuntimeConfig } from '@/features/email/config/inbound-email-config'
import { toInboundItemFromEmail } from '@/features/email/lib/email-adapter'
import {
  mapResendPayloadToNormalizedEmail,
  type ResendAttachmentPayload,
  type ResendReceivedEmailPayload,
} from '@/features/email/transport/resend/map-resend-to-normalized'
import { ingestInboundItem } from '@/features/inbound/services/inbound-intake-service'
import type { InboundIntakeStore } from '@/features/inbound/types/inbound-intake-store'

export type ResendWebhookProcessResult =
  | { success: true; deduplicated: boolean; inboxItemId: string }
  | { success: false; error: string; status: number }

type ResendWebhookHeaders = {
  id: string
  timestamp: string
  signature: string
}

export type ResendInboundTransportDeps = {
  verifyWebhook: (input: {
    payload: string
    headers: ResendWebhookHeaders
    webhookSecret: string
  }) => unknown
  fetchReceivedEmail: (emailId: string, apiKey: string) => Promise<ResendReceivedEmailPayload>
  fetchAttachments: (
    emailId: string,
    apiKey: string,
  ) => Promise<ResendAttachmentPayload[]>
}

function createDefaultDeps(apiKey: string): ResendInboundTransportDeps {
  const resend = new Resend(apiKey)

  return {
    verifyWebhook: ({ payload, headers, webhookSecret }) =>
      resend.webhooks.verify({
        payload,
        headers,
        webhookSecret,
      }),
    async fetchReceivedEmail(emailId, key) {
      const client = new Resend(key)
      const { data, error } = await client.emails.receiving.get(emailId)
      if (error || !data) {
        throw new Error(error?.message ?? 'E-Mail konnte nicht geladen werden.')
      }
      return data as ResendReceivedEmailPayload
    },
    async fetchAttachments(emailId, key) {
      const client = new Resend(key)
      const { data, error } = await client.emails.receiving.attachments.list({
        emailId,
      })

      if (error) {
        throw new Error(error.message)
      }

      const listed = (data?.data ?? []) as Array<{
        id: string
        filename?: string | null
        content_type?: string | null
        content_disposition?: string | null
        content_id?: string | null
        size?: number | null
        download_url?: string | null
      }>

      const attachments: ResendAttachmentPayload[] = []

      for (const entry of listed) {
        let bytes = new ArrayBuffer(0)
        if (entry.download_url) {
          const response = await fetch(entry.download_url)
          if (response.ok) {
            bytes = await response.arrayBuffer()
          }
        }

        attachments.push({
          id: entry.id,
          filename: entry.filename,
          content_type: entry.content_type,
          content_disposition: entry.content_disposition,
          content_id: entry.content_id,
          size: entry.size,
          downloadUrl: entry.download_url,
          bytes,
        })
      }

      return attachments
    },
  }
}

/**
 * Resend-Transport: Signatur → Laden → NormalizedInboundEmail → Adapter → Intake.
 * Der Adapter kennt Resend nicht.
 */
export async function processResendInboundWebhook(input: {
  rawBody: string
  headerId: string | null
  headerTimestamp: string | null
  headerSignature: string | null
  store: InboundIntakeStore
  deps?: Partial<ResendInboundTransportDeps>
}): Promise<ResendWebhookProcessResult> {
  const config = getInboundEmailRuntimeConfig()
  if (!config) {
    return {
      success: false,
      error: 'E-Mail-Inbound ist nicht konfiguriert.',
      status: 503,
    }
  }

  if (!input.headerId || !input.headerTimestamp || !input.headerSignature) {
    return { success: false, error: 'Webhook-Signatur fehlt.', status: 401 }
  }

  const defaults =
    input.deps?.verifyWebhook && input.deps?.fetchReceivedEmail && input.deps?.fetchAttachments
      ? null
      : createDefaultDeps(config.resendApiKey)

  const deps: ResendInboundTransportDeps = {
    verifyWebhook: input.deps?.verifyWebhook ?? defaults!.verifyWebhook,
    fetchReceivedEmail: input.deps?.fetchReceivedEmail ?? defaults!.fetchReceivedEmail,
    fetchAttachments: input.deps?.fetchAttachments ?? defaults!.fetchAttachments,
  }

  let event: { type?: string; data?: { email_id?: string } }

  try {
    event = deps.verifyWebhook({
      payload: input.rawBody,
      headers: {
        id: input.headerId,
        timestamp: input.headerTimestamp,
        signature: input.headerSignature,
      },
      webhookSecret: config.resendWebhookSecret,
    }) as { type?: string; data?: { email_id?: string } }
  } catch {
    return { success: false, error: 'Ungültige Webhook-Signatur.', status: 401 }
  }

  if (event.type !== 'email.received') {
    return { success: false, error: 'Ignoriertes Event.', status: 200 }
  }

  const emailId = event.data?.email_id?.trim()
  if (!emailId) {
    return { success: false, error: 'E-Mail-ID fehlt.', status: 400 }
  }

  try {
    const [email, attachments] = await Promise.all([
      deps.fetchReceivedEmail(emailId, config.resendApiKey),
      deps.fetchAttachments(emailId, config.resendApiKey),
    ])

    const normalized = mapResendPayloadToNormalizedEmail({ email, attachments })
    const inboundItem = toInboundItemFromEmail(normalized)
    const result = await ingestInboundItem(input.store, {
      agencyId: config.agencyId,
      actorUserId: config.actorUserId,
      item: inboundItem,
    })

    if (!result.success) {
      return { success: false, error: result.error, status: 500 }
    }

    return {
      success: true,
      deduplicated: result.deduplicated,
      inboxItemId: result.item.id,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verarbeitung fehlgeschlagen.'
    return { success: false, error: message, status: 500 }
  }
}
