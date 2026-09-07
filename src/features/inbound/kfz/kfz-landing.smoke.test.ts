import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import {
  buildKfzLandingPayload,
  readKfzLandingAttributionFromSearchParams,
  type KfzLandingFormValues,
} from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import {
  KFZ_LANDING_CONSENT_VERSION,
  KFZ_LANDING_SOURCE,
} from '@/features/inbound/kfz/lib/kfz-landing-constants'
import {
  beginKfzLandingSubmit,
  canStartKfzLandingSubmit,
  createKfzLandingSubmissionId,
  isKfzLandingSubmitLocked,
  resolveKfzLandingSubmitResult,
} from '@/features/inbound/kfz/lib/kfz-landing-submit-guard'
import { normalizeInternationalPhone } from '@/features/inbound/kfz/lib/normalize-phone'
import { resetRateLimitBucketsForTests } from '@/features/inbound/kfz/lib/rate-limit-seam'
import { validatePublicKfzInquiry } from '@/features/inbound/kfz/lib/validate-public-kfz-inquiry'
import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'
import { processKfzWebsiteInquiry } from '@/features/inbound/kfz/services/process-kfz-inquiry'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const SECRET = 'test-kfz-landing-secret-value'

function baseValues(
  overrides: Partial<KfzLandingFormValues> = {},
): KfzLandingFormValues {
  return {
    fullName: 'Max Mustermann',
    postalCode: '49525',
    city: 'Lengerich',
    phone: '+491701234567',
    email: '',
    preferredChannel: 'phone',
    inquiryReason: 'Wechsel Kfz-Versicherung',
    inquiryProcessingConsent: true,
    vehicleMake: 'VW',
    vehicleModel: 'Golf',
    vehicleYear: '2019',
    contextNotes: '',
    ...overrides,
  }
}

function withKfzEnv(run: () => Promise<void>): Promise<void> {
  const prev = {
    agency: process.env.INBOUND_KFZ_AGENCY_ID,
    actor: process.env.INBOUND_KFZ_ACTOR_USER_ID,
    secret: process.env.INBOUND_KFZ_INTAKE_SECRET,
    emailAgency: process.env.INBOUND_EMAIL_AGENCY_ID,
    emailActor: process.env.INBOUND_EMAIL_ACTOR_USER_ID,
  }

  process.env.INBOUND_KFZ_AGENCY_ID = AGENCY_ID
  process.env.INBOUND_KFZ_ACTOR_USER_ID = ACTOR_ID
  process.env.INBOUND_KFZ_INTAKE_SECRET = SECRET
  delete process.env.INBOUND_EMAIL_AGENCY_ID
  delete process.env.INBOUND_EMAIL_ACTOR_USER_ID

  return run().finally(() => {
    if (prev.agency === undefined) delete process.env.INBOUND_KFZ_AGENCY_ID
    else process.env.INBOUND_KFZ_AGENCY_ID = prev.agency
    if (prev.actor === undefined) delete process.env.INBOUND_KFZ_ACTOR_USER_ID
    else process.env.INBOUND_KFZ_ACTOR_USER_ID = prev.actor
    if (prev.secret === undefined) delete process.env.INBOUND_KFZ_INTAKE_SECRET
    else process.env.INBOUND_KFZ_INTAKE_SECRET = prev.secret
    if (prev.emailAgency === undefined) delete process.env.INBOUND_EMAIL_AGENCY_ID
    else process.env.INBOUND_EMAIL_AGENCY_ID = prev.emailAgency
    if (prev.emailActor === undefined) delete process.env.INBOUND_EMAIL_ACTOR_USER_ID
    else process.env.INBOUND_EMAIL_ACTOR_USER_ID = prev.emailActor
  })
}

