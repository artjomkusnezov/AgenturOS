/**
 * Test-only Kfz release-candidate acceptance harness.
 *
 * Walks /kfz → submit → exact-once retry → one inbox item → authorized
 * document review → anonymous/cross-item rejection. Uses generated synthetic
 * data and a tiny generated file. Never claims production readiness and never
 * writes customer data, answers, filenames, object keys or secret values into
 * the report or analytics.
 */

import fs from 'node:fs'
import path from 'node:path'

import { presentKfzWebsiteInboxItem } from '@/features/inbox/lib/present-kfz-website-inbox'
import {
  applyKfzManualTriageCommand,
  hasKfzReviewStartedNote,
} from '@/features/inbox/lib/kfz-inbox-manual-triage'
import {
  buildKfzLandingPayload,
  type KfzLandingFormValues,
} from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import { addKfzLandingDocuments } from '@/features/inbound/kfz/lib/kfz-landing-documents'
import {
  validateKfzLandingConsent,
  validateKfzLandingContact,
  KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL,
} from '@/features/inbound/kfz/lib/kfz-landing-steps'
import {
  executeKfzLandingSubmitAttempt,
  type KfzLandingSubmitFn,
} from '@/features/inbound/kfz/lib/kfz-landing-submit-session'
import {
  authorizeKfzDocumentReview,
  isKfzDocumentObjectKey,
  looksLikePublicDocumentUrl,
  readObjectKeysFromUploadMeta,
} from '@/features/inbound/kfz/lib/kfz-document-storage'
import {
  createMemoryKfzAnalyticsConsentStorage,
} from '@/features/inbound/kfz/lib/kfz-analytics-consent'
import { ingestKfzAnalyticsEvents } from '@/features/inbound/kfz/lib/kfz-analytics-ingest'
import {
  assertNoKfzAnalyticsPii,
  redactKfzAnalyticsProperties,
} from '@/features/inbound/kfz/lib/kfz-analytics-redact'
import { createKfzAnalyticsController } from '@/features/inbound/kfz/lib/kfz-analytics-session'
import { resolveKfzLaunchRepoRoot } from '@/features/inbound/kfz/lib/kfz-launch-readiness'
import { KFZ_SUPABASE_PERSIST_ENV_NAMES } from '@/features/inbound/kfz/lib/kfz-supabase-persist-env'
import {
  buildKfzLandingScreens,
  KFZ_ANSWER_UNKNOWN,
  KFZ_LANDING_BRANCHES,
  listVisibleKfzQuestions,
  nextKfzLandingScreenId,
  readQuestionnaireAnswer,
  validateKfzQuestionnaireComplete,
  type KfzQuestionDefinition,
  type KfzQuestionnaireAnswers,
} from '@/features/inbound/kfz/lib/kfz-questionnaire'
import { resetRateLimitBucketsForTests } from '@/features/inbound/kfz/lib/rate-limit-seam'
import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'
import { createMemoryKfzAnalyticsStore } from '@/features/inbound/kfz/repositories/kfz-analytics-store'
import { createMemoryKfzDocumentStore } from '@/features/inbound/kfz/repositories/kfz-document-store'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'
import type { KfzInboundDocumentBytes } from '@/features/inbound/kfz/types/kfz-document-storage'
import type { KfzAnalyticsRecord } from '@/features/inbound/kfz/types/kfz-analytics'
import {
  KFZ_RC_FAILURE_CLASSES,
  KFZ_RC_REQUIRED_ROUTES,
  type KfzRcAcceptanceReport,
  type KfzRcFailure,
  type KfzRcFailureClass,
  type KfzRcPublicSupabaseKeyModes,
  type KfzRcRoutePresence,
  type KfzRcStepId,
  type KfzRcStepResult,
} from '@/features/inbound/kfz/types/kfz-release-candidate-acceptance'
import {
  NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME,
  NEXT_PUBLIC_SUPABASE_URL_NAME,
  readPublicSupabaseConfig,
} from '@/lib/supabase/public-config'

