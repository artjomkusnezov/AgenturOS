import { analyticsConsentAllowsPersist } from '@/features/inbound/kfz/lib/kfz-analytics-consent'
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
  KfzAnalyticsIngestQuality,
  KfzAnalyticsRecord,
  KfzAnalyticsStore,
} from '@/features/inbound/kfz/types/kfz-analytics'

export async function ingestKfzAnalyticsEvents(input: {
  consent: unknown
  events: unknown
  store: KfzAnalyticsStore
  nowIso?: string
}): Promise<{
  accepted: number
  dropped: number
  records: KfzAnalyticsRecord[]
  quality: KfzAnalyticsIngestQuality
}> {
  const quality = emptyKfzAnalyticsIngestQuality()

  if (!analyticsConsentAllowsPersist(input.consent as KfzAnalyticsConsentState)) {
    const dropped = Array.isArray(input.events) ? input.events.length : 0
    quality.consentBlocked = dropped
    return { accepted: 0, dropped, records: [], quality }
  }

  if (!Array.isArray(input.events)) {
    quality.missingSessionMetadata = 1
    return { accepted: 0, dropped: 1, records: [], quality }
  }

  const nowIso = input.nowIso ?? new Date().toISOString()
  let accepted = 0
  let dropped = 0
  const records: KfzAnalyticsRecord[] = []

  for (const raw of input.events.slice(0, 40)) {
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
      continue
    }
    if (
      (sanitized.eventName === 'step_view' ||
        sanitized.eventName === 'step_completed' ||
        sanitized.eventName === 'back_navigation') &&
      !sanitized.properties.stepId
    ) {
      dropped += 1
      continue
    }
    const written = await input.store.insertEvent(sanitized)
    records.push(written.record)
    if (written.inserted) {
      accepted += 1
    } else {
      quality.duplicates += 1
    }
  }

  return { accepted, dropped, records, quality }
}
