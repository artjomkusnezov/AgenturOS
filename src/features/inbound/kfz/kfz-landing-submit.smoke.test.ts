/**
 * Reliable /kfz submit: identity, retry, draft restore, no duplicate inbox.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, it } from 'node:test'

import { presentKfzWebsiteInboxItem } from '@/features/inbox/lib/present-kfz-website-inbox'
import type { KfzLandingFormValues } from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import {
  clearKfzLandingDraft,
  createMemoryKfzLandingDraftStorage,
  KFZ_LANDING_DOCUMENT_RESELECT_NOTICE,
  KFZ_LANDING_DRAFT_STORAGE_KEY,
  parseKfzLandingDraftSnapshot,
  readKfzLandingDraft,
  restoreKfzLandingDraft,
  writeKfzLandingDraft,
} from '@/features/inbound/kfz/lib/kfz-landing-draft'
import { addKfzLandingDocuments } from '@/features/inbound/kfz/lib/kfz-landing-documents'
import { KFZ_LANDING_DEFAULT_PREFERRED_CHANNEL } from '@/features/inbound/kfz/lib/kfz-landing-steps'
import {
  beginKfzLandingSubmit,
  kfzLandingSubmitStatusLabel,
} from '@/features/inbound/kfz/lib/kfz-landing-submit-guard'
import {
  applyKfzLandingSubmitFailure,
  applyKfzLandingSubmitSuccess,
  executeKfzLandingSubmitAttempt,
  retainKfzLandingPreparedInquiry,
  type KfzLandingPreparedInquiry,
  type KfzLandingSubmitFn,
} from '@/features/inbound/kfz/lib/kfz-landing-submit-session'
import { resetRateLimitBucketsForTests } from '@/features/inbound/kfz/lib/rate-limit-seam'
import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'
import type { KfzLandingSubmitState } from '@/features/inbound/kfz/types/kfz-landing-submit'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const SECRET = 'test-kfz-landing-submit-secret'
const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

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
    contextNotes: 'Bitte um Rückruf am Nachmittag.',
    ...overrides,
  }
}

function preparedInquiry(
  submissionId: string,
  overrides: Partial<KfzLandingPreparedInquiry> = {},
): KfzLandingPreparedInquiry {
  const documents = addKfzLandingDocuments([], [
    {
      group: 'fahrzeugschein',
      filename: 'schein.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 12_000,
      id: 'doc-schein',
    },
  ]).documents

  return {
    submissionId,
    values: baseValues(),
    documents,
    previews: { 'doc-schein': 'blob:kfz-preview-schein' },
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

describe('kfz landing submit lock and identity', () => {
  it('blocks a second begin while sending (double-click)', () => {
    assert.equal(beginKfzLandingSubmit('idle'), 'submitting')
    assert.equal(beginKfzLandingSubmit('submitting'), null)
    assert.equal(beginKfzLandingSubmit('error'), 'submitting')
  })

  it('does not start a second attempt while in-flight', async () => {
    const prepared = preparedInquiry('lp-dblclick-001')
    const calls: string[] = []
    const submit: KfzLandingSubmitFn = async () => {
      calls.push('submit')
      return { ok: true, deduplicated: false }
    }

    const first = executeKfzLandingSubmitAttempt({
      phase: 'idle',
      inFlight: false,
      prepared,
      submit,
    })
    const second = await executeKfzLandingSubmitAttempt({
      phase: 'submitting',
      inFlight: true,
      prepared,
      submit,
    })

    assert.equal(second.started, false)
    assert.equal(second.locked, true)
    assert.equal(second.submissionId, 'lp-dblclick-001')
    const settled = await first
    assert.equal(settled.started, true)
    assert.equal(calls.length, 1)
  })
})

describe('kfz landing timeout then retry', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('keeps the same submission identity after timeout and creates one inbox item', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const prepared = preparedInquiry('lp-timeout-retry-001')
      const realSubmit = submitViaHandler(store)

      const timedOut = await executeKfzLandingSubmitAttempt({
        phase: 'idle',
        inFlight: false,
        prepared,
        submit: () => new Promise<KfzLandingSubmitState>(() => {}),
        timeoutMs: 20,
      })

      assert.equal(timedOut.started, true)
      assert.equal(timedOut.timedOut, true)
      assert.equal(timedOut.phase, 'error')
      assert.equal(timedOut.draftAction, 'retained')
      assert.equal(timedOut.submissionId, 'lp-timeout-retry-001')
      assert.equal(timedOut.values.fullName, 'Max Mustermann')
      assert.equal(timedOut.documents[0]?.filename, 'schein.jpg')
      assert.equal(timedOut.previews['doc-schein'], 'blob:kfz-preview-schein')
      assert.equal(store.items.length, 0)

      const retry = await executeKfzLandingSubmitAttempt({
        phase: timedOut.phase,
        inFlight: false,
        prepared: {
          submissionId: timedOut.submissionId,
          values: timedOut.values,
          documents: timedOut.documents,
          previews: timedOut.previews,
        },
        submit: realSubmit,
        timeoutMs: 5_000,
      })

      assert.equal(retry.started, true)
      assert.equal(retry.phase, 'success')
      assert.equal(retry.submissionId, 'lp-timeout-retry-001')
      assert.equal(retry.result?.ok, true)
      assert.equal(store.items.length, 1)
      assert.equal(store.items[0].external_id, 'kfz:lp-timeout-retry-001')

      const review = presentKfzWebsiteInboxItem(store.items[0])
      assert.ok(review)
      assert.equal(review.preferredChannel, 'whatsapp')
      assert.equal(review.request, 'Versicherung wechseln')
      assert.equal(review.documents.length, 1)
      assert.equal(review.documents[0]?.filename, 'schein.jpg')
    })
  })
})

describe('kfz landing stable identity and no duplicate inbox', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('reuses one submissionId across timeout, back/forward snapshot and repeated response', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const storage = createMemoryKfzLandingDraftStorage()
      const prepared = preparedInquiry('lp-stable-id-001')

      writeKfzLandingDraft(storage, {
        submissionId: prepared.submissionId,
        step: 3,
        values: prepared.values,
        hadDocuments: true,
      })

      const restored = readKfzLandingDraft(storage)
      assert.ok(restored)
      assert.equal(restored.submissionId, 'lp-stable-id-001')

      const first = await executeKfzLandingSubmitAttempt({
        phase: 'idle',
        inFlight: false,
        prepared: { ...prepared, submissionId: restored.submissionId },
        submit: submitViaHandler(store),
      })
      assert.equal(first.phase, 'success')

      const repeated = await executeKfzLandingSubmitAttempt({
        phase: 'error',
        inFlight: false,
        prepared: { ...prepared, submissionId: restored.submissionId },
        submit: submitViaHandler(store),
      })

      assert.equal(repeated.phase, 'success')
      assert.equal(repeated.result && repeated.result.ok && repeated.result.deduplicated, true)
      assert.equal(store.items.length, 1)
      assert.equal(first.submissionId, repeated.submissionId)
    })
  })
})

describe('kfz landing retain after failure', () => {
  it('keeps typed fields, selected files and previews after a failed submit', async () => {
    const prepared = preparedInquiry('lp-retain-fail-001')
    const failed = await executeKfzLandingSubmitAttempt({
      phase: 'idle',
      inFlight: false,
      prepared,
      submit: async () => ({
        ok: false,
        error: 'Kfz-Inbound ist nicht konfiguriert (INBOUND_KFZ_INTAKE_SECRET fehlt).',
        code: 'config_missing',
        retryable: true,
      }),
    })

    assert.equal(failed.phase, 'error')
    assert.equal(failed.draftAction, 'retained')
    const retained = applyKfzLandingSubmitFailure(failed)
    assert.equal(retained.values.fullName, 'Max Mustermann')
    assert.equal(retained.values.phone, '+491701234567')
    assert.equal(retained.values.inquiryReason, 'Versicherung wechseln')
    assert.equal(retained.values.inquiryProcessingConsent, true)
    assert.equal(retained.documents.length, 1)
    assert.equal(retained.documents[0]?.filename, 'schein.jpg')
    assert.equal(retained.previews['doc-schein'], 'blob:kfz-preview-schein')
    assert.equal(JSON.stringify(retained).includes('data:'), false)
    assert.doesNotMatch(failed.result && !failed.result.ok ? failed.result.error : '', /gespeichert|hochgeladen/i)
  })

  it('does not claim success when intake configuration is missing', async () => {
    const prev = {
      agency: process.env.INBOUND_KFZ_AGENCY_ID,
      actor: process.env.INBOUND_KFZ_ACTOR_USER_ID,
      secret: process.env.INBOUND_KFZ_INTAKE_SECRET,
    }
    delete process.env.INBOUND_KFZ_AGENCY_ID
    delete process.env.INBOUND_KFZ_ACTOR_USER_ID
    delete process.env.INBOUND_KFZ_INTAKE_SECRET

    try {
      const store = createMemoryInboundIntakeStore()
      const result = await executeKfzLandingSubmitAttempt({
        phase: 'idle',
        inFlight: false,
        prepared: preparedInquiry('lp-config-missing'),
        submit: submitViaHandler(store),
      })
      assert.equal(result.phase, 'error')
      assert.equal(result.result?.ok, false)
      if (result.result && !result.result.ok) {
        assert.equal(result.result.code, 'config_missing')
      }
      assert.equal(store.items.length, 0)
    } finally {
      if (prev.agency === undefined) delete process.env.INBOUND_KFZ_AGENCY_ID
      else process.env.INBOUND_KFZ_AGENCY_ID = prev.agency
      if (prev.actor === undefined) delete process.env.INBOUND_KFZ_ACTOR_USER_ID
      else process.env.INBOUND_KFZ_ACTOR_USER_ID = prev.actor
      if (prev.secret === undefined) delete process.env.INBOUND_KFZ_INTAKE_SECRET
      else process.env.INBOUND_KFZ_INTAKE_SECRET = prev.secret
    }
  })
})

describe('kfz landing draft restore', () => {
  it('restores text/select fields after reload and requires document reselect', () => {
    const storage = createMemoryKfzLandingDraftStorage()
    const snapshot = writeKfzLandingDraft(storage, {
      submissionId: 'lp-reload-001',
      step: 3,
      values: baseValues({ inquiryProcessingConsent: true }),
      hadDocuments: true,
    })
    assert.ok(snapshot)
    assert.equal('inquiryProcessingConsent' in snapshot.values, false)
    assert.match(JSON.stringify(snapshot), /lp-reload-001/)
    assert.doesNotMatch(JSON.stringify(snapshot), /inquiryProcessingConsent/)

    const restored = readKfzLandingDraft(storage)
    assert.ok(restored)
    assert.equal(restored.values.fullName, 'Max Mustermann')
    assert.equal(restored.values.preferredChannel, 'whatsapp')
    assert.equal(restored.values.inquiryReason, 'Versicherung wechseln')
    assert.equal(restored.values.inquiryProcessingConsent, false)
    assert.equal(restored.step, 3)
    assert.equal(restored.submissionId, 'lp-reload-001')
    assert.equal(restored.documentReselectRequired, true)
    assert.equal(restored.documentReselectNotice, KFZ_LANDING_DOCUMENT_RESELECT_NOTICE)
  })

  it('does not restore consent as checked, even from a hostile snapshot', () => {
    const hostile = {
      version: 1,
      submissionId: 'lp-hostile-consent',
      step: 3,
      hadDocuments: false,
      values: {
        fullName: 'Eva Beispiel',
        postalCode: '49525',
        city: 'Lengerich',
        phone: '+491701234567',
        email: '',
        preferredChannel: 'phone',
        inquiryReason: 'Zweitwagen',
        inquiryProcessingConsent: true,
        vehicleMake: '',
        vehicleModel: '',
        vehicleYear: '',
        contextNotes: '',
      },
    }
    const parsed = parseKfzLandingDraftSnapshot(JSON.stringify(hostile))
    assert.ok(parsed)
    const restored = restoreKfzLandingDraft(parsed)
    assert.equal(restored.values.inquiryProcessingConsent, false)
    assert.equal(restored.values.fullName, 'Eva Beispiel')
    assert.equal(restored.documentReselectRequired, false)
  })

  it('clears the local draft after confirmed success', () => {
    const storage = createMemoryKfzLandingDraftStorage()
    writeKfzLandingDraft(storage, {
      submissionId: 'lp-clear-success',
      step: 3,
      values: baseValues(),
      hadDocuments: true,
    })
    assert.ok(storage.getItem(KFZ_LANDING_DRAFT_STORAGE_KEY))

    const cleared = applyKfzLandingSubmitSuccess(() => clearKfzLandingDraft(storage))
    assert.equal(storage.getItem(KFZ_LANDING_DRAFT_STORAGE_KEY), null)
    assert.equal(cleared.values.inquiryProcessingConsent, false)
    assert.equal(cleared.documents.length, 0)
    assert.deepEqual(cleared.previews, {})
    assert.equal(readKfzLandingDraft(storage), null)
  })

  it('retains a prepared inquiry object without dropping local previews', () => {
    const prepared = preparedInquiry('lp-retain-copy')
    const copy = retainKfzLandingPreparedInquiry(prepared)
    assert.equal(copy.submissionId, prepared.submissionId)
    assert.notEqual(copy.values, prepared.values)
    assert.deepEqual(copy.documents, prepared.documents)
    assert.equal(copy.previews['doc-schein'], 'blob:kfz-preview-schein')
  })
})

describe('kfz landing submit UI contract', () => {
  it('keeps German submit states and no automatic navigation or message', () => {
    const formSource = fs.readFileSync(
      path.join(srcRoot, 'features/inbound/kfz/components/kfz-landing-form.tsx'),
      'utf8',
    )
    assert.match(formSource, /data-kfz-submit-status/)
    assert.match(formSource, /Bereit zum Senden|kfzLandingSubmitStatusLabel/)
    assert.match(formSource, /draftController\.clear\(/)
    assert.match(formSource, /documentReselectNotice/)
    assert.match(formSource, /Erneut senden/)
    assert.doesNotMatch(formSource, /router\.push|window\.location|sendWhatsApp|sendEmail/)
    assert.equal(kfzLandingSubmitStatusLabel('idle'), 'Bereit zum Senden')
  })
})
