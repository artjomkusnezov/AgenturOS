/**
 * Exact normalized duplicate review on inbound working copies.
 * Phone, email, plate and reference only — no name/fuzzy/AI, no auto mutation.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  applyInboxDuplicateDecisionToItems,
  collectInboxExactIdentityTokens,
  extractInboxDuplicatePlates,
  inboxDuplicateDecisionDoesNotMutate,
  INBOX_DUPLICATE_DISMISS_LABEL,
  INBOX_DUPLICATE_HINT,
  INBOX_DUPLICATE_NO_AUTO_DECISION,
  INBOX_DUPLICATE_RELATE_LABEL,
  INBOX_DUPLICATE_SECTION_LABEL,
  INBOX_DUPLICATE_UNLINK_LABEL,
  matchInboxExactIdentityTokens,
  normalizeInboxDuplicateEmail,
  normalizeInboxDuplicatePhone,
  normalizeInboxDuplicatePlate,
  normalizeInboxDuplicateReference,
  presentInboxDuplicateReview,
} from '@/features/inbox/lib/inbox-exact-duplicate-review'
import { presentInboxManualReviewHistory } from '@/features/inbox/lib/inbox-manual-review-history'
import { presentInboxWorkQueueFacts } from '@/features/inbox/lib/inbox-factual-work-queue'
import { presentAuthenticatedKfzInbox } from '@/features/inbox/lib/present-authenticated-kfz-inbox'
import { buildInboxHref } from '@/features/inbox/lib/kfz-work-queue'
import {
  KFZ_WORK_QUEUE_PREVIEW_DONE_ID,
  KFZ_WORK_QUEUE_PREVIEW_NEW_ID,
  KFZ_WORK_QUEUE_PREVIEW_REVIEW_ID,
} from '@/features/inbox/lib/kfz-work-queue-preview'
import {
  UNIFIED_INBOX_PREVIEW_EMAIL_ID,
  UNIFIED_INBOX_PREVIEW_NOTE_ID,
  UNIFIED_INBOX_PREVIEW_PATH,
  UNIFIED_INBOX_PREVIEW_PHONE_ID,
  UNIFIED_INBOX_PREVIEW_TODAY_LANDING_ID,
  buildUnifiedInboxPreviewItems,
} from '@/features/inbox/lib/unified-inbox-preview'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import {
  buildKfzLandingPayload,
  type KfzLandingFormValues,
} from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'
import { confirmManualCapture } from '@/features/inbound/manual/services/confirm-manual-capture'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'
import type { Json } from '@/lib/supabase/types'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const SECRET = 'test-exact-duplicate-secret'
const NOW = new Date('2026-09-09T12:00:00.000Z')
const DECISION_AT = '2026-09-09T12:05:00.000Z'

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
  store = createMemoryInboundIntakeStore(),
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

  const before = store.items.length
  const result = await handleKfzInboundHttpRequest(landingRequest(built.payload), {
    store,
  })
  assert.equal(result.ok, true)
  if (!result.ok) {
    throw new Error('expected HTTP success')
  }
  const created = store.items[before]
  assert.ok(created)
  return created
}

function previewItems(now = NOW): InboxItem[] {
  const preview = buildUnifiedInboxPreviewItems(now)
  return [...preview.unprocessedItems, ...preview.processedItems]
}

function cloneItem(item: InboxItem): InboxItem {
  return structuredClone(item)
}

function snapshotWorkingCopy(item: InboxItem) {
  return {
    id: item.id,
    content: item.content,
    processed_at: item.processed_at,
    title: item.title,
    sender: item.sender,
    origin: item.origin,
    external_id: item.external_id,
  }
}

function withInquiry(
  item: InboxItem,
  inquiry: Record<string, unknown>,
): InboxItem {
  const metadata =
    item.inbound_metadata && typeof item.inbound_metadata === 'object' && !Array.isArray(item.inbound_metadata)
      ? { ...(item.inbound_metadata as Record<string, unknown>) }
      : {}
  const currentInquiry =
    metadata.inquiry && typeof metadata.inquiry === 'object' && !Array.isArray(metadata.inquiry)
      ? { ...(metadata.inquiry as Record<string, unknown>) }
      : {}
  return {
    ...item,
    inbound_metadata: {
      ...metadata,
      inquiry: { ...currentInquiry, ...inquiry },
    } as Json,
  }
}

describe('exact duplicate identity normalization', () => {
  it('normalizes phone formats to the same digits without substring matches', () => {
    assert.equal(normalizeInboxDuplicatePhone('+49 170 1234567'), '491701234567')
    assert.equal(normalizeInboxDuplicatePhone('0170 1234567'), '491701234567')
    assert.equal(normalizeInboxDuplicatePhone('0170-1234567'), '491701234567')
    assert.equal(normalizeInboxDuplicatePhone('0049 170 1234567'), '491701234567')
    assert.equal(normalizeInboxDuplicatePhone('(0170) 1234567'), '491701234567')
    assert.notEqual(normalizeInboxDuplicatePhone('1701234567'), '491701234567')
    assert.equal(normalizeInboxDuplicatePhone('123'), null)
    assert.equal(INBOX_DUPLICATE_SECTION_LABEL, 'Möglicherweise bereits vorhanden')
    assert.equal(INBOX_DUPLICATE_DISMISS_LABEL, 'Kein Duplikat')
    assert.equal(INBOX_DUPLICATE_RELATE_LABEL, 'Als zusammengehörig markieren')
    assert.equal(INBOX_DUPLICATE_UNLINK_LABEL, 'Zusammengehörigkeit entfernen')
    assert.match(INBOX_DUPLICATE_HINT, /automatisch/)
    assert.match(INBOX_DUPLICATE_NO_AUTO_DECISION, /Keine automatische Entscheidung/)
  })

  it('normalizes email, plate and explicit reference without guessing', () => {
    assert.equal(normalizeInboxDuplicateEmail('  Lisa@Example.com '), 'lisa@example.com')
    assert.equal(normalizeInboxDuplicateEmail('not-an-email'), null)
    assert.equal(normalizeInboxDuplicatePlate('OS-AB 1234'), 'OSAB1234')
    assert.equal(normalizeInboxDuplicatePlate('os ab 1234'), 'OSAB1234')
    assert.equal(normalizeInboxDuplicatePlate('OSAB1234'), 'OSAB1234')
    assert.equal(normalizeInboxDuplicatePlate('VW Golf 2019'), null)
    assert.equal(normalizeInboxDuplicatePlate('Max Mustermann'), null)
    assert.equal(extractInboxDuplicatePlates('Kennzeichen OS-AB 1234 liegt vor.').length, 1)
    assert.equal(normalizeInboxDuplicateReference('VORGANG-OS-4411'), 'vorgang-os-4411')
    assert.equal(normalizeInboxDuplicateReference('ab'), null)
  })
})

describe('exact duplicate matches across inbound sources', () => {
  it('matches landing inquiries by exact phone, plate, email and reference', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const first = await submitLandingToInbox(baseValues(), 'lp-dup-phone-a', store)
      const second = await submitLandingToInbox(
        baseValues({
          fullName: 'Anna Beispiel',
          phone: '0170 1234567',
          contextNotes: '',
        }),
        'lp-dup-phone-b',
        store,
      )
      const plateOnly = await submitLandingToInbox(
        baseValues({
          fullName: 'Paul Platte',
          phone: '+491709998877',
          contextNotes: 'Kennzeichen OS AB 1234',
        }),
        'lp-dup-plate',
        store,
      )
      const emailA = await submitLandingToInbox(
        baseValues({
          fullName: 'Lisa Unfall',
          phone: '',
          email: 'lisa@example.com',
          preferredChannel: 'email',
          contextNotes: '',
        }),
        'lp-dup-email-a',
        store,
      )
      const emailB = await submitLandingToInbox(
        baseValues({
          fullName: 'Andere Lisa',
          phone: '',
          email: 'LISA@example.com',
          preferredChannel: 'email',
          contextNotes: '',
        }),
        'lp-dup-email-b',
        store,
      )

      const withReferenceA = withInquiry(first, { referenceId: 'VORGANG-OS-4411' })
      const withReferenceB = withInquiry(
        await submitLandingToInbox(
          baseValues({
            fullName: 'Referenz Kunde',
            phone: '+491701000111',
            contextNotes: '',
          }),
          'lp-dup-ref',
          store,
        ),
        { referenceId: 'vorgang-os-4411' },
      )

      const phoneReview = presentInboxDuplicateReview(first, [first, second, plateOnly])
      assert.equal(phoneReview.hasPending, true)
      assert.ok(phoneReview.pending.some((candidate) => candidate.itemId === second.id))
      assert.ok(
        phoneReview.pending
          .find((candidate) => candidate.itemId === second.id)
          ?.matches.some((match) => match.fieldId === 'phone'),
      )
      assert.ok(phoneReview.pending.some((candidate) => candidate.itemId === plateOnly.id))
      assert.ok(
        phoneReview.pending
          .find((candidate) => candidate.itemId === plateOnly.id)
          ?.matches.some((match) => match.fieldId === 'plate'),
      )

      const emailReview = presentInboxDuplicateReview(emailA, [emailA, emailB, first])
      assert.deepEqual(
        emailReview.pending.map((candidate) => candidate.itemId),
        [emailB.id],
      )
      assert.equal(emailReview.pending[0]?.matches[0]?.fieldId, 'email')

      const referenceReview = presentInboxDuplicateReview(withReferenceA, [
        withReferenceA,
        withReferenceB,
        second,
      ])
      assert.ok(referenceReview.pending.some((candidate) => candidate.itemId === withReferenceB.id))
      assert.equal(
        referenceReview.pending.find((candidate) => candidate.itemId === withReferenceB.id)
          ?.matches[0]?.fieldId,
        'reference',
      )
    })
  })

  it('does not match name-only, fuzzy text or missing facts', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const max = await submitLandingToInbox(
        baseValues({ phone: '+491701234567', contextNotes: '' }),
        'lp-dup-name-a',
        store,
      )
      const alsoMax = await submitLandingToInbox(
        baseValues({
          fullName: 'Max Mustermann',
          phone: '+491709998877',
          contextNotes: '',
        }),
        'lp-dup-name-b',
        store,
      )
      const fuzzy = await submitLandingToInbox(
        baseValues({
          fullName: 'Max Musterman',
          phone: '+491701234568',
          contextNotes: 'Golf',
        }),
        'lp-dup-fuzzy',
        store,
      )

      const sameName = presentInboxDuplicateReview(max, [max, alsoMax, fuzzy])
      assert.equal(sameName.visible, false)
      assert.equal(sameName.pending.length, 0)
      assert.equal(sameName.noAutomaticDecision, true)

      const maxTokens = collectInboxExactIdentityTokens(max)
      const alsoMaxTokens = collectInboxExactIdentityTokens(alsoMax)
      assert.equal(maxTokens.some((token) => token.fieldId === 'phone'), true)
      assert.equal(
        matchInboxExactIdentityTokens(maxTokens, alsoMaxTokens).length,
        0,
      )
      assert.equal(
        matchInboxExactIdentityTokens(maxTokens, collectInboxExactIdentityTokens(fuzzy)).length,
        0,
      )
    })
  })

  it('shows multiple fixture candidates for the new Kfz landing inquiry', () => {
    const items = previewItems()
    const fresh = items.find((item) => item.id === KFZ_WORK_QUEUE_PREVIEW_NEW_ID)
    assert.ok(fresh)
    const review = presentInboxDuplicateReview(fresh, items, {
      queue: 'never_contacted',
      q: 'Golf',
      basePath: UNIFIED_INBOX_PREVIEW_PATH,
    })

    assert.equal(review.visible, true)
    const phoneCandidate = review.pending.find(
      (candidate) => candidate.itemId === KFZ_WORK_QUEUE_PREVIEW_REVIEW_ID,
    )
    const plateCandidate = review.pending.find(
      (candidate) => candidate.itemId === KFZ_WORK_QUEUE_PREVIEW_DONE_ID,
    )
    assert.ok(phoneCandidate)
    assert.ok(plateCandidate)
    assert.ok(phoneCandidate.matches.some((match) => match.fieldId === 'phone'))
    assert.match(phoneCandidate.matches.find((match) => match.fieldId === 'phone')?.explanation ?? '', /Telefon/)
    assert.ok(plateCandidate.matches.some((match) => match.fieldId === 'plate'))
    assert.match(plateCandidate.summary, /Preischeck|Opel|Corsa/)
    assert.ok(phoneCandidate.receivedAtLabel)
    assert.ok(phoneCandidate.sourceLabel)
    assert.ok(phoneCandidate.statusLabel)
    assert.ok(phoneCandidate.href.includes('item='))
    assert.ok(phoneCandidate.href.includes('q=Golf'))
    assert.ok(phoneCandidate.href.includes('queue=never_contacted'))
    assert.ok(phoneCandidate.returnHref.includes(`item=${KFZ_WORK_QUEUE_PREVIEW_NEW_ID}`))
    assert.ok(phoneCandidate.returnHref.includes('q=Golf'))
    assert.doesNotMatch(phoneCandidate.headline, /Mustermann/)
    assert.notEqual(phoneCandidate.itemId, fresh.id)
  })

  it('matches pasted email by exact address and ignores a personal note with the same name', () => {
    const items = previewItems()
    const lisa = items.find((item) => item.id === UNIFIED_INBOX_PREVIEW_EMAIL_ID)
    const note = items.find((item) => item.id === UNIFIED_INBOX_PREVIEW_NOTE_ID)
    assert.ok(lisa)
    assert.ok(note)
    const review = presentInboxDuplicateReview(lisa, items)
    assert.ok(review.pending.length > 0)
    assert.ok(review.pending.every((candidate) => candidate.itemId !== UNIFIED_INBOX_PREVIEW_NOTE_ID))
    assert.ok(
      review.pending.some((candidate) =>
        candidate.matches.some((match) => match.fieldId === 'email'),
      ),
    )
  })
})

describe('manual duplicate relation, unlink, history and reload', () => {
  it('records relate, unlink and dismiss without changing status or contacting', () => {
    const items = previewItems().map(cloneItem)
    const fresh = items.find((item) => item.id === KFZ_WORK_QUEUE_PREVIEW_NEW_ID)
    const reviewing = items.find((item) => item.id === KFZ_WORK_QUEUE_PREVIEW_REVIEW_ID)
    assert.ok(fresh)
    assert.ok(reviewing)
    const beforeFresh = snapshotWorkingCopy(fresh)
    const beforeReviewing = snapshotWorkingCopy(reviewing)
    const beforeStatus = presentInboxWorkQueueFacts(fresh).explicitStatus
    const beforeContacted = presentInboxWorkQueueFacts(fresh).hasContactedHistoryEvent

    const related = applyInboxDuplicateDecisionToItems(items, fresh.id, {
      type: 'relate',
      otherItemId: reviewing.id,
      fieldIds: ['phone'],
      at: DECISION_AT,
    })
    assert.equal(related.ok, true)
    if (!related.ok) {
      throw new Error('expected relate')
    }

    const relatedFresh = related.items.find((item) => item.id === fresh.id)
    const relatedReviewing = related.items.find((item) => item.id === reviewing.id)
    assert.ok(relatedFresh)
    assert.ok(relatedReviewing)
    assert.deepEqual(snapshotWorkingCopy(relatedFresh), beforeFresh)
    assert.deepEqual(snapshotWorkingCopy(relatedReviewing), beforeReviewing)
    assert.equal(presentInboxWorkQueueFacts(relatedFresh).explicitStatus, beforeStatus)
    assert.equal(
      presentInboxWorkQueueFacts(relatedFresh).hasContactedHistoryEvent,
      beforeContacted,
    )

    const afterRelate = presentInboxDuplicateReview(relatedFresh, related.items)
    assert.equal(afterRelate.hasPending, true)
    assert.ok(afterRelate.related.some((candidate) => candidate.itemId === reviewing.id))
    assert.ok(!afterRelate.pending.some((candidate) => candidate.itemId === reviewing.id))

    const reloadedHistory = presentInboxManualReviewHistory(relatedFresh)
    assert.ok(reloadedHistory.events.some((event) => event.kind === 'related_marked'))
    assert.equal(
      reloadedHistory.events.find((event) => event.kind === 'related_marked')?.occurredAt,
      DECISION_AT,
    )
    assert.match(
      reloadedHistory.events.find((event) => event.kind === 'related_marked')?.detail ?? '',
      /zusammengehörig/i,
    )
    assert.equal(reloadedHistory.noExternalSideEffect, true)

    const unlinked = applyInboxDuplicateDecisionToItems(related.items, fresh.id, {
      type: 'unlink',
      otherItemId: reviewing.id,
      at: '2026-09-09T12:06:00.000Z',
    })
    assert.equal(unlinked.ok, true)
    if (!unlinked.ok) {
      throw new Error('expected unlink')
    }
    const unlinkedFresh = unlinked.items.find((item) => item.id === fresh.id)
    assert.ok(unlinkedFresh)
    assert.deepEqual(snapshotWorkingCopy(unlinkedFresh), beforeFresh)
    const afterUnlink = presentInboxDuplicateReview(unlinkedFresh, unlinked.items)
    assert.ok(afterUnlink.pending.some((candidate) => candidate.itemId === reviewing.id))
    assert.ok(!afterUnlink.related.some((candidate) => candidate.itemId === reviewing.id))
    assert.ok(
      presentInboxManualReviewHistory(unlinkedFresh).events.some(
        (event) => event.kind === 'related_removed',
      ),
    )

    const dismissed = applyInboxDuplicateDecisionToItems(unlinked.items, fresh.id, {
      type: 'dismiss',
      otherItemId: reviewing.id,
      fieldIds: ['phone'],
      at: '2026-09-09T12:07:00.000Z',
    })
    assert.equal(dismissed.ok, true)
    if (!dismissed.ok) {
      throw new Error('expected dismiss')
    }
    const dismissedFresh = dismissed.items.find((item) => item.id === fresh.id)
    const dismissedReviewing = dismissed.items.find((item) => item.id === reviewing.id)
    assert.ok(dismissedFresh)
    assert.ok(dismissedReviewing)
    assert.deepEqual(snapshotWorkingCopy(dismissedFresh), beforeFresh)
    assert.deepEqual(snapshotWorkingCopy(dismissedReviewing), beforeReviewing)
    const afterDismiss = presentInboxDuplicateReview(dismissedFresh, dismissed.items)
    assert.ok(!afterDismiss.pending.some((candidate) => candidate.itemId === reviewing.id))
    assert.ok(
      presentInboxManualReviewHistory(dismissedFresh).events.some(
        (event) => event.kind === 'duplicate_dismissed',
      ),
    )
    assert.equal(inboxDuplicateDecisionDoesNotMutate().noExternalSideEffect, true)
    assert.equal(inboxDuplicateDecisionDoesNotMutate().mutated.merge, false)
    assert.equal(inboxDuplicateDecisionDoesNotMutate().mutated.send, false)
  })

  it('finding candidates never writes status, history or working-copy content', () => {
    const items = previewItems()
    const fresh = items.find((item) => item.id === KFZ_WORK_QUEUE_PREVIEW_NEW_ID)
    assert.ok(fresh)
    const before = snapshotWorkingCopy(fresh)
    const beforeHistory = presentInboxManualReviewHistory(fresh).events.map((event) => event.kind)
    const beforeStatus = presentInboxWorkQueueFacts(fresh)

    presentInboxDuplicateReview(fresh, items, { q: 'Golf', queue: 'never_contacted' })
    collectInboxExactIdentityTokens(fresh)
    matchInboxExactIdentityTokens(
      collectInboxExactIdentityTokens(fresh),
      collectInboxExactIdentityTokens(items[0]!),
    )

    assert.deepEqual(snapshotWorkingCopy(fresh), before)
    assert.deepEqual(
      presentInboxManualReviewHistory(fresh).events.map((event) => event.kind),
      beforeHistory,
    )
    assert.equal(presentInboxWorkQueueFacts(fresh).explicitStatus, beforeStatus.explicitStatus)
    assert.equal(
      presentInboxWorkQueueFacts(fresh).hasContactedHistoryEvent,
      beforeStatus.hasContactedHistoryEvent,
    )
  })

  it('opening a candidate keeps queue and search state on the existing inbox', () => {
    const preview = buildUnifiedInboxPreviewItems(NOW)
    const view = presentAuthenticatedKfzInbox({
      unprocessedItems: preview.unprocessedItems,
      processedItems: preview.processedItems,
      selectedItemId: KFZ_WORK_QUEUE_PREVIEW_NEW_ID,
      queue: 'never_contacted',
      q: '0170',
      now: NOW,
      basePath: UNIFIED_INBOX_PREVIEW_PATH,
    })
    const fresh = [...preview.unprocessedItems, ...preview.processedItems].find(
      (item) => item.id === KFZ_WORK_QUEUE_PREVIEW_NEW_ID,
    )
    assert.ok(fresh)
    const review = presentInboxDuplicateReview(fresh, previewItems(), {
      queue: view.queueFilter,
      q: view.searchQuery,
      basePath: UNIFIED_INBOX_PREVIEW_PATH,
    })
    const href = review.pending[0]?.href ?? ''
    assert.match(href, /queue=never_contacted/)
    assert.match(href, /q=0170/)
    assert.equal(
      buildInboxHref({
        itemId: KFZ_WORK_QUEUE_PREVIEW_REVIEW_ID,
        queue: 'never_contacted',
        q: '0170',
        basePath: UNIFIED_INBOX_PREVIEW_PATH,
      }),
      review.pending.find((candidate) => candidate.itemId === KFZ_WORK_QUEUE_PREVIEW_REVIEW_ID)?.href,
    )
    assert.equal(view.searchQuery, '0170')
    assert.equal(view.queueFilter, 'never_contacted')
  })
})

describe('exact duplicate review stays on the existing inbox path', () => {
  it('wires the small section onto the existing review card without a merge path', () => {
    const detail = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/components/inbox-detail-panel.tsx'),
      'utf8',
    )
    assert.match(detail, /InboxExactDuplicateSection/)
    assert.match(detail, /presentInboxDuplicateReview/)
    assert.doesNotMatch(detail, /<table/)

    const section = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/components/inbox-exact-duplicate-section.tsx'),
      'utf8',
    )
    assert.match(section, /INBOX_DUPLICATE_SECTION_LABEL/)
    assert.match(section, /INBOX_DUPLICATE_DISMISS_LABEL/)
    assert.match(section, /INBOX_DUPLICATE_RELATE_LABEL/)
    assert.match(section, /INBOX_DUPLICATE_UNLINK_LABEL/)
    assert.doesNotMatch(section, /<table/)
    assert.doesNotMatch(section, /openai|fuse\.js|levenshtein|whatsapp-outbound|resend/i)

    const lib = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/lib/inbox-exact-duplicate-review.ts'),
      'utf8',
    )
    assert.doesNotMatch(lib, /fuse\.js|levenshtein|openai|mergeDuplicates|whatsapp-outbound/i)
    assert.match(lib, /Never name-only, fuzzy, AI/)
    assert.match(lib, /noExternalSideEffect/)

    const action = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/actions/apply-inbox-duplicate-decision.ts'),
      'utf8',
    )
    assert.match(action, /inbound_metadata/)
    assert.match(action, /darf Inhalt und Status nicht ändern/)
    assert.doesNotMatch(action, /whatsapp-outbound|resend|create_follow_up/)

    const previewApp = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/components/inbox-factual-work-queue-preview-app.tsx'),
      'utf8',
    )
    assert.match(previewApp, /onLocalDuplicateApply/)

    const inboxPage = fs.readFileSync(path.join(srcRoot, 'app/app/inbox/page.tsx'), 'utf8')
    assert.doesNotMatch(inboxPage, /unified-inbox-preview|\/dev\/inbox/)
  })

  it('does not treat a same-name phone capture as a candidate', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const landing = await submitLandingToInbox(
        baseValues({ phone: '+491701112233', contextNotes: '' }),
        'lp-dup-manual-name',
        store,
      )
      const capture = await confirmManualCapture({
        store,
        agencyId: AGENCY_ID,
        actorUserId: ACTOR_ID,
        capture: {
          sourceText: 'Rückruf Max Mustermann, andere Nummer.',
          originKind: 'phone_call',
          title: 'Rückruf Max Mustermann',
          origin: {
            displayName: 'Max Mustermann',
            address: '+491708887766',
            addressKind: 'phone',
          },
          externalId: 'manual:dup-same-name',
        },
      })
      assert.equal(capture.success, true)
      if (!capture.success) {
        throw new Error('expected capture')
      }
      const review = presentInboxDuplicateReview(landing, [landing, capture.item])
      assert.equal(review.visible, false)
      assert.ok(!review.pending.some((candidate) => candidate.itemId === capture.item.id))
    })
  })
})

describe('today landing is not auto-related to unrelated phone notes', () => {
  it('does not invent a match from missing phone or plate on the today fixture', () => {
    const items = previewItems()
    const today = items.find((item) => item.id === UNIFIED_INBOX_PREVIEW_TODAY_LANDING_ID)
    const phone = items.find((item) => item.id === UNIFIED_INBOX_PREVIEW_PHONE_ID)
    assert.ok(today)
    assert.ok(phone)
    const review = presentInboxDuplicateReview(today, items)
    assert.ok(!review.pending.some((candidate) => candidate.itemId === UNIFIED_INBOX_PREVIEW_PHONE_ID))
  })
})
