import {
  KFZ_LANDING_CONSENT_VERSION,
  KFZ_LANDING_SOURCE,
} from '@/features/inbound/kfz/lib/kfz-landing-constants'
import {
  toPublicKfzUploadMeta,
  type KfzLandingDocumentCandidate,
} from '@/features/inbound/kfz/lib/kfz-landing-documents'
import { isUsableKfzLandingPhone } from '@/features/inbound/kfz/lib/kfz-landing-steps'
import {
  KFZ_PREFERRED_CHANNELS,
  type KfzPreferredChannel,
  type PublicKfzInquiryPayload,
  type PublicKfzUploadMeta,
} from '@/features/inbound/kfz/types/public-kfz-inquiry'

export type KfzLandingFormValues = {
  fullName: string
  postalCode: string
  city: string
  phone: string
  email: string
  preferredChannel: KfzPreferredChannel
  inquiryReason: string
  inquiryProcessingConsent: boolean
  vehicleMake: string
  vehicleModel: string
  vehicleYear: string
  contextNotes: string
}

export type KfzLandingAttribution = {
  campaign?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmTerm?: string | null
  utmContent?: string | null
}

export type BuildKfzLandingPayloadInput = {
  values: KfzLandingFormValues
  submissionId: string
  consentTimestamp: string
  attribution?: KfzLandingAttribution
  language?: PublicKfzInquiryPayload['language']
  source?: string | null
  uploads?: PublicKfzUploadMeta[] | null
  documents?: readonly KfzLandingDocumentCandidate[]
}

export type BuildKfzLandingPayloadResult =
  | { ok: true; payload: PublicKfzInquiryPayload }
  | {
      ok: false
      error: string
      code:
        | 'invalid_consent'
        | 'missing_contact'
        | 'missing_field'
        | 'invalid_field'
        | 'missing_submission_id'
        | 'whatsapp_requires_phone'
    }

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Mappt Landingpage-Formwerte auf den Gate-2 PublicKfzInquiryPayload-Vertrag.
 * Keine Domain-Normalisierung — nur Mapping + Consent-/Kontakt-Mindestchecks.
 * Telefon bleibt inkl. führendem `+` unverändert (Server normalisiert später).
 */
export function buildKfzLandingPayload(
  input: BuildKfzLandingPayloadInput,
): BuildKfzLandingPayloadResult {
  const submissionId = input.submissionId.trim()
  if (!submissionId) {
    return {
      ok: false,
      error: 'submissionId fehlt.',
      code: 'missing_submission_id',
    }
  }

  if (input.values.inquiryProcessingConsent !== true) {
    return {
      ok: false,
      error: 'Bitte stimmen Sie der Bearbeitung Ihrer Anfrage zu.',
      code: 'invalid_consent',
    }
  }

  const fullName = input.values.fullName.trim()
  const postalCode = input.values.postalCode.trim()
  const city = input.values.city.trim()
  const inquiryReason = input.values.inquiryReason.trim()

  if (!fullName) {
    return { ok: false, error: 'Bitte geben Sie Ihren Namen an.', code: 'missing_field' }
  }
  if (!postalCode) {
    return { ok: false, error: 'Bitte geben Sie Ihre PLZ an.', code: 'missing_field' }
  }
  if (!city) {
    return { ok: false, error: 'Bitte geben Sie Ihren Ort an.', code: 'missing_field' }
  }
  if (!inquiryReason) {
    return {
      ok: false,
      error: 'Bitte beschreiben Sie kurz Ihr Anliegen.',
      code: 'missing_field',
    }
  }

  if (
    !(KFZ_PREFERRED_CHANNELS as readonly string[]).includes(input.values.preferredChannel)
  ) {
    return {
      ok: false,
      error: 'Bevorzugter Kontaktweg ist ungültig.',
      code: 'invalid_field',
    }
  }

  // Führendes + und Format nicht anfassen — nur trimmen.
  const phone = emptyToNull(input.values.phone)
  const email = emptyToNull(input.values.email)

  if (input.values.preferredChannel === 'whatsapp') {
    if (!phone || !isUsableKfzLandingPhone(phone)) {
      return {
        ok: false,
        error:
          'Für WhatsApp benötigen wir eine nutzbare Telefonnummer. Sie können stattdessen Telefon oder E-Mail wählen.',
        code: 'whatsapp_requires_phone',
      }
    }
  } else if (!phone && !email) {
    return {
      ok: false,
      error: 'Bitte Telefon oder E-Mail angeben.',
      code: 'missing_contact',
    }
  }

  const attr = input.attribution ?? {}

  const payload: PublicKfzInquiryPayload = {
    fullName,
    postalCode,
    city,
    phone,
    email,
    preferredChannel: input.values.preferredChannel,
    inquiryReason,
    inquiryProcessingConsent: true,
    consentVersion: KFZ_LANDING_CONSENT_VERSION,
    consentTimestamp: input.consentTimestamp,
    language: input.language ?? 'de',
    vehicleMake: emptyToNull(input.values.vehicleMake),
    vehicleModel: emptyToNull(input.values.vehicleModel),
    vehicleYear: emptyToNull(input.values.vehicleYear),
    contextNotes: emptyToNull(input.values.contextNotes),
    source: input.source ?? KFZ_LANDING_SOURCE,
    campaign: attr.campaign ?? null,
    utmSource: attr.utmSource ?? null,
    utmMedium: attr.utmMedium ?? null,
    utmCampaign: attr.utmCampaign ?? null,
    utmTerm: attr.utmTerm ?? null,
    utmContent: attr.utmContent ?? null,
    submissionId,
    uploads: resolveLandingUploads(input),
  }

  return { ok: true, payload }
}

function resolveLandingUploads(
  input: BuildKfzLandingPayloadInput,
): PublicKfzUploadMeta[] | null {
  if (input.documents && input.documents.length > 0) {
    return toPublicKfzUploadMeta(input.documents)
  }
  if (input.uploads && input.uploads.length > 0) {
    return input.uploads
  }
  return null
}

/** Liest optionale UTM-/Campaign-Parameter aus einer Query-Map (ohne PII). */
export function readKfzLandingAttributionFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined | null>,
): KfzLandingAttribution {
  const get = (key: string): string | null => {
    if (params instanceof URLSearchParams) {
      const value = params.get(key)?.trim()
      return value && value.length > 0 ? value : null
    }
    const raw = params[key]
    const value = Array.isArray(raw) ? raw[0] : raw
    if (typeof value !== 'string') {
      return null
    }
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  return {
    campaign: get('campaign'),
    utmSource: get('utm_source'),
    utmMedium: get('utm_medium'),
    utmCampaign: get('utm_campaign'),
    utmTerm: get('utm_term'),
    utmContent: get('utm_content'),
  }
}