describe('kfz landing payload mapping', () => {
  it('maps form values onto Gate-2 public contract', () => {
    const built = buildKfzLandingPayload({
      values: baseValues(),
      submissionId: 'lp-sub-001',
      consentTimestamp: '2026-09-06T12:00:00.000Z',
      attribution: {
        utmSource: 'local',
        utmMedium: 'test',
        utmCampaign: 'kfz-funnel',
      },
    })

    assert.equal(built.ok, true)
    if (!built.ok) {
      return
    }

    assert.equal(built.payload.fullName, 'Max Mustermann')
    assert.equal(built.payload.postalCode, '49525')
    assert.equal(built.payload.city, 'Lengerich')
    assert.equal(built.payload.phone, '+491701234567')
    assert.equal(built.payload.email, null)
    assert.equal(built.payload.preferredChannel, 'phone')
    assert.equal(built.payload.inquiryProcessingConsent, true)
    assert.equal(built.payload.consentVersion, KFZ_LANDING_CONSENT_VERSION)
    assert.equal(built.payload.source, KFZ_LANDING_SOURCE)
    assert.equal(built.payload.submissionId, 'lp-sub-001')
    assert.equal(built.payload.utmSource, 'local')
    assert.equal(built.payload.language, 'de')
    assert.equal(built.payload.vehicleMake, 'VW')

    const validated = validatePublicKfzInquiry(JSON.stringify(built.payload))
    assert.equal(validated.ok, true)
  })

  it('preserves international phone with leading + through mapping + normalize', () => {
    const built = buildKfzLandingPayload({
      values: baseValues({ phone: '+49 170 1234567' }),
      submissionId: 'lp-phone-plus',
      consentTimestamp: '2026-09-06T12:00:00.000Z',
    })
    assert.equal(built.ok, true)
    if (!built.ok) {
      return
    }
    assert.equal(built.payload.phone, '+49 170 1234567')
    assert.equal(normalizeInternationalPhone(built.payload.phone!), '+491701234567')
  })

  it('rejects missing consent', () => {
    const built = buildKfzLandingPayload({
      values: baseValues({ inquiryProcessingConsent: false }),
      submissionId: 'lp-no-consent',
      consentTimestamp: '2026-09-06T12:00:00.000Z',
    })
    assert.equal(built.ok, false)
    if (built.ok) {
      return
    }
    assert.equal(built.code, 'invalid_consent')
  })

  it('rejects missing contact methods', () => {
    const built = buildKfzLandingPayload({
      values: baseValues({ phone: '  ', email: '' }),
      submissionId: 'lp-no-contact',
      consentTimestamp: '2026-09-06T12:00:00.000Z',
    })
    assert.equal(built.ok, false)
    if (built.ok) {
      return
    }
    assert.equal(built.code, 'missing_contact')
  })

  it('rejects empty required fields without inventing values', () => {
    const built = buildKfzLandingPayload({
      values: baseValues({ fullName: '   ', inquiryReason: '' }),
      submissionId: 'lp-missing-fields',
      consentTimestamp: '2026-09-06T12:00:00.000Z',
    })
    assert.equal(built.ok, false)
    if (built.ok) {
      return
    }
    assert.equal(built.code, 'missing_field')
  })

  it('rejects empty submissionId', () => {
    const built = buildKfzLandingPayload({
      values: baseValues(),
      submissionId: '   ',
      consentTimestamp: '2026-09-06T12:00:00.000Z',
    })
    assert.equal(built.ok, false)
    if (built.ok) {
      return
    }
    assert.equal(built.code, 'missing_submission_id')
  })

  it('reads UTM attribution without inventing values', () => {
    const attr = readKfzLandingAttributionFromSearchParams(
      new URLSearchParams('utm_source=meta&utm_campaign=kfz-autumn&foo=bar'),
    )
    assert.equal(attr.utmSource, 'meta')
    assert.equal(attr.utmCampaign, 'kfz-autumn')
    assert.equal(attr.utmMedium, null)
  })
})

