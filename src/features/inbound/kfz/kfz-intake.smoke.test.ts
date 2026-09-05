import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'

import { toInboundItemFromKfzInquiry } from '@/features/inbound/kfz/lib/kfz-adapter'
import { normalizeInternationalPhone } from '@/features/inbound/kfz/lib/normalize-phone'
import { normalizeKfzInquiry } from '@/features/inbound/kfz/lib/normalize-kfz-inquiry'
import { resetRateLimitBucketsForTests } from '@/features/inbound/kfz/lib/rate-limit-seam'
import { validatePublicKfzInquiry } from '@/features/inbound/kfz/lib/validate-public-kfz-inquiry'
import { processKfzWebsiteInquiry } from '@/features/inbound/kfz/services/process-kfz-inquiry'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'
import type { PublicKfzInquiryPayload } from '@/features/inbound/kfz/types/public-kfz-inquiry'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const SECRET = 'test-kfz-intake-secret-value'
const RECEIVED_AT = '2026-09-05T12:00:00.000Z'

function basePayload(
  overrides: Partial<PublicKfzInquiryPayload> = {},
): PublicKfzInquiryPayload {
  return {
    fullName: 'Anna Beispiel',
    postalCode: '10115',
    city: 'Berlin',
    phone: '+49 170 1234567',
    email: null,
    preferredChannel: 'phone',
    inquiryReason: 'Preischeck Kfz-Versicherung',
    inquiryProcessingConsent: true,
    consentVersion: 'kfz-lp-2026-09-01',
    consentTimestamp: '2026-09-05T11:59:00.000Z',
    language: 'de',
    source: 'kfz.artkus.de',
    campaign: 'Meta Lead Autumn',
    utmSource: 'meta',
    utmMedium: 'paid-social',
    utmCampaign: 'kfz-autumn-2026',
    submissionId: 'sub-anna-001',
    ...overrides,
  }
}

