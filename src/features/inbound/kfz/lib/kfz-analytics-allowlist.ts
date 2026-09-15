import {
  KFZ_LANDING_BRANCHES,
  KFZ_QUESTION_SCREENS,
  KFZ_QUESTIONS,
  KFZ_SCREEN_BRANCH,
  KFZ_SCREEN_CONTACT,
  KFZ_SCREEN_DOCUMENTS,
} from '@/features/inbound/kfz/lib/kfz-questionnaire'
import { normalizeAttributionValue } from '@/features/inbound/kfz/lib/normalize-attribution'
import {
  KFZ_ANALYTICS_ERROR_CATEGORIES,
  KFZ_ANALYTICS_EVENT_NAMES,
  KFZ_ANALYTICS_PROPERTY_KEYS,
  KFZ_ANALYTICS_REFERRER_CATEGORIES,
  KFZ_ANALYTICS_TRAFFIC_SOURCES,
  type KfzAnalyticsErrorCategory,
  type KfzAnalyticsEventName,
  type KfzAnalyticsPropertyKey,
  type KfzAnalyticsReferrerCategory,
  type KfzAnalyticsTrafficSource,
} from '@/features/inbound/kfz/types/kfz-analytics'

export const KFZ_ANALYTICS_STEP_IDS = [
  KFZ_SCREEN_BRANCH,
  ...KFZ_QUESTION_SCREENS.map((screen) => screen.id),
  KFZ_SCREEN_CONTACT,
  KFZ_SCREEN_DOCUMENTS,
] as const

export const KFZ_ANALYTICS_STEP_LABELS: Record<string, string> = {
  [KFZ_SCREEN_BRANCH]: 'Start',
  intent: 'Anliegen',
  registration: 'Zulassung',
  vehicle: 'Fahrzeug',
  ownership: 'Halter',
  usage: 'Nutzung',
  drivers: 'Fahrer',
  insurance: 'Vorversicherung',
  claims: 'Vorschäden',
  coverage: 'Schutz',
  [KFZ_SCREEN_CONTACT]: 'Kontakt',
  [KFZ_SCREEN_DOCUMENTS]: 'Unterlagen',
}

export const KFZ_ANALYTICS_BRANCH_IDS = KFZ_LANDING_BRANCHES.map(
  (branch) => branch.id,
)

export const KFZ_ANALYTICS_FIELD_IDS = [
  ...KFZ_QUESTIONS.map((question) => question.id),
  'missing_request_type',
  'missing_field',
  'missing_contact',
  'invalid_contact',
  'whatsapp_requires_phone',
  'invalid_consent',
  'invalid_field',
  'oversized_field',
  'full_name',
  'postal_code',
  'city',
  'phone',
  'email',
  'preferred_channel',
  'inquiry_processing_consent',
] as const

/**
 * Known first-party campaign/source tokens. Free-form UTM values are discarded
 * even when they would pass a generic slug regex.
 */
export const KFZ_ANALYTICS_ALLOWED_UTM_SOURCES = [
  'google',
  'bing',
  'duckduckgo',
  'yahoo',
  'instagram',
  'facebook',
  'whatsapp',
  'email',
  'newsletter',
  'allianz',
  'artkus',
  'direct',
  'kfz',
] as const

export const KFZ_ANALYTICS_ALLOWED_UTM_CAMPAIGNS = [
  'kfz',
  'kfz-check',
  'kfz-landing',
  'wechsel',
  'evb',
  'first-car',
  'additional-car',
  'switch-car',
  'no-documents',
] as const

const STEP_ID_SET = new Set<string>(KFZ_ANALYTICS_STEP_IDS)
const BRANCH_ID_SET = new Set<string>(KFZ_ANALYTICS_BRANCH_IDS)
const FIELD_ID_SET = new Set<string>(KFZ_ANALYTICS_FIELD_IDS)
const EVENT_NAME_SET = new Set<string>(KFZ_ANALYTICS_EVENT_NAMES)
const PROPERTY_KEY_SET = new Set<string>(KFZ_ANALYTICS_PROPERTY_KEYS)
const TRAFFIC_SOURCE_SET = new Set<string>(KFZ_ANALYTICS_TRAFFIC_SOURCES)
const REFERRER_CATEGORY_SET = new Set<string>(KFZ_ANALYTICS_REFERRER_CATEGORIES)
const ERROR_CATEGORY_SET = new Set<string>(KFZ_ANALYTICS_ERROR_CATEGORIES)
const UTM_SOURCE_SET = new Set<string>(KFZ_ANALYTICS_ALLOWED_UTM_SOURCES)
const UTM_CAMPAIGN_SET = new Set<string>(KFZ_ANALYTICS_ALLOWED_UTM_CAMPAIGNS)

const SESSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isKfzAnalyticsEventName(
  value: unknown,
): value is KfzAnalyticsEventName {
  return typeof value === 'string' && EVENT_NAME_SET.has(value)
}

export function isKfzAnalyticsPropertyKey(
  value: unknown,
): value is KfzAnalyticsPropertyKey {
  return typeof value === 'string' && PROPERTY_KEY_SET.has(value)
}

export function isKfzAnalyticsSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_RE.test(value)
}

export function isKfzAnalyticsStepId(value: unknown): value is string {
  return typeof value === 'string' && STEP_ID_SET.has(value)
}

export function isKfzAnalyticsBranchId(value: unknown): value is string {
  return typeof value === 'string' && BRANCH_ID_SET.has(value)
}

export function isKfzAnalyticsFieldId(value: unknown): value is string {
  return typeof value === 'string' && FIELD_ID_SET.has(value)
}

export function isKfzAnalyticsTrafficSource(
  value: unknown,
): value is KfzAnalyticsTrafficSource {
  return typeof value === 'string' && TRAFFIC_SOURCE_SET.has(value)
}

export function isKfzAnalyticsReferrerCategory(
  value: unknown,
): value is KfzAnalyticsReferrerCategory {
  return typeof value === 'string' && REFERRER_CATEGORY_SET.has(value)
}

export function isKfzAnalyticsErrorCategory(
  value: unknown,
): value is KfzAnalyticsErrorCategory {
  return typeof value === 'string' && ERROR_CATEGORY_SET.has(value)
}

export function sanitizeKfzAnalyticsUtmSource(
  raw: string | null | undefined,
): string | null {
  const normalized = normalizeAttributionValue(raw, 40)
  if (!normalized || !UTM_SOURCE_SET.has(normalized)) {
    return null
  }
  return normalized
}

export function sanitizeKfzAnalyticsUtmCampaign(
  raw: string | null | undefined,
): string | null {
  const normalized = normalizeAttributionValue(raw, 40)
  if (!normalized || !UTM_CAMPAIGN_SET.has(normalized)) {
    return null
  }
  return normalized
}

export function kfzAnalyticsStepLabel(stepId: string): string {
  return KFZ_ANALYTICS_STEP_LABELS[stepId] ?? stepId
}

export function kfzAnalyticsBranchLabel(branchId: string): string {
  return (
    KFZ_LANDING_BRANCHES.find((branch) => branch.id === branchId)?.label ??
    branchId
  )
}
