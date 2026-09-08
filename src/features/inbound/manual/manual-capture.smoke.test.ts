/**
 * Manual plain-text capture → normalized inbound draft → explicit confirm → inbox.
 * No automatic customer contact, task creation, status change, or AI decision.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { getInboxAiProposal } from '@/features/ai-inbound/services/get-inbox-ai-proposal'
import { ingestInboundItem } from '@/features/inbound/services/inbound-intake-service'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'
import { buildInboxHref } from '@/features/inbox/lib/kfz-work-queue'
import { getInboxItemSourceLabel } from '@/features/inbox/lib/inbox-source'
import { buildManualCaptureDraft } from '@/features/inbound/manual/lib/build-manual-capture-draft'
import { toInboundItemFromManualText } from '@/features/inbound/manual/lib/manual-adapter'
import {
  MANUAL_CAPTURE_ACTION_LABEL,
  MANUAL_CAPTURE_CONFIRM_LABEL,
  MANUAL_CAPTURE_DUPLICATE_CREATE_ANYWAY_LABEL,
  MANUAL_CAPTURE_DUPLICATE_DECISION_HINT,
  MANUAL_CAPTURE_DUPLICATE_OPEN_LABEL,
  MANUAL_CAPTURE_DUPLICATE_REASON_CONTACT,
  MANUAL_CAPTURE_DUPLICATE_REASON_RECENT_TITLE,
  MANUAL_CAPTURE_DUPLICATE_REASON_SOURCE_TEXT,
  MANUAL_CAPTURE_DUPLICATE_WARNING,
  MANUAL_CAPTURE_EMPTY_ERROR,
  MANUAL_CAPTURE_NO_AUTO_ACTION,
  MANUAL_CAPTURE_ORIGIN_KIND_EMAIL_LABEL,
  MANUAL_CAPTURE_ORIGIN_KIND_ERROR,
  MANUAL_CAPTURE_ORIGIN_KIND_NOTE_LABEL,
  MANUAL_CAPTURE_ORIGIN_KIND_PHONE_LABEL,
  MANUAL_CAPTURE_REVIEW_LABEL,
  MANUAL_FIELD_SUGGESTION_LABEL,
} from '@/features/inbound/manual/lib/manual-capture-copy'
import {
  MANUAL_CAPTURE_FAMILY,
  MANUAL_CAPTURE_KIND,
  readManualCaptureOriginKind,
} from '@/features/inbound/manual/lib/manual-capture-origin'
import {
  findLikelyManualCaptureDuplicate,
  MANUAL_CAPTURE_RECENT_TITLE_WINDOW_MS,
} from '@/features/inbound/manual/lib/find-likely-manual-capture-duplicate'
import {
  MANUAL_CAPTURE_PREVIEW_EXISTING_ID,
  MANUAL_CAPTURE_PREVIEW_EXISTING_PHONE,
  MANUAL_CAPTURE_PREVIEW_EXISTING_TEXT,
  MANUAL_CAPTURE_PREVIEW_EXISTING_TITLE,
  MANUAL_CAPTURE_PREVIEW_NOW,
  MANUAL_CAPTURE_PREVIEW_PATH,
  buildManualCapturePreviewInboxItem,
  buildManualCapturePreviewSeedItems,
} from '@/features/inbound/manual/lib/manual-capture-preview'
import {
  presentManualCaptureDraft,
  presentManualCaptureDuplicateWarning,
} from '@/features/inbound/manual/lib/present-manual-capture'
import { confirmManualCapture } from '@/features/inbound/manual/services/confirm-manual-capture'
import { QUICK_ACTIONS } from '@/features/capture/types/capture-mode'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const RECEIVED_AT = '2026-09-08T10:00:00.000Z'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const repoRoot = path.resolve(srcRoot, '..')

const SAMPLE_TEXT = [
  'Rückruf Kunde Müller',
  'Bitte wegen Kfz-Versicherung anrufen.',
  'E-Mail: mueller@example.com',
].join('\n')

describe('manual capture adapter', () => {
  it('maps confirmed plain text onto provider-neutral inbound fields', () => {
    const item = toInboundItemFromManualText({
      externalId: 'manual:test-001',
      capturedAt: RECEIVED_AT,
      sourceText: SAMPLE_TEXT,
      originKind: 'phone_call',
      title: 'Rückruf Kunde Müller',
      capturer: { displayName: 'Anna Agentur', address: null, addressKind: 'other' },
      origin: {
        displayName: null,
        address: 'mueller@example.com',
        addressKind: 'email',
      },
    })

    assert.equal(item.channel, 'manual')
    assert.equal(item.kind, 'text')
    assert.equal(item.externalId, 'manual:test-001')
    assert.equal(item.title, 'Rückruf Kunde Müller')
    assert.equal(item.content, SAMPLE_TEXT)
    assert.equal(item.sender.displayName, 'Anna Agentur')
    assert.equal(item.origin?.address, 'mueller@example.com')
    assert.equal(item.attachments, undefined)
    assert.deepEqual(item.metadata?.capture, {
      family: MANUAL_CAPTURE_FAMILY,
      kind: MANUAL_CAPTURE_KIND,
      originKind: 'phone_call',
    })
  })

  it('keeps original text unchanged when the source is a pasted email', () => {
    const sourceText = 'Von: Vera Beispiel\nBitte Unterlagen prüfen.'
    const item = toInboundItemFromManualText({
      externalId: 'manual:email-paste',
      capturedAt: RECEIVED_AT,
      sourceText,
      originKind: 'pasted_email',
      title: null,
      capturer: { displayName: 'Mitarbeiter', address: null, addressKind: 'other' },
      origin: null,
    })

    assert.equal(item.channel, 'manual')
    assert.equal(item.content, sourceText)
    assert.equal(readManualCaptureOriginKind(item.metadata), 'pasted_email')
  })
})

describe('manual capture draft review', () => {
  it('rejects empty text before a draft exists', () => {
    const result = buildManualCaptureDraft('   ', { originKind: 'personal_note' })
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.error, MANUAL_CAPTURE_EMPTY_ERROR)
  })

  it('rejects a draft without an explicit source choice', () => {
    const result = buildManualCaptureDraft(SAMPLE_TEXT, { originKind: '' })
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.error, MANUAL_CAPTURE_ORIGIN_KIND_ERROR)
  })

  it('shows source text and proposed fields, labeling local suggestions', () => {
    const result = buildManualCaptureDraft(
      'Von: Vera Beispiel <vera@example.com>\nBitte Unterlagen prüfen.',
      { originKind: 'pasted_email' },
    )
    assert.equal(result.ok, true)
    if (!result.ok) return

    assert.equal(result.draft.requiresConfirmation, true)
    assert.equal(result.draft.noAutoAction, MANUAL_CAPTURE_NO_AUTO_ACTION)
    assert.equal(result.draft.originKind, 'pasted_email')
    assert.match(result.draft.sourceText, /Bitte Unterlagen prüfen/)
    assert.equal(result.draft.proposed.channel, 'manual')
    assert.equal(result.draft.proposed.kind, 'text')
    assert.equal(result.draft.proposed.originKind, 'pasted_email')
    assert.equal(result.draft.proposed.origin?.address, 'vera@example.com')
    assert.equal(result.draft.proposed.origin?.displayName, 'Vera Beispiel')

    const review = presentManualCaptureDraft(result.draft)
    assert.equal(review.sourceText, result.draft.sourceText)
    assert.equal(review.confirmLabel, MANUAL_CAPTURE_CONFIRM_LABEL)
    assert.equal(review.requiresConfirmation, true)

    const originKindField = review.fields.find((field) => field.id === 'originKind')
    assert.equal(originKindField?.value, MANUAL_CAPTURE_ORIGIN_KIND_EMAIL_LABEL)
    assert.equal(originKindField?.editable, false)
    assert.equal(originKindField?.suggestion, false)

    const titleField = review.fields.find((field) => field.id === 'title')
    const originAddress = review.fields.find((field) => field.id === 'originAddress')
    assert.equal(titleField?.suggestion, true)
    assert.equal(titleField?.suggestionLabel, MANUAL_FIELD_SUGGESTION_LABEL)
    assert.equal(originAddress?.value, 'vera@example.com')
    assert.equal(originAddress?.suggestionLabel, MANUAL_FIELD_SUGGESTION_LABEL)
  })

  it('extracts a phone token as an origin suggestion without customer matching', () => {
    const result = buildManualCaptureDraft('Bitte Rückruf unter +491701234567', {
      originKind: 'phone_call',
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.draft.originKind, 'phone_call')
    assert.equal(result.draft.proposed.origin?.addressKind, 'phone')
    assert.equal(result.draft.proposed.origin?.address, '+491701234567')
    assert.equal(result.draft.proposed.origin?.displayName, null)
  })

  it('does not infer the source choice from contact tokens in the text', () => {
    const result = buildManualCaptureDraft(
      'Von: Vera Beispiel <vera@example.com>\nBitte Unterlagen prüfen.',
      { originKind: 'personal_note' },
    )
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.draft.originKind, 'personal_note')
    assert.equal(result.draft.proposed.origin?.address, 'vera@example.com')
  })

  it('strips markup from pasted text and keeps readable content', () => {
    const result = buildManualCaptureDraft(
      '<script>alert(1)</script>Kunde will <b>Rückruf</b>',
      { originKind: 'personal_note' },
    )
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.doesNotMatch(result.draft.sourceText, /<script|<b>/i)
    assert.match(result.draft.sourceText, /Kunde will/)
    assert.match(result.draft.sourceText, /Rückruf/)
  })
})

describe('manual capture duplicate warning', () => {
  const now = MANUAL_CAPTURE_PREVIEW_NOW

  function requirePreviewItem(
    input: Parameters<typeof buildManualCapturePreviewInboxItem>[0],
  ) {
    const item = buildManualCapturePreviewInboxItem(input)
    assert.equal('error' in item, false)
    if ('error' in item) {
      throw new Error(item.error)
    }
    return item
  }

  it('warns when the unchanged source text already exists', () => {
    const existing = requirePreviewItem({
      sourceText: SAMPLE_TEXT,
      originKind: 'phone_call',
      title: 'Anderer Titel',
      capturedAt: now,
      externalId: 'manual:dup-text',
    })
    const original = { ...existing }

    const match = findLikelyManualCaptureDuplicate({
      sourceText: `  ${SAMPLE_TEXT}  `,
      title: 'Neu erfasst',
      existingItems: [existing],
      now,
    })

    assert.equal(match?.itemId, existing.id)
    assert.equal(match?.reason, 'source_text')
    assert.deepEqual(existing, original)

    const warning = presentManualCaptureDuplicateWarning(
      match!,
      buildInboxHref({ itemId: existing.id }),
    )
    assert.equal(warning.warning, MANUAL_CAPTURE_DUPLICATE_WARNING)
    assert.equal(warning.reasonLabel, MANUAL_CAPTURE_DUPLICATE_REASON_SOURCE_TEXT)
    assert.equal(warning.openLabel, MANUAL_CAPTURE_DUPLICATE_OPEN_LABEL)
    assert.equal(warning.createAnywayLabel, MANUAL_CAPTURE_DUPLICATE_CREATE_ANYWAY_LABEL)
    assert.equal(warning.decisionHint, MANUAL_CAPTURE_DUPLICATE_DECISION_HINT)
    assert.equal(warning.blocksAutomatically, false)
    assert.equal(warning.href, `/app/inbox?item=${existing.id}`)
  })

  it('warns when the same phone number already exists', () => {
    const existing = requirePreviewItem({
      sourceText: 'Früheres Telefonat zum Vertrag',
      originKind: 'phone_call',
      title: 'Früheres Telefonat',
      origin: { displayName: null, address: '+49 170 1234567', addressKind: 'phone' },
      capturedAt: now,
      externalId: 'manual:dup-phone',
    })

    const match = findLikelyManualCaptureDuplicate({
      sourceText: 'Neue Notiz, anderer Wortlaut',
      title: 'Neue Notiz',
      originAddress: '+491701234567',
      originAddressKind: 'phone',
      existingItems: [existing],
      now,
    })

    assert.equal(match?.itemId, existing.id)
    assert.equal(match?.reason, 'contact')
    assert.equal(
      presentManualCaptureDuplicateWarning(match!, '/x').reasonLabel,
      MANUAL_CAPTURE_DUPLICATE_REASON_CONTACT,
    )
  })

  it('warns when the same email already exists', () => {
    const existing = requirePreviewItem({
      sourceText: 'Weitergeleitete Nachricht von Vera',
      originKind: 'pasted_email',
      title: 'Unterlagen',
      origin: { displayName: 'Vera Beispiel', address: 'vera@example.com', addressKind: 'email' },
      capturedAt: now,
      externalId: 'manual:dup-email',
    })

    const match = findLikelyManualCaptureDuplicate({
      sourceText: 'Anderer eingefügter Text',
      title: 'Anderer Titel',
      originAddress: 'Vera@Example.com',
      originAddressKind: 'email',
      existingItems: [existing],
      now,
    })

    assert.equal(match?.itemId, existing.id)
    assert.equal(match?.reason, 'contact')
  })

  it('warns when the same title was captured recently', () => {
    const existing = requirePreviewItem({
      sourceText: 'Erste Notiz zum Vorgang',
      originKind: 'personal_note',
      title: 'Vorgang Müller Haftpflicht',
      capturedAt: '2026-09-07T20:00:00.000Z',
      externalId: 'manual:dup-title-recent',
    })

    const match = findLikelyManualCaptureDuplicate({
      sourceText: 'Zweite Notiz, anderer Wortlaut',
      title: 'vorgang müller haftpflicht',
      existingItems: [existing],
      now,
    })

    assert.equal(match?.itemId, existing.id)
    assert.equal(match?.reason, 'recent_title')
    assert.equal(
      presentManualCaptureDuplicateWarning(match!, '/x').reasonLabel,
      MANUAL_CAPTURE_DUPLICATE_REASON_RECENT_TITLE,
    )
  })

  it('does not warn on an older matching title without source or contact overlap', () => {
    const olderCapturedAt = new Date(
      Date.parse(now) - MANUAL_CAPTURE_RECENT_TITLE_WINDOW_MS - 60_000,
    ).toISOString()
    const existing = requirePreviewItem({
      sourceText: 'Alte Notiz',
      originKind: 'personal_note',
      title: 'Vorgang Müller Haftpflicht',
      capturedAt: olderCapturedAt,
      externalId: 'manual:dup-title-old',
    })

    const match = findLikelyManualCaptureDuplicate({
      sourceText: 'Neue Notiz ohne Kontakt',
      title: 'Vorgang Müller Haftpflicht',
      existingItems: [existing],
      now,
    })

    assert.equal(match, null)
  })

  it('prefers unchanged source text over a weaker contact match', () => {
    const byContact = requirePreviewItem({
      sourceText: 'Nur die Nummer ist gleich',
      originKind: 'phone_call',
      title: 'Andere Sache',
      origin: { displayName: null, address: '+491701234567', addressKind: 'phone' },
      capturedAt: now,
      externalId: 'manual:dup-prefer-contact',
    })
    const byText = requirePreviewItem({
      sourceText: SAMPLE_TEXT,
      originKind: 'personal_note',
      title: 'Kopie',
      capturedAt: '2026-09-08T09:00:00.000Z',
      externalId: 'manual:dup-prefer-text',
    })

    const match = findLikelyManualCaptureDuplicate({
      sourceText: SAMPLE_TEXT,
      title: 'Kopie',
      originAddress: '+491701234567',
      originAddressKind: 'phone',
      existingItems: [byContact, byText],
      now,
    })

    assert.equal(match?.itemId, byText.id)
    assert.equal(match?.reason, 'source_text')
  })

  it('does not warn when local facts do not overlap', () => {
    const existing = requirePreviewItem({
      sourceText: 'Komplett anderer Vorgang',
      originKind: 'personal_note',
      title: 'Anderer Titel',
      origin: { displayName: null, address: 'anders@example.com', addressKind: 'email' },
      capturedAt: now,
      externalId: 'manual:dup-none',
    })

    const match = findLikelyManualCaptureDuplicate({
      sourceText: SAMPLE_TEXT,
      title: 'Rückruf Kunde Müller',
      originAddress: '+491709998877',
      originAddressKind: 'phone',
      existingItems: [existing],
      now,
    })

    assert.equal(match, null)
  })

  it('reuses the local preview fixture without mutating it', () => {
    const seeded = buildManualCapturePreviewSeedItems()
    assert.equal(seeded.length, 1)
    assert.equal(seeded[0]?.id, MANUAL_CAPTURE_PREVIEW_EXISTING_ID)
    assert.equal(seeded[0]?.content, MANUAL_CAPTURE_PREVIEW_EXISTING_TEXT)
    assert.equal(seeded[0]?.title, MANUAL_CAPTURE_PREVIEW_EXISTING_TITLE)
    assert.equal(seeded[0]?.processed_at, null)

    const match = findLikelyManualCaptureDuplicate({
      sourceText: MANUAL_CAPTURE_PREVIEW_EXISTING_TEXT,
      title: MANUAL_CAPTURE_PREVIEW_EXISTING_TITLE,
      originAddress: MANUAL_CAPTURE_PREVIEW_EXISTING_PHONE,
      originAddressKind: 'phone',
      existingItems: seeded,
      now,
    })

    assert.equal(match?.itemId, MANUAL_CAPTURE_PREVIEW_EXISTING_ID)
    assert.equal(match?.reason, 'source_text')
    assert.equal(seeded[0]?.processed_at, null)
    assert.equal(seeded[0]?.content, MANUAL_CAPTURE_PREVIEW_EXISTING_TEXT)
  })
})

describe('manual capture confirmation → inbox', () => {
  it('creates an unprocessed inbox item only after confirm', async () => {
    const store = createMemoryInboundIntakeStore()
    const drafted = buildManualCaptureDraft(SAMPLE_TEXT, { originKind: 'phone_call' })
    assert.equal(drafted.ok, true)
    if (!drafted.ok) return
    assert.equal(store.items.length, 0)

    const result = await confirmManualCapture({
      store,
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      capture: {
        sourceText: drafted.draft.sourceText,
        originKind: drafted.draft.originKind,
        title: drafted.draft.proposed.title,
        origin: drafted.draft.proposed.origin,
        capturer: drafted.draft.proposed.sender,
        capturedAt: RECEIVED_AT,
        externalId: 'manual:confirm-001',
      },
    })

    assert.equal(result.success, true)
    if (!result.success) return

    assert.equal(result.deduplicated, false)
    assert.equal(store.items.length, 1)
    assert.equal(result.item.channel, 'manual')
    assert.equal(result.item.source, 'manual_text')
    assert.equal(result.item.message_kind, 'text')
    assert.equal(result.item.processed_at, null)
    assert.equal(result.item.content, drafted.draft.sourceText)
    assert.equal(result.item.title, 'Rückruf Kunde Müller')
    assert.equal(readManualCaptureOriginKind(result.item.inbound_metadata), 'phone_call')
    assert.equal(getInboxItemSourceLabel(result.item), MANUAL_CAPTURE_ORIGIN_KIND_PHONE_LABEL)
    assert.equal(
      buildInboxHref({ itemId: result.item.id }),
      `/app/inbox?item=${result.item.id}`,
    )
  })

  it('labels pasted email and personal note sources in the review workspace', async () => {
    const store = createMemoryInboundIntakeStore()
    const email = await confirmManualCapture({
      store,
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      capture: {
        sourceText: 'Eingefügte E-Mail an die Agentur',
        originKind: 'pasted_email',
        capturedAt: RECEIVED_AT,
        externalId: 'manual:email-label',
      },
    })
    const note = await confirmManualCapture({
      store,
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      capture: {
        sourceText: 'Eigene Notiz zum Gespräch',
        originKind: 'personal_note',
        capturedAt: RECEIVED_AT,
        externalId: 'manual:note-label',
      },
    })

    assert.equal(email.success, true)
    assert.equal(note.success, true)
    if (!email.success || !note.success) return
    assert.equal(email.item.channel, 'manual')
    assert.equal(note.item.channel, 'manual')
    assert.equal(getInboxItemSourceLabel(email.item), MANUAL_CAPTURE_ORIGIN_KIND_EMAIL_LABEL)
    assert.equal(getInboxItemSourceLabel(note.item), MANUAL_CAPTURE_ORIGIN_KIND_NOTE_LABEL)
    assert.equal(email.item.content, 'Eingefügte E-Mail an die Agentur')
    assert.equal(note.item.content, 'Eigene Notiz zum Gespräch')
  })

  it('does not create tasks, change status, or auto-decide', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await confirmManualCapture({
      store,
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      capture: {
        sourceText: 'Kurze Notiz zum Kunden',
        originKind: 'personal_note',
        capturedAt: RECEIVED_AT,
        externalId: 'manual:no-side-effects',
      },
    })

    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.item.processed_at, null)
    assert.equal('links' in store ? store.links.length : 0, 0)

    const proposal = await getInboxAiProposal(result.item)
    assert.equal(proposal.proposal.status, 'not_applicable')
    assert.equal(proposal.proposal.generated, false)
  })

  it('keeps two separate pastes as two inbox items', async () => {
    const store = createMemoryInboundIntakeStore()
    const first = await confirmManualCapture({
      store,
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      capture: {
        sourceText: SAMPLE_TEXT,
        originKind: 'personal_note',
        capturedAt: RECEIVED_AT,
      },
    })
    const second = await confirmManualCapture({
      store,
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      capture: {
        sourceText: SAMPLE_TEXT,
        originKind: 'personal_note',
        capturedAt: RECEIVED_AT,
      },
    })

    assert.equal(first.success, true)
    assert.equal(second.success, true)
    if (!first.success || !second.success) return
    assert.notEqual(first.item.id, second.item.id)
    assert.notEqual(first.item.external_id, second.item.external_id)
    assert.equal(store.items.length, 2)
  })

  it('still uses intake dedup when the same external id is confirmed twice', async () => {
    const store = createMemoryInboundIntakeStore()
    const capture = {
      sourceText: SAMPLE_TEXT,
      originKind: 'phone_call' as const,
      capturedAt: RECEIVED_AT,
      externalId: 'manual:same-id',
    }
    const first = await confirmManualCapture({
      store,
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      capture,
    })
    const second = await confirmManualCapture({
      store,
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      capture,
    })

    assert.equal(first.success, true)
    assert.equal(second.success, true)
    if (!first.success || !second.success) return
    assert.equal(second.deduplicated, true)
    assert.equal(second.item.id, first.item.id)
    assert.equal(store.items.length, 1)
  })

  it('rejects empty confirmation without writing', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await confirmManualCapture({
      store,
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      capture: { sourceText: '   ', originKind: 'personal_note' },
    })
    assert.equal(result.success, false)
    assert.equal(store.items.length, 0)
  })

  it('rejects confirmation without a source choice', async () => {
    const store = createMemoryInboundIntakeStore()
    const result = await confirmManualCapture({
      store,
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      capture: { sourceText: SAMPLE_TEXT, originKind: '' },
    })
    assert.equal(result.success, false)
    if (result.success) return
    assert.equal(result.error, MANUAL_CAPTURE_ORIGIN_KIND_ERROR)
    assert.equal(store.items.length, 0)
  })

  it('can ingest the adapter output through the shared intake core', async () => {
    const store = createMemoryInboundIntakeStore()
    const inbound = toInboundItemFromManualText({
      externalId: 'manual:intake-core',
      capturedAt: RECEIVED_AT,
      sourceText: 'Direkt über Intake',
      originKind: 'personal_note',
      title: null,
      capturer: { displayName: 'Mitarbeiter', address: null, addressKind: 'other' },
      origin: null,
    })
    const result = await ingestInboundItem(store, {
      agencyId: AGENCY_ID,
      actorUserId: ACTOR_ID,
      item: inbound,
    })
    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.item.source, 'manual_text')
    assert.equal(result.item.content, 'Direkt über Intake')
    assert.equal(getInboxItemSourceLabel(result.item), MANUAL_CAPTURE_ORIGIN_KIND_NOTE_LABEL)
  })

  it('keeps unlabeled legacy manual items as Manuell', () => {
    assert.equal(
      getInboxItemSourceLabel({
        channel: 'manual',
        source: 'manual_text',
        inbound_metadata: { capture: { family: 'manual', kind: 'plain_text' } },
        title: 'Alt',
        content: 'Alter Eintrag',
      }),
      'Manuell',
    )
  })
})

describe('manual capture UI contract', () => {
  it('exposes one obvious text-capture action in the authenticated app menu', () => {
    const inboxAction = QUICK_ACTIONS.find((action) => action.mode === 'inbox')
    assert.equal(inboxAction?.label, MANUAL_CAPTURE_ACTION_LABEL)
    assert.match(inboxAction?.description ?? '', /prüfen/)
  })

  it('wires the authenticated inbox to capture, confirm, and the existing review workspace', () => {
    const inboxPage = fs.readFileSync(path.join(srcRoot, 'app/app/inbox/page.tsx'), 'utf8')
    const workspace = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/components/inbox-workspace.tsx'),
      'utf8',
    )
    const captureRoot = fs.readFileSync(
      path.join(srcRoot, 'features/capture/components/universal-capture-root.tsx'),
      'utf8',
    )
    const dialog = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/manual/components/manual-quick-capture-dialog.tsx'),
      'utf8',
    )
    const action = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/manual/actions/confirm-manual-capture-action.ts'),
      'utf8',
    )

    const copy = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/manual/lib/manual-capture-copy.ts'),
      'utf8',
    )

    assert.match(inboxPage, /enableManualCapture/)
    assert.match(workspace, /ManualQuickCaptureDialog/)
    assert.match(workspace, /MANUAL_CAPTURE_ACTION_LABEL/)
    assert.match(captureRoot, /ManualQuickCaptureDialog/)
    assert.doesNotMatch(captureRoot, /UniversalCaptureDialog/)
    assert.match(copy, new RegExp(MANUAL_CAPTURE_ACTION_LABEL))
    assert.match(copy, new RegExp(MANUAL_CAPTURE_REVIEW_LABEL))
    assert.match(copy, new RegExp(MANUAL_CAPTURE_CONFIRM_LABEL))
    assert.match(copy, new RegExp(MANUAL_CAPTURE_NO_AUTO_ACTION))
    assert.match(copy, new RegExp(MANUAL_CAPTURE_ORIGIN_KIND_PHONE_LABEL))
    assert.match(copy, new RegExp(MANUAL_CAPTURE_ORIGIN_KIND_EMAIL_LABEL))
    assert.match(copy, new RegExp(MANUAL_CAPTURE_ORIGIN_KIND_NOTE_LABEL))
    assert.match(copy, new RegExp(MANUAL_CAPTURE_DUPLICATE_WARNING))
    assert.match(copy, new RegExp(MANUAL_CAPTURE_DUPLICATE_OPEN_LABEL))
    assert.match(copy, new RegExp(MANUAL_CAPTURE_DUPLICATE_CREATE_ANYWAY_LABEL))
    assert.match(dialog, /MANUAL_CAPTURE_REVIEW_LABEL/)
    assert.match(dialog, /MANUAL_CAPTURE_CONFIRM_LABEL/)
    assert.match(dialog, /MANUAL_CAPTURE_NO_AUTO_ACTION/)
    assert.match(dialog, /MANUAL_CAPTURE_DUPLICATE_OPEN_LABEL/)
    assert.match(dialog, /MANUAL_CAPTURE_DUPLICATE_CREATE_ANYWAY_LABEL/)
    assert.match(dialog, /findLikelyManualCaptureDuplicate/)
    assert.match(dialog, /existingItems/)
    assert.match(dialog, /OriginKindPicker/)
    assert.match(dialog, /radiogroup/)
    assert.match(dialog, /originKind/)
    assert.match(dialog, /buildInboxHref/)
    assert.match(workspace, /existingItems=\{items\}/)
    assert.doesNotMatch(dialog, /convertInboxToTask|processInboxItem|resend|whatsapp-outbound/)
    assert.match(action, /confirmManualCapture/)
    assert.match(action, /originKind/)
    assert.match(action, /createSupabaseInboundIntakeStore/)
    assert.doesNotMatch(action, /createServiceRoleInboundIntakeStore/)
    assert.doesNotMatch(action, /convertInboxToTask|processInboxItem|resend|whatsapp-outbound/)

    const inboxSource = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/lib/inbox-source.ts'),
      'utf8',
    )
    const detail = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/components/inbox-detail-panel.tsx'),
      'utf8',
    )
    assert.match(inboxSource, /readManualCaptureOriginKind/)
    assert.match(detail, /getInboxItemSourceLabel/)
    assert.match(detail, /resolveInboxItemSourceVisual/)
  })

  it('keeps the local preview off the production inbox path', () => {
    const previewPage = fs.readFileSync(
      path.join(srcRoot, 'app/dev/manual-capture/page.tsx'),
      'utf8',
    )
    const previewApp = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/manual/components/manual-capture-preview-app.tsx'),
      'utf8',
    )
    const inboxPage = fs.readFileSync(path.join(srcRoot, 'app/app/inbox/page.tsx'), 'utf8')
    const inboxWorkspace = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/components/inbox-workspace.tsx'),
      'utf8',
    )

    assert.match(previewPage, /NODE_ENV === 'production'/)
    assert.match(previewPage, /ManualCapturePreviewApp/)
    assert.match(previewApp, /buildManualCapturePreviewSeedItems/)
    assert.match(previewApp, /enableManualCapture/)
    assert.match(previewApp, /onLocalConfirmed/)
    assert.doesNotMatch(inboxPage, new RegExp(MANUAL_CAPTURE_PREVIEW_PATH))
    assert.doesNotMatch(inboxWorkspace, /manual-capture-preview/)
  })
})

describe('manual capture side-effect boundary', () => {
  const ENTRY_RELATIVE_PATHS = [
    'features/inbound/manual/lib/manual-adapter.ts',
    'features/inbound/manual/lib/build-manual-capture-draft.ts',
    'features/inbound/manual/lib/present-manual-capture.ts',
    'features/inbound/manual/lib/manual-capture-origin.ts',
    'features/inbound/manual/lib/find-likely-manual-capture-duplicate.ts',
    'features/inbound/manual/services/confirm-manual-capture.ts',
  ] as const

  const FORBIDDEN_IMPORT_FRAGMENTS = [
    'features/whatsapp/',
    'node_modules/resend',
    'features/cases/actions/',
    'features/cases/services/inbox-promotion-service',
    'features/tasks/actions/',
    'features/inbox/actions/',
  ] as const

  const FORBIDDEN_IDENTIFIERS = [
    'processInboxItemAction',
    'convertInboxToTaskAction',
    'convertInboxToClaimAction',
    'convertInboxToOfferAction',
    'createTaskAction',
    'getInboxAiProposal',
  ] as const

  const IMPORT_SPEC_RE =
    /(?:import|export)\s+(?:type\s+)?(?:[^'"\n;]+?\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g

  function resolveToSourceFile(specifierBase: string): string | null {
    const candidates = [
      specifierBase,
      `${specifierBase}.ts`,
      `${specifierBase}.tsx`,
      path.join(specifierBase, 'index.ts'),
    ]
    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return path.normalize(candidate)
      }
    }
    return null
  }

  function walkImports(entryRelativePath: string): string[] {
    const visited = new Set<string>()
    const queue = [path.join(srcRoot, entryRelativePath)]

    while (queue.length > 0) {
      const current = queue.pop()
      if (!current || visited.has(current)) continue
      visited.add(current)
      if (!current.startsWith(srcRoot) || !fs.existsSync(current)) continue

      const source = fs.readFileSync(current, 'utf8')
      for (const match of source.matchAll(IMPORT_SPEC_RE)) {
        const specifier = match[1] ?? match[2] ?? match[3]
        if (!specifier) continue
        if (specifier.startsWith('@/')) {
          const resolved = resolveToSourceFile(path.join(srcRoot, specifier.slice(2)))
          if (resolved) queue.push(resolved)
          continue
        }
        if (specifier.startsWith('.')) {
          const resolved = resolveToSourceFile(path.resolve(path.dirname(current), specifier))
          if (resolved) queue.push(resolved)
        }
      }
    }

    return [...visited]
  }

  it('adapter and confirm path do not import work-creation or outbound modules', () => {
    for (const entry of ENTRY_RELATIVE_PATHS) {
      const files = walkImports(entry)
      for (const file of files) {
        const relative = path.relative(repoRoot, file)
        for (const fragment of FORBIDDEN_IMPORT_FRAGMENTS) {
          assert.equal(
            relative.includes(fragment),
            false,
            `${entry} import graph includes ${fragment} via ${relative}`,
          )
        }
        const source = fs.readFileSync(file, 'utf8')
        for (const identifier of FORBIDDEN_IDENTIFIERS) {
          assert.doesNotMatch(
            source,
            new RegExp(`\\b${identifier}\\b`),
            `${relative} references ${identifier}`,
          )
        }
      }
    }
  })
})
