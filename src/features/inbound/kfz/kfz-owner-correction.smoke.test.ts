/**
 * Owner corrections:
 * 2026-09-23 — Schritt 1 is the four customer intents, Wechsel preselected.
 *   Unterlagen hochladen / Keine Unterlagen are Schritt 2 only.
 * 2026-09-20 — Schritt 1 is scenario selection, not upload-first.
 * 2026-09-18 — no public Messung UI; document routing and inquiry-processing consent stay.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import {
  buildKfzLandingPayload,
  type KfzLandingFormValues,
} from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import { emptyKfzLandingDraftValues } from '@/features/inbound/kfz/lib/kfz-landing-draft'
import {
  canUseKfzDocumentLedShortPath,
  KFZ_LANDING_DOCUMENT_GROUPS,
} from '@/features/inbound/kfz/lib/kfz-landing-documents'
import {
  canAdvanceKfzLandingScreen,
  isKfzLandingSubmitScreen,
  KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL,
} from '@/features/inbound/kfz/lib/kfz-landing-steps'
import {
  buildKfzLandingScreens,
  applyKfzLandingBranchSelection,
  isUploadDocumentsBranch,
  KFZ_DOCUMENT_FALLBACK_QUESTION_BRANCH_ID,
  KFZ_LANDING_BRANCHES,
  KFZ_LANDING_DOCUMENT_CHOICES,
  listKfzLandingStep1Branches,
  listVisibleKfzQuestions,
  nextKfzLandingScreenId,
  resolveInitialKfzLandingScreenId,
} from '@/features/inbound/kfz/lib/kfz-questionnaire'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

function readSrc(relativeFromSrc: string): string {
  return fs.readFileSync(path.join(srcRoot, relativeFromSrc), 'utf8')
}

function uploadValues(
  overrides: Partial<KfzLandingFormValues> = {},
): KfzLandingFormValues {
  return {
    fullName: 'Max Mustermann',
    postalCode: '49525',
    city: 'Lengerich',
    phone: '+491701234567',
    email: '',
    preferredChannel: KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL,
    inquiryReason: 'Unterlagen hochladen',
    inquiryProcessingConsent: true,
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    contextNotes: '',
    branchId: 'upload_documents',
    questionnaireAnswers: {},
    ...overrides,
  }
}

describe('kfz owner correction: no public Messung UI', () => {
  it('does not mount measurement-consent copy on the public /kfz journey', () => {
    const publicJourney = [
      'app/kfz/page.tsx',
      'features/inbound/kfz/components/kfz-landing-with-analytics.tsx',
      'features/inbound/kfz/components/kfz-landing-form.tsx',
      'features/inbound/kfz/components/kfz-landing-shell.tsx',
      'features/inbound/kfz/components/kfz-landing-document-fields.tsx',
      'features/inbound/kfz/components/kfz-landing-analytics-root.tsx',
    ]
      .map(readSrc)
      .join('\n')

    assert.doesNotMatch(publicJourney, /Nutzung dieser Seite messen\?/)
    assert.doesNotMatch(publicJourney, /Messung erlauben/)
    assert.doesNotMatch(publicJourney, /Messung beenden/)
    assert.doesNotMatch(publicJourney, /Nutzungsmessung/)
    assert.doesNotMatch(publicJourney, /KfzAnalyticsConsentBanner/)
    assert.match(
      readSrc('features/inbound/kfz/components/kfz-landing-with-analytics.tsx'),
      /getNoopKfzLandingAnalytics/,
    )
  })
})

describe('kfz owner correction: intent first, documents second', () => {
  it('preselects Wechsel and keeps document choices off Schritt 1', () => {
    const empty = emptyKfzLandingDraftValues()
    assert.equal(empty.branchId, 'switch_car')
    assert.equal(empty.inquiryReason, 'Bestehendes Auto wechseln')
    assert.equal(empty.documentChoice, '')
    assert.equal(isUploadDocumentsBranch(empty.branchId), false)
    assert.equal(empty.inquiryProcessingConsent, false)

    const screens = buildKfzLandingScreens(empty.branchId, {}, null, '')
    assert.deepEqual(
      screens.map((screen) => screen.id),
      ['branch', 'documents-choice'],
    )
    assert.equal(resolveInitialKfzLandingScreenId(screens, null), 'branch')
    assert.equal(screens[0]?.kind, 'branch')
    assert.equal(screens[1]?.kind, 'documentChoice')
    assert.equal(screens.some((screen) => screen.kind === 'documents'), false)
    assert.equal(canAdvanceKfzLandingScreen(screens[0]!, empty).ok, true)
    const blockedDocuments = canAdvanceKfzLandingScreen(screens[1]!, empty)
    assert.equal(blockedDocuments.ok, false)
    if (!blockedDocuments.ok) {
      assert.equal(blockedDocuments.code, 'missing_request_type')
    }

    const step1 = listKfzLandingStep1Branches()
    assert.deepEqual(
      step1.map((branch) => branch.label),
      [
        'Bestehendes Auto wechseln',
        'Erstes Auto versichern',
        'Weiteres Auto versichern',
        'eVB für Zulassung',
      ],
    )
    assert.equal(step1[0]?.id, 'switch_car')
    assert.equal(step1[0]?.highlighted, true)
    assert.deepEqual(
      step1.filter((branch) => branch.highlighted).map((branch) => branch.id),
      ['switch_car'],
    )
    assert.deepEqual(
      KFZ_LANDING_DOCUMENT_CHOICES.map((choice) => choice.label),
      ['Unterlagen hochladen', 'Keine Unterlagen vorhanden'],
    )
    assert.equal(step1.length, 4)

    const form = readSrc('features/inbound/kfz/components/kfz-landing-form.tsx')
    assert.match(form, /listKfzLandingStep1Branches\(\)\.map\(\(branch\) => \{/)
    assert.match(form, /data-kfz-branch-option=\{branch\.id\}/)
    assert.match(form, /data-kfz-document-choice=\{choice\.id\}/)
    assert.match(form, /\{branch\.label\}/)
    assert.match(form, /Am häufigsten/)
    assert.doesNotMatch(form, /Keine Unterlagen senden\?/)
    assert.doesNotMatch(form, /Unterlagen hochladen bleibt der kurze Weg/)
    assert.equal(
      KFZ_LANDING_BRANCHES.find((branch) => branch.highlighted)?.id,
      'switch_car',
    )
  })

  it('keeps the chosen scenario when continuing into upload or manual paths', () => {
    const empty = emptyKfzLandingDraftValues()
    const switched = applyKfzLandingBranchSelection(empty, 'switch_car')
    assert.equal(switched.branchId, 'switch_car')
    assert.equal(switched.inquiryReason, 'Bestehendes Auto wechseln')

    const uploaded = applyKfzLandingBranchSelection(
      { ...uploadValues(), branchId: '', inquiryReason: '' },
      'upload_documents',
    )
    assert.equal(uploaded.branchId, 'upload_documents')
    assert.equal(uploaded.inquiryReason, 'Unterlagen hochladen')
    const uploadScreens = buildKfzLandingScreens(uploaded.branchId, {}, [
      { group: 'fahrzeugschein' },
    ])
    assert.equal(nextKfzLandingScreenId(uploadScreens, 'branch'), 'documents')
    const built = buildKfzLandingPayload({
      values: uploaded,
      submissionId: 'owner-correction-scenario-upload',
      consentTimestamp: '2026-09-20T08:00:00.000Z',
      documents: [
        {
          id: 'schein-1',
          group: 'fahrzeugschein',
          filename: 'schein.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1200,
        },
      ],
    })
    assert.equal(built.ok, true)
    if (built.ok) {
      assert.equal(built.payload.inquiryReason, 'Unterlagen hochladen')
      assert.equal(built.payload.questionnaire?.branchId, 'upload_documents')
    }

    const manualScreens = buildKfzLandingScreens('switch_car', {}, null, 'manual')
    assert.equal(nextKfzLandingScreenId(manualScreens, 'branch'), 'documents-choice')
    assert.equal(nextKfzLandingScreenId(manualScreens, 'documents-choice'), 'registration')
    assert.equal(manualScreens.some((screen) => screen.id === 'intent'), false)
    assert.ok(manualScreens.some((screen) => screen.kind === 'questions'))

    const uploadChoice = buildKfzLandingScreens('switch_car', {}, null, 'upload')
    assert.equal(nextKfzLandingScreenId(uploadChoice, 'documents-choice'), 'documents')
    assert.notEqual(nextKfzLandingScreenId(uploadChoice, 'documents'), 'contact')
    const scheinRoute = buildKfzLandingScreens(
      'switch_car',
      {},
      [{ group: 'fahrzeugschein' }],
      'upload',
    )
    assert.deepEqual(
      scheinRoute.map((screen) => screen.id),
      ['branch', 'documents-choice', 'documents', 'contact'],
    )
    const invoiceRoute = buildKfzLandingScreens(
      'switch_car',
      {},
      [{ group: 'vorversicherung' }],
      'upload',
    )
    assert.equal(nextKfzLandingScreenId(invoiceRoute, 'documents'), 'registration')
    assert.notEqual(nextKfzLandingScreenId(invoiceRoute, 'documents'), 'contact')

    const shortBuilt = buildKfzLandingPayload({
      values: {
        ...empty,
        fullName: 'QA TEST',
        phone: '+491701234567',
        inquiryProcessingConsent: true,
        documentChoice: 'upload',
      },
      submissionId: 'owner-correction-intent-upload',
      consentTimestamp: '2026-09-23T12:00:00.000Z',
      documents: [
        {
          id: 'schein-2',
          group: 'fahrzeugschein',
          filename: 'QA-TEST.png',
          mimeType: 'image/png',
          sizeBytes: 70,
        },
      ],
    })
    assert.equal(shortBuilt.ok, true)
    if (shortBuilt.ok) {
      assert.equal(shortBuilt.payload.inquiryReason, 'Bestehendes Auto wechseln')
      assert.equal(shortBuilt.payload.questionnaire?.branchId, 'switch_car')
      assert.equal(shortBuilt.payload.questionnaire?.path, 'upload')
      assert.deepEqual(shortBuilt.payload.questionnaire?.answers, [])
    }
  })

  it('keeps Fahrzeugschein and Beitragsrechnung as optional existing uploads', () => {
    assert.deepEqual(
      KFZ_LANDING_DOCUMENT_GROUPS.map((group) => group.id),
      ['fahrzeugschein', 'vorversicherung'],
    )
    const fields = readSrc('features/inbound/kfz/components/kfz-landing-document-fields.tsx')
    const groups = readSrc('features/inbound/kfz/lib/kfz-landing-documents.ts')
    assert.match(groups, /Fahrzeugschein/)
    assert.match(groups, /Vorversicherung \/ letzte Beitragsrechnung/)
    assert.match(fields, /Foto aufnehmen/)
    assert.match(fields, /Foto oder Datei wählen/)
    assert.match(fields, /ohne Upload absenden/)

    const form = readSrc('features/inbound/kfz/components/kfz-landing-form.tsx')
    assert.match(form, /KfzLandingDocumentFields/)
    assert.match(form, /data-kfz-manual-fallback/)
    assert.match(form, /Keine Unterlagen senden — Angaben selbst machen/)
  })

  it('does not require HSN/TSN/Marke/Modell on the upload path', () => {
    const visible = listVisibleKfzQuestions('upload_documents', {})
    assert.deepEqual(visible.map((question) => question.id), [])
    for (const id of ['hsn', 'tsn', 'vehicle_make', 'vehicle_model']) {
      assert.equal(
        visible.some((question) => question.id === id),
        false,
        id,
      )
    }

    const schein = [{ group: 'fahrzeugschein' as const }]
    const screens = buildKfzLandingScreens('upload_documents', {}, schein)
    const documents = screens.find((screen) => screen.kind === 'documents')
    const contact = screens.find((screen) => screen.kind === 'contact')
    assert.ok(documents)
    assert.ok(contact)
    assert.equal(
      canAdvanceKfzLandingScreen(documents, { ...uploadValues(), documents: schein }).ok,
      true,
    )
    assert.equal(isKfzLandingSubmitScreen(documents, screens, 'upload_documents'), false)
    assert.equal(isKfzLandingSubmitScreen(contact, screens, 'upload_documents'), true)

    const blocked = canAdvanceKfzLandingScreen(
      contact,
      { ...uploadValues({ inquiryProcessingConsent: false }), documents: schein },
    )
    assert.equal(blocked.ok, false)
    if (!blocked.ok) {
      assert.equal(blocked.code, 'invalid_consent')
    }
  })

  it('routes the four document combinations and never sends invoice-only to contact', () => {
    const none: Array<{ group: 'fahrzeugschein' | 'vorversicherung' }> = []
    const scheinOnly = [{ group: 'fahrzeugschein' as const }]
    const invoiceOnly = [{ group: 'vorversicherung' as const }]
    const both = [
      { group: 'fahrzeugschein' as const },
      { group: 'vorversicherung' as const },
    ]

    assert.equal(canUseKfzDocumentLedShortPath(none), false)
    assert.equal(canUseKfzDocumentLedShortPath(scheinOnly), true)
    assert.equal(canUseKfzDocumentLedShortPath(invoiceOnly), false)
    assert.equal(canUseKfzDocumentLedShortPath(both), true)

    const noDocs = buildKfzLandingScreens('upload_documents', {}, none)
    const schein = buildKfzLandingScreens('upload_documents', {}, scheinOnly)
    const invoice = buildKfzLandingScreens('upload_documents', {}, invoiceOnly)
    const bothDocs = buildKfzLandingScreens('upload_documents', {}, both)

    assert.equal(nextKfzLandingScreenId(noDocs, 'documents'), 'intent')
    assert.ok(noDocs.some((screen) => screen.id === 'vehicle'))
    assert.notEqual(nextKfzLandingScreenId(noDocs, 'documents'), 'contact')

    assert.deepEqual(
      schein.map((screen) => screen.id),
      ['branch', 'documents', 'contact'],
    )
    assert.equal(nextKfzLandingScreenId(schein, 'documents'), 'contact')
    assert.equal(schein.some((screen) => screen.kind === 'questions'), false)

    assert.equal(nextKfzLandingScreenId(invoice, 'documents'), 'intent')
    assert.ok(invoice.some((screen) => screen.id === 'vehicle'))
    assert.ok(invoice.some((screen) => screen.kind === 'questions'))
    assert.notEqual(nextKfzLandingScreenId(invoice, 'documents'), 'contact')
    assert.equal(
      invoice.find((screen) => screen.kind === 'questions')?.id,
      'intent',
    )
    assert.equal(invoice.at(-1)?.id, 'contact')

    assert.deepEqual(
      bothDocs.map((screen) => screen.id),
      ['branch', 'documents', 'contact'],
    )
    assert.equal(nextKfzLandingScreenId(bothDocs, 'documents'), 'contact')

    const invoiceAdvance = canAdvanceKfzLandingScreen(
      invoice.find((screen) => screen.kind === 'documents')!,
      { ...uploadValues(), documents: invoiceOnly },
    )
    assert.equal(invoiceAdvance.ok, true)
    assert.notEqual(nextKfzLandingScreenId(invoice, 'documents'), 'contact')

    const form = readSrc('features/inbound/kfz/components/kfz-landing-form.tsx')
    assert.match(form, /buildKfzLandingScreens\(branchId, answers, documents, documentChoice\)/)
    assert.match(form, /data-kfz-document-route/)
    assert.equal(KFZ_DOCUMENT_FALLBACK_QUESTION_BRANCH_ID, 'no_documents')
  })

  it('keeps HSN/TSN only on the manual questionnaire fallback', () => {
    const switchVisible = listVisibleKfzQuestions('switch_car', {
      registration_status: 'registered',
    })
    const ids = switchVisible.map((question) => question.id)
    assert.ok(ids.includes('hsn'))
    assert.ok(ids.includes('tsn'))
    assert.ok(ids.includes('vehicle_make'))
    assert.ok(ids.includes('vehicle_model'))

    assert.deepEqual(
      KFZ_LANDING_BRANCHES.filter((branch) => !branch.highlighted).map((branch) => branch.id),
      ['upload_documents', 'no_documents', 'first_car', 'additional_car', 'evb'],
    )
    assert.deepEqual(
      listKfzLandingStep1Branches().map((branch) => branch.id),
      ['switch_car', 'first_car', 'additional_car', 'evb'],
    )
    for (const branch of KFZ_LANDING_BRANCHES.filter((entry) => entry.path === 'questionnaire')) {
      const screens = buildKfzLandingScreens(branch.id, {})
      assert.equal(screens[0]?.kind, 'branch')
      assert.ok(screens.some((screen) => screen.kind === 'questions'))
      assert.equal(screens.at(-1)?.kind, 'contact')
      assert.equal(resolveInitialKfzLandingScreenId(screens, null), 'branch')
    }
  })
})
