/**
 * Privacy-safe Kfz analytics ingest health and bounded persist retry.
 *
 * Health facts are derived from ingest outcomes and authorized review.
 * They are not stored as customer columns. Retry is idempotent via event_key
 * and never runs without consent=granted.
 */

import { analyticsConsentAllowsPersist } from '@/features/inbound/kfz/lib/kfz-analytics-consent'
import { isKfzAnalyticsDuplicateKeyError } from '@/features/inbound/kfz/lib/kfz-analytics-persistence-contract'
import type {
  KfzAnalyticsConsentState,
  KfzAnalyticsHealthFacts,
  KfzAnalyticsHealthSnapshot,
  KfzAnalyticsHealthStatus,
  KfzAnalyticsRecord,
  KfzAnalyticsReviewStatus,
  KfzAnalyticsStore,
} from '@/features/inbound/kfz/types/kfz-analytics'

export const KFZ_ANALYTICS_PERSIST_MAX_ATTEMPTS = 3 as const

export type KfzAnalyticsPersistOutcome =
  | 'accepted'
  | 'duplicate'
  | 'recovered'
  | 'transient_failed'
  | 'consent_blocked'
  | 'rejected'

const TRANSIENT_PG_CODES = new Set([
  '40001',
  '40P01',
  '55P03',
  '53000',
  '53100',
  '53200',
  '53300',
  '57014',
  '57P01',
  '08000',
  '08001',
  '08003',
  '08006',
  '08004',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function emptyKfzAnalyticsHealthFacts(): KfzAnalyticsHealthFacts {
  return {
    accepted: 0,
    rejected: 0,
    duplicates: 0,
    transientFailed: 0,
    retryRecovered: 0,
  }
}

export function emptyKfzAnalyticsHealthSnapshot(
  available = false,
): KfzAnalyticsHealthSnapshot {
  return {
    available,
    facts: emptyKfzAnalyticsHealthFacts(),
  }
}

export function addKfzAnalyticsHealthFacts(
  current: KfzAnalyticsHealthFacts,
  delta: Partial<KfzAnalyticsHealthFacts>,
): KfzAnalyticsHealthFacts {
  return {
    accepted: current.accepted + (delta.accepted ?? 0),
    rejected: current.rejected + (delta.rejected ?? 0),
    duplicates: current.duplicates + (delta.duplicates ?? 0),
    transientFailed: current.transientFailed + (delta.transientFailed ?? 0),
    retryRecovered: current.retryRecovered + (delta.retryRecovered ?? 0),
  }
}

export function resolveKfzAnalyticsHealthStatus(input: {
  loadStatus?: Extract<KfzAnalyticsReviewStatus, 'unavailable' | 'configuration_missing'> | 'ready'
  facts?: KfzAnalyticsHealthFacts
  ingestAvailable?: boolean
}): KfzAnalyticsHealthStatus {
  if (input.loadStatus === 'configuration_missing') {
    return 'BLOCKED'
  }
  if (input.loadStatus === 'unavailable') {
    return 'UNKNOWN'
  }
  if (
    input.ingestAvailable &&
    input.facts &&
    input.facts.transientFailed > 0 &&
    input.facts.accepted === 0
  ) {
    return 'BLOCKED'
  }
  return 'READY'
}

export function kfzAnalyticsHealthCopy(status: KfzAnalyticsHealthStatus): {
  title: string
  body: string
} {
  if (status === 'BLOCKED') {
    return {
      title: 'Messung BLOCKED',
      body: 'Persistenz ist blockiert oder nicht konfiguriert. Es werden keine Werte erfunden und keine Secrets angezeigt.',
    }
  }
  if (status === 'UNKNOWN') {
    return {
      title: 'Messung UNKNOWN',
      body: 'Der Ingest-Zustand ist hier nicht prüfbar. Keine Zähler werden hochgerechnet.',
    }
  }
  return {
    title: 'Messung READY',
    body: 'Nur anonyme Metadaten: akzeptiert, abgelehnt, doppelt, vorübergehend fehlgeschlagen. Keine Antworten, Kontakte oder Dateien.',
  }
}

export function isKfzAnalyticsTransientPersistError(error: unknown): boolean {
  if (error == null) {
    return false
  }
  if (isKfzAnalyticsDuplicateKeyError(error as { code?: string; message?: string })) {
    return false
  }
  const code =
    isRecord(error) && typeof error.code === 'string' ? error.code : null
  if (code && TRANSIENT_PG_CODES.has(code)) {
    return true
  }
  const status =
    isRecord(error) && typeof error.status === 'number'
      ? error.status
      : isRecord(error) && typeof error.statusCode === 'number'
        ? error.statusCode
        : null
  if (status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504) {
    return true
  }
  const message =
    error instanceof Error
      ? error.message
      : isRecord(error) && typeof error.message === 'string'
        ? error.message
        : String(error)
  if (/23505|23514|42501|invalid_event|forbidden|check constraint/i.test(message)) {
    return false
  }
  return /timeout|temporar|deadlock|serialization|econnreset|etimedout|enotfound|eai_again|fetch failed|network|unavailable|too many connections|connection reset|503|502|504/i.test(
    message,
  )
}

export function isKfzAnalyticsRetryableSendStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504
}

function readConsentState(
  consent: KfzAnalyticsConsentState | (() => KfzAnalyticsConsentState),
): KfzAnalyticsConsentState {
  return typeof consent === 'function' ? consent() : consent
}

export async function insertKfzAnalyticsEventWithRetry(input: {
  store: KfzAnalyticsStore
  record: KfzAnalyticsRecord
  consent: KfzAnalyticsConsentState | (() => KfzAnalyticsConsentState)
  maxAttempts?: number
}): Promise<{
  outcome: KfzAnalyticsPersistOutcome
  record: KfzAnalyticsRecord
}> {
  const maxAttempts = input.maxAttempts ?? KFZ_ANALYTICS_PERSIST_MAX_ATTEMPTS
  let sawTransient = false

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (!analyticsConsentAllowsPersist(readConsentState(input.consent))) {
      return { outcome: 'consent_blocked', record: input.record }
    }
    try {
      const written = await input.store.insertEvent(input.record)
      if (written.inserted) {
        return {
          outcome: sawTransient ? 'recovered' : 'accepted',
          record: written.record,
        }
      }
      if (sawTransient) {
        return { outcome: 'recovered', record: written.record }
      }
      return { outcome: 'duplicate', record: written.record }
    } catch (error) {
      if (!analyticsConsentAllowsPersist(readConsentState(input.consent))) {
        return { outcome: 'consent_blocked', record: input.record }
      }
      if (!isKfzAnalyticsTransientPersistError(error) || attempt >= maxAttempts) {
        if (isKfzAnalyticsTransientPersistError(error)) {
          return { outcome: 'transient_failed', record: input.record }
        }
        return { outcome: 'rejected', record: input.record }
      }
      sawTransient = true
    }
  }

  return { outcome: 'transient_failed', record: input.record }
}