describe('kfz landing duplicate-submit protection', () => {
  it('locks while submitting and after success', () => {
    assert.equal(canStartKfzLandingSubmit('idle'), true)
    assert.equal(canStartKfzLandingSubmit('error'), true)
    assert.equal(canStartKfzLandingSubmit('submitting'), false)
    assert.equal(canStartKfzLandingSubmit('success'), false)

    assert.equal(beginKfzLandingSubmit('idle'), 'submitting')
    assert.equal(beginKfzLandingSubmit('submitting'), null)
    assert.equal(beginKfzLandingSubmit('success'), null)

    assert.equal(isKfzLandingSubmitLocked('submitting'), true)
    assert.equal(isKfzLandingSubmitLocked('success'), true)
    assert.equal(isKfzLandingSubmitLocked('error'), false)
  })

  it('maps in-flight outcome to success or retryable error — never success on failure', () => {
    assert.equal(resolveKfzLandingSubmitResult('submitting', 'success'), 'success')
    assert.equal(resolveKfzLandingSubmitResult('submitting', 'error'), 'error')
    // Stale resolve must not upgrade idle/error into success
    assert.equal(resolveKfzLandingSubmitResult('idle', 'success'), 'idle')
    assert.equal(resolveKfzLandingSubmitResult('error', 'success'), 'error')
  })

  it('creates non-empty submission ids without PII', () => {
    const id = createKfzLandingSubmissionId(() => '11111111-2222-4333-8444-555555555555')
    assert.equal(id, '11111111-2222-4333-8444-555555555555')
    assert.equal(id.includes('@'), false)
    assert.equal(id.includes('+'), false)
  })
})

describe('kfz landing → Gate-2 intake (success/failure)', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('accepts a landing-mapped payload into the website inbox path', async () => {
    await withKfzEnv(async () => {
      const built = buildKfzLandingPayload({
        values: baseValues(),
        submissionId: 'lp-intake-ok',
        consentTimestamp: '2026-09-06T12:00:00.000Z',
      })
      assert.equal(built.ok, true)
      if (!built.ok) {
        return
      }

      const store = createMemoryInboundIntakeStore()
      const result = await processKfzWebsiteInquiry({
        rawBody: JSON.stringify(built.payload),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'landing-ok',
        store,
        receivedAt: '2026-09-06T12:00:00.000Z',
      })

      assert.equal(result.success, true)
      if (!result.success) {
        return
      }
      assert.equal(result.deduplicated, false)
      assert.equal(store.items.length, 1)
      assert.equal(store.items[0].channel, 'website')
      assert.equal(store.items[0].source, 'website')
    })
  })

  it('does not claim success when consent is missing (failure path)', async () => {
    await withKfzEnv(async () => {
      const built = buildKfzLandingPayload({
        values: baseValues({ inquiryProcessingConsent: false }),
        submissionId: 'lp-intake-fail-consent',
        consentTimestamp: '2026-09-06T12:00:00.000Z',
      })
      assert.equal(built.ok, false)

      const store = createMemoryInboundIntakeStore()
      // Simulate a hostile client bypassing UI mapping with consent=false
      const hostile = {
        fullName: 'Max Mustermann',
        postalCode: '49525',
        city: 'Lengerich',
        phone: '+491701234567',
        preferredChannel: 'phone',
        inquiryReason: 'Test',
        inquiryProcessingConsent: false,
        consentVersion: KFZ_LANDING_CONSENT_VERSION,
        submissionId: 'lp-hostile-consent',
      }
      const result = await processKfzWebsiteInquiry({
        rawBody: JSON.stringify(hostile),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'landing-fail',
        store,
      })

      assert.equal(result.success, false)
      if (result.success) {
        return
      }
      assert.equal(result.code, 'invalid_consent')
      assert.equal(store.items.length, 0)
    })
  })

  it('deduplicates accidental double-submit with the same submissionId', async () => {
    await withKfzEnv(async () => {
      const built = buildKfzLandingPayload({
        values: baseValues(),
        submissionId: 'lp-dup-001',
        consentTimestamp: '2026-09-06T12:00:00.000Z',
      })
      assert.equal(built.ok, true)
      if (!built.ok) {
        return
      }

      const store = createMemoryInboundIntakeStore()
      const first = await processKfzWebsiteInquiry({
        rawBody: JSON.stringify(built.payload),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'landing-dup-a',
        store,
      })
      const second = await processKfzWebsiteInquiry({
        rawBody: JSON.stringify(built.payload),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'landing-dup-b',
        store,
      })

      assert.equal(first.success, true)
      assert.equal(second.success, true)
      if (!first.success || !second.success) {
        return
      }
      assert.equal(first.deduplicated, false)
      assert.equal(second.deduplicated, true)
      assert.equal(store.items.length, 1)
    })
  })
})

