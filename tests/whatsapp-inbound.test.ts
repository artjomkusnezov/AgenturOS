import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'
import { verifyMetaSignature256 } from '@/features/whatsapp/lib/verify-meta-signature'
import { verifyWhatsAppWebhookSubscription } from '@/features/whatsapp/lib/verify-webhook-subscription'
import { processMetaWhatsAppInboundWebhook } from '@/features/whatsapp/transport/meta/meta-whatsapp-inbound-transport'
import { extractMetaWhatsAppMessages } from '@/features/whatsapp/transport/meta/map-meta-to-normalized'
import type { MetaWhatsAppWebhookPayload } from '@/features/whatsapp/types/meta-webhook'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures/whatsapp',
)

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf8')
}

function setWhatsAppEnv() {
  process.env.INBOUND_WHATSAPP_AGENCY_ID = AGENCY_ID
  process.env.INBOUND_WHATSAPP_ACTOR_USER_ID = ACTOR_ID
  process.env.WHATSAPP_VERIFY_TOKEN = 'verify-test'
  process.env.META_APP_SECRET = 'app-secret-test'
  process.env.WHATSAPP_ACCESS_TOKEN = 'access-token-test'
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'PHONE_ID_TEST'
  process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = 'WABA_TEST_001'
  delete process.env.WHATSAPP_SKIP_SIGNATURE_VERIFY
  delete process.env.WHATSAPP_WEBHOOK_ALLOWED_WABA_IDS
  delete process.env.WHATSAPP_WEBHOOK_ALLOWED_PHONE_NUMBER_IDS
}

const ENV_KEYS = [
  'INBOUND_WHATSAPP_AGENCY_ID',
  'INBOUND_WHATSAPP_ACTOR_USER_ID',
  'WHATSAPP_VERIFY_TOKEN',
  'META_APP_SECRET',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_BUSINESS_ACCOUNT_ID',
  'WHATSAPP_SKIP_SIGNATURE_VERIFY',
  'WHATSAPP_WEBHOOK_ALLOWED_WABA_IDS',
  'WHATSAPP_WEBHOOK_ALLOWED_PHONE_NUMBER_IDS',
] as const

describe('whatsapp inbound regression — GET verification', () => {
  it('accepts correct subscribe challenge', () => {
    const result = verifyWhatsAppWebhookSubscription({
      mode: 'subscribe',
      verifyToken: 'secret-token',
      challenge: '123456',
      expectedToken: 'secret-token',
    })
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.challenge, '123456')
    }
  })

  it('rejects wrong verify token', () => {
    const result = verifyWhatsAppWebhookSubscription({
      mode: 'subscribe',
      verifyToken: 'wrong',
      challenge: '123456',
      expectedToken: 'secret-token',
    })
    assert.equal(result.ok, false)
  })
})

describe('whatsapp inbound regression — POST HMAC', () => {
  it('accepts valid sha256 signature over raw body', () => {
    const body = loadFixture('text.json')
    const secret = 'app-secret-test'
    const digest = createHmac('sha256', secret).update(body, 'utf8').digest('hex')
    assert.equal(
      verifyMetaSignature256({
        rawBody: body,
        signatureHeader: `sha256=${digest}`,
        appSecret: secret,
      }),
      true,
    )
  })

  it('rejects invalid signature', () => {
    assert.equal(
      verifyMetaSignature256({
        rawBody: loadFixture('text.json'),
        signatureHeader: 'sha256=0000000000000000000000000000000000000000000000000000000000000000',
        appSecret: 'app-secret-test',
      }),
      false,
    )
  })
})

describe('whatsapp inbound regression — standard messages', () => {
  const previous: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      previous[key] = process.env[key]
    }
    setWhatsAppEnv()
  })

  afterEach(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })

  it('extracts only messages field for intake path', () => {
    const payload = JSON.parse(loadFixture('text.json')) as MetaWhatsAppWebhookPayload
    const extracted = extractMetaWhatsAppMessages(payload)
    assert.equal(extracted.messages.length, 1)
    assert.equal(extracted.messages[0]?.message.id, 'wamid.TEST_TEXT_001')
  })

  it('ingests normal text messages unchanged', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('text.json'),
      signatureHeader: 'sha256=dummy',
      store,
      deps: { verifySignature: () => true },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.processed, 1)
    assert.equal(result.coexistenceAcknowledged, 0)
    assert.equal(result.unknownFieldsAcknowledged, 0)
    assert.equal(store.items.length, 1)
    assert.equal(store.items[0].external_id, 'wamid.TEST_TEXT_001')
    assert.match(store.items[0].content, /Rückruf/)
  })

  it('ignores statuses without Inbox items', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('status.json'),
      signatureHeader: 'sha256=dummy',
      store,
      deps: { verifySignature: () => true },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.statusEvents, 1)
    assert.equal(result.processed, 0)
    assert.equal(store.items.length, 0)
  })

  it('does not apply allowlist filter when unset', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('text.json'),
      signatureHeader: 'sha256=dummy',
      store,
      deps: { verifySignature: () => true },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.filteredOut, 0)
    assert.equal(result.processed, 1)
  })
})
