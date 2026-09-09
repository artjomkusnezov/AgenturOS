/**
 * Factual unattended-inbound work queue on existing inbox working copies.
 * Filters, time groups and contact semantics only — no urgency, SLA or send.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  applyKfzManualTriageCommand,
  KFZ_REVIEW_STARTED_NOTE,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
import {
  compareInboxWorkQueueItems,
  countInboxWorkQueue,
  filterInboxItemsByWorkQueue,
  groupInboxWorkQueueItems,
  hasExplicitContactedHistoryEvent,
  inboxWorkQueueTimeGroup,
  INBOX_WORK_QUEUE_CONTACTED_LABEL,
  INBOX_WORK_QUEUE_FILTER_LABELS,
  INBOX_WORK_QUEUE_NAV_LABEL,
  INBOX_WORK_QUEUE_NEVER_CONTACTED_LABEL,
  INBOX_WORK_QUEUE_NO_ACTION_LABEL,
  INBOX_WORK_QUEUE_SORT_NOTE,
  INBOX_WORK_QUEUE_TIME_GROUP_LABELS,
  INBOX_WORK_QUEUE_TIMEZONE,
  INBOX_WORK_QUEUE_TIMEZONE_NOTE,
  matchesInboxWorkQueueFilter,
  parseInboxWorkQueueFilter,
  presentInboxWorkQueueFacts,
  resolveInboxWorkQueueStatus,
  sortInboxWorkQueueItems,
} from '@/features/inbox/lib/inbox-factual-work-queue'
import { presentInboxManualReviewHistory } from '@/features/inbox/lib/inbox-manual-review-history'
import {
  copyDoesNotChangeStatus,
  KFZ_CONTACTED_NOTE,
  KFZ_COPY_NO_STATUS_CHANGE,
  readKfzCopyValue,
} from '@/features/inbox/lib/kfz-reply-handoff'
import { presentUnifiedInboxCard } from '@/features/inbox/lib/present-unified-inbox-card'
import { presentAuthenticatedKfzInbox } from '@/features/inbox/lib/present-authenticated-kfz-inbox'
import {
  UNIFIED_INBOX_PREVIEW_CONTACTED_EMAIL_ID,
  UNIFIED_INBOX_PREVIEW_DONE_PHONE_ID,
  UNIFIED_INBOX_PREVIEW_EMAIL_ID,
  UNIFIED_INBOX_PREVIEW_FOLLOW_UP_NOTE_ID,
  UNIFIED_INBOX_PREVIEW_NOTE_ID,
  UNIFIED_INBOX_PREVIEW_OLDER_PHONE_ID,
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

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const SECRET = 'test-factual-work-queue-secret'
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
    contextNotes: '',
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

describe('factual work-queue filters and labels', () => {
  it('parses factual filters and keeps unknown values as all', () => {
    assert.equal(parseInboxWorkQueueFilter(undefined), 'all')
    assert.equal(parseInboxWorkQueueFilter('unknown'), 'all')
    assert.equal(parseInboxWorkQueueFilter('never_contacted'), 'never_contacted')
    assert.equal(INBOX_WORK_QUEUE_FILTER_LABELS.newly_received, 'Neu eingegangen')
    assert.equal(INBOX_WORK_QUEUE_FILTER_LABELS.never_contacted, 'Noch nicht kontaktiert')
    assert.equal(INBOX_WORK_QUEUE_FILTER_LABELS.follow_up, 'Rückfrage nötig')
    assert.equal(INBOX_WORK_QUEUE_FILTER_LABELS.in_review, 'In Prüfung')
    assert.equal(INBOX_WORK_QUEUE_FILTER_LABELS.handled, 'Erledigt')
    assert.equal(INBOX_WORK_QUEUE_NAV_LABEL, 'Arbeitsschlange')
    assert.equal(INBOX_WORK_QUEUE_TIMEZONE, 'Europe/Berlin')
    assert.match(INBOX_WORK_QUEUE_TIMEZONE_NOTE, /Europe\/Berlin/)
    assert.match(INBOX_WORK_QUEUE_SORT_NOTE, /Älter/)
  })

  it('filters landing, phone, pasted email and note by factual status', () => {
    const items = previewItems()
    const byId = Object.fromEntries(items.map((item) => [item.id, item]))

    assert.equal(resolveInboxWorkQueueStatus(byId[UNIFIED_INBOX_PREVIEW_TODAY_LANDING_ID]), 'newly_received')
    assert.equal(resolveInboxWorkQueueStatus(byId[UNIFIED_INBOX_PREVIEW_PHONE_ID]), 'newly_received')
    assert.equal(resolveInboxWorkQueueStatus(byId[UNIFIED_INBOX_PREVIEW_EMAIL_ID]), 'newly_received')
    assert.equal(resolveInboxWorkQueueStatus(byId[UNIFIED_INBOX_PREVIEW_NOTE_ID]), 'newly_received')
    assert.equal(resolveInboxWorkQueueStatus(byId[UNIFIED_INBOX_PREVIEW_FOLLOW_UP_NOTE_ID]), 'follow_up')
    assert.equal(resolveInboxWorkQueueStatus(byId[UNIFIED_INBOX_PREVIEW_CONTACTED_EMAIL_ID]), 'in_review')
    assert.equal(resolveInboxWorkQueueStatus(byId[UNIFIED_INBOX_PREVIEW_DONE_PHONE_ID]), 'handled')

    const neverContacted = filterInboxItemsByWorkQueue(items, 'never_contacted')
    assert.ok(neverContacted.some((item) => item.id === UNIFIED_INBOX_PREVIEW_TODAY_LANDING_ID))
    assert.ok(neverContacted.some((item) => item.id === UNIFIED_INBOX_PREVIEW_OLDER_PHONE_ID))
    assert.ok(neverContacted.some((item) => item.id === UNIFIED_INBOX_PREVIEW_PHONE_ID))
    assert.ok(neverContacted.some((item) => item.id === UNIFIED_INBOX_PREVIEW_EMAIL_ID))
    assert.ok(neverContacted.some((item) => item.id === UNIFIED_INBOX_PREVIEW_NOTE_ID))
    assert.ok(!neverContacted.some((item) => item.id === UNIFIED_INBOX_PREVIEW_CONTACTED_EMAIL_ID))
    assert.ok(!neverContacted.some((item) => item.id === UNIFIED_INBOX_PREVIEW_DONE_PHONE_ID))

    const followUp = filterInboxItemsByWorkQueue(items, 'follow_up')
    assert.deepEqual(
      followUp.map((item) => item.id),
      [UNIFIED_INBOX_PREVIEW_FOLLOW_UP_NOTE_ID],
    )

    const handled = filterInboxItemsByWorkQueue(items, 'handled')
    assert.ok(handled.some((item) => item.id === UNIFIED_INBOX_PREVIEW_DONE_PHONE_ID))
    assert.ok(handled.every((item) => item.processed_at !== null))

    const inReview = filterInboxItemsByWorkQueue(items, 'in_review')
    assert.ok(inReview.some((item) => item.id === UNIFIED_INBOX_PREVIEW_CONTACTED_EMAIL_ID))
    assert.ok(!inReview.some((item) => item.id === UNIFIED_INBOX_PREVIEW_FOLLOW_UP_NOTE_ID))

    const counts = countInboxWorkQueue(items)
    assert.ok(counts.newly_received >= 4)
    assert.ok(counts.never_contacted >= 5)
    assert.equal(counts.follow_up, 1)
    assert.ok(counts.handled >= 2)
  })
})

describe('factual today / yesterday / older boundaries', () => {
  it('groups received times on Europe/Berlin calendar days', () => {
    assert.equal(inboxWorkQueueTimeGroup('2026-09-09T10:00:00.000Z', NOW), 'today')
    assert.equal(inboxWorkQueueTimeGroup('2026-09-08T22:00:00.000Z', NOW), 'today')
    assert.equal(inboxWorkQueueTimeGroup('2026-09-08T21:59:59.000Z', NOW), 'yesterday')
    assert.equal(inboxWorkQueueTimeGroup('2026-09-07T22:00:00.000Z', NOW), 'yesterday')
    assert.equal(inboxWorkQueueTimeGroup('2026-09-07T21:59:59.000Z', NOW), 'older')
    assert.equal(INBOX_WORK_QUEUE_TIME_GROUP_LABELS.today, 'Heute')
    assert.equal(INBOX_WORK_QUEUE_TIME_GROUP_LABELS.yesterday, 'Gestern')
    assert.equal(INBOX_WORK_QUEUE_TIME_GROUP_LABELS.older, 'Älter')
  })

  it('groups preview items into older, yesterday, today in that order', () => {
    const items = previewItems()
    const groups = groupInboxWorkQueueItems(items, NOW)
    assert.deepEqual(
      groups.map((group) => group.group),
      ['older', 'yesterday', 'today'],
    )
    assert.ok(groups[0]?.items.some((item) => item.id === UNIFIED_INBOX_PREVIEW_OLDER_PHONE_ID))
    assert.ok(groups[2]?.items.some((item) => item.id === UNIFIED_INBOX_PREVIEW_TODAY_LANDING_ID))
    assert.ok(groups[2]?.items.some((item) => item.id === UNIFIED_INBOX_PREVIEW_FOLLOW_UP_NOTE_ID))
  })
})

describe('never-contacted, copy and explicit contact', () => {
  it('copy helpers never change contacted status', async () => {
    await withKfzEnv(async () => {
      const landing = await submitLandingToInbox(baseValues(), 'lp-work-queue-copy')
      const before = presentInboxWorkQueueFacts(landing, { now: NOW })
      assert.equal(before.hasContactedHistoryEvent, false)
      assert.equal(before.contactedLabel, INBOX_WORK_QUEUE_NEVER_CONTACTED_LABEL)
      assert.equal(matchesInboxWorkQueueFilter(landing, 'never_contacted'), true)

      const copied = readKfzCopyValue(
        { phone: '+491701234567', email: null, preferredContact: '+491701234567', content: landing.content },
        'phone',
      )
      assert.equal(copied, '+491701234567')
      assert.deepEqual(copyDoesNotChangeStatus(), {
        mutated: { content: false, processed: false, task: false, contacted: false },
        noExternalSideEffect: true,
      })
      assert.match(KFZ_COPY_NO_STATUS_CHANGE, /Kopieren ändert den Status nicht/)

      const untouched = applyKfzManualTriageCommand(
        {
          content: landing.content,
          processed_at: landing.processed_at,
          linkedTaskId: null,
        },
        null,
      )
      assert.equal(untouched.ok, true)
      if (!untouched.ok) {
        return
      }
      const afterCopy = { ...landing, content: untouched.next.content }
      assert.equal(hasExplicitContactedHistoryEvent(afterCopy), false)
      assert.equal(matchesInboxWorkQueueFilter(afterCopy, 'never_contacted'), true)
      assert.equal(afterCopy.content, landing.content)
    })
  })

  it('only an explicit contacted action leaves never-contacted and stays in history after reload', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const phone = await confirmManualCapture({
        store,
        agencyId: AGENCY_ID,
        actorUserId: ACTOR_ID,
        capture: {
          sourceText: 'Rückruf wegen Haftpflicht.\nTelefon: +491701112233',
          originKind: 'phone_call',
          title: 'Rückruf Berger',
          origin: {
            displayName: 'Kunde Berger',
            address: '+491701112233',
            addressKind: 'phone',
          },
          capturedAt: '2026-09-08T09:10:00.000Z',
          externalId: 'manual:work-queue-phone',
        },
      })
      assert.equal(phone.success, true)
      if (!phone.success) {
        return
      }

      assert.equal(hasExplicitContactedHistoryEvent(phone.item), false)
      const contacted = applyKfzManualTriageCommand(
        {
          content: phone.item.content,
          processed_at: phone.item.processed_at,
          linkedTaskId: null,
        },
        { type: 'mark_contacted' },
      )
      assert.equal(contacted.ok, true)
      if (!contacted.ok) {
        return
      }

      const reloaded = { ...phone.item, content: contacted.next.content }
      assert.match(reloaded.content, new RegExp(KFZ_CONTACTED_NOTE))
      assert.equal(hasExplicitContactedHistoryEvent(reloaded), true)
      assert.equal(matchesInboxWorkQueueFilter(reloaded, 'never_contacted'), false)
      assert.equal(resolveInboxWorkQueueStatus(reloaded), 'in_review')

      const history = presentInboxManualReviewHistory(reloaded)
      assert.ok(history.events.some((event) => event.kind === 'contact_confirmed'))
      const again = presentInboxManualReviewHistory({ ...reloaded })
      assert.deepEqual(
        again.events.map((event) => event.kind),
        history.events.map((event) => event.kind),
      )
      assert.equal(
        presentInboxWorkQueueFacts(reloaded, { now: NOW }).contactedLabel,
        INBOX_WORK_QUEUE_CONTACTED_LABEL,
      )
    })
  })

  it('manual completion stays in factual history after reload', async () => {
    await withKfzEnv(async () => {
      const landing = await submitLandingToInbox(baseValues(), 'lp-work-queue-done')
      const completed = applyKfzManualTriageCommand(
        {
          content: landing.content,
          processed_at: landing.processed_at,
          linkedTaskId: null,
        },
        { type: 'mark_handled', at: '2026-09-09T13:00:00.000Z' },
      )
      assert.equal(completed.ok, true)
      if (!completed.ok) {
        return
      }

      const reloaded = {
        ...landing,
        content: completed.next.content,
        processed_at: completed.next.processed_at,
      }
      assert.equal(resolveInboxWorkQueueStatus(reloaded), 'handled')
      assert.equal(matchesInboxWorkQueueFilter(reloaded, 'handled'), true)
      const history = presentInboxManualReviewHistory(reloaded)
      const done = history.events.find((event) => event.kind === 'manually_completed')
      assert.ok(done)
      assert.equal(done?.occurredAt, '2026-09-09T13:00:00.000Z')
      const afterReload = presentInboxManualReviewHistory({ ...reloaded })
      assert.equal(
        afterReload.events.find((event) => event.kind === 'manually_completed')?.occurredAt,
        '2026-09-09T13:00:00.000Z',
      )
    })
  })
})

describe('factual cards, sorting and authenticated inbox', () => {
  it('shows received time, last action, channel, status, missing-info and contacted marker', async () => {
    await withKfzEnv(async () => {
      const landing = await submitLandingToInbox(
        baseValues({ preferredChannel: 'email', email: 'lisa@example.com', phone: '' }),
        'lp-work-queue-card',
      )
      const card = presentUnifiedInboxCard(landing, { now: NOW })
      assert.ok(card.receivedAtLabel.length > 0)
      assert.equal(card.workQueue.preferredReplyChannelLabel, 'E-Mail')
      assert.equal(card.workQueue.hasContactedHistoryEvent, false)
      assert.equal(card.workQueue.lastHumanActionLabel, INBOX_WORK_QUEUE_NO_ACTION_LABEL)
      assert.equal(card.workQueue.explicitStatus, 'newly_received')
      assert.ok(card.missingCount >= 0)
      assert.equal(card.nextActionLabel, 'Anfrage öffnen')
      assert.doesNotMatch(card.href, /priority|sla|score/i)
    })
  })

  it('sorts never-contacted oldest first so older untouched items are not lost', () => {
    const items = previewItems()
    const sorted = sortInboxWorkQueueItems(items)
    const olderIndex = sorted.findIndex((item) => item.id === UNIFIED_INBOX_PREVIEW_OLDER_PHONE_ID)
    const todayIndex = sorted.findIndex((item) => item.id === UNIFIED_INBOX_PREVIEW_TODAY_LANDING_ID)
    const contactedIndex = sorted.findIndex(
      (item) => item.id === UNIFIED_INBOX_PREVIEW_CONTACTED_EMAIL_ID,
    )
    const doneIndex = sorted.findIndex((item) => item.id === UNIFIED_INBOX_PREVIEW_DONE_PHONE_ID)

    assert.ok(olderIndex >= 0)
    assert.ok(todayIndex > olderIndex)
    assert.ok(contactedIndex > todayIndex)
    assert.ok(doneIndex > contactedIndex)
    assert.ok(
      compareInboxWorkQueueItems(
        items.find((item) => item.id === UNIFIED_INBOX_PREVIEW_OLDER_PHONE_ID)!,
        items.find((item) => item.id === UNIFIED_INBOX_PREVIEW_TODAY_LANDING_ID)!,
      ) < 0,
    )
  })

  it('wires the factual queue onto the existing authenticated inbox without a parallel CRM', () => {
    const preview = buildUnifiedInboxPreviewItems(NOW)
    const view = presentAuthenticatedKfzInbox({
      unprocessedItems: preview.unprocessedItems,
      processedItems: preview.processedItems,
      taskRelationsByItemId: preview.taskRelationsByItemId,
      queue: 'never_contacted',
      now: NOW,
    })

    assert.equal(view.queueFilter, 'never_contacted')
    assert.equal(view.workQueueNavLabel, INBOX_WORK_QUEUE_NAV_LABEL)
    assert.ok(view.workQueueFilterHrefs.never_contacted.includes('queue=never_contacted'))
    assert.ok(view.cards.every((card) => card.workQueue.hasContactedHistoryEvent === false))
    assert.ok(view.cards.every((card) => card.workQueue.explicitStatus !== 'handled'))
    assert.equal(view.usesPreviewFixtures, false)
    assert.doesNotMatch(view.hrefBasePath, /\/dev\//)
    assert.ok(!view.cards.some((card) => /Dringlichkeit|SLA|Lead/i.test(card.nextActionLabel ?? '')))
  })

  it('review-started items become in Prüfung without inventing a contacted event', () => {
    const preview = buildUnifiedInboxPreviewItems(NOW)
    const note = preview.unprocessedItems.find((item) => item.id === UNIFIED_INBOX_PREVIEW_NOTE_ID)
    assert.ok(note)
    const started = applyKfzManualTriageCommand(
      {
        content: note.content,
        processed_at: note.processed_at,
        linkedTaskId: null,
      },
      { type: 'start_review' },
    )
    assert.equal(started.ok, true)
    if (!started.ok) {
      return
    }
    const reviewing = { ...note, content: started.next.content }
    assert.match(reviewing.content, new RegExp(KFZ_REVIEW_STARTED_NOTE))
    assert.equal(resolveInboxWorkQueueStatus(reviewing), 'in_review')
    assert.equal(hasExplicitContactedHistoryEvent(reviewing), false)
    assert.equal(matchesInboxWorkQueueFilter(reviewing, 'never_contacted'), true)
    assert.equal(matchesInboxWorkQueueFilter(reviewing, 'in_review'), true)
  })
})

describe('factual work-queue stays on the existing inbox path', () => {
  it('does not add a parallel dashboard or production send path', () => {
    const inboxPage = fs.readFileSync(path.join(srcRoot, 'app/app/inbox/page.tsx'), 'utf8')
    assert.match(inboxPage, /queue/)
    assert.match(inboxPage, /presentAuthenticatedKfzInbox/)
    assert.doesNotMatch(inboxPage, /unified-inbox-preview|buildUnifiedInboxPreviewItems|\/dev\/inbox/)

    const previewPage = fs.readFileSync(path.join(srcRoot, 'app/dev/inbox/page.tsx'), 'utf8')
    assert.match(previewPage, /InboxFactualWorkQueuePreviewApp/)
    assert.match(previewPage, /buildUnifiedInboxPreviewItems/)
    assert.match(previewPage, /UNIFIED_INBOX_PREVIEW_PATH/)
    assert.equal(UNIFIED_INBOX_PREVIEW_PATH, '/dev/inbox')

    const core = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/lib/inbox-factual-work-queue.ts'),
      'utf8',
    )
    assert.doesNotMatch(core, /whatsapp-outbound|lead quality|priority score|resend/)
  })
})
