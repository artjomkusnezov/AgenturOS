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
  KFZ_ANALYTICS_MIN_RATE_GROUP,
  resolveKfzAnalyticsPreviousRange,
} from '@/features/inbound/kfz/lib/kfz-analytics-compare'
import {
  emptyKfzAnalyticsTiming,
  tickKfzAnalyticsTiming,
} from '@/features/inbound/kfz/lib/kfz-analytics-active-time'
import {
  createMemoryKfzAnalyticsConsentStorage,
  readKfzAnalyticsConsent,
  readOrCreateKfzAnalyticsSessionId,
  withdrawKfzAnalyticsConsent,
  writeKfzAnalyticsConsent,
} from '@/features/inbound/kfz/lib/kfz-analytics-consent'
import {
  KFZ_ANALYTICS_FIXTURE_ALL,
  KFZ_ANALYTICS_FIXTURE_COMPARISON,
  KFZ_ANALYTICS_FIXTURE_OTHER_DAY,
  KFZ_ANALYTICS_FIXTURE_PREVIOUS_WINDOW,
  KFZ_ANALYTICS_FIXTURE_QUALITY_DIRTY,
  KFZ_ANALYTICS_FIXTURE_SESSION_A,
  KFZ_ANALYTICS_FIXTURE_UNKNOWN,
} from '@/features/inbound/kfz/lib/kfz-analytics-fixtures'
import {
  buildKfzAnalyticsDashboardHref,
  describeKfzAnalyticsTimeRange,
  KFZ_ANALYTICS_MAX_RANGE_DAYS,
  parseKfzAnalyticsCalendarDate,
  resolveKfzAnalyticsDashboardFilters,
} from '@/features/inbound/kfz/lib/kfz-analytics-filters'
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
import {
  classifyKfzAnalyticsReferrerCategory,
} from '@/features/inbound/kfz/lib/kfz-analytics-referrer'
import {
  classifyKfzAnalyticsDashboardFailure,
  kfzAnalyticsQualityStateCopy,
  kfzAnalyticsReviewStateCopy,
  resolveKfzAnalyticsDataQualityState,
  resolveKfzAnalyticsReviewStatus,
  reviewCopyLeaksEnvironment,
  KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR,
  KFZ_ANALYTICS_UNAVAILABLE_ERROR,
} from '@/features/inbound/kfz/lib/kfz-analytics-review-state'
import {
  isKfzAnalyticsForwardTransitionAllowed,
  unavailableKfzAnalyticsDataQuality,
} from '@/features/inbound/kfz/lib/kfz-analytics-quality'
import { sanitizeKfzAnalyticsTrafficSource } from '@/features/inbound/kfz/lib/kfz-analytics-traffic-source'
import { KFZ_ANALYTICS_PROPERTY_KEYS } from '@/features/inbound/kfz/types/kfz-analytics'
import { createMemoryKfzAnalyticsStore } from '@/features/inbound/kfz/repositories/kfz-analytics-store'
import { SupabasePublicConfigError } from '@/lib/supabase/public-config'

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

  it('stops collection after withdrawal and never reconstructs form answers', async () => {
    const store = createMemoryKfzAnalyticsStore()
    const storage = createMemoryKfzAnalyticsConsentStorage()
    const controller = createKfzAnalyticsController({
      storage,
      randomUuid: () => SESSION,
    })

    const granted = controller.setConsent('granted')
    await ingestKfzAnalyticsEvents({
      consent: 'granted',
      events: granted,
      store,
    })
    assert.equal((await store.listEvents()).length > 0, true)

    withdrawKfzAnalyticsConsent(storage)
    assert.equal(readKfzAnalyticsConsent(storage), 'declined')
    assert.equal(readOrCreateKfzAnalyticsSessionId(storage, 'declined'), null)

    const withdrawn = createKfzAnalyticsController({
      storage,
      randomUuid: () => SESSION,
    })
    assert.equal(withdrawn.getConsent(), 'declined')
    assert.equal(withdrawn.getSessionId(), null)
    assert.equal(withdrawn.recordLandingView().length, 0)
    assert.equal(withdrawn.recordFunnelStart('switch_car').length, 0)
    assert.equal(withdrawn.recordStepView('contact').length, 0)
    assert.equal(withdrawn.setConsent('declined').length, 0)

    const afterWithdraw = await ingestKfzAnalyticsEvents({
      consent: 'declined',
      events: [
        {
          eventName: 'submit_succeeded',
          sessionId: SESSION,
          occurredAt: '2026-09-09T08:00:00.000Z',
          properties: {
            fullName: 'Max Mustermann',
            email: 'max@example.com',
            answers: { intent: 'switch_car', sf_class_haftpflicht: '8' },
            filename: 'schein.pdf',
          },
        },
      ],
      store,
    })
    assert.equal(afterWithdraw.accepted, 0)
    assert.equal(afterWithdraw.quality.consentBlocked, 1)
    const stored = await store.listEvents()
    assert.equal(stored.some((event) => event.eventName === 'submit_succeeded'), false)
    const serialized = JSON.stringify(stored)
    assert.equal(serialized.includes('Mustermann'), false)
    assert.equal(serialized.includes('max@example.com'), false)
    assert.equal(serialized.includes('schein.pdf'), false)
    assert.equal(serialized.includes('sf_class_haftpflicht'), false)
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
  it('keeps only allow-listed metadata fields and redacts forbidden payload keys', () => {
    const allowed = sanitizeKfzAnalyticsRecord(
      {
        eventName: 'step_view',
        sessionId: SESSION,
        occurredAt: '2026-09-09T08:00:00.000Z',
        properties: {
          stepId: 'contact',
          fromStepId: 'branch',
          branchId: 'switch_car',
          trafficSource: 'utm',
          referrerCategory: 'search',
          utmSource: 'google',
          utmCampaign: 'kfz-check',
          fieldId: 'missing_contact',
          errorCategory: 'timeout',
          activeMs: 2400,
          lastStepId: 'contact',
        },
      },
      '2026-09-09T08:00:00.000Z',
    )
    assert.ok(allowed)
    assert.deepEqual(allowed.properties, {
      stepId: 'contact',
      fromStepId: 'branch',
      branchId: 'switch_car',
      trafficSource: 'utm',
      referrerCategory: 'search',
      utmSource: 'google',
      utmCampaign: 'kfz-check',
      fieldId: 'missing_contact',
      errorCategory: 'timeout',
      activeMs: 2400,
      lastStepId: 'contact',
    })
    for (const key of Object.keys(allowed.properties)) {
      assert.ok((KFZ_ANALYTICS_PROPERTY_KEYS as readonly string[]).includes(key))
    }

    const forbidden = sanitizeKfzAnalyticsRecord(
      {
        eventName: 'submit_succeeded',
        sessionId: SESSION,
        occurredAt: '2026-09-09T08:00:00.000Z',
        properties: {
          stepId: 'documents',
          fullName: 'Max Mustermann',
          email: 'max@example.com',
          phone: '+491701234567',
          answers: { intent: 'switch_car', sf_class_haftpflicht: '8' },
          filename: 'schein.pdf',
          objectKey: 'kfz/agency/item/schein.pdf',
          documentContent: '%PDF-1.4 secret-bytes',
          freeText: 'Bitte um Rückruf wegen Schaden',
          url: 'https://kfz.artkus.de/kfz?email=max@example.com&ref=1',
          href: 'https://evil.example/ref?name=leak',
          query: '?utm_source=google&email=max@example.com',
          referrer: 'https://google.com/search?q=Max+Mustermann',
          secret: 'INBOUND_KFZ_INTAKE_SECRET=super-secret',
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb',
          userAgent: 'Mozilla/5.0',
          ip: '203.0.113.10',
          licensePlate: 'OS-AB 123',
        },
      },
      '2026-09-09T08:00:00.000Z',
    )
    assert.ok(forbidden)
    assert.equal(forbidden.properties.stepId, 'documents')
    const serialized = JSON.stringify(forbidden)
    for (const leak of [
      'Mustermann',
      'max@example.com',
      '+491701234567',
      'schein.pdf',
      'kfz/agency/item',
      'secret-bytes',
      'Rückruf',
      'kfz.artkus.de',
      'evil.example',
      'email=max',
      'google.com/search',
      'super-secret',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'Mozilla',
      '203.0.113.10',
      'OS-AB',
    ]) {
      assert.equal(serialized.includes(leak), false, `leaked ${leak}`)
    }
    assert.deepEqual(assertNoKfzAnalyticsPii(forbidden), [])
  })

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

  it('never keeps SF class or deductible selections in analytics properties', () => {
    const poisoned = sanitizeKfzAnalyticsRecord(
      {
        eventName: 'validation_blocked',
        sessionId: SESSION,
        occurredAt: '2026-09-09T08:00:00.000Z',
        properties: {
          stepId: 'insurance',
          fieldId: 'sf_class_haftpflicht',
          sf_class: '8',
          sf_class_haftpflicht: '12',
          sf_class_vollkasko: '20',
          deductible: '500 €',
          deductible_partial: '150',
          deductible_full: '1000',
          selbstbeteiligung: '300 €',
          answers: {
            sf_class_haftpflicht: '8',
            deductible_partial: '150',
          },
        },
      },
      '2026-09-09T08:00:00.000Z',
    )

    assert.ok(poisoned)
    assert.equal(poisoned.properties.stepId, 'insurance')
    assert.equal(poisoned.properties.fieldId, 'missing_field')
    const serialized = JSON.stringify(poisoned)
    assert.doesNotMatch(serialized, /"8"/)
    assert.doesNotMatch(serialized, /"12"/)
    assert.doesNotMatch(serialized, /"20"/)
    assert.doesNotMatch(serialized, /500 €/)
    assert.doesNotMatch(serialized, /sf_class_haftpflicht/)
    assert.doesNotMatch(serialized, /deductible_partial/)
    assert.doesNotMatch(serialized, /selbstbeteiligung/i)
    assert.deepEqual(assertNoKfzAnalyticsPii(poisoned), [])
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
      referrerCategory: null,
    })
    assert.equal(JSON.stringify(dirty).includes('evil.example'), false)

    const clean = sanitizeKfzAnalyticsTrafficSource({
      utmSource: 'Google',
      utmCampaign: 'KFZ-CHECK',
    })
    assert.deepEqual(clean, {
      trafficSource: 'utm',
      utmSource: 'google',
      utmCampaign: 'kfz-check',
      referrerCategory: null,
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

describe('kfz analytics referrer category', () => {
  it('classifies hosts without keeping the URL or query string', () => {
    assert.equal(classifyKfzAnalyticsReferrerCategory(''), 'direct')
    assert.equal(classifyKfzAnalyticsReferrerCategory(null), 'direct')
    assert.equal(
      classifyKfzAnalyticsReferrerCategory('https://www.google.com/search?q=max@example.com'),
      'search',
    )
    assert.equal(
      classifyKfzAnalyticsReferrerCategory('https://l.instagram.com/?u=https://evil.example'),
      'social',
    )
    assert.equal(
      classifyKfzAnalyticsReferrerCategory('https://www.artkus.de/kfz?phone=+49170'),
      'internal',
    )
    assert.equal(
      classifyKfzAnalyticsReferrerCategory('https://evil.example/ref?email=a@b.c'),
      'other',
    )
    assert.equal(classifyKfzAnalyticsReferrerCategory('not a url @@'), undefined)

    const classified = sanitizeKfzAnalyticsTrafficSource(
      { utmSource: 'google', utmCampaign: 'kfz-check' },
      'https://www.google.de/search?q=OS-AB+123&email=max@example.com',
    )
    assert.equal(classified.referrerCategory, 'search')
    assert.equal(JSON.stringify(classified).includes('google.de'), false)
    assert.equal(JSON.stringify(classified).includes('max@'), false)
    assert.equal(JSON.stringify(classified).includes('OS-AB'), false)
  })
})

describe('kfz analytics transitions are idempotent', () => {
  it('records a from-to edge once per session even after retry', async () => {
    const store = createMemoryKfzAnalyticsStore()
    const storage = createMemoryKfzAnalyticsConsentStorage()
    const nowMs = Date.parse('2026-09-09T12:00:00.000Z')
    const controller = createKfzAnalyticsController({
      storage,
      randomUuid: () => SESSION,
      now: () => nowMs,
    })
    const granted = controller.setConsent('granted')
    const first = [
      ...controller.recordStepView('branch'),
      ...controller.recordStepView('contact'),
      ...controller.recordStepView('documents'),
    ]
    const retry = [
      ...controller.recordStepView('branch'),
      ...controller.recordStepView('contact'),
      ...controller.recordStepView('documents'),
    ]
    await ingestKfzAnalyticsEvents({
      consent: 'granted',
      events: [...granted, ...first, ...retry, ...first],
      store,
      nowIso: '2026-09-09T12:00:00.000Z',
    })
    const dashboard = aggregateKfzAnalyticsDashboard(await store.listEvents(), {
      periodId: 'all',
      nowMs,
    })
    assert.equal(retry.length, 0)
    assert.equal(
      dashboard.transitions.find((row) => row.id === 'branch->contact')?.count,
      1,
    )
    assert.equal(
      dashboard.transitions.find((row) => row.id === 'contact->documents')?.count,
      1,
    )
    assert.equal(dashboard.visits, 1)
  })
})

describe('kfz analytics review states', () => {
  it('exposes empty, unavailable and configuration-missing copy without env values', () => {
    assert.equal(resolveKfzAnalyticsReviewStatus({ empty: true }), 'empty')
    assert.equal(
      resolveKfzAnalyticsReviewStatus({ loadStatus: 'unavailable' }),
      'unavailable',
    )
    assert.equal(
      resolveKfzAnalyticsReviewStatus({ loadStatus: 'configuration_missing' }),
      'configuration_missing',
    )

    const config = classifyKfzAnalyticsDashboardFailure(new SupabasePublicConfigError())
    assert.equal(config.ok, false)
    assert.equal(config.status, 'configuration_missing')
    assert.equal(config.error, KFZ_ANALYTICS_CONFIGURATION_MISSING_ERROR)

    const unavailable = classifyKfzAnalyticsDashboardFailure(new Error('relation missing'))
    assert.equal(unavailable.ok, false)
    assert.equal(unavailable.status, 'unavailable')
    assert.equal(unavailable.error, KFZ_ANALYTICS_UNAVAILABLE_ERROR)
    assert.equal(unavailable.error.includes('relation'), false)

    for (const status of ['empty', 'unavailable', 'configuration_missing'] as const) {
      const copy = kfzAnalyticsReviewStateCopy(status)
      assert.equal(reviewCopyLeaksEnvironment(copy.title), false)
      assert.equal(reviewCopyLeaksEnvironment(copy.body), false)
      assert.doesNotMatch(copy.body, /eyJ/)
      assert.doesNotMatch(copy.body, /KEY=|SECRET=|TOKEN=/)
    }

    const missing = resolveKfzAnalyticsDataQualityState({
      loadStatus: 'configuration_missing',
    })
    assert.equal(missing.available, false)
    assert.equal(missing.status, 'configuration_missing')
    const unavailableQuality = resolveKfzAnalyticsDataQualityState({
      loadStatus: 'unavailable',
    })
    assert.deepEqual(unavailableQuality, unavailableKfzAnalyticsDataQuality('unavailable'))
    for (const quality of [missing, unavailableQuality]) {
      const copy = kfzAnalyticsQualityStateCopy(quality)
      assert.equal(reviewCopyLeaksEnvironment(copy.title), false)
      assert.equal(reviewCopyLeaksEnvironment(copy.body), false)
      assert.match(copy.title, /nicht verfügbar/)
    }
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
    assert.equal(dashboard.ratesHidden, true)
    assert.equal(dashboard.conversionRate, null)
    assert.equal(dashboard.matchedSessions < KFZ_ANALYTICS_MIN_RATE_GROUP, true)
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
    assert.ok(dashboard.siteAverageActiveMs != null)
    assert.ok(dashboard.siteMedianActiveMs != null)
    assert.ok(dashboard.referrerCategories.some((row) => row.id === 'search' && row.count === 1))
    assert.ok(dashboard.referrerCategories.some((row) => row.id === 'social' && row.count === 1))
    assert.ok(dashboard.referrerCategories.some((row) => row.id === 'direct' && row.count === 2))
    assert.ok(
      dashboard.transitions.some((row) => row.id === 'branch->contact' && row.count === 2),
    )
    assert.ok(
      dashboard.transitions.some((row) => row.id === 'contact->documents' && row.count === 1),
    )
    assert.ok(
      dashboard.transitions.some((row) => row.id === 'vehicle->registration' && row.count === 1),
    )

    const empty = aggregateKfzAnalyticsDashboard([], {
      periodId: '24h',
      nowMs: Date.parse('2026-09-09T12:00:00.000Z'),
    })
    assert.equal(empty.empty, true)
    assert.equal(empty.visits, 0)
    assert.equal(empty.conversionRate, null)
    assert.equal(empty.startRate, null)
    assert.equal(empty.submitFromStartRate, null)
    assert.equal(empty.ratesHidden, true)
    assert.equal(empty.sourceComparisons.length, 0)
    assert.equal(empty.referrerComparisons.length, 0)
    assert.equal(empty.branchComparisons.length, 0)
    assert.equal(empty.periodComparison.current.visits, 0)
    assert.equal(empty.periodComparison.current.conversionRate, null)
    assert.equal(empty.steps.length, 0)
    assert.equal(empty.dropOffs.length, 0)
    assert.equal(empty.transitions.length, 0)
    assert.equal(empty.referrerCategories.length, 0)
    assert.equal(empty.siteAverageActiveMs, null)
    assert.equal(empty.filterActive, false)
    assert.equal(empty.matchedSessions, 0)
    assert.equal(empty.dataQuality.status, 'empty')
    assert.equal(empty.dataQuality.available, true)
    assert.equal(empty.dataQuality.duplicateEvents, 0)
    assert.equal(empty.dataQuality.invalidTransitions, 0)
    assert.equal(empty.dataQuality.rejectedTimings, 0)
    assert.equal(empty.dataQuality.incompleteSessions, 0)
    assert.equal(dashboard.dataQuality.status, 'ready')
    assert.equal(dashboard.dataQuality.duplicateEvents, 0)
    assert.equal(dashboard.dataQuality.invalidTransitions, 0)
    assert.equal(dashboard.dataQuality.rejectedTimings, 0)
    assert.equal(dashboard.dataQuality.malformedSourceCategories, 0)
    assert.equal(dashboard.dataQuality.incompleteSessions, 0)

    assert.equal(dashboard.startRate, null)
    assert.equal(dashboard.submitFromStartRate, null)
    assert.ok(dashboard.dropOffs.some((row) => row.id === 'usage' && row.count === 1))
    assert.ok(dashboard.dropOffs.some((row) => row.id === 'branch' && row.count === 1))
  })

  it('does not leak fixture personal data into dashboard rows', () => {
    const dashboard = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_ALL, {
      periodId: 'all',
      nowMs: Date.parse('2026-09-09T12:00:00.000Z'),
    })
    const serialized = JSON.stringify(dashboard)
    assert.doesNotMatch(serialized, /Mustermann|@|OS-AB|Golf|user-agent|filename/i)
    assert.doesNotMatch(serialized, /SF-Klasse|Selbstbeteiligung|1\.000 €|sf_class_haftpflicht/)
    assert.ok(KFZ_ANALYTICS_FIXTURE_SESSION_A.startsWith('aaaaaaaa'))
  })
})

describe('kfz analytics dashboard filters', () => {
  const nowMs = Date.parse('2026-09-09T12:00:00.000Z')

  it('filters an explicit calendar date range and ignores events outside it', () => {
    const events = [...KFZ_ANALYTICS_FIXTURE_ALL, ...KFZ_ANALYTICS_FIXTURE_OTHER_DAY]
    const day = aggregateKfzAnalyticsDashboard(events, {
      nowMs,
      query: { from: '2026-09-09', to: '2026-09-09' },
    })
    assert.equal(day.periodId, 'custom')
    assert.equal(day.visits, 4)
    assert.equal(day.filters.fromDate, '2026-09-09')
    assert.equal(day.filters.toDate, '2026-09-09')
    assert.equal(
      day.trafficSources.some((row) => row.id === 'campaign'),
      false,
    )

    const other = aggregateKfzAnalyticsDashboard(events, {
      nowMs,
      query: { from: '2026-08-01', to: '2026-08-01' },
    })
    assert.equal(other.visits, 1)
    assert.equal(other.funnelStarts, 1)
    assert.equal(other.submissions, 1)
    assert.ok(other.trafficSources.some((row) => row.id === 'campaign' && row.count === 1))
    assert.ok(other.branches.some((row) => row.id === 'evb' && row.count === 1))
  })

  it('clamps oversized ranges and rejects invalid dates without inventing a window', () => {
    assert.equal(parseKfzAnalyticsCalendarDate('2026-02-31'), null)
    assert.equal(parseKfzAnalyticsCalendarDate('09-09-2026'), null)
    assert.equal(KFZ_ANALYTICS_MAX_RANGE_DAYS, 31)

    const clamped = resolveKfzAnalyticsDashboardFilters(
      { from: '2026-08-01', to: '2026-09-09' },
      nowMs,
    )
    assert.equal(clamped.filters.periodId, 'custom')
    assert.equal(clamped.filters.fromDate, '2026-08-01')
    assert.equal(clamped.filters.toDate, '2026-08-31')

    const swapped = resolveKfzAnalyticsDashboardFilters(
      { from: '2026-09-09', to: '2026-09-01' },
      nowMs,
    )
    assert.equal(swapped.filters.fromDate, '2026-09-01')
    assert.equal(swapped.filters.toDate, '2026-09-09')

    const invalid = resolveKfzAnalyticsDashboardFilters(
      { from: 'not-a-date', to: '2026-02-31', period: '7d' },
      nowMs,
    )
    assert.equal(invalid.filters.periodId, '7d')
    assert.equal(invalid.filters.fromDate, null)
    assert.ok(invalid.from)
  })

  it('filters by allowed traffic source, initial branch, reached step and drop-off', () => {
    const utm = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_ALL, {
      periodId: 'all',
      nowMs,
      query: { source: 'utm' },
    })
    assert.equal(utm.filterActive, true)
    assert.equal(utm.visits, 2)
    assert.equal(utm.funnelStarts, 2)
    assert.equal(utm.submissions, 2)
    assert.equal(utm.abandoned, 0)
    assert.equal(utm.ratesHidden, true)
    assert.equal(utm.conversionRate, null)
    assert.equal(utm.trafficSources.every((row) => row.id === 'utm'), true)
    assert.equal(utm.sourceComparisons.every((row) => row.ratesHidden), true)

    const switchCar = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_ALL, {
      periodId: 'all',
      nowMs,
      query: { branch: 'switch_car' },
    })
    assert.equal(switchCar.visits, 1)
    assert.equal(switchCar.funnelStarts, 1)
    assert.equal(switchCar.submissions, 0)
    assert.equal(switchCar.abandoned, 1)
    assert.ok(switchCar.branches.every((row) => row.id === 'switch_car'))

    const usage = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_ALL, {
      periodId: 'all',
      nowMs,
      query: { step: 'usage' },
    })
    assert.equal(usage.matchedSessions, 1)
    assert.equal(usage.visits, 1)
    assert.equal(usage.submissions, 0)
    const usageStep = usage.steps.find((step) => step.stepId === 'usage')
    assert.ok(usageStep)
    assert.equal(usageStep.reached, 1)
    assert.equal(usageStep.dropOff, 1)

    const dropUsage = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_ALL, {
      periodId: 'all',
      nowMs,
      query: { drop: 'usage' },
    })
    assert.equal(dropUsage.abandoned, 1)
    assert.equal(dropUsage.submissions, 0)
    assert.ok(dropUsage.dropOffs.every((row) => row.id === 'usage'))
  })

  it('keeps unknown source, branch and drop-off honest instead of inventing attribution', () => {
    const dashboard = aggregateKfzAnalyticsDashboard(
      [...KFZ_ANALYTICS_FIXTURE_ALL, ...KFZ_ANALYTICS_FIXTURE_UNKNOWN],
      { periodId: 'all', nowMs },
    )
    assert.equal(dashboard.visits, 5)
    assert.equal(dashboard.funnelStarts, 4)
    assert.ok(dashboard.trafficSources.some((row) => row.id === 'unknown' && row.count === 1))
    assert.ok(dashboard.trafficSources.every((row) => row.id !== 'direct' || row.count === 2))
    assert.ok(dashboard.branches.some((row) => row.id === 'unknown' && row.count === 1))
    assert.ok(dashboard.dropOffs.some((row) => row.id === 'unknown' && row.count === 1))
    assert.equal(dashboard.dataQuality.missingSessionMetadata, 1)

    const unknownSource = aggregateKfzAnalyticsDashboard(
      [...KFZ_ANALYTICS_FIXTURE_ALL, ...KFZ_ANALYTICS_FIXTURE_UNKNOWN],
      { periodId: 'all', nowMs, query: { source: 'unknown' } },
    )
    assert.equal(unknownSource.visits, 1)
    assert.equal(unknownSource.funnelStarts, 1)
    assert.equal(unknownSource.submissions, 0)
    assert.equal(unknownSource.abandoned, 1)

    const unknownDrop = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_UNKNOWN, {
      periodId: 'all',
      nowMs,
      query: { drop: 'unknown' },
    })
    assert.equal(unknownDrop.matchedSessions, 1)
    assert.equal(unknownDrop.dropOffs[0]?.id, 'unknown')
  })

  it('does not invent matches for empty filters or unsafe query values', () => {
    const emptyMatch = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_ALL, {
      periodId: 'all',
      nowMs,
      query: { source: 'utm', branch: 'first_car' },
    })
    assert.equal(emptyMatch.empty, true)
    assert.equal(emptyMatch.filterActive, true)
    assert.equal(emptyMatch.visits, 0)
    assert.equal(emptyMatch.funnelStarts, 0)
    assert.equal(emptyMatch.submissions, 0)
    assert.equal(emptyMatch.conversionRate, null)
    assert.equal(emptyMatch.matchedSessions, 0)

    const unsafe = resolveKfzAnalyticsDashboardFilters(
      {
        source: 'https://evil.example/?email=max@example.com',
        branch: 'Mustermann',
        step: 'sf_class_haftpflicht',
        drop: 'OS-AB 123',
        from: 'javascript:alert(1)',
      },
      nowMs,
    )
    assert.equal(unsafe.filters.trafficSource, 'all')
    assert.equal(unsafe.filters.branchId, 'all')
    assert.equal(unsafe.filters.reachedStepId, 'all')
    assert.equal(unsafe.filters.dropOffStepId, 'all')
    assert.equal(unsafe.filters.fromDate, null)
  })

  it('describes explicit UTC calendar ranges without inventing a window', () => {
    const resolved = resolveKfzAnalyticsDashboardFilters(
      { from: '2026-09-09', to: '2026-09-09' },
      nowMs,
    )
    assert.equal(
      describeKfzAnalyticsTimeRange(resolved.filters, resolved),
      'Kalendertage UTC 9.9.2026 – 9.9.2026',
    )
    const all = resolveKfzAnalyticsDashboardFilters({ period: 'all' }, nowMs)
    assert.match(describeKfzAnalyticsTimeRange(all.filters, all), /Kein Kalenderlimit/)
  })

  it('builds shareable filter URLs without duplicating preset dates', () => {
    const href = buildKfzAnalyticsDashboardHref({
      periodId: '30d',
      fromDate: null,
      toDate: null,
      trafficSource: 'direct',
      branchId: 'evb',
      reachedStepId: 'contact',
      dropOffStepId: 'all',
    })
    assert.equal(
      href,
      '/app/kfz-analytics?period=30d&source=direct&branch=evb&step=contact',
    )

    const custom = buildKfzAnalyticsDashboardHref({
      periodId: 'custom',
      fromDate: '2026-09-01',
      toDate: '2026-09-09',
      trafficSource: 'all',
      branchId: 'all',
      reachedStepId: 'all',
      dropOffStepId: 'unknown',
    })
    assert.equal(
      custom,
      '/app/kfz-analytics?from=2026-09-01&to=2026-09-09&drop=unknown',
    )
  })

  it('does not leak form answers or PII through filtered aggregation', () => {
    const dashboard = aggregateKfzAnalyticsDashboard(
      [...KFZ_ANALYTICS_FIXTURE_ALL, ...KFZ_ANALYTICS_FIXTURE_UNKNOWN],
      {
        periodId: 'all',
        nowMs,
        query: { source: 'unknown', branch: 'unknown' },
      },
    )
    const serialized = JSON.stringify(dashboard)
    assert.doesNotMatch(serialized, /Mustermann|max@example.com|\+49170|OS-AB|schein\.pdf|Golf/i)
    assert.doesNotMatch(serialized, /sf_class|Selbstbeteiligung|1\.000 €/)
    assert.doesNotMatch(serialized, /user-agent|https?:\/\//i)
    assert.equal(dashboard.visits, 1)
  })

  it('does not inflate filtered counts when the same events are stored twice', async () => {
    const store = createMemoryKfzAnalyticsStore()
    await ingestKfzAnalyticsEvents({
      consent: 'granted',
      events: KFZ_ANALYTICS_FIXTURE_ALL,
      store,
    })
    await ingestKfzAnalyticsEvents({
      consent: 'granted',
      events: KFZ_ANALYTICS_FIXTURE_ALL,
      store,
    })
    const dashboard = aggregateKfzAnalyticsDashboard(await store.listEvents(), {
      periodId: 'all',
      nowMs,
      query: { source: 'direct', step: 'branch' },
    })
    assert.equal(dashboard.visits, 2)
    assert.equal(dashboard.funnelStarts, 1)
    assert.equal(dashboard.submissions, 0)
    assert.equal(dashboard.abandoned, 2)
  })
})

