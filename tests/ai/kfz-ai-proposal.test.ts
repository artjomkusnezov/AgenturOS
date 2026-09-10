/**
 * Gate 4 — Kfz website Inbox AI proposal (advisory only).
 *
 * Covers: schema validation path, Kfz mapping, missing/unknown data,
 * provider/config failure, and an enforceable no-side-effect import/call lock.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  analyzeInboundItem,
  InboundAnalysisProviderError,
  parseInboundAnalysisSuggestion,
  type InboundAnalysisProvider,
} from '@/features/ai/inbound-analysis'
import { buildKfzLocalProposal } from '@/features/ai-inbound/lib/build-kfz-local-proposal'
import { isKfzWebsiteInboxItem } from '@/features/ai-inbound/lib/is-kfz-website-inbox-item'
import { mapInboxItemToAnalysisInput } from '@/features/ai-inbound/lib/map-inbox-item-to-analysis-input'
import {
  createLocalKfzAnalysisProvider,
  createNotConfiguredAnalysisProvider,
} from '@/features/ai-inbound/providers/local-kfz-analysis-provider'
import { getInboxAiProposal } from '@/features/ai-inbound/services/get-inbox-ai-proposal'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import type { Json } from '@/lib/supabase/types'

function baseInboxItem(overrides: Partial<InboxItem> = {}): InboxItem {
  const metadata = {
    acquisition: {
      family: 'website',
      product: 'kfz',
      source: 'kfz.artkus.de',
      campaign: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
    },
    inquiry: {
      reason: 'Preischeck Kfz-Versicherung',
      preferredChannel: 'phone',
      language: 'de',
      location: { postalCode: '49525', city: 'Lengerich' },
      vehicle: { make: 'VW', model: 'Golf', year: '2019' },
      contextNotes: null,
      phone: '+491701234567',
      email: null,
    },
    consentEvidence: {
      purpose: 'inquiry_processing',
      granted: true,
      version: 'kfz-lp-2026-09-01',
      consentedAt: '2026-09-07T10:00:00.000Z',
      receivedAt: '2026-09-07T10:00:01.000Z',
    },
  }

  return {
    id: '11111111-1111-4111-8111-111111111111',
    agency_id: '22222222-2222-4222-8222-222222222222',
    user_id: '33333333-3333-4333-8333-333333333333',
    content:
      'Kfz-Anfrage von Anna Beispiel\nOrt: 49525 Lengerich\nAnliegen: Preischeck Kfz-Versicherung\nBevorzugter Kanal: phone\nTelefon: +491701234567\nFahrzeug: VW Golf 2019',
    title: 'Kfz-Anfrage · Anna Beispiel',
    source: 'website',
    channel: 'website',
    external_id: 'kfz:sub-gate4-001',
    sender: {
      displayName: 'Anna Beispiel',
      address: '+491701234567',
      addressKind: 'phone',
    },
    origin: null,
    received_at: '2026-09-07T10:00:01.000Z',
    message_kind: 'text',
    inbound_metadata: metadata as Json,
    processed_at: null,
    created_at: '2026-09-07T10:00:01.000Z',
    updated_at: '2026-09-07T10:00:01.000Z',
    detected_language: null,
    transcript_text: null,
    transcription_completed_at: null,
    transcription_error: null,
    transcription_model: null,
    transcription_provider: null,
    transcription_started_at: null,
    transcription_status: 'none',
    ...overrides,
  }
}

describe('Kfz website inbox detection + mapping', () => {
  it('detects Kfz website items from acquisition.product', () => {
    assert.equal(isKfzWebsiteInboxItem(baseInboxItem()), true)
  })

  it('rejects non-website channels', () => {
    assert.equal(
      isKfzWebsiteInboxItem(
        baseInboxItem({
          channel: 'email',
          source: 'email',
          inbound_metadata: {} as Json,
        }),
      ),
      false,
    )
  })

  it('maps inbox working copy to analysis input without inventing facts', () => {
    const input = mapInboxItemToAnalysisInput(baseInboxItem())
    assert.equal(input.channel, 'website')
    assert.equal(input.externalId, 'kfz:sub-gate4-001')
    assert.match(input.content ?? '', /Preischeck/)
    assert.ok(input.metadata)
    const inquiry = (input.metadata as { inquiry?: { phone?: string } }).inquiry
    assert.equal(inquiry?.phone, '+491701234567')
    assert.equal(input.knownContext, null)
  })
})

describe('Kfz local proposal schema + mapping', () => {
  it('produces a schema-valid proposal with product Kfz', () => {
    const input = mapInboxItemToAnalysisInput(baseInboxItem())
    const raw = buildKfzLocalProposal(input)
    const parsed = parseInboundAnalysisSuggestion(raw)
    assert.equal(parsed.ok, true)
    if (!parsed.ok) {
      return
    }
    assert.equal(parsed.suggestion.productTopic, 'Kfz')
    assert.equal(parsed.suggestion.intent, 'new_business')
    assert.equal(parsed.suggestion.suggestedCaseAction, 'none')
    assert.ok(parsed.suggestion.suggestedTask)
    assert.ok(parsed.suggestion.suggestedReplyDraft)
    assert.match(parsed.suggestion.suggestedReplyDraft ?? '', /Entwurf|keine verbindliche/i)
    assert.equal(parsed.suggestion.purchaseIntent, 'possible')
  })

  it('marks missing contact / vehicle as missingInformation and raises human takeover', () => {
    const item = baseInboxItem({
      inbound_metadata: {
        acquisition: { family: 'website', product: 'kfz' },
        inquiry: {
          reason: '',
          preferredChannel: 'email',
          language: null,
          location: { postalCode: null, city: null },
          vehicle: { make: null, model: null, year: null },
          contextNotes: null,
          phone: null,
          email: null,
        },
      } as Json,
      content: 'Kfz-Anfrage von Unbekannt',
      title: 'Kfz-Anfrage · Unbekannt',
      sender: { displayName: 'Unbekannt', address: null, addressKind: null },
    })

    const suggestion = buildKfzLocalProposal(mapInboxItemToAnalysisInput(item))
    const parsed = parseInboundAnalysisSuggestion(suggestion)
    assert.equal(parsed.ok, true)
    if (!parsed.ok) {
      return
    }
    assert.equal(parsed.suggestion.humanReviewRequired, true)
    assert.ok(parsed.suggestion.humanReviewReason)
    assert.ok(parsed.suggestion.missingInformation.length > 0)
    assert.ok(
      parsed.suggestion.missingInformation.some((entry) =>
        /Erreichbarkeit|Telefon|E-Mail/i.test(entry),
      ),
    )
  })

  it('keeps product unclear when acquisition.product is absent', () => {
    const item = baseInboxItem({
      inbound_metadata: {
        inquiry: {
          reason: 'Allgemeine Frage',
          preferredChannel: 'phone',
          phone: '+491701234567',
          email: null,
          location: { postalCode: '49525', city: 'Lengerich' },
          vehicle: { make: null, model: null, year: null },
          contextNotes: null,
          language: null,
        },
      } as Json,
      title: 'Kfz-Anfrage · Fallback',
    })
    const suggestion = buildKfzLocalProposal(mapInboxItemToAnalysisInput(item))
    assert.equal(suggestion.productTopic, 'unclear')
    assert.equal(suggestion.humanReviewRequired, true)
  })

  it('treats claim-like reasons as claim with human takeover (no invented facts)', () => {
    const item = baseInboxItem({
      inbound_metadata: {
        acquisition: { family: 'website', product: 'kfz' },
        inquiry: {
          reason: 'Unfall gestern — Schadenmeldung',
          preferredChannel: 'phone',
          phone: '+491701234567',
          email: null,
          location: { postalCode: '49525', city: 'Lengerich' },
          vehicle: { make: 'VW', model: 'Golf', year: '2019' },
          contextNotes: null,
          language: 'de',
        },
      } as Json,
    })
    const suggestion = buildKfzLocalProposal(mapInboxItemToAnalysisInput(item))
    assert.equal(suggestion.intent, 'claim')
    assert.equal(suggestion.urgency, 'high')
    assert.equal(suggestion.humanReviewRequired, true)
    assert.equal(suggestion.suggestedCaseAction, 'none')
    assert.doesNotMatch(suggestion.summary, /\d+[,.]?\d*\s*€/)
    assert.doesNotMatch(suggestion.suggestedReplyDraft ?? '', /Tarif|Deckung zusichern|Rabatt/i)
  })
})

describe('getInboxAiProposal integration', () => {
  it('generates an internal proposal for Kfz website items via analyzeInboundItem', async () => {
    const result = await getInboxAiProposal(baseInboxItem())
    assert.equal(result.proposal.status, 'proposal')
    if (result.proposal.status !== 'proposal') {
      return
    }
    assert.equal(result.proposal.generated, true)
    assert.equal(result.proposal.suggestion.productTopic, 'Kfz')
    assert.equal(result.proposal.usedFallback, false)
    assert.ok(result.analysisResult)
  })

  it('returns not_applicable for email inbox items', async () => {
    const result = await getInboxAiProposal(
      baseInboxItem({
        channel: 'email',
        source: 'email',
        inbound_metadata: {} as Json,
        title: 'Betreff',
      }),
    )
    assert.equal(result.proposal.status, 'not_applicable')
  })

  it('shows safe unavailable state when analysis is disabled', async () => {
    const result = await getInboxAiProposal(baseInboxItem(), { enabled: false })
    assert.equal(result.proposal.status, 'unavailable')
    if (result.proposal.status !== 'unavailable') {
      return
    }
    assert.equal(result.proposal.reason, 'not_configured')
    assert.equal(result.proposal.generated, false)
    assert.match(result.proposal.message, /nicht konfiguriert|manuell/i)
  })

  it('uses safe fallback for malformed provider output without side effects', async () => {
    const brokenProvider: InboundAnalysisProvider = {
      id: 'broken-test',
      async analyze() {
        return { broken: true }
      },
    }

    const result = await getInboxAiProposal(baseInboxItem(), {
      provider: brokenProvider,
    })
    assert.equal(result.proposal.status, 'proposal')
    if (result.proposal.status !== 'proposal') {
      return
    }
    assert.equal(result.proposal.usedFallback, true)
    assert.equal(result.proposal.suggestion.humanReviewRequired, true)
    assert.equal(result.proposal.suggestion.suggestedCaseAction, 'none')
    assert.equal(result.proposal.suggestion.suggestedTask, null)
    assert.equal(result.proposal.suggestion.suggestedReplyDraft, null)
  })

  it('uses safe fallback for provider failure without side effects', async () => {
    const failingProvider: InboundAnalysisProvider = {
      id: 'failing-test',
      async analyze() {
        throw new InboundAnalysisProviderError('upstream down', 'provider_failed')
      },
    }

    const result = await getInboxAiProposal(baseInboxItem(), {
      provider: failingProvider,
    })
    assert.equal(result.proposal.status, 'proposal')
    if (result.proposal.status !== 'proposal') {
      return
    }
    assert.equal(result.proposal.usedFallback, true)
    assert.equal(result.proposal.suggestion.suggestedCaseAction, 'none')
  })

  it('local provider path never implies outbound send in suggestion text contract', async () => {
    const provider = createLocalKfzAnalysisProvider()
    const analysis = await analyzeInboundItem(
      mapInboxItemToAnalysisInput(baseInboxItem()),
      provider,
    )
    assert.equal(analysis.usedFallback, false)
    const draft = analysis.suggestion.suggestedReplyDraft ?? ''
    assert.match(draft, /Entwurf|keine verbindliche/i)
    assert.doesNotMatch(draft, /wurde gesendet|automatisch versendet/i)
  })

  it('not-configured provider throws typed error for resolver path', async () => {
    const provider = createNotConfiguredAnalysisProvider()
    await assert.rejects(
      () => provider.analyze({
        input: mapInboxItemToAnalysisInput(baseInboxItem()),
        instructions: { system: 'x', user: 'y' },
      }),
      (error: unknown) =>
        error instanceof InboundAnalysisProviderError &&
        error.code === 'not_configured',
    )
  })
})

/**
 * Enforceable advisory-only lock for proposal generation.
 *
 * Walks the static import graph of get-inbox-ai-proposal.ts and the providers
 * resolveInboundAnalysisProvider can load, then fails if any module imports or
 * references outbound messaging / case / task / inbox-status / follow-up writers.
 */
