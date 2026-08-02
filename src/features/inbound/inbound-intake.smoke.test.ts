import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { ingestInboundItem } from '@/features/inbound/services/inbound-intake-service'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'
import type { InboundItem } from '@/features/inbound/types/inbound-item'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'

/** Quellartige Fixture — kein echter WhatsApp-Adapter. */
function sourceLikeWhatsapp(overrides: Partial<InboundItem> = {}): InboundItem {
  return {
    channel: 'whatsapp',
    externalId: 'wamid.test-001',
    sender: {
      displayName: 'Kunde Muster',
      address: '+491701234567',
      addressKind: 'phone',
    },
    receivedAt: '2026-08-07T18:00:00.000Z',
    kind: 'text',
    content: 'Hallo, bitte Angebot prüfen.',
    metadata: { fixture: 'whatsapp-like' },
    ...overrides,
  }
}

/** Quellartige Fixture — kein echter Outlook-Adapter. */
function sourceLikeEmail(overrides: Partial<InboundItem> = {}): InboundItem {
  return {
    channel: 'email',
    externalId: 'msg-outlook-abc',
    sender: {
      displayName: 'Vera Beispiel',
      address: 'vera@example.com',
      addressKind: 'email',
    },
    receivedAt: '2026-08-07T19:00:00.000Z',
    kind: 'document',
    content: 'Anbei die Unterlagen.',
    attachments: [
      {
        filename: 'unterlagen.pdf',
        mimeType: 'application/pdf',
        bytes: new TextEncoder().encode('pdf').buffer,
      },
    ],
    ...overrides,
  }
}

/** Quellartige Fixture Formular — zeigt, dass der Kern keine Message braucht. */
function sourceLikeForm(overrides: Partial<InboundItem> = {}): InboundItem {
  return {
    channel: 'manual',
    externalId: 'form-landing-42',
    sender: {
      displayName: 'Webbesucher',
      address: 'lead@example.com',
      addressKind: 'email',
    },
    receivedAt: '2026-08-07T20:00:00.000Z',
    kind: 'text',
    content: 'Bitte Rückruf wegen Versicherung.',
    metadata: { fixture: 'form-like' },
    ...overrides,
  }
}

describe('inbound intake service', () => {
  it('creates an inbox item from a whatsapp-like source item', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await ingestInboundItem(store, {
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      item: sourceLikeWhatsapp(),
    })

    assert.equal(result.success, true)
    if (!result.success) {
      return
    }

    assert.equal(result.deduplicated, false)
    assert.equal(result.item.source, 'whatsapp')
    assert.equal(result.item.channel, 'whatsapp')
    assert.equal(result.item.external_id, 'wamid.test-001')
    assert.equal(result.item.content, 'Hallo, bitte Angebot prüfen.')
    assert.equal(result.item.agency_id, AGENCY_ID)
    assert.equal(result.item.user_id, ACTOR_ID)
    assert.equal((result.item.sender as { displayName?: string }).displayName, 'Kunde Muster')
    assert.equal(store.items.length, 1)
  })

  it('deduplicates the same channel + externalId', async () => {
    const store = createMemoryInboundIntakeStore()
    const item = sourceLikeWhatsapp()

    const first = await ingestInboundItem(store, {
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      item,
    })
    const second = await ingestInboundItem(store, {
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      item: sourceLikeWhatsapp({ content: 'andere Version' }),
    })

    assert.equal(first.success, true)
    assert.equal(second.success, true)
    if (!first.success || !second.success) {
      return
    }

    assert.equal(second.deduplicated, true)
    assert.equal(second.item.id, first.item.id)
    assert.equal(store.items.length, 1)
    assert.equal(store.items[0].content, 'Hallo, bitte Angebot prüfen.')
  })

  it('ingests an email-like source item through the same core', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await ingestInboundItem(store, {
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      item: sourceLikeEmail(),
    })

    assert.equal(result.success, true)
    if (!result.success) {
      return
    }

    assert.equal(result.item.channel, 'email')
    assert.equal(result.item.source, 'email')
    assert.equal(result.linkedFileIds.length, 1)
    assert.equal(store.links.length, 1)
    assert.equal(store.links[0].inboxItemId, result.item.id)
  })

  it('ingests a form-like source item through the same core', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await ingestInboundItem(store, {
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      item: sourceLikeForm(),
    })

    assert.equal(result.success, true)
    if (!result.success) {
      return
    }

    assert.equal(result.item.channel, 'manual')
    assert.equal(result.item.source, 'manual_text')
    assert.equal(result.item.external_id, 'form-landing-42')
    assert.equal(result.item.content, 'Bitte Rückruf wegen Versicherung.')
  })

  it('keeps agency scope on dedup keys', async () => {
    const store = createMemoryInboundIntakeStore()
    const otherAgency = '33333333-3333-4333-8333-333333333333'
    const item = sourceLikeWhatsapp({ externalId: 'shared-ext-id' })

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

    assert.equal(a.success, true)
    assert.equal(b.success, true)
    if (!a.success || !b.success) {
      return
    }

    assert.equal(a.deduplicated, false)
    assert.equal(b.deduplicated, false)
    assert.notEqual(a.item.id, b.item.id)
    assert.equal(store.items.length, 2)
  })
})
