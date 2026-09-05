import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  analyzeInboundItem,
  buildInboundAnalysisInstructions,
  createSafeFallbackSuggestion,
  InboundAnalysisProviderError,
  parseInboundAnalysisSuggestion,
  type InboundAnalysisInput,
  type InboundAnalysisProvider,
  type InboundAnalysisSuggestion,
} from '@/features/ai/inbound-analysis'

function baseSuggestion(
  overrides: Partial<InboundAnalysisSuggestion> = {},
): InboundAnalysisSuggestion {
  return {
    summary: 'Kurzfassung',
    intent: 'unclear',
    productTopic: 'unclear',
    urgency: 'normal',
    missingInformation: [],
    purchaseIntent: 'unclear',
    suggestedCaseAction: 'none',
    suggestedTask: null,
    suggestedReplyDraft: null,
    humanReviewRequired: true,
    humanReviewReason: 'Unklarheit — bitte manuell prüfen.',
    confidence: 0.4,
    ...overrides,
  }
}

function staticProvider(
  output: unknown,
  id = 'test-static',
): InboundAnalysisProvider {
  return {
    id,
    async analyze() {
      return output
    },
  }
}

function failingProvider(
  error: Error,
  id = 'test-failing',
): InboundAnalysisProvider {
  return {
    id,
    async analyze() {
      throw error
    },
  }
}

const kfzLeadInput: InboundAnalysisInput = {
  channel: 'email',
  externalId: 'lead-kfz-001',
  title: 'Anfrage Kfz-Versicherung',
  content:
    'Hallo, ich hätte gerne einen Preischeck für meine Kfz-Versicherung. Fahrzeugschein habe ich angehängt. Bitte um Angebot.',
  kind: 'document',
  sender: {
    displayName: 'Alex Beispiel',
    address: 'alex@example.com',
    addressKind: 'email',
  },
  attachments: [
    { filename: 'Fahrzeugschein.pdf', mimeType: 'application/pdf' },
  ],
  metadata: {
    campaign: 'kfz-meta-lead',
    source: 'website-form',
  },
}

const motorClaimInput: InboundAnalysisInput = {
  channel: 'whatsapp',
  externalId: 'wamid.claim-urgent',
  content:
    'Hilfe, gerade Unfall auf der Autobahn. Airbag raus, Auto nicht fahrbereit, Abschleppdienst unterwegs. Bitte melden Sie den Schaden dringend.',
  kind: 'text',
  sender: {
    displayName: 'Sandra Kunde',
    address: '+491701111111',
    addressKind: 'phone',
  },
}

const addressChangeInput: InboundAnalysisInput = {
  channel: 'email',
  externalId: 'msg-address-1',
  title: 'Adressänderung',
  content:
    'Guten Tag, ich bin umgezogen. Bitte ändern Sie meine Anschrift in allen Verträgen auf Musterweg 12, 80331 München.',
  kind: 'text',
  sender: {
    displayName: 'Vera Beispiel',
    address: 'vera@example.com',
    addressKind: 'email',
  },
}

const ambiguousInput: InboundAnalysisInput = {
  channel: 'whatsapp',
  externalId: 'wamid.ambiguous',
  content: 'Können Sie sich das mal ansehen?',
  kind: 'text',
}

describe('inbound analysis instructions', () => {
  it('requires structured output and safety constraints', () => {
    const { system, user } = buildInboundAnalysisInstructions(kfzLeadInput)

    assert.match(system, /structured data only/i)
    assert.match(system, /Do not invent customer facts/i)
    assert.match(system, /coverage, legal, tariff, or contract decisions/i)
    assert.match(system, /case or contact match/i)
    assert.match(system, /human review/i)
    assert.match(user, /Fahrzeugschein\.pdf/)
    assert.match(user, /Preischeck/)
  })
})

