/**
 * Intake → manual review → follow-up visibility and source traceability.
 * Uses existing inbox items / task records — no CRM, no outbound send.
 */
import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import { AI_PROPOSAL_BADGE_LABEL } from '@/features/ai-inbound/lib/format-proposal-labels'
import { getInboxAiProposal } from '@/features/ai-inbound/services/get-inbox-ai-proposal'
import {
  applyKfzManualTriageCommand,
  KFZ_REVIEW_NO_AUTO_ACTION,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
import {
  buildInboxHref,
  countKfzWorkQueue,
  filterInboxItemsByKfzPhase,
  parseKfzWorkQueueFilter,
  presentInboxStatusChip,
  presentKfzFollowUpTask,
  presentKfzWorkQueueRow,
  presentTaskSourceInboxLink,
} from '@/features/inbox/lib/kfz-work-queue'
import { presentKfzWebsiteInboxItem } from '@/features/inbox/lib/present-kfz-website-inbox'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import {
  buildKfzLandingPayload,
  type KfzLandingFormValues,
} from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import { resetRateLimitBucketsForTests } from '@/features/inbound/kfz/lib/rate-limit-seam'
import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const SECRET = 'test-kfz-work-queue-secret'
const TASK_ID = '33333333-3333-4333-8333-333333333333'

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
    contextNotes: '',
    ...overrides,
  }
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

