import {
  KFZ_LANGUAGES,
  KFZ_PREFERRED_CHANNELS,
  KFZ_PUBLIC_LIMITS,
  type KfzLanguage,
  type KfzPreferredChannel,
  type PublicKfzInquiryPayload,
  type PublicKfzUploadMeta,
} from '@/features/inbound/kfz/types/public-kfz-inquiry'

export type PublicKfzValidationFailure = {
  ok: false
  error: string
  code:
    | 'invalid_json'
    | 'payload_too_large'
    | 'missing_field'
    | 'invalid_consent'
    | 'missing_contact'
    | 'invalid_contact'
    | 'invalid_plz'
    | 'invalid_field'
    | 'oversized_field'
}

export type PublicKfzValidationSuccess = {
  ok: true
  payload: PublicKfzInquiryPayload
}

export type PublicKfzValidationResult =
  | PublicKfzValidationSuccess
  | PublicKfzValidationFailure

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PLZ_RE = /^\d{5}$/
const ISO_LIKE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(
  obj: Record<string, unknown>,
  key: string,
  maxLen: number,
): { ok: true; value: string } | PublicKfzValidationFailure {
  const raw = obj[key]
  if (typeof raw !== 'string') {
    return { ok: false, error: `${key} fehlt oder ist ungültig.`, code: 'missing_field' }
  }
  if (raw.trim().length === 0) {
    return { ok: false, error: `${key} fehlt oder ist ungültig.`, code: 'missing_field' }
  }
  if (raw.length > maxLen) {
    return { ok: false, error: `${key} ist zu lang.`, code: 'oversized_field' }
  }
  return { ok: true, value: raw }
}

function optionalString(
  obj: Record<string, unknown>,
  key: string,
  maxLen: number,
): { ok: true; value: string | null | undefined } | PublicKfzValidationFailure {
  if (!(key in obj) || obj[key] === undefined) {
    return { ok: true, value: undefined }
  }
  if (obj[key] === null) {
    return { ok: true, value: null }
  }
  if (typeof obj[key] !== 'string') {
    return { ok: false, error: `${key} ist ungültig.`, code: 'invalid_field' }
  }
  const value = obj[key] as string
  if (value.length > maxLen) {
    return { ok: false, error: `${key} ist zu lang.`, code: 'oversized_field' }
  }
  return { ok: true, value }
}

function parseUploads(
  raw: unknown,
): { ok: true; value: PublicKfzUploadMeta[] | null | undefined } | PublicKfzValidationFailure {
  if (raw === undefined) {
    return { ok: true, value: undefined }
  }
  if (raw === null) {
    return { ok: true, value: null }
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'uploads ist ungültig.', code: 'invalid_field' }
  }
  if (raw.length > KFZ_PUBLIC_LIMITS.maxUploads) {
    return { ok: false, error: 'Zu viele Upload-Metadaten.', code: 'oversized_field' }
  }

  const uploads: PublicKfzUploadMeta[] = []
  for (const entry of raw) {
    if (!isPlainObject(entry)) {
      return { ok: false, error: 'Upload-Metadatum ist ungültig.', code: 'invalid_field' }
    }
    if (typeof entry.filename !== 'string' || entry.filename.trim().length === 0) {
      return { ok: false, error: 'Upload-Dateiname fehlt.', code: 'invalid_field' }
    }
    if (entry.filename.length > KFZ_PUBLIC_LIMITS.uploadFilename) {
      return { ok: false, error: 'Upload-Dateiname ist zu lang.', code: 'oversized_field' }
    }
    if (
      entry.mimeType !== undefined &&
      entry.mimeType !== null &&
      typeof entry.mimeType !== 'string'
    ) {
      return { ok: false, error: 'Upload-MIME ist ungültig.', code: 'invalid_field' }
    }
    if (
      typeof entry.mimeType === 'string' &&
      entry.mimeType.length > KFZ_PUBLIC_LIMITS.uploadMimeType
    ) {
      return { ok: false, error: 'Upload-MIME ist zu lang.', code: 'oversized_field' }
    }
    if (
      entry.sizeBytes !== undefined &&
      entry.sizeBytes !== null &&
      (typeof entry.sizeBytes !== 'number' ||
        !Number.isFinite(entry.sizeBytes) ||
        entry.sizeBytes < 0)
    ) {
      return { ok: false, error: 'Upload-Größe ist ungültig.', code: 'invalid_field' }
    }

    uploads.push({
      filename: entry.filename,
      mimeType:
        entry.mimeType === undefined
          ? undefined
          : (entry.mimeType as string | null),
      sizeBytes:
        entry.sizeBytes === undefined
          ? undefined
          : (entry.sizeBytes as number | null),
    })
  }

  return { ok: true, value: uploads }
}

