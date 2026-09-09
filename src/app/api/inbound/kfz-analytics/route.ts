import { NextResponse } from 'next/server'

import { getInboundKfzRuntimeConfig } from '@/features/inbound/kfz/config/inbound-kfz-config'
import { ingestKfzAnalyticsEvents } from '@/features/inbound/kfz/lib/kfz-analytics-ingest'
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
    return NextResponse.json({ accepted: 0, dropped: 0 }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ accepted: 0, dropped: 0 }, { status: 400 })
  }

  const consent =
    typeof body === 'object' && body !== null && 'consent' in body
      ? (body as { consent: unknown }).consent
      : 'unknown'
  const events =
    typeof body === 'object' && body !== null && 'events' in body
      ? (body as { events: unknown }).events
      : []

  if (consent !== 'granted') {
    return NextResponse.json({ accepted: 0, dropped: Array.isArray(events) ? events.length : 0 })
  }

  const config = getInboundKfzRuntimeConfig()
  if (!config) {
    return NextResponse.json({ accepted: 0, dropped: Array.isArray(events) ? events.length : 0 })
  }

  try {
    const store = createServiceRoleKfzAnalyticsStore(config.agencyId)
    const result = await ingestKfzAnalyticsEvents({
      consent,
      events,
      store,
    })
    return NextResponse.json({ accepted: result.accepted, dropped: result.dropped })
  } catch {
    return NextResponse.json({ accepted: 0, dropped: Array.isArray(events) ? events.length : 0 })
  }
}