describe('kfz analytics aggregate comparisons', () => {
  const nowMs = Date.parse('2026-09-09T12:00:00.000Z')

  it('resolves deterministic period presets and previous-window date boundaries', () => {
    assert.equal(KFZ_ANALYTICS_MIN_RATE_GROUP, 5)

    const rolling = resolveKfzAnalyticsDashboardFilters({ period: '7d' }, nowMs)
    assert.equal(rolling.filters.periodId, '7d')
    assert.equal(rolling.from, '2026-09-02T12:00:00.000Z')
    assert.equal(rolling.to, '2026-09-09T12:00:00.000Z')

    const previous = resolveKfzAnalyticsPreviousRange(rolling.filters, rolling)
    assert.ok(previous)
    assert.equal(previous.from, '2026-08-26T12:00:00.000Z')
    assert.equal(previous.to, '2026-09-02T11:59:59.999Z')

    const custom = resolveKfzAnalyticsDashboardFilters(
      { from: '2026-09-09', to: '2026-09-09' },
      nowMs,
    )
    const customPrevious = resolveKfzAnalyticsPreviousRange(custom.filters, custom)
    assert.ok(customPrevious)
    assert.equal(customPrevious.from, '2026-09-08T00:00:00.000Z')
    assert.equal(customPrevious.to, '2026-09-08T23:59:59.999Z')

    const all = resolveKfzAnalyticsDashboardFilters({ period: 'all' }, nowMs)
    assert.equal(resolveKfzAnalyticsPreviousRange(all.filters, all), null)
  })

  it('compares source, referrer and branch aggregates with honest small groups', () => {
    const dashboard = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_COMPARISON, {
      periodId: 'all',
      nowMs,
    })

    assert.equal(dashboard.visits, 12)
    assert.equal(dashboard.funnelStarts, 11)
    assert.equal(dashboard.submissions, 6)
    assert.equal(dashboard.ratesHidden, false)
    assert.ok(dashboard.conversionRate != null)
    assert.equal(Number(dashboard.conversionRate.toFixed(2)), 0.5)
    assert.ok(dashboard.startRate != null)
    assert.equal(dashboard.startRate, 11 / 12)
    assert.ok(dashboard.submitFromStartRate != null)
    assert.equal(dashboard.submitFromStartRate, 6 / 11)

    const utm = dashboard.sourceComparisons.find((row) => row.id === 'utm')
    assert.ok(utm)
    assert.equal(utm.visits, 6)
    assert.equal(utm.funnelStarts, 6)
    assert.equal(utm.submissions, 6)
    assert.equal(utm.ratesHidden, false)
    assert.equal(utm.conversionRate, 1)
    assert.equal(utm.topReachedStepId, 'documents')
    assert.ok((utm.transitionCount ?? 0) > 0)

    const direct = dashboard.sourceComparisons.find((row) => row.id === 'direct')
    assert.ok(direct)
    assert.equal(direct.visits, 6)
    assert.equal(direct.submissions, 0)
    assert.equal(direct.conversionRate, 0)
    assert.equal(direct.dropOffRate, 1)
    assert.equal(direct.topDropOffStepId, 'usage')

    const evb = dashboard.branchComparisons.find((row) => row.id === 'evb')
    assert.ok(evb)
    assert.equal(evb.sessions, 1)
    assert.equal(evb.visits, 1)
    assert.equal(evb.submissions, 1)
    assert.equal(evb.ratesHidden, true)
    assert.equal(evb.conversionRate, null)
    assert.equal(evb.dropOffRate, null)
    assert.equal(evb.topReachedStepId, null)
    assert.equal(evb.topDropOffStepId, null)
    assert.equal(evb.transitionCount, null)
    assert.equal(evb.averageActiveMs, null)

    const social = dashboard.referrerComparisons.find((row) => row.id === 'social')
    assert.ok(social)
    assert.equal(social.sessions, 1)
    assert.equal(social.ratesHidden, true)
    assert.equal(social.conversionRate, null)

    const search = dashboard.referrerComparisons.find((row) => row.id === 'search')
    assert.ok(search)
    assert.equal(search.visits, 5)
    assert.equal(search.ratesHidden, false)
    assert.equal(search.conversionRate, 1)

    const switchCar = dashboard.branchComparisons.find((row) => row.id === 'switch_car')
    assert.ok(switchCar)
    assert.equal(switchCar.visits, 5)
    assert.equal(switchCar.submissions, 0)
    assert.equal(switchCar.conversionRate, 0)
    assert.equal(switchCar.topDropOffStepId, 'usage')

    const emptyGroup = dashboard.branchComparisons.find((row) => row.id === 'additional_car')
    assert.equal(emptyGroup, undefined)
  })

  it('keeps empty and filtered small groups honest and does not invent matches', () => {
    const empty = aggregateKfzAnalyticsDashboard([], {
      periodId: 'all',
      nowMs,
    })
    assert.equal(empty.periodComparison.available, false)
    assert.equal(empty.periodComparison.previous, null)
    assert.equal(empty.sourceComparisons.length, 0)
    assert.equal(empty.conversionRate, null)

    const filtered = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_COMPARISON, {
      periodId: 'all',
      nowMs,
      query: { branch: 'evb' },
    })
    assert.equal(filtered.matchedSessions, 1)
    assert.equal(filtered.visits, 1)
    assert.equal(filtered.submissions, 1)
    assert.equal(filtered.ratesHidden, true)
    assert.equal(filtered.conversionRate, null)
    assert.equal(filtered.branchComparisons.length, 1)
    assert.equal(filtered.branchComparisons[0]?.id, 'evb')
    assert.equal(filtered.branchComparisons[0]?.ratesHidden, true)
    assert.equal(filtered.steps.every((step) => step.dropOffRate == null || step.reached >= 5), true)

    const none = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_COMPARISON, {
      periodId: 'all',
      nowMs,
      query: { source: 'campaign', branch: 'first_car' },
    })
    assert.equal(none.empty, true)
    assert.equal(none.sourceComparisons.length, 0)
    assert.equal(none.branchComparisons.length, 0)
    assert.equal(none.conversionRate, null)
  })

  it('compares the previous period without overlapping the current window', () => {
    const events = [...KFZ_ANALYTICS_FIXTURE_ALL, ...KFZ_ANALYTICS_FIXTURE_PREVIOUS_WINDOW]
    const dashboard = aggregateKfzAnalyticsDashboard(events, {
      periodId: '7d',
      nowMs,
    })

    assert.equal(dashboard.visits, 4)
    assert.equal(dashboard.periodComparison.available, true)
    assert.equal(dashboard.periodComparison.previousFrom, '2026-08-26T12:00:00.000Z')
    assert.equal(dashboard.periodComparison.previousTo, '2026-09-02T11:59:59.999Z')
    assert.equal(dashboard.periodComparison.current.visits, 4)
    assert.equal(dashboard.periodComparison.current.ratesHidden, true)
    assert.equal(dashboard.periodComparison.current.conversionRate, null)
    assert.ok(dashboard.periodComparison.previous)
    assert.equal(dashboard.periodComparison.previous.visits, 1)
    assert.equal(dashboard.periodComparison.previous.funnelStarts, 1)
    assert.equal(dashboard.periodComparison.previous.submissions, 1)
    assert.equal(dashboard.periodComparison.previous.ratesHidden, true)
    assert.equal(dashboard.periodComparison.previous.conversionRate, null)
    assert.equal(dashboard.periodComparison.previous.topReachedStepId, null)

    const otherDay = aggregateKfzAnalyticsDashboard(
      [...events, ...KFZ_ANALYTICS_FIXTURE_OTHER_DAY],
      { periodId: '7d', nowMs },
    )
    assert.equal(otherDay.visits, 4)
    assert.equal(otherDay.periodComparison.previous?.visits, 1)
  })

  it('redacts forbidden fields from comparison aggregates', () => {
    const dashboard = aggregateKfzAnalyticsDashboard(
      [...KFZ_ANALYTICS_FIXTURE_COMPARISON, ...KFZ_ANALYTICS_FIXTURE_UNKNOWN],
      { periodId: 'all', nowMs },
    )
    const serialized = JSON.stringify({
      sourceComparisons: dashboard.sourceComparisons,
      referrerComparisons: dashboard.referrerComparisons,
      branchComparisons: dashboard.branchComparisons,
      periodComparison: dashboard.periodComparison,
    })
    assert.doesNotMatch(serialized, /Mustermann|max@example.com|\+49170|OS-AB|schein\.pdf|Golf/i)
    assert.doesNotMatch(serialized, /sf_class|Selbstbeteiligung|1\.000 €/)
    assert.doesNotMatch(serialized, /user-agent|https?:\/\/|filename|objectKey|freeText/i)
    assert.doesNotMatch(serialized, /sessionId|aaaaaaaa-aaaa/)
    assert.ok(dashboard.sourceComparisons.every((row) => !('sessionId' in row)))
  })
})