describe('inbound analysis validation', () => {
  it('accepts a complete suggestion', () => {
    const parsed = parseInboundAnalysisSuggestion(
      baseSuggestion({
        intent: 'service',
        productTopic: 'Hausrat',
        humanReviewRequired: false,
        humanReviewReason: null,
        confidence: 0.8,
      }),
    )
    assert.equal(parsed.ok, true)
  })

  it('rejects malformed provider response', () => {
    const parsed = parseInboundAnalysisSuggestion({
      summary: 'x',
      intent: 'not-an-intent',
    })
    assert.equal(parsed.ok, false)
    if (!parsed.ok) {
      assert.ok(parsed.errors.length > 0)
    }
  })
})

describe('analyzeInboundItem scenarios', () => {
  it('analyzes a Kfz new-business price-check with Fahrzeugschein', async () => {
    const providerOutput = baseSuggestion({
      summary:
        'Kunde wünscht Preischeck zur Kfz-Versicherung und nennt einen angehängten Fahrzeugschein.',
      intent: 'new_business',
      productTopic: 'Kfz',
      urgency: 'normal',
      missingInformation: [
        'Aktuelle Jahresbeitrag / Versicherungsscheinnummer',
        'Gewünschter Deckungsumfang',
      ],
      purchaseIntent: 'strong',
      suggestedCaseAction: 'suggest_new',
      suggestedTask: {
        title: 'Kfz-Preischeck vorbereiten',
        reason: 'Neugeschäftsanfrage mit Fahrzeugschein-Hinweis.',
        priority: 'normal',
      },
      suggestedReplyDraft:
        'Vielen Dank für Ihre Anfrage. Wir prüfen den Preischeck anhand der Unterlagen und melden uns.',
      humanReviewRequired: false,
      humanReviewReason: null,
      confidence: 0.86,
    })

    const result = await analyzeInboundItem(
      kfzLeadInput,
      staticProvider(providerOutput),
    )

    assert.equal(result.usedFallback, false)
    assert.equal(result.suggestion.intent, 'new_business')
    assert.equal(result.suggestion.productTopic, 'Kfz')
    assert.equal(result.suggestion.purchaseIntent, 'strong')
    assert.equal(result.suggestion.suggestedCaseAction, 'suggest_new')
    assert.ok(result.suggestion.suggestedTask)
    assert.match(result.suggestion.summary, /Preischeck|Kfz/i)
    assert.ok(
      kfzLeadInput.attachments?.some((a) => /Fahrzeugschein/i.test(a.filename)),
    )
  })

  it('analyzes a motor claim with urgent safety/towing signal', async () => {
    const providerOutput = baseSuggestion({
      summary:
        'Dringende Kfz-Schadenmeldung nach Unfall; Fahrzeug nicht fahrbereit, Abschleppdienst unterwegs.',
      intent: 'claim',
      productTopic: 'Kfz',
      urgency: 'immediate',
      missingInformation: ['Genauere Unfallörtlichkeit', 'Polizeiliches Aktenzeichen'],
      purchaseIntent: 'none',
      suggestedCaseAction: 'suggest_new',
      suggestedTask: {
        title: 'Kfz-Schaden Sofortaufnahme',
        reason: 'Sicherheits-/Abschleppsignal und Fahruntüchtigkeit.',
        priority: 'high',
      },
      suggestedReplyDraft: null,
      humanReviewRequired: true,
      humanReviewReason: 'Sofortige menschliche Übernahme wegen Unfall und Abschleppung.',
      confidence: 0.9,
    })

    const result = await analyzeInboundItem(
      motorClaimInput,
      staticProvider(providerOutput),
    )

    assert.equal(result.suggestion.intent, 'claim')
    assert.equal(result.suggestion.urgency, 'immediate')
    assert.equal(result.suggestion.humanReviewRequired, true)
    assert.ok(result.suggestion.humanReviewReason)
    assert.match(motorClaimInput.content ?? '', /Abschlepp|Unfall/i)
  })

  it('analyzes a routine address-change service request', async () => {
    const providerOutput = baseSuggestion({
      summary: 'Routinemäßige Adressänderung auf neue Anschrift in München.',
      intent: 'service',
      productTopic: 'Verträge allgemein',
      urgency: 'low',
      missingInformation: [],
      purchaseIntent: 'none',
      suggestedCaseAction: 'suggest_new',
      suggestedTask: {
        title: 'Adressänderung durchführen',
        reason: 'Kunde meldet Umzug und neue Anschrift.',
        priority: 'low',
      },
      suggestedReplyDraft:
        'Vielen Dank, wir nehmen die Adressänderung gerne auf und bestätigen Ihnen die Umstellung.',
      humanReviewRequired: false,
      humanReviewReason: null,
      confidence: 0.92,
    })

    const result = await analyzeInboundItem(
      addressChangeInput,
      staticProvider(providerOutput),
    )

    assert.equal(result.suggestion.intent, 'service')
    assert.equal(result.suggestion.urgency, 'low')
    assert.equal(result.suggestion.purchaseIntent, 'none')
    assert.equal(result.suggestion.humanReviewRequired, false)
  })

  it('analyzes an ambiguous message with human review', async () => {
    const providerOutput = baseSuggestion({
      summary: 'Anliegen unklar — Kunde bittet nur, „etwas anzusehen“.',
      intent: 'unclear',
      productTopic: 'unclear',
      urgency: 'normal',
      missingInformation: ['Konkretes Anliegen', 'Betroffene Police/Produkt'],
      purchaseIntent: 'unclear',
      suggestedCaseAction: 'none',
      suggestedTask: null,
      suggestedReplyDraft:
        'Gerne — könnten Sie kurz beschreiben, worum es geht und welche Versicherung betroffen ist?',
      humanReviewRequired: true,
      humanReviewReason: 'Zu wenig Kontext für eine sichere Einordnung.',
      confidence: 0.25,
    })

    const result = await analyzeInboundItem(
      ambiguousInput,
      staticProvider(providerOutput),
    )

    assert.equal(result.suggestion.intent, 'unclear')
    assert.equal(result.suggestion.humanReviewRequired, true)
    assert.equal(result.suggestion.suggestedCaseAction, 'none')
    assert.equal(result.suggestion.suggestedTask, null)
    assert.ok(result.suggestion.confidence < 0.5)
  })

  it('uses safe fallback for malformed provider response', async () => {
    const result = await analyzeInboundItem(
      ambiguousInput,
      staticProvider({ broken: true }),
    )

    assert.equal(result.usedFallback, true)
    assert.equal(result.suggestion.humanReviewRequired, true)
    assert.ok(result.suggestion.humanReviewReason)
    assert.equal(result.suggestion.suggestedCaseAction, 'none')
    assert.equal(result.suggestion.suggestedTask, null)
    assert.equal(result.suggestion.suggestedReplyDraft, null)
    assert.equal(result.suggestion.confidence, 0)
    assert.ok(result.fallbackReason)
  })

  it('uses safe fallback for provider failure', async () => {
    const result = await analyzeInboundItem(
      kfzLeadInput,
      failingProvider(
        new InboundAnalysisProviderError('upstream timeout', 'timeout'),
      ),
    )

    assert.equal(result.usedFallback, true)
    assert.equal(result.suggestion.humanReviewRequired, true)
    assert.match(result.suggestion.humanReviewReason ?? '', /timeout|failed/i)
    assert.equal(result.suggestion.suggestedCaseAction, 'none')
    assert.equal(result.suggestion.suggestedTask, null)
    assert.equal(result.suggestion.suggestedReplyDraft, null)
  })
})

describe('safe fallback helper', () => {
  it('never invents actionable suggestions', () => {
    const fallback = createSafeFallbackSuggestion('parse error')
    assert.equal(fallback.humanReviewRequired, true)
    assert.equal(fallback.suggestedCaseAction, 'none')
    assert.equal(fallback.suggestedTask, null)
    assert.equal(fallback.suggestedReplyDraft, null)
    assert.equal(fallback.intent, 'unclear')
    assert.equal(fallback.confidence, 0)
  })
})
