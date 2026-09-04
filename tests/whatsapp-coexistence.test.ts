import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'
import {
  classifyMetaWhatsAppWebhook,
  classifyMetaWhatsAppWebhookField,
} from '@/features/whatsapp/transport/meta/classify-meta-webhook'
import { processMetaWhatsAppInboundWebhook } from '@/features/whatsapp/transport/meta/meta-whatsapp-inbound-transport'
import {
  isWhatsAppWebhookEntryAllowed,
  parseOptionalIdAllowlist,
} from '@/features/whatsapp/lib/webhook-entry-filter'
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

function loadFixtureJson(name: string): MetaWhatsAppWebhookPayload {
  return JSON.parse(loadFixture(name)) as MetaWhatsAppWebhookPayload
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

describe('whatsapp coexistence classification', () => {
  it('maps known coexistence and unknown fields', () => {
    assert.equal(classifyMetaWhatsAppWebhookField('messages'), 'messages')
    assert.equal(
      classifyMetaWhatsAppWebhookField('smb_message_echoes'),
      'smb_message_echoes',
    )
    assert.equal(classifyMetaWhatsAppWebhookField('history'), 'history')
    assert.equal(
      classifyMetaWhatsAppWebhookField('smb_app_state_sync'),
      'smb_app_state_sync',
    )
    assert.equal(
      classifyMetaWhatsAppWebhookField('account_update'),
      'account_update',
    )
    assert.equal(classifyMetaWhatsAppWebhookField('weird'), 'unknown')
    assert.equal(classifyMetaWhatsAppWebhookField(null), 'unknown')
  })

  it('models smb_message_echoes distinctly without inbox semantics', () => {
    const classified = classifyMetaWhatsAppWebhook(
      loadFixtureJson('smb_message_echoes.json'),
    )
    assert.equal(classified.changeCounts.smb_message_echoes, 1)
    assert.equal(classified.coexistenceEvents.length, 1)
    assert.equal(classified.coexistenceEvents[0]?.kind, 'smb_message_echoes')
    if (classified.coexistenceEvents[0]?.kind === 'smb_message_echoes') {
      assert.equal(classified.coexistenceEvents[0].echoCount, 1)
    }
    assert.equal(classified.totalMessageCount, 0)
  })

  it('models history as backfill chunks', () => {
    const classified = classifyMetaWhatsAppWebhook(loadFixtureJson('history.json'))
    assert.equal(classified.changeCounts.history, 1)
    assert.equal(classified.coexistenceEvents[0]?.kind, 'history')
    if (classified.coexistenceEvents[0]?.kind === 'history') {
      assert.equal(classified.coexistenceEvents[0].historyChunkCount, 1)
    }
  })

  it('models smb_app_state_sync as state-sync metadata', () => {
    const classified = classifyMetaWhatsAppWebhook(
      loadFixtureJson('smb_app_state_sync.json'),
    )
    assert.equal(classified.changeCounts.smb_app_state_sync, 1)
    assert.equal(classified.coexistenceEvents[0]?.kind, 'smb_app_state_sync')
    if (classified.coexistenceEvents[0]?.kind === 'smb_app_state_sync') {
      assert.equal(classified.coexistenceEvents[0].stateSyncCount, 1)
    }
  })
})

describe('whatsapp coexistence intake safety', () => {
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

  it('acknowledges smb_message_echoes with HTTP success and no Inbox items', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('smb_message_echoes.json'),
      signatureHeader: 'sha256=dummy',
      store,
      deps: { verifySignature: () => true },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.processed, 0)
    assert.equal(result.coexistenceAcknowledged, 1)
    assert.equal(store.items.length, 0)
  })

  it('acknowledges history without flooding Inbox', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('history.json'),
      signatureHeader: 'sha256=dummy',
      store,
      deps: { verifySignature: () => true },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.processed, 0)
    assert.equal(result.coexistenceAcknowledged, 1)
    assert.equal(store.items.length, 0)
  })

  it('acknowledges smb_app_state_sync without Inbox items', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('smb_app_state_sync.json'),
      signatureHeader: 'sha256=dummy',
      store,
      deps: { verifySignature: () => true },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.processed, 0)
    assert.equal(result.coexistenceAcknowledged, 1)
    assert.equal(store.items.length, 0)
  })

  it('acknowledges account_update without Inbox items', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('account_update.json'),
      signatureHeader: 'sha256=dummy',
      store,
      deps: { verifySignature: () => true },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.coexistenceAcknowledged, 1)
    assert.equal(store.items.length, 0)
  })

  it('acknowledges unknown webhook fields safely', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('unknown_field.json'),
      signatureHeader: 'sha256=dummy',
      store,
      deps: { verifySignature: () => true },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.unknownFieldsAcknowledged, 1)
    assert.equal(result.processed, 0)
    assert.equal(store.items.length, 0)
  })

  it('processes normal messages and acks echoes in a mixed payload', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('mixed_messages_and_echoes.json'),
      signatureHeader: 'sha256=dummy',
      store,
      deps: { verifySignature: () => true },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.processed, 1)
    assert.equal(result.coexistenceAcknowledged, 1)
    assert.equal(store.items.length, 1)
    assert.equal(store.items[0].external_id, 'wamid.TEST_MIXED_MSG_001')
  })

  it('preserves HMAC rejection for coexistence payloads', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('smb_message_echoes.json'),
      signatureHeader: 'sha256=bad',
      store,
      deps: { verifySignature: () => false },
    })

    assert.equal(result.success, false)
    if (result.success) return
    assert.equal(result.status, 401)
    assert.equal(store.items.length, 0)
  })
})

describe('whatsapp optional webhook allowlist seam', () => {
  it('parses empty allowlist as no filter', () => {
    assert.deepEqual(parseOptionalIdAllowlist(undefined), [])
    assert.deepEqual(parseOptionalIdAllowlist(''), [])
    assert.deepEqual(parseOptionalIdAllowlist('  a , b '), ['a', 'b'])
  })

  it('allows all when allowlists are empty', () => {
    assert.equal(
      isWhatsAppWebhookEntryAllowed({
        wabaId: 'ANY',
        phoneNumberId: 'ANY',
        allowedWabaIds: [],
        allowedPhoneNumberIds: [],
      }),
      true,
    )
  })

  it('rejects mismatched waba when allowlist set', () => {
    assert.equal(
      isWhatsAppWebhookEntryAllowed({
        wabaId: 'OTHER',
        phoneNumberId: null,
        allowedWabaIds: ['ALLOWED_WABA'],
        allowedPhoneNumberIds: [],
      }),
      false,
    )
    assert.equal(
      isWhatsAppWebhookEntryAllowed({
        wabaId: 'ALLOWED_WABA',
        phoneNumberId: null,
        allowedWabaIds: ['ALLOWED_WABA'],
        allowedPhoneNumberIds: [],
      }),
      true,
    )
  })
})
