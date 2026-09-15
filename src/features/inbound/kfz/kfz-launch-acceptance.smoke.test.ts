/**
 * One local Kfz acceptance walk:
 * landing choice → questionnaire/upload → validation → designed failure/retry →
 * exactly one normalized inbox item → manual review → analytics consent granted
 * stores anonymous events; declined stores nothing.
 */
import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import {
  applyKfzManualTriageCommand,
  hasKfzReviewStartedNote,
  KFZ_REVIEW_NO_AUTO_ACTION,
  KFZ_REVIEW_STARTED_NOTE,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
import { presentKfzWebsiteInboxItem } from '@/features/inbox/lib/present-kfz-website-inbox'
import {
  buildKfzLandingPayload,
  type KfzLandingFormValues,
} from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import { addKfzLandingDocuments } from '@/features/inbound/kfz/lib/kfz-landing-documents'
import {
  canAdvanceKfzLandingScreen,
  KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL,
  validateKfzLandingConsent,
  validateKfzLandingContact,
} from '@/features/inbound/kfz/lib/kfz-landing-steps'
import {
  executeKfzLandingSubmitAttempt,
  type KfzLandingSubmitFn,
} from '@/features/inbound/kfz/lib/kfz-landing-submit-session'
import {
  createMemoryKfzAnalyticsConsentStorage,
} from '@/features/inbound/kfz/lib/kfz-analytics-consent'
import { ingestKfzAnalyticsEvents } from '@/features/inbound/kfz/lib/kfz-analytics-ingest'
import { createKfzAnalyticsController } from '@/features/inbound/kfz/lib/kfz-analytics-session'
import {
  buildKfzLandingScreens,
  KFZ_ANSWER_UNKNOWN,
  KFZ_LANDING_BRANCHES,
  listVisibleKfzQuestions,
  nextKfzLandingScreenId,
  readQuestionnaireAnswer,
  type KfzQuestionDefinition,
  type KfzQuestionnaireAnswers,
  validateKfzQuestionnaireComplete,
} from '@/features/inbound/kfz/lib/kfz-questionnaire'
import { resetRateLimitBucketsForTests } from '@/features/inbound/kfz/lib/rate-limit-seam'
import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'
import { createMemoryKfzAnalyticsStore } from '@/features/inbound/kfz/repositories/kfz-analytics-store'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const SECRET = 'test-kfz-launch-acceptance-secret'
const SESSION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

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

function submitViaHandler(
  store: ReturnType<typeof createMemoryInboundIntakeStore>,
): KfzLandingSubmitFn {
  return async (payload) => {
    const result = await handleKfzInboundHttpRequest(
      new Request('http://localhost/api/inbound/kfz', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }),
      { store },
    )
    if (!result.ok) {
      return {
        ok: false,
        error: result.body.error,
        code: result.body.code,
        retryable: result.status >= 500 || result.status === 429,
      }
    }
    return { ok: true, deduplicated: result.body.deduplicated }
  }
}

