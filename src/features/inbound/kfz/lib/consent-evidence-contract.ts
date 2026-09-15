/**
 * Consent-Evidence- und Versionierungsvertrag (Kfz Gate 2).
 *
 * Zweck dieser Stufe: nur **Anfragebearbeitung** (`inquiry_processing`).
 * Marketing-Consent ist bewusst getrennt und hier nicht modelliert.
 *
 * Regeln:
 * - `inquiryProcessingConsent` muss im öffentlichen Payload exakt `true` sein.
 * - Persistiert wird nur strukturierte Evidence (purpose, granted, version,
 *   consentedAt, receivedAt) — niemals Consent-Volltext.
 * - `consentVersion` kommt von der Landingpage (Vertragsstand der UI-Texte).
 * - `consentedAt` = Client-Zeitstempel falls gültig, sonst Server-`receivedAt`.
 * - `receivedAt` = Server-Empfangszeit (immer gesetzt).
 * - Kein Logging von Consent-Text, Tokens oder Kunden-Payloads.
 *
 * Follow-up: Retention/Löschung der Evidence, falls noch nicht agenturweit gelöst.
 */

export {
  KFZ_CONSENT_PURPOSE,
  type KfzInquiryConsentEvidence,
} from '@/features/inbound/kfz/types/normalized-kfz-inquiry'