function landingRequest(payload: unknown, secret = SECRET): Request {
  return new Request('http://localhost/api/inbound/kfz', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
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
    consentTimestamp: '2026-09-07T12:00:00.000Z',
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
  assert.equal(store.items.length, 1)
  return store.items[0]
}

function emailInboxItem(id: string): InboxItem {
  return {
    id,
    agency_id: AGENCY_ID,
    user_id: ACTOR_ID,
    created_by: ACTOR_ID,
    channel: 'email',
    source: 'email',
    title: 'Police',
    content: 'Eine E-Mail',
    processed_at: null,
    inbound_metadata: {},
    sender: { displayName: 'Post', address: 'a@b.de', addressKind: 'email' },
    created_at: '2026-09-07T12:00:00.000Z',
    updated_at: '2026-09-07T12:00:00.000Z',
  } as InboxItem
}

describe('kfz work-queue filter persistence', () => {
  it('parses and serializes inbox phase filters on the existing item URL', () => {
    assert.equal(parseKfzWorkQueueFilter(undefined), 'all')
    assert.equal(parseKfzWorkQueueFilter(''), 'all')
    assert.equal(parseKfzWorkQueueFilter('unknown'), 'all')
    assert.equal(parseKfzWorkQueueFilter('in_review'), 'in_review')
    assert.equal(buildInboxHref(), '/app/inbox')
    assert.equal(buildInboxHref({ phase: 'all' }), '/app/inbox')
    assert.equal(buildInboxHref({ phase: 'needs_review' }), '/app/inbox?phase=needs_review')
    assert.equal(
      buildInboxHref({
        phase: 'handled',
        itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }),
      '/app/inbox?phase=handled&item=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    )
  })
})

describe('kfz intake → review → follow-up visibility', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('shows a new Kfz inquiry as Neu and keeps AI as suggestion only', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-queue-new')
      const review = presentKfzWebsiteInboxItem(item)
      const row = presentKfzWorkQueueRow(item)
      const chip = presentInboxStatusChip(item)
      const ai = await getInboxAiProposal(item)

      assert.ok(review)
      assert.ok(row)
      assert.equal(review.phase, 'needs_review')
      assert.equal(row.phase, 'needs_review')
      assert.equal(row.phaseLabel, 'Neu')
      assert.equal(row.sourceLabel, 'Website · Kfz')
      assert.equal(row.href, `/app/inbox?item=${item.id}`)
      assert.deepEqual(chip, { label: 'Neu', kind: 'new' })
      assert.equal(countKfzWorkQueue([item]).needs_review, 1)
      assert.equal(AI_PROPOSAL_BADGE_LABEL, 'KI-Vorschlag · Entwurf')
      assert.equal(ai.proposal.status, 'proposal')
      assert.match(review.nextManualAction, new RegExp(KFZ_REVIEW_NO_AUTO_ACTION))
      assert.equal(item.processed_at, null)
    })
  })

  it('distinguishes in-review after an explicit start-review note', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-queue-review')
      const started = applyKfzManualTriageCommand(
        { content: item.content, processed_at: item.processed_at, linkedTaskId: null },
        { type: 'start_review' },
      )
      assert.equal(started.ok, true)
      if (!started.ok) {
        return
      }

      const reviewedItem = {
        ...item,
        content: started.next.content,
        processed_at: started.next.processed_at,
      }
      const row = presentKfzWorkQueueRow(reviewedItem)
      const chip = presentInboxStatusChip(reviewedItem)

      assert.ok(row)
      assert.equal(row.phase, 'in_review')
      assert.equal(row.phaseLabel, 'In Prüfung')
      assert.deepEqual(chip, { label: 'In Prüfung', kind: 'review' })
      assert.equal(started.next.processed_at, null)
      assert.equal(started.mutated.task, false)
    })
  })

  it('makes an explicit follow-up visible in the task area with a source link', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-queue-follow-up')
      const tasked = applyKfzManualTriageCommand(
        { content: item.content, processed_at: item.processed_at, linkedTaskId: null },
        { type: 'create_follow_up_task', taskId: TASK_ID },
      )
      assert.equal(tasked.ok, true)
      if (!tasked.ok) {
        return
      }

      const row = presentKfzWorkQueueRow(item, {
        linkedTaskId: tasked.next.linkedTaskId,
      })
      const followUp = presentKfzFollowUpTask({
        inboxItemId: item.id,
        taskId: tasked.next.linkedTaskId ?? '',
        sourceInboxItemId: item.id,
      })
      const sourceLink = presentTaskSourceInboxLink(item.id)

      assert.ok(row)
      assert.equal(row.phase, 'in_review')
      assert.equal(row.followUpTaskHref, `/app/tasks?task=${TASK_ID}`)
      assert.ok(followUp)
      assert.equal(followUp.appearsInTaskArea, true)
      assert.equal(followUp.noExternalSideEffect, true)
      assert.equal(followUp.taskHref, `/app/tasks?task=${TASK_ID}`)
      assert.equal(followUp.sourceHref, `/app/inbox?item=${item.id}`)
      assert.equal(followUp.sourceLinkLabel, 'Zur Anfrage')
      assert.ok(sourceLink)
      assert.equal(sourceLink.href, `/app/inbox?item=${item.id}`)
      assert.equal(sourceLink.label, 'Zum Eingang')
      assert.equal(tasked.next.processed_at, null)
    })
  })

  it('marks handled inquiries as Erledigt and keeps the source-traced follow-up', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-queue-handled')
      const tasked = applyKfzManualTriageCommand(
        { content: item.content, processed_at: item.processed_at, linkedTaskId: null },
        { type: 'create_follow_up_task', taskId: TASK_ID },
      )
      assert.equal(tasked.ok, true)
      if (!tasked.ok) {
        return
      }

      const handledAt = '2026-09-07T16:00:00.000Z'
      const handled = applyKfzManualTriageCommand(tasked.next, {
        type: 'mark_handled',
        at: handledAt,
      })
      assert.equal(handled.ok, true)
      if (!handled.ok) {
        return
      }

      const handledItem = { ...item, processed_at: handled.next.processed_at }
      const row = presentKfzWorkQueueRow(handledItem, {
        linkedTaskId: handled.next.linkedTaskId,
        phase: 'handled',
      })
      const followUp = presentKfzFollowUpTask({
        inboxItemId: item.id,
        taskId: handled.next.linkedTaskId ?? '',
      })

      assert.ok(row)
      assert.equal(row.phase, 'handled')
      assert.equal(row.phaseLabel, 'Erledigt')
      assert.equal(row.href, `/app/inbox?phase=handled&item=${item.id}`)
      assert.deepEqual(presentInboxStatusChip(handledItem, handled.next.linkedTaskId), {
        label: 'Erledigt',
        kind: 'handled',
      })
      assert.ok(followUp)
      assert.equal(followUp.sourceHref, `/app/inbox?item=${item.id}`)
      assert.equal(handled.next.processed_at, handledAt)
    })
  })

  it('filters the existing inbox list by Kfz workflow state and ignores other channels', async () => {
    await withKfzEnv(async () => {
      const fresh = await submitLandingToInbox(baseValues(), 'lp-queue-filter-new')
      const reviewing = await submitLandingToInbox(baseValues(), 'lp-queue-filter-review')
      const started = applyKfzManualTriageCommand(
        {
          content: reviewing.content,
          processed_at: reviewing.processed_at,
          linkedTaskId: null,
        },
        { type: 'start_review' },
      )
      assert.equal(started.ok, true)
      if (!started.ok) {
        return
      }
      const inReview = { ...reviewing, content: started.next.content }

      const closed = await submitLandingToInbox(baseValues(), 'lp-queue-filter-done')
      const handled = applyKfzManualTriageCommand(
        { content: closed.content, processed_at: closed.processed_at, linkedTaskId: null },
        { type: 'mark_handled', at: '2026-09-07T17:00:00.000Z' },
      )
      assert.equal(handled.ok, true)
      if (!handled.ok) {
        return
      }
      const done = { ...closed, processed_at: handled.next.processed_at }
      const email = emailInboxItem('44444444-4444-4444-8444-444444444444')
      const items = [fresh, inReview, done, email]
      const relations = { [fresh.id]: TASK_ID }

      const countsWithoutTask = countKfzWorkQueue(items)
      assert.equal(countsWithoutTask.needs_review, 1)
      assert.equal(countsWithoutTask.in_review, 1)
      assert.equal(countsWithoutTask.handled, 1)

      const withLinkedTask = countKfzWorkQueue(items, relations)
      assert.equal(withLinkedTask.needs_review, 0)
      assert.equal(withLinkedTask.in_review, 2)

      const onlyReview = filterInboxItemsByKfzPhase(items, 'in_review')
      assert.deepEqual(
        onlyReview.map((item) => item.id),
        [inReview.id],
      )
      assert.equal(filterInboxItemsByKfzPhase(items, 'needs_review').length, 1)
      assert.equal(filterInboxItemsByKfzPhase(items, 'handled').length, 1)
      assert.equal(filterInboxItemsByKfzPhase(items, 'all').length, 4)
      assert.equal(presentKfzWorkQueueRow(email), null)
      assert.deepEqual(presentInboxStatusChip(email), { label: 'Neu', kind: 'new' })
    })
  })

  it('does not invent a follow-up or source link without explicit ids', () => {
    assert.equal(
      presentKfzFollowUpTask({
        inboxItemId: 'not-a-uuid',
        taskId: TASK_ID,
      }),
      null,
    )
    assert.equal(presentTaskSourceInboxLink(null), null)
    assert.equal(presentKfzFollowUpTask({ inboxItemId: '', taskId: '' }), null)
  })
})