function asJson(payload: PublicKfzInquiryPayload): string {
  return JSON.stringify(payload)
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

describe('kfz phone normalization', () => {
  it('preserves a leading plus on international numbers', () => {
    assert.equal(normalizeInternationalPhone('+491701234567'), '+491701234567')
    assert.equal(normalizeInternationalPhone('+49 170 1234567'), '+491701234567')
  })
})

describe('kfz public validation + intake', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('1. accepts a valid phone inquiry', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const result = await processKfzWebsiteInquiry({
        rawBody: asJson(basePayload({ email: null, phone: '+491701234567' })),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'test-1',
        store,
        receivedAt: RECEIVED_AT,
      })

      assert.equal(result.success, true)
      if (!result.success) return

      assert.equal(result.deduplicated, false)
      assert.equal(store.items.length, 1)
      assert.equal(store.items[0].channel, 'website')
      assert.equal(store.items[0].source, 'website')
      assert.equal(
        (store.items[0].sender as { address?: string }).address,
        '+491701234567',
      )
      assert.match(store.items[0].content, /Telefon: \+491701234567/)
    })
  })

  it('2. accepts a valid email inquiry', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const result = await processKfzWebsiteInquiry({
        rawBody: asJson(
          basePayload({
            phone: null,
            email: 'anna@example.com',
            preferredChannel: 'email',
            submissionId: 'sub-email-001',
          }),
        ),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'test-2',
        store,
        receivedAt: RECEIVED_AT,
      })

      assert.equal(result.success, true)
      if (!result.success) return
      assert.equal(store.items.length, 1)
      assert.equal(
        (store.items[0].sender as { addressKind?: string }).addressKind,
        'email',
      )
      assert.match(store.items[0].content, /E-Mail: anna@example.com/)
    })
  })

  it('3. accepts an inquiry with both contact methods', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const result = await processKfzWebsiteInquiry({
        rawBody: asJson(
          basePayload({
            phone: '+491701234567',
            email: 'anna@example.com',
            submissionId: 'sub-both-001',
          }),
        ),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'test-3',
        store,
        receivedAt: RECEIVED_AT,
      })

      assert.equal(result.success, true)
      if (!result.success) return
      assert.match(store.items[0].content, /Telefon: \+491701234567/)
      assert.match(store.items[0].content, /E-Mail: anna@example.com/)
    })
  })

  it('4. rejects when both contact methods are missing', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const result = await processKfzWebsiteInquiry({
        rawBody: asJson(basePayload({ phone: null, email: null })),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'test-4',
        store,
        receivedAt: RECEIVED_AT,
      })

      assert.equal(result.success, false)
      if (result.success) return
      assert.equal(result.status, 422)
      assert.equal(result.code, 'missing_contact')
      assert.equal(store.items.length, 0)
    })
  })

  it('5. rejects false or missing consent', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()

      const falseConsent = await processKfzWebsiteInquiry({
        rawBody: asJson(
          basePayload({ inquiryProcessingConsent: false, submissionId: 'c1' }),
        ),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'test-5a',
        store,
        receivedAt: RECEIVED_AT,
      })
      assert.equal(falseConsent.success, false)
      if (!falseConsent.success) {
        assert.equal(falseConsent.code, 'invalid_consent')
      }

      // JSON.stringify drops undefined — simulate absent field
      const parsed = JSON.parse(asJson(basePayload({ submissionId: 'c2' }))) as Record<
        string,
        unknown
      >
      delete parsed.inquiryProcessingConsent
      const missingConsent = await processKfzWebsiteInquiry({
        rawBody: JSON.stringify(parsed),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'test-5b',
        store,
        receivedAt: RECEIVED_AT,
      })
      assert.equal(missingConsent.success, false)
      if (!missingConsent.success) {
        assert.equal(missingConsent.code, 'invalid_consent')
      }
      assert.equal(store.items.length, 0)
    })
  })

  it('6. rejects malformed email, phone, and PLZ safely', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()

      const badEmail = await processKfzWebsiteInquiry({
        rawBody: asJson(
          basePayload({
            phone: null,
            email: 'not-an-email',
            preferredChannel: 'email',
            submissionId: 'bad-email',
          }),
        ),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'test-6a',
        store,
        receivedAt: RECEIVED_AT,
      })
      assert.equal(badEmail.success, false)
      if (!badEmail.success) {
        assert.equal(badEmail.code, 'invalid_contact')
      }

      const badPhone = await processKfzWebsiteInquiry({
        rawBody: asJson(
          basePayload({
            phone: 'abc',
            email: null,
            submissionId: 'bad-phone',
          }),
        ),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'test-6b',
        store,
        receivedAt: RECEIVED_AT,
      })
      assert.equal(badPhone.success, false)
      if (!badPhone.success) {
        assert.equal(badPhone.code, 'invalid_contact')
      }

      const badPlz = await processKfzWebsiteInquiry({
        rawBody: asJson(
          basePayload({
            postalCode: 'ABCDE',
            submissionId: 'bad-plz',
          }),
        ),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'test-6c',
        store,
        receivedAt: RECEIVED_AT,
      })
      assert.equal(badPlz.success, false)
      if (!badPlz.success) {
        assert.equal(badPlz.code, 'invalid_plz')
      }

      assert.equal(store.items.length, 0)
    })
  })

  it('7. rejects oversized fields and payloads', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()

      const oversizedField = await processKfzWebsiteInquiry({
        rawBody: asJson(
          basePayload({
            fullName: 'A'.repeat(200),
            submissionId: 'oversized-name',
          }),
        ),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'test-7a',
        store,
        receivedAt: RECEIVED_AT,
      })
      assert.equal(oversizedField.success, false)
      if (!oversizedField.success) {
        assert.equal(oversizedField.code, 'oversized_field')
      }

      const huge = `${'{"fullName":"'.padEnd(30_000, 'x')}"`
      const oversizedPayload = await processKfzWebsiteInquiry({
        rawBody: huge,
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'test-7b',
        store,
        receivedAt: RECEIVED_AT,
      })
      assert.equal(oversizedPayload.success, false)
      if (!oversizedPayload.success) {
        assert.equal(oversizedPayload.code, 'payload_too_large')
        assert.equal(oversizedPayload.status, 413)
      }

      assert.equal(store.items.length, 0)
    })
  })

  it('8. stores hostile HTML/script as safe plain text', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const hostile =
        'Preischeck <script>alert(1)</script> bitte <img src=x onerror=alert(1)>'

      const result = await processKfzWebsiteInquiry({
        rawBody: asJson(
          basePayload({
            inquiryReason: hostile,
            contextNotes: '<b>Notiz</b> mit <script>evil()</script>',
            submissionId: 'hostile-001',
          }),
        ),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'test-8',
        store,
        receivedAt: RECEIVED_AT,
      })

      assert.equal(result.success, true)
      if (!result.success) return

      const content = store.items[0].content
      assert.doesNotMatch(content, /<script/i)
      assert.doesNotMatch(content, /onerror=/i)
      assert.doesNotMatch(content, /<img/i)
      assert.doesNotMatch(content, /<b>/i)
      assert.match(content, /Preischeck/)
      assert.match(content, /Notiz/)
    })
  })

  it('9. deduplicates replayed submissions (no duplicate inbox item)', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const body = asJson(basePayload({ submissionId: 'replay-001' }))

      const first = await processKfzWebsiteInquiry({
        rawBody: body,
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'test-9a',
        store,
        receivedAt: RECEIVED_AT,
      })
      const second = await processKfzWebsiteInquiry({
        rawBody: body,
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'test-9b',
        store,
        receivedAt: '2026-09-05T12:05:00.000Z',
      })

      assert.equal(first.success, true)
      assert.equal(second.success, true)
      if (!first.success || !second.success) return

      assert.equal(second.deduplicated, true)
      assert.equal(second.inboxItemId, first.inboxItemId)
      assert.equal(store.items.length, 1)
    })
  })

  it('10. normalizes and retains UTM/source attribution', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const result = await processKfzWebsiteInquiry({
        rawBody: asJson(
          basePayload({
            source: ' Kfz.Artkus.DE ',
            campaign: 'Meta Lead Autumn',
            utmSource: 'Meta',
            utmMedium: 'paid social',
            utmCampaign: 'KFZ-Autumn-2026',
            utmTerm: 'kfz versicherung',
            utmContent: 'ad-1',
            submissionId: 'utm-001',
          }),
        ),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'test-10',
        store,
        receivedAt: RECEIVED_AT,
      })

      assert.equal(result.success, true)
      if (!result.success) return

      const meta = store.items[0].inbound_metadata as {
        acquisition?: Record<string, unknown>
        consentEvidence?: Record<string, unknown>
      }

      assert.equal(meta.acquisition?.family, 'website')
      assert.equal(meta.acquisition?.product, 'kfz')
      assert.equal(meta.acquisition?.source, 'kfz.artkus.de')
      assert.equal(meta.acquisition?.campaign, 'meta-lead-autumn')
      assert.equal(meta.acquisition?.utmSource, 'meta')
      assert.equal(meta.acquisition?.utmMedium, 'paid-social')
      assert.equal(meta.acquisition?.utmCampaign, 'kfz-autumn-2026')
      assert.equal(meta.acquisition?.utmTerm, 'kfz-versicherung')
      assert.equal(meta.acquisition?.utmContent, 'ad-1')

      assert.equal(meta.consentEvidence?.purpose, 'inquiry_processing')
      assert.equal(meta.consentEvidence?.granted, true)
      assert.equal(meta.consentEvidence?.version, 'kfz-lp-2026-09-01')
      assert.equal(meta.consentEvidence?.receivedAt, RECEIVED_AT)
      // Consent-Volltext darf nicht gespeichert sein
      assert.equal('text' in (meta.consentEvidence ?? {}), false)
    })
  })
})

