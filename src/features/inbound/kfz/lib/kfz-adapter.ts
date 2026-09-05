import type { InboundItem } from '@/features/inbound/types/inbound-item'
import type { NormalizedKfzInquiry } from '@/features/inbound/kfz/types/normalized-kfz-inquiry'

function buildContent(inquiry: NormalizedKfzInquiry): string {
  const lines: string[] = [
    `Kfz-Anfrage von ${inquiry.fullName}`,
    `Ort: ${inquiry.postalCode} ${inquiry.city}`,
    `Anliegen: ${inquiry.inquiryReason}`,
    `Bevorzugter Kanal: ${inquiry.preferredChannel}`,
  ]

  if (inquiry.phone) {
    lines.push(`Telefon: ${inquiry.phone}`)
  }
  if (inquiry.email) {
    lines.push(`E-Mail: ${inquiry.email}`)
  }
  if (inquiry.language) {
    lines.push(`Sprache: ${inquiry.language}`)
  }

  const vehicleParts = [
    inquiry.vehicleMake,
    inquiry.vehicleModel,
    inquiry.vehicleYear,
  ].filter((part): part is string => Boolean(part && part.trim()))

  if (vehicleParts.length > 0) {
    lines.push(`Fahrzeug: ${vehicleParts.join(' ')}`)
  }

  if (inquiry.contextNotes) {
    lines.push(`Kontext: ${inquiry.contextNotes}`)
  }

  if (inquiry.uploadMeta.length > 0) {
    const names = inquiry.uploadMeta.map((u) => u.filename).join(', ')
    lines.push(`Upload-Metadaten: ${names}`)
  }

  return lines.join('\n')
}

function resolveSenderAddress(inquiry: NormalizedKfzInquiry): {
  address: string
  addressKind: 'phone' | 'email'
} {
  if (inquiry.preferredChannel === 'email' && inquiry.email) {
    return { address: inquiry.email, addressKind: 'email' }
  }
  if (
    (inquiry.preferredChannel === 'phone' || inquiry.preferredChannel === 'whatsapp') &&
    inquiry.phone
  ) {
    return { address: inquiry.phone, addressKind: 'phone' }
  }
  if (inquiry.phone) {
    return { address: inquiry.phone, addressKind: 'phone' }
  }
  return { address: inquiry.email!, addressKind: 'email' }
}

/**
 * Reine Übersetzung: NormalizedKfzInquiry → InboundItem.
 * Keine Businesslogik, kein Provider-Wissen, kein KI-Aufruf.
 *
 * Persistenz-Hinweis: channel/source `website` erfordert eine additive
 * Owner-Migration der inbox_items CHECK-Constraints vor Produktions-Inserts
 * (siehe docs/kfz-inbound-local-test.md).
 */
export function toInboundItemFromKfzInquiry(inquiry: NormalizedKfzInquiry): InboundItem {
  const senderAddress = resolveSenderAddress(inquiry)

  const metadata: Record<string, unknown> = {
    acquisition: {
      family: 'website',
      product: 'kfz',
      ...inquiry.attribution,
    },
    inquiry: {
      reason: inquiry.inquiryReason,
      preferredChannel: inquiry.preferredChannel,
      language: inquiry.language,
      location: {
        postalCode: inquiry.postalCode,
        city: inquiry.city,
      },
      vehicle: {
        make: inquiry.vehicleMake,
        model: inquiry.vehicleModel,
        year: inquiry.vehicleYear,
      },
      contextNotes: inquiry.contextNotes,
      phone: inquiry.phone,
      email: inquiry.email,
    },
    /**
     * Nachweis nur für Anfragebearbeitung — getrennt von künftigem Marketing-Consent.
     * Kein Consent-Volltext.
     */
    consentEvidence: inquiry.consent,
    /**
     * Gate 2: nur Metadaten. Sichere Dokumentablage ohne Architekturänderung
     * ist Follow-up (bestehende File-Pipeline erfordert Bytes + Auth-Akteur).
     */
    uploadMeta: inquiry.uploadMeta.length > 0 ? inquiry.uploadMeta : undefined,
  }

  return {
    channel: 'website',
    externalId: inquiry.externalId,
    sender: {
      displayName: inquiry.fullName,
      address: senderAddress.address,
      addressKind: senderAddress.addressKind,
    },
    origin: null,
    receivedAt: inquiry.receivedAt,
    title: `Kfz-Anfrage · ${inquiry.fullName}`,
    content: buildContent(inquiry),
    kind: 'text',
    metadata,
  }
}
