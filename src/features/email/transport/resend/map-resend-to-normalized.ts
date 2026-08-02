import { extractOriginFromForwardedBody, parseEmailAddressHeader, buildFallbackMessageId } from '@/features/email/lib/email-origin-heuristics'
import type { NormalizedInboundEmail } from '@/features/email/types/normalized-inbound-email'

export type ResendReceivedEmailPayload = {
  id: string
  from: string
  to?: string[]
  subject?: string | null
  created_at?: string
  message_id?: string | null
  text?: string | null
  html?: string | null
  headers?: Record<string, string> | null
}

export type ResendAttachmentPayload = {
  id: string
  filename?: string | null
  content_type?: string | null
  content_disposition?: string | null
  content_id?: string | null
  size?: number | null
  downloadUrl?: string | null
  bytes?: ArrayBuffer
}

/**
 * Mappt bereits geladene Resend-Daten auf den providerneutralen Vertrag.
 * Kein Resend-SDK im Rückgabetyp.
 */
export function mapResendPayloadToNormalizedEmail(input: {
  email: ResendReceivedEmailPayload
  attachments: ResendAttachmentPayload[]
}): NormalizedInboundEmail {
  const headerFrom =
    parseEmailAddressHeader(input.email.headers?.from) ??
    parseEmailAddressHeader(input.email.from)

  if (!headerFrom) {
    throw new Error('Absender fehlt.')
  }

  const receivedAt = input.email.created_at?.trim() || new Date().toISOString()
  const subject = input.email.subject ?? null
  const plainText = input.email.text ?? null
  const html = input.email.html ?? null

  const messageId =
    input.email.message_id?.trim() ||
    input.email.headers?.['message-id']?.trim() ||
    buildFallbackMessageId({
      receivedAt,
      from: headerFrom.address,
      subject: subject ?? '',
      bodyPreview: plainText ?? html ?? '',
    })

  const origin =
    parseEmailAddressHeader(input.email.headers?.['resent-from']) ??
    extractOriginFromForwardedBody(plainText, html)

  return {
    messageId,
    sender: headerFrom,
    origin,
    receivedAt,
    subject,
    plainText,
    html,
    attachments: input.attachments.map((attachment) => ({
      filename: attachment.filename || 'anhang',
      mimeType: attachment.content_type || 'application/octet-stream',
      bytes: attachment.bytes ?? new ArrayBuffer(0),
      sizeBytes: attachment.size ?? attachment.bytes?.byteLength ?? 0,
      disposition:
        attachment.content_disposition === 'inline'
          ? 'inline'
          : attachment.content_disposition === 'attachment'
            ? 'attachment'
            : null,
      contentId: attachment.content_id ?? null,
    })),
    metadata: {
      to: input.email.to ?? [],
    },
  }
}
