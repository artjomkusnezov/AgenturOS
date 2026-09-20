/**
 * Owner corrections:
 * 2026-09-20 — Schritt 1 is the existing six-scenario selection, not upload-first.
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

describe('kfz owner correction: six-scenario first step', () => {
  it('starts a fresh landing on the six scenario cards with no silent choice', () => {
    const empty = emptyKfzLandingDraftValues()
    assert.equal(empty.branchId, '')
    assert.equal(empty.inquiryReason, '')
    assert.equal(isUploadDocumentsBranch(empty.branchId), false)
    assert.equal(empty.inquiryProcessingConsent, false)

    const screens = buildKfzLandingScreens(empty.branchId, {})
    assert.deepEqual(
      screens.map((screen) => screen.id),
      ['branch'],
    )
    assert.equal(resolveInitialKfzLandingScreenId(screens, null), 'branch')
    assert.equal(screens[0]?.kind, 'branch')
    assert.equal(screens.some((screen) => screen.kind === 'documents'), false)

    const uploadScreens = buildKfzLandingScreens('upload_documents', {})
    assert.equal(resolveInitialKfzLandingScreenId(uploadScreens, null), 'branch')
    assert.equal(resolveInitialKfzLandingScreenId(uploadScreens, 'documents'), 'documents')
    assert.equal(resolveInitialKfzLandingScreenId(uploadScreens, 'contact'), 'contact')

    const form = readSrc('features/inbound/kfz/components/kfz-landing-form.tsx')
    assert.match(form, /KFZ_LANDING_BRANCHES\.map\(\(branch\) => \{/)
    assert.match(form, /data-kfz-branch-option=\{branch\.id\}/)
    assert.match(form, /\{branch\.label\}/)
    assert.match(form, /Am häufigsten/)
    assert.doesNotMatch(form, /Keine Unterlagen senden\?/)
    assert.deepEqual(
      KFZ_LANDING_BRANCHES.map((branch) => branch.label),
      [
        'Unterlagen hochladen',
        'Keine Unterlagen vorhanden',
        'Erstes Auto versichern',
        'Weiteres Auto versichern',
        'Bestehendes Auto wechseln',
        'eVB für Zulassung',
      ],
    )
    assert.equal(
      KFZ_LANDING_BRANCHES.find((branch) => branch.highlighted)?.id,
      'switch_car',
    )
    assert.equal(canAdvanceKfzLandingScreen(screens[0]!, empty).ok, false)
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

    const manual = applyKfzLandingBranchSelection(empty, 'no_documents')
    assert.equal(manual.branchId, 'no_documents')
    assert.equal(manual.inquiryReason, 'Keine Unterlagen vorhanden')
    const manualScreens = buildKfzLandingScreens(manual.branchId, {})
    assert.equal(nextKfzLandingScreenId(manualScreens, 'branch'), 'intent')
    assert.ok(manualScreens.some((screen) => screen.kind === 'questions'))
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
    assert.match(form, /buildKfzLandingScreens\(branchId, answers, documents\)/)
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
    for (const branch of KFZ_LANDING_BRANCHES.filter((entry) => entry.path === 'questionnaire')) {
      const screens = buildKfzLandingScreens(branch.id, {})
      assert.equal(screens[0]?.kind, 'branch')
      assert.ok(screens.some((screen) => screen.kind === 'questions'))
      assert.equal(screens.at(-1)?.kind, 'contact')
      assert.equal(resolveInitialKfzLandingScreenId(screens, null), 'branch')
    }
  })
})
