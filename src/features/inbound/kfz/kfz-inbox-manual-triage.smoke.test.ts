/**
 * Normalized Kfz intake → inbox review → explicit manual triage.
 * Prevents automatic status / task / outbound side effects.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, it } from 'node:test'

import { getInboxAiProposal } from '@/features/ai-inbound/services/get-inbox-ai-proposal'
import { mapInboxItemToAnalysisInput } from '@/features/ai-inbound/lib/map-inbox-item-to-analysis-input'
import {
  applyKfzManualTriageCommand,
  KFZ_INTERNAL_NOTE_HEADING,
  KFZ_REVIEW_NO_AUTO_ACTION,
  KFZ_REVIEW_STARTED_NOTE,
  listKfzManualTriageActions,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
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
const SECRET = 'test-kfz-inbox-triage-secret'

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

describe('kfz intake → inbox review → explicit manual action', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('intake leaves the item unprocessed and offers only explicit internal actions', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-triage-intake')
      const review = presentKfzWebsiteInboxItem(item)

      assert.ok(review)
      assert.equal(item.processed_at, null)
      assert.equal(review.phase, 'needs_review')
      assert.match(review.nextManualAction, /Prüfung starten/)
      assert.equal(
        review.nextManualAction.includes(KFZ_REVIEW_NO_AUTO_ACTION),
        true,
      )
      assert.equal(review.customerName, 'Max Mustermann')
      assert.equal(review.request, 'Wechsel Kfz-Versicherung')
      assert.ok(review.availableActions.every((action) => action.requiresExplicitHumanAction))

      const availableIds = review.availableActions
        .filter((action) => action.available)
        .map((action) => action.id)
      assert.deepEqual(availableIds, [
        'start_review',
        'record_internal_note',
        'save_response_draft',
        'create_follow_up_task',
        'prepare_reply',
        'mark_contacted',
        'mark_follow_up',
        'mark_handled',
      ])
    })
  })

  it('presenting the review or generating AI does not process, create a task, or send', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-triage-no-auto')
      const before = {
        processed_at: item.processed_at,
        content: item.content,
      }

      const review = presentKfzWebsiteInboxItem(item)
      const ai = await getInboxAiProposal(item)
      const untouched = applyKfzManualTriageCommand(
        { content: item.content, processed_at: item.processed_at, linkedTaskId: null },
        null,
      )

      assert.ok(review)
      assert.equal(ai.proposal.status, 'proposal')
      assert.equal(item.processed_at, before.processed_at)
      assert.equal(item.content, before.content)
      assert.equal(untouched.ok, true)
      if (!untouched.ok) {
        return
      }
      assert.deepEqual(untouched.mutated, {
        content: false,
        processed: false,
        task: false,
      })
      assert.equal(untouched.next.processed_at, null)
      assert.equal(untouched.next.linkedTaskId, null)
    })
  })

  it('start review and internal note stay on the note boundary and do not mark handled', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-triage-note')
      const started = applyKfzManualTriageCommand(
        { content: item.content, processed_at: item.processed_at, linkedTaskId: null },
        { type: 'start_review' },
      )
      assert.equal(started.ok, true)
      if (!started.ok) {
        return
      }
      assert.equal(started.mutated.content, true)
      assert.equal(started.mutated.processed, false)
      assert.equal(started.mutated.task, false)
      assert.equal(started.next.content.includes(KFZ_INTERNAL_NOTE_HEADING), true)
      assert.equal(started.next.content.includes(KFZ_REVIEW_STARTED_NOTE), true)
      assert.equal(started.next.processed_at, null)

      const noted = applyKfzManualTriageCommand(started.next, {
        type: 'record_internal_note',
        note: 'Rückruf intern vormerken — nicht senden.',
      })
      assert.equal(noted.ok, true)
      if (!noted.ok) {
        return
      }
      assert.equal(noted.mutated.processed, false)
      assert.equal(noted.next.processed_at, null)
      assert.match(noted.next.content, /Rückruf intern vormerken/)

      const reviewed = presentKfzWebsiteInboxItem({
        ...item,
        content: noted.next.content,
        processed_at: noted.next.processed_at,
      })
      assert.ok(reviewed)
      assert.equal(reviewed.phase, 'in_review')
      assert.equal(reviewed.customerName, 'Max Mustermann')
      assert.equal(reviewed.request, 'Wechsel Kfz-Versicherung')
      assert.match(reviewed.nextManualAction, /Prüfung läuft intern/)
    })
  })

  it('follow-up task and mark handled require an explicit command', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-triage-task')
      const taskId = '33333333-3333-4333-8333-333333333333'

      const tasked = applyKfzManualTriageCommand(
        { content: item.content, processed_at: item.processed_at, linkedTaskId: null },
        { type: 'create_follow_up_task', taskId },
      )
      assert.equal(tasked.ok, true)
      if (!tasked.ok) {
        return
      }
      assert.equal(tasked.mutated.task, true)
      assert.equal(tasked.mutated.processed, false)
      assert.equal(tasked.next.processed_at, null)
      assert.equal(tasked.next.linkedTaskId, taskId)

      const handledAt = '2026-09-07T15:00:00.000Z'
      const handled = applyKfzManualTriageCommand(tasked.next, {
        type: 'mark_handled',
        at: handledAt,
      })
      assert.equal(handled.ok, true)
      if (!handled.ok) {
        return
      }
      assert.equal(handled.mutated.processed, true)
      assert.equal(handled.next.processed_at, handledAt)
      assert.equal(handled.next.linkedTaskId, taskId)

      const closed = presentKfzWebsiteInboxItem(
        { ...item, processed_at: handled.next.processed_at },
        { linkedTaskId: handled.next.linkedTaskId },
      )
      assert.ok(closed)
      assert.equal(closed.phase, 'handled')
      assert.match(closed.nextManualAction, /manuell als bearbeitet/)
      const markHandled = listKfzManualTriageActions(
        { content: item.content, processed_at: handled.next.processed_at },
        handled.next.linkedTaskId,
      ).find((action) => action.id === 'mark_handled')
      assert.equal(markHandled?.available, false)
    })
  })

  it('internal notes stay out of the AI suggestion input', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-triage-ai-strip')
      const noted = applyKfzManualTriageCommand(
        { content: item.content, processed_at: item.processed_at, linkedTaskId: null },
        { type: 'record_internal_note', note: 'Geheime interne Bewertung 42.' },
      )
      assert.equal(noted.ok, true)
      if (!noted.ok) {
        return
      }

      const analysisInput = mapInboxItemToAnalysisInput({
        ...item,
        content: noted.next.content,
      })
      assert.doesNotMatch(analysisInput.content ?? '', /Geheime interne Bewertung/)
      assert.doesNotMatch(analysisInput.content ?? '', new RegExp(KFZ_INTERNAL_NOTE_HEADING))
      assert.match(analysisInput.content ?? '', /Kfz-Anfrage von Max Mustermann/)

      const ai = await getInboxAiProposal({
        ...item,
        content: noted.next.content,
      })
      assert.equal(ai.proposal.status, 'proposal')
    })
  })

  it('rejects empty notes and does not invent a handled status', () => {
    const empty = applyKfzManualTriageCommand(
      { content: 'Kfz-Anfrage', processed_at: null, linkedTaskId: null },
      { type: 'record_internal_note', note: '   ' },
    )
    assert.equal(empty.ok, false)

    const alreadyHandled = applyKfzManualTriageCommand(
      {
        content: 'Kfz-Anfrage',
        processed_at: '2026-09-07T12:00:00.000Z',
        linkedTaskId: null,
      },
      { type: 'mark_handled', at: '2026-09-07T13:00:00.000Z' },
    )
    assert.equal(alreadyHandled.ok, false)
  })
})

describe('kfz intake/review side-effect boundary', () => {
  const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
  const repoRoot = path.resolve(srcRoot, '..')

  const ENTRY_RELATIVE_PATHS = [
    'features/inbound/kfz/services/handle-kfz-inbound-http.ts',
    'features/inbound/kfz/services/process-kfz-inquiry.ts',
    'features/inbox/lib/present-kfz-website-inbox.ts',
    'features/inbox/lib/kfz-inbox-manual-triage.ts',
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

  it('intake, presentation and proposal generation never import write actions', () => {
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
          violations.push(
            `${path.relative(repoRoot, file)} references ${identifier}`,
          )
        }
      }
    }

    assert.equal(
      violations.length,
      0,
      `Automatic path must not reach writers:\n${violations.join('\n')}`,
    )
  })
})
