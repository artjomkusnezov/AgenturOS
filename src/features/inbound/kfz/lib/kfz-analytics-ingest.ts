import { analyticsConsentAllowsPersist } from '@/features/inbound/kfz/lib/kfz-analytics-consent'
import {
  addKfzAnalyticsHealthFacts,
  emptyKfzAnalyticsHealthFacts,
  healthFactsFromPersistOutcome,
  insertKfzAnalyticsEventWithRetry,
  sanitizeKfzAnalyticsHealthFacts,
} from '@/features/inbound/kfz/lib/kfz-analytics-health'
import {
  countForbiddenAnalyticsPropertyKeys,
  emptyKfzAnalyticsIngestQuality,
  rawEventHasInvalidTransition,
  rawEventHasMalformedSourceCategory,
  rawEventHasRejectedTiming,
  rawEventMissingSessionMetadata,
} from '@/features/inbound/kfz/lib/kfz-analytics-quality'
import {
  sanitizeKfzAnalyticsRecord,
  type SanitizeKfzAnalyticsInput,
} from '@/features/inbound/kfz/lib/kfz-analytics-redact'
import type {
  KfzAnalyticsConsentState,
  KfzAnalyticsHealthFacts,
  KfzAnalyticsIngestQuality,
  KfzAnalyticsRecord,
  KfzAnalyticsStore,
} from '@/features/inbound/kfz/types/kfz-analytics'

export async function ingestKfzAnalyticsEvents(input: {
  consent: unknown
  events: unknown
  store: KfzAnalyticsStore
  nowIso?: string
  readConsent?: () => KfzAnalyticsConsentState
}): Promise<{
  accepted: number
  dropped: number
  records: KfzAnalyticsRecord[]
  quality: KfzAnalyticsIngestQuality
  health: KfzAnalyticsHealthFacts
}> {
  const quality = emptyKfzAnalyticsIngestQuality()
  const readConsent =
    input.readConsent ??
    (() => input.consent as KfzAnalyticsConsentState)

  if (!analyticsConsentAllowsPersist(readConsent())) {
    const dropped = Array.isArray(input.events) ? input.events.length : 0
    quality.consentBlocked = dropped
    const health = emptyKfzAnalyticsHealthFacts()
    input.store.addHealthFacts(health)
    return { accepted: 0, dropped, records: [], quality, health }
  }

  if (!Array.isArray(input.events)) {
    quality.missingSessionMetadata = 1
    quality.rejected = 1
    const health = { ...emptyKfzAnalyticsHealthFacts(), rejected: 1 }
    input.store.addHealthFacts(health)
    return { accepted: 0, dropped: 1, records: [], quality, health }
  }

  const nowIso = input.nowIso ?? new Date().toISOString()
  let accepted = 0
  let dropped = 0
  const records: KfzAnalyticsRecord[] = []
  let health = emptyKfzAnalyticsHealthFacts()

  for (const raw of input.events.slice(0, 40)) {
    if (!analyticsConsentAllowsPersist(readConsent())) {
      quality.consentBlocked += 1
      dropped += 1
      continue
    }

    quality.redactedForbiddenFields += countForbiddenAnalyticsPropertyKeys(raw)
    if (rawEventHasMalformedSourceCategory(raw)) {
      quality.malformedSourceCategories += 1
    }
    if (rawEventHasRejectedTiming(raw)) {
      quality.rejectedTimings += 1
    }
    if (rawEventHasInvalidTransition(raw)) {
      quality.invalidTransitions += 1
    }
    if (rawEventMissingSessionMetadata(raw)) {
      quality.missingSessionMetadata += 1
    }

    const sanitized = sanitizeKfzAnalyticsRecord(
      raw as SanitizeKfzAnalyticsInput,
      nowIso,
    )
    if (!sanitized) {
      dropped += 1
      quality.rejected += 1
      health = addKfzAnalyticsHealthFacts(health, { rejected: 1 })
      continue
    }
    if (
      (sanitized.eventName === 'step_view' ||
        sanitized.eventName === 'step_completed' ||
        sanitized.eventName === 'back_navigation') &&
      !sanitized.properties.stepId
    ) {
      dropped += 1
      quality.rejected += 1
      health = addKfzAnalyticsHealthFacts(health, { rejected: 1 })
      continue
    }

    const written = await insertKfzAnalyticsEventWithRetry({
      store: input.store,
      record: sanitized,
      consent: readConsent,
    })
    const delta = healthFactsFromPersistOutcome(written.outcome)
    health = addKfzAnalyticsHealthFacts(health, delta)

    if (written.outcome === 'consent_blocked') {
      quality.consentBlocked += 1
      dropped += 1
      continue
    }
    if (written.outcome === 'rejected') {
      quality.rejected += 1
      dropped += 1
      continue
    }
    if (written.outcome === 'transient_failed') {
      quality.transientFailed += 1
      dropped += 1
      continue
    }

    records.push(written.record)
    if (written.outcome === 'duplicate') {
      quality.duplicates += 1
      continue
    }
    accepted += 1
    quality.accepted += 1
    if (written.outcome === 'recovered') {
      quality.retryRecovered += 1
    }
  }

  health = sanitizeKfzAnalyticsHealthFacts(health)
  input.store.addHealthFacts(health)
  quality.accepted = health.accepted
  quality.rejected = health.rejected
  quality.duplicates = health.duplicates
  quality.transientFailed = health.transientFailed
  quality.retryRecovered = health.retryRecovered
  return { accepted, dropped, records, quality, health }
}
