/**
 * Regression: landing form → HTTP handler → normalized intake → inbox presentation.
 * Operator facts stay separate from the advisory AI proposal.
 */
import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import { AI_PROPOSAL_BADGE_LABEL } from '@/features/ai-inbound/lib/format-proposal-labels'
import { getInboxAiProposal } from '@/features/ai-inbound/services/get-inbox-ai-proposal'
import { getInboxListTitle } from '@/features/inbox/lib/format-inbox-content'
import { getInboxItemSourceLabel } from '@/features/inbox/lib/inbox-source'
import {
  KFZ_REVIEW_NO_AUTO_ACTION,
  KFZ_WEBSITE_SOURCE_LABEL,
  presentKfzWebsiteInboxItem,
} from '@/features/inbox/lib/present-kfz-website-inbox'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import {
  buildKfzLandingPayload,
  type KfzLandingFormValues,
} from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import { KFZ_LANDING_CONSENT_VERSION } from '@/features/inbound/kfz/lib/kfz-landing-constants'
import { resetRateLimitBucketsForTests } from '@/features/inbound/kfz/lib/rate-limit-seam'
import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'
import type { Json } from '@/lib/supabase/types'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const SECRET = 'test-kfz-inbox-presentation-secret'

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

describe('kfz landing → HTTP → inbox presentation', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('presents source, customer, request, missing facts and next manual action', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-inbox-review-ok')
      const review = presentKfzWebsiteInboxItem(item)

      assert.ok(review)
      assert.equal(review.sourceLabel, KFZ_WEBSITE_SOURCE_LABEL)
      assert.equal(review.acquisitionSource, 'kfz.artkus.de')
      assert.equal(review.customerName, 'Max Mustermann')
      assert.equal(review.location, '49525 Lengerich')
      assert.equal(review.phone, '+491701234567')
      assert.equal(review.email, null)
      assert.equal(review.preferredChannelLabel, 'Telefon')
      assert.equal(review.request, 'Wechsel Kfz-Versicherung')
      assert.equal(review.vehicle, 'VW Golf 2019')
      assert.deepEqual(review.missingInformation, [])
      assert.equal(
        review.urgencyNote,
        'Kein Unfall- oder Schadenhinweis in den Angaben.',
      )
      assert.match(review.nextManualAction, /telefonisch kontaktieren/)
      assert.match(review.nextManualAction, new RegExp(KFZ_REVIEW_NO_AUTO_ACTION))

      assert.equal(getInboxItemSourceLabel(item), KFZ_WEBSITE_SOURCE_LABEL)
      assert.equal(getInboxListTitle(item), 'Kfz-Anfrage · Max Mustermann')
      assert.equal(item.channel, 'website')
      assert.equal(item.source, 'website')
    })
  })

  it('surfaces missing vehicle data and preferred-channel contact gaps', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(
        baseValues({
          phone: '',
          email: 'max@example.com',
          preferredChannel: 'phone',
          vehicleMake: '',
          vehicleModel: '',
          vehicleYear: '',
          inquiryReason: 'Preischeck Kfz-Versicherung',
        }),
        'lp-inbox-review-missing',
      )
      const review = presentKfzWebsiteInboxItem(item)

      assert.ok(review)
      assert.equal(review.customerName, 'Max Mustermann')
      assert.equal(review.email, 'max@example.com')
      assert.equal(review.phone, null)
      assert.equal(review.vehicle, null)
      assert.ok(
        review.missingInformation.includes('Telefonnummer für den bevorzugten Kanal'),
      )
      assert.ok(
        review.missingInformation.includes(
          'Fahrzeugdaten (Marke/Modell/Jahr — falls relevant)',
        ),
      )
      assert.match(review.nextManualAction, /per E-Mail kontaktieren/)
      assert.match(review.nextManualAction, new RegExp(KFZ_REVIEW_NO_AUTO_ACTION))
    })
  })

  it('marks accident wording as a manual urgency hint without inventing facts', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(
        baseValues({
          inquiryReason: 'Unfall gestern, bitte um Rückruf',
        }),
        'lp-inbox-review-urgent',
      )
      const review = presentKfzWebsiteInboxItem(item)

      assert.ok(review)
      assert.equal(review.request, 'Unfall gestern, bitte um Rückruf')
      assert.match(review.urgencyNote, /Unfall|Schaden|Eilhinweis/)
      assert.match(review.urgencyNote, /manuell prüfen/)
    })
  })

  it('keeps AI output as a human-review suggestion on the same inbox item', async () => {
    await withKfzEnv(async () => {
      const item = await submitLandingToInbox(baseValues(), 'lp-inbox-review-ai')
      const review = presentKfzWebsiteInboxItem(item)
      const ai = await getInboxAiProposal(item)

      assert.ok(review)
      assert.equal(ai.proposal.status, 'proposal')
      if (ai.proposal.status !== 'proposal') {
        return
      }

      assert.equal(AI_PROPOSAL_BADGE_LABEL, 'KI-Vorschlag · Entwurf')
      assert.equal(ai.proposal.suggestion.suggestedCaseAction, 'none')
      assert.match(
        ai.proposal.suggestion.suggestedTask?.reason ?? '',
        /Vorschlag|kein automatischer/i,
      )
      assert.doesNotMatch(review.nextManualAction, /KI-Vorschlag/)
    })
  })

  it('does not present a Kfz review for email inbox items', () => {
    const emailItem = {
      channel: 'email',
      source: 'email',
      inbound_metadata: {} as Json,
      title: 'Betreff',
      content: 'Eine E-Mail',
      sender: { displayName: 'Post', address: 'a@b.de', addressKind: 'email' },
    } as Pick<
      InboxItem,
      'channel' | 'source' | 'inbound_metadata' | 'title' | 'content' | 'sender'
    >

    assert.equal(presentKfzWebsiteInboxItem(emailItem), null)
    assert.equal(getInboxItemSourceLabel(emailItem), 'E-Mail')
    assert.equal(getInboxListTitle(emailItem), 'Betreff')
  })
})
