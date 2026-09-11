/**
 * Persistence contract for privacy-safe Kfz funnel analytics.
 *
 * Mirrors the checked-in Supabase table, property allow-list and RLS.
 * Anonymous events are written only after consent=granted and server-side
 * sanitization (service_role). Authorized aggregate review stays server-side.
 * This module does not connect to a database.
 */

import {
  isKfzAnalyticsBranchId,
  isKfzAnalyticsErrorCategory,
  isKfzAnalyticsEventName,
  isKfzAnalyticsFieldId,
  isKfzAnalyticsPropertyKey,
  isKfzAnalyticsReferrerCategory,
  isKfzAnalyticsSessionId,
  isKfzAnalyticsStepId,
  isKfzAnalyticsTrafficSource,
  KFZ_ANALYTICS_ALLOWED_UTM_CAMPAIGNS,
  KFZ_ANALYTICS_ALLOWED_UTM_SOURCES,
} from '@/features/inbound/kfz/lib/kfz-analytics-allowlist'
import { analyticsConsentAllowsPersist } from '@/features/inbound/kfz/lib/kfz-analytics-consent'
import { KFZ_ANALYTICS_ACTIVE_MS_CAP } from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'
import {
  KFZ_ANALYTICS_FORBIDDEN_PROPERTY_EXAMPLES,
  sanitizeKfzAnalyticsRecord,
  type SanitizeKfzAnalyticsInput,
} from '@/features/inbound/kfz/lib/kfz-analytics-redact'
import type {
  KfzAnalyticsConsentState,
  KfzAnalyticsRecord,
} from '@/features/inbound/kfz/types/kfz-analytics'

export { KFZ_ANALYTICS_FORBIDDEN_PROPERTY_EXAMPLES }

export const KFZ_ANALYTICS_PERSISTENCE_TABLE = 'kfz_funnel_analytics_events' as const

export const KFZ_ANALYTICS_FOUNDATION_MIGRATION =
  'supabase/migrations/20260909140000_kfz_funnel_analytics_events.sql' as const

export const KFZ_ANALYTICS_PERSISTENCE_CONTRACT_MIGRATION =
  'supabase/migrations/20260911120000_kfz_funnel_analytics_persistence_contract.sql' as const

export const KFZ_ANALYTICS_PERSISTENCE_COLUMNS = [
  'id',
  'agency_id',
  'session_id',
  'event_name',
  'event_key',
  'occurred_at',
  'properties',
  'created_at',
] as const

export const KFZ_ANALYTICS_PERSISTED_METADATA = [
  'trafficSource',
  'referrerCategory',
  'landing_view',
  'branchId',
  'stepId',
  'lastStepId',
  'activeMs',
  'fromStepId',
  'submit_started',
  'submit_failed',
  'submit_succeeded',
] as const

/**
 * Consent is a write gate. Data-quality and ingest-health counters are derived
 * at ingest/review. Neither is stored as a customer or free-text column.
 */
export const KFZ_ANALYTICS_DERIVED_REVIEW_FIELDS = [
  'consent',
  'acceptedEvents',
  'rejectedEvents',
  'duplicateEvents',
  'transientFailedEvents',
  'retryRecoveredEvents',
  'healthStatus',
  'invalidTransitions',
  'rejectedTimings',
  'missingSessionMetadata',
  'malformedSourceCategories',
  'incompleteSessions',
  'redactedForbiddenFields',
] as const

export const KFZ_ANALYTICS_RLS_CONTRACT = {
  table: KFZ_ANALYTICS_PERSISTENCE_TABLE,
  publicRead: false,
  anonRead: false,
  anonInsert: false,
  authenticatedInsert: false,
  authenticatedUpdate: false,
  authenticatedDelete: false,
  authenticatedSelect: 'agency_member_only',
  anonymousEventWrite: 'service_role_after_allowlist',
  authorizedReview: 'server_side_authenticated_select',
} as const

export const KFZ_ANALYTICS_UNIQUE_EVENT_INDEX =
  'kfz_funnel_analytics_events_agency_event_key_uidx' as const

export type KfzAnalyticsPersistenceRejectReason =
  | 'consent_blocked'
  | 'invalid_event'
  | 'forbidden_field'
  | 'invalid_property'

