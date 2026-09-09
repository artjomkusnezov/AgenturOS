/**
 * Öffentliches Landingpage-Schema (Gate 2).
 * Strict validation only — keine Domain-Normalisierung.
 */

export const KFZ_PREFERRED_CHANNELS = ['phone', 'email', 'whatsapp'] as const
export type KfzPreferredChannel = (typeof KFZ_PREFERRED_CHANNELS)[number]

export const KFZ_LANGUAGES = ['de', 'ru', 'en'] as const
export type KfzLanguage = (typeof KFZ_LANGUAGES)[number]

export const KFZ_UPLOAD_GROUPS = ['fahrzeugschein', 'vorversicherung'] as const
export type KfzUploadGroup = (typeof KFZ_UPLOAD_GROUPS)[number]

/** Optionaler Upload-Metadaten-Seam — keine Binärdaten in Gate 2. */
export type PublicKfzUploadMeta = {
  filename: string
  mimeType?: string | null
  sizeBytes?: number | null
  group?: KfzUploadGroup | null
}

/** Manueller Fragebogen ohne Unterlagen — Fakten, keine Tarifentscheidung. */
export type PublicKfzQuestionnaireAnswer = {
  id: string
  label: string
  value: string
  unknown?: boolean
}

export type PublicKfzQuestionnaire = {
  branchId: string
  branchLabel: string
  path: 'upload' | 'questionnaire'
  answers: PublicKfzQuestionnaireAnswer[]
  missingFacts: string[]
  boundaries: string[]
}

/**
 * Roh-Payload von kfz.artkus.de (oder Fixture).
 * Felder bewusst flach und landingspezifisch.
 */
export type PublicKfzInquiryPayload = {
  fullName: string
  postalCode: string
  city: string
  phone?: string | null
  email?: string | null
  preferredChannel: KfzPreferredChannel
  inquiryReason: string
  /** Explizite Einwilligung zur Anfragebearbeitung (nicht Marketing). */
  inquiryProcessingConsent: boolean
  /** Consent-Vertragsversion der Landingpage (z. B. kfz-lp-2026-09-01). */
  consentVersion: string
  /** Client-Zeitstempel der Zustimmung; Server setzt zusätzlich receivedAt. */
  consentTimestamp?: string | null
  language?: KfzLanguage | null
  vehicleMake?: string | null
  vehicleModel?: string | null
  vehicleYear?: string | number | null
  contextNotes?: string | null
  /** Attribution: provider-neutral acquisition/website source. */
  source?: string | null
  campaign?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmTerm?: string | null
  utmContent?: string | null
  /** Client-seitige Idempotenz / Replay-Schutz. */
  submissionId?: string | null
  uploads?: PublicKfzUploadMeta[] | null
  /** Optionaler manueller Fragebogen (ohne Unterlagen). */
  questionnaire?: PublicKfzQuestionnaire | null
}

/** Größenlimits für öffentliche Validierung. */
export const KFZ_PUBLIC_LIMITS = {
  maxJsonBytes: 24_576,
  fullName: 120,
  postalCode: 10,
  city: 80,
  phone: 32,
  email: 254,
  inquiryReason: 500,
  consentVersion: 64,
  consentTimestamp: 40,
  vehicleMake: 80,
  vehicleModel: 80,
  vehicleYear: 12,
  contextNotes: 2_000,
  attribution: 120,
  submissionId: 128,
  uploadFilename: 180,
  uploadMimeType: 120,
  uploadGroup: 32,
  maxUploads: 6,
  questionnaireAnswers: 40,
  questionnaireId: 64,
  questionnaireLabel: 180,
  questionnaireValue: 500,
  questionnaireMissingFacts: 24,
  questionnaireMissingFact: 220,
  questionnaireBoundaries: 12,
  questionnaireBoundary: 280,
  questionnairePath: 24,
} as const
