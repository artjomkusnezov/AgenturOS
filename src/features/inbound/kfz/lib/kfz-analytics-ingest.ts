import { analyticsConsentAllowsPersist } from '@/features/inbound/kfz/lib/kfz-analytics-consent'
import {
  sanitizeKfzAnalyticsRecord,
  type SanitizeKfzAnalyticsInput,
} from '@/features/inbound/kfz/lib/kfz-analytics-redact'
import type {
  KfzAnalyticsConsentState,
  KfzAnalyticsRecord,
  KfzAnalyticsStore,
} from '@/features/inbound/kfz/types/kfz-analytics'

export async function ingestKfzAnalyticsEvents(input: {
  consent: unknown
  events: unknown
  store: KfzAnalyticsStore
  nowIso?: string
}): Promise<{ accepted: number; dropped: number; records: KfzAnalyticsRecord[] }> {
  if (!analyticsConsentAllowsPersist(input.consent as KfzAnalyticsConsentState)) {
    return { accepted: 0, dropped: Array.isArray(input.events) ? input.events.length : 0, records: [] }
  }

  if (!Array.isArray(input.events)) {
    return { accepted: 0, dropped: 1, records: [] }
  }

  const nowIso = input.nowIso ?? new Date().toISOString()
  let accepted = 0
  let dropped = 0
  const records: KfzAnalyticsRecord[] = []

  for (const raw of input.events.slice(0, 40)) {
    const sanitized = sanitizeKfzAnalyticsRecord(
      raw as SanitizeKfzAnalyticsInput,
      nowIso,
    )
    if (!sanitized) {
      dropped += 1
      continue
    }
    const written = await input.store.insertEvent(sanitized)
    records.push(written.record)
    if (written.inserted) {
      accepted += 1
    }
  }

  return { accepted, dropped, records }
}