export type KfzAnalyticsPersistenceDecision =
  | { ok: true; record: KfzAnalyticsRecord }
  | { ok: false; reason: KfzAnalyticsPersistenceRejectReason }

const UTM_SOURCE_SET = new Set<string>(KFZ_ANALYTICS_ALLOWED_UTM_SOURCES)
const UTM_CAMPAIGN_SET = new Set<string>(KFZ_ANALYTICS_ALLOWED_UTM_CAMPAIGNS)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function looksLikeRejectedPersistenceValue(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }
  if (trimmed.includes('@') && /\S+@\S+\.\S+/.test(trimmed)) {
    return true
  }
  if (/https?:\/\//i.test(trimmed) || trimmed.includes('?')) {
    return true
  }
  return trimmed.length > 64
}

export function kfzAnalyticsPropertiesPassPersistenceAllowlist(
  raw: unknown,
): boolean {
  if (!isRecord(raw)) {
    return false
  }

  for (const [key, value] of Object.entries(raw)) {
    if (!isKfzAnalyticsPropertyKey(key)) {
      return false
    }

    if (key === 'activeMs') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return false
      }
      if (value < 0 || value > KFZ_ANALYTICS_ACTIVE_MS_CAP) {
        return false
      }
      continue
    }

    if (typeof value !== 'string' || looksLikeRejectedPersistenceValue(value)) {
      return false
    }

    if (
      (key === 'stepId' || key === 'fromStepId' || key === 'lastStepId') &&
      !isKfzAnalyticsStepId(value)
    ) {
      return false
    }
    if (key === 'branchId' && !isKfzAnalyticsBranchId(value)) {
      return false
    }
    if (key === 'trafficSource' && !isKfzAnalyticsTrafficSource(value)) {
      return false
    }
    if (key === 'referrerCategory' && !isKfzAnalyticsReferrerCategory(value)) {
      return false
    }
    if (key === 'utmSource' && !UTM_SOURCE_SET.has(value)) {
      return false
    }
    if (key === 'utmCampaign' && !UTM_CAMPAIGN_SET.has(value)) {
      return false
    }
    if (key === 'fieldId' && !isKfzAnalyticsFieldId(value)) {
      return false
    }
    if (key === 'errorCategory' && !isKfzAnalyticsErrorCategory(value)) {
      return false
    }
  }

  return true
}

export function kfzAnalyticsRecordPassesPersistenceContract(
  record: KfzAnalyticsRecord,
): boolean {
  if (!isKfzAnalyticsEventName(record.eventName)) {
    return false
  }
  if (!isKfzAnalyticsSessionId(record.sessionId)) {
    return false
  }
  if (
    typeof record.eventKey !== 'string' ||
    !record.eventKey.startsWith(`${record.sessionId}:`) ||
    record.eventKey.length > 180
  ) {
    return false
  }
  return kfzAnalyticsPropertiesPassPersistenceAllowlist(record.properties)
}

export function evaluateKfzAnalyticsPersistencePayload(input: {
  consent?: unknown
  record: unknown
  nowIso?: string
}): KfzAnalyticsPersistenceDecision {
  if (
    input.consent !== undefined &&
    !analyticsConsentAllowsPersist(input.consent as KfzAnalyticsConsentState)
  ) {
    return { ok: false, reason: 'consent_blocked' }
  }

  const nowIso = input.nowIso ?? new Date().toISOString()
  const sanitized = sanitizeKfzAnalyticsRecord(
    input.record as SanitizeKfzAnalyticsInput,
    nowIso,
  )
  if (!sanitized) {
    return { ok: false, reason: 'invalid_event' }
  }
  if (!kfzAnalyticsRecordPassesPersistenceContract(sanitized)) {
    return { ok: false, reason: 'invalid_property' }
  }
  return { ok: true, record: sanitized }
}

export function isKfzAnalyticsDuplicateKeyError(error: {
  code?: string
  message?: string
}): boolean {
  if (error.code === '23505') {
    return true
  }
  return (error.message ?? '').includes(KFZ_ANALYTICS_UNIQUE_EVENT_INDEX)
}

