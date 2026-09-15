/**
 * Manual preferred-channel reply handoff on the existing Kfz review card.
 * Copy helpers never send or change status. Contact requires an explicit click.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, it } from 'node:test'

import {
  applyKfzManualTriageCommand,
  KFZ_REVIEW_NO_AUTO_ACTION,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
import { presentInboxManualReviewHistory } from '@/features/inbox/lib/inbox-manual-review-history'
import {
  readKfzReplyHandoffPreviewItems,
  readKfzReplyHandoffPreviewServerSnapshot,
  writeKfzReplyHandoffPreviewItems,
} from '@/features/inbox/lib/kfz-reply-handoff-preview-store'
import {
  buildKfzReplyHandoffPreviewItems,
  KFZ_REPLY_HANDOFF_PREVIEW_EMAIL_ID,
  KFZ_REPLY_HANDOFF_PREVIEW_MISSING_ID,
  KFZ_REPLY_HANDOFF_PREVIEW_PHONE_ID,
  KFZ_REPLY_HANDOFF_PREVIEW_WHATSAPP_ID,
  listKfzReplyHandoffPreviewItems,
} from '@/features/inbox/lib/kfz-reply-handoff-preview'
import {
  copyDoesNotChangeStatus,
  KFZ_CONTACTED_NOTE,
  KFZ_COPY_NO_STATUS_CHANGE,
  KFZ_HANDOFF_NO_SEND,
  KFZ_PREFERRED_CONTACT_MISSING,
  KFZ_REPLY_PREPARED_NOTE,
  KFZ_WHATSAPP_PREFERENCE_ONLY,
  readKfzCopyValue,
  resolveKfzReplyHandoffState,
} from '@/features/inbox/lib/kfz-reply-handoff'
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
const SECRET = 'test-kfz-reply-handoff-secret'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const repoRoot = path.resolve(srcRoot, '..')

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

function workingCopy(item: InboxItem) {
  return {
    content: item.content,
    processed_at: item.processed_at,
    linkedTaskId: null,
  }
}

describe('kfz preferred-channel reply handoff', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('surfaces WhatsApp, Telefon and E-Mail with the matching factual contact', async () => {
    await withKfzEnv(async () => {
      const whatsapp = await submitLandingToInbox(
        baseValues({ preferredChannel: 'whatsapp' }),
        'lp-handoff-whatsapp',
      )
      const phone = await submitLandingToInbox(
        baseValues({ preferredChannel: 'phone' }),
        'lp-handoff-phone',
      )
      const email = await submitLandingToInbox(
        baseValues({
          preferredChannel: 'email',
          phone: '',
          email: 'max@example.com',
        }),
        'lp-handoff-email',
      )

      const whatsappReview = presentKfzWebsiteInboxItem(whatsapp)
      const phoneReview = presentKfzWebsiteInboxItem(phone)
      const emailReview = presentKfzWebsiteInboxItem(email)

      assert.ok(whatsappReview)
      assert.ok(phoneReview)
      assert.ok(emailReview)

      assert.equal(whatsappReview.preferredChannel, 'whatsapp')
      assert.equal(whatsappReview.preferredChannelLabel, 'WhatsApp')
      assert.equal(whatsappReview.preferredChannelContact.contactValue, '+491701234567')
      assert.equal(whatsappReview.preferredChannelContact.contactKind, 'phone')
      assert.equal(whatsappReview.preferredChannelContact.whatsAppIsPreferenceOnly, true)
      assert.equal(
        whatsappReview.preferredChannelContact.preferenceOnlyLabel,
        KFZ_WHATSAPP_PREFERENCE_ONLY,
      )
      assert.equal(whatsappReview.callPreparation.visible, false)

      assert.equal(phoneReview.preferredChannelLabel, 'Telefon')
      assert.equal(phoneReview.preferredChannelContact.contactValue, '+491701234567')
      assert.equal(phoneReview.callPreparation.visible, true)
      assert.ok(phoneReview.callPreparation.facts.some((fact) => fact.id === 'phone'))
      assert.match(phoneReview.callPreparation.noAdviceLabel, /keine Rechts- oder Tarifauskunft/)

      assert.equal(emailReview.preferredChannelLabel, 'E-Mail')
      assert.equal(emailReview.preferredChannelContact.contactValue, 'max@example.com')
      assert.equal(emailReview.preferredChannelContact.contactKind, 'email')
      assert.equal(emailReview.callPreparation.visible, false)
    })
  })

  it('copy helpers return exact values and never send or change status', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-handoff-copy')
      const drafted = applyKfzManualTriageCommand(workingCopy(item), {
        type: 'save_response_draft',
        draft: 'Interner geprüfter Entwurf — nicht senden.',
      })
      assert.equal(drafted.ok, true)
      if (!drafted.ok) {
        return
      }

      const reviewed = presentKfzWebsiteInboxItem({
        ...item,
        content: drafted.next.content,
      })
      assert.ok(reviewed)
      assert.equal(readKfzCopyValue(reviewed.copyTargets, 'phone'), '+491701234567')
      assert.equal(readKfzCopyValue(reviewed.copyTargets, 'email'), null)
      assert.equal(
        readKfzCopyValue(reviewed.copyTargets, 'draft'),
        'Interner geprüfter Entwurf — nicht senden.',
      )
      assert.deepEqual(copyDoesNotChangeStatus().mutated, {
        content: false,
        processed: false,
        task: false,
        contacted: false,
      })
      assert.equal(drafted.next.processed_at, null)
      assert.equal(resolveKfzReplyHandoffState(drafted.next), 'needs_prepare')
      assert.equal(hasContacted(drafted.next.content), false)
    })
  })

  it('keeps the draft editable and does not infer contact from copy or save', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-handoff-draft')
      const source = item.content
      const metadataBefore = item.inbound_metadata

      const first = applyKfzManualTriageCommand(workingCopy(item), {
        type: 'save_response_draft',
        draft: 'Erster interner Entwurf.',
      })
      assert.equal(first.ok, true)
      if (!first.ok) {
        return
      }

      const edited = applyKfzManualTriageCommand(first.next, {
        type: 'save_response_draft',
        draft: 'Geänderter interner Entwurf nach Prüfung.',
      })
      assert.equal(edited.ok, true)
      if (!edited.ok) {
        return
      }

      const reviewed = presentKfzWebsiteInboxItem({
        ...item,
        content: edited.next.content,
      })
      assert.ok(reviewed)
      assert.equal(reviewed.responseDraft, 'Geänderter interner Entwurf nach Prüfung.')
      assert.equal(reviewed.sourceContent, source)
      assert.equal(edited.next.processed_at, null)
      assert.equal(edited.mutated.processed, false)
      assert.equal(resolveKfzReplyHandoffState(edited.next), 'needs_prepare')
      assert.deepEqual(item.inbound_metadata, metadataBefore)
      assert.doesNotMatch(edited.next.content, /wurde gesendet|sendWhatsApp|resend/)
    })
  })

  it('requires an explicit contact confirmation and writes a factual history entry', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(
        baseValues({ preferredChannel: 'whatsapp' }),
        'lp-handoff-contact',
      )

      const prepared = applyKfzManualTriageCommand(workingCopy(item), {
        type: 'prepare_reply',
      })
      assert.equal(prepared.ok, true)
      if (!prepared.ok) {
        return
      }
      assert.equal(prepared.mutated.processed, false)
      assert.equal(prepared.next.processed_at, null)
      assert.match(prepared.next.content, new RegExp(KFZ_REPLY_PREPARED_NOTE))

      const copied = copyDoesNotChangeStatus()
      assert.equal(copied.mutated.contacted, false)
      assert.equal(hasContacted(prepared.next.content), false)

      const contacted = applyKfzManualTriageCommand(prepared.next, {
        type: 'mark_contacted',
      })
      assert.equal(contacted.ok, true)
      if (!contacted.ok) {
        return
      }
      assert.equal(contacted.mutated.processed, false)
      assert.equal(contacted.next.processed_at, null)
      assert.match(contacted.next.content, new RegExp(KFZ_CONTACTED_NOTE))

      const followUp = applyKfzManualTriageCommand(contacted.next, {
        type: 'mark_follow_up',
      })
      assert.equal(followUp.ok, true)
      if (!followUp.ok) {
        return
      }

      const done = applyKfzManualTriageCommand(followUp.next, {
        type: 'mark_handled',
        at: '2026-09-08T12:00:00.000Z',
      })
      assert.equal(done.ok, true)
      if (!done.ok) {
        return
      }

      const history = presentInboxManualReviewHistory({
        ...item,
        content: done.next.content,
        processed_at: done.next.processed_at,
      })
      assert.deepEqual(
        history.events.map((event) => event.kind),
        [
          'received',
          'reply_prepared',
          'contact_confirmed',
          'follow_up_needed',
          'manually_completed',
        ],
      )
      assert.equal(
        history.events.find((event) => event.kind === 'contact_confirmed')?.detail,
        KFZ_CONTACTED_NOTE,
      )
      assert.equal(history.noExternalSideEffect, true)
      assert.equal(done.next.processed_at, '2026-09-08T12:00:00.000Z')
    })
  })

  it('surfaces a missing preferred-channel contact without inventing a value', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(
        baseValues({
          phone: '',
          email: 'max@example.com',
          preferredChannel: 'phone',
        }),
        'lp-handoff-missing',
      )
      const review = presentKfzWebsiteInboxItem(item)
      assert.ok(review)
      assert.equal(review.preferredChannelLabel, 'Telefon')
      assert.equal(review.preferredChannelContact.contactValue, null)
      assert.equal(review.preferredChannelContact.contactMissing, true)
      assert.equal(readKfzCopyValue(review.copyTargets, 'phone'), null)
      assert.equal(readKfzCopyValue(review.copyTargets, 'preferredContact'), null)
      assert.equal(review.callPreparation.visible, true)
      assert.ok(
        review.missingInformation.includes('Telefonnummer für den bevorzugten Kanal'),
      )
      assert.doesNotMatch(review.preferredChannelContact.channelLabel, /WhatsApp/)
    })
  })

  it('reloads the same working copy after draft edit and explicit contact', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(
        baseValues({ preferredChannel: 'email', phone: '', email: 'max@example.com' }),
        'lp-handoff-reload',
      )
      const sourceBefore = item.content
      const metadataBefore =
        item.inbound_metadata && typeof item.inbound_metadata === 'object'
          ? (item.inbound_metadata as Record<string, unknown>)
          : {}

      const drafted = applyKfzManualTriageCommand(workingCopy(item), {
        type: 'save_response_draft',
        draft: 'Persistenter interner Entwurf.',
      })
      assert.equal(drafted.ok, true)
      if (!drafted.ok) {
        return
      }
      const prepared = applyKfzManualTriageCommand(drafted.next, { type: 'prepare_reply' })
      assert.equal(prepared.ok, true)
      if (!prepared.ok) {
        return
      }
      const contacted = applyKfzManualTriageCommand(prepared.next, {
        type: 'mark_contacted',
      })
      assert.equal(contacted.ok, true)
      if (!contacted.ok) {
        return
      }

      const reloaded: InboxItem = JSON.parse(
        JSON.stringify({
          ...item,
          content: contacted.next.content,
          processed_at: contacted.next.processed_at,
        }),
      ) as InboxItem
      const review = presentKfzWebsiteInboxItem(reloaded)
      const history = presentInboxManualReviewHistory(reloaded)

      assert.ok(review)
      assert.equal(review.responseDraft, 'Persistenter interner Entwurf.')
      assert.equal(review.sourceContent, sourceBefore)
      assert.equal(review.preferredChannel, 'email')
      assert.equal(review.preferredChannelContact.contactValue, 'max@example.com')
      assert.equal(review.replyHandoff.state, 'contacted')
      assert.equal(review.replyHandoff.primaryActionId, 'mark_handled')
      assert.equal(reloaded.processed_at, null)
      const metadataAfter =
        reloaded.inbound_metadata && typeof reloaded.inbound_metadata === 'object'
          ? (reloaded.inbound_metadata as Record<string, unknown>)
          : {}
      const inquiryBefore = metadataBefore.inquiry as Record<string, unknown>
      const inquiryAfter = metadataAfter.inquiry as Record<string, unknown>
      assert.deepEqual(inquiryAfter, inquiryBefore)
      assert.deepEqual(metadataAfter.consentEvidence, metadataBefore.consentEvidence)
      assert.deepEqual(metadataAfter.acquisition, metadataBefore.acquisition)
      assert.equal(inquiryAfter.preferredChannel, 'email')
      assert.equal('consentEvidence' in metadataAfter, true)
      assert.ok(history.events.some((event) => event.kind === 'draft_saved'))
      assert.ok(history.events.some((event) => event.kind === 'reply_prepared'))
      assert.ok(history.events.some((event) => event.kind === 'contact_confirmed'))
      assert.equal(
        history.events.some((event) => event.kind === 'manually_completed'),
        false,
      )
    })
  })

  it('preview fixtures cover each channel plus a missing contact value', () => {
    const preview = buildKfzReplyHandoffPreviewItems()
    const items = listKfzReplyHandoffPreviewItems(preview)
    const byId = Object.fromEntries(items.map((item) => [item.id, item]))

    const whatsapp = presentKfzWebsiteInboxItem(byId[KFZ_REPLY_HANDOFF_PREVIEW_WHATSAPP_ID])
    const phone = presentKfzWebsiteInboxItem(byId[KFZ_REPLY_HANDOFF_PREVIEW_PHONE_ID])
    const email = presentKfzWebsiteInboxItem(byId[KFZ_REPLY_HANDOFF_PREVIEW_EMAIL_ID])
    const missing = presentKfzWebsiteInboxItem(byId[KFZ_REPLY_HANDOFF_PREVIEW_MISSING_ID])

    assert.ok(whatsapp)
    assert.ok(phone)
    assert.ok(email)
    assert.ok(missing)
    assert.equal(whatsapp.preferredChannelLabel, 'WhatsApp')
    assert.equal(phone.preferredChannelLabel, 'Telefon')
    assert.equal(email.preferredChannelLabel, 'E-Mail')
    assert.equal(missing.preferredChannelContact.contactMissing, true)
    assert.equal(missing.callPreparation.visible, true)
    assert.equal(KFZ_PREFERRED_CONTACT_MISSING.includes('fehlt'), true)
    assert.equal(KFZ_COPY_NO_STATUS_CHANGE.includes('expliziter Bestätigung'), true)
    assert.equal(KFZ_HANDOFF_NO_SEND.includes('Nichts wird automatisch gesendet'), true)
    assert.match(KFZ_REVIEW_NO_AUTO_ACTION, /Nichts wird automatisch/)
  })

  it('keeps a stable preview snapshot until an explicit local write', () => {
    const first = readKfzReplyHandoffPreviewItems()
    const second = readKfzReplyHandoffPreviewItems()
    assert.equal(first, second)
    assert.equal(readKfzReplyHandoffPreviewServerSnapshot(), first)

    const updated = first.map((item, index) =>
      index === 0
        ? { ...item, content: `${item.content}\nLokal persistiert.` }
        : item,
    )
    const written = writeKfzReplyHandoffPreviewItems(updated)
    assert.equal(written, updated)
    assert.equal(readKfzReplyHandoffPreviewItems(), written)
    assert.match(written[0]?.content ?? '', /Lokal persistiert/)
    writeKfzReplyHandoffPreviewItems(first)
  })
})

function hasContacted(content: string): boolean {
  return content.includes(KFZ_CONTACTED_NOTE)
}

describe('kfz reply handoff side-effect boundary', () => {
  const ENTRY_RELATIVE_PATHS = [
    'features/inbound/kfz/services/handle-kfz-inbound-http.ts',
    'features/inbound/kfz/services/process-kfz-inquiry.ts',
    'features/inbox/lib/present-kfz-website-inbox.ts',
    'features/inbox/lib/kfz-reply-handoff.ts',
    'features/inbox/lib/kfz-inbox-manual-triage.ts',
  ] as const

  const FORBIDDEN_IMPORT_FRAGMENTS = [
    'features/email/',
    'features/whatsapp/',
    'node_modules/resend',
    'features/cases/actions/',
    'features/cases/services/inbox-promotion-service',
    'features/cases/services/case-promotion-writers',
    'features/cases/services/case-task-service',
    'features/tasks/actions/',
    'features/inbox/actions/',
  ] as const

  const FORBIDDEN_IDENTIFIERS = [
    'processInboxItemAction',
    'processInboxItemForCurrentUser',
    'convertInboxToTaskAction',
    'sendEmail',
    'sendWhatsApp',
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

  function resolveImport(
    fromFile: string,
    specifier: string,
  ): { kind: 'source'; file: string } | { kind: 'external'; name: string } | null {
    if (specifier.startsWith('@/')) {
      const resolved = resolveToSourceFile(path.join(srcRoot, specifier.slice(2)))
      return resolved ? { kind: 'source', file: resolved } : null
    }
    if (specifier.startsWith('.')) {
      const resolved = resolveToSourceFile(path.resolve(path.dirname(fromFile), specifier))
      return resolved ? { kind: 'source', file: resolved } : null
    }
    const packageName = specifier.startsWith('@')
      ? specifier.split('/').slice(0, 2).join('/')
      : specifier.split('/')[0]
    return { kind: 'external', name: packageName }
  }

  function collectGraph(entryFiles: string[]): string[] {
    const visited = new Set<string>()
    const queue = [...entryFiles]
    while (queue.length > 0) {
      const current = queue.pop()
      if (!current || visited.has(current)) {
        continue
      }
      visited.add(current)
      const source = fs.readFileSync(current, 'utf8')
      IMPORT_SPEC_RE.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = IMPORT_SPEC_RE.exec(source)) !== null) {
        const specifier = match[1] ?? match[2] ?? match[3]
        if (!specifier) {
          continue
        }
        const resolved = resolveImport(current, specifier)
        if (resolved?.kind === 'source' && !visited.has(resolved.file)) {
          queue.push(resolved.file)
        }
      }
    }
    return [...visited]
  }

  it('handoff helpers never import send or write actions', () => {
    const entries = ENTRY_RELATIVE_PATHS.map((relative) => path.join(srcRoot, relative))
    for (const entry of entries) {
      assert.ok(fs.existsSync(entry), `missing entry: ${entry}`)
    }

    const files = collectGraph(entries)
    const violations: string[] = []
    for (const file of files) {
      const normalized = file.split(path.sep).join('/')
      for (const fragment of FORBIDDEN_IMPORT_FRAGMENTS) {
        if (normalized.includes(fragment)) {
          violations.push(`${path.relative(repoRoot, file)} reaches ${fragment}`)
        }
      }
      const source = fs.readFileSync(file, 'utf8')
      for (const identifier of FORBIDDEN_IDENTIFIERS) {
        if (new RegExp(`\\b${identifier}\\b`).test(source)) {
          violations.push(`${path.relative(repoRoot, file)} references ${identifier}`)
        }
      }
    }

    assert.equal(
      violations.length,
      0,
      `Automatic path must not reach writers:\n${violations.join('\n')}`,
    )
  })

  it('review card and handoff UI have copy helpers and no send control', () => {
    const reviewUi = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/components/inbox-kfz-review-section.tsx'),
      'utf8',
    )
    const handoffUi = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/components/inbox-kfz-reply-handoff-actions.tsx'),
      'utf8',
    )
    const draftUi = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/components/inbox-kfz-response-draft-section.tsx'),
      'utf8',
    )
    const copyUi = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/components/inbox-kfz-copy-button.tsx'),
      'utf8',
    )

    assert.match(reviewUi, /Bevorzugter Antwortkanal/)
    assert.match(reviewUi, /Telefonnummer kopieren/)
    assert.match(reviewUi, /E-Mail kopieren/)
    assert.match(reviewUi, /Gesprächsvorbereitung|callPreparation/)
    assert.match(handoffUi, /prepare_reply/)
    assert.match(handoffUi, /mark_contacted/)
    assert.match(handoffUi, /mark_follow_up/)
    assert.match(handoffUi, /mark_handled/)
    assert.match(handoffUi, /Geprüften Entwurf kopieren/)
    const triageLib = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/lib/kfz-inbox-manual-triage.ts'),
      'utf8',
    )
    assert.match(triageLib, /label: 'Antwort vorbereiten'/)
    assert.match(triageLib, /label: 'Als kontaktiert markieren'/)
    assert.match(triageLib, /label: 'Rückfrage nötig'/)
    assert.match(triageLib, /label: 'Als erledigt markieren'/)
    assert.match(draftUi, /Geprüften Entwurf kopieren/)
    assert.match(copyUi, /KFZ_COPY_NO_STATUS_CHANGE/)
    assert.doesNotMatch(reviewUi, /Nachricht senden|sendWhatsApp|wa\.me|api\.whatsapp/)
    assert.doesNotMatch(handoffUi, /Nachricht senden|sendEmail|sendWhatsApp|wa\.me/)
    assert.doesNotMatch(draftUi, /Nachricht senden|Kundenantwort senden/)
    assert.doesNotMatch(handoffUi, /mark_contacted.*copy|clipboard.*mark_contacted/)
  })
})
