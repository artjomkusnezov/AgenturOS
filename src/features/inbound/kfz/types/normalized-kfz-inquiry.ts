/**
 * Domain-normalisierte Kfz-Anfrage (nach öffentlicher Validierung).
 * Adapter mappt ausschließlich dieses Shape auf InboundItem.
 */

import type {
  KfzLanguage,
  KfzPreferredChannel,
  PublicKfzUploadMeta,
} from '@/features/inbound/kfz/types/public-kfz-inquiry'

export type NormalizedKfzAttribution = {
  source: string | null
  campaign: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
}

/**
 * Nachweis der Anfragebearbeitungs-Einwilligung.
 * Bewusst ohne Consent-Volltext (nicht loggen / nicht speichern).
 */
export type KfzInquiryConsentEvidence = {
  purpose: 'inquiry_processing'
  granted: true
  version: string
  consentedAt: string
  /** Server-Empfangszeit — unabhängig vom Client-Consent-Timestamp. */
  receivedAt: string
}

export type NormalizedKfzInquiry = {
  externalId: string
  fullName: string
  postalCode: string
  city: string
  phone: string | null
  email: string | null
  preferredChannel: KfzPreferredChannel
  inquiryReason: string
  language: KfzLanguage | null
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleYear: string | null
  contextNotes: string | null
  consent: KfzInquiryConsentEvidence
  attribution: NormalizedKfzAttribution
  /** Nur Metadaten — Binärspeicherung ist Follow-up. */
  uploadMeta: PublicKfzUploadMeta[]
  receivedAt: string
}

/** Aktuelle Consent-Vertragsfamilie für Gate 2 (Version kommt vom Client). */
export const KFZ_CONSENT_PURPOSE = 'inquiry_processing' as const
