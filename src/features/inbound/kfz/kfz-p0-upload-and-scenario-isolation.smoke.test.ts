/**
 * P0 regression: upload_documents exposes the existing upload step before
 * contact/submit, and switching entry scenarios cannot leak stale answers.
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
import {
  addKfzLandingDocuments,
  toPublicKfzUploadMeta,
} from '@/features/inbound/kfz/lib/kfz-landing-documents'
import {
  canAdvanceKfzLandingScreen,
  isKfzLandingSubmitScreen,
  KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL,
} from '@/features/inbound/kfz/lib/kfz-landing-steps'
import {
  applyKfzLandingBranchSelection,
  buildKfzLandingScreens,
  isolateKfzQuestionnaireAnswersForBranch,
  KFZ_ANSWER_UNKNOWN,
  KFZ_LANDING_BRANCHES,
  KFZ_SCENARIO_SPECIFIC_QUESTION_IDS,
  KFZ_SHARED_QUESTIONNAIRE_IDS,
  listAnsweredKfzQuestions,
  listVisibleKfzQuestions,
  nextKfzLandingScreenId,
  readQuestionnaireAnswer,
  type KfzQuestionDefinition,
  type KfzQuestionnaireAnswers,
} from '@/features/inbound/kfz/lib/kfz-questionnaire'
import { looksLikeForbiddenAnalyticsKey } from '@/features/inbound/kfz/lib/kfz-analytics-redact'

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

function defaultAnswer(question: KfzQuestionDefinition): string {
  if (question.kind === 'choice') {
    const option = (question.options ?? []).find((entry) => entry.id !== KFZ_ANSWER_UNKNOWN)
    return option?.id ?? KFZ_ANSWER_UNKNOWN
  }
  if (question.kind === 'date') {
    return '2019-03-01'
  }
  if (question.kind === 'number') {
    return '12000'
  }
  if (question.id === 'vehicle_make') {
    return 'VW'
  }
  if (question.id === 'vehicle_model') {
    return 'Golf'
  }
  if (question.id === 'previous_insurer') {
    return 'Beispielversicherung'
  }
  return 'Angabe'
}

function fillVisibleRequired(
  branchId: string,
  seed: KfzQuestionnaireAnswers = {},
): KfzQuestionnaireAnswers {
  const answers: KfzQuestionnaireAnswers = { ...seed }
  for (let round = 0; round < 10; round += 1) {
    let changed = false
    for (const question of listVisibleKfzQuestions(branchId, answers)) {
      if (!question.required || readQuestionnaireAnswer(answers, question.id)) {
        continue
      }
      answers[question.id] = defaultAnswer(question)
      changed = true
    }
    if (!changed) {
      break
    }
  }
  return answers
}

function formValues(
  branchId: (typeof KFZ_LANDING_BRANCHES)[number]['id'],
  answers: KfzQuestionnaireAnswers = {},
  overrides: Partial<KfzLandingFormValues> = {},
): KfzLandingFormValues {
  const branch = KFZ_LANDING_BRANCHES.find((entry) => entry.id === branchId)
  return {
    fullName: 'Max Mustermann',
    postalCode: '49525',
    city: 'Lengerich',
    phone: '+491701234567',
    email: '',
    preferredChannel: KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL,
    inquiryReason: branch?.label ?? '',
    inquiryProcessingConsent: true,
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    contextNotes: '',
    branchId,
    questionnaireAnswers: answers,
    ...overrides,
  }
}

function evbSeed(): KfzQuestionnaireAnswers {
  return fillVisibleRequired('evb', {
    registration_status: 'needs_registration',
    evb_purpose: 'first_registration',
    vehicle_make: 'VW',
    vehicle_model: 'Golf',
  })
}

describe('kfz P0 upload_documents path', () => {
  it('exposes the existing upload capability before contact and submit', () => {
    const screens = buildKfzLandingScreens('upload_documents', {})
    assert.deepEqual(
      screens.map((screen) => `${screen.id}:${screen.kind}`),
      ['branch:branch', 'documents:documents', 'contact:contact'],
    )
    assert.equal(nextKfzLandingScreenId(screens, 'branch'), 'documents')
    assert.equal(nextKfzLandingScreenId(screens, 'documents'), 'contact')
    assert.equal(nextKfzLandingScreenId(screens, 'contact'), null)

    const documents = screens.find((screen) => screen.kind === 'documents')
    const contact = screens.find((screen) => screen.kind === 'contact')
    assert.ok(documents)
    assert.ok(contact)
    assert.equal(isKfzLandingSubmitScreen(documents, screens, 'upload_documents'), false)
    assert.equal(isKfzLandingSubmitScreen(contact, screens, 'upload_documents'), true)

    const withoutConsent = formValues('upload_documents', {}, { inquiryProcessingConsent: false })
    assert.equal(canAdvanceKfzLandingScreen(documents, withoutConsent).ok, true)
    const blockedSubmit = canAdvanceKfzLandingScreen(contact, withoutConsent)
    assert.equal(blockedSubmit.ok, false)
    if (!blockedSubmit.ok) {
      assert.equal(blockedSubmit.code, 'invalid_consent')
    }

    const formSource = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/components/kfz-landing-form.tsx'),
      'utf8',
    )
    const documentFieldsSource = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/components/kfz-landing-document-fields.tsx'),
      'utf8',
    )
    assert.match(formSource, /KfzLandingDocumentFields/)
    assert.match(formSource, /screen\.kind === 'documents'/)
    assert.match(documentFieldsSource, /Foto oder Datei wählen/)
    assert.match(documentFieldsSource, /Foto aufnehmen/)
    assert.doesNotMatch(formSource, /getPublicUrl/)
  })

  it('preserves safe document metadata without file bytes or public links', () => {
    const added = addKfzLandingDocuments([], [
      {
        group: 'fahrzeugschein',
        filename: 'schein.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 12_000,
        id: 'doc-schein',
      },
    ])
    assert.equal(added.rejected.length, 0)
    const meta = toPublicKfzUploadMeta(added.documents)
    assert.deepEqual(meta, [
      {
        filename: 'schein.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 12_000,
        group: 'fahrzeugschein',
      },
    ])

    const built = buildKfzLandingPayload({
      values: formValues('upload_documents'),
      submissionId: 'p0-upload-meta-1',
      consentTimestamp: '2026-09-17T12:00:00.000Z',
      documents: added.documents,
    })
    assert.equal(built.ok, true)
    if (!built.ok) {
      return
    }
    assert.deepEqual(built.payload.uploads, meta)
    assert.equal(built.payload.questionnaire?.path, 'upload')
    assert.equal(built.payload.questionnaire?.answers.length, 0)
    const serialized = JSON.stringify(built.payload)
    assert.equal(serialized.includes('data:'), false)
    assert.equal(serialized.includes('base64'), false)
    assert.equal(serialized.includes('getPublicUrl'), false)
    assert.ok(!('file' in (built.payload.uploads?.[0] ?? {})))
  })
})

describe('kfz P0 scenario state isolation', () => {
  it('clears incompatible scenario answers when switching EVB to switch_car while keeping shared fields', () => {
    const evbAnswers = evbSeed()
    assert.equal(evbAnswers.evb_purpose, 'first_registration')
    assert.ok(listAnsweredKfzQuestions('evb', evbAnswers).some((row) => row.id === 'evb_purpose'))

    const switched = applyKfzLandingBranchSelection(formValues('evb', evbAnswers), 'switch_car')
    assert.equal(switched.branchId, 'switch_car')
    assert.equal(switched.inquiryReason, 'Bestehendes Auto wechseln')
    assert.equal(switched.fullName, 'Max Mustermann')
    assert.equal(switched.phone, '+491701234567')
    assert.equal(switched.questionnaireAnswers?.vehicle_make, 'VW')
    assert.equal(switched.questionnaireAnswers?.vehicle_model, 'Golf')
    assert.equal(switched.questionnaireAnswers?.evb_purpose, undefined)
    assert.ok(
      !KFZ_SCENARIO_SPECIFIC_QUESTION_IDS.some(
        (id) => switched.questionnaireAnswers?.[id],
      ),
    )

    const leaked = listAnsweredKfzQuestions('switch_car', switched.questionnaireAnswers ?? {})
    assert.equal(
      leaked.some((row) => row.id === 'evb_purpose'),
      false,
    )
    assert.ok(leaked.some((row) => row.id === 'vehicle_make' && row.value === 'VW'))

    const complete = fillVisibleRequired('switch_car', {
      ...switched.questionnaireAnswers,
      registration_status: 'registered',
    })
    assert.equal(complete.evb_purpose, undefined)
    const built = buildKfzLandingPayload({
      values: formValues('switch_car', complete, {
        vehicleMake: switched.vehicleMake,
        vehicleModel: switched.vehicleModel,
        vehicleYear: switched.vehicleYear,
      }),
      submissionId: 'p0-evb-to-switch',
      consentTimestamp: '2026-09-17T12:00:00.000Z',
    })
    assert.equal(built.ok, true, built.ok ? '' : built.error)
    if (!built.ok) {
      return
    }
    const answerIds = built.payload.questionnaire?.answers.map((row) => row.id) ?? []
    assert.equal(answerIds.includes('evb_purpose'), false)
    assert.equal(/Wofür wird die eVB/.test(built.payload.contextNotes ?? ''), false)
    assert.ok(answerIds.includes('vehicle_make'))
  })

  it('clears stale switch_car answers when restarting into EVB and when opening upload_documents', () => {
    const switchAnswers = fillVisibleRequired('switch_car', {
      previous_insurer: 'Beispielversicherung',
      has_claims: 'yes',
      claims_details: 'Parkrempler 2024',
      vehicle_make: 'VW',
    })
    const toEvb = applyKfzLandingBranchSelection(
      formValues('switch_car', switchAnswers),
      'evb',
    )
    assert.equal(toEvb.branchId, 'evb')
    assert.equal(toEvb.questionnaireAnswers?.previous_insurer, undefined)
    assert.equal(toEvb.questionnaireAnswers?.has_claims, undefined)
    assert.equal(toEvb.questionnaireAnswers?.claims_details, undefined)
    assert.equal(toEvb.questionnaireAnswers?.vehicle_make, 'VW')
    assert.equal(
      listAnsweredKfzQuestions('evb', toEvb.questionnaireAnswers ?? {}).some(
        (row) => row.id === 'previous_insurer' || row.id === 'claims_details',
      ),
      false,
    )

    const toUpload = applyKfzLandingBranchSelection(toEvb, 'upload_documents')
    assert.equal(toUpload.branchId, 'upload_documents')
    assert.equal(toUpload.inquiryReason, 'Unterlagen hochladen')
    assert.deepEqual(toUpload.questionnaireAnswers, {})
    assert.equal(listAnsweredKfzQuestions('upload_documents', {}).length, 0)

    const sameBranch = applyKfzLandingBranchSelection(
      formValues('evb', evbSeed()),
      'evb',
    )
    assert.equal(sameBranch.questionnaireAnswers?.evb_purpose, 'first_registration')
  })

  it('does not add PII to analytics keys and keeps isolation in the landing form', () => {
    const formSource = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/components/kfz-landing-form.tsx'),
      'utf8',
    )
    assert.match(formSource, /applyKfzLandingBranchSelection/)
    assert.match(formSource, /setScreenId\(KFZ_SCREEN_BRANCH\)/)
    assert.doesNotMatch(formSource, /recordEvent\([^\)]*fullName/)
    assert.doesNotMatch(formSource, /onBranchSelected\([^\)]*answers/)

    for (const key of [
      'fullName',
      'email',
      'phone',
      'answers',
      'filename',
      'license_plate',
    ]) {
      assert.equal(looksLikeForbiddenAnalyticsKey(key), true, key)
    }
    assert.ok(KFZ_SHARED_QUESTIONNAIRE_IDS.includes('vehicle_make'))
    assert.ok(KFZ_SCENARIO_SPECIFIC_QUESTION_IDS.includes('evb_purpose'))
    assert.deepEqual(isolateKfzQuestionnaireAnswersForBranch('upload_documents', evbSeed()), {})
  })
})
