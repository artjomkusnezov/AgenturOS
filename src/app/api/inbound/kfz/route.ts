import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'

import {
  formatKfzConfigError,
  listMissingInboundKfzEnvFields,
} from '@/features/inbound/kfz/config/inbound-kfz-config'
import { logKfzInbound } from '@/features/inbound/kfz/lib/kfz-inbound-log'
import { processKfzWebsiteInquiry } from '@/features/inbound/kfz/services/process-kfz-inquiry'
import { createServiceRoleInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'

/**
 * Kfz Landingpage Intake (Gate 2).
 * Authenticated / abuse-resistant → validate → normalize → InboundItem → Inbox.
 * Keine Businesslogik in der Route.
 */
export async function POST(request: Request) {
  const missing = listMissingInboundKfzEnvFields()
  if (missing.length > 0) {
    logKfzInbound('config_missing', { fields: missing.join(',') })
    return NextResponse.json(
      { error: formatKfzConfigError(missing) },
      { status: 503 },
    )
  }

  let store
  try {
    store = createServiceRoleInboundIntakeStore()
  } catch {
    logKfzInbound('store_unavailable', {})
    return NextResponse.json(
      { error: 'Kfz-Inbound ist nicht konfiguriert (Supabase Service Role).' },
      { status: 503 },
    )
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
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    )
  }

  logKfzInbound('accepted', {
    deduplicated: result.deduplicated,
  })

  return NextResponse.json({
    ok: true,
    deduplicated: result.deduplicated,
    inboxItemId: result.inboxItemId,
  })
}
