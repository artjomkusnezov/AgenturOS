/**
 * Technical privacy boundary for first-party Kfz funnel analytics.
 *
 * This is an engineering contract for later legal review. It is not a legal
 * opinion, not a claim of GDPR compliance, and not marketing consent.
 *
 * Purpose: measure visits, sources, funnel progress, drop-off and active time
 * so Artjom can see whether the public Kfz landing is used — without storing
 * customer answers or personal data in analytics.
 *
 * Technical rules:
 * - Analytics runs only after an explicit in-product choice of `granted`.
 * - If consent is absent (`unknown`) or `declined`, events are neither sent
 *   nor persisted. No anonymous session id is created.
 * - The session id is a random UUID, created only after `granted`. It is not
 *   a fingerprint, advertising id, or login identity.
 * - Consent and the session id live in `sessionStorage` (tab-scoped). This is
 *   not a tracking cookie. No cookie write, no third-party pixel.
 * - Inquiry-processing consent on the last step remains a separate purpose
 *   (`inquiry_processing`). Analytics consent does not replace it.
 * - Event names and property keys are allow-listed. Form answers, names,
 *   phone, email, licence plate, vehicle data, file metadata, free text, IP,
 *   user agent and full URLs are dropped before persist.
 * - No Google Analytics, Meta Pixel, Matomo cloud, paid analytics vendor,
 *   fingerprinting or advertising IDs.
 *
 * Follow-up for Owner/legal: retention, lawful basis wording, privacy-policy
 * text, and whether sessionStorage is acceptable for this measurement.
 */

export const KFZ_ANALYTICS_PURPOSE = 'kfz_funnel_measurement' as const

export const KFZ_ANALYTICS_CONSENT_VERSION = 'kfz-analytics-2026-09-09' as const

export const KFZ_ANALYTICS_STORAGE_PREFIX = 'agenturos.kfz-analytics' as const

export const KFZ_ANALYTICS_CONSENT_STORAGE_KEY =
  `${KFZ_ANALYTICS_STORAGE_PREFIX}.consent.v1` as const

export const KFZ_ANALYTICS_SESSION_STORAGE_KEY =
  `${KFZ_ANALYTICS_STORAGE_PREFIX}.session.v1` as const

export const KFZ_ANALYTICS_EMITTED_STORAGE_KEY =
  `${KFZ_ANALYTICS_STORAGE_PREFIX}.emitted.v1` as const

export const KFZ_ANALYTICS_TIMING_STORAGE_KEY =
  `${KFZ_ANALYTICS_STORAGE_PREFIX}.timing.v1` as const

export const KFZ_ANALYTICS_ABANDON_AFTER_MS = 30 * 60 * 1000

export const KFZ_ANALYTICS_ACTIVE_MS_CAP = 24 * 60 * 60 * 1000

export const KFZ_ANALYTICS_PRIVACY_NOTES = [
  'Technische Grenze: Messung nur nach ausdrücklicher Zustimmung in der UI.',
  'Kein Tracking-Cookie, kein Fingerprinting, keine Werbe-ID, kein externes Analytics.',
  'Kein Speichern von Formularantworten, SF-Klassen oder Selbstbeteiligungen in Analytics-Events.',
  'Kein Rechtsanspruch und keine Datenschutzerklärung — nur Implementierungsgrenze.',
] as const
