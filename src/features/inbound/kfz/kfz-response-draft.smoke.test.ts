/**
 * Internal Kfz response draft on the existing inbox working copy.
 * No send integration, no automatic external side effect.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, it } from 'node:test'

import { AI_PROPOSAL_HUMAN_REVIEW_LABEL } from '@/features/ai-inbound/lib/format-proposal-labels'
import { getInboxAiProposal } from '@/features/ai-inbound/services/get-inbox-ai-proposal'
import { mapInboxItemToAnalysisInput } from '@/features/ai-inbound/lib/map-inbox-item-to-analysis-input'
import {
  applyKfzManualTriageCommand,
  KFZ_INTERNAL_NOTE_HEADING,
  KFZ_REVIEW_NO_AUTO_ACTION,
  KFZ_REVIEW_STARTED_NOTE,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
import {
  applyKfzResponseDraft,
  composeInboxWorkingCopy,
  hasKfzResponseDraft,
  KFZ_AI_DRAFT_REVIEW_LABEL,
  KFZ_RESPONSE_DRAFT_HEADING,
  KFZ_RESPONSE_DRAFT_MAX_LENGTH,
  KFZ_RESPONSE_DRAFT_NO_SEND,
  readInboxSourceContent,
  readKfzResponseDraft,
  splitInboxWorkingCopy,
} from '@/features/inbox/lib/kfz-response-draft'
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
const SECRET = 'test-kfz-response-draft-secret'

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

describe('kfz manual response draft workspace', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('intake leaves source-only content and no draft', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-draft-empty')
      const review = presentKfzWebsiteInboxItem(item)

      assert.ok(review)
      assert.equal(review.hasResponseDraft, false)
      assert.equal(review.responseDraft, '')
      assert.match(review.sourceContent, /Kfz-Anfrage von Max Mustermann/)
      assert.equal(hasKfzResponseDraft(item.content), false)
      assert.equal(item.processed_at, null)
      assert.equal(item.content.includes(KFZ_RESPONSE_DRAFT_HEADING), false)
    })
  })

  it('saves an editable draft without sending, processing, or creating a task', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-draft-save')
      const sourceBefore = item.content

      const saved = applyKfzManualTriageCommand(
        { content: item.content, processed_at: item.processed_at, linkedTaskId: null },
        {
          type: 'save_response_draft',
          draft: 'Guten Tag, wir prüfen Ihre Kfz-Anfrage intern.',
        },
      )

      assert.equal(saved.ok, true)
      if (!saved.ok) {
        return
      }
      assert.equal(saved.mutated.content, true)
      assert.equal(saved.mutated.processed, false)
      assert.equal(saved.mutated.task, false)
      assert.equal(saved.next.processed_at, null)
      assert.equal(saved.next.linkedTaskId, null)
      assert.equal(
        readKfzResponseDraft(saved.next.content),
        'Guten Tag, wir prüfen Ihre Kfz-Anfrage intern.',
      )
      assert.equal(readInboxSourceContent(saved.next.content), sourceBefore)
      assert.doesNotMatch(saved.next.content, /wurde gesendet|automatisch versendet|Senden/)

      const reviewed = presentKfzWebsiteInboxItem({
        ...item,
        content: saved.next.content,
      })
      assert.ok(reviewed)
      assert.equal(reviewed.hasResponseDraft, true)
      assert.equal(reviewed.phase, 'in_review')
      assert.equal(reviewed.customerName, 'Max Mustermann')
      assert.equal(reviewed.request, 'Wechsel Kfz-Versicherung')
      assert.match(reviewed.nextManualAction, /Antwortentwurf ist gespeichert/)
      assert.match(reviewed.nextManualAction, new RegExp(KFZ_REVIEW_NO_AUTO_ACTION))
      assert.equal(reviewed.sourceContent, sourceBefore)
    })
  })

  it('preserves source, internal notes and a follow-up task when the draft changes', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-draft-preserve')
      const source = item.content
      const taskId = '33333333-3333-4333-8333-333333333333'

      const noted = applyKfzManualTriageCommand(
        { content: item.content, processed_at: item.processed_at, linkedTaskId: null },
        { type: 'record_internal_note', note: 'Rückruf intern vormerken.' },
      )
      assert.equal(noted.ok, true)
      if (!noted.ok) {
        return
      }

      const tasked = applyKfzManualTriageCommand(noted.next, {
        type: 'create_follow_up_task',
        taskId,
      })
      assert.equal(tasked.ok, true)
      if (!tasked.ok) {
        return
      }

      const drafted = applyKfzManualTriageCommand(tasked.next, {
        type: 'save_response_draft',
        draft: 'Erster interner Entwurf.',
      })
      assert.equal(drafted.ok, true)
      if (!drafted.ok) {
        return
      }

      assert.equal(readInboxSourceContent(drafted.next.content), source)
      assert.match(drafted.next.content, /Rückruf intern vormerken/)
      assert.equal(drafted.next.content.includes(KFZ_INTERNAL_NOTE_HEADING), true)
      assert.equal(drafted.next.linkedTaskId, taskId)
      assert.equal(drafted.next.processed_at, null)
      assert.equal(drafted.mutated.task, false)
      assert.equal(drafted.mutated.processed, false)

      const updated = applyKfzManualTriageCommand(drafted.next, {
        type: 'save_response_draft',
        draft: 'Zweiter interner Entwurf nach Prüfung.',
      })
      assert.equal(updated.ok, true)
      if (!updated.ok) {
        return
      }
      assert.equal(
        readKfzResponseDraft(updated.next.content),
        'Zweiter interner Entwurf nach Prüfung.',
      )
      assert.equal(readInboxSourceContent(updated.next.content), source)
      assert.match(updated.next.content, /Rückruf intern vormerken/)
      assert.equal(updated.next.linkedTaskId, taskId)
      assert.doesNotMatch(updated.next.content, /Erster interner Entwurf/)
    })
  })

  it('keeps draft and notes out of the AI suggestion input', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-draft-ai-strip')
      const noted = applyKfzManualTriageCommand(
        { content: item.content, processed_at: item.processed_at, linkedTaskId: null },
        { type: 'record_internal_note', note: 'Geheime interne Bewertung 42.' },
      )
      assert.equal(noted.ok, true)
      if (!noted.ok) {
        return
      }

      const drafted = applyKfzManualTriageCommand(noted.next, {
        type: 'save_response_draft',
        draft: 'Geheimnisvoller Kundenentwurf bitte nicht an KI.',
      })
      assert.equal(drafted.ok, true)
      if (!drafted.ok) {
        return
      }

      const analysisInput = mapInboxItemToAnalysisInput({
        ...item,
        content: drafted.next.content,
      })
      assert.doesNotMatch(analysisInput.content ?? '', /Geheimnisvoller Kundenentwurf/)
      assert.doesNotMatch(analysisInput.content ?? '', /Geheime interne Bewertung/)
      assert.equal((analysisInput.content ?? '').includes(KFZ_RESPONSE_DRAFT_HEADING), false)
      assert.equal((analysisInput.content ?? '').includes(KFZ_INTERNAL_NOTE_HEADING), false)
      assert.match(analysisInput.content ?? '', /Kfz-Anfrage von Max Mustermann/)

      const ai = await getInboxAiProposal({
        ...item,
        content: drafted.next.content,
      })
      assert.equal(ai.proposal.status, 'proposal')
      if (ai.proposal.status !== 'proposal') {
        return
      }
      assert.equal(ai.proposal.suggestion.suggestedCaseAction, 'none')
      assert.match(ai.proposal.suggestion.suggestedReplyDraft ?? '', /Entwurf|keine verbindliche/i)
    })
  })

  it('labels AI reply text as a suggestion that needs human review', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-draft-ai-label')
      const ai = await getInboxAiProposal(item)
      assert.equal(ai.proposal.status, 'proposal')
      if (ai.proposal.status !== 'proposal') {
        return
      }

      assert.equal(
        AI_PROPOSAL_HUMAN_REVIEW_LABEL,
        'KI-Text ist ein Vorschlag — menschliche Prüfung erforderlich',
      )
      assert.equal(KFZ_AI_DRAFT_REVIEW_LABEL, AI_PROPOSAL_HUMAN_REVIEW_LABEL)
      assert.match(KFZ_RESPONSE_DRAFT_NO_SEND, /Nichts wird automatisch gesendet/)
      assert.doesNotMatch(ai.proposal.suggestion.suggestedReplyDraft ?? '', /wurde gesendet/)
    })
  })

  it('rejects oversized drafts and does not invent a send or handled status', () => {
    const tooLong = applyKfzResponseDraft(
      'Kfz-Anfrage von Max',
      'x'.repeat(KFZ_RESPONSE_DRAFT_MAX_LENGTH + 1),
    )
    assert.equal(tooLong.ok, false)

    const empty = applyKfzManualTriageCommand(
      { content: 'Kfz-Anfrage von Max', processed_at: null, linkedTaskId: null },
      { type: 'save_response_draft', draft: '   ' },
    )
    assert.equal(empty.ok, true)
    if (!empty.ok) {
      return
    }
    assert.equal(hasKfzResponseDraft(empty.next.content), false)
    assert.equal(empty.next.processed_at, null)
    assert.equal(empty.next.linkedTaskId, null)

    const started = applyKfzManualTriageCommand(empty.next, { type: 'start_review' })
    assert.equal(started.ok, true)
    if (!started.ok) {
      return
    }
    const drafted = applyKfzResponseDraft(started.next.content, 'Kurzer Entwurf')
    assert.equal(drafted.ok, true)
    if (!drafted.ok) {
      return
    }
    const parts = splitInboxWorkingCopy(drafted.content)
    assert.equal(parts.source, 'Kfz-Anfrage von Max')
    assert.equal(parts.draft, 'Kurzer Entwurf')
    assert.match(parts.notes, new RegExp(KFZ_REVIEW_STARTED_NOTE))
    assert.equal(
      composeInboxWorkingCopy(parts).includes(KFZ_RESPONSE_DRAFT_HEADING),
      true,
    )
  })
})

describe('kfz response draft side-effect boundary', () => {
  const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
  const repoRoot = path.resolve(srcRoot, '..')

  const ENTRY_RELATIVE_PATHS = [
    'features/inbound/kfz/services/handle-kfz-inbound-http.ts',
    'features/inbound/kfz/services/process-kfz-inquiry.ts',
    'features/inbox/lib/present-kfz-website-inbox.ts',
    'features/inbox/lib/kfz-response-draft.ts',
    'features/ai-inbound/services/get-inbox-ai-proposal.ts',
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
    'convertInboxToClaimAction',
    'convertInboxToOfferAction',
    'promoteInboxItem',
    'createTaskFromInboxItem',
    'createTaskAction',
    'appendInboxInternalNoteAction',
    'saveInboxResponseDraftAction',
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

  it('draft helpers and intake never import send or write actions', () => {
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

  it('draft workspace UI has no send control', () => {
    const draftUi = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/components/inbox-kfz-response-draft-section.tsx'),
      'utf8',
    )
    const detailUi = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/components/inbox-detail-panel.tsx'),
      'utf8',
    )
    const action = fs.readFileSync(
      path.join(srcRoot, 'features/inbox/actions/save-inbox-response-draft.ts'),
      'utf8',
    )

    assert.match(draftUi, /Internen Entwurf speichern/)
    assert.match(draftUi, /KFZ_AI_DRAFT_REVIEW_LABEL/)
    assert.match(draftUi, /Als Ausgangsentwurf übernehmen/)
    assert.doesNotMatch(draftUi, /Nachricht senden|Kundenantwort senden|sendEmail|sendWhatsApp/)
    assert.doesNotMatch(detailUi, /Kundenantwort senden|Nachricht senden/)
    assert.doesNotMatch(action, /features\/email|features\/whatsapp|resend/)
    assert.match(action, /no send, status, case or task side effect/)
    assert.equal(
      KFZ_AI_DRAFT_REVIEW_LABEL,
      'KI-Text ist ein Vorschlag — menschliche Prüfung erforderlich',
    )
  })
})