/**
 * Öffentliche Schema-/Größenvalidierung.
 * Keine Domain-Normalisierung, keine Businessentscheidungen.
 */
export function validatePublicKfzInquiry(
  rawBody: string,
): PublicKfzValidationResult {
  if (rawBody.length > KFZ_PUBLIC_LIMITS.maxJsonBytes) {
    return {
      ok: false,
      error: 'Payload ist zu groß.',
      code: 'payload_too_large',
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody) as unknown
  } catch {
    return { ok: false, error: 'Ungültiges JSON.', code: 'invalid_json' }
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, error: 'Ungültiges JSON-Objekt.', code: 'invalid_json' }
  }

  const fullName = requireString(parsed, 'fullName', KFZ_PUBLIC_LIMITS.fullName)
  if (!fullName.ok) {
    return fullName
  }

  const postalCode = requireString(parsed, 'postalCode', KFZ_PUBLIC_LIMITS.postalCode)
  if (!postalCode.ok) {
    return postalCode
  }
  if (!PLZ_RE.test(postalCode.value.trim())) {
    return { ok: false, error: 'PLZ ist ungültig.', code: 'invalid_plz' }
  }

  const city = requireString(parsed, 'city', KFZ_PUBLIC_LIMITS.city)
  if (!city.ok) {
    return city
  }

  const inquiryReason = requireString(
    parsed,
    'inquiryReason',
    KFZ_PUBLIC_LIMITS.inquiryReason,
  )
  if (!inquiryReason.ok) {
    return inquiryReason
  }

  const consentVersion = requireString(
    parsed,
    'consentVersion',
    KFZ_PUBLIC_LIMITS.consentVersion,
  )
  if (!consentVersion.ok) {
    return consentVersion
  }

  if (parsed.inquiryProcessingConsent !== true) {
    return {
      ok: false,
      error: 'Einwilligung zur Anfragebearbeitung fehlt oder ist ungültig.',
      code: 'invalid_consent',
    }
  }

  const preferredRaw = parsed.preferredChannel
  if (
    typeof preferredRaw !== 'string' ||
    !(KFZ_PREFERRED_CHANNELS as readonly string[]).includes(preferredRaw)
  ) {
    return {
      ok: false,
      error: 'preferredChannel ist ungültig.',
      code: 'invalid_field',
    }
  }

  const phoneOpt = optionalString(parsed, 'phone', KFZ_PUBLIC_LIMITS.phone)
  if (!phoneOpt.ok) {
    return phoneOpt
  }
  const emailOpt = optionalString(parsed, 'email', KFZ_PUBLIC_LIMITS.email)
  if (!emailOpt.ok) {
    return emailOpt
  }

  const phoneTrimmed = phoneOpt.value?.trim() ?? ''
  const emailTrimmed = emailOpt.value?.trim() ?? ''

  if (!phoneTrimmed && !emailTrimmed) {
    return {
      ok: false,
      error: 'Mindestens eine Kontaktmethode (Telefon oder E-Mail) ist erforderlich.',
      code: 'missing_contact',
    }
  }

  if (emailTrimmed && !EMAIL_RE.test(emailTrimmed)) {
    return { ok: false, error: 'E-Mail ist ungültig.', code: 'invalid_contact' }
  }

  if (phoneTrimmed) {
    const digits = phoneTrimmed.replace(/[^\d]/g, '')
    if (
      digits.length < 7 ||
      digits.length > 15 ||
      !/^\+?[\d\s().\/-]+$/.test(phoneTrimmed)
    ) {
      return { ok: false, error: 'Telefonnummer ist ungültig.', code: 'invalid_contact' }
    }
  }

  const consentTs = optionalString(
    parsed,
    'consentTimestamp',
    KFZ_PUBLIC_LIMITS.consentTimestamp,
  )
  if (!consentTs.ok) {
    return consentTs
  }
  if (
    typeof consentTs.value === 'string' &&
    consentTs.value.trim().length > 0 &&
    !ISO_LIKE_RE.test(consentTs.value.trim())
  ) {
    return {
      ok: false,
      error: 'consentTimestamp ist ungültig.',
      code: 'invalid_field',
    }
  }

  let language: KfzLanguage | null | undefined
  if (parsed.language === undefined) {
    language = undefined
  } else if (parsed.language === null) {
    language = null
  } else if (
    typeof parsed.language === 'string' &&
    (KFZ_LANGUAGES as readonly string[]).includes(parsed.language)
  ) {
    language = parsed.language as KfzLanguage
  } else {
    return { ok: false, error: 'language ist ungültig.', code: 'invalid_field' }
  }

  const vehicleMake = optionalString(parsed, 'vehicleMake', KFZ_PUBLIC_LIMITS.vehicleMake)
  if (!vehicleMake.ok) {
    return vehicleMake
  }
  const vehicleModel = optionalString(
    parsed,
    'vehicleModel',
    KFZ_PUBLIC_LIMITS.vehicleModel,
  )
  if (!vehicleModel.ok) {
    return vehicleModel
  }

  let vehicleYear: string | number | null | undefined
  if (parsed.vehicleYear === undefined) {
    vehicleYear = undefined
  } else if (parsed.vehicleYear === null) {
    vehicleYear = null
  } else if (typeof parsed.vehicleYear === 'number') {
    if (!Number.isFinite(parsed.vehicleYear)) {
      return { ok: false, error: 'vehicleYear ist ungültig.', code: 'invalid_field' }
    }
    vehicleYear = parsed.vehicleYear
  } else if (typeof parsed.vehicleYear === 'string') {
    if (parsed.vehicleYear.length > KFZ_PUBLIC_LIMITS.vehicleYear) {
      return { ok: false, error: 'vehicleYear ist zu lang.', code: 'oversized_field' }
    }
    vehicleYear = parsed.vehicleYear
  } else {
    return { ok: false, error: 'vehicleYear ist ungültig.', code: 'invalid_field' }
  }

  const contextNotes = optionalString(
    parsed,
    'contextNotes',
    KFZ_PUBLIC_LIMITS.contextNotes,
  )
  if (!contextNotes.ok) {
    return contextNotes
  }

  const attrKeys = [
    'source',
    'campaign',
    'utmSource',
    'utmMedium',
    'utmCampaign',
    'utmTerm',
    'utmContent',
  ] as const
  const attribution: Partial<Record<(typeof attrKeys)[number], string | null | undefined>> =
    {}
  for (const key of attrKeys) {
    const result = optionalString(parsed, key, KFZ_PUBLIC_LIMITS.attribution)
    if (!result.ok) {
      return result
    }
    attribution[key] = result.value
  }

  const submissionId = optionalString(
    parsed,
    'submissionId',
    KFZ_PUBLIC_LIMITS.submissionId,
  )
  if (!submissionId.ok) {
    return submissionId
  }

  const uploads = parseUploads(parsed.uploads)
  if (!uploads.ok) {
    return uploads
  }

  const payload: PublicKfzInquiryPayload = {
    fullName: fullName.value,
    postalCode: postalCode.value,
    city: city.value,
    phone: phoneOpt.value === undefined ? undefined : phoneOpt.value,
    email: emailOpt.value === undefined ? undefined : emailOpt.value,
    preferredChannel: preferredRaw as KfzPreferredChannel,
    inquiryReason: inquiryReason.value,
    inquiryProcessingConsent: true,
    consentVersion: consentVersion.value,
    consentTimestamp: consentTs.value,
    language,
    vehicleMake: vehicleMake.value,
    vehicleModel: vehicleModel.value,
    vehicleYear,
    contextNotes: contextNotes.value,
    source: attribution.source,
    campaign: attribution.campaign,
    utmSource: attribution.utmSource,
    utmMedium: attribution.utmMedium,
    utmCampaign: attribution.utmCampaign,
    utmTerm: attribution.utmTerm,
    utmContent: attribution.utmContent,
    submissionId: submissionId.value,
    uploads: uploads.value,
  }

  return { ok: true, payload }
}
