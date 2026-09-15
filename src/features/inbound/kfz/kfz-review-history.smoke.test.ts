/**
 * Factual manual-review history inside one inbound item.
 * Reuses notes, draft, task and status — no invented actors, no auto side effects.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, it } from 'node:test'

import { getInboxAiProposal } from '@/features/ai-inbound/services/get-inbox-ai-proposal'
import {
  applyKfzManualTriageCommand,
  KFZ_REVIEW_NO_AUTO_ACTION,
  KFZ_REVIEW_STARTED_NOTE,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
import { parseInboxItemView } from '@/features/inbox/lib/inbox-item-view'
import {
  INBOX_HISTORY_AI_EXCLUSION_LABEL,
  INBOX_HISTORY_EMPLOYEE_LAYER_LABEL,
  INBOX_HISTORY_KIND_LABELS,
  INBOX_HISTORY_LIMITATION,
  INBOX_HISTORY_NO_ACTOR_LABEL,
  INBOX_HISTORY_NO_TIMESTAMP_LABEL,
  INBOX_HISTORY_SOURCE_LAYER_LABEL,
  LOCAL_REVIEW_HISTORY_FIXTURE_KEY,
  presentInboxManualReviewHistory,
} from '@/features/inbox/lib/inbox-manual-review-history'
import { buildInboxHref } from '@/features/inbox/lib/kfz-work-queue'
import {
  buildKfzWorkQueuePreviewItems,
  KFZ_WORK_QUEUE_PREVIEW_DONE_ID,
  KFZ_WORK_QUEUE_PREVIEW_HISTORY_FACTS,
  KFZ_WORK_QUEUE_PREVIEW_NEW_ID,
  KFZ_WORK_QUEUE_PREVIEW_REVIEW_ID,
  KFZ_WORK_QUEUE_PREVIEW_REVIEW_NOTE,
  KFZ_WORK_QUEUE_PREVIEW_TASK_ID,
} from '@/features/inbox/lib/kfz-work-queue-preview'
import { presentAuthenticatedKfzInbox } from '@/features/inbox/lib/present-authenticated-kfz-inbox'
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
const SECRET = 'test-kfz-review-history-secret'
const TASK_ID = '33333333-3333-4333-8333-333333333333'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

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

describe('inbox item history view stays on the same record', () => {
  it('parses history as a same-item view and keeps work as the default', () => {
    assert.equal(parseInboxItemView(undefined), 'work')
    assert.equal(parseInboxItemView(''), 'work')
    assert.equal(parseInboxItemView('unknown'), 'work')
    assert.equal(parseInboxItemView('work'), 'work')
    assert.equal(parseInboxItemView('history'), 'history')
    assert.equal(
      buildInboxHref({
        itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        view: 'history',
      }),
      '/app/inbox?item=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa&view=history',
    )
    assert.equal(
      buildInboxHref({
        itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        source: 'kfz',
        view: 'work',
      }),
      '/app/inbox?source=kfz&item=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    )
    assert.equal(
      buildInboxHref({
        view: 'history',
      }),
      '/app/inbox',
    )
  })
})

describe('manual review history from existing working-copy facts', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('lists received, review started, note, draft, task and completion without inventing times', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-history-facts')
      const started = applyKfzManualTriageCommand(
        {
          content: item.content,
          processed_at: item.processed_at,
          linkedTaskId: null,
        },
        { type: 'start_review' },
      )
      assert.equal(started.ok, true)
      if (!started.ok) {
        return
      }

      const noted = applyKfzManualTriageCommand(started.next, {
        type: 'record_internal_note',
        note: 'Intern: Kennzeichen später nachziehen.',
      })
      assert.equal(noted.ok, true)
      if (!noted.ok) {
        return
      }

      const drafted = applyKfzManualTriageCommand(noted.next, {
        type: 'save_response_draft',
        draft: 'Interner Entwurf — nicht senden.',
      })
      assert.equal(drafted.ok, true)
      if (!drafted.ok) {
        return
      }

      const tasked = applyKfzManualTriageCommand(drafted.next, {
        type: 'create_follow_up_task',
        taskId: TASK_ID,
      })
      assert.equal(tasked.ok, true)
      if (!tasked.ok) {
        return
      }

      const completed = applyKfzManualTriageCommand(tasked.next, {
        type: 'mark_handled',
        at: '2026-09-08T11:00:00.000Z',
      })
      assert.equal(completed.ok, true)
      if (!completed.ok) {
        return
      }

      const working = {
        ...item,
        content: completed.next.content,
        processed_at: completed.next.processed_at,
      }
      const history = presentInboxManualReviewHistory(working, {
        linkedTaskId: completed.next.linkedTaskId,
        source: 'kfz',
        view: 'history',
      })

      assert.deepEqual(
        history.events.map((event) => event.kind),
        [
          'received',
          'review_started',
          'note_saved',
          'draft_saved',
          'internal_task_created',
          'manually_completed',
        ],
      )
      assert.equal(history.events[0]?.layer, 'source')
      assert.equal(history.events[0]?.layerLabel, INBOX_HISTORY_SOURCE_LAYER_LABEL)
      assert.equal(history.events[0]?.occurredAt, item.received_at ?? item.created_at)
      assert.notEqual(history.events[0]?.occurredAtLabel, INBOX_HISTORY_NO_TIMESTAMP_LABEL)
      assert.equal(history.events[1]?.detail, KFZ_REVIEW_STARTED_NOTE)
      assert.equal(history.events[1]?.occurredAt, null)
      assert.equal(history.events[1]?.occurredAtLabel, INBOX_HISTORY_NO_TIMESTAMP_LABEL)
      assert.equal(history.events[2]?.detail, 'Intern: Kennzeichen später nachziehen.')
      assert.equal(history.events[2]?.occurredAt, null)
      assert.equal(history.events[3]?.kind, 'draft_saved')
      assert.equal(history.events[3]?.occurredAt, null)
      assert.equal(history.events[4]?.kind, 'internal_task_created')
      assert.equal(history.events[5]?.occurredAt, '2026-09-08T11:00:00.000Z')
      assert.equal(
        history.events.every((event) => event.actorLabel === null),
        true,
      )
      assert.equal(
        history.events.every((event) => event.actorLimitation === INBOX_HISTORY_NO_ACTOR_LABEL),
        true,
      )
      assert.equal(history.events[1]?.layerLabel, INBOX_HISTORY_EMPLOYEE_LAYER_LABEL)
      assert.equal(history.includesAiSuggestion, false)
      assert.equal(history.aiExclusionLabel, INBOX_HISTORY_AI_EXCLUSION_LABEL)
      assert.equal(history.limitation, INBOX_HISTORY_LIMITATION)
      assert.equal(history.fixtureFactsUsed, false)
      assert.equal(history.noExternalSideEffect, true)
      assert.equal(history.activeView, 'history')
      assert.equal(history.historyHref, `/app/inbox?source=kfz&item=${item.id}&view=history`)
      assert.equal(history.workHref, `/app/inbox?source=kfz&item=${item.id}`)
      assert.equal(working.processed_at, completed.next.processed_at)
      assert.match(KFZ_REVIEW_NO_AUTO_ACTION, /Nichts wird automatisch/)
    })
  })

  it('ignores fixture timestamps on the live path and keeps AI out of the chronology', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-history-no-fixture')
      const started = applyKfzManualTriageCommand(
        {
          content: item.content,
          processed_at: item.processed_at,
          linkedTaskId: null,
        },
        { type: 'start_review' },
      )
      assert.equal(started.ok, true)
      if (!started.ok) {
        return
      }

      const poisoned = {
        ...item,
        content: started.next.content,
        inbound_metadata: {
          ...(typeof item.inbound_metadata === 'object' && item.inbound_metadata
            ? item.inbound_metadata
            : {}),
          [LOCAL_REVIEW_HISTORY_FIXTURE_KEY]: {
            documentedLimitation: INBOX_HISTORY_LIMITATION,
            reviewStartedAt: '1999-01-01T00:00:00.000Z',
          },
        },
      }
      const history = presentInboxManualReviewHistory(poisoned, {
        allowLocalFixtureFacts: false,
      })
      const ai = await getInboxAiProposal(poisoned)

      assert.equal(history.fixtureFactsUsed, false)
      assert.equal(history.events.find((event) => event.kind === 'review_started')?.occurredAt, null)
      assert.equal(history.includesAiSuggestion, false)
      assert.equal(ai.proposal.status, 'proposal')
      assert.equal(
        history.events.some((event) => event.detail.includes('KI')),
        false,
      )
    })
  })

  it('uses documented local fixture times only when the preview path opts in', () => {
    const preview = buildKfzWorkQueuePreviewItems()
    const reviewing = [...preview.unprocessedItems, ...preview.processedItems].find(
      (item) => item.id === KFZ_WORK_QUEUE_PREVIEW_REVIEW_ID,
    )
    const fresh = preview.unprocessedItems.find(
      (item) => item.id === KFZ_WORK_QUEUE_PREVIEW_NEW_ID,
    )
    const done = preview.processedItems.find(
      (item) => item.id === KFZ_WORK_QUEUE_PREVIEW_DONE_ID,
    )
    assert.ok(reviewing)
    assert.ok(fresh)
    assert.ok(done)

    const live = presentInboxManualReviewHistory(reviewing, {
      linkedTaskId: preview.taskRelationsByItemId[reviewing.id] ?? null,
    })
    assert.equal(live.fixtureFactsUsed, false)
    assert.equal(live.events.find((event) => event.kind === 'review_started')?.occurredAt, null)
    assert.equal(live.events.find((event) => event.kind === 'note_saved')?.occurredAt, null)

    const local = presentInboxManualReviewHistory(reviewing, {
      linkedTaskId: KFZ_WORK_QUEUE_PREVIEW_TASK_ID,
      allowLocalFixtureFacts: true,
      basePath: '/dev/inbox',
      view: 'history',
    })
    assert.equal(local.fixtureFactsUsed, true)
    assert.deepEqual(
      local.events.map((event) => event.kind),
      [
        'received',
        'review_started',
        'note_saved',
        'draft_saved',
        'internal_task_created',
      ],
    )
    assert.equal(
      local.events.find((event) => event.kind === 'review_started')?.occurredAt,
      KFZ_WORK_QUEUE_PREVIEW_HISTORY_FACTS.reviewStartedAt,
    )
    assert.equal(
      local.events.find((event) => event.kind === 'note_saved')?.detail,
      KFZ_WORK_QUEUE_PREVIEW_REVIEW_NOTE,
    )
    assert.equal(
      local.events.find((event) => event.kind === 'note_saved')?.occurredAt,
      KFZ_WORK_QUEUE_PREVIEW_HISTORY_FACTS.noteSavedAtByIndex[0],
    )
    assert.equal(
      local.events.find((event) => event.kind === 'draft_saved')?.occurredAt,
      KFZ_WORK_QUEUE_PREVIEW_HISTORY_FACTS.draftSavedAt,
    )
    assert.equal(
      local.events.find((event) => event.kind === 'internal_task_created')?.occurredAt,
      KFZ_WORK_QUEUE_PREVIEW_HISTORY_FACTS.taskCreatedAt,
    )
    assert.equal(
      local.historyHref,
      `/dev/inbox?item=${KFZ_WORK_QUEUE_PREVIEW_REVIEW_ID}&view=history`,
    )
    assert.equal(local.workHref, `/dev/inbox?item=${KFZ_WORK_QUEUE_PREVIEW_REVIEW_ID}`)

    const freshHistory = presentInboxManualReviewHistory(fresh)
    assert.deepEqual(
      freshHistory.events.map((event) => event.kind),
      ['received'],
    )
    assert.equal(freshHistory.employeeEventCount, 0)

    const doneHistory = presentInboxManualReviewHistory(done, {
      allowLocalFixtureFacts: true,
    })
    assert.deepEqual(
      doneHistory.events.map((event) => event.kind),
      ['received', 'review_started', 'manually_completed'],
    )
    assert.equal(doneHistory.events[2]?.occurredAt, done.processed_at)
    assert.equal(INBOX_HISTORY_KIND_LABELS.manually_completed, 'Manuell erledigt')
  })

  it('exposes history on the authenticated workspace without changing status', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-history-workspace')
      const started = applyKfzManualTriageCommand(
        {
          content: item.content,
          processed_at: item.processed_at,
          linkedTaskId: null,
        },
        { type: 'start_review' },
      )
      assert.equal(started.ok, true)
      if (!started.ok) {
        return
      }

      const reviewing = { ...item, content: started.next.content }
      const view = presentAuthenticatedKfzInbox({
        unprocessedItems: [reviewing],
        processedItems: [],
        taskRelationsByItemId: { [reviewing.id]: TASK_ID },
        selectedItemId: reviewing.id,
        source: 'kfz',
        view: 'history',
      })

      assert.ok(view.selectedWorkspace)
      assert.equal(view.selectedWorkspace.sections.history, true)
      assert.equal(view.selectedWorkspace.activeView, 'history')
      assert.equal(
        view.selectedWorkspace.historyHref,
        `/app/inbox?source=kfz&item=${reviewing.id}&view=history`,
      )
      assert.equal(
        view.selectedWorkspace.workHref,
        `/app/inbox?source=kfz&item=${reviewing.id}`,
      )
      assert.equal(view.selectedWorkspace.href, `/app/inbox?source=kfz&item=${reviewing.id}`)
      assert.equal(view.selectedWorkspace.history.includesAiSuggestion, false)
      assert.equal(view.selectedWorkspace.manualStatusOnly, true)
      assert.equal(view.selectedWorkspace.noExternalSideEffect, true)
      assert.equal(reviewing.processed_at, null)
    })
  })
})

describe('review history stays off production send paths', () => {
  it('authenticated inbox never opts into local fixture times', () => {
    const inboxPage = fs.readFileSync(path.join(srcRoot, 'app/app/inbox/page.tsx'), 'utf8')
    assert.match(inboxPage, /parseInboxItemView/)
    assert.doesNotMatch(inboxPage, /allowLocalHistoryFixtureFacts/)
    assert.doesNotMatch(inboxPage, /kfz-work-queue-preview|unified-inbox-preview/)

    const presenter = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/lib/present-authenticated-kfz-inbox.ts'),
      'utf8',
    )
    assert.doesNotMatch(presenter, /send-whatsapp|whatsapp-outbound|resend/)

    const historyLib = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/lib/inbox-manual-review-history.ts'),
      'utf8',
    )
    assert.doesNotMatch(historyLib, /send-whatsapp|whatsapp-outbound|resend/)
    assert.match(historyLib, /Does not invent actors or timestamps/)

    const previewPage = fs.readFileSync(path.join(srcRoot, 'app/dev/inbox/page.tsx'), 'utf8')
    const previewApp = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/components/inbox-factual-work-queue-preview-app.tsx'),
      'utf8',
    )
    assert.match(previewPage, /InboxFactualWorkQueuePreviewApp/)
    assert.match(previewApp, /allowLocalHistoryFixtureFacts/)
    assert.match(previewApp, /parseInboxItemView/)
  })
})
