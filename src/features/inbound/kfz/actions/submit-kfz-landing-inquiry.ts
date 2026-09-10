'use server'

import { headers } from 'next/headers'

import {
  formatKfzConfigError,
  getInboundKfzRuntimeConfig,
  listMissingInboundKfzEnvFields,
} from '@/features/inbound/kfz/config/inbound-kfz-config'
import { readKfzInboundDocumentsFromFiles } from '@/features/inbound/kfz/lib/kfz-document-storage'
import { logKfzInbound } from '@/features/inbound/kfz/lib/kfz-inbound-log'
import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'
import type { KfzInboundDocumentBytes } from '@/features/inbound/kfz/types/kfz-document-storage'
import type { KfzLandingSubmitState } from '@/features/inbound/kfz/types/kfz-landing-submit'
import type { PublicKfzInquiryPayload } from '@/features/inbound/kfz/types/public-kfz-inquiry'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function retryableStatus(status: number, code?: string): boolean {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    code === 'rate_limited' ||
    code === 'intake_failed' ||
    code === 'config_missing' ||
    code === 'store_unavailable'
  )
}

async function resolveLandingDocuments(
  payload: PublicKfzInquiryPayload,
  files: readonly File[],
): Promise<
  | { ok: true; documents: KfzInboundDocumentBytes[] }
  | { ok: false; state: KfzLandingSubmitState }
> {
  if (files.length === 0) {
    return { ok: true, documents: [] }
  }

  const read = await readKfzInboundDocumentsFromFiles(files, payload.uploads ?? [])
  if (!read.ok) {
    return {
      ok: false,
      state: {
        ok: false,
        error: read.error,
        code: read.code,
        retryable: false,
      },
    }
  }

  return { ok: true, documents: read.documents }
}

/**
 * Öffentliche Landingpage → denselben Handler wie `POST /api/inbound/kfz`.
 * Bearer-Secret nur serverseitig; kein Secret im Browser; kein PII in Logs/URLs.
 * Dateibytes nur serverseitig in den privaten Bucket — keine öffentlichen URLs.
 */
export async function submitKfzLandingInquiryAction(
  payload: PublicKfzInquiryPayload,
  files: readonly File[] = [],
): Promise<KfzLandingSubmitState> {
  if (!isPlainObject(payload) || payload.inquiryProcessingConsent !== true) {
    return {
      ok: false,
      error: 'Bitte stimmen Sie der Bearbeitung Ihrer Anfrage zu.',
      code: 'invalid_consent',
      retryable: false,
    }
  }

  const missing = listMissingInboundKfzEnvFields()
  if (missing.length > 0) {
    logKfzInbound('landing_config_missing', { fields: missing.join(',') })
    return {
      ok: false,
      error: formatKfzConfigError(missing),
      code: 'config_missing',
      retryable: true,
    }
  }

  const config = getInboundKfzRuntimeConfig()
  if (!config) {
    return {
      ok: false,
      error: 'Kfz-Inbound ist nicht konfiguriert.',
      code: 'config_missing',
      retryable: true,
    }
  }

  const documentsResult = await resolveLandingDocuments(payload, files)
  if (!documentsResult.ok) {
    return documentsResult.state
  }

  const headerList = await headers()
  const forwarded = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''

  const request = new Request('http://localhost/api/inbound/kfz', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.intakeSecret}`,
      'Content-Type': 'application/json',
      ...(forwarded ? { 'x-forwarded-for': forwarded } : {}),
    },
    body: JSON.stringify(payload),
  })

  const result = await handleKfzInboundHttpRequest(request, {
    documents: documentsResult.documents,
  })

  if (!result.ok) {
    logKfzInbound('landing_rejected', {
      status: result.status,
      code: result.body.code ?? null,
    })
    return {
      ok: false,
      error: result.body.error,
      code: result.body.code,
      retryable: retryableStatus(result.status, result.body.code),
    }
  }

  logKfzInbound('landing_accepted', {
    deduplicated: result.body.deduplicated,
    documents: documentsResult.documents.length,
  })

  return {
    ok: true,
    deduplicated: result.body.deduplicated,
  }
}