const RC_AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const RC_ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const RC_SESSION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const RC_OTHER_ITEM_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const RC_SUBMISSION_ID = 'kfz-rc-accept-001'
const RC_INTAKE_SECRET = 'rc-accept-intake-secret-do-not-print'
const RC_PUBLISHABLE = 'publishable-rc-do-not-print'
const RC_ANON = 'anon-rc-do-not-print'
const RC_PUBLIC_URL = 'https://rc-accept-fixture.example.supabase.co'

export const KFZ_RC_SYNTHETIC_FULL_NAME = 'RC Annahme Testperson'
export const KFZ_RC_SYNTHETIC_PHONE = '+491701112223'
export const KFZ_RC_SYNTHETIC_EMAIL = 'rc.annahme@example.test'
export const KFZ_RC_SYNTHETIC_FILENAME = 'rc-accept-fixture.jpg'

const REQUIRED_ANALYTICS_EVENT_NAMES = [
  'landing_view',
  'traffic_source',
  'funnel_start',
  'initial_branch_selected',
  'step_view',
  'step_completed',
  'submit_started',
  'submit_failed',
  'submit_succeeded',
  'funnel_abandoned',
] as const

export const KFZ_RC_ACCEPTANCE_SCOPE = 'test_only_local_harness' as const

export type KfzRcSyntheticDocument = KfzInboundDocumentBytes

export type KfzRcSyntheticFixture = {
  values: KfzLandingFormValues
  document: KfzRcSyntheticDocument
}

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
    return 'RC-Marke'
  }
  if (question.id === 'vehicle_model') {
    return 'RC-Modell'
  }
  if (question.id === 'previous_insurer') {
    return 'RC-Versicherung'
  }
  if (question.id === 'intent_other') {
    return 'RC synthetische Angabe'
  }
  return 'RC-Angabe'
}

export function fillKfzRcVisibleRequired(
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

/** Tiny generated JPEG — not a customer file. */
export function createKfzReleaseCandidateFixtureBytes(): ArrayBuffer {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xd9, 0x52, 0x43, 0x01, 0x02]).buffer
}

export function createKfzReleaseCandidateSyntheticFixture(): KfzRcSyntheticFixture {
  const bytes = createKfzReleaseCandidateFixtureBytes()
  return {
    values: {
      fullName: KFZ_RC_SYNTHETIC_FULL_NAME,
      postalCode: '49525',
      city: 'Lengerich',
      phone: KFZ_RC_SYNTHETIC_PHONE,
      email: KFZ_RC_SYNTHETIC_EMAIL,
      preferredChannel: KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL,
      inquiryReason: 'Unterlagen hochladen',
      inquiryProcessingConsent: true,
      vehicleMake: '',
      vehicleModel: '',
      vehicleYear: '',
      contextNotes: '',
      branchId: 'upload_documents',
      questionnaireAnswers: {},
    },
    document: {
      filename: KFZ_RC_SYNTHETIC_FILENAME,
      mimeType: 'image/jpeg',
      sizeBytes: bytes.byteLength,
      group: 'fahrzeugschein',
      bytes,
    },
  }
}

export function classifyKfzReleaseCandidateFailure(input: {
  code?: string | null
  status?: number | null
  kind?: 'intake' | 'review' | 'route' | 'persist'
  routePresent?: boolean
}): KfzRcFailure | null {
  if (input.routePresent === false || input.kind === 'route') {
    return { class: 'route_missing', code: 'route_missing' }
  }
  if (input.code === 'config_missing') {
    return { class: 'configuration_missing', code: 'config_missing' }
  }
  if (input.code === 'store_unavailable' || input.kind === 'persist') {
    return { class: 'persistence_unavailable', code: 'store_unavailable' }
  }
  if (input.kind === 'review') {
    if (input.status === 401 || input.code === 'unauthorized') {
      return { class: 'unauthorized_review', code: 'review_unauthenticated' }
    }
    if (input.status === 404) {
      return { class: 'unauthorized_review', code: 'review_forbidden' }
    }
  }
  return null
}

export function inspectKfzReleaseCandidateRoutes(
  repoRoot: string = resolveKfzLaunchRepoRoot(),
  files?: ReadonlyArray<{ path: string; present: boolean }>,
): KfzRcRoutePresence[] {
  return KFZ_RC_REQUIRED_ROUTES.map((route) => {
    const override = files?.find((entry) => entry.path === route.file)
    return {
      id: route.id,
      href: route.href,
      present: override ? override.present : fs.existsSync(path.join(repoRoot, route.file)),
    }
  })
}