describe('kfz analytics quality guardrails', () => {
  const nowMs = Date.parse('2026-09-09T12:00:00.000Z')

  it('rejects impossible transitions and does not count them in aggregates', () => {
    assert.equal(isKfzAnalyticsForwardTransitionAllowed('documents', 'branch'), false)
    assert.equal(isKfzAnalyticsForwardTransitionAllowed('branch', 'documents'), false)
    assert.equal(isKfzAnalyticsForwardTransitionAllowed('contact', 'intent'), false)
    assert.equal(isKfzAnalyticsForwardTransitionAllowed('branch', 'contact'), true)
    assert.equal(isKfzAnalyticsForwardTransitionAllowed('contact', 'documents'), true)

    const storage = createMemoryKfzAnalyticsConsentStorage()
    const controller = createKfzAnalyticsController({
      storage,
      randomUuid: () => SESSION,
    })
    controller.setConsent('granted')
    controller.recordStepView('documents')
    const jump = controller.recordStepView('branch')
    assert.equal(jump[0]?.properties.fromStepId, undefined)

    const dashboard = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_QUALITY_DIRTY, {
      periodId: 'all',
      nowMs,
    })
    assert.equal(dashboard.transitions.length, 0)
    assert.equal(dashboard.dataQuality.invalidTransitions, 3)
    assert.equal(
      dashboard.transitions.some((row) => row.id === 'documents->branch'),
      false,
    )
  })

  it('ignores negative and extreme timings so averages stay honest', async () => {
    const rejected = sanitizeKfzAnalyticsRecord(
      {
        eventName: 'landing_view',
        sessionId: SESSION,
        occurredAt: '2026-09-09T08:00:00.000Z',
        properties: { activeMs: -25 },
      },
      '2026-09-09T08:00:00.000Z',
    )
    assert.ok(rejected)
    assert.equal(rejected.properties.activeMs, undefined)

    const extreme = sanitizeKfzAnalyticsRecord(
      {
        eventName: 'step_view',
        sessionId: SESSION,
        occurredAt: '2026-09-09T08:00:00.000Z',
        properties: { stepId: 'branch', activeMs: 99_999_999_999 },
      },
      '2026-09-09T08:00:00.000Z',
    )
    assert.ok(extreme)
    assert.equal(extreme.properties.activeMs, undefined)

    const store = createMemoryKfzAnalyticsStore()
    const ingested = await ingestKfzAnalyticsEvents({
      consent: 'granted',
      events: [
        {
          eventName: 'landing_view',
          sessionId: SESSION,
          occurredAt: '2026-09-09T11:50:00.000Z',
          properties: { activeMs: -12 },
        },
        {
          eventName: 'step_view',
          sessionId: SESSION,
          occurredAt: '2026-09-09T11:50:00.000Z',
          properties: { stepId: 'branch', activeMs: 86_400_000 + 1 },
        },
      ],
      store,
    })
    assert.equal(ingested.quality.rejectedTimings, 2)
    assert.equal(ingested.accepted, 2)
    const stored = await store.listEvents()
    assert.equal(stored.every((event) => event.properties.activeMs == null), true)

    const dashboard = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_QUALITY_DIRTY, {
      periodId: 'all',
      nowMs,
    })
    assert.equal(dashboard.dataQuality.rejectedTimings, 2)
    assert.equal(dashboard.landingAverageActiveMs, null)
    assert.equal(dashboard.siteAverageActiveMs, null)
  })

  it('deduplicates submissions and counts ignored duplicates in ingest quality', async () => {
    const store = createMemoryKfzAnalyticsStore()
    const payload = {
      eventName: 'submit_succeeded',
      sessionId: SESSION,
      occurredAt: '2026-09-09T08:00:00.000Z',
      properties: { activeMs: 4_000 },
    }
    const first = await ingestKfzAnalyticsEvents({
      consent: 'granted',
      events: [payload],
      store,
    })
    const second = await ingestKfzAnalyticsEvents({
      consent: 'granted',
      events: [payload, payload],
      store,
    })
    assert.equal(first.accepted, 1)
    assert.equal(second.accepted, 0)
    assert.equal(second.quality.duplicates, 2)
    const stored = await store.listEvents()
    assert.equal(stored.filter((event) => event.eventName === 'submit_succeeded').length, 1)
  })

  it('drops missing session metadata and malformed source categories without inventing them', async () => {
    const store = createMemoryKfzAnalyticsStore()
    const ingested = await ingestKfzAnalyticsEvents({
      consent: 'granted',
      events: [
        {
          eventName: 'step_view',
          sessionId: 'not-a-session',
          properties: {
            stepId: 'branch',
            trafficSource: 'https://evil.example/?email=a@b.c',
            referrerCategory: 'google.com/search?q=max',
            referrer: 'https://google.com/search?q=Max+Mustermann',
          },
        },
        {
          eventName: 'step_view',
          properties: { stepId: 'contact' },
        },
        {
          eventName: 'traffic_source',
          sessionId: SESSION,
          occurredAt: '2026-09-09T08:00:00.000Z',
          properties: {
            trafficSource: 'paid-click-id',
            referrerCategory: 'https://evil.example',
          },
        },
      ],
      store,
    })
    assert.equal(ingested.accepted, 1)
    assert.equal(ingested.quality.missingSessionMetadata, 3)
    assert.equal(ingested.quality.malformedSourceCategories, 2)
    const stored = await store.listEvents()
    assert.equal(stored.length, 1)
    assert.equal(stored[0]?.eventName, 'traffic_source')
    assert.equal(stored[0]?.properties.trafficSource, undefined)
    assert.equal(stored[0]?.properties.referrerCategory, undefined)
    const serialized = JSON.stringify(stored)
    assert.equal(serialized.includes('evil.example'), false)
    assert.equal(serialized.includes('Mustermann'), false)
    assert.equal(serialized.includes('paid-click'), false)
  })

  it('redacts forbidden fields during ingest and keeps a metadata-only quality summary', async () => {
    const store = createMemoryKfzAnalyticsStore()
    const ingested = await ingestKfzAnalyticsEvents({
      consent: 'granted',
      events: [
        {
          eventName: 'submit_succeeded',
          sessionId: SESSION,
          occurredAt: '2026-09-09T08:00:00.000Z',
          properties: {
            stepId: 'documents',
            fullName: 'Erika Musterfrau',
            email: 'erika@example.com',
            phone: '+491701119988',
            answers: { coverage: 'full', deductible_full: '1000' },
            filename: 'brief.pdf',
            objectKey: 'kfz/agency/item/brief.pdf',
            freeText: 'Bitte anrufen',
            url: 'https://kfz.artkus.de/kfz?email=erika@example.com',
            secret: 'super-secret-token',
          },
        },
      ],
      store,
    })
    assert.equal(ingested.accepted, 1)
    assert.ok(ingested.quality.redactedForbiddenFields >= 8)
    const stored = await store.listEvents()
    assert.deepEqual(assertNoKfzAnalyticsPii(stored[0]!), [])
    const serialized = JSON.stringify({ stored, quality: ingested.quality })
    for (const leak of [
      'Musterfrau',
      'erika@example.com',
      '+491701119988',
      'brief.pdf',
      'Bitte anrufen',
      'super-secret-token',
      'kfz/agency/item',
    ]) {
      assert.equal(serialized.includes(leak), false, `leaked ${leak}`)
    }

    const dashboard = aggregateKfzAnalyticsDashboard(KFZ_ANALYTICS_FIXTURE_QUALITY_DIRTY, {
      periodId: 'all',
      nowMs,
    })
    assert.equal(dashboard.dataQuality.available, true)
    assert.equal(dashboard.dataQuality.duplicateEvents, 1)
    assert.equal(dashboard.dataQuality.incompleteSessions, 2)
    assert.equal(dashboard.dataQuality.missingSessionMetadata, 1)
    assert.equal(dashboard.dataQuality.malformedSourceCategories, 1)
    assert.equal(dashboard.visits, 1)
    const qualitySerialized = JSON.stringify(dashboard.dataQuality)
    assert.doesNotMatch(qualitySerialized, /Mustermann|@|filename|https?:\/\//i)
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
      'features/inbound/kfz/components/kfz-analytics-preview-app.tsx',
      'features/inbound/kfz/components/kfz-analytics-dashboard-filters.tsx',
      'features/inbound/kfz/lib/kfz-analytics-filters.ts',
      'features/inbound/kfz/lib/kfz-analytics-referrer.ts',
      'features/inbound/kfz/lib/kfz-analytics-review-state.ts',
      'features/inbound/kfz/lib/kfz-analytics-quality.ts',
      'features/inbound/kfz/lib/kfz-analytics-compare.ts',
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
    assert.match(source, /configuration_missing/)
    assert.match(source, /data-kfz-analytics-transitions/)
    assert.match(source, /data-kfz-analytics-state/)
    assert.match(source, /data-kfz-analytics-quality/)
    assert.match(source, /data-kfz-analytics-comparisons/)
    assert.match(source, /data-kfz-analytics-consent-withdraw/)
    assert.match(source, /Referrer-Kategorie/)
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
