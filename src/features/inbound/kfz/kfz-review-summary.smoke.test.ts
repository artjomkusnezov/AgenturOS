/**
 * Factual Kfz review summary + missing-information checklist.
 * Presentation stays read-only and separate from the optional AI suggestion.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import { getInboxAiProposal } from '@/features/ai-inbound/services/get-inbox-ai-proposal'
import {
  KFZ_REVIEW_AI_SEPARATE_LABEL,
  KFZ_REVIEW_FACT_LABEL,
  buildKfzFactualSummary,
  buildKfzListSummary,
  buildKfzMissingInformationChecklist,
  labelKfzMissingCount,
  presentKfzWebsiteInboxItem,
} from '@/features/inbox/lib/present-kfz-website-inbox'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import type { Json } from '@/lib/supabase/types'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

const FORBIDDEN_IMPORT_FRAGMENTS = [
  'process-inbox-item',
  'reopen-inbox-item',
  'convert-inbox-to-task',
  'convert-inbox-to-case',
  'convert-inbox-to-offer',
  'convert-inbox-to-claim',
  'append-inbox-internal-note',
  'send-whatsapp',
  'whatsapp-outbound',
  'resend',
] as const

function kfzInboxItem(
  inquiry: Record<string, unknown>,
  senderName = 'Max Mustermann',
): InboxItem {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    agency_id: '22222222-2222-4222-8222-222222222222',
    user_id: '33333333-3333-4333-8333-333333333333',
    channel: 'website',
    source: 'website',
    title: `Kfz-Anfrage · ${senderName}`,
    content: `Kfz-Anfrage von ${senderName}`,
    processed_at: null,
    created_at: '2026-09-07T10:00:01.000Z',
    updated_at: '2026-09-07T10:00:01.000Z',
    received_at: '2026-09-07T10:00:01.000Z',
    external_id: 'kfz:review-summary-001',
    origin: null,
    message_kind: 'text',
    detected_language: null,
    transcript_text: null,
    transcription_completed_at: null,
    transcription_error: null,
    transcription_model: null,
    transcription_provider: null,
    transcription_started_at: null,
    transcription_status: 'none',
    sender: {
      displayName: senderName,
      address: 'max@example.com',
      addressKind: 'email',
    },
    inbound_metadata: {
      acquisition: { family: 'website', product: 'kfz', source: 'kfz.artkus.de' },
      inquiry,
    } as Json,
  }
}

describe('kfz review summary and missing-information checklist', () => {
  it('builds a concise factual summary from submitted fields only', () => {
    const summary = buildKfzFactualSummary({
      customerName: 'Anna Beispiel',
      location: '49525 Lengerich',
      request: 'Wechsel Kfz-Versicherung',
      vehicle: 'VW Golf 2019',
      phone: '+491701234567',
      email: null,
      preferredChannelLabel: 'Telefon',
    })

    assert.equal(
      summary,
      'Anna Beispiel aus 49525 Lengerich. Anliegen: Wechsel Kfz-Versicherung. Fahrzeug: VW Golf 2019. Kontakt: +491701234567 (Telefon).',
    )
    assert.doesNotMatch(summary, /KI|Vorschlag|Entwurf|Tarif|Preisgarantie/)
  })

  it('does not invent a vehicle or contact when those facts are missing', () => {
    const summary = buildKfzFactualSummary({
      customerName: 'Anna Beispiel',
      location: null,
      request: 'Nicht angegeben',
      vehicle: null,
      phone: null,
      email: null,
      preferredChannelLabel: 'Nicht angegeben',
    })

    assert.equal(summary, 'Anna Beispiel. Anliegen nicht angegeben.')
    assert.doesNotMatch(summary, /Fahrzeug:|Kontakt:/)
    assert.equal(
      buildKfzListSummary({ request: 'Nicht angegeben', vehicle: null }),
      'Anliegen nicht angegeben',
    )
  })

  it('marks checklist slots present or missing without changing status', () => {
    const checklist = buildKfzMissingInformationChecklist({
      phone: null,
      email: 'anna@example.com',
      preferredChannel: 'phone',
      reason: 'Preischeck Kfz-Versicherung',
      vehicle: null,
      location: '49525 Lengerich',
    })

    assert.equal(checklist.find((item) => item.id === 'contact')?.present, true)
    assert.equal(
      checklist.find((item) => item.id === 'preferred_channel_contact')?.present,
      false,
    )
    assert.equal(checklist.find((item) => item.id === 'request')?.present, true)
    assert.equal(checklist.find((item) => item.id === 'vehicle')?.present, false)
    assert.equal(checklist.find((item) => item.id === 'location')?.present, true)
    assert.equal(labelKfzMissingCount(2), '2 Angaben fehlen')
    assert.equal(labelKfzMissingCount(0), 'Angaben vollständig')
  })

  it('presents submitted facts, missing checklist and no status mutation', () => {
    const item = kfzInboxItem({
      reason: 'Preischeck Kfz-Versicherung',
      preferredChannel: 'phone',
      phone: null,
      email: 'max@example.com',
      location: { postalCode: '49525', city: 'Lengerich' },
      vehicle: { make: null, model: null, year: null },
    })

    const processedBefore = item.processed_at
    const review = presentKfzWebsiteInboxItem(item)

    assert.ok(review)
    assert.equal(item.processed_at, processedBefore)
    assert.equal(review.phase, 'needs_review')
    assert.equal(review.missingCount, 2)
    assert.deepEqual(review.missingInformation, [
      'Telefonnummer für den bevorzugten Kanal',
      'Fahrzeugdaten (Marke/Modell/Jahr — falls relevant)',
    ])
    assert.ok(review.submittedFacts.some((fact) => fact.value === 'max@example.com'))
    assert.ok(!review.submittedFacts.some((fact) => fact.id === 'vehicle'))
    assert.match(review.factualSummary, /Preischeck Kfz-Versicherung/)
    assert.doesNotMatch(review.factualSummary, /Fahrzeug:/)
    assert.equal(KFZ_REVIEW_FACT_LABEL, 'Bestand aus dem Eingang')
    assert.match(KFZ_REVIEW_AI_SEPARATE_LABEL, /getrennter Vorschlag/)
  })

  it('keeps the optional AI suggestion separate from the factual checklist', async () => {
    const item = kfzInboxItem({
      reason: 'Wechsel Kfz-Versicherung',
      preferredChannel: 'phone',
      phone: '+491701234567',
      email: null,
      location: { postalCode: '49525', city: 'Lengerich' },
      vehicle: { make: 'VW', model: 'Golf', year: '2019' },
    })
    const review = presentKfzWebsiteInboxItem(item)
    const ai = await getInboxAiProposal(item as InboxItem)

    assert.ok(review)
    assert.equal(review.missingCount, 0)
    assert.doesNotMatch(review.factualSummary, /KI-Vorschlag|Einordnung ist ein interner/)
    assert.equal(ai.proposal.status, 'proposal')
    if (ai.proposal.status !== 'proposal') {
      return
    }
    assert.match(ai.proposal.suggestion.summary, /Vorschlag|Einordnung/)
    assert.equal(ai.proposal.suggestion.suggestedCaseAction, 'none')
  })

  it('review presentation module does not import status or outbound writers', () => {
    const presentationFile = path.join(
      srcRoot,
      'features/inbox/lib/present-kfz-website-inbox.ts',
    )
    const reviewSectionFile = path.join(
      srcRoot,
      'features/inbox/components/inbox-kfz-review-section.tsx',
    )
    const source = [
      fs.readFileSync(presentationFile, 'utf8'),
      fs.readFileSync(reviewSectionFile, 'utf8'),
    ].join('\n')

    for (const fragment of FORBIDDEN_IMPORT_FRAGMENTS) {
      assert.doesNotMatch(
        source,
        new RegExp(fragment),
        `review presentation must not import ${fragment}`,
      )
    }
  })
})
