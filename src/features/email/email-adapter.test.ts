import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { toInboundItemFromEmail } from '@/features/email/lib/email-adapter'
import { htmlToPlainText } from '@/features/email/lib/html-to-plain-text'
import { normalizeMessageId } from '@/features/email/lib/normalize-message-id'
import type { NormalizedInboundEmail } from '@/features/email/types/normalized-inbound-email'

function baseEmail(overrides: Partial<NormalizedInboundEmail> = {}): NormalizedInboundEmail {
  return {
    messageId: '<abc@example.com>',
    sender: { displayName: 'Artjom', address: 'artjom@example.com' },
    receivedAt: '2026-08-08T10:00:00.000Z',
    subject: 'Angebot',
    plainText: 'Bitte prüfen.',
    ...overrides,
  }
}

describe('email adapter', () => {
  it('maps a normal text email', () => {
    const item = toInboundItemFromEmail(baseEmail())
    assert.equal(item.channel, 'email')
    assert.equal(item.externalId, 'abc@example.com')
    assert.equal(item.title, 'Angebot')
    assert.equal(item.content, 'Bitte prüfen.')
    assert.equal(item.sender.address, 'artjom@example.com')
    assert.equal(item.kind, 'text')
  })

  it('keeps subject-only emails via title', () => {
    const item = toInboundItemFromEmail(
      baseEmail({
        plainText: null,
        html: null,
        subject: 'Nur Betreff',
      }),
    )
    assert.equal(item.title, 'Nur Betreff')
    assert.equal(item.content, '')
  })

  it('converts html-only bodies to plain text', () => {
    const item = toInboundItemFromEmail(
      baseEmail({
        plainText: null,
        html: '<p>Hallo <strong>Welt</strong></p>',
      }),
    )
    assert.match(item.content ?? '', /Hallo/)
    assert.doesNotMatch(item.content ?? '', /<strong>/)
  })

  it('keeps pdf attachments', () => {
    const item = toInboundItemFromEmail(
      baseEmail({
        attachments: [
          {
            filename: 'angebot.pdf',
            mimeType: 'application/pdf',
            bytes: new TextEncoder().encode('pdf').buffer,
            disposition: 'attachment',
          },
        ],
      }),
    )
    assert.equal(item.attachments?.length, 1)
    assert.equal(item.attachments?.[0].filename, 'angebot.pdf')
  })

  it('keeps image attachments', () => {
    const item = toInboundItemFromEmail(
      baseEmail({
        plainText: null,
        subject: null,
        attachments: [
          {
            filename: 'foto.jpg',
            mimeType: 'image/jpeg',
            bytes: new TextEncoder().encode('img').buffer,
            disposition: 'attachment',
          },
        ],
      }),
    )
    assert.equal(item.attachments?.length, 1)
    assert.equal(item.kind, 'image')
  })

  it('skips inline cid images', () => {
    const item = toInboundItemFromEmail(
      baseEmail({
        attachments: [
          {
            filename: 'cid.png',
            mimeType: 'image/png',
            bytes: new TextEncoder().encode('img').buffer,
            disposition: 'inline',
            contentId: 'img001',
          },
          {
            filename: 'vertrag.pdf',
            mimeType: 'application/pdf',
            bytes: new TextEncoder().encode('pdf').buffer,
            disposition: 'attachment',
          },
        ],
      }),
    )
    assert.equal(item.attachments?.length, 1)
    assert.equal(item.attachments?.[0].filename, 'vertrag.pdf')
  })

  it('maps origin when present', () => {
    const item = toInboundItemFromEmail(
      baseEmail({
        origin: { displayName: 'Max Müller', address: 'max@example.com' },
      }),
    )
    assert.equal(item.origin?.address, 'max@example.com')
    assert.equal(item.origin?.displayName, 'Max Müller')
  })

  it('allows missing origin', () => {
    const item = toInboundItemFromEmail(baseEmail({ origin: null }))
    assert.equal(item.origin, null)
  })

  it('normalizes message ids', () => {
    assert.equal(normalizeMessageId('<id@host>'), 'id@host')
    assert.equal(toInboundItemFromEmail(baseEmail({ messageId: '<x@y.z>' })).externalId, 'x@y.z')
  })

  it('strips html helpers safely', () => {
    assert.equal(htmlToPlainText('<p>A&amp;B</p>'), 'A&B')
  })
})
