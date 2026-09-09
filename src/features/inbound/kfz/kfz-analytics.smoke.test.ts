/**
 * Privacy-safe first-party Kfz funnel analytics.
 * Consent, allow-list, redaction, dedup, active time, abandonment, dashboard.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { aggregateKfzAnalyticsDashboard } from '@/features/inbound/kfz/lib/kfz-analytics-aggregate'
import {
  emptyKfzAnalyticsTiming,
  tickKfzAnalyticsTiming,
} from '@/features/inbound/kfz/lib/kfz-analytics-active-time'
import {
  createMemoryKfzAnalyticsConsentStorage,
  readKfzAnalyticsConsent,
  readOrCreateKfzAnalyticsSessionId,
  writeKfzAnalyticsConsent,
} from '@/features/inbound/kfz/lib/kfz-analytics-consent'
import {
  KFZ_ANALYTICS_FIXTURE_ALL,
  KFZ_ANALYTICS_FIXTURE_SESSION_A,
} from '@/features/inbound/kfz/lib/kfz-analytics-fixtures'
import { ingestKfzAnalyticsEvents } from '@/features/inbound/kfz/lib/kfz-analytics-ingest'
import {
  KFZ_ANALYTICS_PRIVACY_NOTES,
  KFZ_ANALYTICS_PURPOSE,
} from '@/features/inbound/kfz/lib/kfz-analytics-privacy-boundary'
import {
  assertNoKfzAnalyticsPii,
  sanitizeKfzAnalyticsRecord,
} from '@/features/inbound/kfz/lib/kfz-analytics-redact'
import { createKfzAnalyticsController } from '@/features/inbound/kfz/lib/kfz-analytics-session'
import { sanitizeKfzAnalyticsTrafficSource } from '@/features/inbound/kfz/lib/kfz-analytics-traffic-source'
import { createMemoryKfzAnalyticsStore } from '@/features/inbound/kfz/repositories/kfz-analytics-store'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const SESSION = '11111111-1111-4111-8111-111111111111'

function readSrc(relativeFromSrc: string): string {
  return fs.readFileSync(path.join(srcRoot, relativeFromSrc), 'utf8')
}

describe('kfz analytics privacy boundary', () => {
  it('documents a technical boundary without legal claims', () => {
    assert.equal(KFZ_ANALYTICS_PURPOSE, 'kfz_funnel_measurement')
    assert.ok(KFZ_ANALYTICS_PRIVACY_NOTES.length >= 3)
    const notes = KFZ_ANALYTICS_PRIVACY_NOTES.join(' ')
    assert.match(notes, /Technische Grenze/)
    assert.doesNotMatch(notes, /DSGVO-konform|rechtskonform|lawful/)
    const contract = readSrc('features/inbound/kfz/lib/kfz-analytics-privacy-boundary.ts')
    assert.match(contract, /not a legal/)
    assert.match(contract, /sessionStorage/)
    assert.doesNotMatch(contract, /document\.cookie/)
  })
})

describe('kfz analytics consent', () => {
  it('does not persist events when consent is unknown or declined', async () => {
    const store = createMemoryKfzAnalyticsStore()
    const storage = createMemoryKfzAnalyticsConsentStorage()
    const controller = createKfzAnalyticsController({
      storage,
      randomUuid: () => SESSION,
    })

    assert.equal(controller.getConsent(), 'unknown')
    assert.equal(controller.getSessionId(), null)
    assert.equal(controller.recordLandingView().length, 0)
    assert.equal(readOrCreateKfzAnalyticsSessionId(storage, 'unknown'), null)

    const declined = await ingestKfzAnalyticsEvents({
      consent: 'declined',
      events: [
        {
          eventName: 'landing_view',
          sessionId: SESSION,
          occurredAt: '2026-09-09T08:00:00.000Z',
          properties: {},
        },
      ],
      store,
    })
    assert.equal(declined.accepted, 0)
    assert.equal((await store.listEvents()).length, 0)

    writeKfzAnalyticsConsent(storage, 'declined')
    assert.equal(readKfzAnalyticsConsent(storage), 'declined')
    const afterDecline = createKfzAnalyticsController({
      storage,
      randomUuid: () => SESSION,
    })
    assert.equal(afterDecline.recordFunnelStart('switch_car').length, 0)
  })

  it('creates a session id and records landing_view only after grant', async () => {
    const store = createMemoryKfzAnalyticsStore()
    const storage = createMemoryKfzAnalyticsConsentStorage()
    const controller = createKfzAnalyticsController({
      storage,
      attribution: { utmSource: 'google', utmCampaign: 'kfz-check' },
      randomUuid: () => SESSION,
    })

    const granted = controller.setConsent('granted')
    assert.equal(controller.getConsent(), 'granted')
    assert.equal(controller.getSessionId(), SESSION)
    assert.ok(granted.some((event) => event.eventName === 'landing_view'))
    assert.ok(granted.some((event) => event.eventName === 'traffic_source'))

    const ingested = await ingestKfzAnalyticsEvents({
      consent: 'granted',
      events: granted,
      store,
    })
    assert.equal(ingested.accepted, granted.length)
    const names = (await store.listEvents()).map((event) => event.eventName)
    assert.deepEqual(names.sort(), ['landing_view', 'traffic_source'])
  })
})

describe('kfz analytics allow-list and redaction', () => {
  it('drops unknown events, PII keys and free-form values', () => {
    const poisoned = sanitizeKfzAnalyticsRecord(
      {
        eventName: 'landing_view',
        sessionId: SESSION,
        occurredAt: '2026-09-09T08:00:00.000Z',
        properties: {
          stepId: 'branch',
          fullName: 'Max Mustermann',
          email: 'max@example.com',
          phone: '+491701234567',
          licensePlate: 'OS-AB 123',
          answers: { intent: 'switch_car' },
          userAgent: 'Mozilla/5.0',
          url: 'https://kfz.artkus.de/kfz?email=max@example.com',
          ip: '203.0.113.10',
          filename: 'schein.pdf',
          activeMs: 1200,
        },
      },
      '2026-09-09T08:00:00.000Z',
    )

    assert.ok(poisoned)
    assert.equal(poisoned.properties.stepId, 'branch')
    assert.equal(poisoned.properties.activeMs, 1200)
    assert.equal('fullName' in poisoned.properties, false)
    assert.equal('email' in poisoned.properties, false)
    assert.equal('phone' in poisoned.properties, false)
    assert.deepEqual(assertNoKfzAnalyticsPii(poisoned), [])

    const rejected = sanitizeKfzAnalyticsRecord(
      {
        eventName: 'custom_click',
        sessionId: SESSION,
        properties: { stepId: 'branch' },
      },
      '2026-09-09T08:00:00.000Z',
    )
    assert.equal(rejected, null)
  })

  it('discards unsafe and free-form traffic sources', () => {
    const dirty = sanitizeKfzAnalyticsTrafficSource({
      utmSource: 'https://evil.example/?email=a@b.c',
      utmCampaign: 'Buy now!!!',
      campaign: 'random-freeform-campaign',
    })
    assert.deepEqual(dirty, {
      trafficSource: 'direct',
      utmSource: null,
      utmCampaign: null,
    })

    const clean = sanitizeKfzAnalyticsTrafficSource({
      utmSource: 'Google',
      utmCampaign: 'KFZ-CHECK',
    })
    assert.deepEqual(clean, {
      trafficSource: 'utm',
      utmSource: 'google',
      utmCampaign: 'kfz-check',
    })
  })
})

describe('kfz analytics visit and step deduplication', () => {
  it('does not inflate visits or completed steps on reload or repeated render', async () => {
    const store = createMemoryKfzAnalyticsStore()
    const storage = createMemoryKfzAnalyticsConsentStorage()
    const first = createKfzAnalyticsController({
      storage,
      randomUuid: () => SESSION,
    })
    const initial = [
      ...first.setConsent('granted'),
      ...first.recordStepView('branch'),
      ...first.recordStepCompleted('branch'),
      ...first.recordStepView('contact'),
    ]
    await ingestKfzAnalyticsEvents({ consent: 'granted', events: initial, store })

    const reload = createKfzAnalyticsController({
      storage,
      randomUuid: () => SESSION,
    })
    const repeated = [
      ...reload.recordLandingView(),
      ...reload.recordStepView('branch'),
      ...reload.recordStepCompleted('branch'),
      ...reload.recordStepView('contact'),
      ...reload.recordStepView('contact'),
    ]
    await ingestKfzAnalyticsEvents({ consent: 'granted', events: repeated, store })

    const events = await store.listEvents()
    assert.equal(events.filter((event) => event.eventName === 'landing_view').length, 1)
    assert.equal(
      events.filter((event) => event.eventName === 'step_completed' && event.properties.stepId === 'branch')
        .length,
      1,
    )
    assert.equal(
      events.filter((event) => event.eventName === 'step_view' && event.properties.stepId === 'contact')
        .length,
      1,
    )
  })
})

describe('kfz analytics active time', () => {
  it('excludes hidden and background time from active totals', () => {
    let snapshot = emptyKfzAnalyticsTiming()
    snapshot = tickKfzAnalyticsTiming(snapshot, { now: 1_000, hidden: false, stepId: 'branch' })
    snapshot = tickKfzAnalyticsTiming(snapshot, { now: 4_000, hidden: false, stepId: 'branch' })
    snapshot = tickKfzAnalyticsTiming(snapshot, { now: 4_000, hidden: true, stepId: 'branch' })
    snapshot = tickKfzAnalyticsTiming(snapshot, { now: 20_000, hidden: true, stepId: 'branch' })
    snapshot = tickKfzAnalyticsTiming(snapshot, { now: 20_000, hidden: false, stepId: 'branch' })
    snapshot = tickKfzAnalyticsTiming(snapshot, { now: 22_000, hidden: false, stepId: 'branch' })

    assert.equal(snapshot.totalActiveMs, 5_000)
    assert.equal(snapshot.stepActiveMs.branch, 5_000)
  })
})

describe('kfz analytics abandonment and exact-once submit', () => {
  it('records abandonment from the last safe step without form content', async () => {
    const store = createMemoryKfzAnalyticsStore()
    const storage = createMemoryKfzAnalyticsConsentStorage()
    const controller = createKfzAnalyticsController({
      storage,
      randomUuid: () => SESSION,
    })
    const events = [
      ...controller.setConsent('granted'),
      ...controller.recordStepView('branch'),
      ...controller.recordFunnelStart('switch_car'),
      ...controller.recordStepCompleted('branch'),
      ...controller.recordStepView('usage'),
      ...controller.recordAbandoned(),
    ]
    await ingestKfzAnalyticsEvents({ consent: 'granted', events, store })
    const stored = await store.listEvents()
    const abandoned = stored.find((event) => event.eventName === 'funnel_abandoned')
    assert.ok(abandoned)
    assert.equal(abandoned.properties.lastStepId, 'usage')
    assert.deepEqual(assertNoKfzAnalyticsPii(abandoned), [])
    assert.equal(JSON.stringify(abandoned).includes('Golf'), false)
  })

  it('records successful submit once and ignores a second success', async () => {
    const store = createMemoryKfzAnalyticsStore()
    const storage = createMemoryKfzAnalyticsConsentStorage()
    const controller = createKfzAnalyticsController({
      storage,
      randomUuid: () => SESSION,
    })
    controller.setConsent('granted')
    const first = controller.recordSubmitSucceeded()
    const second = controller.recordSubmitSucceeded()
    await ingestKfzAnalyticsEvents({
      consent: 'granted',
      events: [...first, ...second],
      store,
    })
    const stored = await store.listEvents()
    assert.equal(stored.filter((event) => event.eventName === 'submit_succeeded').length, 1)
    assert.equal(second.length, 0)
  })
})

describe('kfz analytics dashboard aggregation', () => {
  it('aggregates visits, conversion, sources, branches, drop-off and timing', () => {
    const dashboard = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_ALL, {
      periodId: 'all',
      nowMs: Date.parse('2026-09-09T12:00:00.000Z'),
    })

    assert.equal(dashboard.empty, false)
    assert.equal(dashboard.visits, 4)
    assert.equal(dashboard.funnelStarts, 3)
    assert.equal(dashboard.submissions, 2)
    assert.ok(dashboard.conversionRate != null)
    assert.equal(Number(dashboard.conversionRate.toFixed(2)), 0.5)
    assert.ok(dashboard.trafficSources.some((row) => row.id === 'utm' && row.count === 2))
    assert.ok(dashboard.campaigns.some((row) => row.id === 'kfz-check' && row.count === 1))
    assert.ok(dashboard.branches.some((row) => row.id === 'upload_documents' && row.count === 1))
    assert.ok(dashboard.branches.some((row) => row.id === 'switch_car' && row.count === 1))

    const usage = dashboard.steps.find((step) => step.stepId === 'usage')
    assert.ok(usage)
    assert.equal(usage.reached, 1)
    assert.equal(usage.dropOff, 1)

    const branch = dashboard.steps.find((step) => step.stepId === 'branch')
    assert.ok(branch)
    assert.equal(branch.dropOff, 1)

    assert.equal(dashboard.abandoned, 2)
    assert.equal(dashboard.validationBlocked, 1)
    assert.equal(dashboard.submitFailed, 1)
    assert.ok(dashboard.landingAverageActiveMs != null)
    assert.ok(dashboard.landingMedianActiveMs != null)

    const empty = aggregateKfzAnalyticsDashboard([], {
      periodId: '24h',
      nowMs: Date.parse('2026-09-09T12:00:00.000Z'),
    })
    assert.equal(empty.empty, true)
    assert.equal(empty.visits, 0)
    assert.equal(empty.conversionRate, null)
    assert.equal(empty.steps.length, 0)
  })

  it('does not leak fixture personal data into dashboard rows', () => {
    const dashboard = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_ALL, {
      periodId: 'all',
      nowMs: Date.parse('2026-09-09T12:00:00.000Z'),
    })
    const serialized = JSON.stringify(dashboard)
    assert.doesNotMatch(serialized, /Mustermann|@|OS-AB|Golf|user-agent|filename/i)
    assert.ok(KFZ_ANALYTICS_FIXTURE_SESSION_A.startsWith('aaaaaaaa'))
  })
})

describe('kfz analytics source hygiene', () => {
  it('keeps first-party modules free of cookies, pixels and paid analytics', () => {
    const files = [
      'features/inbound/kfz/lib/kfz-analytics-redact.ts',
      'features/inbound/kfz/lib/kfz-analytics-session.ts',
      'features/inbound/kfz/lib/kfz-analytics-consent.ts',
      'features/inbound/kfz/components/kfz-landing-analytics-root.tsx',
      'features/inbound/kfz/components/kfz-analytics-consent-banner.tsx',
      'features/inbound/kfz/components/kfz-analytics-dashboard.tsx',
      'app/api/inbound/kfz-analytics/route.ts',
    ]
    const source = files.map((relative) => readSrc(relative)).join('\n')
    for (const fragment of [
      'document.cookie',
      'gtag(',
      'googletagmanager',
      'facebook.net',
      'fbevents',
      'matomo',
      'hotjar',
      'graph.facebook.com',
      'api.whatsapp.com',
    ]) {
      assert.doesNotMatch(source, new RegExp(fragment.replace(/[()]/g, '\\$&')))
    }
    assert.match(source, /sessionStorage/)
  })

  it('adds a checked-in migration for anonymous analytics events', () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), 'supabase/migrations/20260909140000_kfz_funnel_analytics_events.sql'),
      'utf8',
    )
    assert.match(sql, /create table public\.kfz_funnel_analytics_events/)
    assert.match(sql, /landing_view/)
    assert.match(sql, /enable row level security/)
    assert.match(sql, /No customer answers/)
  })
})
