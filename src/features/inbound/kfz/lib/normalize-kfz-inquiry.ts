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
  type PublicKfzQuestionnaire,
  type PublicKfzQuestionnaireAnswer,
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

/**
 * Fallback-Idempotenz ohne submissionId: Hash aus stabilen normalisierten
 * Anfragefeldern (Identität + Anliegen + Consent-Version/-Timestamp).
 * Der gespeicherte Key enthält keine Klartext-PII — nur den Digest.
 * Fingerprint-Inputs nicht loggen.
 */
function buildExternalId(input: {
  submissionId: string | null | undefined
  fullName: string
  phone: string | null
  email: string | null
  postalCode: string
  city: string
  preferredChannel: string
  inquiryReason: string
  language: string | null
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleYear: string | null
  contextNotes: string | null
  consentVersion: string
  /** Nur Client-Consent-Timestamp — nie server-receivedAt (Replay-instabil). */
  consentTimestamp: string | null
  questionnaireFingerprint: string
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
    input.city.toLowerCase(),
    input.preferredChannel,
    input.inquiryReason.toLowerCase(),
    input.language ?? '',
    input.vehicleMake?.toLowerCase() ?? '',
    input.vehicleModel?.toLowerCase() ?? '',
    input.vehicleYear ?? '',
    input.contextNotes?.toLowerCase() ?? '',
    input.consentVersion,
    input.consentTimestamp ?? '',
    input.questionnaireFingerprint,
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

  return uploads.map((entry) => {
    const meta: PublicKfzUploadMeta = {
      filename: sanitizePlainTextField(entry.filename, KFZ_PUBLIC_LIMITS.uploadFilename),
      mimeType:
        entry.mimeType == null
          ? entry.mimeType
          : sanitizePlainTextField(entry.mimeType, KFZ_PUBLIC_LIMITS.uploadMimeType) ||
            null,
      sizeBytes: entry.sizeBytes ?? null,
    }
    if (entry.group) {
      meta.group = entry.group
    }
    return meta
  })
}

function normalizeQuestionnaire(
  questionnaire: PublicKfzInquiryPayload['questionnaire'],
): PublicKfzQuestionnaire | null {
  if (!questionnaire) {
    return null
  }

  const answers: PublicKfzQuestionnaireAnswer[] = questionnaire.answers.map((entry) => {
    const answer: PublicKfzQuestionnaireAnswer = {
      id: sanitizePlainTextField(entry.id, KFZ_PUBLIC_LIMITS.questionnaireId),
      label: sanitizePlainTextField(entry.label, KFZ_PUBLIC_LIMITS.questionnaireLabel),
      value: sanitizePlainTextField(entry.value, KFZ_PUBLIC_LIMITS.questionnaireValue),
    }
    if (entry.unknown === true) {
      answer.unknown = true
    }
    return answer
  })

  return {
    branchId: sanitizePlainTextField(
      questionnaire.branchId,
      KFZ_PUBLIC_LIMITS.questionnaireId,
    ),
    branchLabel: sanitizePlainTextField(
      questionnaire.branchLabel,
      KFZ_PUBLIC_LIMITS.questionnaireLabel,
    ),
    path: questionnaire.path,
    answers,
    missingFacts: questionnaire.missingFacts.map((fact) =>
      sanitizePlainTextField(fact, KFZ_PUBLIC_LIMITS.questionnaireMissingFact),
    ),
    boundaries: questionnaire.boundaries.map((boundary) =>
      sanitizePlainTextField(boundary, KFZ_PUBLIC_LIMITS.questionnaireBoundary),
    ),
  }
}

function questionnaireFingerprint(questionnaire: PublicKfzQuestionnaire | null): string {
  if (!questionnaire) {
    return ''
  }
  const answerPart = questionnaire.answers
    .map((entry) => `${entry.id}=${entry.value.toLowerCase()}`)
    .join(';')
  return [
    questionnaire.branchId,
    questionnaire.path,
    answerPart,
    questionnaire.missingFacts.join(';'),
  ]
    .join('|')
    .toLowerCase()
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

  const clientConsentTimestamp =
    payload.consentTimestamp?.trim() && payload.consentTimestamp.trim().length > 0
      ? payload.consentTimestamp.trim()
      : null
  const consentedAt = clientConsentTimestamp ?? receivedAt

  const vehicleYear =
    payload.vehicleYear === undefined || payload.vehicleYear === null
      ? null
      : sanitizePlainTextField(String(payload.vehicleYear), KFZ_PUBLIC_LIMITS.vehicleYear) ||
        null

  const vehicleMake =
    payload.vehicleMake == null
      ? null
      : sanitizePlainTextField(payload.vehicleMake, KFZ_PUBLIC_LIMITS.vehicleMake) || null
  const vehicleModel =
    payload.vehicleModel == null
      ? null
      : sanitizePlainTextField(payload.vehicleModel, KFZ_PUBLIC_LIMITS.vehicleModel) || null
  const contextNotes =
    payload.contextNotes == null
      ? null
      : sanitizePlainTextField(payload.contextNotes, KFZ_PUBLIC_LIMITS.contextNotes) || null
  const language = payload.language === undefined ? null : payload.language
  const consentVersion = sanitizePlainTextField(
    payload.consentVersion,
    KFZ_PUBLIC_LIMITS.consentVersion,
  )
  const questionnaire = normalizeQuestionnaire(payload.questionnaire)

  const inquiry: NormalizedKfzInquiry = {
    externalId: buildExternalId({
      submissionId: payload.submissionId,
      fullName,
      phone,
      email,
      postalCode,
      city,
      preferredChannel: payload.preferredChannel,
      inquiryReason,
      language,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      contextNotes,
      consentVersion,
      consentTimestamp: clientConsentTimestamp,
      questionnaireFingerprint: questionnaireFingerprint(questionnaire),
    }),
    fullName,
    postalCode,
    city,
    phone,
    email,
    preferredChannel: payload.preferredChannel,
    inquiryReason,
    language,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    contextNotes,
    consent: {
      purpose: KFZ_CONSENT_PURPOSE,
      granted: true,
      version: consentVersion,
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
    questionnaire,
    receivedAt,
  }

  return { ok: true, inquiry }
}
