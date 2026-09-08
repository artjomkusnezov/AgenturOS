/**
 * Client submit session for /kfz: one identity, no double send, retryable failure.
 * Does not talk to customers, create tasks, or invent intake success.
 */

import type { KfzLandingSubmitState } from '@/features/inbound/kfz/types/kfz-landing-submit'
import {
  buildKfzLandingPayload,
  type KfzLandingAttribution,
  type KfzLandingFormValues,
} from '@/features/inbound/kfz/lib/build-kfz-landing-payload'
import { emptyKfzLandingDraftValues } from '@/features/inbound/kfz/lib/kfz-landing-draft'
import type { KfzLandingDocumentCandidate } from '@/features/inbound/kfz/lib/kfz-landing-documents'
import {
  beginKfzLandingSubmit,
  KFZ_LANDING_SUBMIT_TIMEOUT_ERROR,
  KFZ_LANDING_SUBMIT_TIMEOUT_MS,
  resolveKfzLandingSubmitResult,
  type KfzLandingSubmitPhase,
} from '@/features/inbound/kfz/lib/kfz-landing-submit-guard'
import type { PublicKfzInquiryPayload } from '@/features/inbound/kfz/types/public-kfz-inquiry'

export type KfzLandingSubmitFn = (
  payload: PublicKfzInquiryPayload,
) => Promise<KfzLandingSubmitState>

export type KfzLandingPreparedInquiry = {
  submissionId: string
  values: KfzLandingFormValues
  documents: readonly KfzLandingDocumentCandidate[]
  previews: Record<string, string>
}

export type KfzLandingSubmitAttemptResult = {
  started: boolean
  locked: boolean
  phase: KfzLandingSubmitPhase
  submissionId: string
  values: KfzLandingFormValues
  documents: readonly KfzLandingDocumentCandidate[]
  previews: Record<string, string>
  payload: PublicKfzInquiryPayload | null
  result: KfzLandingSubmitState | null
  timedOut: boolean
  draftAction: 'retained' | 'cleared' | 'unchanged'
}

const TIMEOUT_RESULT: KfzLandingSubmitState = {
  ok: false,
  error: KFZ_LANDING_SUBMIT_TIMEOUT_ERROR,
  code: 'timeout',
  retryable: true,
}

export function retainKfzLandingPreparedInquiry<T extends KfzLandingPreparedInquiry>(
  prepared: T,
): T {
  return {
    ...prepared,
    values: { ...prepared.values },
    documents: [...prepared.documents],
    previews: { ...prepared.previews },
  }
}

export async function withKfzLandingSubmitTimeout<T>(
  work: Promise<T>,
  timeoutMs: number = KFZ_LANDING_SUBMIT_TIMEOUT_MS,
): Promise<{ ok: true; value: T } | { ok: false; timedOut: true }> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return { ok: true, value: await work }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work.then((value) => ({ ok: true as const, value })),
      new Promise<{ ok: false; timedOut: true }>((resolve) => {
        timer = setTimeout(() => resolve({ ok: false, timedOut: true }), timeoutMs)
      }),
    ])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}

export async function executeKfzLandingSubmitAttempt(input: {
  phase: KfzLandingSubmitPhase
  inFlight: boolean
  prepared: KfzLandingPreparedInquiry
  attribution?: KfzLandingAttribution
  consentTimestamp?: string
  submit: KfzLandingSubmitFn
  timeoutMs?: number
}): Promise<KfzLandingSubmitAttemptResult> {
  const prepared = retainKfzLandingPreparedInquiry(input.prepared)
  const base = {
    started: false,
    locked: false,
    submissionId: prepared.submissionId,
    values: prepared.values,
    documents: prepared.documents,
    previews: prepared.previews,
    payload: null,
    result: null,
    timedOut: false,
    draftAction: 'unchanged' as const,
  }

  if (input.inFlight || !beginKfzLandingSubmit(input.phase)) {
    return {
      ...base,
      locked: true,
      phase: input.phase,
    }
  }

  const built = buildKfzLandingPayload({
    values: prepared.values,
    submissionId: prepared.submissionId,
    consentTimestamp: input.consentTimestamp ?? new Date().toISOString(),
    attribution: input.attribution,
    documents: [...prepared.documents],
  })

  if (!built.ok) {
    return {
      ...base,
      phase: input.phase === 'error' ? 'error' : 'idle',
      result: {
        ok: false,
        error: built.error,
        code: built.code,
        retryable: built.code !== 'invalid_consent',
      },
      draftAction: 'retained',
    }
  }

  const raced = await withKfzLandingSubmitTimeout(
    input.submit(built.payload),
    input.timeoutMs ?? KFZ_LANDING_SUBMIT_TIMEOUT_MS,
  )

  if (!raced.ok) {
    return {
      ...base,
      started: true,
      phase: resolveKfzLandingSubmitResult('submitting', 'error'),
      payload: built.payload,
      result: TIMEOUT_RESULT,
      timedOut: true,
      draftAction: 'retained',
    }
  }

  if (raced.value.ok) {
    return {
      ...base,
      started: true,
      phase: resolveKfzLandingSubmitResult('submitting', 'success'),
      payload: built.payload,
      result: raced.value,
      draftAction: 'cleared',
    }
  }

  return {
    ...base,
    started: true,
    phase: resolveKfzLandingSubmitResult('submitting', 'error'),
    payload: built.payload,
    result: raced.value,
    draftAction: 'retained',
  }
}

export function applyKfzLandingSubmitFailure<T extends KfzLandingPreparedInquiry>(
  prepared: T,
): T {
  return retainKfzLandingPreparedInquiry(prepared)
}

export function applyKfzLandingSubmitSuccess(storageClear: () => void): {
  values: KfzLandingFormValues
  documents: KfzLandingDocumentCandidate[]
  previews: Record<string, string>
} {
  storageClear()
  return {
    values: emptyKfzLandingDraftValues(),
    documents: [],
    previews: {},
  }
}
