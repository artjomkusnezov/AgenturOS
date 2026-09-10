/**
 * Shared Request-Einstieg für Kfz-Website-Intake.
 * Genutzt von `POST /api/inbound/kfz` und der öffentlichen `/kfz` Landingpage.
 */

import { createHash } from 'node:crypto'

import {
  formatKfzConfigError,
  listMissingInboundKfzEnvFields,
} from '@/features/inbound/kfz/config/inbound-kfz-config'
import { logKfzInbound } from '@/features/inbound/kfz/lib/kfz-inbound-log'
import { processKfzWebsiteInquiry } from '@/features/inbound/kfz/services/process-kfz-inquiry'
import { createServiceRoleInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'

export type KfzInboundHttpResult =
  | {
      ok: true
      status: 200
      body: { ok: true; deduplicated: boolean; inboxItemId: string }
    }
  | {
      ok: false
      status: number
      body: { error: string; code?: string }
    }

/**
 * Entspricht dem Verhalten von `POST /api/inbound/kfz`.
 */
export async function handleKfzInboundHttpRequest(
  request: Request,
): Promise<KfzInboundHttpResult> {
  const missing = listMissingInboundKfzEnvFields()
  if (missing.length > 0) {
    logKfzInbound('config_missing', { fields: missing.join(',') })
    return {
      ok: false,
      status: 503,
      body: { error: formatKfzConfigError(missing), code: 'config_missing' },
    }
  }

  let store
  try {
    store = createServiceRoleInboundIntakeStore()
  } catch {
    logKfzInbound('store_unavailable', {})
    return {
      ok: false,
      status: 503,
      body: {
        error: 'Kfz-Inbound ist nicht konfiguriert (Supabase Service Role).',
        code: 'store_unavailable',
      },
    }
  }

  const rawBody = await request.text()
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const rateLimitKey = createHash('sha256')
    .update(forwarded || 'unknown', 'utf8')
    .digest('hex')
    .slice(0, 16)

  const result = await processKfzWebsiteInquiry({
    rawBody,
    authorizationHeader: request.headers.get('authorization'),
    rateLimitKey,
    store,
  })

  if (!result.success) {
    logKfzInbound('rejected', {
      status: result.status,
      code: result.code ?? null,
    })
    return {
      ok: false,
      status: result.status,
      body: { error: result.error, code: result.code },
    }
  }

  logKfzInbound('accepted', {
    deduplicated: result.deduplicated,
  })

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      deduplicated: result.deduplicated,
      inboxItemId: result.inboxItemId,
    },
  }
}
