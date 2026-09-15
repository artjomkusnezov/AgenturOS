import { NextResponse } from 'next/server'

import { getInboundKfzRuntimeConfig } from '@/features/inbound/kfz/config/inbound-kfz-config'
import { ingestKfzAnalyticsEvents } from '@/features/inbound/kfz/lib/kfz-analytics-ingest'
import { sanitizeKfzAnalyticsHealthFacts } from '@/features/inbound/kfz/lib/kfz-analytics-health'
import { consumeRateLimit } from '@/features/inbound/kfz/lib/rate-limit-seam'
import { createServiceRoleKfzAnalyticsStore } from '@/features/inbound/kfz/repositories/kfz-analytics-store'

/**
 * First-party Kfz funnel analytics ingest.
 * Accepts only allow-listed anonymous events after client consent=granted.
 * No IP, user-agent, form answers or URLs are persisted.
 */
export async function POST(request: Request) {
  const limit = consumeRateLimit({
    key: 'kfz-funnel-analytics',
    max: 120,
    windowMs: 60_000,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      {
        accepted: 0,
        dropped: 0,
        rejected: 0,
        duplicates: 0,
        transientFailed: 0,
        retryRecovered: 0,
      },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        accepted: 0,
        dropped: 0,
        rejected: 0,
        duplicates: 0,
        transientFailed: 0,
        retryRecovered: 0,
      },
      { status: 400 },
    )
  }

  const consent =
    typeof body === 'object' && body !== null && 'consent' in body
      ? (body as { consent: unknown }).consent
      : 'unknown'
  const events =
    typeof body === 'object' && body !== null && 'events' in body
      ? (body as { events: unknown }).events
      : []
  const droppedWithoutWrite = Array.isArray(events) ? events.length : 0

  if (consent !== 'granted') {
    return NextResponse.json({
      accepted: 0,
      dropped: droppedWithoutWrite,
      rejected: 0,
      duplicates: 0,
      transientFailed: 0,
      retryRecovered: 0,
    })
  }

  const config = getInboundKfzRuntimeConfig()
  if (!config) {
    return NextResponse.json({
      accepted: 0,
      dropped: droppedWithoutWrite,
      rejected: 0,
      duplicates: 0,
      transientFailed: 0,
      retryRecovered: 0,
    })
  }

  try {
    const store = createServiceRoleKfzAnalyticsStore(config.agencyId)
    const result = await ingestKfzAnalyticsEvents({
      consent,
      events,
      store,
    })
    const health = sanitizeKfzAnalyticsHealthFacts(result.health)
    const payload = {
      accepted: result.accepted,
      dropped: result.dropped,
      rejected: health.rejected,
      duplicates: health.duplicates,
      transientFailed: health.transientFailed,
      retryRecovered: health.retryRecovered,
    }
    if (result.accepted === 0 && health.transientFailed > 0) {
      return NextResponse.json(payload, { status: 503 })
    }
    return NextResponse.json(payload)
  } catch {
    return NextResponse.json({
      accepted: 0,
      dropped: droppedWithoutWrite,
      rejected: 0,
      duplicates: 0,
      transientFailed: 0,
      retryRecovered: 0,
    })
  }
}
