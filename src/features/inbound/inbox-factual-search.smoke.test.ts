/**
 * Deterministic factual search across unified inbound working copies.
 * Name, contact, phone formats and original text only — no mutation or AI.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  buildInboxSearchExcerpt,
  collectInboxSearchFields,
  filterInboxItemsBySearch,
  inboxSearchDoesNotMutate,
  INBOX_SEARCH_CLEAR_LABEL,
  INBOX_SEARCH_FIELD_LABELS,
  INBOX_SEARCH_NAV_LABEL,
  INBOX_SEARCH_NO_MUTATION_NOTE,
  INBOX_SEARCH_NO_RESULTS_HINT,
  INBOX_SEARCH_NO_RESULTS_TITLE,
  INBOX_SEARCH_PARAM,
  matchInboxItemSearch,
  matchesInboxSearchQuery,
  normalizeInboxSearchPhone,
  parseInboxSearchQuery,
} from '@/features/inbox/lib/inbox-factual-search'
import { filterInboxItemsByWorkQueue } from '@/features/inbox/lib/inbox-factual-work-queue'
import { presentInboxManualReviewHistory } from '@/features/inbox/lib/inbox-manual-review-history'
import { presentAuthenticatedKfzInbox } from '@/features/inbox/lib/present-authenticated-kfz-inbox'
import { presentUnifiedInboxCard } from '@/features/inbox/lib/present-unified-inbox-card'
import { buildInboxHref } from '@/features/inbox/lib/kfz-work-queue'
import {
  UNIFIED_INBOX_PREVIEW_CONTACTED_EMAIL_ID,
  UNIFIED_INBOX_PREVIEW_DONE_PHONE_ID,
  UNIFIED_INBOX_PREVIEW_EMAIL_ID,
  UNIFIED_INBOX_PREVIEW_NOTE_ID,
  UNIFIED_INBOX_PREVIEW_PATH,
  UNIFIED_INBOX_PREVIEW_PHONE_ID,
  UNIFIED_INBOX_PREVIEW_TODAY_LANDING_ID,
  buildUnifiedInboxPreviewItems,
} from '@/features/inbox/lib/unified-inbox-preview'
import {
  KFZ_WORK_QUEUE_PREVIEW_NEW_ID,
} from '@/features/inbox/lib/kfz-work-queue-preview'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import {
  buildKfzLandingPayload,
  type KfzLandingFormValues,
} from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'
import { confirmManualCapture } from '@/features/inbound/manual/services/confirm-manual-capture'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const SECRET = 'test-factual-search-secret'
const NOW = new Date('2026-09-09T12:00:00.000Z')

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

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
    contextNotes: 'Kennzeichen OS-AB 1234 liegt vor.',
    ...overrides,
  }
}

function withKfzEnv(run: () => Promise<void>): Promise<void> {
  const prev = {
    agency: process.env.INBOUND_KFZ_AGENCY_ID,
    actor: process.env.INBOUND_KFZ_ACTOR_USER_ID,
    secret: process.env.INBOUND_KFZ_INTAKE_SECRET,
  }

  process.env.INBOUND_KFZ_AGENCY_ID = AGENCY_ID
  process.env.INBOUND_KFZ_ACTOR_USER_ID = ACTOR_ID
  process.env.INBOUND_KFZ_INTAKE_SECRET = SECRET

  return run().finally(() => {
    if (prev.agency === undefined) delete process.env.INBOUND_KFZ_AGENCY_ID
    else process.env.INBOUND_KFZ_AGENCY_ID = prev.agency
    if (prev.actor === undefined) delete process.env.INBOUND_KFZ_ACTOR_USER_ID
    else process.env.INBOUND_KFZ_ACTOR_USER_ID = prev.actor
    if (prev.secret === undefined) delete process.env.INBOUND_KFZ_INTAKE_SECRET
    else process.env.INBOUND_KFZ_INTAKE_SECRET = prev.secret
  })
}

function landingRequest(payload: unknown): Request {
  return new Request('http://localhost/api/inbound/kfz', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

async function submitLandingToInbox(
  values: KfzLandingFormValues,
  submissionId: string,
): Promise<InboxItem> {
  const built = buildKfzLandingPayload({
    values,
    submissionId,
    consentTimestamp: '2026-09-09T08:00:00.000Z',
  })
  assert.equal(built.ok, true)
  if (!built.ok) {
    throw new Error('expected landing payload')
  }

  const store = createMemoryInboundIntakeStore()
  const result = await handleKfzInboundHttpRequest(landingRequest(built.payload), {
    store,
  })
  assert.equal(result.ok, true)
  if (!result.ok) {
    throw new Error('expected HTTP success')
  }
  return store.items[0]
}

function previewItems(now = NOW): InboxItem[] {
  const preview = buildUnifiedInboxPreviewItems(now)
  return [...preview.unprocessedItems, ...preview.processedItems]
}

function snapshotIdentity(item: InboxItem) {
  return {
    id: item.id,
    content: item.content,
    processed_at: item.processed_at,
    inbound_metadata: item.inbound_metadata,
    title: item.title,
    sender: item.sender,
    origin: item.origin,
  }
}

describe('factual search query parsing and phone formats', () => {
  it('collapses case, spaces and unknown values without guessing identity', () => {
    assert.equal(parseInboxSearchQuery(undefined), '')
    assert.equal(parseInboxSearchQuery('   '), '')
    assert.equal(parseInboxSearchQuery('  Max   Mustermann '), 'Max Mustermann')
    assert.equal(INBOX_SEARCH_PARAM, 'q')
    assert.equal(INBOX_SEARCH_NAV_LABEL, 'Eingang durchsuchen')
    assert.equal(INBOX_SEARCH_CLEAR_LABEL, 'Suche leeren')
    assert.equal(INBOX_SEARCH_NO_RESULTS_TITLE, 'Kein Treffer')
    assert.match(INBOX_SEARCH_NO_RESULTS_HINT, /nichts wird automatisch angelegt/i)
    assert.match(INBOX_SEARCH_NO_MUTATION_NOTE, /ändert keinen Status/)
    assert.equal(INBOX_SEARCH_FIELD_LABELS.customerName, 'Name')
    assert.equal(INBOX_SEARCH_FIELD_LABELS.originalText, 'Originaltext')
  })

  it('normalizes common phone formats to the same digits', () => {
    assert.equal(normalizeInboxSearchPhone('+49 170 1234567'), '491701234567')
    assert.equal(normalizeInboxSearchPhone('0170 1234567'), '491701234567')
    assert.equal(normalizeInboxSearchPhone('0170-1234567'), '491701234567')
    assert.equal(normalizeInboxSearchPhone('0049 170 1234567'), '491701234567')
    assert.equal(normalizeInboxSearchPhone('(0170) 1234567'), '491701234567')
  })
})

describe('factual search across inbound sources', () => {
  it('finds a landing inquiry by name, phone format, city and vehicle fact', async () => {
    await withKfzEnv(async () => {
      const landing = await submitLandingToInbox(baseValues(), 'lp-search-landing')
      const before = snapshotIdentity(landing)

      assert.equal(matchesInboxSearchQuery(landing, 'max mustermann'), true)
      assert.equal(matchesInboxSearchQuery(landing, 'MAX  MUSTERMANN'), true)
      assert.equal(matchesInboxSearchQuery(landing, '0170 1234567'), true)
      assert.equal(matchesInboxSearchQuery(landing, '+49 170 1234567'), true)
      assert.equal(matchesInboxSearchQuery(landing, '49525'), true)
      assert.equal(matchesInboxSearchQuery(landing, 'Lengerich'), true)
      assert.equal(matchesInboxSearchQuery(landing, 'Golf'), true)
      assert.equal(matchesInboxSearchQuery(landing, 'OS-AB 1234'), true)

      const nameHit = matchInboxItemSearch(landing, 'Mustermann')
      assert.equal(nameHit?.primaryMatch.fieldId, 'customerName')
      assert.match(nameHit?.primaryMatch.excerpt ?? '', /Mustermann/)

      const phoneHit = matchInboxItemSearch(landing, '0170 1234567')
      assert.equal(phoneHit?.primaryMatch.fieldId, 'phone')
      assert.match(phoneHit?.primaryMatch.excerpt ?? '', /491701234567|\+491701234567/)

      const vehicleHit = matchInboxItemSearch(landing, 'Golf')
      assert.ok(
        vehicleHit?.matches.some((match) => match.fieldId === 'vehicle' || match.fieldId === 'summary'),
      )

      assert.deepEqual(snapshotIdentity(landing), before)
      assert.deepEqual(inboxSearchDoesNotMutate().mutated, {
        content: false,
        processed: false,
        task: false,
        contacted: false,
        status: false,
      })
    })
  })

  it('finds phone, pasted email and note items by visible contact or original text', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const phone = await confirmManualCapture({
        store,
        agencyId: AGENCY_ID,
        actorUserId: ACTOR_ID,
        capture: {
          sourceText: [
            'Rückruf Kunde Berger',
            'Bitte wegen bestehender Haftpflicht anrufen.',
            'Telefon: +491701112233',
          ].join('\n'),
          originKind: 'phone_call',
          title: 'Rückruf Berger',
          origin: {
            displayName: 'Kunde Berger',
            address: '+491701112233',
            addressKind: 'phone',
          },
          capturedAt: '2026-09-08T09:10:00.000Z',
          externalId: 'manual:search-phone',
        },
      })
      const email = await confirmManualCapture({
        store,
        agencyId: AGENCY_ID,
        actorUserId: ACTOR_ID,
        capture: {
          sourceText: [
            'Von: lisa@example.com',
            'Betreff: Unterlagen Wohngebäude',
            'Anbei die angeforderten Unterlagen zur Wohngebäudeversicherung.',
          ].join('\n'),
          originKind: 'pasted_email',
          title: 'Unterlagen Wohngebäude',
          origin: {
            displayName: 'Lisa Beispiel',
            address: 'lisa@example.com',
            addressKind: 'email',
          },
          capturedAt: '2026-09-08T09:20:00.000Z',
          externalId: 'manual:search-email',
        },
      })
      const note = await confirmManualCapture({
        store,
        agencyId: AGENCY_ID,
        actorUserId: ACTOR_ID,
        capture: {
          sourceText: 'Eigene Notiz: morgen Akte Schmidt auf Vollständigkeit prüfen.',
          originKind: 'personal_note',
          title: 'Akte Schmidt prüfen',
          capturedAt: '2026-09-08T09:30:00.000Z',
          externalId: 'manual:search-note',
        },
      })

      assert.equal(phone.success && email.success && note.success, true)
      if (!phone.success || !email.success || !note.success) {
        return
      }

      const phoneBefore = snapshotIdentity(phone.item)
      const emailBefore = snapshotIdentity(email.item)
      const noteBefore = snapshotIdentity(note.item)

      const phoneHit = matchInboxItemSearch(phone.item, 'Haftpflicht')
      assert.ok(phoneHit)
      assert.ok(
        phoneHit.matches.some(
          (match) => match.fieldId === 'originalText' || match.fieldId === 'summary',
        ),
      )
      assert.match(phoneHit.primaryMatch.excerpt, /Haftpflicht/)
      assert.equal(matchesInboxSearchQuery(phone.item, '0170 1112233'), true)

      const emailHit = matchInboxItemSearch(email.item, 'lisa@example.com')
      assert.ok(emailHit)
      assert.equal(emailHit.primaryMatch.fieldId, 'email')
      const emailTextHit = matchInboxItemSearch(email.item, 'Wohngebäude')
      assert.ok(emailTextHit)
      assert.ok(
        emailTextHit.matches.some(
          (match) => match.fieldId === 'originalText' || match.fieldId === 'request',
        ),
      )

      const noteHit = matchInboxItemSearch(note.item, 'schmidt')
      assert.ok(noteHit)
      assert.match(noteHit.primaryMatch.excerpt, /Schmidt/i)

      assert.deepEqual(snapshotIdentity(phone.item), phoneBefore)
      assert.deepEqual(snapshotIdentity(email.item), emailBefore)
      assert.deepEqual(snapshotIdentity(note.item), noteBefore)
    })
  })

  it('searches preview landing, phone, email and note without a parallel store', () => {
    const items = previewItems()
    const landing = filterInboxItemsBySearch(items, 'Heute Landing')
    assert.ok(landing.some((item) => item.id === UNIFIED_INBOX_PREVIEW_TODAY_LANDING_ID))
    assert.ok(landing.some((item) => item.id === KFZ_WORK_QUEUE_PREVIEW_NEW_ID) === false)

    const phone = filterInboxItemsBySearch(items, 'Berger')
    assert.deepEqual(
      phone.map((item) => item.id),
      [UNIFIED_INBOX_PREVIEW_PHONE_ID],
    )

    const email = filterInboxItemsBySearch(items, 'lisa@example.com')
    assert.ok(email.some((item) => item.id === UNIFIED_INBOX_PREVIEW_EMAIL_ID))

    const note = filterInboxItemsBySearch(items, 'Akte Schmidt')
    assert.ok(note.some((item) => item.id === UNIFIED_INBOX_PREVIEW_NOTE_ID))

    const fields = collectInboxSearchFields(
      items.find((item) => item.id === UNIFIED_INBOX_PREVIEW_TODAY_LANDING_ID)!,
    )
    assert.ok(fields.some((field) => field.id === 'customerName' && /Heute Landing/.test(field.value)))
    assert.ok(fields.some((field) => field.id === 'vehicle' && /Golf/.test(field.value)))
    assert.ok(!fields.some((field) => /secret|service.role|api key/i.test(field.value)))
  })
})

describe('factual search combined with filters, empty and clear', () => {
  it('intersects search with Noch nicht kontaktiert and keeps time groups intact', () => {
    const items = previewItems()
    const neverContacted = filterInboxItemsByWorkQueue(items, 'never_contacted')
    const searched = filterInboxItemsBySearch(neverContacted, 'Wohngebäude')

    assert.ok(searched.some((item) => item.id === UNIFIED_INBOX_PREVIEW_EMAIL_ID))
    assert.ok(!searched.some((item) => item.id === UNIFIED_INBOX_PREVIEW_CONTACTED_EMAIL_ID))
    assert.ok(!searched.some((item) => item.id === UNIFIED_INBOX_PREVIEW_DONE_PHONE_ID))
  })

  it('returns no results for unknown text and keeps the prior filter URL when cleared', () => {
    const items = previewItems()
    const none = filterInboxItemsBySearch(items, 'xyz-kein-treffer-123')
    assert.deepEqual(none, [])
    assert.equal(matchesInboxSearchQuery(items[0]!, 'xyz-kein-treffer-123'), false)

    const filteredHref = buildInboxHref({
      queue: 'never_contacted',
      q: 'Berger',
      basePath: UNIFIED_INBOX_PREVIEW_PATH,
    })
    assert.match(filteredHref, /queue=never_contacted/)
    assert.match(filteredHref, /q=Berger/)

    const clearedHref = buildInboxHref({
      queue: 'never_contacted',
      q: '',
      basePath: UNIFIED_INBOX_PREVIEW_PATH,
    })
    assert.equal(clearedHref, `${UNIFIED_INBOX_PREVIEW_PATH}?queue=never_contacted`)
    assert.doesNotMatch(clearedHref, /[?&]q=/)
  })

  it('preserves search, filter and item on open, return and reload hrefs', () => {
    const openHref = buildInboxHref({
      itemId: UNIFIED_INBOX_PREVIEW_PHONE_ID,
      queue: 'never_contacted',
      q: 'Berger',
      basePath: UNIFIED_INBOX_PREVIEW_PATH,
    })
    const params = new URL(openHref, 'http://localhost').searchParams
    assert.equal(params.get('item'), UNIFIED_INBOX_PREVIEW_PHONE_ID)
    assert.equal(params.get('queue'), 'never_contacted')
    assert.equal(parseInboxSearchQuery(params.get('q')), 'Berger')

    const returnHref = buildInboxHref({
      queue: params.get('queue'),
      q: params.get('q'),
      basePath: UNIFIED_INBOX_PREVIEW_PATH,
    })
    const reloaded = new URL(returnHref, 'http://localhost').searchParams
    assert.equal(reloaded.get('queue'), 'never_contacted')
    assert.equal(parseInboxSearchQuery(reloaded.get('q')), 'Berger')
    assert.equal(reloaded.get('item'), null)

    const view = presentAuthenticatedKfzInbox({
      unprocessedItems: buildUnifiedInboxPreviewItems(NOW).unprocessedItems,
      processedItems: buildUnifiedInboxPreviewItems(NOW).processedItems,
      queue: 'never_contacted',
      q: 'Berger',
      now: NOW,
    })
    assert.equal(view.searchQuery, 'Berger')
    assert.equal(view.queueFilter, 'never_contacted')
    assert.ok(view.workQueueFilterHrefs.never_contacted.includes('q=Berger'))
    assert.ok(view.cards.every((card) => card.href.includes('q=Berger')))
    assert.ok(view.cards.some((card) => card.itemId === UNIFIED_INBOX_PREVIEW_PHONE_ID))
    assert.ok(!view.cards.some((card) => card.itemId === UNIFIED_INBOX_PREVIEW_CONTACTED_EMAIL_ID))
  })

  it('search never changes status, history or working-copy content', () => {
    const items = previewItems()
    const phone = items.find((item) => item.id === UNIFIED_INBOX_PREVIEW_PHONE_ID)
    assert.ok(phone)
    const beforeHistory = presentInboxManualReviewHistory(phone)
    const beforeCard = presentUnifiedInboxCard(phone, { now: NOW })
    const before = snapshotIdentity(phone)

    filterInboxItemsBySearch(items, 'Berger')
    matchInboxItemSearch(phone, '0170 1112233')
    buildInboxSearchExcerpt(phone.content, 'Berger')

    assert.deepEqual(snapshotIdentity(phone), before)
    assert.deepEqual(
      presentInboxManualReviewHistory(phone).events.map((event) => event.kind),
      beforeHistory.events.map((event) => event.kind),
    )
    assert.equal(
      presentUnifiedInboxCard(phone, { now: NOW }).workQueue.explicitStatus,
      beforeCard.workQueue.explicitStatus,
    )
    assert.equal(
      presentUnifiedInboxCard(phone, { now: NOW }).workQueue.hasContactedHistoryEvent,
      beforeCard.workQueue.hasContactedHistoryEvent,
    )
    assert.equal(inboxSearchDoesNotMutate().noExternalSideEffect, true)
  })
})

describe('factual search stays on the existing inbox path', () => {
  it('wires one search field onto the existing inbox without a CRM store', () => {
    const inboxPage = fs.readFileSync(path.join(srcRoot, 'app/app/inbox/page.tsx'), 'utf8')
    assert.match(inboxPage, /searchQuery=\{inboxView.searchQuery\}/)
    assert.match(inboxPage, /\bq\b/)
    assert.doesNotMatch(inboxPage, /unified-inbox-preview|\/dev\/inbox/)

    const previewPage = fs.readFileSync(path.join(srcRoot, 'app/dev/inbox/page.tsx'), 'utf8')
    assert.match(previewPage, /q=\{q\}/)

    const list = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/components/inbox-list.tsx'),
      'utf8',
    )
    assert.match(list, /InboxFactualSearchField/)
    assert.match(list, /INBOX_SEARCH_NO_RESULTS_TITLE/)
    assert.match(list, /MANUAL_CAPTURE_ACTION_LABEL/)
    assert.doesNotMatch(list, /<table/)

    const search = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/lib/inbox-factual-search.ts'),
      'utf8',
    )
    assert.doesNotMatch(search, /fuse\.js|levenshtein|openai|mergeDuplicates/i)
    assert.doesNotMatch(search, /whatsapp-outbound|resend|mark_contacted|create_follow_up/)
  })
})