export function kfzReleaseCandidateForbiddenValues(): readonly string[] {
  return [
    RC_INTAKE_SECRET,
    RC_PUBLISHABLE,
    RC_ANON,
    RC_PUBLIC_URL,
    KFZ_RC_SYNTHETIC_FULL_NAME,
    KFZ_RC_SYNTHETIC_PHONE,
    KFZ_RC_SYNTHETIC_EMAIL,
    KFZ_RC_SYNTHETIC_FILENAME,
    'rc-accept-fixture',
    'eyJ',
    'Bearer ',
  ]
}

export function kfzReleaseCandidateReportLeaks(value: unknown): string[] {
  const serialized = JSON.stringify(value)
  return kfzReleaseCandidateForbiddenValues().filter((probe) => serialized.includes(probe))
}

function step(
  id: KfzRcStepId,
  ok: boolean,
  failure: KfzRcFailure | null = null,
): KfzRcStepResult {
  return { id, ok, failure: ok ? null : failure }
}

function emptyReport(routes: readonly KfzRcRoutePresence[]): KfzRcAcceptanceReport {
  return {
    ok: false,
    scope: KFZ_RC_ACCEPTANCE_SCOPE,
    productionClaim: false,
    inboxItemCount: 0,
    documentObjectCount: 0,
    exactOnce: false,
    authorizedReviewStatus: 0,
    anonymousReviewStatus: 0,
    crossItemReviewStatus: 0,
    analyticsEventNames: [],
    publicSupabaseKeyModes: { current: false, legacy: false, missing: false },
    routes,
    steps: [],
  }
}