describe('proposal generation side-effect boundary', () => {
  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..',
  )
  const srcRoot = path.join(repoRoot, 'src')

  const ENTRY_RELATIVE_PATHS = [
    'features/ai-inbound/services/get-inbox-ai-proposal.ts',
    'features/ai-inbound/providers/resolve-inbound-analysis-provider.ts',
    'features/ai-inbound/providers/local-kfz-analysis-provider.ts',
  ] as const

  /** Path fragments that must never appear in the proposal generation graph. */
  const FORBIDDEN_IMPORT_FRAGMENTS = [
    // Outbound / messaging
    'features/email/',
    'features/whatsapp/',
    'node_modules/resend',
    // Case creation / promotion / follow-up scheduling
    'features/cases/actions/',
    'features/cases/services/inbox-promotion-service',
    'features/cases/services/case-promotion-writers',
    'features/cases/services/case-task-service',
    'features/cases/repositories/case-create-repository',
    'features/cases/repositories/case-workflow-repository',
    // Task creation
    'features/tasks/actions/',
    'features/tasks/repositories/tasks-repository',
    // Inbox status mutation / conversion
    'features/inbox/actions/',
    'features/inbox/repositories/inbox-repository',
  ] as const

  /** External packages that must not be pulled into proposal generation. */
  const FORBIDDEN_EXTERNAL_PACKAGES = ['resend'] as const

  /**
   * Identifiers that imply customer-facing or domain write side effects.
   * Presence as a call/import binding in the reachable graph fails the lock.
   */
  const FORBIDDEN_IDENTIFIERS = [
    'createCaseFromInboxItem',
    'createTaskCaseFromInboxItem',
    'createTaskFromInboxItem',
    'createTaskCaseForCurrentUser',
    'createCaseForCurrentUser',
    'createTaskForCurrentUser',
    'promoteInboxItem',
    'promoteInboxItemToGenericCase',
    'createTaskAction',
    'createCaseAction',
    'processInboxItemAction',
    'processInboxItemForCurrentUser',
    'reopenInboxItemAction',
    'reopenInboxItemForCurrentUser',
    'updateInboxItemAction',
    'updateInboxItemContentForCurrentUser',
    'convertInboxItemToTask',
    'convertInboxItemToOffer',
    'convertInboxItemToClaim',
    'createInformationFromInboxItem',
    'updateCaseForCurrentUser',
    'updateCaseWorkflowAction',
  ] as const

  const IMPORT_SPEC_RE =
    /(?:import|export)\s+(?:type\s+)?(?:[^'"\n;]+?\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g

  function resolveToSourceFile(specifierBase: string): string | null {
    const candidates = [
      specifierBase,
      `${specifierBase}.ts`,
      `${specifierBase}.tsx`,
      `${specifierBase}.js`,
      `${specifierBase}.mjs`,
      path.join(specifierBase, 'index.ts'),
      path.join(specifierBase, 'index.tsx'),
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
      const resolved = resolveToSourceFile(
        path.resolve(path.dirname(fromFile), specifier),
      )
      return resolved ? { kind: 'source', file: resolved } : null
    }
    const packageName = specifier.startsWith('@')
      ? specifier.split('/').slice(0, 2).join('/')
      : specifier.split('/')[0]
    return { kind: 'external', name: packageName }
  }

  function collectProposalModuleGraph(entryFiles: string[]): {
    files: string[]
    externalPackages: string[]
  } {
    const visited = new Set<string>()
    const externals = new Set<string>()
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
        if (!resolved) {
          continue
        }
        if (resolved.kind === 'external') {
          externals.add(resolved.name)
          continue
        }
        if (!visited.has(resolved.file)) {
          queue.push(resolved.file)
        }
      }
    }

    return {
      files: [...visited].sort(),
      externalPackages: [...externals].sort(),
    }
  }

  function assertNoForbiddenImports(files: string[]): void {
    const violations: string[] = []
    for (const file of files) {
      const normalized = file.split(path.sep).join('/')
      for (const fragment of FORBIDDEN_IMPORT_FRAGMENTS) {
        if (normalized.includes(fragment)) {
          violations.push(`${path.relative(repoRoot, file)} imports/reaches ${fragment}`)
        }
      }
    }
    assert.equal(
      violations.length,
      0,
      `Proposal generation must not reach mutation/outbound modules:\n${violations.join('\n')}`,
    )
  }

  function assertNoForbiddenExternals(packages: string[]): void {
    const hits = packages.filter((name) =>
      (FORBIDDEN_EXTERNAL_PACKAGES as readonly string[]).includes(name),
    )
    assert.equal(
      hits.length,
      0,
      `Proposal generation must not import outbound packages: ${hits.join(', ')}`,
    )
  }

  function assertNoForbiddenIdentifiers(files: string[]): void {
    const violations: string[] = []
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8')
      for (const identifier of FORBIDDEN_IDENTIFIERS) {
        const pattern = new RegExp(`\\b${identifier}\\b`)
        if (pattern.test(source)) {
          violations.push(
            `${path.relative(repoRoot, file)} references forbidden symbol ${identifier}`,
          )
        }
      }
    }
    assert.equal(
      violations.length,
      0,
      `Proposal generation must not call mutation/outbound APIs:\n${violations.join('\n')}`,
    )
  }

  it('forbidden boundary targets exist so the lock cannot go false-green from typos', () => {
    const expectedExisting = [
      'features/cases/services/inbox-promotion-service.ts',
      'features/cases/services/case-promotion-writers.ts',
      'features/cases/services/case-task-service.ts',
      'features/cases/repositories/case-create-repository.ts',
      'features/cases/repositories/case-workflow-repository.ts',
      'features/tasks/repositories/tasks-repository.ts',
      'features/inbox/repositories/inbox-repository.ts',
      'features/inbox/actions/process-inbox-item.ts',
      'features/tasks/actions/create-task.ts',
      'features/cases/actions/create-case-action.ts',
      'features/email/lib/email-adapter.ts',
      'features/whatsapp/lib/whatsapp-adapter.ts',
    ] as const

    for (const relative of expectedExisting) {
      const absolute = path.join(srcRoot, relative)
      assert.ok(
        fs.existsSync(absolute),
        `boundary target missing (lock would be weak): ${relative}`,
      )
      assert.ok(
        FORBIDDEN_IMPORT_FRAGMENTS.some((fragment) =>
          absolute.split(path.sep).join('/').includes(fragment),
        ),
        `expectedExisting path is not covered by FORBIDDEN_IMPORT_FRAGMENTS: ${relative}`,
      )
    }
  })

  it('getInboxAiProposal + resolved providers never import or call mutation/outbound writers', () => {
    const entries = ENTRY_RELATIVE_PATHS.map((relative) =>
      path.join(srcRoot, relative),
    )
    for (const entry of entries) {
      assert.ok(fs.existsSync(entry), `missing entry file: ${entry}`)
    }

    const graph = collectProposalModuleGraph(entries)
    assert.ok(graph.files.length > 0, 'expected a non-empty module graph')
    assert.ok(
      graph.files.some((file) =>
        file.endsWith(`${path.sep}get-inbox-ai-proposal.ts`),
      ),
      'graph must include get-inbox-ai-proposal.ts',
    )
    assert.ok(
      graph.files.some((file) =>
        file.endsWith(`${path.sep}local-kfz-analysis-provider.ts`),
      ),
      'graph must include the resolved local Kfz provider',
    )

    assertNoForbiddenImports(graph.files)
    assertNoForbiddenExternals(graph.externalPackages)
    assertNoForbiddenIdentifiers(graph.files)
  })

  it('proposal generation remains advisory across success, disabled, and malformed paths', async () => {
    const runs = await Promise.all([
      getInboxAiProposal(baseInboxItem()),
      getInboxAiProposal(baseInboxItem(), { enabled: false }),
      getInboxAiProposal(baseInboxItem(), {
        provider: {
          id: 'malformed',
          async analyze() {
            return 'not-an-object'
          },
        },
      }),
    ])

    for (const run of runs) {
      assert.ok(
        run.proposal.status === 'proposal' ||
          run.proposal.status === 'unavailable' ||
          run.proposal.status === 'not_applicable',
      )
      if (run.proposal.status === 'proposal') {
        assert.equal(run.proposal.suggestion.suggestedCaseAction, 'none')
      }
    }
  })
})