describe('kfz landing → shared HTTP handler (production entry)', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  function landingRequest(payload: unknown, secret = SECRET): Request {
    return new Request('http://localhost/api/inbound/kfz', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  }

  it('accepts a landing-mapped payload through handleKfzInboundHttpRequest', async () => {
    await withKfzEnv(async () => {
      const built = buildKfzLandingPayload({
        values: baseValues(),
        submissionId: 'lp-http-ok',
        consentTimestamp: '2026-09-06T12:00:00.000Z',
      })
      assert.equal(built.ok, true)
      if (!built.ok) {
        return
      }

      const store = createMemoryInboundIntakeStore()
      const result = await handleKfzInboundHttpRequest(landingRequest(built.payload), {
        store,
      })

      assert.equal(result.ok, true)
      if (!result.ok) {
        return
      }
      assert.equal(result.status, 200)
      assert.equal(result.body.ok, true)
      assert.equal(result.body.deduplicated, false)
      assert.equal(store.items.length, 1)
      assert.equal(store.items[0].channel, 'website')
      assert.equal(store.items[0].source, 'website')
    })
  })

  it('does not claim success when consent is missing on the HTTP path', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const result = await handleKfzInboundHttpRequest(
        landingRequest({
          fullName: 'Max Mustermann',
          postalCode: '49525',
          city: 'Lengerich',
          phone: '+491701234567',
          preferredChannel: 'phone',
          inquiryReason: 'Test',
          inquiryProcessingConsent: false,
          consentVersion: KFZ_LANDING_CONSENT_VERSION,
          submissionId: 'lp-http-no-consent',
        }),
        { store },
      )

      assert.equal(result.ok, false)
      if (result.ok) {
        return
      }
      assert.equal(result.body.code, 'invalid_consent')
      assert.equal(store.items.length, 0)
    })
  })

  it('fails honestly with config_missing when intake env is absent', async () => {
    const prev = {
      agency: process.env.INBOUND_KFZ_AGENCY_ID,
      actor: process.env.INBOUND_KFZ_ACTOR_USER_ID,
      secret: process.env.INBOUND_KFZ_INTAKE_SECRET,
      emailAgency: process.env.INBOUND_EMAIL_AGENCY_ID,
      emailActor: process.env.INBOUND_EMAIL_ACTOR_USER_ID,
    }

    delete process.env.INBOUND_KFZ_AGENCY_ID
    delete process.env.INBOUND_KFZ_ACTOR_USER_ID
    delete process.env.INBOUND_KFZ_INTAKE_SECRET
    delete process.env.INBOUND_EMAIL_AGENCY_ID
    delete process.env.INBOUND_EMAIL_ACTOR_USER_ID

    try {
      const store = createMemoryInboundIntakeStore()
      const result = await handleKfzInboundHttpRequest(
        landingRequest({
          fullName: 'Max Mustermann',
          postalCode: '49525',
          city: 'Lengerich',
          phone: '+491701234567',
          preferredChannel: 'phone',
          inquiryReason: 'Test',
          inquiryProcessingConsent: true,
          consentVersion: KFZ_LANDING_CONSENT_VERSION,
          submissionId: 'lp-http-no-env',
        }),
        { store },
      )

      assert.equal(result.ok, false)
      if (result.ok) {
        return
      }
      assert.equal(result.status, 503)
      assert.equal(result.body.code, 'config_missing')
      assert.equal(store.items.length, 0)
    } finally {
      if (prev.agency === undefined) delete process.env.INBOUND_KFZ_AGENCY_ID
      else process.env.INBOUND_KFZ_AGENCY_ID = prev.agency
      if (prev.actor === undefined) delete process.env.INBOUND_KFZ_ACTOR_USER_ID
      else process.env.INBOUND_KFZ_ACTOR_USER_ID = prev.actor
      if (prev.secret === undefined) delete process.env.INBOUND_KFZ_INTAKE_SECRET
      else process.env.INBOUND_KFZ_INTAKE_SECRET = prev.secret
      if (prev.emailAgency === undefined) delete process.env.INBOUND_EMAIL_AGENCY_ID
      else process.env.INBOUND_EMAIL_AGENCY_ID = prev.emailAgency
      if (prev.emailActor === undefined) delete process.env.INBOUND_EMAIL_ACTOR_USER_ID
      else process.env.INBOUND_EMAIL_ACTOR_USER_ID = prev.emailActor
    }
  })
})