describe('kfz adapter (unit)', () => {
  it('maps normalized inquiry to website InboundItem without attachments bytes', () => {
    const validated = validatePublicKfzInquiry(
      asJson(
        basePayload({
          phone: '+491701234567',
          uploads: [{ filename: 'schein.pdf', mimeType: 'application/pdf', sizeBytes: 12 }],
        }),
      ),
    )
    assert.equal(validated.ok, true)
    if (!validated.ok) return

    const normalized = normalizeKfzInquiry(validated.payload, RECEIVED_AT)
    assert.equal(normalized.ok, true)
    if (!normalized.ok) return

    const item = toInboundItemFromKfzInquiry(normalized.inquiry)
    assert.equal(item.channel, 'website')
    assert.equal(item.externalId, 'kfz:sub-anna-001')
    assert.equal(item.attachments, undefined)
    assert.deepEqual(item.metadata?.uploadMeta, [
      { filename: 'schein.pdf', mimeType: 'application/pdf', sizeBytes: 12 },
    ])
  })

  it('leaves unknown optional language as null when omitted', () => {
    const payload = basePayload()
    delete (payload as { language?: unknown }).language
    const validated = validatePublicKfzInquiry(asJson(payload))
    assert.equal(validated.ok, true)
    if (!validated.ok) return

    const normalized = normalizeKfzInquiry(validated.payload, RECEIVED_AT)
    assert.equal(normalized.ok, true)
    if (!normalized.ok) return
    assert.equal(normalized.inquiry.language, null)
  })
})
