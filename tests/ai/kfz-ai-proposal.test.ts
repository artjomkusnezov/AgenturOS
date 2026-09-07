/**
 * Gate 4 — Kfz website Inbox AI proposal (advisory only).
 *
 * Covers: schema validation path, Kfz mapping, missing/unknown data,
 * provider/config failure, and no outbound/customer-facing side effects.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

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
import { EMPTY_AI_PROPOSAL_SIDE_EFFECTS } from '@/features/ai-inbound/types'
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

function assertNoSideEffects(
  sideEffects: typeof EMPTY_AI_PROPOSAL_SIDE_EFFECTS,
): void {
  assert.deepEqual(sideEffects, EMPTY_AI_PROPOSAL_SIDE_EFFECTS)
  assert.equal(sideEffects.outboundContactAttempted, false)
  assert.equal(sideEffects.caseCreated, false)
  assert.equal(sideEffects.taskCreated, false)
  assert.equal(sideEffects.statusChanged, false)
  assert.equal(sideEffects.followUpScheduled, false)
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
    assertNoSideEffects(result.sideEffects)
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
    assertNoSideEffects(result.sideEffects)
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
    assertNoSideEffects(result.sideEffects)
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
    assertNoSideEffects(result.sideEffects)
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
    assertNoSideEffects(result.sideEffects)
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

describe('proposal generation side-effect guarantee', () => {
  it('generation does not flip any customer-facing side-effect flags', async () => {
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
      assertNoSideEffects(run.sideEffects)
    }
  })
})