describe('kfz local launch acceptance walk', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('walks landing choice, both paths, validation, retry, one inbox, review and analytics consent', async () => {
    await withKfzEnv(async () => {
      assert.deepEqual(
        KFZ_LANDING_BRANCHES.map((branch) => branch.id),
        [
          'upload_documents',
          'no_documents',
          'first_car',
          'additional_car',
          'switch_car',
          'evb',
        ],
      )
      for (const branch of KFZ_LANDING_BRANCHES) {
        const screens = buildKfzLandingScreens(branch.id, {})
        assert.equal(screens[0]?.kind, 'branch')
        if (branch.path === 'upload') {
          assert.deepEqual(
            screens.map((screen) => screen.kind),
            ['branch', 'contact', 'documents'],
          )
        } else {
          assert.ok(screens.some((screen) => screen.kind === 'questions'))
          assert.ok(screens.some((screen) => screen.kind === 'contact'))
        }
      }

      const uploadScreens = buildKfzLandingScreens('upload_documents', {})
      const emptyContact = canAdvanceKfzLandingScreen(
        uploadScreens[1]!,
        formValues('upload_documents', {}, { phone: '', email: '', preferredChannel: 'email' }),
      )
      assert.equal(emptyContact.ok, false)
      if (!emptyContact.ok) {
        assert.equal(emptyContact.code, 'missing_contact')
      }
      assert.equal(validateKfzLandingConsent(false).ok, false)
      assert.equal(validateKfzLandingContact(formValues('upload_documents')).ok, true)

      const documents = addKfzLandingDocuments([], [
        {
          group: 'fahrzeugschein',
          filename: 'schein.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 12_000,
          id: 'doc-schein',
        },
      ]).documents
      const uploadBuilt = buildKfzLandingPayload({
        values: formValues('upload_documents'),
        submissionId: 'kfz-accept-upload-001',
        consentTimestamp: '2026-09-10T06:10:00.000Z',
        documents,
      })
      assert.equal(uploadBuilt.ok, true)
      if (!uploadBuilt.ok) {
        return
      }
      assert.equal(uploadBuilt.payload.questionnaire?.path, 'upload')
      assert.equal(uploadBuilt.payload.uploads?.[0]?.filename, 'schein.jpg')

      const answers = fillVisibleRequired('switch_car')
      assert.equal(validateKfzQuestionnaireComplete('switch_car', answers).ok, true)
      const questionnaireScreens = buildKfzLandingScreens('switch_car', answers)
      let screenId: string | null = questionnaireScreens[0]?.id ?? null
      let walked = 0
      while (screenId) {
        walked += 1
        screenId = nextKfzLandingScreenId(questionnaireScreens, screenId)
        assert.ok(walked < 30)
      }
      assert.ok(walked >= 3)

      const missingConsent = buildKfzLandingPayload({
        values: formValues('switch_car', answers, { inquiryProcessingConsent: false }),
        submissionId: 'kfz-accept-q-001',
        consentTimestamp: '2026-09-10T06:11:00.000Z',
      })
      assert.equal(missingConsent.ok, false)
      if (!missingConsent.ok) {
        assert.equal(missingConsent.code, 'invalid_consent')
      }

      const store = createMemoryInboundIntakeStore()
      const realSubmit = submitViaHandler(store)
      let attempts = 0
      const failingThenReal: KfzLandingSubmitFn = async (payload) => {
        attempts += 1
        if (attempts === 1) {
          return {
            ok: false,
            error: 'Geplanter Annahme-Fehler',
            code: 'timeout',
            retryable: true,
          }
        }
        return realSubmit(payload)
      }

      const prepared = {
        submissionId: 'kfz-accept-q-001',
        values: formValues('switch_car', answers),
        documents: [],
        previews: {},
      }

      const failed = await executeKfzLandingSubmitAttempt({
        phase: 'idle',
        inFlight: false,
        prepared,
        submit: failingThenReal,
      })
      assert.equal(failed.started, true)
      assert.equal(failed.phase, 'error')
      assert.equal(failed.draftAction, 'retained')
      assert.equal(failed.submissionId, 'kfz-accept-q-001')
      assert.equal(store.items.length, 0)

      const retry = await executeKfzLandingSubmitAttempt({
        phase: failed.phase,
        inFlight: false,
        prepared: {
          submissionId: failed.submissionId,
          values: failed.values,
          documents: failed.documents,
          previews: failed.previews,
        },
        submit: failingThenReal,
      })
      assert.equal(retry.started, true)
      assert.equal(retry.phase, 'success')
      assert.equal(retry.result?.ok, true)
      assert.equal(store.items.length, 1)
      assert.equal(store.items[0]?.external_id, 'kfz:kfz-accept-q-001')
      assert.equal(store.items[0]?.channel, 'website')
      assert.equal(store.items[0]?.source, 'website')

      const sameIdRetry = await executeKfzLandingSubmitAttempt({
        phase: 'error',
        inFlight: false,
        prepared: {
          submissionId: failed.submissionId,
          values: failed.values,
          documents: failed.documents,
          previews: failed.previews,
        },
        submit: realSubmit,
      })
      assert.equal(
        sameIdRetry.result && sameIdRetry.result.ok && sameIdRetry.result.deduplicated,
        true,
      )
      assert.equal(store.items.length, 1)

      const review = presentKfzWebsiteInboxItem(store.items[0]!)
      assert.ok(review)
      assert.equal(review.sourceLabel, 'Website · Kfz')
      assert.equal(review.customerName, 'Max Mustermann')
      assert.equal(review.request, 'Bestehendes Auto wechseln')
      assert.match(review.nextManualAction, /Prüfung starten/)
      assert.equal(review.availableActions.some((action) => action.id === 'start_review'), true)
      assert.match(KFZ_REVIEW_NO_AUTO_ACTION, /Nichts wird automatisch/)

      const started = applyKfzManualTriageCommand(
        {
          content: store.items[0]!.content,
          processed_at: store.items[0]!.processed_at,
          linkedTaskId: null,
        },
        { type: 'start_review' },
      )
      assert.equal(started.ok, true)
      if (!started.ok) {
        return
      }
      assert.equal(hasKfzReviewStartedNote(started.next.content), true)
      assert.match(started.next.content, new RegExp(KFZ_REVIEW_STARTED_NOTE))
      const afterReview = presentKfzWebsiteInboxItem({
        ...store.items[0]!,
        content: started.next.content,
      })
      assert.ok(afterReview)
      assert.equal(afterReview.phase, 'in_review')

      const grantedStorage = createMemoryKfzAnalyticsConsentStorage()
      const granted = createKfzAnalyticsController({
        storage: grantedStorage,
        randomUuid: () => SESSION_ID,
      })
      const afterGrant = granted.setConsent('granted')
      assert.ok(afterGrant.length > 0)
      const grantedEvents = [
        ...afterGrant,
        ...granted.recordFunnelStart('switch_car'),
        ...granted.recordStepView('contact'),
        ...granted.recordValidationBlocked('contact', 'missing_contact'),
        ...granted.recordSubmitStarted(),
        ...granted.recordSubmitFailed('timeout'),
        ...granted.recordSubmitSucceeded(),
      ]
      const grantedStore = createMemoryKfzAnalyticsStore()
      const ingested = await ingestKfzAnalyticsEvents({
        consent: 'granted',
        events: grantedEvents,
        store: grantedStore,
      })
      assert.ok(ingested.accepted > 0)
      assert.ok(grantedStore.events.length > 0)
      assert.equal(
        JSON.stringify(grantedStore.events).includes('Max Mustermann'),
        false,
      )
      assert.equal(JSON.stringify(grantedStore.events).includes('+491701234567'), false)

      const declinedStorage = createMemoryKfzAnalyticsConsentStorage()
      const declined = createKfzAnalyticsController({
        storage: declinedStorage,
        randomUuid: () => SESSION_ID,
      })
      assert.deepEqual(declined.setConsent('declined'), [])
      assert.equal(declined.getSessionId(), null)
      assert.deepEqual(declined.recordLandingView(), [])
      assert.deepEqual(declined.recordFunnelStart('switch_car'), [])
      const declinedStore = createMemoryKfzAnalyticsStore()
      const declinedIngest = await ingestKfzAnalyticsEvents({
        consent: 'declined',
        events: grantedEvents,
        store: declinedStore,
      })
      assert.equal(declinedIngest.accepted, 0)
      assert.equal(declinedStore.events.length, 0)
    })
  })
})
