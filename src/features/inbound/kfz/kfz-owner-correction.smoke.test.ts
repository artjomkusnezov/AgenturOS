/**
 * Owner correction 2026-09-18: public /kfz is upload-first, no Messung UI.
 * Manual questionnaire remains fallback. Inquiry-processing consent stays required.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

import type { KfzLandingFormValues } from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import { emptyKfzLandingDraftValues } from '@/features/inbound/kfz/lib/kfz-landing-draft'
import { KFZ_LANDING_DOCUMENT_GROUPS } from '@/features/inbound/kfz/lib/kfz-landing-documents'
import {
  canAdvanceKfzLandingScreen,
  isKfzLandingSubmitScreen,
  KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL,
} from '@/features/inbound/kfz/lib/kfz-landing-steps'
import {
  buildKfzLandingScreens,
  isUploadDocumentsBranch,
  KFZ_DEFAULT_LANDING_BRANCH_ID,
  KFZ_LANDING_BRANCHES,
  listVisibleKfzQuestions,
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

describe('kfz owner correction: upload-first path', () => {
  it('defaults a fresh landing to the existing upload documents screen', () => {
    const empty = emptyKfzLandingDraftValues()
    assert.equal(empty.branchId, KFZ_DEFAULT_LANDING_BRANCH_ID)
    assert.equal(empty.inquiryReason, 'Unterlagen hochladen')
    assert.equal(isUploadDocumentsBranch(empty.branchId), true)
    assert.equal(empty.inquiryProcessingConsent, false)

    const screens = buildKfzLandingScreens(empty.branchId, {})
    assert.equal(resolveInitialKfzLandingScreenId(screens, null, empty.branchId), 'documents')
    assert.equal(resolveInitialKfzLandingScreenId(screens, 'contact', empty.branchId), 'contact')
    assert.equal(resolveInitialKfzLandingScreenId(screens, 'branch', empty.branchId), 'branch')
    assert.deepEqual(
      screens.map((screen) => screen.kind),
      ['branch', 'documents', 'contact'],
    )
    assert.equal(screens.some((screen) => screen.kind === 'questions'), false)
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

    const screens = buildKfzLandingScreens('upload_documents', {})
    const documents = screens.find((screen) => screen.kind === 'documents')
    const contact = screens.find((screen) => screen.kind === 'contact')
    assert.ok(documents)
    assert.ok(contact)
    assert.equal(canAdvanceKfzLandingScreen(documents, uploadValues()).ok, true)
    assert.equal(isKfzLandingSubmitScreen(documents, screens, 'upload_documents'), false)
    assert.equal(isKfzLandingSubmitScreen(contact, screens, 'upload_documents'), true)

    const blocked = canAdvanceKfzLandingScreen(
      contact,
      uploadValues({ inquiryProcessingConsent: false }),
    )
    assert.equal(blocked.ok, false)
    if (!blocked.ok) {
      assert.equal(blocked.code, 'invalid_consent')
    }
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
      ['no_documents', 'first_car', 'additional_car', 'switch_car', 'evb'],
    )
    for (const branch of KFZ_LANDING_BRANCHES.filter((entry) => entry.path === 'questionnaire')) {
      const screens = buildKfzLandingScreens(branch.id, {})
      assert.equal(screens[0]?.kind, 'branch')
      assert.ok(screens.some((screen) => screen.kind === 'questions'))
      assert.equal(screens.at(-1)?.kind, 'contact')
      assert.equal(
        resolveInitialKfzLandingScreenId(screens, null, branch.id),
        'branch',
      )
    }
  })
})