function withKfzRcEnv(run: () => Promise<void>): Promise<void> {
  const prev = {
    agency: process.env.INBOUND_KFZ_AGENCY_ID,
    actor: process.env.INBOUND_KFZ_ACTOR_USER_ID,
    secret: process.env.INBOUND_KFZ_INTAKE_SECRET,
    emailAgency: process.env.INBOUND_EMAIL_AGENCY_ID,
    emailActor: process.env.INBOUND_EMAIL_ACTOR_USER_ID,
  }

  process.env.INBOUND_KFZ_AGENCY_ID = RC_AGENCY_ID
  process.env.INBOUND_KFZ_ACTOR_USER_ID = RC_ACTOR_ID
  process.env.INBOUND_KFZ_INTAKE_SECRET = RC_INTAKE_SECRET
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
  documentStore: ReturnType<typeof createMemoryKfzDocumentStore>,
  documents: readonly KfzInboundDocumentBytes[],
): KfzLandingSubmitFn {
  return async (payload) => {
    const result = await handleKfzInboundHttpRequest(
      new Request('http://localhost/api/inbound/kfz', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RC_INTAKE_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }),
      { store, documentStore, documents },
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

function snapshotPublicSupabaseKeyModes(): KfzRcPublicSupabaseKeyModes {
  const current = readPublicSupabaseConfig({
    [NEXT_PUBLIC_SUPABASE_URL_NAME]: RC_PUBLIC_URL,
    [NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME]: RC_PUBLISHABLE,
  })
  const legacy = readPublicSupabaseConfig({
    [NEXT_PUBLIC_SUPABASE_URL_NAME]: RC_PUBLIC_URL,
    [NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME]: RC_ANON,
  })
  const missing = readPublicSupabaseConfig({})
  return {
    current: current.ok && current.keyName === NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_NAME,
    legacy: legacy.ok && legacy.keyName === NEXT_PUBLIC_SUPABASE_ANON_KEY_NAME,
    missing: !missing.ok && missing.missingNames.length > 0,
  }
}

function analyticsIsMetadataOnly(records: readonly KfzAnalyticsRecord[]): boolean {
  if (records.length === 0) {
    return false
  }
  for (const record of records) {
    if (assertNoKfzAnalyticsPii(record).length > 0) {
      return false
    }
    const redacted = redactKfzAnalyticsProperties({
      ...record.properties,
      filename: KFZ_RC_SYNTHETIC_FILENAME,
      objectKey: 'kfz/hidden/key',
      answer: 'RC-Marke',
      fullName: KFZ_RC_SYNTHETIC_FULL_NAME,
      href: 'https://evil.example/ref?name=leak',
    })
    const blob = JSON.stringify({ record, redacted })
    if (
      blob.includes(KFZ_RC_SYNTHETIC_FULL_NAME) ||
      blob.includes(KFZ_RC_SYNTHETIC_PHONE) ||
      blob.includes(KFZ_RC_SYNTHETIC_FILENAME) ||
      blob.includes('evil.example') ||
      blob.includes('RC-Marke')
    ) {
      return false
    }
  }
  return REQUIRED_ANALYTICS_EVENT_NAMES.every((name) =>
    records.some((record) => record.eventName === name),
  )
}

function sixBranchesOk(): boolean {
  return (
    KFZ_LANDING_BRANCHES.length === 6 &&
    KFZ_LANDING_BRANCHES.map((branch) => branch.id).join(',') ===
      'upload_documents,no_documents,first_car,additional_car,switch_car,evb'
  )
}

function questionnaireWalkOk(): boolean {
  if (!sixBranchesOk()) {
    return false
  }
  for (const branch of KFZ_LANDING_BRANCHES) {
    const answers =
      branch.path === 'questionnaire' ? fillKfzRcVisibleRequired(branch.id) : {}
    const screens = buildKfzLandingScreens(branch.id, answers)
    if (screens[0]?.kind !== 'branch') {
      return false
    }
    if (branch.path === 'upload') {
      if (screens.map((screen) => screen.kind).join(',') !== 'branch,contact,documents') {
        return false
      }
    } else {
      if (!screens.some((screen) => screen.kind === 'questions')) {
        return false
      }
      if (validateKfzQuestionnaireComplete(branch.id, answers).ok !== true) {
        return false
      }
      let screenId: string | null = screens[0]?.id ?? null
      let walked = 0
      while (screenId) {
        walked += 1
        screenId = nextKfzLandingScreenId(screens, screenId)
        if (walked > 30) {
          return false
        }
      }
      if (walked < 3) {
        return false
      }
    }
  }
  return true
}

function consentContractOk(): boolean {
  return (
    validateKfzLandingConsent(false).ok === false &&
    validateKfzLandingConsent(true).ok === true &&
    validateKfzLandingContact({
      fullName: KFZ_RC_SYNTHETIC_FULL_NAME,
      postalCode: '49525',
      city: 'Lengerich',
      phone: '',
      email: '',
      preferredChannel: 'email',
    }).ok === false
  )
}

async function collectAnalyticsRecords(): Promise<KfzAnalyticsRecord[]> {
  const grantedStorage = createMemoryKfzAnalyticsConsentStorage()
  const granted = createKfzAnalyticsController({
    storage: grantedStorage,
    randomUuid: () => RC_SESSION_ID,
    attribution: {
      utmSource: 'google',
      utmCampaign: 'kfz-landing',
    },
  })
  const records = [
    ...granted.setConsent('granted'),
    ...granted.recordFunnelStart('upload_documents'),
    ...granted.recordStepView('contact'),
    ...granted.recordStepCompleted('contact'),
    ...granted.recordStepView('documents'),
    ...granted.recordSubmitStarted(),
    ...granted.recordSubmitFailed('timeout'),
    ...granted.recordSubmitSucceeded(),
  ]

  const abandonStorage = createMemoryKfzAnalyticsConsentStorage()
  const abandon = createKfzAnalyticsController({
    storage: abandonStorage,
    randomUuid: () => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    attribution: { utmSource: 'https://evil.example/ref?phone=+491701112223' },
  })
  records.push(
    ...abandon.setConsent('granted'),
    ...abandon.recordFunnelStart('switch_car'),
    ...abandon.recordStepView('contact'),
    ...abandon.recordAbandoned(),
  )

  const store = createMemoryKfzAnalyticsStore()
  const ingested = await ingestKfzAnalyticsEvents({
    consent: 'granted',
    events: records.map((record) => ({
      eventName: record.eventName,
      sessionId: record.sessionId,
      occurredAt: record.occurredAt,
      properties: {
        ...record.properties,
        filename: KFZ_RC_SYNTHETIC_FILENAME,
        objectKey: 'kfz/hidden/key',
        answer: 'RC-Marke',
        fullName: KFZ_RC_SYNTHETIC_FULL_NAME,
      },
    })),
    store,
  })

  return ingested.records
}

export async function runKfzReleaseCandidateAcceptance(input: {
  repoRoot?: string
} = {}): Promise<KfzRcAcceptanceReport> {
  resetRateLimitBucketsForTests()
  const routes = inspectKfzReleaseCandidateRoutes(input.repoRoot)
  const report = emptyReport(routes)
  const missingRoute = routes.find((route) => !route.present)
  const publicKeys = snapshotPublicSupabaseKeyModes()
  report.publicSupabaseKeyModes = publicKeys

  if (missingRoute) {
    report.steps = [step('routes', false, classifyKfzReleaseCandidateFailure({ kind: 'route' }))]
    return report
  }

  const branchesOk = sixBranchesOk()
  const questionnaireOk = questionnaireWalkOk()
  const consentOk = consentContractOk()

  const fixture = createKfzReleaseCandidateSyntheticFixture()
  const landingDocuments = addKfzLandingDocuments([], [
    {
      group: fixture.document.group,
      filename: fixture.document.filename,
      mimeType: fixture.document.mimeType,
      sizeBytes: fixture.document.sizeBytes,
      id: 'rc-doc',
    },
  ]).documents

  const missingConsent = buildKfzLandingPayload({
    values: { ...fixture.values, inquiryProcessingConsent: false },
    submissionId: RC_SUBMISSION_ID,
    consentTimestamp: '2026-09-11T00:00:00.000Z',
    documents: landingDocuments,
  })

  await withKfzRcEnv(async () => {
    const store = createMemoryInboundIntakeStore()
    const documents = createMemoryKfzDocumentStore()
    const realSubmit = submitViaHandler(store, documents, [fixture.document])
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
      submissionId: RC_SUBMISSION_ID,
      values: fixture.values,
      documents: landingDocuments,
      previews: {},
    }

    const failed = await executeKfzLandingSubmitAttempt({
      phase: 'idle',
      inFlight: false,
      prepared,
      submit: failingThenReal,
    })
    const failedLeftEmpty = store.items.length === 0 && documents.objects.size === 0
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

    const inboxItem = store.items[0]
    const review = inboxItem ? presentKfzWebsiteInboxItem(inboxItem) : null
    const keys = readObjectKeysFromUploadMeta(
      inboxItem && typeof inboxItem.inbound_metadata === 'object' && inboxItem.inbound_metadata
        ? (inboxItem.inbound_metadata as { uploadMeta?: unknown }).uploadMeta
        : null,
    )
    const objectKey = keys.objectKeys[0] ?? ''
    const reviewItem = inboxItem
      ? {
          id: inboxItem.id,
          agencyId: inboxItem.agency_id,
          objectKeys: keys.objectKeys,
          filenameByObjectKey: keys.filenameByObjectKey,
          mimeTypeByObjectKey: keys.mimeTypeByObjectKey,
        }
      : null

    const authorized = authorizeKfzDocumentReview({
      actor: { authenticated: true, agencyId: RC_AGENCY_ID },
      item: reviewItem,
      requestedItemId: inboxItem?.id ?? RC_OTHER_ITEM_ID,
      requestedObjectKey: objectKey,
    })
    const stored =
      authorized.ok ? await documents.getObject(authorized.objectKey) : { ok: false as const }
    const authorizedOk =
      authorized.ok &&
      stored.ok &&
      stored.bytes.byteLength === fixture.document.bytes.byteLength &&
      isKfzDocumentObjectKey(objectKey) &&
      !looksLikePublicDocumentUrl(objectKey) &&
      Boolean(review?.documents[0]?.reviewHref?.startsWith('/app/inbox/kfz-document'))

    const anonymous = authorizeKfzDocumentReview({
      actor: { authenticated: false, agencyId: null },
      item: reviewItem,
      requestedItemId: inboxItem?.id ?? RC_OTHER_ITEM_ID,
      requestedObjectKey: objectKey,
    })
    const crossItem = authorizeKfzDocumentReview({
      actor: { authenticated: true, agencyId: RC_AGENCY_ID },
      item: reviewItem,
      requestedItemId: RC_OTHER_ITEM_ID,
      requestedObjectKey: objectKey,
    })

    const started =
      inboxItem &&
      applyKfzManualTriageCommand(
        {
          content: inboxItem.content,
          processed_at: inboxItem.processed_at,
          linkedTaskId: null,
        },
        { type: 'start_review' },
      )

    const analyticsRecords = await collectAnalyticsRecords()
    const analyticsOk = analyticsIsMetadataOnly(analyticsRecords)

    const submitRetryOk =
      failed.started &&
      failed.phase === 'error' &&
      failedLeftEmpty &&
      retry.started &&
      retry.phase === 'success' &&
      retry.result?.ok === true &&
      missingConsent.ok === false

    const exactOnce =
      Boolean(sameIdRetry.result && sameIdRetry.result.ok && sameIdRetry.result.deduplicated) &&
      store.items.length === 1 &&
      documents.objects.size === 1

    const inboxOk =
      Boolean(review) &&
      review?.sourceLabel === 'Website · Kfz' &&
      store.items[0]?.channel === 'website' &&
      store.items[0]?.source === 'website' &&
      started?.ok === true &&
      started.ok &&
      hasKfzReviewStartedNote(started.next.content)

    report.inboxItemCount = store.items.length
    report.documentObjectCount = documents.objects.size
    report.exactOnce = exactOnce
    report.authorizedReviewStatus = authorizedOk ? 200 : 0
    report.anonymousReviewStatus = !anonymous.ok && anonymous.status === 401 ? 401 : 0
    report.crossItemReviewStatus = !crossItem.ok && crossItem.status === 404 ? 404 : 0
    report.analyticsEventNames = [...new Set(analyticsRecords.map((record) => record.eventName))]

    report.steps = [
      step('routes', missingRoute == null),
      step('six_branches', branchesOk),
      step('questionnaire', questionnaireOk),
      step('consent', consentOk),
      step('submit_retry', submitRetryOk),
      step('exact_once', exactOnce),
      step('inbox', inboxOk),
      step(
        'authorized_review',
        authorizedOk,
        authorizedOk ? null : classifyKfzReleaseCandidateFailure({ kind: 'review', status: 404 }),
      ),
      step(
        'anonymous_rejection',
        report.anonymousReviewStatus === 401,
        classifyKfzReleaseCandidateFailure({
          kind: 'review',
          status: !anonymous.ok ? anonymous.status : 200,
        }),
      ),
      step(
        'cross_item_rejection',
        report.crossItemReviewStatus === 404,
        classifyKfzReleaseCandidateFailure({
          kind: 'review',
          status: !crossItem.ok ? crossItem.status : 200,
        }),
      ),
      step('analytics_metadata_only', analyticsOk),
      step(
        'public_supabase_keys',
        publicKeys.current && publicKeys.legacy && publicKeys.missing,
      ),
    ]
  })

  report.ok = report.steps.length > 0 && report.steps.every((entry) => entry.ok)
  return report
}

export async function probeKfzReleaseCandidateFailure(
  kind: KfzRcFailureClass,
  input: { repoRoot?: string } = {},
): Promise<KfzRcFailure> {
  if (!KFZ_RC_FAILURE_CLASSES.includes(kind)) {
    return { class: 'route_missing', code: 'route_missing' }
  }

  if (kind === 'route_missing') {
    const routes = inspectKfzReleaseCandidateRoutes(
      input.repoRoot,
      KFZ_RC_REQUIRED_ROUTES.map((route) => ({ path: route.file, present: false })),
    )
    const classified = classifyKfzReleaseCandidateFailure({
      kind: 'route',
      routePresent: routes.every((route) => route.present),
    })
    return classified ?? { class: 'route_missing', code: 'route_missing' }
  }

  if (kind === 'unauthorized_review') {
    const anonymous = authorizeKfzDocumentReview({
      actor: { authenticated: false, agencyId: null },
      item: {
        id: RC_OTHER_ITEM_ID,
        agencyId: RC_AGENCY_ID,
        objectKeys: [`kfz/${RC_AGENCY_ID}/${RC_SESSION_ID}`],
        filenameByObjectKey: {},
        mimeTypeByObjectKey: {},
      },
      requestedItemId: RC_OTHER_ITEM_ID,
      requestedObjectKey: `kfz/${RC_AGENCY_ID}/${RC_SESSION_ID}`,
    })
    return (
      classifyKfzReleaseCandidateFailure({
        kind: 'review',
        status: anonymous.ok ? 200 : anonymous.status,
      }) ?? { class: 'unauthorized_review', code: 'review_unauthenticated' }
    )
  }

  if (kind === 'configuration_missing') {
    const prev = {
      agency: process.env.INBOUND_KFZ_AGENCY_ID,
      actor: process.env.INBOUND_KFZ_ACTOR_USER_ID,
      secret: process.env.INBOUND_KFZ_INTAKE_SECRET,
      emailAgency: process.env.INBOUND_EMAIL_AGENCY_ID,
      emailActor: process.env.INBOUND_EMAIL_ACTOR_USER_ID,
    }
    delete process.env.INBOUND_KFZ_AGENCY_ID
    delete process.env.INBOUND_KFZ_ACTOR_USER_ID
    delete process.env.INBOUND_KFZ_INTAKE_SECRET
    delete process.env.INBOUND_EMAIL_AGENCY_ID
    delete process.env.INBOUND_EMAIL_ACTOR_USER_ID
    try {
      resetRateLimitBucketsForTests()
      const result = await handleKfzInboundHttpRequest(
        new Request('http://localhost/api/inbound/kfz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        }),
      )
      const classified = classifyKfzReleaseCandidateFailure({
        kind: 'intake',
        code: result.ok ? null : result.body.code,
        status: result.status,
      })
      return classified ?? { class: 'configuration_missing', code: 'config_missing' }
    } finally {
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
    }
  }

  const persistUrlName = KFZ_SUPABASE_PERSIST_ENV_NAMES[0]
  const persistKeyName = KFZ_SUPABASE_PERSIST_ENV_NAMES[1]
  const prev = {
    agency: process.env.INBOUND_KFZ_AGENCY_ID,
    actor: process.env.INBOUND_KFZ_ACTOR_USER_ID,
    secret: process.env.INBOUND_KFZ_INTAKE_SECRET,
    url: process.env[persistUrlName],
    key: process.env[persistKeyName],
  }
  process.env.INBOUND_KFZ_AGENCY_ID = RC_AGENCY_ID
  process.env.INBOUND_KFZ_ACTOR_USER_ID = RC_ACTOR_ID
  process.env.INBOUND_KFZ_INTAKE_SECRET = RC_INTAKE_SECRET
  delete process.env[persistUrlName]
  delete process.env[persistKeyName]
  try {
    resetRateLimitBucketsForTests()
    const fixture = createKfzReleaseCandidateSyntheticFixture()
    const result = await handleKfzInboundHttpRequest(
      new Request('http://localhost/api/inbound/kfz', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RC_INTAKE_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inquiryProcessingConsent: true }),
      }),
      { documents: [fixture.document] },
    )
    const classified = classifyKfzReleaseCandidateFailure({
      kind: 'persist',
      code: result.ok ? null : result.body.code,
      status: result.status,
    })
    return classified ?? { class: 'persistence_unavailable', code: 'store_unavailable' }
  } finally {
    if (prev.agency === undefined) delete process.env.INBOUND_KFZ_AGENCY_ID
    else process.env.INBOUND_KFZ_AGENCY_ID = prev.agency
    if (prev.actor === undefined) delete process.env.INBOUND_KFZ_ACTOR_USER_ID
    else process.env.INBOUND_KFZ_ACTOR_USER_ID = prev.actor
    if (prev.secret === undefined) delete process.env.INBOUND_KFZ_INTAKE_SECRET
    else process.env.INBOUND_KFZ_INTAKE_SECRET = prev.secret
    if (prev.url === undefined) delete process.env[persistUrlName]
    else process.env[persistUrlName] = prev.url
    if (prev.key === undefined) delete process.env[persistKeyName]
    else process.env[persistKeyName] = prev.key
  }
}
