/**
 * Mobile-first Kfz landing: steps, WhatsApp default, documents, submit, no auto-send.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, it } from 'node:test'

import { presentKfzWebsiteInboxItem } from '@/features/inbox/lib/present-kfz-website-inbox'
import {
  buildKfzLandingPayload,
  type KfzLandingFormValues,
} from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import {
  addKfzLandingDocuments,
  KFZ_LANDING_MAX_DOCUMENTS_PER_GROUP,
  KFZ_LANDING_MAX_DOCUMENT_BYTES,
  KFZ_LANDING_STORAGE_BLOCKER,
  removeKfzLandingDocument,
  toPublicKfzUploadMeta,
} from '@/features/inbound/kfz/lib/kfz-landing-documents'
import {
  KFZ_LANDING_CONFIRMATION_BODY,
  KFZ_LANDING_CONFIRMATION_TITLE,
  KFZ_LANDING_CONSENT_VERSION,
  KFZ_LANDING_SOURCE,
} from '@/features/inbound/kfz/lib/kfz-landing-constants'
import {
  canAdvanceKfzLandingStep,
  KFZ_LANDING_CHANNEL_CHOICES,
  KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL,
  KFZ_LANDING_REQUEST_TYPES,
  nextKfzLandingStep,
  previousKfzLandingStep,
  validateKfzLandingStep1,
  validateKfzLandingStep2,
} from '@/features/inbound/kfz/lib/kfz-landing-steps'
import { resetRateLimitBucketsForTests } from '@/features/inbound/kfz/lib/rate-limit-seam'
import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const SECRET = 'test-kfz-landing-flow-secret'
const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

const FORBIDDEN_COMMUNICATION = [
  'send-whatsapp',
  'whatsapp-outbound',
  'features/whatsapp/',
  'features/email/',
  'resend',
  'convert-inbox-to-task',
  'convert-inbox-to-case',
] as const

function baseValues(
  overrides: Partial<KfzLandingFormValues> = {},
): KfzLandingFormValues {
  return {
    fullName: 'Max Mustermann',
    postalCode: '49525',
    city: 'Lengerich',
    phone: '+491701234567',
    email: '',
    preferredChannel: KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL,
    inquiryReason: 'Versicherung wechseln',
    inquiryProcessingConsent: true,
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
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

describe('kfz landing step navigation', () => {
  it('advances 1 → 2 → 3 and back, and blocks an empty first step', () => {
    assert.equal(nextKfzLandingStep(1), 2)
    assert.equal(nextKfzLandingStep(2), 3)
    assert.equal(nextKfzLandingStep(3), null)
    assert.equal(previousKfzLandingStep(3), 2)
    assert.equal(previousKfzLandingStep(2), 1)
    assert.equal(previousKfzLandingStep(1), null)

    assert.equal(validateKfzLandingStep1({ inquiryReason: '' }).ok, false)
    assert.equal(
      validateKfzLandingStep1({ inquiryReason: 'Versicherung wechseln' }).ok,
      true,
    )
    assert.deepEqual(
      KFZ_LANDING_REQUEST_TYPES.map((entry) => entry.label),
      [
        'Versicherung wechseln',
        'Neues Fahrzeug',
        'Zweitwagen',
        'Bestehendes Angebot prüfen',
      ],
    )

    const blocked = canAdvanceKfzLandingStep(1, baseValues({ inquiryReason: '' }))
    assert.equal(blocked.ok, false)
    const open = canAdvanceKfzLandingStep(1, baseValues())
    assert.equal(open.ok, true)
  })
})

describe('kfz landing WhatsApp default and alternatives', () => {
  it('defaults to WhatsApp and lists WhatsApp, Telefon, E-Mail in that order', () => {
    assert.equal(KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL, 'whatsapp')
    assert.deepEqual(
      KFZ_LANDING_CHANNEL_CHOICES.map((choice) => choice.value),
      ['whatsapp', 'phone', 'email'],
    )

    const formSource = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/components/kfz-landing-form.tsx'),
      'utf8',
    )
    assert.match(formSource, /preferredChannel: KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL/)
    assert.doesNotMatch(
      formSource,
      /preferredChannel: 'phone'/,
    )
  })

  it('requires a usable phone for WhatsApp and keeps Telefon/E-Mail as alternatives', () => {
    const missingPhone = validateKfzLandingStep2(
      baseValues({ preferredChannel: 'whatsapp', phone: '', email: 'max@example.com' }),
    )
    assert.equal(missingPhone.ok, false)
    if (missingPhone.ok) {
      return
    }
    assert.equal(missingPhone.code, 'whatsapp_requires_phone')

    const shortPhone = validateKfzLandingStep2(
      baseValues({ preferredChannel: 'whatsapp', phone: '123' }),
    )
    assert.equal(shortPhone.ok, false)

    const whatsappOk = validateKfzLandingStep2(baseValues())
    assert.equal(whatsappOk.ok, true)

    const emailAlternative = validateKfzLandingStep2(
      baseValues({
        preferredChannel: 'email',
        phone: '',
        email: 'max@example.com',
      }),
    )
    assert.equal(emailAlternative.ok, true)

    const phoneAlternative = validateKfzLandingStep2(
      baseValues({
        preferredChannel: 'phone',
        phone: '+491701234567',
        email: '',
      }),
    )
    assert.equal(phoneAlternative.ok, true)

    const mappedWhatsApp = buildKfzLandingPayload({
      values: baseValues({ phone: '', email: 'max@example.com' }),
      submissionId: 'lp-wa-missing-phone',
      consentTimestamp: '2026-09-08T12:00:00.000Z',
    })
    assert.equal(mappedWhatsApp.ok, false)
    if (mappedWhatsApp.ok) {
      return
    }
    assert.equal(mappedWhatsApp.code, 'whatsapp_requires_phone')

    const mappedEmail = buildKfzLandingPayload({
      values: baseValues({
        preferredChannel: 'email',
        phone: '',
        email: 'max@example.com',
      }),
      submissionId: 'lp-email-alt',
      consentTimestamp: '2026-09-08T12:00:00.000Z',
    })
    assert.equal(mappedEmail.ok, true)
    if (!mappedEmail.ok) {
      return
    }
    assert.equal(mappedEmail.payload.preferredChannel, 'email')
    assert.equal(mappedEmail.payload.phone, null)
    assert.equal(mappedEmail.payload.email, 'max@example.com')
  })
})

describe('kfz landing document selection', () => {
  it('adds, rejects, removes and re-adds files without inventing storage bytes', () => {
    const first = addKfzLandingDocuments([], [
      {
        group: 'fahrzeugschein',
        filename: 'schein.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 120_000,
        id: 'doc-1',
      },
      {
        group: 'vorversicherung',
        filename: 'beitrag.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 40_000,
        id: 'doc-2',
      },
    ])
    assert.equal(first.rejected.length, 0)
    assert.equal(first.documents.length, 2)

    const rejectedType = addKfzLandingDocuments(first.documents, [
      {
        group: 'fahrzeugschein',
        filename: 'notes.exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 1000,
      },
    ])
    assert.equal(rejectedType.documents.length, 2)
    assert.equal(rejectedType.rejected[0]?.code, 'invalid_type')

    const rejectedSize = addKfzLandingDocuments(first.documents, [
      {
        group: 'fahrzeugschein',
        filename: 'huge.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: KFZ_LANDING_MAX_DOCUMENT_BYTES + 1,
      },
    ])
    assert.equal(rejectedSize.rejected[0]?.code, 'oversized')

    const groupOverflow = addKfzLandingDocuments(
      first.documents,
      Array.from({ length: KFZ_LANDING_MAX_DOCUMENTS_PER_GROUP }, (_, index) => ({
        group: 'fahrzeugschein' as const,
        filename: `extra-${index}.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 1000,
      })),
    )
    assert.ok(groupOverflow.rejected.some((entry) => entry.code === 'group_limit'))

    const afterRemove = removeKfzLandingDocument(first.documents, 'doc-1')
    assert.equal(afterRemove.length, 1)
    assert.equal(afterRemove[0]?.filename, 'beitrag.pdf')

    const readded = addKfzLandingDocuments(afterRemove, [
      {
        group: 'fahrzeugschein',
        filename: 'schein-neu.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 80_000,
        id: 'doc-3',
      },
    ])
    assert.equal(readded.documents.length, 2)
    assert.deepEqual(toPublicKfzUploadMeta(readded.documents), [
      {
        filename: 'beitrag.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 40_000,
        group: 'vorversicherung',
      },
      {
        filename: 'schein-neu.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 80_000,
        group: 'fahrzeugschein',
      },
    ])
    assert.match(KFZ_LANDING_STORAGE_BLOCKER, /keine Datei-Bytes|nicht hochgeladen/i)
  })
})

describe('kfz landing submit normalization', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('maps the three-step landing onto the existing website inbox item', async () => {
    await withKfzEnv(async () => {
      const documents = addKfzLandingDocuments([], [
        {
          group: 'fahrzeugschein',
          filename: 'schein.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 12_000,
          id: 'up-1',
        },
        {
          group: 'vorversicherung',
          filename: 'rechnung.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 8_000,
          id: 'up-2',
        },
      ]).documents

      const built = buildKfzLandingPayload({
        values: baseValues(),
        submissionId: 'lp-flow-submit-ok',
        consentTimestamp: '2026-09-08T12:00:00.000Z',
        documents,
      })
      assert.equal(built.ok, true)
      if (!built.ok) {
        return
      }

      assert.equal(built.payload.inquiryReason, 'Versicherung wechseln')
      assert.equal(built.payload.preferredChannel, 'whatsapp')
      assert.equal(built.payload.phone, '+491701234567')
      assert.equal(built.payload.source, KFZ_LANDING_SOURCE)
      assert.equal(built.payload.consentVersion, KFZ_LANDING_CONSENT_VERSION)
      assert.equal(built.payload.inquiryProcessingConsent, true)
      assert.deepEqual(built.payload.uploads, [
        {
          filename: 'schein.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 12_000,
          group: 'fahrzeugschein',
        },
        {
          filename: 'rechnung.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 8_000,
          group: 'vorversicherung',
        },
      ])
      assert.equal(JSON.stringify(built.payload).includes('data:'), false)
      assert.equal(JSON.stringify(built.payload).includes('base64'), false)

      const store = createMemoryInboundIntakeStore()
      const result = await handleKfzInboundHttpRequest(
        new Request('http://localhost/api/inbound/kfz', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SECRET}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(built.payload),
        }),
        { store },
      )

      assert.equal(result.ok, true)
      if (!result.ok) {
        return
      }
      assert.equal(store.items.length, 1)
      assert.equal(store.items[0].channel, 'website')
      assert.equal(store.items[0].source, 'website')
      assert.equal(store.items[0].attachments, undefined)
      assert.equal(store.items[0].processed_at, null)

      const review = presentKfzWebsiteInboxItem(store.items[0])
      assert.ok(review)
      assert.equal(review.request, 'Versicherung wechseln')
      assert.equal(review.preferredChannel, 'whatsapp')
      assert.equal(review.preferredChannelLabel, 'WhatsApp')
      assert.equal(review.documents.length, 2)
      assert.equal(review.documents[0]?.group, 'fahrzeugschein')
      assert.ok(review.submittedFacts.some((fact) => fact.id === 'documents'))
      assert.match(review.nextManualAction, /keine automatische/)
      assert.equal(review.phase, 'needs_review')
    })
  })
})

describe('kfz landing zero automatic communication', () => {
  it('keeps landing modules free of outbound or status writers', () => {
    const files = [
      'features/inbound/kfz/components/kfz-landing-form.tsx',
      'features/inbound/kfz/components/kfz-landing-document-fields.tsx',
      'features/inbound/kfz/lib/kfz-landing-steps.ts',
      'features/inbound/kfz/lib/kfz-landing-documents.ts',
      'features/inbound/kfz/lib/build-kfz-landing-payload.ts',
      'features/inbound/kfz/actions/submit-kfz-landing-inquiry.ts',
    ]
    const source = files
      .map((relative) => fs.readFileSync(path.join(srcRoot, relative), 'utf8'))
      .join('\n')

    for (const fragment of FORBIDDEN_COMMUNICATION) {
      assert.doesNotMatch(
        source,
        new RegExp(fragment),
        `landing must not import ${fragment}`,
      )
    }

    assert.match(
      fs.readFileSync(
        path.join(srcRoot, 'features/inbound/kfz/components/kfz-landing-form.tsx'),
        'utf8',
      ),
      new RegExp(KFZ_LANDING_CONFIRMATION_TITLE.replace('.', '\\.')),
    )
    assert.match(
      fs.readFileSync(
        path.join(srcRoot, 'features/inbound/kfz/components/kfz-landing-form.tsx'),
        'utf8',
      ),
      new RegExp(KFZ_LANDING_CONFIRMATION_BODY.replace('.', '\\.')),
    )
  })
})
