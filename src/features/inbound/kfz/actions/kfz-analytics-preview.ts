'use server'

import { ingestKfzAnalyticsEvents } from '@/features/inbound/kfz/lib/kfz-analytics-ingest'
import {
  emptyKfzAnalyticsHealthFacts,
  sanitizeKfzAnalyticsHealthFacts,
} from '@/features/inbound/kfz/lib/kfz-analytics-health'
import { getKfzAnalyticsPreviewStore } from '@/features/inbound/kfz/repositories/kfz-analytics-store'
import type { KfzAnalyticsHealthFacts } from '@/features/inbound/kfz/types/kfz-analytics'

/**
 * Local-only analytics ingest. Production returns empty. No customer payload.
 */
export async function recordKfzAnalyticsPreviewAction(input: {
  consent: unknown
  events: unknown
}): Promise<{
  accepted: number
  dropped: number
  health: KfzAnalyticsHealthFacts
}> {
  if (process.env.NODE_ENV === 'production') {
    return {
      accepted: 0,
      dropped: Array.isArray(input.events) ? input.events.length : 0,
      health: emptyKfzAnalyticsHealthFacts(),
    }
  }

  const result = await ingestKfzAnalyticsEvents({
    consent: input.consent,
    events: input.events,
    store: getKfzAnalyticsPreviewStore(),
  })
  return {
    accepted: result.accepted,
    dropped: result.dropped,
    health: sanitizeKfzAnalyticsHealthFacts(result.health),
  }
}

export async function readKfzAnalyticsPreviewAction() {
  if (process.env.NODE_ENV === 'production') {
    return {
      events: [] as const,
      health: { available: false as const, facts: emptyKfzAnalyticsHealthFacts() },
    }
  }
  const store = getKfzAnalyticsPreviewStore()
  return {
    events: await store.listEvents(),
    health: await store.readHealthFacts(),
  }
}
