import { createHash } from 'node:crypto'

import { normalizeAttributionValue } from '@/features/inbound/kfz/lib/normalize-attribution'
import { normalizeInternationalPhone } from '@/features/inbound/kfz/lib/normalize-phone'
import { sanitizePlainTextField } from '@/features/inbound/kfz/lib/sanitize-plain-text'
import {
  KFZ_CONSENT_PURPOSE,
  type NormalizedKfzInquiry,
} from '@/features/inbound/kfz/types/normalized-kfz-inquiry'
import {
  KFZ_PUBLIC_LIMITS,
  type PublicKfzInquiryPayload,
  type PublicKfzUploadMeta,
} from '@/features/inbound/kfz/types/public-kfz-inquiry'

export type NormalizeKfzInquiryFailure = {
  ok: false
  error: string
  code: 'invalid_contact' | 'invalid_consent'
}

export type NormalizeKfzInquirySuccess = {
  ok: true
  inquiry: NormalizedKfzInquiry
}

export type NormalizeKfzInquiryResult =
  | NormalizeKfzInquirySuccess
  | NormalizeKfzInquiryFailure

function buildExternalId(input: {
  submissionId: string | null | undefined
  fullName: string
  phone: string | null
  email: string | null
  consentVersion: string
  postalCode: string
}): string {
  const clientId = input.submissionId?.trim()
  if (clientId && clientId.length > 0 && clientId.length <= KFZ_PUBLIC_LIMITS.submissionId) {
    return `kfz:${clientId}`
  }

  const fingerprint = [
    input.fullName.toLowerCase(),
    input.phone ?? '',
    input.email?.toLowerCase() ?? '',
    input.postalCode,
    input.consentVersion,
  ].join('|')

  const hash = createHash('sha256').update(fingerprint, 'utf8').digest('hex').slice(0, 32)
  return `kfz:fp:${hash}`
}

function normalizeUploadMeta(
  uploads: PublicKfzUploadMeta[] | null | undefined,
): PublicKfzUploadMeta[] {
  if (!uploads || uploads.length === 0) {
    return []
  }

  return uploads.map((entry) => ({
    filename: sanitizePlainTextField(entry.filename, KFZ_PUBLIC_LIMITS.uploadFilename),
    mimeType:
      entry.mimeType == null
        ? entry.mimeType
        : sanitizePlainTextField(entry.mimeType, KFZ_PUBLIC_LIMITS.uploadMimeType) || null,
    sizeBytes: entry.sizeBytes ?? null,
  }))
}

/**
 * Domain-Normalisierung: PublicKfzInquiryPayload → NormalizedKfzInquiry.
 * Getrennt von der öffentlichen Schema-Validierung.
 */
export function normalizeKfzInquiry(
  payload: PublicKfzInquiryPayload,
  receivedAt: string,
): NormalizeKfzInquiryResult {
  if (payload.inquiryProcessingConsent !== true) {
    return {
      ok: false,
      error: 'Einwilligung zur Anfragebearbeitung fehlt oder ist ungültig.',
      code: 'invalid_consent',
    }
  }

  const phoneRaw = payload.phone?.trim() ?? ''
  const emailRaw = payload.email?.trim() ?? ''

  let phone: string | null = null
  if (phoneRaw) {
    phone = normalizeInternationalPhone(phoneRaw)
    if (!phone) {
      return {
        ok: false,
        error: 'Telefonnummer ist ungültig.',
        code: 'invalid_contact',
      }
    }
  }

  let email: string | null = null
  if (emailRaw) {
    email = emailRaw.toLowerCase()
  }

  if (!phone && !email) {
    return {
      ok: false,
      error: 'Mindestens eine Kontaktmethode (Telefon oder E-Mail) ist erforderlich.',
      code: 'invalid_contact',
    }
  }

  const fullName = sanitizePlainTextField(payload.fullName, KFZ_PUBLIC_LIMITS.fullName)
  const city = sanitizePlainTextField(payload.city, KFZ_PUBLIC_LIMITS.city)
  const inquiryReason = sanitizePlainTextField(
    payload.inquiryReason,
    KFZ_PUBLIC_LIMITS.inquiryReason,
  )
  const postalCode = payload.postalCode.trim()

  const consentedAt =
    payload.consentTimestamp?.trim() && payload.consentTimestamp.trim().length > 0
      ? payload.consentTimestamp.trim()
      : receivedAt

  const vehicleYear =
    payload.vehicleYear === undefined || payload.vehicleYear === null
      ? null
      : sanitizePlainTextField(String(payload.vehicleYear), KFZ_PUBLIC_LIMITS.vehicleYear) ||
        null

  const inquiry: NormalizedKfzInquiry = {
    externalId: buildExternalId({
      submissionId: payload.submissionId,
      fullName,
      phone,
      email,
      consentVersion: payload.consentVersion.trim(),
      postalCode,
    }),
    fullName,
    postalCode,
    city,
    phone,
    email,
    preferredChannel: payload.preferredChannel,
    inquiryReason,
    language: payload.language === undefined ? null : payload.language,
    vehicleMake:
      payload.vehicleMake == null
        ? null
        : sanitizePlainTextField(payload.vehicleMake, KFZ_PUBLIC_LIMITS.vehicleMake) || null,
    vehicleModel:
      payload.vehicleModel == null
        ? null
        : sanitizePlainTextField(payload.vehicleModel, KFZ_PUBLIC_LIMITS.vehicleModel) ||
          null,
    vehicleYear,
    contextNotes:
      payload.contextNotes == null
        ? null
        : sanitizePlainTextField(payload.contextNotes, KFZ_PUBLIC_LIMITS.contextNotes) ||
          null,
    consent: {
      purpose: KFZ_CONSENT_PURPOSE,
      granted: true,
      version: sanitizePlainTextField(
        payload.consentVersion,
        KFZ_PUBLIC_LIMITS.consentVersion,
      ),
      consentedAt,
      receivedAt,
    },
    attribution: {
      source: normalizeAttributionValue(payload.source, KFZ_PUBLIC_LIMITS.attribution),
      campaign: normalizeAttributionValue(payload.campaign, KFZ_PUBLIC_LIMITS.attribution),
      utmSource: normalizeAttributionValue(payload.utmSource, KFZ_PUBLIC_LIMITS.attribution),
      utmMedium: normalizeAttributionValue(payload.utmMedium, KFZ_PUBLIC_LIMITS.attribution),
      utmCampaign: normalizeAttributionValue(
        payload.utmCampaign,
        KFZ_PUBLIC_LIMITS.attribution,
      ),
      utmTerm: normalizeAttributionValue(payload.utmTerm, KFZ_PUBLIC_LIMITS.attribution),
      utmContent: normalizeAttributionValue(
        payload.utmContent,
        KFZ_PUBLIC_LIMITS.attribution,
      ),
    },
    uploadMeta: normalizeUploadMeta(payload.uploads),
    receivedAt,
  }

  return { ok: true, inquiry }
}
