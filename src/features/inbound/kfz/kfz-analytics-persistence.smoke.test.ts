/**
 * Privacy-safe Kfz analytics persistence: allow-list, redaction, retry, RLS.
 * Synthetic data only. Does not connect to Production.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import { ingestKfzAnalyticsEvents } from '@/features/inbound/kfz/lib/kfz-analytics-ingest'
import {
  evaluateKfzAnalyticsPersistencePayload,
  isKfzAnalyticsDuplicateKeyError,
  KFZ_ANALYTICS_DERIVED_REVIEW_FIELDS,
  KFZ_ANALYTICS_FORBIDDEN_PROPERTY_EXAMPLES,
  KFZ_ANALYTICS_PERSISTENCE_CONTRACT_MIGRATION,
  KFZ_ANALYTICS_PERSISTENCE_TABLE,
  KFZ_ANALYTICS_RLS_CONTRACT,
  KFZ_ANALYTICS_UNIQUE_EVENT_INDEX,
  kfzAnalyticsPropertiesPassPersistenceAllowlist,
  kfzAnalyticsRecordPassesPersistenceContract,
} from '@/features/inbound/kfz/lib/kfz-analytics-persistence-contract'
import { KFZ_ANALYTICS_FORBIDDEN_PROPERTY_EXAMPLES as REDACT_FORBIDDEN } from '@/features/inbound/kfz/lib/kfz-analytics-redact'
import { createMemoryKfzAnalyticsStore } from '@/features/inbound/kfz/repositories/kfz-analytics-store'
import { KFZ_ANALYTICS_PROPERTY_KEYS } from '@/features/inbound/kfz/types/kfz-analytics'

const SESSION = '11111111-1111-4111-8111-111111111111'
const NOW = '2026-09-11T08:00:00.000Z'

describe('kfz analytics persistence allow-list', () => {
  it('accepts only approved aggregate metadata before persist', () => {
    const accepted = evaluateKfzAnalyticsPersistencePayload({
      consent: 'granted',
      nowIso: NOW,
      record: {
        eventName: 'traffic_source',
        sessionId: SESSION,
        occurredAt: NOW,
        properties: {
          trafficSource: 'utm',
          referrerCategory: 'search',
          utmSource: 'google',
          utmCampaign: 'kfz-check',
          branchId: 'switch_car',
          stepId: 'contact',
          fromStepId: 'branch',
          lastStepId: 'contact',
          activeMs: 1800,
          fieldId: 'missing_contact',
          errorCategory: 'timeout',
        },
      },
    })
    assert.equal(accepted.ok, true)
    if (!accepted.ok) {
      return
    }
    assert.equal(kfzAnalyticsRecordPassesPersistenceContract(accepted.record), true)
    for (const key of Object.keys(accepted.record.properties)) {
      assert.ok((KFZ_ANALYTICS_PROPERTY_KEYS as readonly string[]).includes(key))
    }

    const blocked = evaluateKfzAnalyticsPersistencePayload({
      consent: 'declined',
      nowIso: NOW,
      record: {
        eventName: 'landing_view',
        sessionId: SESSION,
        occurredAt: NOW,
        properties: {},
      },
    })
    assert.deepEqual(blocked, { ok: false, reason: 'consent_blocked' })
  })

  it('rejects unknown events and dirty property bags at the SQL-equivalent allow-list', () => {
    assert.equal(
      evaluateKfzAnalyticsPersistencePayload({
        consent: 'granted',
        nowIso: NOW,
        record: {
          eventName: 'custom_tracker',
          sessionId: SESSION,
          properties: { stepId: 'contact' },
        },
      }).ok,
      false,
    )
    assert.equal(
      kfzAnalyticsPropertiesPassPersistenceAllowlist({
        stepId: 'contact',
        answers: { intent: 'switch_car' },
      }),
      false,
    )
    assert.equal(
      kfzAnalyticsPropertiesPassPersistenceAllowlist({
        trafficSource: 'https://google.com/search?q=max@example.com',
      }),
      false,
    )
    assert.equal(
      kfzAnalyticsPropertiesPassPersistenceAllowlist({
        activeMs: 99_000_000,
      }),
      false,
    )
    assert.equal(
      kfzAnalyticsPropertiesPassPersistenceAllowlist({
        branchId: 'unknown_branch',
      }),
      false,
    )
  })
})

describe('kfz analytics persistence redaction', () => {
  it('discards names, contacts, answers, files, URLs and secrets before persist', async () => {
    const store = createMemoryKfzAnalyticsStore()
    const ingested = await ingestKfzAnalyticsEvents({
      consent: 'granted',
      nowIso: NOW,
      store,
      events: [
        {
          eventName: 'submit_succeeded',
          sessionId: SESSION,
          occurredAt: NOW,
          properties: {
            stepId: 'documents',
            lastStepId: 'documents',
            activeMs: 3200,
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
      ],
    })

    assert.equal(ingested.accepted, 1)
    assert.ok(ingested.quality.redactedForbiddenFields >= REDACT_FORBIDDEN.length)
    const stored = ingested.records[0]
    assert.ok(stored)
    assert.equal(kfzAnalyticsRecordPassesPersistenceContract(stored), true)
    assert.deepEqual(stored.properties, {
      stepId: 'documents',
      lastStepId: 'documents',
      activeMs: 3200,
    })
    const serialized = JSON.stringify(await store.listEvents())
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
      'super-secret',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'Mozilla',
      '203.0.113.10',
      'OS-AB',
    ]) {
      assert.equal(serialized.includes(leak), false, `leaked ${leak}`)
    }
    assert.deepEqual(
      [...REDACT_FORBIDDEN],
      [...KFZ_ANALYTICS_FORBIDDEN_PROPERTY_EXAMPLES],
    )
  })
})

describe('kfz analytics persistence retry', () => {
  it('treats the same event_key as an idempotent retry instead of a second row', async () => {
    const store = createMemoryKfzAnalyticsStore()
    const payload = {
      eventName: 'landing_view' as const,
      sessionId: SESSION,
      occurredAt: NOW,
      properties: { activeMs: 900 },
    }
    const first = await ingestKfzAnalyticsEvents({
      consent: 'granted',
      events: [payload],
      store,
      nowIso: NOW,
    })
    const retry = await ingestKfzAnalyticsEvents({
      consent: 'granted',
      events: [
        { ...payload, properties: { activeMs: 1400 } },
        { ...payload, properties: { activeMs: 1400 } },
      ],
      store,
      nowIso: NOW,
    })

    assert.equal(first.accepted, 1)
    assert.equal(retry.accepted, 0)
    assert.equal(retry.quality.duplicates, 2)
    const stored = await store.listEvents()
    assert.equal(stored.length, 1)
    assert.equal(stored[0]?.properties.activeMs, 1400)
    assert.equal(
      isKfzAnalyticsDuplicateKeyError({
        code: '23505',
        message: `duplicate key value violates unique constraint "${KFZ_ANALYTICS_UNIQUE_EVENT_INDEX}"`,
      }),
      true,
    )
    assert.equal(
      isKfzAnalyticsDuplicateKeyError({ message: 'some other failure' }),
      false,
    )
  })
})

describe('kfz analytics persistence health and bounded retry', () => {
  function wrapStore(
    inner: ReturnType<typeof createMemoryKfzAnalyticsStore>,
    insertEvent: (record: Parameters<typeof inner.insertEvent>[0]) => ReturnType<typeof inner.insertEvent>,
  ) {
    return {
      events: inner.events,
      health: inner.health,
      insertEvent,
      listEvents: inner.listEvents.bind(inner),
      readHealthFacts: inner.readHealthFacts.bind(inner),
      addHealthFacts: inner.addHealthFacts.bind(inner),
    }
  }

  it('retries a transient persist failure and accepts the event once', async () => {
    const inner = createMemoryKfzAnalyticsStore()
    let attempts = 0
    const store = wrapStore(inner, async (record) => {
      attempts += 1
      if (attempts === 1) {
        throw { code: '40001', message: 'serialization failure' }
      }
      return inner.insertEvent(record)
    })

    const ingested = await ingestKfzAnalyticsEvents({
      consent: 'granted',
      nowIso: NOW,
      store,
      events: [
        {
          eventName: 'landing_view',
          sessionId: SESSION,
          occurredAt: NOW,
          properties: { activeMs: 800 },
        },
      ],
    })

    assert.equal(attempts, 2)
    assert.equal(ingested.accepted, 1)
    assert.equal(ingested.health.retryRecovered, 1)
    assert.equal(ingested.health.transientFailed, 0)
    assert.equal(ingested.health.accepted, 1)
    assert.equal((await store.listEvents()).length, 1)
    assert.equal(ingested.quality.retryRecovered, 1)
  })

  it('counts exhausted transient failures without duplicating the row', async () => {
    const inner = createMemoryKfzAnalyticsStore()
    let attempts = 0
    const store = wrapStore(inner, async () => {
      attempts += 1
      throw { code: '57014', message: 'timeout' }
    })

    const ingested = await ingestKfzAnalyticsEvents({
      consent: 'granted',
      nowIso: NOW,
      store,
      events: [
        {
          eventName: 'traffic_source',
          sessionId: SESSION,
          occurredAt: NOW,
          properties: { trafficSource: 'direct', referrerCategory: 'direct' },
        },
      ],
    })

    assert.equal(attempts, 3)
    assert.equal(ingested.accepted, 0)
    assert.equal(ingested.dropped, 1)
    assert.equal(ingested.health.transientFailed, 1)
    assert.equal(ingested.health.accepted, 0)
    assert.equal((await store.listEvents()).length, 0)
  })

  it('treats a recovered duplicate key after a transient write as one stored event', async () => {
    const inner = createMemoryKfzAnalyticsStore()
    const payload = {
      eventName: 'landing_view' as const,
      sessionId: SESSION,
      occurredAt: NOW,
      properties: { activeMs: 500 },
    }
    await inner.insertEvent({
      ...payload,
      eventKey: `${SESSION}:landing_view`,
    })
    let attempts = 0
    const store = wrapStore(inner, async (record) => {
      attempts += 1
      if (attempts === 1) {
        throw { message: 'fetch failed' }
      }
      return inner.insertEvent(record)
    })

    const ingested = await ingestKfzAnalyticsEvents({
      consent: 'granted',
      nowIso: NOW,
      store,
      events: [payload],
    })

    assert.equal(ingested.accepted, 1)
    assert.equal(ingested.health.retryRecovered, 1)
    assert.equal(ingested.health.duplicates, 0)
    assert.equal((await store.listEvents()).length, 1)
  })

  it('rejects invalid events permanently without retrying persist', async () => {
    const inner = createMemoryKfzAnalyticsStore()
    let attempts = 0
    const store = wrapStore(inner, async (record) => {
      attempts += 1
      return inner.insertEvent(record)
    })

    const ingested = await ingestKfzAnalyticsEvents({
      consent: 'granted',
      nowIso: NOW,
      store,
      events: [
        {
          eventName: 'custom_tracker',
          sessionId: SESSION,
          occurredAt: NOW,
          properties: {
            fullName: 'Max Mustermann',
            email: 'max@example.com',
            filename: 'schein.pdf',
            objectKey: 'kfz/agency/item/schein.pdf',
            url: 'https://evil.example/?q=1',
          },
        },
      ],
    })

    assert.equal(attempts, 0)
    assert.equal(ingested.accepted, 0)
    assert.equal(ingested.health.rejected, 1)
    assert.equal(ingested.health.transientFailed, 0)
    assert.equal((await store.listEvents()).length, 0)
    const serialized = JSON.stringify(ingested)
    assert.equal(serialized.includes('Mustermann'), false)
    assert.equal(serialized.includes('schein.pdf'), false)
    assert.equal(serialized.includes('evil.example'), false)
  })

  it('does not retry after consent is withdrawn', async () => {
    const inner = createMemoryKfzAnalyticsStore()
    let attempts = 0
    let consent: 'granted' | 'declined' = 'granted'
    const store = wrapStore(inner, async () => {
      attempts += 1
      consent = 'declined'
      throw { code: '40001', message: 'serialization failure' }
    })

    const ingested = await ingestKfzAnalyticsEvents({
      consent: 'granted',
      nowIso: NOW,
      store,
      readConsent: () => consent,
      events: [
        {
          eventName: 'submit_succeeded',
          sessionId: SESSION,
          occurredAt: NOW,
          properties: {
            activeMs: 1200,
            fullName: 'Erika Musterfrau',
            answers: { intent: 'switch_car' },
          },
        },
      ],
    })

    assert.equal(attempts, 1)
    assert.equal(ingested.accepted, 0)
    assert.equal(ingested.quality.consentBlocked, 1)
    assert.equal(ingested.health.transientFailed, 0)
    assert.equal((await store.listEvents()).length, 0)
    assert.equal(JSON.stringify(ingested).includes('Musterfrau'), false)
  })
})

describe('kfz analytics persistence RLS and derived fields', () => {
  it('documents server-side review and keeps consent/quality off the table', () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), KFZ_ANALYTICS_PERSISTENCE_CONTRACT_MIGRATION),
      'utf8',
    )
    assert.equal(KFZ_ANALYTICS_RLS_CONTRACT.table, KFZ_ANALYTICS_PERSISTENCE_TABLE)
    assert.equal(KFZ_ANALYTICS_RLS_CONTRACT.anonInsert, false)
    assert.equal(KFZ_ANALYTICS_RLS_CONTRACT.publicRead, false)
    assert.match(sql, /revoke all on table public\.kfz_funnel_analytics_events from anon/)
    assert.match(sql, /service_role/)
    assert.match(sql, /authorized aggregate review/)
    for (const field of KFZ_ANALYTICS_DERIVED_REVIEW_FIELDS) {
      assert.doesNotMatch(sql, new RegExp(`\\b${field}\\b\\s+`))
    }
  })
})
