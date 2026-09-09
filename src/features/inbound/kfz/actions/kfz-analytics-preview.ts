'use server'

import { ingestKfzAnalyticsEvents } from '@/features/inbound/kfz/lib/kfz-analytics-ingest'
import { getKfzAnalyticsPreviewStore } from '@/features/inbound/kfz/repositories/kfz-analytics-store'

/**
 * Local-only analytics ingest. Production returns empty. No customer payload.
 */
export async function recordKfzAnalyticsPreviewAction(input: {
  consent: unknown
  events: unknown
}): Promise<{ accepted: number; dropped: number }> {
  if (process.env.NODE_ENV === 'production') {
    return { accepted: 0, dropped: Array.isArray(input.events) ? input.events.length : 0 }
  }

  const result = await ingestKfzAnalyticsEvents({
    consent: input.consent,
    events: input.events,
    store: getKfzAnalyticsPreviewStore(),
  })
  return { accepted: result.accepted, dropped: result.dropped }
}

export async function readKfzAnalyticsPreviewAction() {
  if (process.env.NODE_ENV === 'production') {
    return { events: [] as const }
  }
  return { events: await getKfzAnalyticsPreviewStore().listEvents() }
}
