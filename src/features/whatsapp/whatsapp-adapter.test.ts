import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { toInboundItemFromWhatsApp } from '@/features/whatsapp/lib/whatsapp-adapter'
import { verifyMetaSignature256 } from '@/features/whatsapp/lib/verify-meta-signature'
import { verifyWhatsAppWebhookSubscription } from '@/features/whatsapp/lib/verify-webhook-subscription'
import { buildWhatsAppMediaFilename } from '@/features/whatsapp/media/whatsapp-media-service'
import type { NormalizedInboundWhatsApp } from '@/features/whatsapp/types/normalized-inbound-whatsapp'
import { createHmac } from 'node:crypto'

function textMessage(
  overrides: Partial<NormalizedInboundWhatsApp> = {},
): NormalizedInboundWhatsApp {
  return {
    externalMessageId: 'wamid.ADAPTER_001',
    senderPhone: '491701234567',
    senderName: 'Max Mustermann',
    receivedAt: '2026-09-04T08:00:00.000Z',
    type: 'text',
    text: 'Hallo, bitte um Rückruf.',
    replyToExternalMessageId: null,
    media: null,
    ...overrides,
  }
}

describe('whatsapp webhook verification', () => {
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

  it('rejects wrong token', () => {
    const result = verifyWhatsAppWebhookSubscription({
      mode: 'subscribe',
      verifyToken: 'wrong',
      challenge: '123456',
      expectedToken: 'secret-token',
    })
    assert.equal(result.ok, false)
  })

  it('rejects missing params', () => {
    const result = verifyWhatsAppWebhookSubscription({
      mode: null,
      verifyToken: null,
      challenge: null,
      expectedToken: 'secret-token',
    })
    assert.equal(result.ok, false)
  })
})

describe('whatsapp signature verification', () => {
  it('accepts valid hmac sha256', () => {
    const body = '{"object":"whatsapp_business_account"}'
    const secret = 'app-secret'
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
        rawBody: '{}',
        signatureHeader: 'sha256=0000000000000000000000000000000000000000000000000000000000000000',
        appSecret: 'app-secret',
      }),
      false,
    )
  })

  it('rejects missing header', () => {
    assert.equal(
      verifyMetaSignature256({
        rawBody: '{}',
        signatureHeader: null,
        appSecret: 'app-secret',
      }),
      false,
    )
  })
})

describe('whatsapp adapter', () => {
  it('maps text sender, phone, wamid, timestamp', () => {
    const item = toInboundItemFromWhatsApp(textMessage())
    assert.equal(item.channel, 'whatsapp')
    assert.equal(item.externalId, 'wamid.ADAPTER_001')
    assert.equal(item.sender.displayName, 'Max Mustermann')
    assert.equal(item.sender.address, '491701234567')
    assert.equal(item.sender.addressKind, 'phone')
    assert.equal(item.receivedAt, '2026-09-04T08:00:00.000Z')
    assert.equal(item.content, 'Hallo, bitte um Rückruf.')
    assert.equal(item.kind, 'text')
  })

  it('stores reply context in metadata', () => {
    const item = toInboundItemFromWhatsApp(
      textMessage({ replyToExternalMessageId: 'wamid.PARENT' }),
    )
    assert.equal(item.metadata?.replyToExternalMessageId, 'wamid.PARENT')
  })

  it('maps audio media metadata', () => {
    const bytes = new TextEncoder().encode('ogg').buffer
    const item = toInboundItemFromWhatsApp(
      textMessage({
        type: 'audio',
        text: null,
        media: {
          mediaId: 'MEDIA_1',
          mimeType: 'audio/ogg',
          filename: 'sprachnachricht-MEDIA_1.ogg',
          bytes,
          sizeBytes: 3,
        },
      }),
    )
    assert.equal(item.kind, 'audio')
    assert.equal(item.attachments?.length, 1)
    assert.equal(item.attachments?.[0].filename, 'sprachnachricht-MEDIA_1.ogg')
    assert.equal(item.metadata?.whatsappMediaId, 'MEDIA_1')
  })

  it('maps unsupported type without crashing', () => {
    const item = toInboundItemFromWhatsApp(
      textMessage({
        type: 'unsupported',
        text: null,
        rawType: 'sticker',
      }),
    )
    assert.equal(item.kind, 'unknown')
    assert.match(item.content ?? '', /sticker/)
  })
})

describe('whatsapp media filename helper', () => {
  it('prefers provided filename', () => {
    assert.equal(
      buildWhatsAppMediaFilename({
        type: 'document',
        mimeType: 'application/pdf',
        filename: 'vertrag.pdf',
        mediaId: 'M1',
      }),
      'vertrag.pdf',
    )
  })

  it('names voice audio', () => {
    assert.equal(
      buildWhatsAppMediaFilename({
        type: 'audio',
        mimeType: 'audio/ogg; codecs=opus',
        mediaId: 'M2',
        voice: true,
      }),
      'sprachnachricht-M2.ogg',
    )
  })
})
