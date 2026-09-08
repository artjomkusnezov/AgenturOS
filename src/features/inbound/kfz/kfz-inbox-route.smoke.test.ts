/**
 * Authenticated inbox/dashboard route for the daily Kfz queue.
 * Uses normalized inbound records — never preview fixtures, never outbound.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, it } from 'node:test'

import {
  AI_PROPOSAL_BADGE_LABEL,
  AI_PROPOSAL_HUMAN_REVIEW_LABEL,
} from '@/features/ai-inbound/lib/format-proposal-labels'
import { getInboxAiProposal } from '@/features/ai-inbound/services/get-inbox-ai-proposal'
import {
  applyKfzManualTriageCommand,
  KFZ_REVIEW_NO_AUTO_ACTION,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
import {
  formatKfzWorkQueueMeta,
  KFZ_WORK_QUEUE_NAV_LABEL,
  KFZ_WORK_QUEUE_PHASE_LABELS,
} from '@/features/inbox/lib/kfz-work-queue'
import {
  AUTHENTICATED_INBOX_PATH,
  isAuthenticatedInboxHref,
  presentAuthenticatedKfzInbox,
  presentDashboardKfzQueue,
} from '@/features/inbox/lib/present-authenticated-kfz-inbox'
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
const SECRET = 'test-kfz-inbox-route-secret'
const TASK_ID = '33333333-3333-4333-8333-333333333333'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

const PRODUCTION_ROUTE_FILES = [
  'app/app/inbox/page.tsx',
  'features/dashboard/components/dashboard-page-content.tsx',
  'features/dashboard/components/agenturzentrale-dashboard.tsx',
  'features/inbox/lib/present-authenticated-kfz-inbox.ts',
] as const

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
    channel: 'email',
    source: 'email',
    title: 'Police',
    content: 'Eine E-Mail',
    processed_at: null,
    inbound_metadata: {},
    sender: { displayName: 'Post', address: 'a@b.de', addressKind: 'email' },
    origin: null,
    detected_language: null,
    external_id: null,
    message_kind: null,
    received_at: '2026-09-07T12:00:00.000Z',
    transcript_text: null,
    transcription_completed_at: null,
    transcription_error: null,
    transcription_model: null,
    transcription_provider: null,
    transcription_started_at: null,
    transcription_status: 'idle',
    created_at: '2026-09-07T12:00:00.000Z',
    updated_at: '2026-09-07T12:00:00.000Z',
  }
}

describe('authenticated Kfz inbox / dashboard route', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('opens a normalized inbound record on /app/inbox with the one-screen review workspace', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-auth-inbox-open')
      const view = presentAuthenticatedKfzInbox({
        unprocessedItems: [item],
        processedItems: [],
        selectedItemId: item.id,
      })
      const ai = await getInboxAiProposal(item)

      assert.equal(view.usesPreviewFixtures, false)
      assert.equal(view.hrefBasePath, AUTHENTICATED_INBOX_PATH)
      assert.equal(view.navLabel, KFZ_WORK_QUEUE_NAV_LABEL)
      assert.equal(view.phaseFilter, 'all')
      assert.equal(view.queueMode, false)
      assert.equal(view.counts.needs_review, 1)
      assert.equal(view.kfzCount, 1)
      assert.match(view.metaLabel, /Neu 1/)
      assert.match(view.metaLabel, /Fehlende Angaben 0/)
      assert.match(view.metaLabel, /In Prüfung 0/)
      assert.match(view.metaLabel, /Erledigt 0/)
      assert.equal(view.filterHrefs.all, `/app/inbox?item=${item.id}`)
      assert.equal(
        view.filterHrefs.needs_review,
        `/app/inbox?phase=needs_review&item=${item.id}`,
      )
      assert.equal(
        view.filterHrefs.missing_information,
        '/app/inbox?phase=missing_information',
      )
      assert.equal(view.filterHrefs.in_review, '/app/inbox?phase=in_review')
      assert.equal(view.filterHrefs.handled, '/app/inbox?phase=handled')
      assert.equal(view.rows[0]?.href, `/app/inbox?item=${item.id}`)
      assert.equal(isAuthenticatedInboxHref(view.rows[0]?.href ?? ''), true)

      const workspace = view.selectedWorkspace
      assert.ok(workspace)
      assert.equal(workspace.href, `/app/inbox?item=${item.id}`)
      assert.equal(workspace.customerName, 'Max Mustermann')
      assert.equal(workspace.queuePhase, 'needs_review')
      assert.equal(workspace.queuePhaseLabel, KFZ_WORK_QUEUE_PHASE_LABELS.needs_review)
      assert.ok(workspace.facts.length > 0)
      assert.ok(workspace.missingInformationChecklist.length > 0)
      assert.equal(workspace.sections.facts, true)
      assert.equal(workspace.sections.missingInformation, true)
      assert.equal(workspace.sections.task, true)
      assert.equal(workspace.sections.notes, true)
      assert.equal(workspace.sections.editableDraft, true)
      assert.equal(workspace.notes.canRecord, true)
      assert.match(workspace.notes.heading, /Interne Notiz/)
      assert.match(workspace.editableDraft.noSendLabel, /Nichts wird automatisch gesendet/)
      assert.equal(
        workspace.editableDraft.aiSuggestionRequiresHumanReview,
        AI_PROPOSAL_HUMAN_REVIEW_LABEL,
      )
      assert.equal(workspace.manualStatusOnly, true)
      assert.equal(workspace.noExternalSideEffect, true)
      assert.equal(workspace.task.linkedTaskId, null)
      assert.equal(workspace.task.canCreateFollowUp, true)
      assert.equal(AI_PROPOSAL_BADGE_LABEL, 'KI-Vorschlag · Entwurf')
      assert.equal(ai.proposal.status, 'proposal')
      assert.match(workspace.factualSummary, /Wechsel Kfz-Versicherung/)
    })
  })

  it('reuses Neu / Fehlende Angaben / In Prüfung / Erledigt on real inbound records', async () => {
    await withKfzEnv(async () => {
      const fresh = await submitLandingToInbox(baseValues(), 'lp-auth-filter-new')
      const missing = await submitLandingToInbox(
        baseValues({
          phone: '',
          email: 'lisa@example.com',
          preferredChannel: 'phone',
          vehicleMake: '',
          vehicleModel: '',
          vehicleYear: '',
        }),
        'lp-auth-filter-missing',
      )
      const reviewing = await submitLandingToInbox(baseValues(), 'lp-auth-filter-review')
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

      const closed = await submitLandingToInbox(baseValues(), 'lp-auth-filter-done')
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
      const unprocessed = [fresh, missing, inReview, email]
      const processed = [done]

      const allView = presentAuthenticatedKfzInbox({
        unprocessedItems: unprocessed,
        processedItems: processed,
      })
      assert.equal(allView.counts.needs_review, 1)
      assert.equal(allView.counts.missing_information, 1)
      assert.equal(allView.counts.in_review, 1)
      assert.equal(allView.counts.handled, 1)
      assert.equal(allView.kfzCount, 4)
      assert.equal(allView.totalInboxCount, 5)
      assert.equal(allView.unprocessedItems.length, 4)
      assert.equal(
        formatKfzWorkQueueMeta(allView.counts),
        'Neu 1 · Fehlende Angaben 1 · In Prüfung 1 · Erledigt 1',
      )
      assert.match(
        allView.metaLabel,
        /Neu 1 · Fehlende Angaben 1 · In Prüfung 1 · Erledigt 1 · 5 Elemente/,
      )

      const missingView = presentAuthenticatedKfzInbox({
        unprocessedItems: unprocessed,
        processedItems: processed,
        phase: 'missing_information',
        selectedItemId: missing.id,
      })
      assert.equal(missingView.queueMode, true)
      assert.equal(missingView.queueHeading, 'Fehlende Angaben')
      assert.deepEqual(
        missingView.rows.map((row) => row.itemId),
        [missing.id],
      )
      assert.equal(missingView.selectedWorkspace?.queuePhase, 'missing_information')
      assert.equal(
        missingView.selectedWorkspace?.href,
        `/app/inbox?phase=missing_information&item=${missing.id}`,
      )
      assert.equal(
        missingView.filterHrefs.missing_information,
        `/app/inbox?phase=missing_information&item=${missing.id}`,
      )
      assert.equal(missingView.filterHrefs.needs_review, '/app/inbox?phase=needs_review')

      const handledView = presentAuthenticatedKfzInbox({
        unprocessedItems: unprocessed,
        processedItems: processed,
        phase: 'handled',
        selectedItemId: done.id,
      })
      assert.equal(handledView.queueHeading, 'Erledigt')
      assert.equal(handledView.rows[0]?.phase, 'handled')
      assert.equal(handledView.selectedWorkspace?.manualStatusOnly, true)
      assert.equal(handled.ok, true)
      if (handled.ok) {
        assert.equal(handled.mutated.task, false)
      }
    })
  })

  it('keeps follow-up visibility on the authenticated inbox without sending', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-auth-follow-up')
      const tasked = applyKfzManualTriageCommand(
        { content: item.content, processed_at: item.processed_at, linkedTaskId: null },
        { type: 'create_follow_up_task', taskId: TASK_ID },
      )
      assert.equal(tasked.ok, true)
      if (!tasked.ok) {
        return
      }

      const view = presentAuthenticatedKfzInbox({
        unprocessedItems: [item],
        processedItems: [],
        taskRelationsByItemId: { [item.id]: TASK_ID },
        selectedItemId: item.id,
        phase: 'in_review',
      })
      const workspace = view.selectedWorkspace
      assert.ok(workspace)
      assert.equal(workspace.queuePhase, 'in_review')
      assert.equal(workspace.task.linkedTaskId, TASK_ID)
      assert.equal(workspace.task.href, `/app/tasks?task=${TASK_ID}`)
      assert.equal(workspace.task.canCreateFollowUp, false)
      assert.equal(workspace.noExternalSideEffect, true)
      assert.match(view.rows[0]?.nextManualAction ?? '', new RegExp(KFZ_REVIEW_NO_AUTO_ACTION))
      assert.equal(tasked.next.processed_at, null)
    })
  })

  it('wires dashboard counts and item hrefs to /app/inbox, not the local preview', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(
        baseValues({
          phone: '',
          email: 'anna@example.com',
          preferredChannel: 'phone',
          vehicleMake: '',
          vehicleModel: '',
          vehicleYear: '',
          inquiryReason: 'Unfall Kfz-Versicherung',
        }),
        'lp-auth-dashboard',
      )
      const closed = await submitLandingToInbox(baseValues(), 'lp-auth-dashboard-done')
      const handled = applyKfzManualTriageCommand(
        { content: closed.content, processed_at: closed.processed_at, linkedTaskId: null },
        { type: 'mark_handled', at: '2026-09-07T18:00:00.000Z' },
      )
      assert.equal(handled.ok, true)
      if (!handled.ok) {
        return
      }

      const dashboard = presentDashboardKfzQueue({
        unprocessedItems: [item],
        processedItems: [{ ...closed, processed_at: handled.next.processed_at }],
      })

      assert.equal(dashboard.usesPreviewFixtures, false)
      assert.equal(dashboard.hrefBasePath, '/app/inbox')
      assert.equal(dashboard.navLabel, 'Kfz-Tagesliste')
      assert.equal(dashboard.counts.missing_information, 1)
      assert.equal(dashboard.counts.handled, 1)
      assert.equal(dashboard.filterHrefs.missing_information, '/app/inbox?phase=missing_information')
      assert.equal(dashboard.filterHrefs.handled, '/app/inbox?phase=handled')
      assert.equal(dashboard.previewRows[0]?.href, `/app/inbox?item=${item.id}`)
      assert.equal(isAuthenticatedInboxHref(dashboard.previewRows[0]?.href ?? ''), true)
      assert.doesNotMatch(dashboard.previewRows[0]?.href ?? '', /\/dev\//)
    })
  })
})

describe('authenticated inbox source contract', () => {
  it('production inbox and dashboard paths do not import preview fixtures', () => {
    for (const relativePath of PRODUCTION_ROUTE_FILES) {
      const source = fs.readFileSync(path.join(srcRoot, relativePath), 'utf8')
      assert.doesNotMatch(
        source,
        /kfz-work-queue-preview|KFZ_WORK_QUEUE_PREVIEW|\/dev\/kfz-work-queue/,
        `${relativePath} must not use the local Kfz preview`,
      )
    }

    const inboxPage = fs.readFileSync(path.join(srcRoot, 'app/app/inbox/page.tsx'), 'utf8')
    assert.match(inboxPage, /listInboxItemsForCurrentUser/)
    assert.match(inboxPage, /presentAuthenticatedKfzInbox/)

    const dashboardPage = fs.readFileSync(
      path.join(srcRoot, 'features/dashboard/components/dashboard-page-content.tsx'),
      'utf8',
    )
    assert.match(dashboardPage, /listInboxItemsForCurrentUser/)
    assert.match(dashboardPage, /presentDashboardKfzQueue/)

    const presenter = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/lib/present-authenticated-kfz-inbox.ts'),
      'utf8',
    )
    assert.doesNotMatch(presenter, /send-whatsapp|whatsapp-outbound|resend/)
    assert.match(presenter, /AUTHENTICATED_INBOX_PATH/)

    const previewPage = fs.readFileSync(path.join(srcRoot, 'app/dev/kfz-work-queue/page.tsx'), 'utf8')
    assert.match(previewPage, /buildKfzWorkQueuePreviewItems/)
    assert.match(previewPage, /NODE_ENV === 'production'/)
  })
})
