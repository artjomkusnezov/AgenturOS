/**
 * Unified daily inbox: Kfz landing + manual phone / email / note on one list.
 * Human-controlled filters only — no auto classification, send, or CRM.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, it } from 'node:test'

import { AI_PROPOSAL_HUMAN_REVIEW_LABEL } from '@/features/ai-inbound/lib/format-proposal-labels'
import { getInboxAiProposal } from '@/features/ai-inbound/services/get-inbox-ai-proposal'
import {
  applyKfzManualTriageCommand,
  KFZ_REVIEW_NO_AUTO_ACTION,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
import {
  INBOX_SOURCE_FILTER_LABELS,
  INBOX_SOURCE_FILTER_NAV_LABEL,
  countInboxSourceFilters,
  filterInboxItemsBySource,
  parseInboxSourceFilter,
} from '@/features/inbox/lib/inbox-source-filter'
import { buildInboxHref } from '@/features/inbox/lib/kfz-work-queue'
import {
  presentAuthenticatedKfzInbox,
  AUTHENTICATED_INBOX_PATH,
  isAuthenticatedInboxHref,
} from '@/features/inbox/lib/present-authenticated-kfz-inbox'
import {
  UNIFIED_INBOX_CONTACT_MISSING,
  UNIFIED_INBOX_CONTACT_MISSING_STATE,
  UNIFIED_INBOX_CONTACT_PRESENT_STATE,
  presentUnifiedInboxCard,
} from '@/features/inbox/lib/present-unified-inbox-card'
import {
  UNIFIED_INBOX_PREVIEW_EMAIL_ID,
  UNIFIED_INBOX_PREVIEW_NOTE_ID,
  UNIFIED_INBOX_PREVIEW_OTHER_ID,
  UNIFIED_INBOX_PREVIEW_PATH,
  UNIFIED_INBOX_PREVIEW_PHONE_ID,
  UNIFIED_INBOX_PREVIEW_PHONE_KFZ_ID,
  buildUnifiedInboxPreviewItems,
} from '@/features/inbox/lib/unified-inbox-preview'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import {
  buildKfzLandingPayload,
  type KfzLandingFormValues,
} from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import { resetRateLimitBucketsForTests } from '@/features/inbound/kfz/lib/rate-limit-seam'
import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'
import { confirmManualCapture } from '@/features/inbound/manual/services/confirm-manual-capture'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const SECRET = 'test-unified-inbox-secret'
const TASK_ID = '33333333-3333-4333-8333-333333333333'

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

describe('unified inbox source filters', () => {
  it('parses human source filters and keeps unknown values as all', () => {
    assert.equal(parseInboxSourceFilter(undefined), 'all')
    assert.equal(parseInboxSourceFilter(''), 'all')
    assert.equal(parseInboxSourceFilter('unknown'), 'all')
    assert.equal(parseInboxSourceFilter('kfz'), 'kfz')
    assert.equal(parseInboxSourceFilter('other'), 'other')
    assert.equal(parseInboxSourceFilter('phone'), 'phone')
    assert.equal(parseInboxSourceFilter('pasted_email'), 'pasted_email')
    assert.equal(parseInboxSourceFilter('own_note'), 'own_note')
    assert.equal(INBOX_SOURCE_FILTER_LABELS.phone, 'Telefonat')
    assert.equal(INBOX_SOURCE_FILTER_LABELS.pasted_email, 'E-Mail eingefügt')
    assert.equal(INBOX_SOURCE_FILTER_LABELS.own_note, 'Eigene Notiz')
    assert.equal(INBOX_SOURCE_FILTER_NAV_LABEL, 'Eingang')
    assert.equal(buildInboxHref({ source: 'phone' }), '/app/inbox?source=phone')
    assert.equal(
      buildInboxHref({
        source: 'kfz',
        phase: 'missing_information',
        itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }),
      '/app/inbox?source=kfz&phase=missing_information&item=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    )
    assert.equal(buildInboxHref({ source: 'all', phase: 'all' }), '/app/inbox')
  })

  it('filters the same inbox records by Kfz, other, phone, pasted email and own note', () => {
    const preview = buildUnifiedInboxPreviewItems()
    const items = [...preview.unprocessedItems, ...preview.processedItems]
    const counts = countInboxSourceFilters(items)

    assert.equal(counts.all, items.length)
    assert.ok(counts.kfz >= 5)
    assert.ok(counts.other >= 3)
    assert.equal(counts.phone, 2)
    assert.equal(counts.pasted_email, 1)
    assert.equal(counts.own_note, 1)
    assert.equal(counts.kfz + counts.other, counts.all)

    const phoneIds = filterInboxItemsBySource(items, 'phone').map((item) => item.id)
    assert.deepEqual(phoneIds.sort(), [
      UNIFIED_INBOX_PREVIEW_PHONE_ID,
      UNIFIED_INBOX_PREVIEW_PHONE_KFZ_ID,
    ].sort())

    const kfzIds = filterInboxItemsBySource(items, 'kfz').map((item) => item.id)
    assert.ok(kfzIds.includes(UNIFIED_INBOX_PREVIEW_PHONE_KFZ_ID))
    assert.ok(!kfzIds.includes(UNIFIED_INBOX_PREVIEW_PHONE_ID))
    assert.ok(!kfzIds.includes(UNIFIED_INBOX_PREVIEW_OTHER_ID))

    const otherIds = filterInboxItemsBySource(items, 'other').map((item) => item.id)
    assert.ok(otherIds.includes(UNIFIED_INBOX_PREVIEW_PHONE_ID))
    assert.ok(otherIds.includes(UNIFIED_INBOX_PREVIEW_EMAIL_ID))
    assert.ok(otherIds.includes(UNIFIED_INBOX_PREVIEW_NOTE_ID))
    assert.ok(otherIds.includes(UNIFIED_INBOX_PREVIEW_OTHER_ID))
    assert.ok(!otherIds.includes(UNIFIED_INBOX_PREVIEW_PHONE_KFZ_ID))

    assert.deepEqual(
      filterInboxItemsBySource(items, 'pasted_email').map((item) => item.id),
      [UNIFIED_INBOX_PREVIEW_EMAIL_ID],
    )
    assert.deepEqual(
      filterInboxItemsBySource(items, 'own_note').map((item) => item.id),
      [UNIFIED_INBOX_PREVIEW_NOTE_ID],
    )
  })
})

describe('unified inbox cards and review workspace', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('shows source, received time, contact, request, missing-info and review status on every card', async () => {
    await withKfzEnv(async () => {
      const landing = await submitLandingToInbox(
        baseValues({
          phone: '',
          email: 'lisa@example.com',
          preferredChannel: 'phone',
          vehicleMake: '',
          vehicleModel: '',
          vehicleYear: '',
        }),
        'lp-unified-card',
      )
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
          externalId: 'manual:unified-phone',
        },
      })
      const note = await confirmManualCapture({
        store,
        agencyId: AGENCY_ID,
        actorUserId: ACTOR_ID,
        capture: {
          sourceText: 'Eigene Notiz ohne Kontakt.',
          originKind: 'personal_note',
          title: 'Akte prüfen',
          capturedAt: '2026-09-08T09:30:00.000Z',
          externalId: 'manual:unified-note',
        },
      })
      assert.equal(phone.success, true)
      assert.equal(note.success, true)
      if (!phone.success || !note.success) {
        return
      }

      const landingCard = presentUnifiedInboxCard(landing)
      assert.equal(landingCard.sourceLabel, 'Website · Kfz')
      assert.ok(landingCard.receivedAtLabel.length > 0)
      assert.match(landingCard.customerContact, /Max Mustermann/)
      assert.match(landingCard.requestSummary, /Wechsel Kfz-Versicherung/)
      assert.match(landingCard.missingInformationLabel, /Angabe/)
      assert.ok(landingCard.missingCount > 0)
      assert.equal(landingCard.reviewStatus.label, 'Fehlende Angaben')
      assert.equal(landingCard.href, `/app/inbox?item=${landing.id}`)
      assert.equal(isAuthenticatedInboxHref(landingCard.href), true)

      const phoneCard = presentUnifiedInboxCard(phone.item, { source: 'phone' })
      assert.equal(phoneCard.sourceLabel, 'Telefonat')
      assert.match(phoneCard.customerContact, /Berger/)
      assert.match(phoneCard.customerContact, /\+491701112233/)
      assert.match(phoneCard.requestSummary, /Haftpflicht/)
      assert.equal(phoneCard.missingInformationLabel, UNIFIED_INBOX_CONTACT_PRESENT_STATE)
      assert.equal(phoneCard.missingCount, 0)
      assert.equal(phoneCard.reviewStatus.label, 'Neu')
      assert.equal(phoneCard.href, `/app/inbox?source=phone&item=${phone.item.id}`)

      const noteCard = presentUnifiedInboxCard(note.item, { source: 'own_note' })
      assert.equal(noteCard.sourceLabel, 'Eigene Notiz')
      assert.equal(noteCard.customerContact, UNIFIED_INBOX_CONTACT_MISSING)
      assert.equal(noteCard.missingInformationLabel, UNIFIED_INBOX_CONTACT_MISSING_STATE)
      assert.equal(noteCard.missingCount, 1)
      assert.equal(noteCard.reviewStatus.kind, 'new')
    })
  })

  it('opens any filtered item on the existing human-review workspace without sending', async () => {
    await withKfzEnv(async () => {
      const landing = await submitLandingToInbox(baseValues(), 'lp-unified-open')
      const store = createMemoryInboundIntakeStore()
      const email = await confirmManualCapture({
        store,
        agencyId: AGENCY_ID,
        actorUserId: ACTOR_ID,
        capture: {
          sourceText: 'Eingefügte E-Mail zu Wohngebäude.',
          originKind: 'pasted_email',
          title: 'Wohngebäude',
          origin: {
            displayName: 'Lisa Beispiel',
            address: 'lisa@example.com',
            addressKind: 'email',
          },
          capturedAt: '2026-09-08T09:20:00.000Z',
          externalId: 'manual:unified-email',
        },
      })
      assert.equal(email.success, true)
      if (!email.success) {
        return
      }

      const started = applyKfzManualTriageCommand(
        {
          content: landing.content,
          processed_at: landing.processed_at,
          linkedTaskId: null,
        },
        { type: 'start_review' },
      )
      assert.equal(started.ok, true)
      if (!started.ok) {
        return
      }
      const reviewing = { ...landing, content: started.next.content }

      const view = presentAuthenticatedKfzInbox({
        unprocessedItems: [reviewing, email.item],
        processedItems: [],
        taskRelationsByItemId: { [reviewing.id]: TASK_ID },
        selectedItemId: reviewing.id,
        source: 'kfz',
      })
      const ai = await getInboxAiProposal(reviewing)

      assert.equal(view.usesPreviewFixtures, false)
      assert.equal(view.sourceFilter, 'kfz')
      assert.equal(view.sourceNavLabel, INBOX_SOURCE_FILTER_NAV_LABEL)
      assert.equal(view.sourceCounts.kfz, 1)
      assert.equal(view.sourceCounts.pasted_email, 1)
      assert.equal(view.cards.length, 1)
      assert.equal(view.cards[0]?.itemId, reviewing.id)
      assert.equal(view.sourceFilterHrefs.kfz, `/app/inbox?source=kfz&item=${reviewing.id}`)
      assert.equal(view.sourceFilterHrefs.pasted_email, '/app/inbox?source=pasted_email')
      assert.equal(view.sourceFilterHrefs.all, `/app/inbox?item=${reviewing.id}`)
      assert.equal(view.filterHrefs.in_review, `/app/inbox?source=kfz&phase=in_review&item=${reviewing.id}`)

      const workspace = view.selectedWorkspace
      assert.ok(workspace)
      assert.equal(workspace.href, `/app/inbox?source=kfz&item=${reviewing.id}`)
      assert.equal(workspace.sections.notes, true)
      assert.equal(workspace.sections.editableDraft, true)
      assert.equal(workspace.sections.task, true)
      assert.equal(workspace.task.linkedTaskId, TASK_ID)
      assert.equal(workspace.manualStatusOnly, true)
      assert.equal(workspace.noExternalSideEffect, true)
      assert.equal(
        workspace.editableDraft.aiSuggestionRequiresHumanReview,
        AI_PROPOSAL_HUMAN_REVIEW_LABEL,
      )
      assert.match(workspace.notes.heading, /Interne Notiz/)
      assert.match(workspace.editableDraft.noSendLabel, /Nichts wird automatisch gesendet/)
      assert.equal(ai.proposal.status, 'proposal')
      assert.match(KFZ_REVIEW_NO_AUTO_ACTION, /Nichts wird automatisch/)

      const emailView = presentAuthenticatedKfzInbox({
        unprocessedItems: [reviewing, email.item],
        processedItems: [],
        selectedItemId: email.item.id,
        source: 'pasted_email',
      })
      assert.equal(emailView.cards.length, 1)
      assert.equal(emailView.selectedWorkspace, null)
      assert.ok(emailView.selectedCard)
      assert.equal(emailView.selectedCard.sourceLabel, 'E-Mail eingefügt')
      assert.equal(emailView.selectedCard.href, `/app/inbox?source=pasted_email&item=${email.item.id}`)
      assert.equal(isAuthenticatedInboxHref(emailView.selectedCard.href), true)
      assert.doesNotMatch(emailView.selectedCard.href, /\/dev\//)
    })
  })
})

describe('unified inbox local fixtures stay off the production path', () => {
  it('authenticated inbox uses live records; /dev/inbox is preview-only', () => {
    const inboxPage = fs.readFileSync(path.join(srcRoot, 'app/app/inbox/page.tsx'), 'utf8')
    assert.match(inboxPage, /listInboxItemsForCurrentUser/)
    assert.match(inboxPage, /presentAuthenticatedKfzInbox/)
    assert.match(inboxPage, /source/)
    assert.doesNotMatch(inboxPage, /unified-inbox-preview|buildUnifiedInboxPreviewItems|\/dev\/inbox/)

    const presenter = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/lib/present-authenticated-kfz-inbox.ts'),
      'utf8',
    )
    assert.doesNotMatch(presenter, /unified-inbox-preview|send-whatsapp|whatsapp-outbound|resend/)

    const previewPage = fs.readFileSync(path.join(srcRoot, 'app/dev/inbox/page.tsx'), 'utf8')
    assert.match(previewPage, /buildUnifiedInboxPreviewItems/)
    assert.match(previewPage, /NODE_ENV === 'production'/)
    assert.match(previewPage, /UNIFIED_INBOX_PREVIEW_PATH/)
    assert.equal(UNIFIED_INBOX_PREVIEW_PATH, '/dev/inbox')
  })
})