export async function sendKfzAnalyticsRecordsWithRetry(input: {
  consent: KfzAnalyticsConsentState | (() => KfzAnalyticsConsentState)
  records: readonly KfzAnalyticsRecord[]
  send: (
    consent: KfzAnalyticsConsentState,
    records: readonly KfzAnalyticsRecord[],
  ) => Promise<void>
  maxAttempts?: number
}): Promise<{ sent: boolean; reason: 'ok' | 'consent_blocked' | 'exhausted' | 'empty' }> {
  if (input.records.length === 0) {
    return { sent: false, reason: 'empty' }
  }
  const maxAttempts = input.maxAttempts ?? KFZ_ANALYTICS_PERSIST_MAX_ATTEMPTS

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const consent = readConsentState(input.consent)
    if (!analyticsConsentAllowsPersist(consent)) {
      return { sent: false, reason: 'consent_blocked' }
    }
    try {
      await input.send(consent, input.records)
      return { sent: true, reason: 'ok' }
    } catch (error) {
      if (!analyticsConsentAllowsPersist(readConsentState(input.consent))) {
        return { sent: false, reason: 'consent_blocked' }
      }
      if (!isKfzAnalyticsTransientPersistError(error) || attempt >= maxAttempts) {
        return { sent: false, reason: 'exhausted' }
      }
    }
  }

  return { sent: false, reason: 'exhausted' }
}

export function healthFactsFromPersistOutcome(
  outcome: KfzAnalyticsPersistOutcome,
): Partial<KfzAnalyticsHealthFacts> {
  if (outcome === 'accepted') {
    return { accepted: 1 }
  }
  if (outcome === 'duplicate') {
    return { duplicates: 1 }
  }
  if (outcome === 'recovered') {
    return { accepted: 1, retryRecovered: 1 }
  }
  if (outcome === 'transient_failed') {
    return { transientFailed: 1 }
  }
  if (outcome === 'rejected') {
    return { rejected: 1 }
  }
  return {}
}

export function sanitizeKfzAnalyticsHealthFacts(
  facts: KfzAnalyticsHealthFacts,
): KfzAnalyticsHealthFacts {
  return {
    accepted: Math.max(0, Math.floor(facts.accepted)),
    rejected: Math.max(0, Math.floor(facts.rejected)),
    duplicates: Math.max(0, Math.floor(facts.duplicates)),
    transientFailed: Math.max(0, Math.floor(facts.transientFailed)),
    retryRecovered: Math.max(0, Math.floor(facts.retryRecovered)),
  }
}
