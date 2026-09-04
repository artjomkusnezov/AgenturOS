import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, beforeEach, afterEach } from 'node:test'

import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'
import { processMetaWhatsAppInboundWebhook } from '@/features/whatsapp/transport/meta/meta-whatsapp-inbound-transport'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../tests/fixtures/whatsapp',
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
}

const mediaDeps = {
  fetchMediaMetadata: async ({ mediaId }: { mediaId: string }) => ({
    mediaId,
    mimeType: mediaId.includes('AUDIO')
      ? 'audio/ogg'
      : mediaId.includes('IMAGE')
        ? 'image/jpeg'
        : 'application/pdf',
    url: `https://example.test/media/${mediaId}`,
    fileSize: 12,
    sha256: null,
  }),
  downloadMediaBytes: async () => new TextEncoder().encode('media-bytes').buffer,
}

describe('whatsapp intake integration', () => {
  const previous: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const key of [
      'INBOUND_WHATSAPP_AGENCY_ID',
      'INBOUND_WHATSAPP_ACTOR_USER_ID',
      'WHATSAPP_VERIFY_TOKEN',
      'META_APP_SECRET',
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_BUSINESS_ACCOUNT_ID',
      'WHATSAPP_SKIP_SIGNATURE_VERIFY',
    ]) {
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

  it('ingests valid text message', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('text.json'),
      signatureHeader: 'sha256=dummy',
      store,
      deps: {
        verifySignature: () => true,
      },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.processed, 1)
    assert.equal(store.items.length, 1)
    assert.equal(store.items[0].source, 'whatsapp')
    assert.equal(store.items[0].channel, 'whatsapp')
    assert.equal(store.items[0].external_id, 'wamid.TEST_TEXT_001')
    assert.match(store.items[0].content, /Rückruf/)
    const sender = store.items[0].sender as {
      displayName?: string | null
      address?: string | null
    } | null
    assert.equal(sender?.displayName, 'Max Mustermann')
    assert.equal(sender?.address, '491701234567')
  })

  it('deduplicates duplicate text message', async () => {
    const store = createMemoryInboundIntakeStore()
    const body = loadFixture('text.json')
    const deps = { verifySignature: () => true }

    const first = await processMetaWhatsAppInboundWebhook({
      rawBody: body,
      signatureHeader: 'sha256=dummy',
      store,
      deps,
    })
    const second = await processMetaWhatsAppInboundWebhook({
      rawBody: body,
      signatureHeader: 'sha256=dummy',
      store,
      deps,
    })

    assert.equal(first.success && second.success, true)
    if (!first.success || !second.success) return
    assert.equal(first.processed, 1)
    assert.equal(second.deduplicated, 1)
    assert.equal(store.items.length, 1)
  })

  it('ingests audio payload with mocked media', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('audio.json'),
      signatureHeader: 'sha256=dummy',
      store,
      deps: { verifySignature: () => true, media: mediaDeps },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.processed, 1)
    assert.equal(store.links.length, 1)
    assert.equal(store.items[0].message_kind, 'audio')
  })

  it('ingests image payload with caption', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('image.json'),
      signatureHeader: 'sha256=dummy',
      store,
      deps: { verifySignature: () => true, media: mediaDeps },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(store.items[0].message_kind, 'image')
    assert.match(store.items[0].content, /Schadenfoto/)
    assert.equal(store.links.length, 1)
  })

  it('ingests document/pdf payload', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('document.json'),
      signatureHeader: 'sha256=dummy',
      store,
      deps: { verifySignature: () => true, media: mediaDeps },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(store.items[0].message_kind, 'document')
    assert.match(store.items[0].content, /prüfen|vertrag/i)
    assert.equal(store.links.length, 1)
  })

  it('stores reply context id', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('reply.json'),
      signatureHeader: 'sha256=dummy',
      store,
      deps: { verifySignature: () => true },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(
      (store.items[0].inbound_metadata as { replyToExternalMessageId?: string })
        ?.replyToExternalMessageId,
      'wamid.TEST_TEXT_001',
    )
  })

  it('ignores statuses only without inbox items', async () => {
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

  it('handles unsupported message type without crash', async () => {
    const store = createMemoryInboundIntakeStore()
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA',
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'P1' },
                contacts: [{ wa_id: '49170', profile: { name: 'Sticker' } }],
                messages: [
                  {
                    from: '49170',
                    id: 'wamid.STICKER',
                    timestamp: '1725441000',
                    type: 'sticker',
                    sticker: { id: 'S1' },
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: JSON.stringify(payload),
      signatureHeader: 'sha256=dummy',
      store,
      deps: { verifySignature: () => true },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(store.items.length, 1)
    assert.equal(store.items[0].message_kind, 'unknown')
  })

  it('rejects malformed payload', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: '{not-json',
      signatureHeader: 'sha256=dummy',
      store,
      deps: { verifySignature: () => true },
    })

    assert.equal(result.success, false)
    if (result.success) return
    assert.equal(result.status, 400)
  })

  it('rejects invalid signature', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await processMetaWhatsAppInboundWebhook({
      rawBody: loadFixture('text.json'),
      signatureHeader: 'sha256=bad',
      store,
      deps: {
        verifySignature: () => false,
      },
    })

    assert.equal(result.success, false)
    if (result.success) return
    assert.equal(result.status, 401)
    assert.equal(store.items.length, 0)
  })
})
