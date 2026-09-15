/**
 * No-document Allianz quotation intake: branches, conditionals, persistence,
 * validation, exact-once submit, normalized inbox payload, no invented price.
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
  createMemoryKfzLandingDraftStorage,
  readKfzLandingDraft,
  writeKfzLandingDraft,
} from '@/features/inbound/kfz/lib/kfz-landing-draft'
import { KFZ_LANDING_CONFIRMATION_BODY } from '@/features/inbound/kfz/lib/kfz-landing-constants'
import {
  isKfzLandingSubmitScreen,
  KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL,
} from '@/features/inbound/kfz/lib/kfz-landing-steps'
import {
  buildKfzLandingScreens,
  formatKfzDeductibleCombination,
  getKfzQuestion,
  hasKfzTeilkaskoSfQuestion,
  isKfzQuestionVisible,
  KFZ_ANSWER_UNKNOWN,
  KFZ_DEDUCTIBLE_COMBINATION_ID,
  KFZ_DEDUCTIBLE_FULL_ID,
  KFZ_DEDUCTIBLE_PARTIAL_ID,
  KFZ_LANDING_BRANCHES,
  KFZ_QUESTIONNAIRE_BOUNDARIES,
  KFZ_QUESTIONS,
  KFZ_SF_CLASS_HAFTPFLICHT_ID,
  KFZ_SF_CLASS_OPTIONS,
  KFZ_SF_CLASS_VOLLKASKO_ID,
  KFZ_TEILKASKO_DEDUCTIBLE_OPTIONS,
  KFZ_VOLLKASKO_DEDUCTIBLE_OPTIONS,
  listAnsweredKfzQuestions,
  listKfzQuestionnaireMissingFacts,
  listVisibleKfzQuestions,
  nextKfzLandingScreenId,
  previousKfzLandingScreenId,
  readQuestionnaireAnswer,
  setKfzQuestionnaireAnswer,
  type KfzQuestionDefinition,
  type KfzQuestionnaireAnswers,
  validateKfzQuestionAnswer,
  validateKfzQuestionScreen,
  validateKfzQuestionnaireComplete,
} from '@/features/inbound/kfz/lib/kfz-questionnaire'
import { resetRateLimitBucketsForTests } from '@/features/inbound/kfz/lib/rate-limit-seam'
import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const SECRET = 'test-kfz-questionnaire-secret'
const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

const PRICE_OR_AUTO_SEND = [
  'Ihr Beitrag',
  'jetzt abschließen',
  'sendWhatsApp',
  'graph.facebook.com',
  'api.whatsapp.com',
] as const

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
  if (question.id === 'intent_other') {
    return 'Preischeck ohne Unterlagen'
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

function withKfzEnv(run: () => Promise<void>): Promise<void> {
  const prev = {
    agency: process.env.INBOUND_KFZ_AGENCY_ID,
    actor: process.env.INBOUND_KFZ_ACTOR_USER_ID,
    secret: process.env.INBOUND_KFZ_INTAKE_SECRET,
  }
  process.env.INBOUND_KFZ_AGENCY_ID = AGENCY_ID
  process.env.INBOUND_KFZ_ACTOR_USER_ID = ACTOR_ID
  process.env.INBOUND_KFZ_INTAKE_SECRET = SECRET
  return run().finally(() => {
    if (prev.agency === undefined) delete process.env.INBOUND_KFZ_AGENCY_ID
    else process.env.INBOUND_KFZ_AGENCY_ID = prev.agency
    if (prev.actor === undefined) delete process.env.INBOUND_KFZ_ACTOR_USER_ID
    else process.env.INBOUND_KFZ_ACTOR_USER_ID = prev.actor
    if (prev.secret === undefined) delete process.env.INBOUND_KFZ_INTAKE_SECRET
    else process.env.INBOUND_KFZ_INTAKE_SECRET = prev.secret
  })
}

describe('kfz landing initial branches', () => {
  it('exposes the six starting choices in the required order', () => {
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
    assert.equal(KFZ_LANDING_BRANCHES[0]?.path, 'upload')
    assert.ok(KFZ_LANDING_BRANCHES.slice(1).every((branch) => branch.path === 'questionnaire'))
    assert.equal(
      KFZ_LANDING_BRANCHES.find((branch) => branch.id === 'switch_car')?.highlighted,
      true,
    )
  })

  it('keeps Unterlagen hochladen on the existing contact → documents path', () => {
    const screens = buildKfzLandingScreens('upload_documents', {})
    assert.deepEqual(
      screens.map((screen) => `${screen.id}:${screen.kind}`),
      ['branch:branch', 'contact:contact', 'documents:documents'],
    )
    assert.equal(
      screens.some((screen) => screen.kind === 'questions'),
      false,
    )
    assert.equal(isKfzLandingSubmitScreen(screens[0], screens, 'upload_documents'), false)
    assert.equal(isKfzLandingSubmitScreen(screens[2], screens, 'upload_documents'), true)
    const startOnly = buildKfzLandingScreens('', {})
    assert.equal(isKfzLandingSubmitScreen(startOnly[0], startOnly, ''), false)
  })
})

describe('kfz questionnaire conditional logic', () => {
  it('asks intent only on the no-document generic branch', () => {
    assert.equal(isKfzQuestionVisible('intent', 'no_documents', {}), true)
    assert.equal(isKfzQuestionVisible('intent', 'first_car', {}), false)
    assert.equal(isKfzQuestionVisible('intent', 'switch_car', {}), false)
    assert.equal(isKfzQuestionVisible('intent_other', 'no_documents', { intent: 'other' }), true)
    assert.equal(isKfzQuestionVisible('intent_other', 'no_documents', { intent: 'first_car' }), false)
  })

  it('hides ownership and first registration when the car is not purchased yet', () => {
    const answers = { registration_status: 'not_purchased' }
    assert.equal(isKfzQuestionVisible('owner_is_policyholder', 'first_car', answers), false)
    assert.equal(isKfzQuestionVisible('financing', 'first_car', answers), false)
    assert.equal(isKfzQuestionVisible('first_registration', 'first_car', answers), false)
    assert.equal(
      isKfzQuestionVisible('owner_is_policyholder', 'first_car', {
        registration_status: 'registered',
      }),
      true,
    )
  })

  it('shows eVB purpose for the eVB branch or when registration is still needed', () => {
    assert.equal(isKfzQuestionVisible('evb_purpose', 'evb', {}), true)
    assert.equal(
      isKfzQuestionVisible('evb_purpose', 'first_car', {
        registration_status: 'needs_registration',
      }),
      true,
    )
    assert.equal(
      isKfzQuestionVisible('evb_purpose', 'first_car', { registration_status: 'registered' }),
      false,
    )
    assert.equal(
      isKfzQuestionVisible('license_plate', 'switch_car', { registration_status: 'registered' }),
      true,
    )
  })

  it('shows partner or additional-driver facts only for those driver choices', () => {
    assert.equal(isKfzQuestionVisible('partner_dob', 'first_car', { drivers: 'with_partner' }), true)
    assert.equal(
      isKfzQuestionVisible('partner_dob', 'first_car', { drivers: 'policyholder_only' }),
      false,
    )
    assert.equal(isKfzQuestionVisible('youngest_driver_dob', 'first_car', { drivers: 'others' }), true)
    assert.equal(
      isKfzQuestionVisible('additional_drivers_note', 'first_car', {
        drivers: 'policyholder_only',
      }),
      false,
    )
  })

  it('treats switch as having previous insurance and additional-car as SF-source relevant', () => {
    assert.equal(isKfzQuestionVisible('has_previous_kfz', 'switch_car', {}), false)
    assert.equal(isKfzQuestionVisible('previous_insurer', 'switch_car', {}), true)
    assert.equal(isKfzQuestionVisible('has_previous_kfz', 'first_car', {}), true)
    assert.equal(
      isKfzQuestionVisible('previous_insurer', 'first_car', { has_previous_kfz: 'no' }),
      false,
    )
    assert.equal(
      isKfzQuestionVisible('previous_insurer', 'additional_car', { has_previous_kfz: 'yes' }),
      true,
    )
    assert.equal(isKfzQuestionVisible('sf_source', 'additional_car', {}), true)
    const sf = getKfzQuestion('sf_source')
    assert.ok(sf?.options?.some((option) => option.id === 'second_car'))
  })

  it('asks claims details and deductibles only when they apply', () => {
    assert.equal(isKfzQuestionVisible('claims_details', 'switch_car', { has_claims: 'yes' }), true)
    assert.equal(isKfzQuestionVisible('claims_details', 'switch_car', { has_claims: 'no' }), false)
    assert.equal(
      isKfzQuestionVisible(KFZ_DEDUCTIBLE_PARTIAL_ID, 'first_car', { coverage: 'liability' }),
      false,
    )
    assert.equal(
      isKfzQuestionVisible(KFZ_DEDUCTIBLE_PARTIAL_ID, 'first_car', { coverage: 'partial' }),
      true,
    )
    assert.equal(
      isKfzQuestionVisible(KFZ_DEDUCTIBLE_FULL_ID, 'first_car', { coverage: 'full' }),
      true,
    )
    assert.equal(
      isKfzQuestionVisible(KFZ_DEDUCTIBLE_FULL_ID, 'first_car', { coverage: 'partial' }),
      false,
    )
    assert.equal(
      isKfzQuestionVisible(KFZ_DEDUCTIBLE_PARTIAL_ID, 'first_car', { coverage: 'full' }),
      true,
    )
    assert.equal(
      isKfzQuestionVisible(KFZ_DEDUCTIBLE_FULL_ID, 'first_car', { coverage: 'liability' }),
      false,
    )
  })

  it('does not invent Allianz optional riders in the question catalog', () => {
    const source = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/lib/kfz-questionnaire.ts'),
      'utf8',
    )
    assert.doesNotMatch(source, /Rabattschutz|Fahrerschutz|AllNet|Schutzbrief-Baustein/)
    assert.match(source, /Allianz-Zusatzbausteine wurden nicht abgefragt/)
  })
})

describe('kfz questionnaire required validation', () => {
  it('blocks an empty visible required question and accepts a complete first-car set', () => {
    const empty = validateKfzQuestionScreen(
      { questionIds: ['vehicle_make', 'vehicle_model'] },
      'first_car',
      {},
    )
    assert.equal(empty.ok, false)
    if (!empty.ok) {
      assert.equal(empty.code, 'missing_field')
    }

    const filled = fillVisibleRequired('first_car')
    const complete = validateKfzQuestionnaireComplete('first_car', filled)
    assert.equal(complete.ok, true, complete.ok ? '' : complete.error)
  })

  it('records unknown answers as missing facts without inventing values', () => {
    const answers = fillVisibleRequired('switch_car', {
      [KFZ_SF_CLASS_HAFTPFLICHT_ID]: KFZ_ANSWER_UNKNOWN,
    })
    const complete = validateKfzQuestionnaireComplete('switch_car', answers)
    assert.equal(complete.ok, true)
    const missing = listKfzQuestionnaireMissingFacts('switch_car', answers)
    assert.ok(missing.some((fact) => /SF-Klasse Haftpflicht/.test(fact)))
  })
})

describe('kfz questionnaire back/forward and reload persistence', () => {
  it('keeps earlier answers when moving back and forward across conditional screens', () => {
    const start = fillVisibleRequired('no_documents', { intent: 'switch_car' })
    const screens = buildKfzLandingScreens('no_documents', start)
    assert.ok(screens.some((screen) => screen.id === 'intent'))
    assert.ok(screens.some((screen) => screen.id === 'insurance'))

    const forward = nextKfzLandingScreenId(screens, 'intent')
    assert.ok(forward)
    const back = previousKfzLandingScreenId(screens, forward)
    assert.equal(back, 'intent')
    assert.equal(start.intent, 'switch_car')
    assert.equal(start.vehicle_make, 'VW')

    const withoutClaims = { ...start, has_claims: 'no' }
    const hidden = isKfzQuestionVisible('claims_details', 'no_documents', withoutClaims)
    assert.equal(hidden, false)
    const withClaims: KfzQuestionnaireAnswers = {
      ...start,
      has_claims: 'yes',
      claims_details: 'Parkrempler 2024',
    }
    assert.equal(isKfzQuestionVisible('claims_details', 'no_documents', withClaims), true)
    assert.equal(withClaims.vehicle_make, 'VW')
  })

  it('restores questionnaire answers after reload and leaves consent unchecked', () => {
    const storage = createMemoryKfzLandingDraftStorage()
    const answers = fillVisibleRequired('additional_car')
    writeKfzLandingDraft(storage, {
      submissionId: 'q-reload-1',
      screenId: 'coverage',
      values: formValues('additional_car', answers, { inquiryProcessingConsent: true }),
      hadDocuments: false,
    })
    const restored = readKfzLandingDraft(storage)
    assert.ok(restored)
    assert.equal(restored.screenId, 'coverage')
    assert.equal(restored.values.inquiryProcessingConsent, false)
    assert.equal(restored.values.questionnaireAnswers?.vehicle_make, 'VW')
    assert.equal(restored.values.branchId, 'additional_car')
    assert.equal(restored.documentReselectRequired, false)
  })
})

describe('kfz questionnaire submit and inbox payload', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('submits exactly one normalized inbox item for a complete no-document first-car flow', async () => {
    await withKfzEnv(async () => {
      const answers = fillVisibleRequired('first_car')
      const built = buildKfzLandingPayload({
        values: formValues('first_car', answers),
        submissionId: 'q-first-car-1',
        consentTimestamp: '2026-09-09T12:00:00.000Z',
      })
      assert.equal(built.ok, true)
      if (!built.ok) {
        return
      }

      assert.equal(built.payload.inquiryReason, 'Erstes Auto versichern')
      assert.equal(built.payload.preferredChannel, 'whatsapp')
      assert.equal(built.payload.uploads, null)
      assert.equal(built.payload.questionnaire?.branchId, 'first_car')
      assert.equal(built.payload.questionnaire?.path, 'questionnaire')
      assert.ok((built.payload.questionnaire?.answers.length ?? 0) > 5)
      assert.deepEqual(
        built.payload.questionnaire?.boundaries,
        [...KFZ_QUESTIONNAIRE_BOUNDARIES],
      )
      assert.match(JSON.stringify(built.payload), /WhatsApp|whatsapp/)
      assert.doesNotMatch(JSON.stringify(built.payload), /Sofortpreis|Ihr Beitrag|€\d/)

      const store = createMemoryInboundIntakeStore()
      const first = await handleKfzInboundHttpRequest(
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
      const retry = await handleKfzInboundHttpRequest(
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

      assert.equal(first.ok, true)
      assert.equal(retry.ok, true)
      if (!first.ok || !retry.ok) {
        return
      }
      assert.equal(first.body.deduplicated, false)
      assert.equal(retry.body.deduplicated, true)
      assert.equal(store.items.length, 1)

      const review = presentKfzWebsiteInboxItem(store.items[0])
      assert.ok(review)
      assert.equal(review.questionnaireBranch, 'Erstes Auto versichern')
      assert.equal(review.preferredChannel, 'whatsapp')
      assert.ok(review.questionnaireAnswers.some((fact) => fact.id === 'q:vehicle_make'))
      assert.ok(review.questionnaireBoundaries.length > 0)
      assert.match(review.nextManualAction, /automatisch gesendet/)
      assert.doesNotMatch(JSON.stringify(review), /Sofortpreis|automatisch angenommen/)
    })
  })

  it('covers every questionnaire branch with a complete payload', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const questionnaireBranches = KFZ_LANDING_BRANCHES.filter(
        (branch) => branch.path === 'questionnaire',
      )

      for (const branch of questionnaireBranches) {
        const seed =
          branch.id === 'no_documents' ? { intent: 'evb' } : ({} as KfzQuestionnaireAnswers)
        const answers = fillVisibleRequired(branch.id, seed)
        const complete = validateKfzQuestionnaireComplete(branch.id, answers)
        assert.equal(complete.ok, true, `${branch.id}: ${complete.ok ? '' : complete.error}`)

        const built = buildKfzLandingPayload({
          values: formValues(branch.id, answers),
          submissionId: `q-branch-${branch.id}`,
          consentTimestamp: '2026-09-09T12:00:00.000Z',
        })
        assert.equal(built.ok, true, branch.id)
        if (!built.ok) {
          continue
        }
        assert.equal(built.payload.questionnaire?.branchId, branch.id)
        assert.equal(built.payload.inquiryProcessingConsent, true)

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
        assert.equal(result.ok, true, branch.id)
      }

      assert.equal(store.items.length, questionnaireBranches.length)
    })
  })

  it('rejects a questionnaire submit without consent', () => {
    const built = buildKfzLandingPayload({
      values: formValues('evb', fillVisibleRequired('evb'), {
        inquiryProcessingConsent: false,
      }),
      submissionId: 'q-no-consent',
      consentTimestamp: '2026-09-09T12:00:00.000Z',
    })
    assert.equal(built.ok, false)
    if (!built.ok) {
      assert.equal(built.code, 'invalid_consent')
    }
  })
})

describe('kfz separate SF classes and selectable deductibles', () => {
  it('exposes factual SF chips including M, 0, S, 1/2, 1-50 and unknown', () => {
    const ids = KFZ_SF_CLASS_OPTIONS.map((option) => option.id)
    assert.deepEqual(ids.slice(0, 4), ['M', '0', 'S', '1/2'])
    assert.equal(ids[4], '1')
    assert.equal(ids.at(-1), '50')
    assert.equal(ids.length, 54)
    assert.equal(ids.includes('51'), false)

    const haftpflicht = getKfzQuestion(KFZ_SF_CLASS_HAFTPFLICHT_ID)
    const vollkasko = getKfzQuestion(KFZ_SF_CLASS_VOLLKASKO_ID)
    assert.equal(haftpflicht?.kind, 'choice')
    assert.equal(haftpflicht?.presentation, 'chips')
    assert.equal(vollkasko?.presentation, 'chips')
    assert.ok(haftpflicht?.options?.some((option) => option.id === KFZ_ANSWER_UNKNOWN))
    assert.ok(haftpflicht?.options?.some((option) => option.label === 'Weiß ich nicht'))
    assert.equal(hasKfzTeilkaskoSfQuestion(), false)
    assert.equal(
      KFZ_QUESTIONS.some((question) => /teilkasko/i.test(question.id) && /sf/i.test(question.id)),
      false,
    )
    assert.equal(
      KFZ_QUESTIONS.some((question) => /SF-Klasse Teilkasko/.test(question.prompt)),
      false,
    )
  })

  it('keeps Haftpflicht and Vollkasko SF independent and never copies values', () => {
    const start: KfzQuestionnaireAnswers = {
      [KFZ_SF_CLASS_HAFTPFLICHT_ID]: '8',
    }
    const withVk = setKfzQuestionnaireAnswer(start, KFZ_SF_CLASS_VOLLKASKO_ID, '20')
    assert.equal(withVk[KFZ_SF_CLASS_HAFTPFLICHT_ID], '8')
    assert.equal(withVk[KFZ_SF_CLASS_VOLLKASKO_ID], '20')

    const changedHp = setKfzQuestionnaireAnswer(withVk, KFZ_SF_CLASS_HAFTPFLICHT_ID, '3')
    assert.equal(changedHp[KFZ_SF_CLASS_HAFTPFLICHT_ID], '3')
    assert.equal(changedHp[KFZ_SF_CLASS_VOLLKASKO_ID], '20')

    const source = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/lib/kfz-questionnaire.ts'),
      'utf8',
    )
    const formSource = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/components/kfz-landing-form.tsx'),
      'utf8',
    )
    assert.doesNotMatch(source, /sf_class_vollkasko.*=.*sf_class_haftpflicht/)
    assert.doesNotMatch(source, /sf_class_haftpflicht.*=.*sf_class_vollkasko/)
    assert.match(formSource, /setKfzQuestionnaireAnswer/)
  })

  it('asks Vollkasko SF only when a previous policy may carry that class', () => {
    assert.equal(
      isKfzQuestionVisible(KFZ_SF_CLASS_HAFTPFLICHT_ID, 'first_car', {}),
      true,
    )
    assert.equal(
      isKfzQuestionVisible(KFZ_SF_CLASS_VOLLKASKO_ID, 'first_car', {
        has_previous_kfz: 'no',
      }),
      false,
    )
    assert.equal(
      isKfzQuestionVisible(KFZ_SF_CLASS_VOLLKASKO_ID, 'first_car', {
        has_previous_kfz: 'yes',
      }),
      true,
    )
    assert.equal(isKfzQuestionVisible(KFZ_SF_CLASS_VOLLKASKO_ID, 'switch_car', {}), true)
    assert.equal(
      isKfzQuestionVisible(KFZ_SF_CLASS_VOLLKASKO_ID, 'additional_car', {
        has_previous_kfz: 'no',
      }),
      false,
    )
    assert.equal(
      isKfzQuestionVisible(KFZ_SF_CLASS_VOLLKASKO_ID, 'evb', { has_previous_kfz: 'yes' }),
      true,
    )
    assert.equal(
      isKfzQuestionVisible(KFZ_SF_CLASS_VOLLKASKO_ID, 'no_documents', {
        intent: 'first_car',
        has_previous_kfz: 'no',
      }),
      false,
    )
  })

  it('accepts every selectable Teilkasko and Vollkasko deductible', () => {
    const tk = getKfzQuestion(KFZ_DEDUCTIBLE_PARTIAL_ID)
    const vk = getKfzQuestion(KFZ_DEDUCTIBLE_FULL_ID)
    assert.equal(tk?.kind, 'choice')
    assert.equal(vk?.kind, 'choice')
    assert.deepEqual(
      KFZ_TEILKASKO_DEDUCTIBLE_OPTIONS.map((option) => option.label),
      ['0 €', '150 €', '300 €', '500 €', '1.000 €'],
    )
    assert.deepEqual(
      KFZ_VOLLKASKO_DEDUCTIBLE_OPTIONS.map((option) => option.label),
      ['0 €', '300 €', '500 €', '1.000 €', '2.500 €'],
    )

    assert.ok(tk)
    assert.ok(vk)
    for (const option of [...KFZ_TEILKASKO_DEDUCTIBLE_OPTIONS, { id: KFZ_ANSWER_UNKNOWN, label: 'Weiß ich nicht' }]) {
      const result = validateKfzQuestionAnswer(tk, option.id)
      assert.equal(result.ok, true, option.id)
    }
    for (const option of [...KFZ_VOLLKASKO_DEDUCTIBLE_OPTIONS, { id: KFZ_ANSWER_UNKNOWN, label: 'Weiß ich nicht' }]) {
      const result = validateKfzQuestionAnswer(vk, option.id)
      assert.equal(result.ok, true, option.id)
    }
    assert.equal(validateKfzQuestionAnswer(tk, '200').ok, false)
    assert.equal(validateKfzQuestionAnswer(vk, '150').ok, false)
  })

  it('summarizes the selected deductible combination without inventing a missing side', () => {
    assert.equal(formatKfzDeductibleCombination({ coverage: 'liability' }), null)
    assert.equal(
      formatKfzDeductibleCombination({
        coverage: 'partial',
        [KFZ_DEDUCTIBLE_PARTIAL_ID]: '150',
      }),
      'Teilkasko 150 €',
    )
    assert.equal(
      formatKfzDeductibleCombination({
        coverage: 'full',
        [KFZ_DEDUCTIBLE_FULL_ID]: '500',
        [KFZ_DEDUCTIBLE_PARTIAL_ID]: '150',
      }),
      'Vollkasko 500 € / Teilkasko 150 €',
    )
    assert.equal(
      formatKfzDeductibleCombination({
        coverage: 'full',
        [KFZ_DEDUCTIBLE_FULL_ID]: KFZ_ANSWER_UNKNOWN,
        [KFZ_DEDUCTIBLE_PARTIAL_ID]: '0',
      }),
      'Vollkasko Weiß ich nicht / Teilkasko 0 €',
    )
  })

  it('puts separate SF values, structured deductibles and the combination into the inbox payload', async () => {
    await withKfzEnv(async () => {
      const answers = fillVisibleRequired('switch_car', {
        [KFZ_SF_CLASS_HAFTPFLICHT_ID]: '8',
        [KFZ_SF_CLASS_VOLLKASKO_ID]: '20',
        coverage: 'full',
        [KFZ_DEDUCTIBLE_FULL_ID]: '500',
        [KFZ_DEDUCTIBLE_PARTIAL_ID]: '150',
      })
      assert.equal(answers[KFZ_SF_CLASS_HAFTPFLICHT_ID], '8')
      assert.equal(answers[KFZ_SF_CLASS_VOLLKASKO_ID], '20')

      const records = listAnsweredKfzQuestions('switch_car', answers)
      const hp = records.find((entry) => entry.id === KFZ_SF_CLASS_HAFTPFLICHT_ID)
      const vk = records.find((entry) => entry.id === KFZ_SF_CLASS_VOLLKASKO_ID)
      const combination = records.find((entry) => entry.id === KFZ_DEDUCTIBLE_COMBINATION_ID)
      assert.equal(hp?.value, '8')
      assert.equal(vk?.value, '20')
      assert.equal(combination?.value, 'Vollkasko 500 € / Teilkasko 150 €')
      assert.equal(
        records.some((entry) => /teilkasko/i.test(entry.id) && /sf/i.test(entry.id)),
        false,
      )

      const built = buildKfzLandingPayload({
        values: formValues('switch_car', answers),
        submissionId: 'q-sf-split-1',
        consentTimestamp: '2026-09-09T12:00:00.000Z',
      })
      assert.equal(built.ok, true)
      if (!built.ok) {
        return
      }

      const payloadAnswers = built.payload.questionnaire?.answers ?? []
      assert.equal(
        payloadAnswers.find((entry) => entry.id === KFZ_SF_CLASS_HAFTPFLICHT_ID)?.value,
        '8',
      )
      assert.equal(
        payloadAnswers.find((entry) => entry.id === KFZ_SF_CLASS_VOLLKASKO_ID)?.value,
        '20',
      )
      assert.equal(
        payloadAnswers.find((entry) => entry.id === KFZ_DEDUCTIBLE_PARTIAL_ID)?.value,
        '150 €',
      )
      assert.equal(
        payloadAnswers.find((entry) => entry.id === KFZ_DEDUCTIBLE_FULL_ID)?.value,
        '500 €',
      )
      assert.equal(
        payloadAnswers.find((entry) => entry.id === KFZ_DEDUCTIBLE_COMBINATION_ID)?.value,
        'Vollkasko 500 € / Teilkasko 150 €',
      )
      assert.equal(
        payloadAnswers.some((entry) => entry.id === 'sf_class'),
        false,
      )

      const unknownHp = fillVisibleRequired('first_car', {
        has_previous_kfz: 'no',
        coverage: 'liability',
        [KFZ_SF_CLASS_HAFTPFLICHT_ID]: KFZ_ANSWER_UNKNOWN,
      })
      assert.equal(isKfzQuestionVisible(KFZ_SF_CLASS_VOLLKASKO_ID, 'first_car', unknownHp), false)
      const unknownBuilt = buildKfzLandingPayload({
        values: formValues('first_car', unknownHp),
        submissionId: 'q-sf-unknown-hp',
        consentTimestamp: '2026-09-09T12:00:00.000Z',
      })
      assert.equal(unknownBuilt.ok, true)
      if (!unknownBuilt.ok) {
        return
      }
      const unknownAnswers = unknownBuilt.payload.questionnaire?.answers ?? []
      assert.equal(
        unknownAnswers.find((entry) => entry.id === KFZ_SF_CLASS_HAFTPFLICHT_ID)?.unknown,
        true,
      )
      assert.equal(
        unknownAnswers.some((entry) => entry.id === KFZ_SF_CLASS_VOLLKASKO_ID),
        false,
      )
      assert.equal(
        unknownAnswers.some((entry) => entry.id === KFZ_DEDUCTIBLE_PARTIAL_ID),
        false,
      )
      assert.ok(
        (unknownBuilt.payload.questionnaire?.missingFacts ?? []).some((fact) =>
          /SF-Klasse Haftpflicht/.test(fact),
        ),
      )

      const store = createMemoryInboundIntakeStore()
      const first = await handleKfzInboundHttpRequest(
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
      const retry = await handleKfzInboundHttpRequest(
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
      assert.equal(first.ok, true)
      assert.equal(retry.ok, true)
      if (!first.ok || !retry.ok) {
        return
      }
      assert.equal(first.body.deduplicated, false)
      assert.equal(retry.body.deduplicated, true)
      assert.equal(store.items.length, 1)

      const review = presentKfzWebsiteInboxItem(store.items[0])
      assert.ok(review)
      assert.equal(
        review.questionnaireAnswers.find((fact) => fact.id === `q:${KFZ_SF_CLASS_HAFTPFLICHT_ID}`)
          ?.value,
        '8',
      )
      assert.equal(
        review.questionnaireAnswers.find((fact) => fact.id === `q:${KFZ_SF_CLASS_VOLLKASKO_ID}`)
          ?.value,
        '20',
      )
      assert.equal(
        review.questionnaireAnswers.find((fact) => fact.id === `q:${KFZ_DEDUCTIBLE_COMBINATION_ID}`)
          ?.value,
        'Vollkasko 500 € / Teilkasko 150 €',
      )
    })
  })

  it('restores different SF and deductible choices after reload without checking consent', () => {
    const storage = createMemoryKfzLandingDraftStorage()
    const answers = fillVisibleRequired('switch_car', {
      [KFZ_SF_CLASS_HAFTPFLICHT_ID]: '12',
      [KFZ_SF_CLASS_VOLLKASKO_ID]: '5',
      coverage: 'full',
      [KFZ_DEDUCTIBLE_FULL_ID]: '1000',
      [KFZ_DEDUCTIBLE_PARTIAL_ID]: '300',
    })
    writeKfzLandingDraft(storage, {
      submissionId: 'q-sf-reload',
      screenId: 'coverage',
      values: formValues('switch_car', answers, { inquiryProcessingConsent: true }),
      hadDocuments: false,
    })
    const restored = readKfzLandingDraft(storage)
    assert.ok(restored)
    assert.equal(restored.values.inquiryProcessingConsent, false)
    assert.equal(restored.values.questionnaireAnswers?.[KFZ_SF_CLASS_HAFTPFLICHT_ID], '12')
    assert.equal(restored.values.questionnaireAnswers?.[KFZ_SF_CLASS_VOLLKASKO_ID], '5')
    assert.equal(restored.values.questionnaireAnswers?.[KFZ_DEDUCTIBLE_FULL_ID], '1000')
    assert.equal(restored.values.questionnaireAnswers?.[KFZ_DEDUCTIBLE_PARTIAL_ID], '300')
    assert.equal(
      formatKfzDeductibleCombination(restored.values.questionnaireAnswers ?? {}),
      'Vollkasko 1.000 € / Teilkasko 300 €',
    )

    const screens = buildKfzLandingScreens('switch_car', answers)
    const back = previousKfzLandingScreenId(screens, 'coverage')
    assert.ok(back)
    const forward = nextKfzLandingScreenId(screens, back)
    assert.equal(forward, 'coverage')
    assert.equal(answers[KFZ_SF_CLASS_HAFTPFLICHT_ID], '12')
    assert.equal(answers[KFZ_SF_CLASS_VOLLKASKO_ID], '5')
  })
})

describe('kfz questionnaire source files stay price-free and offline', () => {
  it('does not invent a price or automatic customer message', () => {
    const files = [
      'features/inbound/kfz/lib/kfz-questionnaire.ts',
      'features/inbound/kfz/components/kfz-landing-form.tsx',
      'features/inbound/kfz/components/kfz-questionnaire-fields.tsx',
      'features/inbound/kfz/lib/build-kfz-landing-payload.ts',
    ]
    const source = files
      .map((relative) => fs.readFileSync(path.join(srcRoot, relative), 'utf8'))
      .join('\n')
    for (const fragment of PRICE_OR_AUTO_SEND) {
      assert.doesNotMatch(source, new RegExp(fragment))
    }
    assert.match(source, /kein Sofortpreis/)
    assert.match(source, /Artjom oder Vera/)
    assert.equal(
      KFZ_LANDING_CONFIRMATION_BODY.includes('Artjom oder Vera prüft Ihre Anfrage manuell'),
      true,
    )
  })

  it('keeps customer-facing copy free of internal repository notes', () => {
    const customerCopy = [
      ...KFZ_QUESTIONS.map((question) => `${question.prompt}\n${question.hint ?? ''}`),
      fs.readFileSync(
        path.join(srcRoot, 'features/inbound/kfz/components/kfz-questionnaire-fields.tsx'),
        'utf8',
      ),
      fs.readFileSync(
        path.join(srcRoot, 'features/inbound/kfz/components/kfz-landing-form.tsx'),
        'utf8',
      ),
    ].join('\n')
    assert.doesNotMatch(customerCopy, /Allianz-SB-Stufen/)
    assert.doesNotMatch(customerCopy, /im Repository nicht dokumentiert/)
    assert.doesNotMatch(customerCopy, /Freitext/)
  })
})
