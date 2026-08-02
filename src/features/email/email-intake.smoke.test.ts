import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { toInboundItemFromEmail } from '@/features/email/lib/email-adapter'
import { processResendInboundWebhook } from '@/features/email/transport/resend/resend-inbound-transport'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'
import { ingestInboundItem } from '@/features/inbound/services/inbound-intake-service'
import type { NormalizedInboundEmail } from '@/features/email/types/normalized-inbound-email'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'

function emailFixture(overrides: Partial<NormalizedInboundEmail> = {}): NormalizedInboundEmail {
  return {
    messageId: 'mail-001@example.com',
    sender: { displayName: 'Artjom', address: 'artjom@example.com' },
    receivedAt: '2026-08-08T10:00:00.000Z',
    subject: 'Unterlagen',
    plainText: 'Siehe Anhang.',
    attachments: [
      {
        filename: 'a.pdf',
        mimeType: 'application/pdf',
        bytes: new TextEncoder().encode('a').buffer,
        disposition: 'attachment',
      },
      {
        filename: 'b.pdf',
        mimeType: 'application/pdf',
        bytes: new TextEncoder().encode('b').buffer,
        disposition: 'attachment',
      },
    ],
    ...overrides,
  }
}

describe('email intake integration', () => {
  it('deduplicates by message id', async () => {
    const store = createMemoryInboundIntakeStore()
    const item = toInboundItemFromEmail(emailFixture())

    const first = await ingestInboundItem(store, {
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      item,
    })
    const second = await ingestInboundItem(store, {
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      item: toInboundItemFromEmail(emailFixture({ plainText: 'andere Version' })),
    })

    assert.equal(first.success, true)
    assert.equal(second.success, true)
    if (!first.success || !second.success) {
      return
    }

    assert.equal(second.deduplicated, true)
    assert.equal(store.items.length, 1)
  })

  it('keeps agency scope', async () => {
    const store = createMemoryInboundIntakeStore()
    const item = toInboundItemFromEmail(emailFixture({ messageId: 'shared@example.com' }))
    const otherAgency = '33333333-3333-4333-8333-333333333333'

    const a = await ingestInboundItem(store, {
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      item,
    })
    const b = await ingestInboundItem(store, {
      agencyId: otherAgency,
      actorUserId: ACTOR_ID,
      item,
    })

    assert.equal(a.success && b.success, true)
    assert.equal(store.items.length, 2)
  })

  it('links multiple attachments', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await ingestInboundItem(store, {
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      item: toInboundItemFromEmail(emailFixture()),
    })

    assert.equal(result.success, true)
    if (!result.success) {
      return
    }

    assert.equal(result.linkedFileIds.length, 2)
    assert.equal(store.links.length, 2)
    assert.equal(result.item.title, 'Unterlagen')
  })
})

describe('resend transport webhook', () => {
  it('rejects invalid signatures', async () => {
    process.env.INBOUND_EMAIL_AGENCY_ID = AGENCY_ID
    process.env.INBOUND_EMAIL_ACTOR_USER_ID = ACTOR_ID
    process.env.RESEND_API_KEY = 're_test'
    process.env.RESEND_WEBHOOK_SECRET = 'whsec_test'

    const store = createMemoryInboundIntakeStore()
    const result = await processResendInboundWebhook({
      rawBody: '{}',
      headerId: 'msg_1',
      headerTimestamp: '123',
      headerSignature: 'bad',
      store,
      deps: {
        verifyWebhook: () => {
          throw new Error('invalid')
        },
        fetchReceivedEmail: async () => {
          throw new Error('should not fetch')
        },
        fetchAttachments: async () => [],
      },
    })

    assert.equal(result.success, false)
    if (result.success) {
      return
    }
    assert.equal(result.status, 401)
  })

  it('processes a valid event and dedups retries', async () => {
    process.env.INBOUND_EMAIL_AGENCY_ID = AGENCY_ID
    process.env.INBOUND_EMAIL_ACTOR_USER_ID = ACTOR_ID
    process.env.RESEND_API_KEY = 're_test'
    process.env.RESEND_WEBHOOK_SECRET = 'whsec_test'

    const store = createMemoryInboundIntakeStore()
    const deps = {
      verifyWebhook: () => ({
        type: 'email.received',
        data: { email_id: 'email_123' },
      }),
      fetchReceivedEmail: async () => ({
        id: 'email_123',
        from: 'Artjom <artjom@example.com>',
        to: ['info@artkus.de'],
        subject: 'Test',
        created_at: '2026-08-08T11:00:00.000Z',
        message_id: '<retry-id@example.com>',
        text: 'Hallo',
        html: null,
        headers: { from: 'Artjom <artjom@example.com>' },
      }),
      fetchAttachments: async () => [],
    }

    const first = await processResendInboundWebhook({
      rawBody: '{}',
      headerId: 'msg_1',
      headerTimestamp: '123',
      headerSignature: 'sig',
      store,
      deps,
    })
    const second = await processResendInboundWebhook({
      rawBody: '{}',
      headerId: 'msg_2',
      headerTimestamp: '124',
      headerSignature: 'sig',
      store,
      deps,
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
